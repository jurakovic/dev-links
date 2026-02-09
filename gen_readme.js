const fs = require('fs');

// Get category from command line argument
const category = process.argv[2];

if (!category) {
    console.error('Usage: node gen_readme.js <category>');
    console.error('Example: node gen_readme.js management');
    console.error('         node gen_readme.js general');
    process.exit(1);
}

// Read files
const blogsJson = JSON.parse(fs.readFileSync('blogs.json', 'utf8'));
const readme = fs.readFileSync('README.md', 'utf8');

// Filter blogs by category
const categoryBlogs = blogsJson.filter(blog => blog.category === category);

if (categoryBlogs.length === 0) {
    console.warn(`Warning: No blogs found with category "${category}"`);
}

// Generate markdown for each blog
const categoryMarkdown = categoryBlogs.map(blog => {
    const lines = [];
    lines.push(`![icon](favicons/${blog.icon}.png)`);

    // Author | Name line (handle empty name case)
    if (blog.name) {
        lines.push(`${blog.author} | ${blog.name}  `);
    } else if (blog.author) {
        lines.push(`${blog.author}  `);
    } else {
        lines.push(`${blog.title}  `);
    }

    lines.push(`<${blog.htmlUrl}>  `);
    
    // Add extra URLs if they exist
    if (blog.extraUrls && blog.extraUrls.length > 0) {
        blog.extraUrls.forEach(url => {
            lines.push(`<${url}>  `);
        });
    }
    
    // Add GitHub URL if it exists
    if (blog.github) {
        lines.push(`<${blog.github}>  `);
    }
    
    lines.push(`<div id="${blog.title}" class="blog-posts"></div>`);

    return lines.join('\n');
}).join('\n\n');

// Replace content between markers
const categoryUpper = category.toUpperCase();
const beginMarker = `<!-- BEGIN ${categoryUpper} -->`;
const endMarker = `<!-- END ${categoryUpper} -->`;

const beginIndex = readme.indexOf(beginMarker);
const endIndex = readme.indexOf(endMarker);

if (beginIndex === -1 || endIndex === -1) {
    console.error(`Error: Could not find BEGIN/END ${categoryUpper} markers in README.md`);
    process.exit(1);
}

const before = readme.substring(0, beginIndex + beginMarker.length);
const after = readme.substring(endIndex);

const newReadme = before + '\n\n' + categoryMarkdown + '\n\n' + after;

// Write updated README
fs.writeFileSync('README.md', newReadme);
console.log(`Updated README.md with ${categoryBlogs.length} ${category} blogs`);
