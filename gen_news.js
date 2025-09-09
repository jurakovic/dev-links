const fs = require('fs');
const path = require('path');

// --- Config ---
const POSTS_DIR = path.join(__dirname, 'posts');
const OUTPUT_FILE = path.join(__dirname, 'news', 'README2.md');
const FAVICON_PATH = '../favicons/';

// --- Helper to get icon name ---
function getIconName(feed) {
    switch (feed) {
        case 'dotnet':
        case 'visualstudio':
            return 'microsoft';
        case 'davecallan':
        case 'jonskeet':
            return 'wp';
        case 'bartwullems':
            return 'blogspot';
        case 'adamsitnik':
        case 'antirez':
        case 'erikej':
        case 'microservices':
        case 'paulhammant':
            return 'blank';
        default:
            return feed;
    }
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

// --- Write markdown ---
let md = '';
md += `[dev-links](../README.md#content)  \n`;
md += `└─ [Blogs](../README.md#blogs) / ***Reader***  \n\n`;
md += `* * *\n\n`;
for (const post of posts50) {
    // Date in YYYY-MM-DD
    let d = new Date(post.pubDate);
    let yyyy = d.getFullYear();
    let mm = String(d.getMonth() + 1).padStart(2, '0');
    let dd = String(d.getDate()).padStart(2, '0');
    let dateStr = isNaN(yyyy) ? post.pubDate : `${yyyy}-${mm}-${dd}`;
    // Icon
    let icon = getIconName(post.feed);
    // Markdown escape for title (minimal)
    let escTitle = post.title.replace(/([*_`\[\]])/g, '\\$1');
    // Output
    md += `![icon](${FAVICON_PATH}${icon}.png) ${dateStr} ${post.feed}  \n`;
    md += `[${escTitle}](${post.link})\n\n`;
}

fs.writeFileSync(OUTPUT_FILE, md, 'utf8');
console.log(`Generated ${OUTPUT_FILE}`);
