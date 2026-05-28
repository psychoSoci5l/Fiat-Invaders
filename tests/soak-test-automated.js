// Automated Soak Test — v7.33.0
// Run: node tests/soak-test-automated.js [duration_minutes]
// Default: 60 min (minimum meaningful soak; full 4h can be run overnight)
//
// What it does:
// 1. Starts a local HTTP server
// 2. Opens the game in headless Chrome via Playwright
// 3. Navigates menus to start Arcade mode
// 4. Auto-plays with keyboard inputs
// 5. Monitors FPS, heap, entity counts every simulated 15 min
// 6. Detects white screen, crashes, memory leaks
// 7. Generates a final report

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

// --- Config ---
const DURATION_MIN = parseInt(process.argv[2] || '60', 10);
const SNAPSHOT_INTERVAL_MS = 15 * 60 * 1000; // every 15 real minutes
const CHECK_INTERVAL_MS = 60 * 1000;           // health check every minute
const SERVER_PORT = 8173;
const ROOT_DIR = path.resolve(__dirname, '..');
const RESULTS = [];

// --- Simple HTTP server (copied pattern from run-unit-tests-with-server.js) ---
const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mp4': 'video/mp4',
    '.png': 'image/png',
    '.svg': 'image/svg+xml; charset=utf-8'
};

function safePath(urlPath) {
    const r = decodeURIComponent(urlPath.split('?')[0]);
    const n = path.normalize(r).replace(/^(\.\.[/\\])+/, '');
    return path.join(ROOT_DIR, n === path.sep ? 'index.html' : n);
}

function sendFile(fp, res) {
    fs.readFile(fp, (err, data) => {
        if (err) {
            res.writeHead(err.code === 'ENOENT' ? 404 : 500);
            res.end(err.code === 'ENOENT' ? 'Not found' : 'Server error');
            return;
        }
        const ext = path.extname(fp).toLowerCase();
        res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
        res.end(data);
    });
}

function startServer() {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => sendFile(safePath(req.url), res));
        server.listen(SERVER_PORT, '127.0.0.1', () => {
            console.log(`[SERVER] HTTP on http://127.0.0.1:${SERVER_PORT}`);
            resolve(server);
        });
    });
}

// --- Helpers ---
function log(prefix, msg) {
    const t = new Date().toISOString().slice(11, 19);
    console.log(`[${t}] [${prefix}] ${msg}`);
}

function snapshot(page, label) {
    return page.evaluate(() => {
        const m = performance.memory;
        return {
            fps: window.Game?._fps ?? null,
            heapMB: m ? +(m.usedJSHeapSize / 1048576).toFixed(1) : null,
            heapTotalMB: m ? +(m.jsHeapSizeLimit / 1048576).toFixed(1) : null,
            entities: window.Game?.enemies?.length ?? 0,
            playerBullets: window.Game?.playerBullets?.length ?? 0,
            enemyBullets: window.enemyBullets?.length ?? 0,
            particles: window.Game?.particles?.length ?? 0,
            wave: window.Game?.WaveManager?.wave ?? null,
            cycle: window.Game?.WaveManager?.cycle ?? null,
            state: window.Game?.GameState?.current ?? null,
            uptimeMin: Math.floor(performance.now() / 60000)
        };
    }).then(data => {
        log('SNAPSHOT', label + ': ' + JSON.stringify(data));
        RESULTS.push({ label, ts: Date.now(), ...data, crash: false, whiteScreen: false });
        return data;
    });
}

async function checkWhiteScreen(page) {
    try {
        const hasCanvas = await page.evaluate(() => {
            const c = document.getElementById('gameCanvas');
            return c && c.width > 0 && c.height > 0;
        });
        if (!hasCanvas) return false;

        const isWhite = await page.evaluate(() => {
            const c = document.getElementById('gameCanvas');
            const ctx = c.getContext('2d');
            const img = ctx.getImageData(0, 0, c.width, c.height);
            let nonWhite = 0;
            const pixels = img.data;
            for (let i = 0; i < pixels.length && i < 40000; i += 4) {
                if (pixels[i] < 250 || pixels[i+1] < 250 || pixels[i+2] < 250) {
                    nonWhite++;
                    if (nonWhite > 50) return false;
                }
            }
            return nonWhite <= 50;
        });
        return isWhite;
    } catch {
        return false;
    }
}

