#!/usr/bin/env node
//
// fix_post_times.js — Per-feed pubDate normalizer, called by update_posts.sh
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
// Additionally, feeds publish dates in mixed formats (ISO 8601, RFC 2822, with
// varying timezone offsets), which causes inconsistent sorting in gen_news.js.
//
// Finally, on every run update_posts.sh re-fetches live feed data, which would
// overwrite any previously fixed or normalized pubDates with raw feed values.
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
//    The stored pubDate is always preferred over the live feed value. This is the
//    key invariant: once a pubDate has been normalized or time-fixed, it is never
//    overwritten by the raw feed again. The stored value may be:
//      - A fully fixed time:    "2026-02-15T14:32:10+00:00"  (was midnight, now real time)
//      - A normalized midnight: "2023-01-13T00:00:00+00:00"  (old post, format only)
//      - Already ISO UTC:       "2026-01-31T09:25:27+00:00"  (feed had correct format)
//
// 2. NEW POST with midnight time (00:00:00), published today
//    The post appears for the first time and its date matches today in UTC. The feed
//    is date-only, so midnight is not a real timestamp. The current time is used as
//    a reasonable approximation of when the post was published.
//    → pubDate = current UTC time as ISO 8601
//    Example: "Sun, 22 Feb 2026 00:00:00 +0000" seen on 2026-02-22
//             → "2026-02-22T14:35:12+00:00"
//
//    If the date does NOT match today, the post is older than this run (e.g. a new
//    feed was added and historical posts are appearing for the first time). Using the
//    current time would assign a completely wrong date, so the post falls through to
//    strategy 3 instead.
//
// 3. NEW POST, everything else
//    The post is new and either has a real time or is an old midnight post. The raw
//    pubDate is parsed with new Date() and reformatted to ISO 8601 UTC. This
//    normalizes the format without changing the represented instant in time.
//    Example: "Sat, 31 Jan 2026 10:25:27 +0100" → "2026-01-31T09:25:27+00:00"
//    Example: "Fri, 13 Jan 2023 00:00:00 +0000" → "2023-01-13T00:00:00+00:00"
//    If the date is unparseable, the raw value is kept as a fallback.
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
//   echo "$new_json" | node fix_post_times.js posts/<id>.json
//
//   stdin:  JSON array of posts freshly parsed from the feed by yq
//   argv2:  path to the existing posts/<id>.json file for this feed
//   stdout: JSON array with pubDates normalized and midnight times fixed
//   stderr: error messages if stdin is not valid JSON or not an array
//

const fs = require('fs');

const existingFile = process.argv[2];

// Read existing posts synchronously before stdin processing starts,
// so the caller can safely redirect our stdout to the same file.
let existing = [];
if (existingFile && fs.existsSync(existingFile)) {
    try { existing = JSON.parse(fs.readFileSync(existingFile, 'utf8')); } catch (_) {}
}

// Build link -> pubDate map for all existing posts.
// Preserves both fully fixed times and ISO-midnight times (old posts that were format-normalized).
const fixed = {};
for (const post of existing) {
    if (post.link && post.pubDate) {
        fixed[post.link] = post.pubDate;
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

function pubdateToYMD(pubDate) {
    const d = new Date(pubDate);
    return isNaN(d.getTime()) ? null : toISO(d).slice(0, 10);
}

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

    const result = posts.map(post => {
        if (fixed[post.link]) {
            // Already stored — always prefer saved value (ISO UTC, possibly time-fixed)
            return { ...post, pubDate: fixed[post.link] };
        }

        // New post not seen before
        if (/00:00:00/.test(post.pubDate) && pubdateToYMD(post.pubDate) === todayUTC) {
            // Published today, feed just omits time — assign current time
            return { ...post, pubDate: nowISO };
        }

        // New post — normalize to ISO UTC
        const d = new Date(post.pubDate);
        return isNaN(d.getTime()) ? post : { ...post, pubDate: toISO(d) };
    });

    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
});
