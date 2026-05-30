const fs = require('fs');
const path = require('path');

const root = '/home/psychosocial/Documenti/Claude Studios/fiatvscrypto';
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'scripts/build-manifest.json'), 'utf8'));

// Collect script tags
const scriptTags = manifest
    .filter(f => f.startsWith('src/'))
    .map(f => `    <script src="${f}"></script>`)
    .join('\n');

// Replace bundle.js line with individual scripts
const out = indexHtml.replace(
    /    <script defer src="bundle\.js"><\/script>\n/,
    scriptTags + '\n'
);

fs.writeFileSync(path.join(root, 'index-dev.html'), out);
console.log('index-dev.html generated with ' + manifest.filter(f => f.startsWith('src/')).length + ' scripts');
