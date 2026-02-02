/**
 * v2.11.0 + v2.11.1 Verification Test Suite
 *
 * Run in browser console: copy-paste this entire file
 * Or load via: <script src="tests/v2.11-verification.js"></script>
 */

(function() {
    const G = window.Game;
    const results = [];
    let passed = 0;
    let failed = 0;

    function log(msg, type = 'info') {
        const colors = {
            pass: 'color: #2ecc71; font-weight: bold',
            fail: 'color: #e74c3c; font-weight: bold',
            info: 'color: #3498db',
            header: 'color: #f39c12; font-weight: bold; font-size: 14px'
        };
        console.log(`%c${msg}`, colors[type] || colors.info);
    }

    function test(name, fn) {
        try {
            const result = fn();
            if (result === true) {
                log(`  ✓ ${name}`, 'pass');
                passed++;
                results.push({ name, status: 'PASS' });
            } else {
                log(`  ✗ ${name}: ${result}`, 'fail');
                failed++;
                results.push({ name, status: 'FAIL', reason: result });
            }
        } catch (e) {
            log(`  ✗ ${name}: Exception - ${e.message}`, 'fail');
            failed++;
            results.push({ name, status: 'ERROR', reason: e.message });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST SUITE
    // ═══════════════════════════════════════════════════════════════

    log('\n═══════════════════════════════════════════════════════', 'header');
    log('  FIAT vs CRYPTO v2.11.x Verification Suite', 'header');
    log('═══════════════════════════════════════════════════════\n', 'header');

    // --- TEST GROUP 1: Bullet.js Division Safety ---
    log('\n[1] Bullet.js - Division by Zero Guards', 'header');

    test('Bullet class exists', () => {
        return G.Bullet ? true : 'Game.Bullet not found';
    });

    test('Homing bullet with dist=0 does not produce NaN', () => {
        // Create a mock bullet with homing enabled
        const bullet = new G.Bullet(100, 100, 0, -200, '#fff', 5, 10, false);
        bullet.homing = true;
        bullet.homingSpeed = 3;

        // Mock enemy at SAME position (dist = 0)
        const enemies = [{ x: 100, y: 100, markedForDeletion: false }];

        // Update should not produce NaN
        bullet.update(0.016, enemies, null);

        const hasNaN = isNaN(bullet.vx) || isNaN(bullet.vy);
        return hasNaN ? 'vx or vy is NaN after dist=0 update' : true;
    });

    test('Homing bullet with dist=0.5 does not produce NaN', () => {
        const bullet = new G.Bullet(100, 100, 0, -200, '#fff', 5, 10, false);
        bullet.homing = true;
        bullet.homingSpeed = 3;

        // Enemy very close (dist < 1)
        const enemies = [{ x: 100.3, y: 100.4, markedForDeletion: false }];
        bullet.update(0.016, enemies, null);

        const hasNaN = isNaN(bullet.vx) || isNaN(bullet.vy);
        return hasNaN ? 'vx or vy is NaN after dist<1 update' : true;
    });

    test('Speed normalization with zero velocity', () => {
        const bullet = new G.Bullet(100, 100, 0, 0, '#fff', 5, 10, false);
        bullet.homing = true;
        bullet.homingSpeed = 3;
        bullet.vx = 0;
        bullet.vy = 0;

        // Enemy ahead
        const enemies = [{ x: 100, y: 50, markedForDeletion: false }];
        bullet.update(0.016, enemies, null);

        const hasNaN = isNaN(bullet.vx) || isNaN(bullet.vy);
        return hasNaN ? 'NaN after zero velocity normalization' : true;
    });

    // --- TEST GROUP 2: CampaignState ---
    log('\n[2] CampaignState - Campaign Reset Logic', 'header');

    test('CampaignState exists', () => {
        return G.CampaignState ? true : 'Game.CampaignState not found';
    });

    test('BOSS_ORDER has 3 bosses', () => {
        const order = G.CampaignState.BOSS_ORDER;
        if (!order) return 'BOSS_ORDER not found';
        if (order.length !== 3) return `Expected 3, got ${order.length}`;
        return true;
    });

    test('BOSS_ORDER is FED→BCE→BOJ', () => {
        const order = G.CampaignState.BOSS_ORDER;
        const expected = ['FEDERAL_RESERVE', 'BCE', 'BOJ'];
        for (let i = 0; i < 3; i++) {
            if (order[i] !== expected[i]) return `Index ${i}: expected ${expected[i]}, got ${order[i]}`;
        }
        return true;
    });

    test('resetCampaign() resets all bosses to not defeated', () => {
        // Save current state
        const savedBosses = JSON.stringify(G.CampaignState.bosses);

        // Mark all as defeated
        G.CampaignState.bosses.FEDERAL_RESERVE.defeated = true;
        G.CampaignState.bosses.BCE.defeated = true;
        G.CampaignState.bosses.BOJ.defeated = true;

        // Reset
        G.CampaignState.resetCampaign();

        // Check
        const fedDefeated = G.CampaignState.bosses.FEDERAL_RESERVE.defeated;
        const bceDefeated = G.CampaignState.bosses.BCE.defeated;
        const bojDefeated = G.CampaignState.bosses.BOJ.defeated;

        // Restore (don't save to localStorage)
        G.CampaignState.bosses = JSON.parse(savedBosses);

        if (fedDefeated) return 'FED still defeated after reset';
        if (bceDefeated) return 'BCE still defeated after reset';
        if (bojDefeated) return 'BOJ still defeated after reset';
        return true;
    });

    test('getNextBoss() returns FED when none defeated', () => {
        const savedBosses = JSON.stringify(G.CampaignState.bosses);

        G.CampaignState.bosses.FEDERAL_RESERVE.defeated = false;
        G.CampaignState.bosses.BCE.defeated = false;
        G.CampaignState.bosses.BOJ.defeated = false;

        const next = G.CampaignState.getNextBoss();
        G.CampaignState.bosses = JSON.parse(savedBosses);

        return next === 'FEDERAL_RESERVE' ? true : `Expected FEDERAL_RESERVE, got ${next}`;
    });

    test('getNextBoss() returns BCE when FED defeated', () => {
        const savedBosses = JSON.stringify(G.CampaignState.bosses);

        G.CampaignState.bosses.FEDERAL_RESERVE.defeated = true;
        G.CampaignState.bosses.BCE.defeated = false;
        G.CampaignState.bosses.BOJ.defeated = false;

        const next = G.CampaignState.getNextBoss();
        G.CampaignState.bosses = JSON.parse(savedBosses);

        return next === 'BCE' ? true : `Expected BCE, got ${next}`;
    });

    test('getNextBoss() returns BOJ when FED+BCE defeated', () => {
        const savedBosses = JSON.stringify(G.CampaignState.bosses);

        G.CampaignState.bosses.FEDERAL_RESERVE.defeated = true;
        G.CampaignState.bosses.BCE.defeated = true;
        G.CampaignState.bosses.BOJ.defeated = false;

        const next = G.CampaignState.getNextBoss();
        G.CampaignState.bosses = JSON.parse(savedBosses);

        return next === 'BOJ' ? true : `Expected BOJ, got ${next}`;
    });

    test('getNextBoss() returns null when all defeated', () => {
        const savedBosses = JSON.stringify(G.CampaignState.bosses);

        G.CampaignState.bosses.FEDERAL_RESERVE.defeated = true;
        G.CampaignState.bosses.BCE.defeated = true;
        G.CampaignState.bosses.BOJ.defeated = true;

        const next = G.CampaignState.getNextBoss();
        G.CampaignState.bosses = JSON.parse(savedBosses);

        return next === null ? true : `Expected null, got ${next}`;
    });

    test('isCampaignComplete() returns false when 1 boss defeated', () => {
        const savedBosses = JSON.stringify(G.CampaignState.bosses);

        G.CampaignState.bosses.FEDERAL_RESERVE.defeated = true;
        G.CampaignState.bosses.BCE.defeated = false;
        G.CampaignState.bosses.BOJ.defeated = false;

        const complete = G.CampaignState.isCampaignComplete();
        G.CampaignState.bosses = JSON.parse(savedBosses);

        return complete === false ? true : 'Campaign marked complete with only 1 boss defeated!';
    });

    test('isCampaignComplete() returns false when 2 bosses defeated', () => {
        const savedBosses = JSON.stringify(G.CampaignState.bosses);

        G.CampaignState.bosses.FEDERAL_RESERVE.defeated = true;
        G.CampaignState.bosses.BCE.defeated = true;
        G.CampaignState.bosses.BOJ.defeated = false;

        const complete = G.CampaignState.isCampaignComplete();
        G.CampaignState.bosses = JSON.parse(savedBosses);

        return complete === false ? true : 'Campaign marked complete with only 2 bosses defeated!';
    });

    test('isCampaignComplete() returns true only when ALL 3 defeated', () => {
        const savedBosses = JSON.stringify(G.CampaignState.bosses);

        G.CampaignState.bosses.FEDERAL_RESERVE.defeated = true;
        G.CampaignState.bosses.BCE.defeated = true;
        G.CampaignState.bosses.BOJ.defeated = true;

        const complete = G.CampaignState.isCampaignComplete();
        G.CampaignState.bosses = JSON.parse(savedBosses);

        return complete === true ? true : 'Campaign NOT complete even with all 3 defeated';
    });

    // --- TEST GROUP 3: ObjectPool Safety ---
    log('\n[3] ObjectPool - indexOf Safety', 'header');

    test('ObjectPool exists', () => {
        return G.ObjectPool ? true : 'Game.ObjectPool not found';
    });

    test('Bullet.Pool exists', () => {
        return G.Bullet.Pool ? true : 'Game.Bullet.Pool not found';
    });

    test('Pool release of non-existent object does not crash', () => {
        const fakeObj = { x: 0, y: 0, markedForDeletion: true };
        try {
            G.Bullet.Pool.release(fakeObj);
            G.Bullet.Pool.release(fakeObj); // Double release
            return true;
        } catch (e) {
            return `Crash on release: ${e.message}`;
        }
    });

    // --- TEST GROUP 4: Balance Config ---
    log('\n[4] Balance Config - Graze Settings', 'header');

    test('Balance object exists', () => {
        return G.Balance ? true : 'Game.Balance not found';
    });

    test('GRAZE config exists', () => {
        return G.Balance.GRAZE ? true : 'Balance.GRAZE not found';
    });

    test('GRAZE.DECAY_RATE is positive', () => {
        const rate = G.Balance.GRAZE?.DECAY_RATE;
        if (rate === undefined) return 'DECAY_RATE not found';
        return rate > 0 ? true : `DECAY_RATE should be positive, got ${rate}`;
    });

    // --- TEST GROUP 5: Global Functions ---
    log('\n[5] Global Functions - setGameMode', 'header');

    test('setGameMode function exists', () => {
        return typeof window.setGameMode === 'function' ? true : 'setGameMode not found';
    });

    test('setGameMode("campaign") enables campaign', () => {
        const savedEnabled = G.CampaignState.enabled;
        const savedBosses = JSON.stringify(G.CampaignState.bosses);

        window.setGameMode('campaign');
        const enabled = G.CampaignState.isEnabled();

        // Restore
        G.CampaignState.enabled = savedEnabled;
        G.CampaignState.bosses = JSON.parse(savedBosses);

        return enabled === true ? true : 'Campaign not enabled after setGameMode("campaign")';
    });

    test('setGameMode("arcade") disables campaign', () => {
        const savedEnabled = G.CampaignState.enabled;

        window.setGameMode('arcade');
        const enabled = G.CampaignState.isEnabled();

        G.CampaignState.enabled = savedEnabled;

        return enabled === false ? true : 'Campaign still enabled after setGameMode("arcade")';
    });

    // --- TEST GROUP 6: v2.11.1 Campaign Reset on Select ---
    log('\n[6] v2.11.1 - Campaign Auto-Reset', 'header');

    test('Selecting Campaign mode when complete triggers reset', () => {
        const savedEnabled = G.CampaignState.enabled;
        const savedBosses = JSON.stringify(G.CampaignState.bosses);

        // Set all bosses defeated
        G.CampaignState.bosses.FEDERAL_RESERVE.defeated = true;
        G.CampaignState.bosses.BCE.defeated = true;
        G.CampaignState.bosses.BOJ.defeated = true;

        // Switch to campaign mode - should trigger reset
        window.setGameMode('campaign');

        // Check if reset happened
        const fedDefeated = G.CampaignState.bosses.FEDERAL_RESERVE.defeated;
        const nextBoss = G.CampaignState.getNextBoss();

        // Restore
        G.CampaignState.enabled = savedEnabled;
        G.CampaignState.bosses = JSON.parse(savedBosses);

        if (fedDefeated) return 'FED still defeated - reset did not happen!';
        if (nextBoss !== 'FEDERAL_RESERVE') return `Next boss should be FED, got ${nextBoss}`;
        return true;
    });

    // ═══════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════

    log('\n═══════════════════════════════════════════════════════', 'header');
    log(`  RESULTS: ${passed} passed, ${failed} failed`, failed > 0 ? 'fail' : 'pass');
    log('═══════════════════════════════════════════════════════\n', 'header');

    if (failed > 0) {
        log('\nFailed tests:', 'fail');
        results.filter(r => r.status !== 'PASS').forEach(r => {
            log(`  - ${r.name}: ${r.reason}`, 'fail');
        });
    }

    // Return summary for programmatic use
    return {
        passed,
        failed,
        total: passed + failed,
        results,
        allPassed: failed === 0
    };
})();
