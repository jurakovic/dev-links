const fs = require('fs');

// Get optional category from command line argument
const targetCategory = process.argv[2];

// Read files
const blogsJson = JSON.parse(fs.readFileSync('blogs.json', 'utf8')).filter(blog => blog.selected === true);
let readme = fs.readFileSync('README.md', 'utf8');

// Extract all unique categories
const allCategories = [...new Set(blogsJson.map(blog => blog.category))];

// Determine which categories to process
const categories = targetCategory ? [targetCategory] : allCategories;

if (targetCategory) {
    if (!allCategories.includes(targetCategory)) {
        console.error(`Error: Category "${targetCategory}" not found in blogs.json`);
        console.error(`Available categories: ${allCategories.join(', ')}`);
        process.exit(1);
    }
    console.log(`Updating category: ${targetCategory}`);
} else {
    console.log(`Found ${categories.length} categories: ${categories.join(', ')}`);
}

// Process each category
categories.forEach(category => {
    // Filter blogs by category
    const categoryBlogs = blogsJson.filter(blog => blog.category === category);

    if (categoryBlogs.length === 0) {
        console.warn(`Warning: No blogs found with category "${category}"`);
        return;
    }

    // Generate markdown for each blog
    const categoryMarkdown = categoryBlogs.map(blog => {
        const lines = [];
        lines.push(`![icon](favicons/${blog.icon}.png)`);

        // Author | Title line (handle empty name case)
        if (blog.author && blog.title) {
            lines.push(`${blog.author} | ${blog.title}  `);
        } else if (blog.author) {
            lines.push(`${blog.author}  `);
        } else {
            lines.push(`${blog.title}  `);
        }

        lines.push(`<${blog.url}>  `);

        // Add extra URLs if they exist
        if (blog.extras && blog.extras.length > 0) {
            blog.extras.forEach(url => {
                lines.push(`<${url}>  `);
            });
        }

        // Add GitHub URL if it exists
        if (blog.github) {
            lines.push(`<${blog.github}>  `);
        }

        // Add blog posts div if feed exists
        if (blog.feed) {
            lines.push(`<div id="${blog.id}" class="blog-posts"></div>`);
        }

        return lines.join('\n');
    }).join('\n\n');

    // Replace content between markers
    const categoryUpper = category.toUpperCase();
    const beginMarker = `<!-- BEGIN ${categoryUpper} -->`;
    const endMarker = `<!-- END ${categoryUpper} -->`;

    const beginIndex = readme.indexOf(beginMarker);
    const endIndex = readme.indexOf(endMarker);

    if (beginIndex === -1 || endIndex === -1) {
        console.warn(`Warning: Could not find BEGIN/END ${categoryUpper} markers in README.md`);
        return;
    }

    const before = readme.substring(0, beginIndex + beginMarker.length);
    const after = readme.substring(endIndex);

    readme = before + '\n\n' + categoryMarkdown + '\n\n' + after;

    console.log(`Updated README.md with ${categoryBlogs.length} ${category} blogs`);
});

// Write updated README
fs.writeFileSync('README.md', readme);
console.log('\nREADME.md update complete');
