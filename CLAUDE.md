# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A developer news aggregator that fetches RSS/Atom feeds from 66 curated blogs, stores the 5 most recent posts per blog as JSON, and generates a single `README.md` displaying the 100 most recent posts across all blogs.

## Key Commands

```bash
# Fetch latest posts from all configured feeds
./update_posts.sh

# Fetch latest posts from specific feeds (by blog ID from blogs.json)
./update_posts.sh simonwillison addyosmani

# Regenerate README.md from current posts/*.json data
node gen_news.js

# Regenerate README.md referencing a specific branch for icons
node gen_news.js master
```

Dependencies required: `curl`, `yq` (XML/YAML processor), `jq`, `node`.

## Architecture

**Data pipeline:**
1. `blogs.json` — master config: 66 blog entries with feed URLs, titles, authors, categories, icons
2. `update_posts.sh` — fetches each feed via `curl`, parses XML with `yq`, writes 5 most recent items to `posts/<blog-id>.json`
3. `posts/*.json` — one file per blog, each containing up to 5 posts with `title`, `link`, `pubDate`
4. `gen_news.js` — reads all `posts/*.json`, merges and sorts by date, takes top 100, writes `README.md`
5. `README.md` — auto-generated output; displays posts with icons, formatted dates, blog name, and link
6. GitHub Actions (`.github/workflows/github_pages.yaml`) — triggers on push to `dev-news` branch, delegates to parent repo's workflow

**`update_posts.sh` behavior:** On fetch failure it falls back to the existing `posts/<id>.json`, so data is never lost.

## Adding or Modifying Blogs

Edit `blogs.json`. Each entry requires:
- `id` — used as the filename in `posts/` and as argument to `update_posts.sh`
- `title`, `author`, `url` — metadata displayed in README
- `feed` — RSS/Atom feed URL
- `icon` — favicon filename (resolved from parent dev-links repo)
- `category` — grouping label (e.g., `dotnet`, `ai`, `sql`, `general`)
- `selected` — `true`/`false`; only `true` entries are processed

## Relationship to Parent Repo

This repository is a subdirectory of `https://github.com/jurakovic/dev-links`. The GitHub Actions workflow delegates to the parent repo's pipeline. Icon files are resolved from the parent repo's branch when generating `README.md`.
