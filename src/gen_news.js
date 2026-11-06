const fs = require('fs');
const path = require('path');

// Generates the news page from posts/*.json, in one of two forms:
//
//   node src/gen_news.js [content-branch]   README.md: the news page on the dev-news branch, read on GitHub.
//                                           Links to master content (pages, favicons) are absolute, to the
//                                           content branch, the one blogs.json came from (default: master).
//   node src/gen_news.js --site             news/README.md: the news page of the Pages site, with links
//                                           relative to news/, so they stay within the site.
//
// Links to master content go through PAGE_BASE and FAVICON_BASE. Links from one dev-news page to
// another are relative, so they stay on the same branch on GitHub and within the site on Pages.
const site = process.argv[2] === '--site';
const branchName = site ? null : (process.argv[2] || 'master');

// --- Config ---
const ROOT_DIR = path.join(__dirname, '..'); // repo root (this script lives in src/)
const POSTS_DIR = path.join(ROOT_DIR, 'posts');
const TEMPLATE_FILE = path.join(ROOT_DIR, 'README.template');
const OUTPUT_FILE = site ? path.join(ROOT_DIR, 'news', 'README.md') : path.join(ROOT_DIR, 'README.md');
const BLOGS_JSON = path.join(ROOT_DIR, 'blogs.json');
const PAGE_BASE = site ? '..' : `https://github.com/jurakovic/dev-links/blob/${branchName}`;
const FAVICON_BASE = site ? '../favicons/' : `https://raw.githubusercontent.com/jurakovic/dev-links/refs/heads/${branchName}/favicons/`;
const README_URL = `${PAGE_BASE}/README.md`;
const BLOGS_README_URL = `${PAGE_BASE}/blogs/README.md`;

// --- Category tags: label, CSS class (tag-*) and link to the category section ---
// Main categories link to the official sections in README.md, the rest to blogs/README.md
const CATEGORY_TAGS = {
    'ai-main':        { label: 'AI',                 cls: 'ai',             url: `${README_URL}#ai` },
    'ai':             { label: 'AI',                 cls: 'ai',             url: `${BLOGS_README_URL}#blogs-ai` },
    'dotnet-main':    { label: '.NET',               cls: 'net',            url: `${README_URL}#net` },
    'dotnet':         { label: '.NET',               cls: 'net',            url: `${BLOGS_README_URL}#blogs-net` },
    'sql-main':       { label: 'SQL Server',         cls: 'sql',            url: `${README_URL}#sql-server` },
    'sql':            { label: 'SQL Server',         cls: 'sql',            url: `${BLOGS_README_URL}#blogs-sql` },
    'arch-main':      { label: 'Architecture',       cls: 'architecture',   url: `${README_URL}#architecture` },
    'general':        { label: 'General',            cls: 'general',        url: `${BLOGS_README_URL}#blogs-general` },
    'systems-data':   { label: 'Systems &amp; Data', cls: 'systems',        url: `${BLOGS_README_URL}#blogs-systems` },
    'management':     { label: 'Management',         cls: 'management',     url: `${BLOGS_README_URL}#blogs-management` },
    'tech-companies': { label: 'Tech Companies',     cls: 'tech-companies', url: `${BLOGS_README_URL}#blogs-tech-companies` },
};

// --- Load blogs config ---
const blogsConfig = JSON.parse(fs.readFileSync(BLOGS_JSON, 'utf8'));
const iconMap = {};
const categoryMap = {};
for (const blog of blogsConfig) {
    iconMap[blog.id] = blog.icon;
    categoryMap[blog.id] = blog.category;
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

// --- Sort by date descending (`date` set by fix_post_times.js) ---
allPosts.sort((a, b) => {
    const ad = new Date(a.date);
    const bd = new Date(b.date);
    return bd - ad;
});

// --- Take first 100 ---
const posts100 = allPosts.slice(0, 100);

let md = `
<a name="top"></a>[dev-links](${README_URL}#content)  
└─ [dev-blogs](${BLOGS_README_URL}) / ***dev-news***  

* * *

`;

// --- Generate markdown ---
for (const post of posts100) {
    // Date in YYYY-MM-DD
    let d = new Date(post.date);
    let yyyy = d.getFullYear();
    let mm = String(d.getMonth() + 1).padStart(2, '0');
    let dd = String(d.getDate()).padStart(2, '0');
    let dateStr = isNaN(yyyy) ? post.date : `${yyyy}-${mm}-${dd}`;
    // Icon from blogs.json
    let icon = iconMap[post.feed] || 'blank';
    // Category tag linking to its section (GitHub strips the class and shows a plain <kbd>)
    let tag = CATEGORY_TAGS[categoryMap[post.feed]];
    let tagStr = tag ? ` [<kbd class="tag tag-${tag.cls}">${tag.label}</kbd>](${tag.url})` : '';
    // Markdown escape for title (minimal)
    let escTitle = post.title.replace(/([*_`\[\]])/g, '\\$1').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Output
    md += `![icon](${FAVICON_BASE}${icon}.png) <small>${dateStr} ${post.feed}${tagStr}</small>  \n`;
    md += `<small>[${escTitle}](${post.link})</small>\n\n`;
}

md += `<sub><a href="#top">↑ Top</a></sub>\n`;

fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, md, 'utf8');

console.log(`News page generated: ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);
