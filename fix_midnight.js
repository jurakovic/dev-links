#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const POSTS_DIR = path.join(__dirname, 'posts');

function getBlameTime(relPath, lineNumber) {
    const output = execSync(
        `git blame --line-porcelain -L ${lineNumber},${lineNumber} -- "${relPath}"`,
        { cwd: __dirname, encoding: 'utf8' }
    );

    // Uncommitted / not-yet-tracked lines have a zero hash
    if (output.startsWith('0000000000000000')) return null;

    const timeMatch = output.match(/^author-time (\d+)$/m);
    if (!timeMatch) return null;

    return new Date(parseInt(timeMatch[1]) * 1000).toISOString().replace('Z', '+00:00');
}

const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.json'));
let totalFixed = 0;

for (const file of files) {
    const filePath = path.join(POSTS_DIR, file);
    const relPath = `posts/${file}`;
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    let modified = false;

    for (let i = 0; i < lines.length; i++) {
        if (/"pubDate"/.test(lines[i]) && /00:00:00/.test(lines[i])) {
            const lineNumber = i + 1; // git blame is 1-based
            const commitTime = getBlameTime(relPath, lineNumber);

            if (commitTime) {
                const before = lines[i].trim();
                lines[i] = lines[i].replace(/"pubDate": ".*?"/, `"pubDate": "${commitTime}"`);
                console.log(`${file}:${lineNumber}`);
                console.log(`  before: ${before}`);
                console.log(`  after:  ${lines[i].trim()}`);
                modified = true;
                totalFixed++;
            }
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    }
}

console.log(`\nDone. Fixed ${totalFixed} pubDate(s).`);
