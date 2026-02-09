const fs = require('fs');

// Read files
const blogsJson = JSON.parse(fs.readFileSync('blogs.json', 'utf8'));
const readme = fs.readFileSync('README.md', 'utf8');

// Extract GitHub URLs for each blog by finding the div id and looking for github links above it
const githubMap = {};

// Split readme into lines for easier parsing
const lines = readme.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Find lines with div id
  const divMatch = line.match(/<div id="([^"]+)" class="blog-posts"><\/div>/);
  if (divMatch) {
    const blogId = divMatch[1];
    
    // Look backwards from this line to find github URL (within ~10 lines)
    for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
      const prevLine = lines[j];
      const githubMatch = prevLine.match(/<(https:\/\/github\.com\/[^>]+)>/);
      if (githubMatch) {
        githubMap[blogId] = githubMatch[1];
        break;
      }
      
      // Stop if we hit another blog's icon (starting a new section)
      if (prevLine.startsWith('![icon](favicons/')) {
        break;
      }
    }
  }
}

// Update blogs.json with github field in correct position
const updatedBlogs = blogsJson.map(blog => {
  const github = githubMap[blog.title] || '';
  
  return {
    author: blog.author,
    name: blog.name,
    title: blog.title,
    htmlUrl: blog.htmlUrl,
    feedUrl: blog.feedUrl,
    github: github,
    category: blog.category,
    icon: blog.icon
  };
});

// Save with proper formatting
fs.writeFileSync('blogs.json', JSON.stringify(updatedBlogs, null, 2));
console.log(`Updated blogs.json with GitHub URLs for ${Object.keys(githubMap).length} blogs`);
console.log('GitHub links found for:', Object.keys(githubMap).join(', '));
