#!/usr/bin/env python3
"""Build the davit.cc Writing pages from writing/<slug>/post.md.

Usage: python3 .claude/skills/write-blog-post/build.py   (needs: pip install markdown pillow)
Writes, for every post: writing/<slug>/index.html, assets/images/writing/<slug>-og.jpg (1200x630 share
image) and <slug>-card.webp (800x450 card), all cut from the post's first image. Also rewrites
writing/index.html, writing/feed.xml, the newest three cards on the homepage (between the
writing-cards markers in index.html) and the post entries in sitemap.xml.
"""
import glob, html, json, math, os, re, sys
from datetime import datetime
import markdown
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "..", ".."))
SITE = "https://davit.cc"
TZ = "+04:00"  # Tbilisi

GA = """  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-YCKV2L39B9"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-YCKV2L39B9');
  </script>"""

LOGO = """<svg class="logo-mark" width="32" height="32" aria-hidden="true" viewBox="3 4 58 56">
  <path d="M11 27 C10 19 12 11 15 7.5 C16.5 6 17.5 6.5 19 8 L26.5 17 Q32 15.5 37.5 17 L45 8 C46.5 6.5 47.5 6 49 7.5 C52 11 54 19 53 27 C57 31 59 36 57.5 41 C59 44 57 48 53.5 49 C49 55 41 58 32 58 C23 58 15 55 10.5 49 C7 48 5 44 6.5 41 C5 36 7 31 11 27 Z" fill="#B9B7E6" stroke="#111114" stroke-width="2.1" stroke-linejoin="round"/>
  <path d="M15.5 12 C16.5 10 17.5 10.5 18.5 12 L23.5 18.5 C20.5 20 18 22.5 16 25 C15 21 15 16 15.5 12 Z M48.5 12 C47.5 10 46.5 10.5 45.5 12 L40.5 18.5 C43.5 20 46 22.5 48 25 C49 21 49 16 48.5 12 Z" fill="#E9E8FC"/>
  <path d="M8.2 42 C10 36.5 16 33.5 22 35 C26 36 29 38.2 32 38.2 C35 38.2 38 36 42 35 C48 33.5 54 36.5 55.8 42 C56.6 45.5 54 48.4 51.3 48.9 C47 54.8 40 57.6 32 57.6 C24 57.6 17 54.8 12.7 48.9 C10 48.4 7.4 45.5 8.2 42 Z" fill="#FFFFFF"/>
  <ellipse cx="24" cy="28.3" rx="2.1" ry="1.4" fill="#FFFFFF"/>
  <ellipse cx="40" cy="28.3" rx="2.1" ry="1.4" fill="#FFFFFF"/>
  <ellipse cx="24.6" cy="33" rx="2.3" ry="2.7" fill="#111114"/>
  <ellipse cx="39.4" cy="33" rx="2.3" ry="2.7" fill="#111114"/>
  <path d="M29.4 49.4 Q32 55 34.6 49.4 Z" fill="#F2A7B5"/>
  <path d="M28.6 41.6 Q32 40.3 35.4 41.6 Q35.2 44.6 32 45.7 Q28.8 44.6 28.6 41.6 Z" fill="#111114"/>
  <path d="M32 45.7 V47.6 M25.5 46.6 Q28.3 51.2 32 47.6 Q35.7 51.2 38.5 46.6" fill="none" stroke="#111114" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>"""

NAV = f"""<div class="page"><div class="inner">
  <nav aria-label="Main">
    <a class="logo" href="/" aria-label="davit.cc home">{LOGO}davit.cc</a>
    <div class="links">
      <a href="/#projects">Projects</a>
      <a href="/#playground">Playground</a>
      <a href="/#experience">Experience</a>
      <a href="/writing/"{{writing_current}}>Writing</a>
      <a class="btn btn-dark nav-cta" href="#contact">Say hi</a>
    </div>
  </nav>
</div></div>"""

FOOTER = """<div class="page">
<footer class="inner" id="contact">
  <p class="big">Let's build something.</p>
  <div class="contact">
    <a href="mailto:davit.khaburdzania@gmail.com">davit.khaburdzania@gmail.com</a>
    <a href="https://github.com/davit-khaburdzania" target="_blank" rel="noopener">GitHub</a>
    <a href="https://www.linkedin.com/in/dkhaburdzania" target="_blank" rel="noopener">LinkedIn</a>
    <a href="https://x.com/dkhaburdzania" target="_blank" rel="noopener">Twitter</a>
    <a href="/cv/v4.pdf" download="Davit-Khaburdzania-CV.pdf">CV (PDF)</a>
  </div>
</footer>
</div>"""

