#!/usr/bin/env node
// Reads new posts JSON from stdin, fixes midnight pubDates, writes to stdout.
// Usage: echo "$new_json" | node fix_post_times.js <existing-json-file>

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
