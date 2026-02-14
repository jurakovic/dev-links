const fs = require('fs');

// Get command line arguments
const args = process.argv.slice(2);
const flag = args[0];
const targetCategory = flag && flag.startsWith('--') ? args[1] : args[0];

// Determine which files to update
let updateReadme = false;
let updateBlogs = false;

if (flag === '--readme') {
    updateReadme = true;
} else if (flag === '--blogs') {
    updateBlogs = true;
} else if (flag === '--all') {
    updateReadme = true;
    updateBlogs = true;
} else {
    // Default: update README.md if no flag provided
    updateReadme = true;
}

// Function to update a file
function updateFile(outputFile, filterSelected) {
    // Read files
    const blogsJson = JSON.parse(fs.readFileSync('blogs.json', 'utf8'))
        .filter(blog => filterSelected ? blog.selected === true : true);
    let readme = fs.readFileSync(outputFile, 'utf8');

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
        console.log(`[${outputFile}] Updating category: ${targetCategory}`);
    } else {
        console.log(`[${outputFile}] Found ${categories.length} categories: ${categories.join(', ')}`);
    }

    // Process each category
    categories.forEach(category => {
        // Filter blogs by category
        const categoryBlogs = blogsJson.filter(blog => blog.category === category);

        if (categoryBlogs.length === 0) {
            console.warn(`[${outputFile}] Warning: No blogs found with category "${category}"`);
            return;
        }

        // Generate markdown for each blog
        const categoryMarkdown = categoryBlogs.map(blog => {
            const lines = [];
            const faviconPath = outputFile === 'README.md' ? `favicons/${blog.icon}.png` : `../favicons/${blog.icon}.png`;
            lines.push(`![icon](${faviconPath})`);

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
            console.warn(`[${outputFile}] Warning: Could not find BEGIN/END ${categoryUpper} markers`);
            return;
        }

        const before = readme.substring(0, beginIndex + beginMarker.length);
        const after = readme.substring(endIndex);

        readme = before + '\n\n' + categoryMarkdown + '\n\n' + after;

        console.log(`[${outputFile}] Updated with ${categoryBlogs.length} ${category} blogs`);
    });

    // Write updated file
    fs.writeFileSync(outputFile, readme);
    console.log(`[${outputFile}] Update complete\n`);
}

// Execute updates based on flags
if (updateReadme) {
    updateFile('README.md', true);  // true = filter selected only
}

if (updateBlogs) {
    updateFile('blogs/README.md', false);  // false = all blogs
}