// --- Main ---
async function run() {
    console.log('\n' + '='.repeat(60));
    console.log('  FIAT vs CRYPTO — Automated Soak Test v7.33.0');
    console.log(`  Duration: ${DURATION_MIN} min | Snapshot interval: 15 min`);
    console.log('='.repeat(60) + '\n');

    // Start server
    const server = await startServer();

    // Launch browser
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 480, height: 800 },
        deviceScaleFactor: 2
    });
    const page = await context.newPage();

    // Collect errors
    const consoleErrors = [];
    let pageErrorCount = 0;
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
        pageErrorCount++;
        log('PAGE_ERROR', err.message);
    });

    // Load game
    log('LOAD', 'Navigating to game...');
    await page.goto(`http://127.0.0.1:${SERVER_PORT}`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);

    // Verify game loaded
    const gameLoaded = await page.evaluate(() => !!window.Game);
    if (!gameLoaded) {
        log('FATAL', 'window.Game not found — aborting');
        await browser.close();
        server.close();
        process.exit(1);
    }
    log('LOAD', 'Game loaded successfully');

    // Take baseline snapshot
    await snapshot(page, 'baseline');

    // --- Navigate through menus to start Arcade Mode ---
    log('MENU', 'Navigating to Arcade mode...');

    // Step 1: Skip VIDEO state (press Space)
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    // Step 2: Advance through intro text
    for (let i = 0; i < 3; i++) {
        await page.keyboard.press('Space');
        await page.waitForTimeout(400);
    }

    // Step 3: Select Arcade mode (Enter)
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);

    // Step 4: More clicks to confirm arcade selection
    for (let i = 0; i < 6; i++) {
        await page.mouse.click(240, 400);
        await page.waitForTimeout(200);
    }

    // Step 5: Start the game
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Check what state we're in
    let currentState = await page.evaluate(() => window.Game?.GameState?.current || null);
    log('STATE', `After menu nav: ${currentState}`);

    // If still not in PLAY, try more keyboard navigation
    if (currentState !== 'PLAY') {
        log('MENU', 'Still not in PLAY state — trying alternative navigation');
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(300);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1500);
        currentState = await page.evaluate(() => window.Game?.GameState?.current || null);
        log('STATE', `After alt nav: ${currentState}`);
    }

    // If still not playing, try clicking canvas repeatedly
    if (currentState !== 'PLAY') {
        log('MENU', 'Trying canvas click approach...');
        for (let i = 0; i < 10; i++) {
            await page.mouse.click(240, 650);
            await page.waitForTimeout(300);
        }
        await page.waitForTimeout(1000);
        currentState = await page.evaluate(() => window.Game?.GameState?.current || null);
        log('STATE', `After clicks: ${currentState}`);
    }

    // Take snapshot after menu nav
    await snapshot(page, 'menu-done');

    if (currentState !== 'PLAY') {
        log('WARN', `Could not reach PLAY state (current: ${currentState}). Will try to auto-play anyway.`);
        // Try forcing the game state
        await page.evaluate(() => {
            if (window.Game?.GameState?.transition) {
                window.Game.GameState.transition('PLAY');
            }
        });
        await page.waitForTimeout(1000);
    }

    // --- Auto-play loop ---
    log('PLAY', 'Starting auto-play loop');

    const startTime = Date.now();
    const endTime = startTime + DURATION_MIN * 60 * 1000;
    let lastSnapshotTime = startTime;
    let lastHealthCheckTime = startTime;
    let gameOverCount = 0;
    let whiteScreenDetected = false;
    let crashDetected = false;
    let lastActiveState = 'PLAY';

    // Auto-play keyboard: hold right + shoot, with periodic variation
    async function autoPlay() {
        // Move right
        await page.keyboard.down('ArrowRight');
        await page.keyboard.down('z');
        await page.waitForTimeout(2000);
        await page.keyboard.up('ArrowRight');
        await page.keyboard.up('z');

        // Move left
        await page.keyboard.down('ArrowLeft');
        await page.keyboard.down('z');
        await page.waitForTimeout(1500);
        await page.keyboard.up('ArrowLeft');
        await page.keyboard.up('z');

        // Move down
        await page.keyboard.down('ArrowDown');
        await page.keyboard.down('z');
        await page.waitForTimeout(1000);
        await page.keyboard.up('ArrowDown');
        await page.keyboard.up('z');

        // Shoot only
        await page.keyboard.down('z');
        await page.waitForTimeout(2000);
        await page.keyboard.up('z');
    }

    while (Date.now() < endTime) {
        // Check if game crashed
        if (pageErrorCount > 3 && !crashDetected) {
            crashDetected = true;
            log('CRASH', 'Multiple page errors detected');
        }

        // Check for white screen
        const whiteNow = await checkWhiteScreen(page);
        if (whiteNow && !whiteScreenDetected) {
            whiteScreenDetected = true;
            log('WHITE_SCREEN', 'WHITE SCREEN DETECTED — canvas is blank');
            RESULTS.push({ label: 'white-screen', ts: Date.now(), crash: false, whiteScreen: true });
        }

        // Check current game state
        currentState = await page.evaluate(() => window.Game?.GameState?.current || null);

        // If game over, restart
        if (currentState === 'GAMEOVER') {
            gameOverCount++;
            log('GAMEOVER', `Game over #${gameOverCount} detected — restarting`);
            await snapshot(page, `gameover-${gameOverCount}`);

            // Press Enter/Space to go back to menu
            await page.keyboard.press('Enter');
            await page.waitForTimeout(1000);
            await page.keyboard.press('Space');
            await page.waitForTimeout(1000);

            // Navigate to Arcade again
            await page.keyboard.press('Space');
            await page.waitForTimeout(500);
            await page.keyboard.press('Enter');
            await page.waitForTimeout(1500);

            // Try to start
            await page.keyboard.press('Enter');
            await page.waitForTimeout(1000);

            // Try clicking
            for (let i = 0; i < 4; i++) {
                await page.mouse.click(240, 400);
                await page.waitForTimeout(200);
            }
            await page.waitForTimeout(1000);

            const newState = await page.evaluate(() => window.Game?.GameState?.current || null);
            log('RESTART', `New state after restart: ${newState}`);

            await snapshot(page, `restart-${gameOverCount}`);
            continue;
        }

        // Record if we're in a non-PLAY state
        if (currentState !== lastActiveState) {
            log('STATE', `State change: ${lastActiveState} → ${currentState}`);
            lastActiveState = currentState;
        }

        // Periodic snapshot (every 15 min)
        if (Date.now() - lastSnapshotTime >= SNAPSHOT_INTERVAL_MS) {
            const elapsed = Math.round((Date.now() - startTime) / 60000);
            await snapshot(page, `t${elapsed}min`);
            lastSnapshotTime = Date.now();
        }

        // Health check log every minute
        if (Date.now() - lastHealthCheckTime >= CHECK_INTERVAL_MS) {
            const elapsed = Math.round((Date.now() - startTime) / 60000);
            const heap = await page.evaluate(() => {
                const m = performance.memory;
                return m ? +(m.usedJSHeapSize / 1048576).toFixed(1) : null;
            });
            log('HEALTH', `t${elapsed}min | heap=${heap}MB | errors=${consoleErrors.length} | pageErrors=${pageErrorCount} | state=${currentState}`);
            lastHealthCheckTime = Date.now();
        }

        // Auto-play
        await autoPlay();
    }

    // --- Final snapshot ---
    await snapshot(page, 'final');
    log('DONE', 'Soak test duration reached');

    // --- Generate report ---
    const finalHeap = await page.evaluate(() => {
        const m = performance.memory;
        return m ? +(m.usedJSHeapSize / 1048576).toFixed(1) : null;
    });

    console.log('\n' + '='.repeat(60));
    console.log('  SOAK TEST REPORT — v7.33.0');
    console.log('='.repeat(60));
    console.log(`  Duration:     ${DURATION_MIN} min`);
    console.log(`  Game overs:   ${gameOverCount}`);
    console.log(`  Final heap:   ${finalHeap ?? 'N/A'} MB`);
    console.log(`  White screen: ${whiteScreenDetected ? '❌ DETECTED' : '✅ None'}`);
    console.log(`  Crashes:      ${crashDetected ? '❌ DETECTED' : '✅ None'}`);
    console.log(`  Page errors:  ${pageErrorCount}`);
    console.log(`  Console errs: ${consoleErrors.length}`);

    // Check for memory leak (heap growing >20% from first to last)
    const firstHeap = RESULTS.find(r => r.heapMB != null)?.heapMB ?? 0;
    const lastHeap = RESULTS.filter(r => r.heapMB != null).pop()?.heapMB ?? 0;
    const heapGrowth = lastHeap - firstHeap;
    const heapLeak = heapGrowth > 5; // >5MB growth suggests leak
    console.log(`  Heap growth:  ${heapGrowth > 0 ? '+' : ''}${heapGrowth.toFixed(1)} MB ${heapLeak ? '⚠️ WARNING' : '✅ OK'}`);

    // Print snapshot table
    console.log('\n  --- Snapshots ---');
    for (const r of RESULTS) {
        if (r.label === 'white-screen') {
            console.log(`  ${r.label}: WHITE SCREEN`);
            continue;
        }
        const h = r.heapMB != null ? `${r.heapMB}MB` : 'N/A';
        const f = r.fps ?? '--';
        const e = r.entities ?? 0;
        console.log(`  ${r.label.padEnd(18)} heap=${h.padEnd(8)} fps=${String(f).padEnd(4)} entities=${String(e).padEnd(4)} wave=${r.wave ?? '--'} state=${r.state ?? '--'}`);
    }

    const passed = !whiteScreenDetected && !crashDetected && !heapLeak;
    console.log(`\n  VERDICT: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log('='.repeat(60) + '\n');

    await browser.close();
    server.close();
    process.exit(passed ? 0 : 1);
}

run().catch(err => {
    console.error('[FATAL] Soak test crashed:', err);
    process.exit(1);
});