HEAD_COMMON = """  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#F6F6F9">
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="alternate" type="application/atom+xml" title="davit.cc Writing" href="/writing/feed.xml">"""

FONTS = """  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap">
  <link rel="stylesheet" href="/assets/css/site.css">
  <link rel="stylesheet" href="/assets/css/post.css">"""

PERSON = {"@type": "Person", "@id": f"{SITE}/#person", "name": "Davit Khaburdzania", "url": f"{SITE}/"}

esc = lambda s: html.escape(s, quote=True)


def parse(path):
    text = open(path, encoding="utf-8").read()
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    meta = {}
    for line in m.group(1).splitlines():
        k, v = line.split(":", 1)
        meta[k.strip()] = v.strip().strip('"')
    body = text[m.end():].lstrip()
    h1 = re.match(r"# (.+)\n", body)
    meta["h1"] = h1.group(1).strip()
    body = body[h1.end():].lstrip()
    # The first image (and its *caption* line, if any) is the hero; pull it out so it sits under the header.
    img = re.search(r"^!\[([^\]]*)\]\(([^)]+)\)[ \t]*\n(?:\*([^*\n]+)\*[ \t]*\n)?", body, re.M)
    meta["hero_alt"], meta["hero_src"], meta["hero_caption"] = img.group(1), img.group(2), img.group(3) or ""
    body = body[:img.start()] + body[img.end():]
    meta["words"] = len(re.findall(r"\w+", body))
    meta["body_md"] = body
    return meta


def render_body(md):
    out = markdown.markdown(md, extensions=["tables", "fenced_code"], output_format="html5")
    # An image on its own line, optionally followed by an *italic* line, becomes a figure with a caption.
    out = re.sub(r'<p>(<img [^>]+>)\s*(?:<em>(.*?)</em>)?</p>',
                 lambda m: '<figure>' + m.group(1).replace("<img ", '<img width="1600" height="900" loading="lazy" decoding="async" ')
                 + (f'<figcaption>{m.group(2)}</figcaption>' if m.group(2) else '') + '</figure>', out)
    out = out.replace("<table>", '<div class="table-wrap"><table>').replace("</table>", "</table></div>")
    out = re.sub(r'href="https://davit\.cc(/[^"]*)"', r'href="\1"', out)
    return out


def nice_date(iso):
    d = datetime.strptime(iso, "%Y-%m-%d")
    return f"{d.day} {d.strftime('%b %Y')}"


def card(p):
    # Same markup as the homepage Writing cards in index.html; keep them in sync.
    return (f'<a class="post reveal" href="/writing/{p["slug"]}/">'
            f'<span class="pshot"><img src="{p["card_img"]}" alt="" width="800" height="450" loading="lazy" decoding="async"></span>'
            f'<div class="pbody"><div class="post-top">'
            f'<span class="pdate"><time datetime="{p["date"]}">{nice_date(p["date"])}</time></span>'
            f'<span class="ptopic">{esc(p["topic"])}</span></div>'
            f'<h3>{esc(p["h1"])}</h3><p>{esc(p["card"])}</p></div></a>')


def card_image(p):
    src = os.path.join(REPO, p["hero_src"].lstrip("/"))
    out_rel = f"assets/images/writing/{p['slug']}-card.webp"
    Image.open(src).convert("RGB").resize((800, 450), Image.LANCZOS).save(os.path.join(REPO, out_rel), "WEBP", quality=82, method=6)
    return "/" + out_rel


def og_image(p):
    src = os.path.join(REPO, p["hero_src"].lstrip("/"))
    out_rel = f"assets/images/writing/{p['slug']}-og.jpg"
    im = Image.open(src).convert("RGB")
    w, h = 1200, round(im.height * 1200 / im.width)
    im = im.resize((w, h), Image.LANCZOS)
    top = (h - 630) // 2
    im.crop((0, top, 1200, top + 630)).save(os.path.join(REPO, out_rel), "JPEG", quality=86, optimize=True, progressive=True)
    return "/" + out_rel


