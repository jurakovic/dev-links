const fs = require('fs');
const path = require('path');

const BLOGS_JSON = path.join(__dirname, '..', 'blogs.json'); // repo root (this script lives in src/)

const blogs = JSON.parse(fs.readFileSync(BLOGS_JSON, 'utf8'));

const transformed = blogs.map(blog => ({
    id: blog.id,
    author: blog.author,
    title: blog.title,
    description: blog.description,
    url: blog.url,
    feed: blog.feed,
    extras: blog.extras,
    github: blog.github,
    category: blog.category,
    icon: blog.icon,
    selected: true
}));

fs.writeFileSync(BLOGS_JSON, JSON.stringify(transformed, null, 4), 'utf8');
fs.appendFileSync(BLOGS_JSON, '\n', 'utf8'); // Add newline at end of file

console.log('blogs.json transformed successfully');
