#!/bin/bash

function update() {
  url=$1
  name=$2
  curl -s "$url" -H 'user-agent: Mozilla/5.0' | \
  yq -p=xml -o=json '
    (
      .rss.channel.item // .feed.entry
    )
    | select(length > 0)
    | .[:5]
    | map({
        "title": ( .title["+content"] // .title // .title ),
        "link": ( .link["+@href"] // .link.href // .link ),
        "pubDate": (.pubDate // .published // .updated)
      })
  ' > $name.json
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
update "https://adamsitnik.com/feed.xml" "adamsitnik"
update "https://minidump.net/index.xml" "minidump"
update "https://mattwarren.org/atom.xml" "mattwarren"
update "http://feeds.haacked.com/haacked" "haacked"
update "https://erikej.github.io/feed.xml" "erikej"
update "https://enterprisecraftsmanship.com/index.xml" "enterprisecraftsmanship"
update "https://antirez.com/rss" "antirez"
update "https://simonwillison.net/atom/everything/" "simonwillison"
