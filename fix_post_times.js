#!/usr/bin/env node
//
// fix_post_times.js — Per-feed post date fixer, called by update_posts.sh
//
// FIELDS
// ------
// Each stored post has two dates, both ISO 8601 UTC ("2026-10-28T19:27:07+00:00"):
//
//   pubDate  The date the feed published, normalized to ISO 8601 UTC (same instant,
//            see strategy 3 below). Never changed afterwards.
//   date     The date dev-news sorts and displays by: pubDate, or the time the post was
//            first seen when the feed's date can't be used as is (see strategy 2 below).
//
// Posts stored before `date` existed have only pubDate, which already holds their
// fixed value (what date holds now). They are left as they are; consumers use
// `post.date || post.pubDate`. They phase out as feeds publish newer posts.
//
// PROBLEM
// -------
// Some RSS/Atom feeds publish only a date with no time component, expressed as
// midnight UTC in various formats:
//
//   "2023-01-13T00:00:00+00:00"       (ISO 8601)
//   "Sun, 15 Feb 2026 00:00:00 +0000" (RFC 2822)
//   "Tue, 10 Feb 2026 00:00:00 GMT"   (RFC 2822 variant)
//
// A few express it as midnight in their own timezone instead, which in UTC falls
// on the previous day:
//
//   "Sat, 07 Feb 2026 00:00:00 +1100" (brendangregg)
//   "2023-05-20T00:00:00+02:00"       (roji)
//
// Some feeds show a post hours or days after its pubDate (feed caches, posts dated
// when written rather than when published, sites deployed after the date they state).
// Sorted by pubDate, such a post lands below posts dev-news already listed instead of
// at the top.
//
// Some feeds also alternate between a fresh and a stale copy, so recent posts drop out
// of the feed and come back on a later run (azuresqlblog).
//
// Additionally, feeds publish dates in mixed formats (ISO 8601, RFC 2822, with
// varying timezone offsets), which causes inconsistent sorting in gen_news.js.
//
// Finally, on every run update_posts.sh re-fetches live feed data, which would
// overwrite any previously fixed or normalized dates with raw feed values.
//
// HOW IT WORKS
// ------------
// This script sits in the pipeline between yq (XML extraction) and the file write
// in update_posts.sh:
//
//   curl | yq | [this script] | write to file
//
// It receives a JSON array of freshly fetched posts on stdin, reads the currently
// stored posts file for that feed, and for each incoming post applies one of three
// strategies:
//
// 1. KNOWN POST (link already in stored file)
//    The stored pubDate and date are always preferred over the live feed value. This
//    is the key invariant: once a post is stored, its dates are never overwritten by
//    the raw feed again (title and link still come from the feed).
//    A stored pubDate is passed through the same normalization as new ones, which
//    leaves normalized values unchanged and repairs any stored in the feed's format.
//
// 2. NEW POST with a future date, midnight today, or lagged
//    The feed's date is wrong or late, so the current time is used as a reasonable
//    approximation of when the post was actually published.
//    → pubDate = feed date normalized as in strategy 3
//    → date    = current UTC time as ISO 8601 (examples below)
//    Example: "Sun, 22 Feb 2026 00:00:00 +0000" seen on 2026-02-22
//             → "2026-02-22T14:35:12+00:00"
//    Example: "Fri, 27 Mar 2026 00:00:00 +0000" seen on 2026-03-26 (feed off by one day)
//             → "2026-03-26T05:40:05+00:00"
//
//    Three conditions trigger this:
//    a) The parsed datetime is strictly after now (covers future dates and future
//       times on the same day, e.g. feed says 23:00 but it is currently 10:00).
//    b) The pubDate is midnight on today's date (feed is date-only; midnight has
//       already passed so condition (a) would miss it).
//    c) Lagged: the date is older than the newest date dev-news listed before this run
//       (argv3), but at most MAX_LAG_DAYS old, and the feed is already tracked (at
//       least one incoming post is stored). Without this the post would be listed
//       below posts that were on dev-news before it.
//       Example: "Wed, 28 Oct 2026 19:27:07 GMT" (stackoverflow) seen on 2026-10-29 17:01,
//                newest listed "2026-10-29T11:01:40+00:00" → "2026-10-29T17:01:56+00:00"
//
//    A midnight pubDate is read as its written calendar date at midnight UTC, whatever
//    its offset, so these conditions compare the date the feed actually states.
//    Example: "Sat, 07 Feb 2026 00:00:00 +1100" seen on 2026-02-07
//             → "2026-02-07T05:04:00+00:00" (not "2026-02-06T13:00:00+00:00")
//
//    Older posts and posts of a feed that isn't tracked yet (feed just added, or all its
//    links changed) are historical posts appearing for the first time. Using the current
//    time would assign a completely wrong date, so they fall through to strategy 3.
//
// 3. NEW POST, everything else
//    The post is new and either has a real time or is an old midnight post. The raw
//    pubDate is parsed with new Date() and reformatted to ISO 8601 UTC. This
//    normalizes the format without changing the represented instant in time.
//    → pubDate = date = feed date normalized
//    Example: "Sat, 31 Jan 2026 10:25:27 +0100" → "2026-01-31T09:25:27+00:00"
//    Example: "Fri, 13 Jan 2023 00:00:00 +0000" → "2023-01-13T00:00:00+00:00"
//    Example: "2023-05-20T00:00:00+02:00"       → "2023-05-20T00:00:00+00:00" (written date kept)
//    If the date is unparseable, the raw pubDate is kept and date is left out
//    (consumers fall back to pubDate).
//
// MISSING POSTS
// -------------
// If a tracked feed no longer returns some stored posts, they are kept and the posts
// are sorted by date (newest first), keeping as many as the feed or the stored file
// had. A post that drops out and comes back therefore stays stored with its dates
// instead of being seen as new (and lagged) again. Stored posts older than the kept
// ones are dropped, as before. A post removed from the feed for good stays until newer
// posts push it out.
//
// FILE READ SAFETY
// ----------------
// The existing posts file is read synchronously at process startup, before stdin
// is consumed. This is intentional: update_posts.sh captures this script's stdout
// into a variable and only writes it to the file afterwards, so the file is not
// truncated while being read. If stdout were redirected directly to the same file,
// the shell would truncate it before this script could read it.
//
//   Safe:   fixed=$(echo "$new" | node fix_post_times.js "$id.json") && echo "$fixed" > "$id.json"
//   Unsafe: echo "$new" | node fix_post_times.js "$id.json" > "$id.json"
//
// RELATIONSHIP TO fix_midnight.js
// --------------------------------
// fix_midnight.js is a one-time backfill script that retroactively normalizes all
// existing posts/*.json files using git blame to recover approximate publish times.
// This script (fix_post_times.js) is the ongoing counterpart: it runs on every
// update_posts.sh execution and keeps new posts normalized going forward.
//
// USAGE
//   echo "$new_json" | node fix_post_times.js posts/<id>.json [newest-listed]
//
//   stdin:  JSON array of posts freshly parsed from the feed by yq
//   argv2:  path to the existing posts/<id>.json file for this feed
//   argv3:  newest date listed on dev-news before this run (any parseable date);
//           if left out, lagged posts are not detected
//   stdout: JSON array of posts with pubDate normalized and date set
//   stderr: error messages if stdin is not valid JSON or not an array
//