def post_page(p, others):
    url = f"{SITE}/writing/{p['slug']}/"
    minutes = max(1, math.ceil(p["words"] / 230))
    og = SITE + p["og"]
    ld = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "@id": url + "#post",
        "mainEntityOfPage": url,
        "url": url,
        "headline": p["h1"],
        "description": p["description"],
        "image": [SITE + p["hero_src"], og],
        "datePublished": f"{p['date']}T12:00:00{TZ}",
        "dateModified": f"{p.get('modified', p['date'])}T12:00:00{TZ}",
        "author": PERSON,
        "publisher": PERSON,
        "inLanguage": "en",
        "wordCount": p["words"],
        "isPartOf": {"@type": "Blog", "@id": f"{SITE}/writing/#blog", "url": f"{SITE}/writing/", "name": "davit.cc Writing"},
    }
    more = "\n      ".join(card(o) for o in others)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
{GA}
{HEAD_COMMON}
  <title>{esc(p['title'])} – Davit Khaburdzania</title>
  <meta name="description" content="{esc(p['description'])}">
  <link rel="canonical" href="{url}">
  <meta name="author" content="Davit Khaburdzania">
  <meta property="og:type" content="article">
  <meta property="og:url" content="{url}">
  <meta property="og:site_name" content="davit.cc">
  <meta property="og:title" content="{esc(p['title'])}">
  <meta property="og:description" content="{esc(p['description'])}">
  <meta property="og:image" content="{og}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{esc(p['hero_alt'])}">
  <meta property="article:published_time" content="{p['date']}T12:00:00{TZ}">
  <meta property="article:author" content="{SITE}/">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@dkhaburdzania">
  <meta name="twitter:creator" content="@dkhaburdzania">
  <link rel="preload" as="image" href="{p['hero_src']}" fetchpriority="high">
  <script type="application/ld+json">
{json.dumps(ld, indent=2, ensure_ascii=False)}
  </script>
{FONTS}
</head>
<body class="post-page">
{NAV.replace('{writing_current}', '')}

<div class="page">
<main class="article">
  <header class="post-head">
    <span class="kicker"><a href="/writing/">Writing</a> · {esc(p['topic'])}</span>
    <h1>{esc(p['h1'])}</h1>
    <p class="dek">{esc(p.get('subtitle') or p['description'])}</p>
    <div class="byline"><a href="/">Davit Khaburdzania</a><span class="sep"></span><time datetime="{p['date']}">{nice_date(p['date'])}</time><span class="sep"></span><span>{minutes} min read</span></div>
  </header>
  <figure class="post-hero"><img src="{p['hero_src']}" alt="{esc(p['hero_alt'])}" width="1600" height="900" fetchpriority="high" decoding="async">{f'<figcaption>{esc(p["hero_caption"])}</figcaption>' if p["hero_caption"] else ''}</figure>
  <article class="prose">
{p['body_html']}
  </article>
  <aside class="more" aria-label="More writing">
    <h2>More writing</h2>
    <div class="post-list">
      {more}
    </div>
  </aside>
</main>
</div>

{FOOTER}
</body>
</html>
"""


def index_page(posts):
    url = f"{SITE}/writing/"
    ld = {
        "@context": "https://schema.org",
        "@type": "Blog",
        "@id": url + "#blog",
        "url": url,
        "name": "davit.cc Writing",
        "author": PERSON,
        "blogPost": [{"@type": "BlogPosting", "@id": f"{SITE}/writing/{p['slug']}/#post", "url": f"{SITE}/writing/{p['slug']}/",
                      "headline": p["h1"], "datePublished": f"{p['date']}T12:00:00{TZ}"} for p in posts],
    }
    cards = "\n      ".join(card(p) for p in posts)
    desc = "Notes from Davit Khaburdzania on building products with AI agents, Claude Projects, and what still matters in software."
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
{GA}
{HEAD_COMMON}
  <title>Writing – Davit Khaburdzania</title>
  <meta name="description" content="{esc(desc)}">
  <link rel="canonical" href="{url}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="{url}">
  <meta property="og:site_name" content="davit.cc">
  <meta property="og:title" content="Writing – Davit Khaburdzania">
  <meta property="og:description" content="{esc(desc)}">
  <meta property="og:image" content="{SITE}/assets/images/og.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@dkhaburdzania">
  <script type="application/ld+json">
{json.dumps(ld, indent=2, ensure_ascii=False)}
  </script>
{FONTS}
</head>
<body class="post-page">
{NAV.replace('{writing_current}', ' aria-current="page"')}

<div class="page">
<main class="inner writing-index">
  <header class="post-head">
    <span class="kicker">Blog</span>
    <h1>Writing</h1>
    <p class="dek">How I build products with AI agents, and what I think still matters in software.</p>
  </header>
  <div class="posts">
      {cards}
  </div>
</main>
</div>

{FOOTER}
</body>
</html>
"""


