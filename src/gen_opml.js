const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..'); // repo root (this script lives in src/)
const INPUT_FILE = path.join(ROOT_DIR, 'blogs.json');
const OUTPUT_FILE = path.join(ROOT_DIR, 'blogs.opml');

const blogs = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

const opmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
<head><title>Dev Links</title></head>
<body>
<outline text="Dev Links" title="Dev Links">
`;

const opmlFooter = `</outline>
</body>
</opml>
`;

// Escape characters that are not allowed in XML attribute values
const escapeXml = (value) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const outlines = blogs.map(blog => {
  const text = escapeXml(blog.author || blog.title);
  const title = escapeXml(blog.title || blog.author);
  const htmlUrl = escapeXml(blog.url);
  const xmlUrl = escapeXml(blog.feed);
  
  return `<outline type="rss" text="${text}" title="${title}" htmlUrl="${htmlUrl}" xmlUrl="${xmlUrl}" />`;
}).join('\n');

const opml = opmlHeader + outlines + '\n' + opmlFooter;

fs.writeFileSync(OUTPUT_FILE, opml, 'utf8');

console.log(`OPML file generated: ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);
