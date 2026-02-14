const fs = require('fs');
const https = require('https');
const http = require('http');

// Usage: node add_blog.js <url> <feed> [github] [author] [category]
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node add_blog.js <url> <feed> [github] [author] [category]');
  console.log('Example: node add_blog.js https://third-bit.com/blog/ https://third-bit.com/atom.xml https://github.com/gvwilson "Greg Wilson" general');
  process.exit(1);
}

const url = args[0];
const feed = args[1];
const github = args[2] || '';
const author = args[3] || '';
const category = args[4] || 'general';

// Extract id from hostname (without TLD)
function getIdFromUrl(urlString) {
  try {
    const hostname = new URL(urlString).hostname.replace('www.', '');
    const parts = hostname.split('.');
    // Remove last part (TLD like .com, .net, .org)
    return parts.length > 1 ? parts.slice(0, -1).join('-') : hostname;
  } catch (e) {
    return 'unknown';
  }
}

// Fetch page title from HTML
function fetchTitle(urlString) {
  return new Promise((resolve, reject) => {
    const client = urlString.startsWith('https') ? https : http;
    
    const timeout = setTimeout(() => {
      req.destroy();
      resolve(''); // Resolve with empty string on timeout
    }, 10000); // 10 second timeout
    
    const req = client.get(urlString, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
        // Stop early if we found the title
        if (data.includes('</title>')) {
          clearTimeout(timeout);
          req.destroy();
          const match = data.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (match) {
            resolve(match[1].trim());
          } else {
            resolve('');
          }
        }
      });
      
      res.on('end', () => {
        clearTimeout(timeout);
        const match = data.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (match) {
          resolve(match[1].trim());
        } else {
          resolve('');
        }
      });
      
      res.on('error', (err) => {
        clearTimeout(timeout);
        console.log(`Warning: Could not fetch title - ${err.message}`);
        resolve(''); // Resolve with empty string on error
      });
    });
    
    req.on('error', (err) => {
      clearTimeout(timeout);
      console.log(`Warning: Could not fetch title - ${err.message}`);
      resolve(''); // Resolve with empty string on error
    });
  });
}

// Download favicon
function downloadFavicon(urlString, iconName) {
  return new Promise((resolve, reject) => {
    const domain = new URL(urlString).hostname.replace('www.', '');
    const faviconUrl = `https://www.google.com/s2/favicons?sz=16&domain=${domain}`;
    const outputPath = `favicons/${iconName}.png`;
    
    const downloadFile = (url, redirectCount = 0) => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'));
        return;
      }
      
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        // Handle redirects
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
          const redirectUrl = res.headers.location;
          if (redirectUrl) {
            console.log(`Following redirect to: ${redirectUrl}`);
            downloadFile(redirectUrl, redirectCount + 1);
            return;
          }
        }
        
        // Handle 404 - use blank icon
        if (res.statusCode === 404) {
          console.log(`✗ Favicon not found (404), using blank icon`);
          resolve('blank');
          return;
        }
        
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download: ${res.statusCode}`));
          return;
        }
        
        const fileStream = fs.createWriteStream(outputPath);
        res.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`✓ Downloaded favicon: ${outputPath}`);
          resolve(iconName);
        });
        
        fileStream.on('error', reject);
      }).on('error', reject);
    };
    
    downloadFile(faviconUrl);
  });
}

async function addBlog() {
  try {
    const id = getIdFromUrl(url);
    console.log(`ID: ${id}`);
    
    console.log('Fetching page title...');
    const title = await fetchTitle(url);
    console.log(`Title: ${title || '(empty)'}`);
    
    console.log('Downloading favicon...');
    const icon = await downloadFavicon(url, id);
    
    // Create new blog entry
    const newBlog = {
      id,
      author,
      title,
      url,
      feed,
      extras: [],
      github,
      category,
      icon
    };
    
    // Read existing blogs
    const blogsPath = 'blogs.json';
    const blogs = JSON.parse(fs.readFileSync(blogsPath, 'utf8'));
    
    // Check if blog already exists
    const exists = blogs.some(b => b.id === id);
    if (exists) {
      console.log(`\n⚠ Blog with id "${id}" already exists!`);
      return;
    }
    
    // Add new blog
    blogs.push(newBlog);
    
    // Save updated blogs
    fs.writeFileSync(blogsPath, JSON.stringify(blogs, null, 2), 'utf8');
    
    console.log('\n✓ Blog added successfully!');
    console.log(JSON.stringify(newBlog, null, 2));
    
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addBlog();
