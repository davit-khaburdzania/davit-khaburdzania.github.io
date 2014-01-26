var fs = require('fs'),
    _ = require('underscore'),
    moment = require('moment'),
    handlebars = require('handlebars'),
    marked = require('marked'),
    main_dir = __dirname + '/../',
    articles = index_tmp = compiled = null;

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

// generate index.html file
index_tmp = fs.readFileSync(main_dir + 'templates/index.html', 'utf8');
index_tmp = handlebars.compile(index_tmp);
compiled = index_tmp({ articles: articles });

fs.writeFileSync(main_dir + '/index.html', compiled);
