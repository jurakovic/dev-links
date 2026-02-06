#!/bin/bash

INPUT_FILE="blogs.json"
OUTPUT_FILE="blogs.opml"

# Start generating OPML
cat > "$OUTPUT_FILE" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
<head><title>Dev Links</title></head>
<body>
<outline text="Dev Links" title="Dev Links">
EOF

# Process all blogs
jq -r '.[] | "<outline type=\"rss\" text=\"\(.title)\" title=\"\(.title)\" htmlUrl=\"\(.htmlUrl)\" xmlUrl=\"\(.feedUrl)\" />"' "$INPUT_FILE" >> "$OUTPUT_FILE"

# Close OPML
cat >> "$OUTPUT_FILE" << 'EOF'
</outline>
</body>
</opml>
EOF

echo "OPML file generated: $OUTPUT_FILE"
