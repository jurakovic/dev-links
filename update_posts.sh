#!/bin/bash

function update() {
  url=$1
  name=$2
  echo "Processing feed: $name"

  curl -Ss -k -L "$url" -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0' | \
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
  ' > "$name.json"

  if [ $? -ne 0 ] || [ ! -s "$name.json" ]; then
    echo "  [ERROR] Failed to process $name ($url)"
    git restore "$name.json"
  fi
}

if [ -d "posts" ]; then
  cd posts
else
  if [ -d "../dev-news/posts" ]; then
    cd ../dev-news/posts
  else
    echo "Error: Posts directory not found in current or parent directory."
    exit 1
  fi
fi

# Read blogs from blogs.json and process each one
# --binary / -b:
# Windows users using WSL, MSYS2, or Cygwin, should use this option when using a native jq.exe, otherwise jq will turn newlines (LFs) into carriage-return-then-newline (CRLF).
jq -b -r '.[] | "\(.feedUrl)|\(.title)"' ../blogs.json | while IFS='|' read -r feed_url title; do
  update "$feed_url" "$title"
done

cd -
node gen_news.js

echo "Done"
