#!/usr/bin/env node
/**
 * FIAT vs CRYPTO — Production Build Script
 *
 * Steps:
 * 1. Concatenate all <script src="..."> (non-module, non-inline) from index.html
 *    into bundle.js in the correct order.
 * 2. Minify bundle.js with terser.
 * 3. Minify style.css with clean-css-cli into style.min.css.
 * 4. Rewrite index.html to load bundle.js + style.min.css instead of individual files.
 * 5. Update sw.js precache list to reference bundle.js and style.min.css.
 * 6. Bump SW_VERSION so existing clients invalidate old caches.
 *
 * Usage: node scripts/build.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const INDEX_HTML = path.join(ROOT, 'index.html');
const STYLE_CSS = path.join(ROOT, 'style.css');
const BUNDLE_JS = path.join(ROOT, 'bundle.js');
const STYLE_MIN = path.join(ROOT, 'style.min.css');
const SW_JS = path.join(ROOT, 'sw.js');

function log(msg) {
    console.log(`[build] ${msg}`);
}

function fatal(msg) {
    console.error(`[build] FATAL: ${msg}`);
    process.exit(1);
}

// ─── Step 1: Resolve script sources ───
const MANIFEST = path.join(ROOT, 'scripts', 'build-manifest.json');
let sources = [];
let indexHtml = fs.readFileSync(INDEX_HTML, 'utf-8');

// Regex to match non-module script tags (used for both source extraction and index.html rewrite)
const scriptRe = /<script\s+(?!type\s*=\s*["']module["'])([^>]*?)?src\s*=\s*["']([^"']+)["']([^>]*)?><\/script>/gi;

if (fs.existsSync(MANIFEST)) {
    log('Using build-manifest.json for script order...');
    try {
        sources = JSON.parse(fs.readFileSync(MANIFEST, 'utf-8'));
    } catch (e) {
        fatal(`Invalid build-manifest.json: ${e.message}`);
    }
} else {
    log('Parsing index.html...');
    let m;
    while ((m = scriptRe.exec(indexHtml)) !== null) {
        const src = m[2].trim();
        // Skip external / protocol URLs
        if (/^[a-z]+:/i.test(src)) continue;
        sources.push(src);
    }
}

log(`Found ${sources.length} script sources to bundle.`);
if (sources.length === 0) fatal('No scripts found. Check build-manifest.json or index.html structure.');

// ─── Step 2: Concatenate ───
log('Concatenating scripts into bundle.js...');
const parts = sources.map(src => {
    const fullPath = path.join(ROOT, src);
    if (!fs.existsSync(fullPath)) fatal(`Missing file: ${src}`);
    const content = fs.readFileSync(fullPath, 'utf-8');
    // Wrap each file in IIFE to avoid top-level const/let collisions when concatenated
    return `/* --- ${src} --- */\n(function(){\n${content}\n})();\n`;
});
const concatenated = parts.join('\n');
fs.writeFileSync(BUNDLE_JS, concatenated);
log(`bundle.js raw: ${(concatenated.length / 1024).toFixed(1)} KiB`);

// ─── Step 3: Minify JS ───
log('Minifying bundle.js with terser...');
try {
    execSync(`npx terser "${BUNDLE_JS}" -o "${BUNDLE_JS}" --compress --mangle`, {
        cwd: ROOT,
        stdio: 'inherit',
    });
} catch (e) {
    fatal('Terser minification failed. See output above.');
}
const bundleMinSize = fs.statSync(BUNDLE_JS).size;
log(`bundle.js minified: ${(bundleMinSize / 1024).toFixed(1)} KiB`);

// ─── Step 4: Minify CSS ───
log('Minifying style.css with clean-css-cli...');
try {
    execSync(`npx clean-css-cli -o "${STYLE_MIN}" "${STYLE_CSS}"`, {
        cwd: ROOT,
        stdio: 'inherit',
    });
} catch (e) {
    fatal('clean-css minification failed. See output above.');
}
const cssMinSize = fs.statSync(STYLE_MIN).size;
const cssRawSize = fs.statSync(STYLE_CSS).size;
log(`style.min.css: ${(cssMinSize / 1024).toFixed(1)} KiB (from ${(cssRawSize / 1024).toFixed(1)} KiB)`);

// ─── Step 5: Rewrite index.html ───
log('Rewriting index.html...');

// Remove all matched <script src="..."> tags
let newHtml = indexHtml.replace(scriptRe, '');

// Replace style.css with style.min.css
newHtml = newHtml.replace(
    /<link\s+rel\s*=\s*["']stylesheet["']\s+href\s*=\s*["']style\.css["']\s*>/i,
    '<link rel="stylesheet" href="style.min.css">'
);

// Insert bundle.js before </body> (or before the first remaining script tag if any)
const insertPoint = newHtml.lastIndexOf('</body>');
if (insertPoint === -1) fatal('Cannot find </body> in index.html');
newHtml = newHtml.slice(0, insertPoint) +
    '    <script defer src="bundle.js"></script>\n' +
    newHtml.slice(insertPoint);

fs.writeFileSync(INDEX_HTML, newHtml);
log('index.html updated.');

// ─── Step 6: Update sw.js ───
log('Updating sw.js precache list...');
const swJs = fs.readFileSync(SW_JS, 'utf-8');

// Bump version: 7.34.0 → 7.34.1-build (or just bump patch)
const newVersion = swJs.replace(
    /const SW_VERSION\s*=\s*['"]([^'"]+)['"];/,
    (match, oldVer) => {
        // Simple patch bump: split by ., increment last segment if numeric, else append .1
        const parts = oldVer.split('.');
        const last = parts[parts.length - 1];
        if (/^\d+$/.test(last)) {
            parts[parts.length - 1] = String(parseInt(last, 10) + 1);
        } else {
            parts.push('1');
        }
        const bumped = parts.join('.');
        log(`SW_VERSION bumped: ${oldVer} → ${bumped}`);
        return `const SW_VERSION = '${bumped}';`;
    }
);

// Replace ASSETS_TO_CACHE array
const newAssets = `const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.min.css',
    './bundle.js',
    './manifest.json',
    './icon-512.png',
    './icon-512.svg',
    './splashscreen.webm',
    './splashscreen.mp4',
    // Videos used at end-game (lazy loaded, but cache for offline)
    './completion-en.webm',
    './completion-it.webm',
    './completion-en.mp4',
    './completion-it.mp4',
];`;

const newSwJs = newVersion.replace(
    /const ASSETS_TO_CACHE\s*=\s*\[[\s\S]*?\];/,
    newAssets
);

fs.writeFileSync(SW_JS, newSwJs);
log('sw.js updated.');

// ─── Summary ───
const bundleRawSize = concatenated.length;
const jsSaving = ((1 - bundleMinSize / bundleRawSize) * 100).toFixed(1);
const cssSaving = ((1 - cssMinSize / cssRawSize) * 100).toFixed(1);

console.log('\n=== BUILD SUMMARY ===');
console.log(`JS bundle:     ${(bundleRawSize/1024).toFixed(1)} KiB → ${(bundleMinSize/1024).toFixed(1)} KiB (${jsSaving}% smaller)`);
console.log(`CSS minified:  ${(cssRawSize/1024).toFixed(1)} KiB → ${(cssMinSize/1024).toFixed(1)} KiB (${cssSaving}% smaller)`);
console.log(`Scripts:       ${sources.length} individual files → 1 bundle`);
console.log(`index.html:    updated`);
console.log(`sw.js:         precache list updated + version bumped`);
console.log('=====================\n');
