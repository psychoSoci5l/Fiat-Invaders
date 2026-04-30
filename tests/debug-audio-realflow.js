// v7.19.x — Debug del flow GODCHAIN reale: forza gameState=PLAY, pumpa player.update
// per simulare il game loop, attiva godchain, attende timer expiry, cattura ogni log
// e ogni snapshot di stato. Identifica esattamente DOVE il flow si rompe.
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 480, height: 800 } });
    const page = await ctx.newPage();

    const traceLog = [];
    page.on('console', (msg) => {
        const t = msg.text();
        if (t.includes('[AUDIO-TRACE]') || t.includes('[AUDIO-STATE]') || t.includes('GODCHAIN') || t.includes('Player:')) {
            traceLog.push(t);
        }
    });
    page.on('pageerror', (err) => traceLog.push(`[PAGE_ERROR] ${err.message}`));

    await page.goto('http://localhost:8000/', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(800);

    // Walk through intro to instantiate Player + game systems.
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
    for (let i = 0; i < 6; i++) {
        await page.mouse.click(240, 400);
        await page.waitForTimeout(200);
    }

    const init = await page.evaluate(() => ({
        v: window.Game?.VERSION,
        gs: window.Game?.gameState,
        p: !!window.player,
        ctxState: window.Game?.Audio?.ctx?.state
    }));
    console.log('[INIT]', JSON.stringify(init));

    // Force gameState=PLAY by exposing a manual pump that calls player.update directly.
    // The real game loop only calls player.update if gameState === 'PLAY' || 'WARMUP'.
    // Since we can't drive the full intro flow reliably, we pump the player ourselves
    // and explicitly trigger the GODCHAIN flow exactly as Player.update would in PLAY.
    console.log('\n=== Activating GODCHAIN ===');
    await page.evaluate(() => {
        window.player.godchainCooldown = 0;
        window.player.activateGodchain();
        // Pump update once to consume the pending and start the layer.
        window.player.update(0.05, false);
    });
    await page.waitForTimeout(200);

    let snap = await page.evaluate(() => dbg.audioState());
    console.log('[POST-ACTIVATE]', JSON.stringify(snap));

    // Pump the player update loop in the page over 12 seconds (simulating gameplay).
    console.log('\n=== Pumping player.update at ~60fps for 12 seconds ===');
    const start = Date.now();
    while (Date.now() - start < 12000) {
        await page.evaluate(() => {
            // Pump 6 frames at 0.0166s each per outer tick (~60fps for 100ms wall)
            for (let i = 0; i < 6; i++) {
                try { window.player.update(0.0166, false); } catch (e) { console.log('[update-err]', e.message); }
            }
        });
        await page.waitForTimeout(100);
    }

    snap = await page.evaluate(() => dbg.audioState());
    console.log('[POST-12s-PUMP]', JSON.stringify(snap));

    // ── SCENARIO B: pause during godchain (no pump) ──
    // Reset, re-activate, immediately pause. Verify stopXxxLayer called.
    console.log('\n=== Scenario B: pause during GODCHAIN ===');
    await page.evaluate(() => { window.player.resetState(); });
    await page.waitForTimeout(200);

    await page.evaluate(() => {
        window.player.godchainCooldown = 0;
        window.player.activateGodchain();
        window.player.update(0.05, false);
    });
    await page.waitForTimeout(100);

    snap = await page.evaluate(() => dbg.audioState());
    console.log('[B-PRE-PAUSE]', JSON.stringify(snap));

    // Simulate togglePause-equivalent audio cleanup (the real togglePause
    // is gated by gameState which we can't easily set in the test harness).
    await page.evaluate(() => {
        const a = window.Game.Audio;
        a.stopGodchainLayer();
        a.stopHyperLayer();
    });
    await page.waitForTimeout(700);

    snap = await page.evaluate(() => dbg.audioState());
    console.log('[B-POST-STOP]', JSON.stringify(snap));

    // ── SCENARIO C: death/respawn during godchain ──
    console.log('\n=== Scenario C: death/respawn during GODCHAIN ===');
    await page.evaluate(() => {
        // Re-trigger godchain
        window.player.godchainCooldown = 0;
        window.player.activateGodchain();
        window.player.update(0.05, false);
    });
    await page.waitForTimeout(100);
    snap = await page.evaluate(() => dbg.audioState());
    console.log('[C-PRE-DEATH]', JSON.stringify(snap));

    await page.evaluate(() => { window.player.resetState(); });
    await page.waitForTimeout(700);
    snap = await page.evaluate(() => dbg.audioState());
    console.log('[C-POST-RESET]', JSON.stringify(snap));

    // Print all trace logs in chronological order
    console.log('\n=== ALL [AUDIO-TRACE] LOGS ===');
    traceLog.forEach(l => console.log('  ' + l));

    await browser.close();
})();
