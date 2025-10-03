#!/bin/bash

function update() {
  url=$1
  name=$2
  echo "Processing feed: $name"

  curl -s "$url" -H 'user-agent: Mozilla/5.0' | \
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

  if [ $? -ne 0 ] ; then
    echo "  [ERROR] Failed to process $name ($url)"
    git restore "$name.json"
  fi
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
update "https://www.martinfowler.com/feed.atom" "martinfowler"
update "https://antirez.com/rss" "antirez"
update "https://simonwillison.net/atom/everything/" "simonwillison"
update "https://nickcraver.com/blog/feed.xml" "nickcraver"
update "https://blog.codinghorror.com/rss/" "codinghorror"
update "https://www.joelonsoftware.com/feed/" "joelonsoftware"
update "https://neilonsoftware.com/feed/" "neilonsoftware"
update "https://www.brendangregg.com/blog/rss.xml" "brendangregg"
#update "https://tidyfirst.substack.com/feed" "tidyfirst" # cloudflare blocks curl
update "https://feeds.feedburner.com/paulhammant" "paulhammant"
update "https://sizovs.net/feed.xml" "sizovs"
update "https://bartwullems.blogspot.com/feeds/posts/default" "bartwullems"
update "https://feeds.feedburner.com/ThePragmaticEngineer" "pragmaticengineer"
update "https://vadimkravcenko.com/feed/" "vadimkravcenko"
update "https://thecodist.com/rss/" "thecodist"

update "https://terriblesoftware.org/feed/" "terriblesoftware"
update "https://lethain.com/feeds/" "lethain"
update "https://www.effectiveengineer.com/atom.xml" "effectiveengineer"

cd ..
node gen_news.js

echo "Done"