const fs = require('fs');

const existingFile = process.argv[2];
const newestListed = new Date(process.argv[3] || NaN);

// A post first seen more than this long after its date keeps its own date
// (e.g. an old post coming back into the feed), so it is not shown as new.
const MAX_LAG_DAYS = 3;

// Read existing posts synchronously before stdin processing starts,
// so the caller can safely redirect our stdout to the same file.
let existing = [];
if (existingFile && fs.existsSync(existingFile)) {
    try { existing = JSON.parse(fs.readFileSync(existingFile, 'utf8')); } catch (_) {}
}

// Build link -> stored post map
const stored = {};
for (const post of existing) {
    if (post.link && (post.date || post.pubDate)) {
        stored[post.link] = post;
    }
}

const now = new Date();

function toISO(date) {
    const p = n => String(n).padStart(2, '0');
    return `${date.getUTCFullYear()}-${p(date.getUTCMonth() + 1)}-${p(date.getUTCDate())}` +
           `T${p(date.getUTCHours())}:${p(date.getUTCMinutes())}:${p(date.getUTCSeconds())}+00:00`;
}

const nowISO = toISO(now);
const todayUTC = nowISO.slice(0, 10);

// Date-only feeds emit midnight in their own timezone ("Sat, 07 Feb 2026 00:00:00 +1100",
// "2023-05-20T00:00:00+02:00"). Converting that to UTC would shift the post to the previous day,
// so it is read as the written calendar date at midnight UTC. Returns null if not midnight.
function writtenMidnight(pubDate) {
    const m = /^(.*\d)[T ]00:00:00(?:\.0+)?\s*(?:Z|[A-Z]{1,5}|[+-]\d{2}:?\d{2})?$/i.exec(pubDate || '');
    if (!m) return null;
    const d = new Date(m[1].includes('-') ? `${m[1]}T00:00:00Z` : `${m[1]} 00:00:00 GMT`);
    return isNaN(d.getTime()) ? null : d;
}

