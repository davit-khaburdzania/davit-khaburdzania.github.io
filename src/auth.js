// OAuth for agents. Everything on davit.cc is public, so a token never unlocks
// more than an anonymous request gets. This exists for agents that expect an
// OAuth handshake: they can register, get a short-lived read token and use it.
// Tokens are HS256 JWTs. The key comes from the AUTH_SECRET secret when set,
// otherwise from the deployed version id, so tokens reset on each deploy.

const enc = new TextEncoder();
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const json64 = (o) => b64url(enc.encode(JSON.stringify(o)));
const now = () => Math.floor(Date.now() / 1000);
const rand = (n = 16) => b64url(crypto.getRandomValues(new Uint8Array(n)));

export const SCOPES = ["read"];
const TTL = { access: 3600, identity: 86400, code: 120 };

async function key(env) {
  const seed = env.AUTH_SECRET || `davit.cc:${env.CF_VERSION_METADATA?.id || "local-dev"}`;
  return crypto.subtle.importKey("raw", enc.encode(seed), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function sign(env, typ, claims) {
  const body = `${json64({ alg: "HS256", typ })}.${json64(claims)}`;
  return `${body}.${b64url(await crypto.subtle.sign("HMAC", await key(env), enc.encode(body)))}`;
}

async function verify(env, token, typ) {
  try {
    const [h, p, s] = token.split(".");
    const head = JSON.parse(new TextDecoder().decode(unb64url(h)));
    if (head.alg !== "HS256" || head.typ !== typ) return null;
    if (!(await crypto.subtle.verify("HMAC", await key(env), unb64url(s), enc.encode(`${h}.${p}`)))) return null;
    const claims = JSON.parse(new TextDecoder().decode(unb64url(p)));
    return claims.exp > now() ? claims : null;
  } catch {
    return null;
  }
}

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*", ...extra } });
const oauthError = (error, description, status = 400) => json({ error, error_description: description }, status);

export function protectedResource(origin) {
  return {
    resource: origin + "/",
    resource_name: "davit.cc",
    resource_documentation: origin + "/api/docs.md",
    authorization_servers: [origin],
    scopes_supported: SCOPES,
    bearer_methods_supported: ["header"],
  };
}

export function authorizationServer(origin) {
  const identity = origin + "/agent/identity";
  const claim = origin + "/agent/identity/claim";
  return {
    issuer: origin,
    authorization_endpoint: origin + "/oauth/authorize",
    token_endpoint: origin + "/oauth/token",
    registration_endpoint: origin + "/oauth/register",
    jwks_uri: origin + "/.well-known/jwks.json",
    scopes_supported: SCOPES,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "urn:ietf:params:oauth:grant-type:jwt-bearer"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    authorization_response_iss_parameter_supported: true,
    service_documentation: origin + "/auth.md",
    ...protectedResource(origin),
    agent_auth: {
      skill: origin + "/auth.md",
      identity_endpoint: identity,
      register_uri: identity,
      claim_endpoint: claim,
      claim_uri: claim,
      identity_types_supported: ["anonymous"],
      anonymous: { credential_types_supported: ["identity_assertion", "access_token"], scopes: SCOPES },
    },
  };
}

// Signed with a shared secret (HS256), so there are no public keys to publish.
export const jwks = () => ({ keys: [] });

// Loopback only (RFC 8252), so this can't be used as an open redirect.
function loopback(uri) {
  try {
    const u = new URL(uri);
    return u.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(u.hostname);
  } catch {
    return false;
  }
}

async function form(request) {
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) return request.json().catch(() => ({}));
  return Object.fromEntries(new URLSearchParams(await request.text()));
}

async function accessToken(env, origin, sub, client) {
  const t = now();
  const token = await sign(env, "at+jwt", { iss: origin, aud: origin + "/", sub, client_id: client, scope: SCOPES.join(" "), iat: t, exp: t + TTL.access, jti: rand() });
  return json({ access_token: token, token_type: "Bearer", expires_in: TTL.access, scope: SCOPES.join(" ") });
}

async function s256(verifier) {
  return b64url(await crypto.subtle.digest("SHA-256", enc.encode(verifier)));
}

// Checks an optional bearer token on API calls. No token is fine; a bad one is a 401.
export async function checkBearer(env, request, origin) {
  const h = request.headers.get("authorization");
  if (!h) return null;
  const token = h.match(/^Bearer\s+(\S+)$/i)?.[1];
  const claims = token && (await verify(env, token, "at+jwt"));
  if (claims && claims.aud === origin + "/") return null;
  return json({ error: "invalid_token", error_description: "The access token is invalid or expired. Get a new one, or call without a token: the API is public." }, 401, {
    "www-authenticate": `Bearer error="invalid_token", resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
  });
}

export async function handle(env, request, origin, path) {
  const method = request.method;

  if (path === "/oauth/register") {
    if (method !== "POST") return oauthError("invalid_request", "Use POST with a JSON client metadata document.", 405);
    const meta = await form(request);
    const uris = Array.isArray(meta.redirect_uris) ? meta.redirect_uris : [];
    if (uris.some((u) => !loopback(u))) return json({ error: "invalid_redirect_uri", error_description: "Only loopback redirect URIs (http://127.0.0.1, http://localhost, http://[::1]) are allowed." }, 400);
    return json({
      client_id: `agent-${rand(12)}`,
      client_id_issued_at: now(),
      client_name: typeof meta.client_name === "string" ? meta.client_name.slice(0, 100) : undefined,
      redirect_uris: uris,
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: SCOPES.join(" "),
    }, 201);
  }

  if (path === "/oauth/authorize") {
    const q = new URL(request.url).searchParams;
    const redirect = q.get("redirect_uri") || "";
    if (!loopback(redirect)) return oauthError("invalid_request", "redirect_uri must be a loopback URL such as http://127.0.0.1:PORT/callback.");
    const back = (params) => {
      const u = new URL(redirect);
      for (const [k, v] of Object.entries({ ...params, state: q.get("state"), iss: origin })) if (v) u.searchParams.set(k, v);
      return Response.redirect(u.toString(), 302);
    };
    if (q.get("response_type") !== "code") return back({ error: "unsupported_response_type" });
    if (!q.get("client_id")) return back({ error: "invalid_request", error_description: "client_id is required" });
    if (!q.get("code_challenge") || q.get("code_challenge_method") !== "S256") return back({ error: "invalid_request", error_description: "PKCE with S256 is required" });
    const t = now();
    // There are no user accounts, so there's nothing to sign in to or consent to: approve straight away.
    const code = await sign(env, "code", { iss: origin, client_id: q.get("client_id"), redirect_uri: redirect, challenge: q.get("code_challenge"), iat: t, exp: t + TTL.code });
    return back({ code });
  }

  if (path === "/oauth/token") {
    if (method !== "POST") return oauthError("invalid_request", "Use POST.", 405);
    const p = await form(request);
    if (p.grant_type === "urn:ietf:params:oauth:grant-type:jwt-bearer") {
      const claims = p.assertion && (await verify(env, p.assertion, "JWT"));
      if (!claims || claims.token_use !== "identity_assertion") return oauthError("invalid_grant", "The assertion is invalid or expired. Register again at /agent/identity.");
      return accessToken(env, origin, claims.sub, claims.sub);
    }
    if (p.grant_type === "authorization_code") {
      const claims = p.code && (await verify(env, p.code, "code"));
      if (!claims) return oauthError("invalid_grant", "The code is invalid or expired.");
      if (claims.client_id !== p.client_id || claims.redirect_uri !== p.redirect_uri) return oauthError("invalid_grant", "client_id or redirect_uri does not match the authorization request.");
      if (!p.code_verifier || (await s256(p.code_verifier)) !== claims.challenge) return oauthError("invalid_grant", "code_verifier does not match the code_challenge.");
      return accessToken(env, origin, `client:${claims.client_id}`, claims.client_id);
    }
    return oauthError("unsupported_grant_type", "Supported: authorization_code (with PKCE) and urn:ietf:params:oauth:grant-type:jwt-bearer.");
  }

  if (path === "/agent/identity") {
    if (method !== "POST") return oauthError("invalid_request", "POST {\"type\": \"anonymous\"} to register. See /auth.md.", 405);
    const body = await form(request);
    if (body.type === "identity_assertion") return oauthError("identity_assertion_not_enabled", "Only anonymous registration is supported. See /auth.md.");
    if (body.type === "service_auth") return oauthError("service_auth_not_enabled", "Only anonymous registration is supported. See /auth.md.");
    if (body.type !== "anonymous") return oauthError("invalid_request", "Send {\"type\": \"anonymous\"}. See /auth.md.");
    const t = now();
    const id = `reg_${rand(12)}`;
    const assertion = await sign(env, "JWT", { iss: origin, aud: origin + "/", sub: id, token_use: "identity_assertion", scope: SCOPES.join(" "), iat: t, exp: t + TTL.identity });
    return json({
      registration_id: id,
      registration_type: "anonymous",
      identity_assertion: assertion,
      assertion_expires: new Date((t + TTL.identity) * 1000).toISOString(),
      pre_claim_scopes: SCOPES,
      post_claim_scopes: SCOPES,
    });
  }

  if (path === "/agent/identity/claim") {
    return oauthError("claim_not_supported", "davit.cc has no user accounts, so there is nothing to claim. Anonymous registrations keep full read access.");
  }

  return null;
}
