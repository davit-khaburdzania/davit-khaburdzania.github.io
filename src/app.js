var fs = require('fs'),
    _ = require('underscore'),
    moment = require('moment'),
    handlebars = require('handlebars'),
    marked = require('marked'),
    main_dir = __dirname + '/../',
    articles = template = compiled = null;

articles = fs.readdirSync(main_dir + 'articles/md')
  .map(function (path) {
    var article = {};
    
    article.text = fs.readFileSync(main_dir + '/articles/md/' + path, 'utf8');
    article.html = marked(article.text);
    article.path = 'articles/' + path.replace('.md', '.html');

    article.title = article.text.split('\n')[0].replace(/#/g, '').trim();
    article.date_str = article.text.split('\n')[1].replace(/#/g, '').trim();
    article.date = moment(article.date_str, "MMMM D YYYY", 'en').toDate();

    return article;
  })
  .sort(function (a, b) {
    return a.date > b.date ? -1 : a.date < b.date ? 1 : 0;
  });

//generate articles
articles.forEach(function (article) {
  template = fs.readFileSync(main_dir + 'templates/article.html', 'utf8');
  template = handlebars.compile(template);

  compiled = template(article);
  fs.writeFileSync(main_dir + article.path, compiled);
});

// generate index.html file
template = fs.readFileSync(main_dir + 'templates/index.html', 'utf8');
template = handlebars.compile(template);

compiled = template({ articles: articles });
fs.writeFileSync(main_dir + '/index.html', compiled);
