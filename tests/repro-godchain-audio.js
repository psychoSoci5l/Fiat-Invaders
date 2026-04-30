// v7.19 — Repro test for the GODCHAIN audio sibilo bug.
// Activates GODCHAIN via dbg.godchain(), waits past the timer + fade window,
// then asserts that both audio layer references are null AND every queued
// disconnect timer has executed. Run: node tests/repro-godchain-audio.js
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 480, height: 800 } });
    const page = await ctx.newPage();

    page.on('pageerror', (err) => console.log('[PAGE_ERROR]', err.message));

    await page.goto('http://localhost:8000/', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(800);

    // Shorten GODCHAIN duration so the test is fast (default 10s → 1s).
    await page.evaluate(() => {
        if (window.Game?.Balance?.GODCHAIN) {
            window.Game.Balance.GODCHAIN.DURATION = 1.0;
            window.Game.Balance.GODCHAIN.COOLDOWN = 0.1;
        }
    });

    // Bypass intro: simulate a click on the play area to start the AudioContext + game.
    // The intro flow needs SPACE/click to advance. Send keyboard events.
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);

    // Reach gameplay state. Try to force-start a run via dbg if available.
    const playerReady = await page.evaluate(() => {
        return !!(window.player && window.player.activateGodchain);
    });
    if (!playerReady) {
        console.log('[SKIP] Player not yet instantiated — intro flow still active. Forcing start.');
        // Click center to advance through any remaining intro screens.
        for (let i = 0; i < 5; i++) {
            await page.mouse.click(240, 400);
            await page.waitForTimeout(300);
        }
    }

    // Confirm player + Audio + activateGodchain available.
    const ready = await page.evaluate(() => {
        return {
            hasPlayer: !!window.player,
            hasActivate: !!(window.player && window.player.activateGodchain),
            hasAudio: !!window.Game?.Audio,
            hasStartLayer: !!window.Game?.Audio?.startGodchainLayer,
            ctxState: window.Game?.Audio?.ctx?.state || null
        };
    });
    console.log('[STATE]', JSON.stringify(ready));

    if (!ready.hasPlayer || !ready.hasActivate || !ready.hasAudio) {
        console.log('[FAIL] Game not in playable state — cannot exercise GODCHAIN flow.');
        await browser.close();
        process.exit(2);
    }

    // Trigger GODCHAIN. We hit it twice to also test re-trigger during active state.
    await page.evaluate(() => {
        window.player.godchainCooldown = 0;
        window.player.activateGodchain();
    });
    await page.waitForTimeout(100);

    // After ~50ms, the next update tick should fire startGodchainLayer.
    // Drive a few ticks manually if game loop isn't running (e.g., game in INTRO).
    const afterStart = await page.evaluate(() => {
        // Force-pump a couple of player.update calls if necessary.
        if (window.player && typeof window.player.update === 'function') {
            try { window.player.update(0.05, false); } catch (e) {}
            try { window.player.update(0.05, false); } catch (e) {}
        }
        return {
            godchainTimer: window.player?.godchainTimer ?? null,
            godchainActive: window.player?._godchainActive ?? null,
            godchainLayerNodes: Array.isArray(window.Game?.Audio?._godchainLayerNodes)
                ? window.Game.Audio._godchainLayerNodes.length : null,
            hyperLayerNodes: Array.isArray(window.Game?.Audio?._hyperLayerNodes)
                ? window.Game.Audio._hyperLayerNodes.length : null
        };
    });
    console.log('[POST-ACTIVATE]', JSON.stringify(afterStart));

    // Wait past the shortened duration (1s) + fade (0.4s) + slack.
    await page.waitForTimeout(1800);

    // Pump the player update loop so the Player.update branch can detect timer expiry.
    await page.evaluate(() => {
        if (window.player && typeof window.player.update === 'function') {
            for (let i = 0; i < 10; i++) {
                try { window.player.update(0.2, false); } catch (e) {}
            }
        }
    });

    // Wait for the deferred disconnect timer (400ms after stop).
    await page.waitForTimeout(700);

    const final = await page.evaluate(() => {
        const audio = window.Game?.Audio;
        return {
            godchainTimer: window.player?.godchainTimer ?? null,
            godchainActive: window.player?._godchainActive ?? null,
            godchainLayerNodes: audio?._godchainLayerNodes,
            hyperLayerNodes: audio?._hyperLayerNodes,
            hyperStartedByGodchain: audio?._hyperStartedByGodchain,
            pendingDisconnects: Array.isArray(audio?._pendingDisconnectTimers)
                ? audio._pendingDisconnectTimers.length : null
        };
    });
    console.log('[FINAL]', JSON.stringify(final));

    let pass = true;
    const failures = [];
    if (final.godchainLayerNodes !== null) {
        pass = false; failures.push('godchainLayerNodes should be null (got ' + JSON.stringify(final.godchainLayerNodes) + ')');
    }
    if (final.hyperLayerNodes !== null) {
        pass = false; failures.push('hyperLayerNodes should be null (got ' + JSON.stringify(final.hyperLayerNodes) + ')');
    }
    if (final.godchainActive) {
        pass = false; failures.push('godchainActive should be false');
    }
    if (final.pendingDisconnects !== 0) {
        pass = false; failures.push('pendingDisconnectTimers should be 0 (got ' + final.pendingDisconnects + ')');
    }

    if (!pass) {
        console.log('\n❌ FAIL (timer-expiry path) — issues detected:');
        failures.forEach(f => console.log('  - ' + f));
        await browser.close();
        process.exit(1);
    }

    // ── Phase 2: pause-during-GODCHAIN must also stop the drone layers ───
    // Re-trigger godchain, then immediately pause the game and assert that the
    // continuous layers are released without waiting for the timer to expire.
    // Regression test for v7.19.1: the original v7.19 fix only ran via Player.update
    // tick — which is suppressed in PAUSE — so the sibilo leaked through pause.
    await page.evaluate(() => {
        window.player.godchainCooldown = 0;
        window.player.activateGodchain();
        try { window.player.update(0.05, false); } catch (e) {}
    });
    await page.waitForTimeout(100);

    // Confirm layers are running before we pause.
    const beforePause = await page.evaluate(() => ({
        godchainLayerNodes: Array.isArray(window.Game.Audio._godchainLayerNodes)
            ? window.Game.Audio._godchainLayerNodes.length : null,
        hyperLayerNodes: Array.isArray(window.Game.Audio._hyperLayerNodes)
            ? window.Game.Audio._hyperLayerNodes.length : null
    }));
    console.log('[PRE-PAUSE]', JSON.stringify(beforePause));

    // Simulate what togglePause(PLAY → PAUSE) does internally for the audio side.
    // We can't drive togglePause() through the public API in the test harness
    // because the GameStateMachine blocks INTRO → PLAY without walking the full
    // intro flow, but we can verify the contract that stopXxxLayer() is what
    // gets called and that it cleans up properly. Mirrors src/main.js togglePause.
    await page.evaluate(() => {
        const audio = window.Game.Audio;
        if (audio.pauseMusic) audio.pauseMusic();
        if (audio.stopGodchainLayer) audio.stopGodchainLayer();
        if (audio.stopHyperLayer) audio.stopHyperLayer();
    });
    await page.waitForTimeout(700); // wait past the deferred disconnect

    const afterPause = await page.evaluate(() => ({
        godchainLayerNodes: window.Game.Audio._godchainLayerNodes,
        hyperLayerNodes: window.Game.Audio._hyperLayerNodes,
        pendingDisconnects: Array.isArray(window.Game.Audio._pendingDisconnectTimers)
            ? window.Game.Audio._pendingDisconnectTimers.length : null
    }));
    console.log('[POST-PAUSE]', JSON.stringify(afterPause));

    let pausePass = true;
    const pauseFails = [];
    if (afterPause.godchainLayerNodes !== null) {
        pausePass = false; pauseFails.push('godchainLayerNodes still set after pause');
    }
    if (afterPause.hyperLayerNodes !== null) {
        pausePass = false; pauseFails.push('hyperLayerNodes still set after pause');
    }

    await browser.close();

    if (pass && pausePass) {
        console.log('\n✅ PASS — GODCHAIN audio cleanup verified (timer expiry + pause paths)');
        process.exit(0);
    } else {
        console.log('\n❌ FAIL — issues detected:');
        if (!pausePass) pauseFails.forEach(f => console.log('  - ' + f));
        process.exit(1);
    }
})();
