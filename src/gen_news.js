const fs = require('fs');
const path = require('path');

// Generates the news page from posts/*.json, and next to it one page per category and one per blog,
// in one of two forms:
//
//   node src/gen_news.js [content-branch]   README.md, category/<slug>/README.md and blog/<id>.md: the news
//                                           pages on the dev-news branch, read on GitHub. Links to master
//                                           content (pages, favicons) are absolute, to the content branch,
//                                           the one blogs.json came from (default: master).
//   node src/gen_news.js --site             news/README.md, news/category/<slug>/README.md and news/blog/<id>.md:
//                                           the news pages of the Pages site, with links relative to each
//                                           page's own folder, so they stay within the site.
//
// The news and category pages take each blog's NEWS_POSTS_PER_BLOG newest posts; a blog page lists all its
// stored posts. Links to master content go through bases(depth), where depth is the page's folder depth below
// the output folder: 0 for the news page, 1 for a blog page, 2 for a category page. Links from one dev-news page to another are relative,
// so they stay on the same branch on GitHub and within the site on Pages.
const site = process.argv[2] === '--site';
const branchName = site ? null : (process.argv[2] || 'master');

// --- Config ---
const ROOT_DIR = path.join(__dirname, '..'); // repo root (this script lives in src/)
const POSTS_DIR = path.join(ROOT_DIR, 'posts');
const TEMPLATE_FILE = path.join(ROOT_DIR, 'README.template');
const OUT_DIR = site ? path.join(ROOT_DIR, 'news') : ROOT_DIR;
const OUTPUT_FILE = path.join(OUT_DIR, 'README.md');
const CATEGORY_DIR = path.join(OUT_DIR, 'category');
const BLOG_DIR = path.join(OUT_DIR, 'blog');
const BLOGS_JSON = path.join(ROOT_DIR, 'blogs.json');
const MAX_POSTS = 100; // posts per news or category page
const NEWS_POSTS_PER_BLOG = 5; // newest posts of each blog on the news and category pages

// Bases for links to master content from a page `depth` folders below OUT_DIR: pages and favicons.
// On GitHub, absolute URLs to the content branch, whatever the depth; on the site, relative to the page's folder.
function bases(depth) {
    if (!site) {
        return {
            page: `https://github.com/jurakovic/dev-links/blob/${branchName}`,
            favicon: `https://raw.githubusercontent.com/jurakovic/dev-links/refs/heads/${branchName}/favicons/`,
        };
    }
    const page = ['..', ...Array(depth).fill('..')].join('/');
    return { page, favicon: `${page}/favicons/` };
}

// --- Category tags: label, CSS class (tag-*) and category page (category/<slug>/README.md) ---
// A category and its *-main counterpart share one tag and one page
const CATEGORY_TAGS = {
    'ai-main':        { label: 'AI',                 cls: 'ai',             slug: 'ai' },
    'ai':             { label: 'AI',                 cls: 'ai',             slug: 'ai' },
    'dotnet-main':    { label: '.NET',               cls: 'net',            slug: 'dotnet' },
    'dotnet':         { label: '.NET',               cls: 'net',            slug: 'dotnet' },
    'sql-main':       { label: 'SQL Server',         cls: 'sql',            slug: 'sql' },
    'sql':            { label: 'SQL Server',         cls: 'sql',            slug: 'sql' },
    'arch-main':      { label: 'Architecture',       cls: 'architecture',   slug: 'architecture' },
    'general':        { label: 'General',            cls: 'general',        slug: 'general' },
    'systems-data':   { label: 'Systems &amp; Data', cls: 'systems',        slug: 'systems-data' },
    'management':     { label: 'Management',         cls: 'management',     slug: 'management' },
    'tech-companies': { label: 'Tech Companies',     cls: 'tech-companies', slug: 'tech-companies' },
};

// --- Load blogs config ---
const blogsConfig = JSON.parse(fs.readFileSync(BLOGS_JSON, 'utf8'));
const blogMap = {};
const iconMap = {};
const categoryMap = {};
for (const blog of blogsConfig) {
    blogMap[blog.id] = blog;
    iconMap[blog.id] = blog.icon;
    categoryMap[blog.id] = blog.category;
}

// --- Sort by date descending (`date` set by fix_post_times.js) ---
const byDateDesc = (a, b) => new Date(b.date) - new Date(a.date);

// --- Read all json files: every post for the blog pages, each blog's newest for the news and category pages ---
const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.json'));
const postsByBlog = {};
let allPosts = [];
for (const file of files) {
    const feed = path.basename(file, '.json');
    const data = JSON.parse(fs.readFileSync(path.join(POSTS_DIR, file), 'utf8'));
    const posts = data.map(post => ({ ...post, feed })).sort(byDateDesc);
    postsByBlog[feed] = posts;
    allPosts.push(...posts.slice(0, NEWS_POSTS_PER_BLOG));
}
allPosts.sort(byDateDesc);

