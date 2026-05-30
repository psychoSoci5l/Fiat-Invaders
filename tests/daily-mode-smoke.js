// Daily Mode Smoke Test — verifies the crash path reported by user
const { chromium } = require('playwright');

const BASE = 'http://localhost:8000';

(async () => {
    console.log('=== Daily Mode Smoke Test ===\n');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 480, height: 800 },
        deviceScaleFactor: 2
    });
    const page = await context.newPage();

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Programmatically switch to daily mode (bypasses UI flow)
    await page.evaluate(() => {
        if (typeof window.setGameMode === 'function') window.setGameMode('daily');
    });
    await page.waitForTimeout(1000);

    // Programmatically start game if possible
    await page.evaluate(() => {
        if (typeof window.startGame === 'function') window.startGame();
    });
    await page.waitForTimeout(2000);

    const hasGError = errors.some(e => e.includes('G is not defined'));
    const hasRefError = errors.some(e => e.includes('ReferenceError'));

    if (hasGError) {
        console.log('❌ FAIL: G is not defined error found');
        errors.forEach(e => console.log('   ' + e));
        await browser.close();
        process.exit(1);
    } else if (hasRefError) {
        console.log('❌ FAIL: ReferenceError found');
        errors.forEach(e => console.log('   ' + e));
        await browser.close();
        process.exit(1);
    } else if (errors.length > 0) {
        console.log('⚠️  Other errors (non-blocking):');
        errors.forEach(e => console.log('   ' + e));
    }

    console.log('✅ PASS: No G/ReferenceError in daily mode path');
    await browser.close();
    process.exit(0);
})();
