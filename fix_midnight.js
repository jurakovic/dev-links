#!/usr/bin/env node

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
