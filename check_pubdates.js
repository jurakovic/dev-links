#!/usr/bin/env node
//
// check_pubdates.js — Report posts whose date is later than their git blame commit date.
//
// Checks each post's `date` (set by fix_post_times.js), or its pubDate for posts stored
// before `date` existed. pubDate of newer posts is the feed's own date, which can be in the
// future, and is not checked.
//
// USAGE
//   node check_pubdates.js [branch]
//
//   branch: git ref to blame against (default: origin/dev-news)
//

const { execSync } = require('child_process');

const branch = process.argv[2] || 'origin/dev-news';

let files;
try {
    const out = execSync(`git ls-tree --name-only ${branch} posts/`, { encoding: 'utf8' });
    files = out.trim().split('\n').filter(f => f.endsWith('.json'));
} catch (e) {
    console.error(`Failed to list posts on ${branch}: ${e.message}`);
    process.exit(1);
}

let issues = 0;

for (const filePath of files) {
    let blame;
    try {
        blame = execSync(`git blame ${branch} -- ${filePath}`, { encoding: 'utf8' });
    } catch (e) {
        console.error(`Failed to blame ${filePath}: ${e.message}`);
        continue;
    }

    // Date line of the current post: its `date` line if it has one, otherwise its pubDate line
    let current = null;
    for (const line of blame.split('\n')) {
        const dateMatch = line.match(/"(pubDate|date)":\s*"([^"]+)"/);
        if (dateMatch && (dateMatch[1] === 'date' || !current)) {
            current = { line, field: dateMatch[1], value: dateMatch[2] };
            continue;
        }
        if (!/\)\s*\},?\s*$/.test(line) || !current) continue; // not the end of a post

        const post = current;
        current = null;

        // git blame default format: <hash> (<author> YYYY-MM-DD HH:MM:SS +ZZZZ <lineno>)
        const commitMatch = post.line.match(/\(.*?(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [+-]\d{4})\s+\d+\)/);
        if (!commitMatch) continue;

        const date = new Date(post.value);
        const commitDate = new Date(commitMatch[1]);

        if (isNaN(date) || isNaN(commitDate)) continue;

        if (date > commitDate) {
            console.log(`${filePath}: ${post.field} ${post.value} > commit ${commitMatch[1]}`);
            issues++;
        }
    }
}

if (issues === 0) {
    console.log('No issues found.');
} else {
    console.log(`\n${issues} issue(s) found.`);
}
