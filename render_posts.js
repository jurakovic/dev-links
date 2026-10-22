const fs = require('fs');
const path = require('path');

// Pre-renders "Latest Posts" lists into README.md and blogs/README.md (GitHub Pages build step).
// Replaces each empty <div id="<blog-id>" class="blog-posts"></div> with the list from posts/<blog-id>.json

// --- Config ---
const POSTS_DIR = path.join(__dirname, 'posts');
const BLOGS_JSON = path.join(__dirname, 'blogs.json');
const FILES = [
    path.join(__dirname, 'README.md'),
    path.join(__dirname, 'blogs', 'README.md'),
];

const escHtml = s => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\{/g, '&#123;') // keep Liquid from interpreting {{ }} / {% %} in titles
    .replace(/\}/g, '&#125;');

// Date in YYYY-MM-DD (UTC), empty if not parsable
function formatDate(pubDate) {
    const d = new Date(pubDate);
    if (!pubDate || isNaN(d)) return '';
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Kept on a single line so kramdown treats it as one raw HTML block
function renderPosts(items) {
    const lis = items.map(item => {
        const dateStr = formatDate(item.pubDate);
        const text = dateStr ? `${dateStr} ${item.title}` : item.title;
        return `<li><span>›</span><a href="${escHtml(item.link)}" target="_blank" rel="noopener noreferrer">${escHtml(text)}</a></li>`;
    }).join('');
    return `<blockquote><details><summary>Latest Posts</summary><div><ul>${lis}</ul></div></details></blockquote>`;
}

// --- Load posts for blogs that have a feed ---
const blogsConfig = JSON.parse(fs.readFileSync(BLOGS_JSON, 'utf8'));
const postsMap = {};
for (const blog of blogsConfig) {
    const file = path.join(POSTS_DIR, `${blog.id}.json`);
    if (blog.feed && fs.existsSync(file)) {
        postsMap[blog.id] = JSON.parse(fs.readFileSync(file, 'utf8'));
    }
}

// --- Fill placeholders ---
for (const file of FILES) {
    let rendered = 0;
    const content = fs.readFileSync(file, 'utf8').replace(
        /<div id="([^"]+)" class="blog-posts"><\/div>/g,
        (match, id) => {
            const items = postsMap[id];
            if (!items || items.length === 0) return match;
            rendered++;
            return `<div id="${id}" class="blog-posts">${renderPosts(items)}</div>`;
        });
    fs.writeFileSync(file, content, 'utf8');
    console.log(`${path.relative(__dirname, file)}: rendered ${rendered} post lists`);
}