// Feed date as a Date (midnight read as its written calendar date), null if unparseable
function parseFeedDate(pubDate) {
    const d = writtenMidnight(pubDate) || new Date(pubDate);
    return isNaN(d.getTime()) ? null : d;
}

// pubDate normalized to ISO 8601 UTC, kept as is if unparseable
function normalizePubDate(pubDate) {
    const d = parseFeedDate(pubDate);
    return d ? toISO(d) : pubDate;
}

// date for a new post (strategies 2 and 3), null if pubDate is unparseable
function newPostDate(pubDate, tracked) {
    const d = parseFeedDate(pubDate);
    if (!d) return null;

    const isFutureDateTime = d > now;
    const isMidnightToday = writtenMidnight(pubDate) !== null && toISO(d).slice(0, 10) === todayUTC;
    const isLagged = tracked && d < newestListed && now - d <= MAX_LAG_DAYS * 24 * 60 * 60 * 1000;
    if (isFutureDateTime || isMidnightToday || isLagged) {
        // Future datetime, today with no real time, or shown by the feed late — assign current time
        return nowISO;
    }

    // Normalize to ISO UTC
    return toISO(d);
}

const sortTime = post => {
    const t = new Date(post.date || post.pubDate).getTime();
    return isNaN(t) ? -Infinity : t;
};

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    let posts;
    try {
        posts = JSON.parse(input);
    } catch (e) {
        process.stderr.write(`[fix_post_times] Failed to parse stdin: ${e.message}\n`);
        process.exit(1);
    }

    if (!Array.isArray(posts)) {
        process.stderr.write(`[fix_post_times] Expected array, got: ${typeof posts}\n`);
        process.exit(1);
    }

    // Tracked feed: at least one incoming post is already stored. Otherwise all posts are new
    // (feed just added, or its links changed) and are treated as historical.
    const tracked = posts.some(post => stored[post.link]);

    let result = posts.map(post => {
        const known = stored[post.link];
        if (known) {
            // Already stored — always prefer saved dates (posts stored before `date` existed have only pubDate)
            const pubDate = normalizePubDate(known.pubDate);
            return known.date ? { ...post, pubDate, date: known.date } : { ...post, pubDate };
        }

        // New post not seen before — normalize pubDate, add date
        const date = newPostDate(post.pubDate, tracked);
        return date ? { ...post, pubDate: normalizePubDate(post.pubDate), date } : post;
    });

    // Keep stored posts the feed no longer returns (see MISSING POSTS)
    const fetched = new Set(posts.map(post => post.link));
    const missing = !tracked ? [] : existing
        .filter(post => stored[post.link] && !fetched.has(post.link))
        .map(post => ({ ...post, pubDate: normalizePubDate(post.pubDate) }));
    if (missing.length > 0) {
        result = [...result, ...missing]
            .sort((a, b) => sortTime(b) - sortTime(a))
            .slice(0, Math.max(posts.length, existing.length));
    }

    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
});
