const fs = require('fs');

const INPUT_FILE = 'blogs.json';
const OUTPUT_FILE = 'blogs.opml';

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

const outlines = blogs.map(blog => {
  const text = blog.author || blog.title;
  const title = blog.title || blog.author;
  const htmlUrl = blog.url;
  const xmlUrl = blog.feed;
  
  return `<outline type="rss" text="${text}" title="${title}" htmlUrl="${htmlUrl}" xmlUrl="${xmlUrl}" />`;
}).join('\n');

const opml = opmlHeader + outlines + '\n' + opmlFooter;

fs.writeFileSync(OUTPUT_FILE, opml, 'utf8');

console.log(`OPML file generated: ${OUTPUT_FILE}`);
