const fs = require('fs');
const path = require('path');

// --- Config ---
const POSTS_DIR = path.join(__dirname, 'posts');
const TEMPLATE_FILE = path.join(__dirname, 'README.template');
const OUTPUT_FILE = path.join(__dirname, 'README.md');
const BLOGS_JSON = path.join(__dirname, 'blogs.json');
const FAVICON_PATH = '/favicons/';

// --- Load blogs config ---
const blogsConfig = JSON.parse(fs.readFileSync(BLOGS_JSON, 'utf8'));
const iconMap = {};
for (const blog of blogsConfig) {
    iconMap[blog.id] = blog.icon;
}

// --- Read all json files ---
const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.json'));
let allPosts = [];
for (const file of files) {
    const feed = path.basename(file, '.json');
    const data = JSON.parse(fs.readFileSync(path.join(POSTS_DIR, file), 'utf8'));
    for (const post of data) {
        allPosts.push({
            ...post,
            feed
        });
    }
}

// --- Sort by pubDate descending ---
allPosts.sort((a, b) => {
    // Date parsing: JS Date handles all your formats
    const ad = new Date(a.pubDate);
    const bd = new Date(b.pubDate);
    return bd - ad;
});

// --- Take first 50 ---
const posts50 = allPosts.slice(0, 50);

// --- Load template ---
let md = fs.readFileSync(TEMPLATE_FILE, 'utf8');

// --- Generate markdown ---
console.log(`Generating file: README.md`);
for (const post of posts50) {
    // Date in YYYY-MM-DD
    let d = new Date(post.pubDate);
    let yyyy = d.getFullYear();
    let mm = String(d.getMonth() + 1).padStart(2, '0');
    let dd = String(d.getDate()).padStart(2, '0');
    let dateStr = isNaN(yyyy) ? post.pubDate : `${yyyy}-${mm}-${dd}`;
    // Icon from blogs.json
    let icon = iconMap[post.feed] || 'blank';
    // Markdown escape for title (minimal)
    let escTitle = post.title.replace(/([*_`\[\]])/g, '\\$1');
    // Output
    md += `![icon](${FAVICON_PATH}${icon}.png) <small>${dateStr} ${post.feed}</small>  \n`;
    md += `<small>[${escTitle}](${post.link})</small>\n\n`;
}

fs.writeFileSync(OUTPUT_FILE, md, 'utf8');
