#!/usr/bin/env node
/**
 * generate-icons.js — Generate iOS/PWA icon set from icon-512.png
 * Usage: npm install sharp && node scripts/generate-icons.js
 */
const sharp = require('sharp');
const path = require('path');

const INPUT = path.join(__dirname, '..', 'icon-512.png');
const OUTPUT_DIR = path.join(__dirname, '..');

const SIZES = [120, 152, 167, 180, 192, 1024];

(async () => {
    for (const size of SIZES) {
        const out = path.join(OUTPUT_DIR, `icon-${size}.png`);
        await sharp(INPUT)
            .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
            .png()
            .toFile(out);
        console.log(`Generated icon-${size}.png`);
    }
    console.log('Done! All icons generated.');
})();
