const fs = require('fs');

const blogs = JSON.parse(fs.readFileSync('blogs.json', 'utf8'));

const transformed = blogs.map(blog => ({
    id: blog.id,
    author: blog.author,
    title: blog.title,
    url: blog.url,
    feed: blog.feed,
    extras: blog.extras,
    github: blog.github,
    category: blog.category,
    icon: blog.icon,
    selected: true
}));

fs.writeFileSync('blogs.json', JSON.stringify(transformed, null, 4), 'utf8');
fs.appendFileSync('blogs.json', '\n', 'utf8'); // Add newline at end of file

console.log('blogs.json transformed successfully');
