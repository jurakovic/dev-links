#!/bin/bash

function update() {
  id=$1
  feed=$2
  echo "Processing feed: $id"

  # Fetch and parse feed into a variable
  new_json=$(curl -Ss -k -L "$feed" -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0' | \
  yq -p=xml -o=json '
    (
      .rss.channel.item // .feed.entry
    )
    | select(length > 0)
    | .[:5]
    | map({
        "title": (
               .title.__text
            // .title["+content"]
            // .title["xhtml:div"]["xhtml:a"]["+content"]
            // .title.div.a["+content"]
            // .title
        ),
        "link": (
              (.link[] | select(.["+@rel"] == "alternate")["+@href"])
            // .link["+@href"]
            // .link.href
            // .link._href
            // .link
        ),
        "pubDate": (
               .pubDate
            // .published
            // .updated
        )
      })
  ')

  if [ $? -ne 0 ] || [ -z "$new_json" ] || [ "$new_json" = "null" ]; then
    echo "  [ERROR] Failed to process $id ($feed)"
    return
  fi

  # Set post dates (fix midnight, future and lagged dates) via node script.
  # Capture into variable first — redirecting stdout directly to "$id.json" would truncate
  # the file before node's synchronous read of the existing content could run.
  fixed_json=$(echo "$new_json" | node ../fix_post_times.js "$id.json" "$newest_listed")

  if [ $? -ne 0 ] || [ -z "$fixed_json" ]; then
    echo "  [ERROR] Failed to process $id ($feed)"
    return
  fi

  echo "$fixed_json" > "$id.json"

  if [ ! -s "$id.json" ]; then
    echo "  [ERROR] Failed to write $id"
    git restore "$id.json"
  fi
}

cd posts

# Newest date listed on dev-news, read once before any feed is updated.
# fix_post_times.js moves new posts dated before it (shown by their feed late) to the top.
newest_listed=$(node -e '
  const fs = require("fs");
  let newest = -Infinity;
  for (const file of fs.readdirSync(".").filter(f => f.endsWith(".json"))) {
    let posts = [];
    try { posts = JSON.parse(fs.readFileSync(file, "utf8")); } catch (_) {}
    for (const post of Array.isArray(posts) ? posts : []) {
      const t = new Date(post.date).getTime();
      if (t > newest) newest = t;
    }
  }
  if (isFinite(newest)) console.log(new Date(newest).toISOString());
')
echo "Newest listed: ${newest_listed:-none}"

# Get blog IDs from CLI arguments (if any)
target_blogs=("$@")

# Read blogs from blogs.json and process each one
# --binary / -b:
# Windows users using WSL, MSYS2, or Cygwin, should use this option when using a native jq.exe, otherwise jq will turn newlines (LFs) into carriage-return-then-newline (CRLF).
jq -b -r '.[] | "\(.id)|\(.feed)"' ../blogs.json | while IFS='|' read -r id feed; do
  if [ -n "$feed" ]; then
    # If target_blogs is specified, only process those IDs
    if [ ${#target_blogs[@]} -gt 0 ]; then
      # Check if current id is in target_blogs array
      if [[ " ${target_blogs[@]} " =~ " ${id} " ]]; then
        update "$id" "$feed"
      fi
    else
      # No filter, update all
      update "$id" "$feed"
    fi
  fi
done

echo "Done"
