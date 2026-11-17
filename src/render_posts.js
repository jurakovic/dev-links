const fs = require('fs');
const path = require('path');

// Pre-renders "Latest Posts" lists into README.md and blogs/README.md (GitHub Pages build step).
// Replaces each empty <div id="<blog-id>" class="blog-posts"></div> with the newest LATEST_POSTS posts from
// posts/<blog-id>.json, plus an "All Posts" link to the blog page if gen_news.js --site wrote news/blog/<blog-id>.md

// --- Config ---
const ROOT_DIR = path.join(__dirname, '..'); // repo root (this script lives in src/)
const POSTS_DIR = path.join(ROOT_DIR, 'posts');
const BLOGS_JSON = path.join(ROOT_DIR, 'blogs.json');
const BLOG_PAGES_DIR = path.join(ROOT_DIR, 'news', 'blog');
const LATEST_POSTS = 5;
// Each file with the prefix of its links to the site root
const FILES = [
    { file: path.join(ROOT_DIR, 'README.md'), prefix: '' },
    { file: path.join(ROOT_DIR, 'blogs', 'README.md'), prefix: '../' },
];

const escHtml = s => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\{/g, '&#123;') // keep Liquid from interpreting {{ }} / {% %} in titles
    .replace(/\}/g, '&#125;');

// Date in YYYY-MM-DD (UTC), empty if not parsable
function formatDate(date) {
    const d = new Date(date);
    if (!date || isNaN(d)) return '';
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Kept on a single line so kramdown treats it as one raw HTML block
function renderPosts(items, allPostsHref) {
    let lis = items.map(item => {
        const dateStr = formatDate(item.date); // set by fix_post_times.js
        const text = dateStr ? `${dateStr} ${item.title}` : item.title;
        return `<li><span>›</span><a href="${escHtml(item.link)}" target="_blank" rel="noopener noreferrer">${escHtml(text)}</a></li>`;
    }).join('');
    if (allPostsHref) lis += `<li><span>›</span><a href="${escHtml(allPostsHref)}">All Posts</a></li>`;
    return `<blockquote><details><summary>Latest Posts</summary><div><ul>${lis}</ul></div></details></blockquote>`;
}

// --- Load posts for blogs that have a feed ---
const blogsConfig = JSON.parse(fs.readFileSync(BLOGS_JSON, 'utf8'));
const postsMap = {};
for (const blog of blogsConfig) {
    const file = path.join(POSTS_DIR, `${blog.id}.json`);
    if (blog.feed && fs.existsSync(file)) {
        postsMap[blog.id] = JSON.parse(fs.readFileSync(file, 'utf8'))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, LATEST_POSTS);
    }
}

// --- Fill placeholders ---
for (const { file, prefix } of FILES) {
    let rendered = 0;
    const content = fs.readFileSync(file, 'utf8').replace(
        /<div id="([^"]+)" class="blog-posts"><\/div>/g,
        (match, id) => {
            const items = postsMap[id];
            if (!items || items.length === 0) return match;
            rendered++;
            const blogPage = fs.existsSync(path.join(BLOG_PAGES_DIR, `${id}.md`)) ? `${prefix}news/blog/${id}.html` : null;
            return `<div id="${id}" class="blog-posts">${renderPosts(items, blogPage)}</div>`;
        });
    fs.writeFileSync(file, content, 'utf8');
    console.log(`${path.relative(ROOT_DIR, file)}: rendered ${rendered} post lists`);
}
