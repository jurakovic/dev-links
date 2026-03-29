#!/usr/bin/env node
//
// check_pubdates.js — Report posts whose pubDate is later than their git blame commit date.
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

    for (const line of blame.split('\n')) {
        const pubDateMatch = line.match(/"pubDate":\s*"([^"]+)"/);
        if (!pubDateMatch) continue;

        // git blame default format: <hash> (<author> YYYY-MM-DD HH:MM:SS +ZZZZ <lineno>)
        const commitMatch = line.match(/\(.*?(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [+-]\d{4})\s+\d+\)/);
        if (!commitMatch) continue;

        const pubDate = new Date(pubDateMatch[1]);
        const commitDate = new Date(commitMatch[1]);

        if (isNaN(pubDate) || isNaN(commitDate)) continue;

        if (pubDate > commitDate) {
            console.log(`${filePath}: pubDate ${pubDateMatch[1]} > commit ${commitMatch[1]}`);
            issues++;
        }
    }
}

if (issues === 0) {
    console.log('No issues found.');
} else {
    console.log(`\n${issues} issue(s) found.`);
}