// Date in YYYY-MM-DD (local time), the raw value if not parsable
function formatDate(date) {
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return isNaN(yyyy) ? date : `${yyyy}-${mm}-${dd}`;
}

// Markdown escape for titles (minimal); curly braces keep Liquid from interpreting {{ }} / {% %} on the site
const escTitle = s => s
    .replace(/([*_`\[\]])/g, '\\$1')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;');

// Breadcrumb back to dev-links and dev-blogs, with the `top` anchor; `current` ends it
function breadcrumb(base, current) {
    return `<a name="top"></a>[dev-links](${base.page}/README.md#content)  \n` +
           `└─ [dev-blogs](${base.page}/blogs/README.md) / ${current}  \n`;
}

// Category tag linking to `href` (GitHub strips the class and shows a plain <kbd>)
const tagLink = (tag, href) => `[<kbd class="tag tag-${tag.cls}">${tag.label}</kbd>](${href})`;

// A post as two lines: favicon, date, blog ID linked to the blog page and category tag, then the title linked
// to the post. blogHref(id) gives the blog page's link, tagHref(tag) the tag's; without it the tag is left out.
function renderPost(post, base, tagHref, blogHref) {
    const icon = iconMap[post.feed] || 'blank'; // icon from blogs.json
    const tag = CATEGORY_TAGS[categoryMap[post.feed]];
    const tagStr = tag && tagHref ? ` ${tagLink(tag, tagHref(tag))}` : '';
    return `![icon](${base.favicon}${icon}.png) <small>${formatDate(post.date)} [${post.feed}](${blogHref(post.feed)})${tagStr}</small>  \n` +
           `<small>[${escTitle(post.title)}](${post.link})</small>\n\n`;
}

function writePage(file, md) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, md, 'utf8');
}

// --- News page: the newest posts of all blogs ---
let md = `\n${breadcrumb(bases(0), '***dev-news***')}\n* * *\n\n`;
for (const post of allPosts.slice(0, MAX_POSTS)) {
    md += renderPost(post, bases(0), tag => `category/${tag.slug}/README.md`, id => `blog/${id}.md`);
}
md += `<sub><a href="#top">↑ Top</a></sub>\n`;

writePage(OUTPUT_FILE, md);
console.log(`News page generated: ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);

// --- Category pages: the newest posts of each category's blogs, at category/<slug>/README.md ---
// Removed first, so renamed or emptied categories leave no stale pages
fs.rmSync(CATEGORY_DIR, { recursive: true, force: true });
const categoryPosts = {};
for (const post of allPosts) {
    const tag = CATEGORY_TAGS[categoryMap[post.feed]];
    if (!tag) continue; // no known category: on no page
    (categoryPosts[tag.slug] ||= { tag, posts: [] }).posts.push(post);
}
for (const [slug, { tag, posts }] of Object.entries(categoryPosts)) {
    let page = `\n${breadcrumb(bases(2), `[*dev-news*](../../README.md) / ***${tag.label}***`)}\n* * *\n\n`;
    for (const post of posts.slice(0, MAX_POSTS)) {
        page += renderPost(post, bases(2), null, id => `../../blog/${id}.md`); // every post here has the same tag
    }
    page += `<sub><a href="#top">↑ Top</a></sub>\n`;
    writePage(path.join(CATEGORY_DIR, slug, 'README.md'), page);
}
console.log(`Category pages generated: ${Object.keys(categoryPosts).length}`);

// --- Blog pages: every stored post of one blog, at blog/<id>.md ---
// Removed first, so pages of removed posts files go too
fs.rmSync(BLOG_DIR, { recursive: true, force: true });
let blogPages = 0;
for (const [id, posts] of Object.entries(postsByBlog)) {
    if (posts.length === 0) continue;
    const blog = blogMap[id];
    const base = bases(1);
    // Header: icon, "author | title" (either one alone if the other is empty) linked to the blog, category tag.
    // A blog no longer in blogs.json gets the blank icon and its id, unlinked.
    let header = `![icon](${base.favicon}${iconMap[id] || 'blank'}.png) `;
    if (blog) {
        const name = escTitle([blog.author, blog.title].filter(Boolean).join(' | ') || id);
        header += blog.url ? `[${name}](${blog.url})` : name;
        const tag = CATEGORY_TAGS[blog.category];
        if (tag) header += ` ${tagLink(tag, `../category/${tag.slug}/README.md`)}`;
    } else {
        header += id;
    }
    let page = `\n${breadcrumb(base, `[*dev-news*](../README.md) / ***${id}***`)}\n* * *\n\n${header}\n\n`;
    for (const post of posts) {
        page += `<small>${formatDate(post.date)} [${escTitle(post.title)}](${post.link})</small>  \n`;
    }
    page += `\n<sub><a href="#top">↑ Top</a></sub>\n`;
    writePage(path.join(BLOG_DIR, `${id}.md`), page);
    blogPages++;
}
console.log(`Blog pages generated: ${blogPages}`);
