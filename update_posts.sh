#!/bin/bash

function update() {
  url=$1
  name=$2
  curl -s "$url" -H 'user-agent: Mozilla/5.0' | \
  yq -p=xml -o=json '.rss.channel.item | select(length > 0) | .[:5] | map({"title": .title, "link": .link, "pubDate": .pubDate})' > $name.json
}

cd posts

update "https://devblogs.microsoft.com/dotnet/feed/" "dotnet"
update "https://devblogs.microsoft.com/visualstudio/feed/" "visualstudio"
update "https://visualstudiomagazine.com/rss-feeds/news.aspx" "visualstudiomagazine"
update "https://microservices.io/feed.xml" "microservices"
update "https://www.developertoarchitect.com/lessons/index.xml" "developertoarchitect"
update "https://ardalis.com/rss.xml" "ardalis"
update "https://www.hanselman.com/blog/feed/rss" "hanselman"
update "https://andrewlock.net/rss.xml" "andrewlock"
update "https://davecallan.com/feed/" "davecallan"
update "https://feeds.feedburner.com/NitoPrograms" "stephencleary"
update "https://codeblog.jonskeet.uk/feed/" "jonskeet"
update "https://feeds.feedburner.com/grabbagoft" "jimmybogard"
update "https://www.devlead.se/feed.rss" "devlead"
update "https://steven-giesel.com/feed.rss" "steven-giesel"
