const fs = require('fs');
const path = require('path');

const root = '/home/psychosocial/Documenti/Claude Studios/fiatvscrypto/src';
const issues = [];

function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (fs.statSync(full).isDirectory()) {
            walk(full);
        } else if (full.endsWith('.js')) {
            checkFile(full);
        }
    }
}

function checkFile(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    // Does it use G as an object reference? (G. or G? or G === or G !== etc)
    const usesG = /\bG\b[.?!=]/.test(code);
    if (!usesG) return;

    // Does it declare G locally?
    const declaresG = /(?:^|;|\s)(?:const|let|var)\s+G\b/.test(code) ||
                      /\(function\s*\(\s*G\s*\)/.test(code) ||
                      /const\s+G\s*=\s*window\.Game/.test(code) ||
                      /let\s+G\s*=\s*window\.Game/.test(code) ||
                      /var\s+G\s*=\s*window\.Game/.test(code);

    // Also check if it assigns window.Game but no const G
    const assignsWindowGame = /window\.Game\s*=\s*window\.Game/.test(code);

    // Exclude MusicData.js (G is note name) and ColorUtils (G is green channel)
    if (filePath.includes('MusicData.js')) return;
    if (filePath.includes('ColorUtils.js')) return;

    if (!declaresG && !assignsWindowGame) {
        // Extract first line where G. appears
        const lines = code.split('\n');
        const firstUse = lines.findIndex(l => /\bG\b[.?!=]/.test(l)) + 1;
        issues.push({ file: path.relative('/home/psychosocial/Documenti/Claude Studios/fiatvscrypto', filePath), line: firstUse });
    }
}

walk(root);

if (issues.length === 0) {
    console.log('No undeclared G usage found.');
} else {
    console.log(`Found ${issues.length} files with undeclared G usage:`);
    for (const i of issues) {
        console.log(`  ${i.file}:${i.line}`);
    }
}
