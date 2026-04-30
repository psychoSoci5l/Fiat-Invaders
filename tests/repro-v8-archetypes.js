// v7.19 — Repro test: in V8 campaign mode the 3 archetype agents must actually
// spawn via the temporal schedule (Balance.ARCHETYPES.V8_SCHEDULE). Without
// this, WaveManager.dormant means archetypes are invisible outside Arcade.
// Run: node tests/repro-v8-archetypes.js
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 480, height: 800 } });
    const page = await ctx.newPage();

    page.on('pageerror', (err) => console.log('[PAGE_ERROR]', err.message));

    await page.goto('http://localhost:8000/', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(800);

    // Tighten the schedule so the test runs fast: HFT @ 1s, AUDITOR @ 2s, PRINTER @ 3s.
    // V8_MODE.ENABLED is left as-is (true by default — that's the case we care about).
    await page.evaluate(() => {
        const arch = window.Game?.Balance?.ARCHETYPES;
        if (arch?.V8_SCHEDULE) {
            arch.V8_SCHEDULE.HFT = { FROM_LEVEL: 1, AT: [1] };
            arch.V8_SCHEDULE.AUDITOR = { FROM_LEVEL: 1, AT: [2] };
            arch.V8_SCHEDULE.PRINTER = { FROM_LEVEL: 1, AT: [3] }; // also flip to L1 for the test
        }
    });

    // Walk through the intro flow.
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

    const ready = await page.evaluate(() => {
        return {
            hasLS: !!window.Game?.LevelScript,
            hasWM: !!window.Game?.WaveManager,
            hasSpawn: typeof window.Game?.WaveManager?._spawnSingleArchetype === 'function',
            elapsed: window.Game?.LevelScript?._elapsed ?? null,
            v8Enabled: window.Game?.Balance?.V8_MODE?.ENABLED
        };
    });
    console.log('[STATE]', JSON.stringify(ready));

    if (!ready.hasLS || !ready.hasWM || !ready.hasSpawn) {
        console.log('[FAIL] V8 LevelScript or WaveManager._spawnSingleArchetype missing.');
        await browser.close();
        process.exit(2);
    }

    // Pump LevelScript.tick manually to advance _elapsed past each schedule entry.
    // Spawning depends on G.enemies being a live array; create one if missing.
    await page.evaluate(() => {
        if (!Array.isArray(window.Game.enemies)) window.Game.enemies = [];
    });

    // Tick at 0.5s steps so we cross schedule timestamps deterministically.
    const enemiesAt = {};
    for (let t = 0; t < 8; t++) {
        await page.evaluate((dt) => {
            try { window.Game.LevelScript.tick(dt); } catch (e) {}
        }, 0.5);
        const snap = await page.evaluate(() => {
            const counts = { HFT: 0, AUDITOR: 0, PRINTER: 0 };
            (window.Game.enemies || []).forEach(e => {
                if (e && e.archetype && counts[e.archetype] !== undefined) counts[e.archetype]++;
            });
            return { elapsed: window.Game.LevelScript._elapsed, counts };
        });
        enemiesAt[snap.elapsed.toFixed(2)] = snap.counts;
    }

    console.log('[SCHEDULE-TICK]', JSON.stringify(enemiesAt));

    const final = await page.evaluate(() => {
        const counts = { HFT: 0, AUDITOR: 0, PRINTER: 0 };
        (window.Game.enemies || []).forEach(e => {
            if (e && e.archetype && counts[e.archetype] !== undefined) counts[e.archetype]++;
        });
        return counts;
    });
    console.log('[FINAL]', JSON.stringify(final));

    let pass = true;
    const failures = [];
    if (final.HFT === 0)     { pass = false; failures.push('HFT swarm did not spawn'); }
    if (final.AUDITOR === 0) { pass = false; failures.push('AUDITOR did not spawn'); }
    if (final.PRINTER === 0) { pass = false; failures.push('PRINTER did not spawn'); }

    await browser.close();

    if (pass) {
        console.log('\n✅ PASS — all 3 archetypes spawn under V8 temporal schedule');
        process.exit(0);
    } else {
        console.log('\n❌ FAIL — archetypes missing in V8:');
        failures.forEach(f => console.log('  - ' + f));
        process.exit(1);
    }
})();
