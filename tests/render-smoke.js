// Render Smoke Test — verifies drawGlow and other G-dependent rendering paths
const { chromium } = require('playwright');

const BASE = 'http://localhost:8000';

(async () => {
    console.log('=== Render Smoke Test ===\n');
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

    // Start game programmatically
    await page.evaluate(() => {
        if (typeof window.startGame === 'function') window.startGame();
    });
    await page.waitForTimeout(1500);

    // Trigger a few frames of rendering by evaluating drawGlow on player and enemies
    const renderCheck = await page.evaluate(() => {
        const G = window.Game;
        const results = [];

        // Check Player._drawShipBody
        if (G.Player && G.Player.instance && typeof G.Player.instance._drawShipBody === 'function') {
            try {
                const ctx = document.getElementById('gameCanvas').getContext('2d');
                G.Player.instance._drawShipBody(ctx);
                results.push('player._drawShipBody: OK');
            } catch (e) {
                results.push('player._drawShipBody: ' + e.message);
            }
        } else {
            results.push('player._drawShipBody: SKIP (no instance)');
        }

        // Check Enemy.drawGlow
        if (G.Enemy && G.Enemy.Pool) {
            const enemy = G.Enemy.Pool._pool && G.Enemy.Pool._pool[0];
            if (enemy && typeof enemy.drawGlow === 'function') {
                try {
                    const ctx = document.getElementById('gameCanvas').getContext('2d');
                    enemy.drawGlow(ctx);
                    results.push('enemy.drawGlow: OK');
                } catch (e) {
                    results.push('enemy.drawGlow: ' + e.message);
                }
            } else {
                results.push('enemy.drawGlow: SKIP (no enemy in pool)');
            }
        }

        // Check Bullet.drawGlow
        if (G.Bullet && G.Bullet.Pool) {
            const bullet = G.Bullet.Pool._pool && G.Bullet.Pool._pool[0];
            if (bullet && typeof bullet.drawGlow === 'function') {
                try {
                    const ctx = document.getElementById('gameCanvas').getContext('2d');
                    bullet.drawGlow(ctx);
                    results.push('bullet.drawGlow: OK');
                } catch (e) {
                    results.push('bullet.drawGlow: ' + e.message);
                }
            } else {
                results.push('bullet.drawGlow: SKIP (no bullet in pool)');
            }
        }

        // Check CampaignState.save/load
        if (G.CampaignState) {
            try {
                G.CampaignState.save();
                results.push('campaignState.save: OK');
            } catch (e) {
                results.push('campaignState.save: ' + e.message);
            }
            try {
                G.CampaignState.load();
                results.push('campaignState.load: OK');
            } catch (e) {
                results.push('campaignState.load: ' + e.message);
            }
        }

        return results;
    });

    const hasGError = errors.some(e => e.includes('G is not defined'));
    const hasRefError = errors.some(e => e.includes('ReferenceError'));

    console.log('Render checks:');
    renderCheck.forEach(r => console.log('  ' + r));

    if (hasGError) {
        console.log('\n❌ FAIL: G is not defined error found');
        errors.forEach(e => console.log('   ' + e));
        await browser.close();
        process.exit(1);
    } else if (hasRefError) {
        console.log('\n❌ FAIL: ReferenceError found');
        errors.forEach(e => console.log('   ' + e));
        await browser.close();
        process.exit(1);
    } else if (errors.length > 0) {
        console.log('\n⚠️  Other errors (non-blocking):');
        errors.forEach(e => console.log('   ' + e));
    }

    console.log('\n✅ PASS: No G/ReferenceError in render path');
    await browser.close();
    process.exit(0);
})();
