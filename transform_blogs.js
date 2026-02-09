const fs = require('fs');

const blogs = JSON.parse(fs.readFileSync('blogs.json', 'utf8'));

const transformed = blogs.map(blog => ({
  id: blog.title,
  author: blog.author,
  title: blog.name,
  url: blog.htmlUrl,
  feed: blog.feedUrl,
  extras: blog.extraUrls,
  github: blog.github,
  category: blog.category,
  icon: blog.icon
}));

fs.writeFileSync('blogs.json', JSON.stringify(transformed, null, 2), 'utf8');

console.log('blogs.json transformed successfully');