def feed(posts):
    updated = max(p.get("modified", p["date"]) for p in posts)
    entries = []
    for p in posts:
        url = f"{SITE}/writing/{p['slug']}/"
        content = re.sub(r'(href|src)="/', rf'\1="{SITE}/', p["body_html"])
        hero = f'<p><img src="{SITE}{p["hero_src"]}" alt="{esc(p["hero_alt"])}"></p>\n'
        entries.append(f"""  <entry>
    <title>{esc(p['h1'])}</title>
    <link href="{url}"/>
    <id>{url}</id>
    <published>{p['date']}T12:00:00{TZ}</published>
    <updated>{p.get('modified', p['date'])}T12:00:00{TZ}</updated>
    <summary>{esc(p['description'])}</summary>
    <content type="html">{esc(hero + content)}</content>
  </entry>""")
    return f"""<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>davit.cc Writing</title>
  <link href="{SITE}/writing/"/>
  <link rel="self" href="{SITE}/writing/feed.xml"/>
  <id>{SITE}/writing/</id>
  <updated>{updated}T12:00:00{TZ}</updated>
  <author><name>Davit Khaburdzania</name><uri>{SITE}/</uri></author>
{chr(10).join(entries)}
</feed>
"""


def homepage(posts):
    path = os.path.join(REPO, "index.html")
    page = open(path, encoding="utf-8").read()
    cards = "\n".join("      " + card(p) for p in posts[:3])
    page, n = re.subn(r"(<!-- writing-cards:start -->\n).*?(\n\s*<!-- writing-cards:end -->)",
                      lambda m: m.group(1) + cards + m.group(2), page, flags=re.S)
    if n != 1:
        sys.exit("index.html: writing-cards markers not found")
    open(path, "w", encoding="utf-8").write(page)


def sitemap(posts):
    path = os.path.join(REPO, "sitemap.xml")
    xml = open(path, encoding="utf-8").read()
    def put(url, lastmod):
        nonlocal xml
        entry = f"  <url>\n    <loc>{url}</loc>\n    <lastmod>{lastmod}</lastmod>\n  </url>\n"
        pat = re.compile(rf"  <url>\s*<loc>{re.escape(url)}</loc>.*?</url>\n", re.S)
        xml = pat.sub(lambda m: entry, xml) if pat.search(xml) else xml.replace("</urlset>", entry + "</urlset>")
    put(f"{SITE}/writing/", max(p.get("modified", p["date"]) for p in posts))
    for p in posts:
        put(f"{SITE}/writing/{p['slug']}/", p.get("modified", p["date"]))
    open(path, "w", encoding="utf-8").write(xml)


def main():
    posts = [parse(f) for f in glob.glob(os.path.join(REPO, "writing", "*", "post.md"))]
    if not posts:
        sys.exit("no writing/*/post.md found under " + REPO)
    # Newest first; posts from the same day go by their `order` field.
    posts.sort(key=lambda p: (p["date"], -int(p.get("order", 0))), reverse=True)
    for p in posts:
        p["body_html"] = render_body(p["body_md"])
        p["og"] = og_image(p)
        p["card_img"] = card_image(p)
    for p in posts:
        d = os.path.join(REPO, "writing", p["slug"])
        others = [o for o in posts if o is not p][:3]
        open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(post_page(p, others))
        print("wrote", f"writing/{p['slug']}/index.html", f"{p['words']} words")
    open(os.path.join(REPO, "writing", "index.html"), "w", encoding="utf-8").write(index_page(posts))
    open(os.path.join(REPO, "writing", "feed.xml"), "w", encoding="utf-8").write(feed(posts))
    homepage(posts)
    sitemap(posts)
    print("wrote writing/index.html, writing/feed.xml, homepage cards, sitemap.xml")


if __name__ == "__main__":
    main()
