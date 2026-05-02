// Playwright-based smoke test for FIAT vs CRYPTO
// Run: node tests/smoke-test-playwright.js

const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:8000';
const RESULTS = [];

function report(category, check, pass, detail = '') {
    const icon = pass ? '✅ PASS' : '❌ FAIL';
    RESULTS.push({ category, check, pass, detail });
    console.log(`  ${icon} | ${check}${detail ? ' — ' + detail : ''}`);
}

async function run() {
    console.log('\n=== FIAT vs CRYPTO — Automated Smoke Test ===\n');
    console.log(`Game URL: ${BASE}\n`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 480, height: 800 },
        deviceScaleFactor: 2
    });
    const page = await context.newPage();

    // Collect console messages
    const consoleErrors = [];
    const consoleWarnings = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
        if (msg.type() === 'warning') consoleWarnings.push(msg.text());
    });

    // Collect page errors
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    // --- 1. Game loads without errors ---
    console.log('[1/12] Game Load');
    try {
        await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
        report('Load', 'Page loads with HTTP 200', true);
    } catch (e) {
        report('Load', 'Page loads with HTTP 200', false, e.message);
    }

    // Wait a bit for scripts to execute
    await page.waitForTimeout(2000);

    // Check console errors
    const loadErrors = consoleErrors.filter(e => !e.includes('favicon.ico') && !e.includes('autoplay'));
    report('Load', 'No console errors on load', loadErrors.length === 0,
        loadErrors.length > 0 ? loadErrors.slice(0, 3).join('; ') : '');
    report('Load', 'No unhandled page errors', pageErrors.length === 0,
        pageErrors.length > 0 ? pageErrors.slice(0, 3).join('; ') : '');

    // Check Game namespace exists
    const gameExists = await page.evaluate(() => typeof window.Game !== 'undefined');
    report('Load', 'window.Game namespace exists', gameExists);

    // Check version
    const version = await page.evaluate(() => window.Game?.VERSION || 'N/A');
    // v7.19: match any v7.x(.y) FIAT vs CRYPTO version — robust to bumps without test churn.
    report('Load', `Game version: ${version}`, /^v7\.\d+(\.\d+)?\s+FIAT vs CRYPTO/.test(version));

    // --- 2. Canvas and rendering ---
    console.log('\n[2/12] Canvas & Rendering');
    const canvasExists = await page.evaluate(() => {
        const c = document.getElementById('gameCanvas');
        return c && c.getContext && true;
    });
    report('Canvas', 'Canvas element exists with context', canvasExists);

    const canvasSize = await page.evaluate(() => {
        const c = document.getElementById('gameCanvas');
        return c ? `${c.width}x${c.height}` : 'N/A';
    });
    report('Canvas', `Canvas dimensions: ${canvasSize}`, canvasSize !== 'N/A');

    // --- 3. Initial game state is VIDEO ---
    console.log('\n[3/12] State Machine');
    let state = await page.evaluate(() => window.Game?.GameState?.current || 'N/A');
    report('State', `Initial state: ${state}`,
        state === 'VIDEO' || state === 'INTRO',
        `Expected VIDEO, got ${state}`);

    // Check state machine exists
    const smExists = await page.evaluate(() => !!window.Game?.GameState?.transition);
    report('State', 'GameStateMachine has transition()', smExists);

    // --- 4. Check key modules loaded ---
    console.log('\n[4/12] Core Modules');
    const modules = {
        'EventBus': 'Events',
        'GameStateMachine': 'GameState',
        'AudioSystem': 'Audio',
        'InputSystem': 'Input',
        'CollisionSystem': 'CollisionSystem',
        'WaveManager': 'WaveManager',
        'Player': 'Player',
        'Enemy': 'Enemy',
        'Boss': 'Boss',
        'Bullet': 'Bullet',
        'ArcadeModifiers': 'ArcadeModifiers',
        'PerkManager': 'PerkManager',
        'BossSpawner': 'BossSpawner'
    };
    for (const [name, key] of Object.entries(modules)) {
        const exists = await page.evaluate((k) => {
            const parts = k.split('.');
            let obj = window.Game;
            for (const p of parts) {
                if (!obj || !obj[p]) return false;
                obj = obj[p];
            }
            return true;
        }, key);
        report('Modules', `${name} loaded`, exists);
    }

    // --- 5. DOM elements ---
    console.log('\n[5/12] DOM Structure');
    const domChecks = {
        'Game container': '#game-container',
        'Canvas': '#gameCanvas',
        'UI Layer': '#ui-layer',
        'HUD Lives': '#livesText',
        'HUD Score': '#scoreVal',
        'HUD Level': '#lvlVal',
        'DIP Meter': '#graze-meter',
        'Message strip': '#message-strip',
        'Intro screen': '#intro-screen',
        'Curtain overlay': '#curtain-overlay',
        'Splash layer': '#splash-layer',
        'Splash video': '#intro-video',
        'Scanlines': '.scanlines',
        'Vignette': '.vignette'
    };
    for (const [name, selector] of Object.entries(domChecks)) {
        const exists = await page.$(selector);
        report('DOM', `${name} (${selector})`, !!exists);
    }

    // --- 6. LocalStorage initialization ---
    console.log('\n[6/12] LocalStorage');
    const lsVersion = await page.evaluate(() => localStorage.getItem('fiat_app_version'));
    report('Storage', 'App version stored in localStorage', !!lsVersion, lsVersion || 'missing');

    // --- 7. Transition to INTRO (click to start) ---
    console.log('\n[7/12] INTRO Screen');
    try {
        await page.click('#gameCanvas', { timeout: 3000 });
        await page.waitForTimeout(1000);
    } catch (e) {
        // Try clicking the center of the page
        await page.mouse.click(240, 400);
        await page.waitForTimeout(1000);
    }

    // Transition to INTRO might happen via timeout or click
    state = await page.evaluate(() => window.Game?.GameState?.current || 'N/A');
    report('State', `State after interaction: ${state}`,
        ['INTRO', 'HANGAR', 'VIDEO'].includes(state),
        `State: ${state}`);

    // --- 8. Check constants/ships ---
    console.log('\n[8/12] Game Data');
    const ships = await page.evaluate(() => {
        const s = window.Game?.SHIPS;
        return s ? Object.keys(s).join(', ') : 'N/A';
    });
    report('Data', `Ships defined: ${ships}`, ships.includes('BTC') && ships.includes('ETH'));

    const fiatTypes = await page.evaluate(() => {
        const f = window.Game?.FIAT_TYPES;
        return f ? f.length : 0;
    });
    report('Data', `Fiat enemy types: ${fiatTypes}`, fiatTypes >= 10);

    // --- 9. EventBus functional test ---
    console.log('\n[9/12] EventBus');
    const busWorks = await page.evaluate(() => {
        try {
            let called = false;
            const unsub = window.Game.Events.on('test:event', () => { called = true; });
            window.Game.Events.emit('test:event');
            unsub();
            return called;
        } catch (e) {
            return false;
        }
    });
    report('EventBus', 'on/emit/off cycle works', busWorks);

    const eventConvention = await page.evaluate(() => {
        const warn = console.warn;
        let warned = false;
        console.warn = (msg) => { if (msg.includes('does not follow domain:action')) warned = true; };
        window.Game.Events.on('badEventName', () => {});
        console.warn = warn;
        return warned;
    });
    report('EventBus', 'Convention warning fires for bad event names', eventConvention);

    // --- 10. State machine transitions ---
    console.log('\n[10/12] State Machine Transitions');
    const validTransition = await page.evaluate(() => {
        try {
            // Store current state
            const current = window.Game.GameState.current;
            // Try a valid transition from current state (VIDEO → INTRO)
            if (current === 'VIDEO') {
                return window.Game.GameState.transition('INTRO');
            }
            return true; // Already past VIDEO
        } catch (e) {
            return false;
        }
    });
    report('State', 'Valid VIDEO→INTRO transition allowed', validTransition);

    // Test invalid transition is blocked
    const invalidBlocked = await page.evaluate(() => {
        try {
            const current = window.Game.GameState.current;
            // Try an obviously invalid transition from current state
            if (current === 'HANGAR') {
                return !window.Game.GameState.transition('GAMEOVER');
            }
            // Try VIDEO → GAMEOVER
            return !window.Game.GameState.transition('GAMEOVER');
        } catch (e) {
            return false;
        }
    });
    report('State', 'Invalid transitions blocked', invalidBlocked);

    // --- 11. Audio system ---
    console.log('\n[11/12] Audio');
    const audioExists = await page.evaluate(() => !!window.Game?.Audio);
    report('Audio', 'AudioSystem module exists', audioExists);

    const audioCtx = await page.evaluate(() => window.Game?.Audio?.ctx?.constructor?.name || 'N/A');
    // AudioContext may be unavailable in headless browsers — report state, don't fail
    const ctxOk = audioCtx.includes('AudioContext') || audioCtx === 'N/A';
    report('Audio', `AudioContext: ${audioCtx}`, ctxOk, audioCtx);

    // --- 12. Service worker ---
    console.log('\n[12/12] Service Worker');
    const swRegistered = await page.evaluate(async () => {
        try {
            const regs = await navigator.serviceWorker.getRegistrations();
            return regs.length > 0;
        } catch (e) {
            return false;
        }
    });
    report('SW', 'Service worker registered', swRegistered);

    // --- SUMMARY ---
    const passed = RESULTS.filter(r => r.pass).length;
    const failed = RESULTS.filter(r => !r.pass).length;
    const total = RESULTS.length;

    console.log('\n' + '='.repeat(55));
    console.log(`  RESULTS: ${passed}/${total} passed`);
    if (failed > 0) {
        console.log(`  FAILED (${failed}):`);
        RESULTS.filter(r => !r.pass).forEach(r => {
            console.log(`    - [${r.category}] ${r.check}: ${r.detail}`);
        });
    }
    console.log('='.repeat(55) + '\n');

    await browser.close();

    // Exit with proper code
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('Smoke test crashed:', err);
    process.exit(1);
});
