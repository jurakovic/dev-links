const fs = require('fs');

// Read files
const blogsJson = JSON.parse(fs.readFileSync('blogs.json', 'utf8'));
const readme = fs.readFileSync('README.md', 'utf8');

// Filter management blogs
const managementBlogs = blogsJson.filter(blog => blog.category === 'management');

// Generate markdown for each management blog
const managementMarkdown = managementBlogs.map(blog => {
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
  lines.push(`<${blog.feedUrl}>  `);
  lines.push(`<div id="${blog.title}" class="blog-posts"></div>`);
  
  return lines.join('\n');
}).join('\n\n');

// Replace content between markers
const beginMarker = '<!-- BEGIN MANAGEMENT -->';
const endMarker = '<!-- END MANAGEMENT -->';

const beginIndex = readme.indexOf(beginMarker);
const endIndex = readme.indexOf(endMarker);

if (beginIndex === -1 || endIndex === -1) {
  console.error('Error: Could not find BEGIN/END MANAGEMENT markers in README.md');
  process.exit(1);
}

const before = readme.substring(0, beginIndex + beginMarker.length);
const after = readme.substring(endIndex);

const newReadme = before + '\n\n' + managementMarkdown + '\n\n' + after;

// Write updated README
fs.writeFileSync('README.md', newReadme);
console.log(`Updated README.md with ${managementBlogs.length} management blogs`);
