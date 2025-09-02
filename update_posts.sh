#!/bin/bash


function update() {
  url=$1
  name=$2
  curl -s "$url" -H 'user-agent: Mozilla/5.0' | yq -p=xml -o=json '.rss.channel.item | select(length > 0) | .[:5] | map({"title": .title, "link": .link})' > $name.json
}

yq -Version

cd posts

update "https://devblogs.microsoft.com/dotnet/feed/" "dotnet"
update "https://devblogs.microsoft.com/visualstudio/feed/" "visualstudio"
update "https://visualstudiomagazine.com/rss-feeds/news.aspx" "visualstudiomagazine"

find .
