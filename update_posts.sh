#!/bin/bash

function update() {
  id=$1
  feed=$2
  echo "Processing feed: $id"

  # Save existing posts for time preservation (before any overwrite)
  existing="[]"
  if [ -f "$id.json" ]; then
    existing=$(cat "$id.json")
  fi

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

  # Current UTC time to assign to new posts that have no time (midnight = date-only feed)
  now=$(date -u +"%Y-%m-%dT%H:%M:%S+00:00")

  # Fix midnight times:
  #   - posts already fixed previously (non-midnight in old JSON) -> restore saved time
  #   - new posts with midnight time -> assign current time
  #   - posts with real time -> unchanged
  echo "$new_json" | jq -b --arg now "$now" --argjson existing "$existing" '
    ($existing
      | map(select(.pubDate | test("00:00:00") | not))
      | map({(.link): .pubDate})
      | add // {}
    ) as $fixed |
    map(
      if (.pubDate | test("00:00:00")) then
        if $fixed[.link] != null then .pubDate = $fixed[.link]
        else .pubDate = $now
        end
      else .
      end
    )
  ' > "$id.json"

  if [ $? -ne 0 ] || [ ! -s "$id.json" ]; then
    echo "  [ERROR] Failed to process $id ($feed)"
    git restore "$id.json"
  fi
}

cd posts

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
