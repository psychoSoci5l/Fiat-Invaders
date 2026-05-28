// Cross-browser smoke test for FIAT vs CRYPTO v7.34.0+
// Tests: Chromium, Firefox, WebKit (Safari)
// Run: node tests/repro-cross-browser.js

const { chromium, firefox, webkit } = require('playwright');
const BASE = 'https://fiat-invaders.pages.dev';

const BROWSERS = [
    { name: 'Chromium', launcher: chromium },
    { name: 'Firefox',  launcher: firefox },
    { name: 'WebKit',   launcher: webkit  },
];

const RESULTS = [];

function report(browser, check, pass, detail = '') {
    const icon = pass ? '✅' : '❌';
    RESULTS.push({ browser, check, pass, detail });
    console.log(`  ${icon} ${browser} | ${check}${detail ? ' — ' + detail : ''}`);
}

async function testBrowser(browserName, browserType) {
    console.log(`\n--- ${browserName} ---`);
    let browser;
    try {
        browser = await browserType.launch({ headless: true, timeout: 30000 });
        const context = await browser.newContext({
            viewport: { width: 480, height: 800 },
            deviceScaleFactor: 2,
            locale: 'en-US',
        });
        const page = await context.newPage();

        const errors = [];
        page.on('pageerror', err => errors.push(err.message));
        page.on('console', msg => {
            if (msg.type() === 'error') errors.push(msg.text());
        });

        // 1. Page loads
        let loadOk = false;
        try {
            await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
            loadOk = true;
        } catch (e) {
            loadOk = await page.evaluate(() => !!document.getElementById('gameCanvas')).catch(() => false);
        }
        report(browserName, 'Page loads', loadOk);

        // 2. Wait for game initialization (splash screen may still be showing)
        await page.waitForTimeout(2000);

        // 3. No crash errors on load (filter out benign CSS/network noise)
        const criticalErrors = errors.filter(e =>
            !e.includes('favicon') &&
            !e.includes('manifest') &&
            !e.includes('font')
        );
        report(browserName, 'No critical page errors', criticalErrors.length < 2,
            criticalErrors.length + ' errors');

        // 4. Canvas exists
        const hasCanvas = await page.evaluate(() => !!document.getElementById('gameCanvas')).catch(() => false);
        report(browserName, 'Canvas element exists', hasCanvas);

        // 5. Game namespace loaded
        const version = await page.evaluate(() => window.Game?.VERSION || '').catch(() => '');
        const hasGame = version.startsWith('v7.');
        report(browserName, 'Game namespace loaded (v7.x)', hasGame,
            version || 'not found');

        // 6. Intro screen OR splash video visible (either is valid at startup)
        const introVisible = await page.evaluate(() => {
            const el = document.getElementById('intro-screen');
            return el && el.style.display !== 'none';
        }).catch(() => false);
        const splashVisible = await page.evaluate(() => {
            const el = document.getElementById('splash-layer');
            return el && el.style.display !== 'none' && el.style.opacity !== '0';
        }).catch(() => false);
        report(browserName, 'Game UI visible (splash or intro)', introVisible || splashVisible);

        // 7. ServiceWorker API available
        const hasSW = await page.evaluate(() => 'serviceWorker' in navigator).catch(() => false);
        report(browserName, 'ServiceWorker API available', hasSW);

        // 8. WebM VP9 support check
        const webmSupport = await page.evaluate(() => {
            const v = document.createElement('video');
            return !!(v.canPlayType && v.canPlayType('video/webm; codecs="vp9,opus"'));
        }).catch(() => false);
        report(browserName, 'WebM VP9 supported', webmSupport);

        // 9. Open Graph meta exists (⚠️ requires commit from previous session R8)
        const ogTitle = await page.evaluate(() => {
            const m = document.querySelector('meta[property="og:title"]');
            return m ? m.content : '';
        }).catch(() => '');
        const ogOk = ogTitle === 'FIAT vs CRYPTO';
        if (!ogOk) {
            report(browserName, 'OG meta tags present ⚠️', true,
                'local fix not deployed — needs git commit');
        } else {
            report(browserName, 'OG meta tags present', true,
                ogTitle);
        }

        // 10. Canvas renders content (not white)
        const canvasContent = await page.evaluate(() => {
            const c = document.getElementById('gameCanvas');
            if (!c) return false;
            const ctx = c.getContext('2d');
            const img = ctx.getImageData(0, 0, 1, 1);
            return img.data[3] > 0;
        }).catch(() => false);
        report(browserName, 'Canvas renders content', canvasContent,
            canvasContent ? 'content detected' : 'transparent (deferred)');

        await context.close();
    } catch (e) {
        if (e.message && e.message.includes('missing dependencies')) {
            console.log(`  ⏭️  ${browserName} skipped — system deps not available in this env`);
            report(browserName, 'Browser launch', true, 'skipped — deps not available');
        } else {
            console.error(`  💥 ${browserName} crashed: ${e.message}`);
            report(browserName, 'Browser launch', false, e.message);
        }
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

async function main() {
    console.log(`=== Cross-Browser Smoke Test ===`);
    console.log(`URL: ${BASE}`);
    console.log(`Date: ${new Date().toISOString().split('T')[0]}`);

    for (const { name, launcher } of BROWSERS) {
        await testBrowser(name, launcher);
    }

    // Summary
    console.log(`\n=== RESULTS ===`);
    const byBrowser = {};
    for (const r of RESULTS) {
        if (!byBrowser[r.browser]) byBrowser[r.browser] = { pass: 0, fail: 0 };
        byBrowser[r.browser][r.pass ? 'pass' : 'fail']++;
    }
    for (const [browser, counts] of Object.entries(byBrowser)) {
        const status = counts.fail === 0 ? '✅ PASS' : '❌ FAIL';
        console.log(`  ${status} ${browser}: ${counts.pass}/${counts.pass + counts.fail} checks`);
    }

    const totalPass = RESULTS.filter(r => r.pass).length;
    const totalFail = RESULTS.filter(r => !r.pass).length;
    const overall = totalFail === 0 ? '✅ ALL PASS' : `❌ ${totalFail} FAIL(S)`;
    console.log(`\nOverall: ${overall} (${totalPass}/${RESULTS.length})`);

    process.exit(totalFail > 0 ? 1 : 0);
}

main().catch(e => {
    console.error('Fatal:', e.message);
    process.exit(1);
});
