const fs = require('fs');
const code = fs.readFileSync('/home/psychosocial/Documenti/Claude Studios/fiatvscrypto/src/config/BalanceConfig.js', 'utf8');
const stack = [];
let inString = false;
let stringChar = '';
let escape = false;
let line = 1;
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
    if (ch === '{') {
        stack.push(line);
    }
    if (ch === '}') {
        if (stack.length === 0) {
            console.log('Extra } at line', line);
        } else {
            stack.pop();
        }
    }
}
if (stack.length > 0) {
    console.log('Unclosed { at lines:', stack.join(', '));
} else {
    console.log('All braces balanced');
}
