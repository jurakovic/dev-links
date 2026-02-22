#!/usr/bin/env node
//
// fix_midnight.js — One-time backfill script for normalizing pubDates in posts/*.json
//
// PROBLEM
// -------
// Some RSS/Atom feeds publish only a date with no time component. The raw feed value
// looks like one of these:
//
//   "2023-01-13T00:00:00+00:00"       (ISO 8601, date-only expressed as midnight UTC)
//   "Sun, 15 Feb 2026 00:00:00 +0000" (RFC 2822, same)
//   "Tue, 10 Feb 2026 00:00:00 GMT"   (RFC 2822 variant)
//
// All share the same symptom: time is exactly 00:00:00. Because posts are sorted by
// pubDate descending in gen_news.js, date-only posts from the same day all collapse
// to the same instant (midnight), making their relative order arbitrary and unstable
// across runs.
//
// Additionally, pubDates arrive from feeds in mixed formats (ISO 8601, RFC 2822, with
// varying timezone offsets). Normalizing everything to ISO 8601 UTC makes sorting
// consistent and unambiguous.
//
// HOW IT WORKS
// ------------
// The script processes every posts/*.json file line by line, finds "pubDate" fields,
// and applies one of two strategies depending on whether the time is midnight:
//
// 1. NON-MIDNIGHT dates
//    Parsed with new Date() and reformatted to ISO 8601 UTC via toISO(). This
//    normalizes format without changing the represented instant in time.
//    Example: "Sat, 31 Jan 2026 10:25:27 +0100" → "2026-01-31T09:25:27+00:00"
//
// 2. MIDNIGHT dates (00:00:00)
//    These need special handling because midnight is ambiguous — it may mean:
//      a) The post was genuinely published on that date and the feed just omits time.
//      b) A new feed was added and all its historical posts were committed at once,
//         making the commit timestamp meaningless for older posts.
//
//    The script resolves this using `git blame --line-porcelain` on the exact line
//    containing the pubDate. This gives the Unix timestamp of the commit that last
//    wrote that line (author-time). The decision logic:
//
//    - If pubDate date part == commit date part (same calendar day in UTC):
//        The post was committed on the same day it was published. The commit time
//        is a reasonable approximation of the actual publish time.
//        → Replace midnight with the commit timestamp.
//        Example: "Sun, 15 Feb 2026 00:00:00 +0000" committed on 2026-02-15
//                 → "2026-02-15T14:32:10+00:00"
//
//    - If pubDate date part != commit date part (post is older than the commit):
//        The post was added in a bulk import or the feed was added later. Using
//        the commit timestamp would assign a completely wrong date.
//        → Normalize format only, keep midnight.
//        Example: "Fri, 13 Jan 2023 00:00:00 +0000" committed on 2026-02-22
//                 → "2023-01-13T00:00:00+00:00"
//
// MIDNIGHT DETECTION
// ------------------
// The regex /00:00:00/ matches the time component in both ISO 8601 and RFC 2822
// formats. It assumes that a feed publishing at exactly midnight UTC is actually
// omitting the time — a safe assumption in practice since real publish timestamps
// at precisely midnight are extremely rare.
//
// GIT BLAME APPROACH
// ------------------
// `git blame --line-porcelain -L N,N -- path` returns structured output for a
// single line including:
//   author-time <unix_seconds>   ← when the author made the change
//   author-tz   <±HHMM>         ← author's timezone (not used; we work in UTC)
//
// Lines with a zero hash (0000000000000000...) indicate uncommitted changes.
// Those are skipped and only format-normalized.
//
// WHEN TO RUN
// -----------
// This is a one-time (or occasional) backfill script, not part of the regular
// update pipeline. Run it manually after:
//   - Adding new blog feeds (to normalize historical posts)
//   - Discovering that existing pubDates are in raw feed format rather than ISO UTC
//
// After this script runs, fix_post_times.js (called by update_posts.sh on every
// update) takes over and keeps new posts normalized going forward.
//
// USAGE
//   node fix_midnight.js
//
// OUTPUT
//   Prints each changed line with before/after values, then a total count.
//   Only files with actual changes are written.
//

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const POSTS_DIR = path.join(__dirname, 'posts');

function toISO(date) {
    const p = n => String(n).padStart(2, '0');
    return `${date.getUTCFullYear()}-${p(date.getUTCMonth() + 1)}-${p(date.getUTCDate())}` +
           `T${p(date.getUTCHours())}:${p(date.getUTCMinutes())}:${p(date.getUTCSeconds())}+00:00`;
}

function getBlameTimestamp(relPath, lineNumber) {
    const output = execSync(
        `git blame --line-porcelain -L ${lineNumber},${lineNumber} -- "${relPath}"`,
        { cwd: __dirname, encoding: 'utf8' }
    );

    if (output.startsWith('0000000000000000')) return null;

    const timeMatch = output.match(/^author-time (\d+)$/m);
    if (!timeMatch) return null;

    return parseInt(timeMatch[1]);
}

const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.json'));
let totalFixed = 0;

for (const file of files) {
    const filePath = path.join(POSTS_DIR, file);
    const relPath = `posts/${file}`;
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    let modified = false;

    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/"pubDate": "(.*?)"/);
        if (!match) continue;

        const currentValue = match[1];
        let newValue;

        if (/00:00:00/.test(currentValue)) {
            const pubDate = new Date(currentValue);
            if (isNaN(pubDate.getTime())) continue;
            const blameTs = getBlameTimestamp(relPath, i + 1);
            if (blameTs !== null) {
                const commitDate = new Date(blameTs * 1000);
                // Only use commit time if the date parts match — if they differ, the post is
                // older than the commit (e.g. feed added in bulk), so keep midnight as-is.
                if (toISO(commitDate).slice(0, 10) === toISO(pubDate).slice(0, 10)) {
                    newValue = toISO(commitDate);
                } else {
                    newValue = toISO(pubDate);
                }
            } else {
                newValue = toISO(pubDate);
            }
        } else {
            const d = new Date(currentValue);
            if (isNaN(d.getTime())) continue;
            newValue = toISO(d);
        }

        if (newValue && newValue !== currentValue) {
            const before = lines[i].trim();
            lines[i] = lines[i].replace(`"pubDate": "${currentValue}"`, `"pubDate": "${newValue}"`);
            console.log(`${file}:${i + 1}`);
            console.log(`  before: ${before}`);
            console.log(`  after:  ${lines[i].trim()}`);
            modified = true;
            totalFixed++;
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    }
}

console.log(`\nDone. Fixed ${totalFixed} pubDate(s).`);
