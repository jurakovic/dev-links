const fs = require('fs');
const path = require('path');

const branchName = process.argv[2] || 'master';

// --- Config ---
const POSTS_DIR = path.join(__dirname, 'posts');
const TEMPLATE_FILE = path.join(__dirname, 'README.template');
const OUTPUT_FILE = path.join(__dirname, 'README.md');
const BLOGS_JSON = path.join(__dirname, 'blogs.json');
const FAVICON_PATH = `https://raw.githubusercontent.com/jurakovic/dev-links/refs/heads/${branchName}/favicons/`;
const README_URL = `https://github.com/jurakovic/dev-links/blob/${branchName}/README.md`;
const BLOGS_README_URL = `https://github.com/jurakovic/dev-links/blob/${branchName}/blogs/README.md`;

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

// --- Sort by pubDate descending ---
allPosts.sort((a, b) => {
    // Date parsing: JS Date handles all your formats
    const ad = new Date(a.pubDate);
    const bd = new Date(b.pubDate);
    return bd - ad;
});

// --- Take first 100 ---
const posts100 = allPosts.slice(0, 100);

let md = `
[dev-links](https://github.com/jurakovic/dev-links/blob/${branchName}/README.md#content)  
└─ [dev-blogs](https://github.com/jurakovic/dev-links/blob/${branchName}/blogs/README.md) / ***dev-news***  

* * *

`;

// --- Generate markdown ---
for (const post of posts100) {
    // Date in YYYY-MM-DD
    let d = new Date(post.pubDate);
    let yyyy = d.getFullYear();
    let mm = String(d.getMonth() + 1).padStart(2, '0');
    let dd = String(d.getDate()).padStart(2, '0');
    let dateStr = isNaN(yyyy) ? post.pubDate : `${yyyy}-${mm}-${dd}`;
    // Icon from blogs.json
    let icon = iconMap[post.feed] || 'blank';
    // Category tag linking to its section (GitHub strips the class and shows a plain <kbd>)
    let tag = CATEGORY_TAGS[categoryMap[post.feed]];
    let tagStr = tag ? ` [<kbd class="tag tag-${tag.cls}">${tag.label}</kbd>](${tag.url})` : '';
    // Markdown escape for title (minimal)
    let escTitle = post.title.replace(/([*_`\[\]])/g, '\\$1').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Output
    md += `![icon](${FAVICON_PATH}${icon}.png) <small>${dateStr} ${post.feed}${tagStr}</small>  \n`;
    md += `<small>[${escTitle}](${post.link})</small>\n\n`;
}

fs.writeFileSync(OUTPUT_FILE, md, 'utf8');

console.log(`News README.md generated`);
