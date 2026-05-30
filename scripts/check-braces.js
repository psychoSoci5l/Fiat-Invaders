const fs = require('fs');
const code = fs.readFileSync('/home/psychosocial/Documenti/Claude Studios/fiatvscrypto/src/config/BalanceConfig.js', 'utf8');
let depth = 0;
let inString = false;
let stringChar = '';
let escape = false;
let line = 1;
let maxDepth = 0;
let lastOpen = 1;
for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === '\n') line++;
    if (inString) {
        if (escape) { escape = false; continue; }
        if (ch === '\\\\') { escape = true; continue; }
        if (ch === stringChar) inString = false;
        continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
        inString = true;
        stringChar = ch;
        continue;
    }
    if (ch === '/' && code[i+1] === '/') {
        while (i < code.length && code[i] !== '\n') i++;
        continue;
    }
    if (ch === '/' && code[i+1] === '*') {
        i += 2;
        while (i < code.length && !(code[i] === '*' && code[i+1] === '/')) i++;
        i++;
        continue;
    }
    if (ch === '{') { depth++; if (depth > maxDepth) maxDepth = depth; lastOpen = line; }
    if (ch === '}') {
        depth--;
        if (depth < 0) {
            console.log('Extra } at line', line);
            depth = 0;
        }
    }
}
console.log('Final brace depth:', depth);
console.log('Max depth:', maxDepth);
console.log('Last { opened at line:', lastOpen);
