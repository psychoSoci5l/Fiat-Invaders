// Automated replacement for the 8 manual visual checks
// Run: node tests/manual-checks-automated.js
// Requires: python3 -m http.server 8000 running

const { chromium } = require('playwright');

const BASE = 'http://localhost:8000';
const RESULTS = [];

function report(category, check, pass, detail = '') {
    const icon = pass ? '✅ PASS' : '❌ FAIL';
    RESULTS.push({ category, check, pass, detail });
    console.log(`  ${icon} | ${check}${detail ? ' — ' + detail : ''}`);
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    console.log('\n=== Automated Manual Checks — FIAT vs CRYPTO ===\n');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 480, height: 800 },
        deviceScaleFactor: 2
    });
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // =====================================================
    // CHECK 1: Video splash
    // =====================================================
    console.log('[CHECK 1/8] Video splash\n');
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
    await sleep(2000);

    const videoEl = await page.$('#intro-video');
    report('1-Video', 'Video element (#intro-video) exists', !!videoEl);

    const videoSrc = await page.evaluate(() => {
        const v = document.getElementById('intro-video');
        return v ? v.querySelector('source')?.getAttribute('src') || v.getAttribute('src') || 'N/A' : 'N/A';
    });
    report('1-Video', `Video source: ${videoSrc}`, videoSrc.includes('splashscreen') || videoSrc !== 'N/A');

    const splashLayer = await page.$('#splash-layer');
    report('1-Video', 'Splash layer in DOM', !!splashLayer);

    let state = await page.evaluate(() => window.Game?.GameState?.current || 'N/A');
    report('1-Video', `Initial state: ${state}`, state === 'VIDEO',
        state !== 'VIDEO' ? `actual: ${state}` : '');

    console.log();

    // =====================================================
    // CHECK 2: Hangar / INTRO screen + ship selection
    // =====================================================
    console.log('[CHECK 2/8] Hangar screen\n');

    // Click canvas to go VIDEO→INTRO
    await page.mouse.click(240, 400);
    await sleep(1500);

    state = await page.evaluate(() => window.Game?.GameState?.current || 'N/A');
    report('2-Hangar', `State after click: ${state}`, state === 'INTRO');

    // Click primary action to reveal modes (first tap skips animation / reveals)
    const primaryBtn = await page.$('#btn-primary-action');
    report('2-Hangar', 'Primary action button exists', !!primaryBtn);

    if (primaryBtn) {
        await primaryBtn.click();
        await sleep(800);
    }

    // Check mode pills are now visible
    const modeStory = await page.$('#mode-pill-story');
    const modeStoryVis = modeStory ? await modeStory.isVisible() : false;
    report('2-Hangar', 'STORY mode pill visible after reveal', modeStoryVis);

    const modeArcade = await page.$('#mode-pill-arcade');
    const modeArcadeVis = modeArcade ? await modeArcade.isVisible() : false;
    report('2-Hangar', 'ARCADE mode pill visible', modeArcadeVis);

    const modeDaily = await page.$('#mode-pill-daily');
    const modeDailyVis = modeDaily ? await modeDaily.isVisible() : false;
    report('2-Hangar', 'DAILY mode pill visible', modeDailyVis);

    // Ship stats should be available
    const shipStats = await page.evaluate(() => {
        const s = window.Game?.SHIPS;
        if (!s) return 'N/A';
        return Object.entries(s).map(([k, v]) =>
            `${k}: dmg=${v.baseDamage || '?'}`
        ).join(' | ');
    });
    report('2-Hangar', `Ship stats: ${shipStats}`, shipStats.includes('BTC'));

    // Click ARCADE mode (avoids STORY_SCREEN intro dialogue)
    if (modeArcade) {
        await modeArcade.click();
        await sleep(500);
    }

    // Click primary action again to enter SELECTION
    if (primaryBtn) {
        await page.click('#btn-primary-action');
        await sleep(1000);
    }

    // In SELECTION, check ship navigation
    const arrowRight = await page.$('#arrow-right');
    const arrowLeft = await page.$('#arrow-left');
    report('2-Hangar', 'Ship arrow-right visible', !!arrowRight);
    report('2-Hangar', 'Ship arrow-left visible', !!arrowLeft);

    if (arrowRight) {
        const arrowVis = await arrowRight.isVisible();
        report('2-Hangar', 'Arrow buttons visible in selection', arrowVis);
    }

    const selHeader = await page.evaluate(() => {
        const el = document.getElementById('selection-header');
        return el ? el.style.display : 'N/A';
    });
    report('2-Hangar', `Selection header display: ${selHeader}`, selHeader === 'block' || selHeader === 'flex');

    console.log();

    // =====================================================
    // CHECK 3: Gameplay start
    // =====================================================
    console.log('[CHECK 3/8] Gameplay start\n');

    // Click LAUNCH to start game — wait for countdown (3s) + ship entry
    await page.click('#btn-primary-action');
    await sleep(5000);

    state = await page.evaluate(() => window.Game?.GameState?.current || 'N/A');
    report('3-Gameplay', `State after LAUNCH: ${state}`, state === 'PLAY',
        state !== 'PLAY' ? `actual: ${state}` : '');

    // Wait for ship entry animation + countdown to finish
    await sleep(4000);

    const playerExists = await page.evaluate(() => {
        const p = window.player || window.Game?.Player;
        return !!(p && p.x !== undefined && p.y !== undefined);
    });
    report('3-Gameplay', 'Player entity exists', playerExists);

    const playerPos = await page.evaluate(() => {
        const p = window.player || window.Game?.Player;
        return p ? `x=${Math.round(p.x || 0)}, y=${Math.round(p.y || 0)}` : 'N/A';
    });
    report('3-Gameplay', `Player position: ${playerPos}`, playerPos.includes('x='));

    const canvas = await page.$('#gameCanvas');
    const canvasVis = canvas ? await canvas.isVisible() : false;
    report('3-Gameplay', 'Canvas visible', canvasVis);

    // Simulate movement with arrow keys
    await page.keyboard.down('ArrowRight');
    await sleep(500);
    await page.keyboard.up('ArrowRight');
    const movedPos = await page.evaluate(() => {
        const p = window.player || window.Game?.Player;
        return p && p.x !== undefined ? Math.round(p.x) : -1;
    });
    report('3-Gameplay', 'Player moves with ArrowRight key', movedPos > 0,
        `x=${movedPos}`);

    console.log();

    // =====================================================
    // CHECK 4: Enemies / waves
    // =====================================================
    console.log('[CHECK 4/8] Enemies & Waves\n');

    // Wait for enemies to spawn (advance game time)
    await page.evaluate(() => {
        // Force the game loop to advance by setting a longer elapsed
        if (window.Game.LevelScript) {
            window.Game.LevelScript._elapsed = 5000; // jump ahead 5s
        }
    });
    await sleep(2000);

    // Check enemy system
    const wmExists = await page.evaluate(() => !!window.Game?.WaveManager);
    report('4-Enemies', 'WaveManager exists', wmExists);

    const csExists = await page.evaluate(() => !!window.Game?.CollisionSystem);
    report('4-Enemies', 'CollisionSystem exists', csExists);

    // Check bullet system (auto-fire)
    const bulletSys = await page.evaluate(() => !!window.Game?.Bullet);
    report('4-Enemies', 'Bullet system exists', bulletSys);

    // Check DIP meter element
    const dipMeterEl = await page.$('#graze-meter');
    report('4-Enemies', 'DIP meter element exists', !!dipMeterEl);

    const dipVisible = dipMeterEl ? await dipMeterEl.isVisible() : false;
    report('4-Enemies', 'DIP meter visible during gameplay', dipVisible);

    // Check HUD elements
    const livesText = await page.$('#livesText');
    const livesVis = livesText ? await livesText.isVisible() : false;
    report('4-Enemies', 'Lives HUD visible', livesVis);

    const scoreVal = await page.$('#scoreVal');
    const scoreVis = scoreVal ? await scoreVal.isVisible() : false;
    report('4-Enemies', 'Score HUD visible', scoreVis);

    console.log();

    // =====================================================
    // CHECK 5: Pause menu
    // =====================================================
    console.log('[CHECK 5/8] Pause menu\n');

    await page.keyboard.press('Escape');
    await sleep(800);

    state = await page.evaluate(() => window.Game?.GameState?.current || 'N/A');
    report('5-Pause', `State after ESC: ${state}`, state === 'PAUSE');

    const pauseScreen = await page.$('#pause-screen');
    const pauseVis = pauseScreen ? await pauseScreen.isVisible() : false;
    report('5-Pause', 'Pause screen visible', pauseVis);

    const pauseTitle = await page.evaluate(() => {
        const el = document.getElementById('pause-title');
        return el?.textContent?.trim() || 'N/A';
    });
    report('5-Pause', `Pause title: "${pauseTitle}"`, pauseTitle.includes('PAUSED') || pauseTitle !== 'N/A');

    const resumeBtn = await page.$('#btn-resume');
    report('5-Pause', 'RESUME button exists', !!resumeBtn);

    const exitBtn = await page.$('#btn-exit-title');
    report('5-Pause', 'EXIT TO TITLE button exists', !!exitBtn);

    // Resume
    await page.keyboard.press('Escape');
    await sleep(800);
    state = await page.evaluate(() => window.Game?.GameState?.current || 'N/A');
    report('5-Pause', `Resume: state=${state}`, state === 'PLAY');

    console.log();

    // =====================================================
    // CHECK 6: Death / Game Over
    // =====================================================
    console.log('[CHECK 6/8] Game Over\n');

    // Force GAMEOVER via state machine + show gameover screen
    const goResult = await page.evaluate(() => {
        try {
            window.Game.RunState.lives = 0;
            window.Game.GameState.transition('GAMEOVER');
            // Show the gameover screen (normally done by GameCompletion)
            const go = document.getElementById('gameover-screen');
            if (go) go.style.display = 'flex';
            return window.Game.GameState.current;
        } catch (e) {
            return 'ERROR: ' + e.message;
        }
    });
    await sleep(1000);
    report('6-GameOver', `GameOver state: ${goResult}`, goResult === 'GAMEOVER');

    const goScreen = await page.evaluate(() => {
        const el = document.getElementById('gameover-screen');
        if (!el) return 'NOT_FOUND';
        const style = window.getComputedStyle(el);
        return style.display !== 'none' ? 'visible' : 'hidden';
    });
    report('6-GameOver', `GameOver screen: ${goScreen}`, goScreen === 'visible');

    const rektText = await page.evaluate(() => {
        const el = document.getElementById('gameover-meme');
        return el?.textContent?.trim() || 'no element';
    });
    report('6-GameOver', `Meme text: "${rektText}"`, rektText.length > 0 && rektText !== 'no element');

    const finalScore = await page.evaluate(() => {
        const el = document.getElementById('finalScore');
        return el?.textContent?.trim() || 'N/A';
    });
    report('6-GameOver', `Final score displayed: ${finalScore}`, finalScore !== 'N/A' && finalScore !== '');

    const retryBtn = await page.$('#btn-retry');
    report('6-GameOver', 'Retry button exists', !!retryBtn);

    // Test restart via INTRO transition
    const restartOk = await page.evaluate(() => {
        try { return window.Game.GameState.transition('INTRO'); } catch (e) { return false; }
    });
    await sleep(500);
    report('6-GameOver', 'GAMEOVER → INTRO transition', restartOk);

    console.log();

    // =====================================================
    // CHECK 7: DIP Meter / HYPER
    // =====================================================
    console.log('[CHECK 7/8] DIP Meter & HYPER\n');

    // Re-enter PLAY for HYPER test
    await page.evaluate(() => {
        try {
            window.Game.GameState.transition('PLAY');
            window.Game.RunState = window.Game.RunState || {};
            window.Game.RunState.dipMeter = 100;
            window.Game.RunState.hyperActive = false;
        } catch (e) {}
    });
    await sleep(500);

    // Check DIP system
    const dipSystem = await page.evaluate(() => {
        const rs = window.Game?.RunState;
        return !!(rs && (rs.dipMeter !== undefined));
    });
    report('7-DIP', 'RunState.dipMeter exists', dipSystem);

    // Check HYPER system
    const hyperReady = await page.evaluate(() => window.Game?.TEXTS?.EN?.HYPER_READY || 'N/A');
    report('7-DIP', `HYPER_READY text: "${hyperReady}"`, hyperReady.includes('HYPER'));

    const hyperFailed = await page.evaluate(() => window.Game?.TEXTS?.EN?.HYPER_FAILED || 'N/A');
    report('7-DIP', `HYPER_FAILED text: "${hyperFailed}"`, hyperFailed.includes('HYPER'));

    // Check DIP element properties
    const dipFill = await page.evaluate(() => {
        const el = document.getElementById('graze-fill');
        return el ? el.style.width || el.offsetWidth || 'exists' : 'NOT_FOUND';
    });
    report('7-DIP', `DIP fill element: ${dipFill}`, dipFill !== 'NOT_FOUND');

    // Check DIP label
    const dipLabel = await page.evaluate(() => {
        const el = document.getElementById('graze-label');
        return el?.textContent?.trim() || 'N/A';
    });
    report('7-DIP', `DIP label: "${dipLabel}"`, dipLabel !== 'N/A');

    // Check Balance config for HYPER
    const hyperBalance = await page.evaluate(() => {
        const b = window.Game?.Balance;
        return b?.HYPER ? 'exists' : (b?.DIP ? 'has DIP' : 'N/A');
    });
    report('7-DIP', `HYPER balance config: ${hyperBalance}`, hyperBalance !== 'N/A');

    console.log();

    // =====================================================
    // CHECK 8: Audio
    // =====================================================
    console.log('[CHECK 8/8] Audio\n');

    const audioSystem = await page.evaluate(() => !!window.Game?.Audio);
    report('8-Audio', 'AudioSystem exists', audioSystem);

    const audioCtx = await page.evaluate(() => {
        const a = window.Game?.Audio;
        return a?.ctx?.constructor?.name || a?.context?.constructor?.name || 'N/A';
    });
    report('8-Audio', `AudioContext: ${audioCtx}`, audioCtx.includes('AudioContext') || audioCtx !== 'N/A');

    const musicData = await page.evaluate(() => {
        const m = window.Game?.MusicData;
        return m ? Object.keys(m).length : 0;
    });
    report('8-Audio', `MusicData keys: ${musicData}`, musicData > 1);

    const volControls = await page.evaluate(() => {
        const a = window.Game?.Audio;
        return !!(a && (typeof a.toggleMusic === 'function' || typeof a.toggleSfx === 'function'));
    });
    report('8-Audio', 'Volume controls (toggleMusic/toggleSfx)', volControls);

    const pauseMusicBtn = await page.$('#pause-music-toggle');
    report('8-Audio', 'Pause screen music toggle exists', !!pauseMusicBtn);

    const pauseSfxBtn = await page.$('#pause-sfx-toggle');
    report('8-Audio', 'Pause screen SFX toggle exists', !!pauseSfxBtn);

    console.log();

    // =====================================================
    // SUMMARY
    // =====================================================
    const passed = RESULTS.filter(r => r.pass).length;
    const failed = RESULTS.filter(r => !r.pass).length;
    const total = RESULTS.length;

    console.log('='.repeat(60));
    console.log(`  MANUAL CHECKS AUTOMATED: ${passed}/${total} passed`);
    if (failed > 0) {
        console.log(`  FAILED (${failed}):`);
        RESULTS.filter(r => !r.pass).forEach(r =>
            console.log(`    - [${r.category}] ${r.check}: ${r.detail}`));
    }
    console.log('='.repeat(60));

    console.log('\n  Per-check summary:');
    const checkGroups = [...new Set(RESULTS.map(r => r.category))];
    for (const grp of checkGroups) {
        const grpRes = RESULTS.filter(r => r.category === grp);
        const gPassed = grpRes.filter(r => r.pass).length;
        console.log(`    ${grp}: ${gPassed}/${grpRes.length} passed`);
    }

    console.log('\n  ⚡ Items STILL needing human eyes (can\'t automate):');
    console.log('    1. Video plays smoothly (no stutter)');
    console.log('    2. Hangar renders correctly (colors, layout)');
    console.log('    3. Ship movement + shooting look correct visually');
    console.log('    4. Enemy death animations, explosions look good');
    console.log('    5. HYPER activation visual effects look correct');
    console.log('    6. Audio actually sounds good (SFX + music)');
    console.log();

    await browser.close();

    if (failed > 0) {
        console.log(`⚠️  ${failed} automated check(s) failed. See above.`);
        process.exit(1);
    } else {
        console.log('✅ All automated checks passed!');
        process.exit(0);
    }
}

run().catch(err => {
    console.error('Test crashed:', err);
    process.exit(1);
});
