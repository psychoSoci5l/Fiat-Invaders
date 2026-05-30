// V8 Campaign End-to-End Smoke Test
// Verifica programmaticamente L1→L2→L3→Victory usando le funzioni di debug.

const { chromium } = require('playwright');

const BASE = 'http://localhost:8000';
const LOG = [];

function report(stage, check, pass, detail = '') {
    const icon = pass ? '✅' : '❌';
    const line = `${icon} [${stage}] ${check}${detail ? ' — ' + detail : ''}`;
    LOG.push(line);
    console.log(line);
    return pass;
}

let failed = false;
function assert(stage, check, condition, detail) {
    const ok = report(stage, check, !!condition, detail);
    if (!ok) failed = true;
    return ok;
}

(async () => {
    console.log('\n=== V8 Campaign E2E Smoke Test ===\n');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 480, height: 800 },
        deviceScaleFactor: 2
    });
    const page = await context.newPage();

    // Capture errors
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
    });

    // 1. Load game
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    assert('LOAD', 'Page loads', await page.evaluate(() => !!window.Game), '');

    // 2. Verify V8 structures
    const v8Check = await page.evaluate(() => {
        const G = window.Game;
        const checks = {
            v8Enabled: !!(G.Balance && G.Balance.V8_MODE && G.Balance.V8_MODE.ENABLED),
            levelScriptExists: !!G.LevelScript,
            threeLevels: G.LevelScript && G.LevelScript.LEVELS && G.LevelScript.LEVELS.length === 3,
            densityRamp: !!(G.Balance && G.Balance.V8_MODE && G.Balance.V8_MODE.SPAWN_DENSITY_RAMP),
            debugSystem: !!G.DebugSystem,
            skipToBossFn: !!(G.DebugSystem && typeof G.DebugSystem.v8SkipToBoss === 'function'),
            killBossFn: !!(G.DebugSystem && typeof G.DebugSystem.v8KillBoss === 'function'),
            continueFn: typeof window.advanceToNextV8Level === 'function',
            startGameFn: typeof window.startGame === 'function',
            stateMachine: !!(G.GameStateMachine && typeof G.GameStateMachine.transition === 'function'),
        };
        checks.currentState = G.GameStateMachine ? G.GameStateMachine.getState() : 'unknown';
        checks.version = G.VERSION || 'unknown';
        return checks;
    });

    assert('V8', 'V8_MODE.ENABLED', v8Check.v8Enabled, '');
    assert('V8', 'LevelScript exists', v8Check.levelScriptExists, '');
    assert('V8', '3 levels defined', v8Check.threeLevels, '');
    assert('V8', 'Spawn density ramp config', v8Check.densityRamp, '');
    assert('V8', 'DebugSystem exposed', v8Check.debugSystem, '');
    assert('V8', 'v8SkipToBoss() available', v8Check.skipToBossFn, '');
    assert('V8', 'v8KillBoss() available', v8Check.killBossFn, '');
    assert('V8', 'advanceToNextV8Level() global', v8Check.continueFn, '');
    assert('V8', 'Game version exposed', v8Check.version !== 'unknown', v8Check.version);

    // 3. Start a V8 campaign game programmatically
    // We force the game into PLAY state bypassing UI clicks by calling startGame
    // and ensuring V8 mode is active.
    await page.evaluate(() => {
        const G = window.Game;
        // Ensure campaign mode so V8 path is taken
        if (G.CampaignState) G.CampaignState.setEnabled(true);
        // Start game directly if available
        if (typeof window.startGame === 'function') window.startGame();
    });
    await page.waitForTimeout(1500);

    let playState = await page.evaluate(() => {
        const G = window.Game;
        return {
            state: G.GameStateMachine ? G.GameStateMachine.getState() : 'unknown',
            levelName: G.LevelScript && G.LevelScript.current ? G.LevelScript.current.name : 'none',
            levelIdx: G.LevelScript && typeof G.LevelScript.levelIndex === 'number' ? G.LevelScript.levelIndex : -1,
        };
    });
    assert('PLAY', 'Game in PLAY state', playState.state === 'PLAY', playState.state);
    assert('PLAY', 'LevelScript active', playState.levelIdx >= 0, `idx=${playState.levelIdx}`);
    assert('PLAY', 'L1 (FED) loaded', playState.levelName && playState.levelName.includes('FED'), playState.levelName);

    // 4. Fast-forward each level: skip to boss → kill boss → continue
    const levels = ['L1 FED', 'L2 BCE', 'L3 BOJ'];
    for (let i = 0; i < levels.length; i++) {
        const lvl = levels[i];

        // Skip to boss
        await page.evaluate(() => {
            if (window.Game.DebugSystem) window.Game.DebugSystem.v8SkipToBoss();
        });
        await page.waitForTimeout(800);

        // Verify boss is present (or at least we're near boss time)
        const bossCheck = await page.evaluate(() => {
            const ls = window.Game.LevelScript;
            return {
                elapsed: ls ? ls._elapsed : -1,
                bossAt: ls ? ls.BOSS_AT_S : -1,
                state: window.Game.GameStateMachine ? window.Game.GameStateMachine.getState() : 'unknown',
            };
        });
        assert(lvl, 'Near boss time', bossCheck.elapsed >= bossCheck.bossAt - 2,
            `elapsed=${bossCheck.elapsed}, bossAt=${bossCheck.bossAt}`);

        // Kill boss
        await page.evaluate(() => {
            if (window.Game.DebugSystem) window.Game.DebugSystem.v8KillBoss();
        });
        await page.waitForTimeout(1500);

        // After boss kill, game should be in intermission or victory
        const afterKill = await page.evaluate(() => {
            const G = window.Game;
            return {
                state: G.GameStateMachine ? G.GameStateMachine.getState() : 'unknown',
                levelIdx: G.LevelScript ? G.LevelScript.levelIndex : -1,
                isComplete: !!(G.LevelScript && !G.LevelScript.hasNextLevel()),
            };
        });

        if (i < levels.length - 1) {
            // Should transition to next level via advanceToNextV8Level
            assert(lvl, 'State valid after boss', afterKill.state === 'INTERMISSION' || afterKill.state === 'PLAY', afterKill.state);
            await page.evaluate(() => {
                if (typeof window.advanceToNextV8Level === 'function') window.advanceToNextV8Level();
            });
            await page.waitForTimeout(1500);

            const nextLevel = await page.evaluate(() => {
                const G = window.Game;
                return {
                    state: G.GameStateMachine ? G.GameStateMachine.getState() : 'unknown',
                    levelIdx: G.LevelScript ? G.LevelScript.levelIndex : -1,
                    name: G.LevelScript && G.LevelScript.current ? G.LevelScript.current.name : 'none',
                };
            });
            assert(lvl, 'Advanced to next level', nextLevel.levelIdx === i + 1, `idx=${nextLevel.levelIdx}`);
            assert(lvl, 'State PLAY after advance', nextLevel.state === 'PLAY', nextLevel.state);
        } else {
            // Last level should end in victory
            assert(lvl, 'Campaign complete flag', afterKill.isComplete, `levelIdx=${afterKill.levelIdx}`);
            assert(lvl, 'Victory state reachable', afterKill.state === 'INTERMISSION' || afterKill.state === 'VICTORY' || afterKill.state === 'GAMEOVER', afterKill.state);
        }
    }

    // 5. Verify no console/page errors during run
    assert('ERRORS', 'No page errors', errors.length === 0, errors.join('; '));

    await browser.close();

    console.log('\n=== V8 E2E Summary ===');
    console.log(LOG.filter(l => l.includes('❌')).length === 0
        ? '✅ ALL CHECKS PASSED'
        : `❌ ${LOG.filter(l => l.includes('❌')).length} CHECK(S) FAILED`);
    process.exit(failed ? 1 : 0);
})();
