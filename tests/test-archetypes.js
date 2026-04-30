/**
 * v7.19 — Archetype agents (HFT_SWARMER / TAX_AUDITOR / QE_NODE)
 *
 * Verifies the data-driven archetype config, the Enemy constructor branch,
 * the per-archetype update dispatch, the writ→debuff bullet flow, and the
 * WaveManager._spawnArchetypesOnce gating logic.
 */
(function () {
    const G = window.Game;

    // ── Suite 1 — Config structure ──────────────────────────────────────────
    _testRunner.suite('Archetypes — Config', (assert) => {
        const Balance = G.Balance;

        // Arrange (config presence)
        const cfg = Balance && Balance.ARCHETYPES;
        assert(cfg, 'Balance.ARCHETYPES exists');
        assert(cfg && cfg.HFT && cfg.AUDITOR && cfg.PRINTER, 'ARCHETYPES has HFT, AUDITOR, PRINTER blocks');

        // HFT
        assert(typeof cfg.HFT.GROUP_MIN === 'number' && cfg.HFT.GROUP_MIN >= 1, 'HFT.GROUP_MIN is positive');
        assert(cfg.HFT.GROUP_MAX >= cfg.HFT.GROUP_MIN, 'HFT.GROUP_MAX >= GROUP_MIN');
        assert(typeof cfg.HFT.ZIGZAG_FREQ_HZ === 'number', 'HFT.ZIGZAG_FREQ_HZ is number');
        assert(typeof cfg.HFT.FIRE_BURST_COUNT === 'number', 'HFT.FIRE_BURST_COUNT is number');

        // AUDITOR
        assert(cfg.AUDITOR.DEBUFF && cfg.AUDITOR.DEBUFF.type === 'FIRE_RATE', 'AUDITOR.DEBUFF.type === FIRE_RATE');
        assert(cfg.AUDITOR.DEBUFF.mult > 1, 'AUDITOR.DEBUFF.mult > 1 (slows fire)');
        assert(cfg.AUDITOR.DEBUFF.duration > 0, 'AUDITOR.DEBUFF.duration > 0');
        assert(cfg.AUDITOR.WRIT_SPEED < 200, 'AUDITOR.WRIT_SPEED is slow (< 200)');

        // PRINTER
        assert(cfg.PRINTER.MINIONS_PER_PRINT >= 1, 'PRINTER.MINIONS_PER_PRINT >= 1');
        assert(cfg.PRINTER.PRINT_INTERVAL > 0, 'PRINTER.PRINT_INTERVAL > 0');
        assert(cfg.PRINTER.MIN_CYCLE >= 2, 'PRINTER gated to cycle 2+');
    });

    // ── Suite 2 — AGENT_TYPES registry ──────────────────────────────────────
    _testRunner.suite('Archetypes — AGENT_TYPES', (assert) => {
        const Balance = G.Balance;
        const types = G.AGENT_TYPES;
        assert(Array.isArray(types) && types.length === 3, 'AGENT_TYPES has 3 entries');

        const archetypes = types.map(t => t.archetype).sort();
        assert(archetypes[0] === 'AUDITOR' && archetypes[1] === 'HFT' && archetypes[2] === 'PRINTER',
            'AGENT_TYPES covers HFT, AUDITOR, PRINTER');

        // Each entry has the canonical shape of a fiat type plus archetype field
        for (const t of types) {
            assert(typeof t.s === 'string' && t.s.length > 0, `${t.archetype} has glyph`);
            assert(typeof t.hp === 'number', `${t.archetype} has numeric hp`);
            assert(typeof t.val === 'number', `${t.archetype} has numeric val`);
        }

        // isAgentSymbol helper recognizes all three glyphs
        assert(Balance.isAgentSymbol('⚡'), 'isAgentSymbol(⚡) true');
        assert(Balance.isAgentSymbol('⚖'), 'isAgentSymbol(⚖) true');
        assert(Balance.isAgentSymbol('💸'), 'isAgentSymbol(💸) true');
        assert(!Balance.isAgentSymbol('$'), 'isAgentSymbol($) false (dollar is fiat)');
        assert(!Balance.isAgentSymbol('€'), 'isAgentSymbol(€) false (euro is fiat)');

        // AGENT_TYPES symbols are NOT in any TIER bucket → safe to exclude from currency-grid pool
        const allFiatTiers = []
            .concat(Balance.TIERS.WEAK)
            .concat(Balance.TIERS.MEDIUM)
            .concat(Balance.TIERS.STRONG);
        for (const t of types) {
            assert(allFiatTiers.indexOf(t.s) === -1, `${t.s} not in any fiat tier`);
        }

        // getCurrencyBySymbol does NOT return AGENT_TYPES entries
        assert(!Balance.getCurrencyBySymbol('⚡'), 'getCurrencyBySymbol(⚡) returns null/undefined');
    });

    // ── Suite 3 — Enemy construction with archetype ─────────────────────────
    _testRunner.suite('Archetypes — Enemy construction', (assert) => {
        if (!G.Enemy) { assert(false, 'Enemy class not loaded — skipping'); return; }

        const Balance = G.Balance;
        const types = G.AGENT_TYPES;
        const tHft = types.find(t => t.archetype === 'HFT');
        const tAud = types.find(t => t.archetype === 'AUDITOR');
        const tPrn = types.find(t => t.archetype === 'PRINTER');

        // Arrange — game height for hover-Y math
        G._gameHeight = 800;
        G._gameWidth = 400;

        // Act — construct one of each
        const eHft = new G.Enemy(120, 100, tHft);
        const eAud = new G.Enemy(200, -40, tAud);
        const ePrn = new G.Enemy(200, -50, tPrn);

        // Assert — common archetype invariants
        assert(eHft.archetype === 'HFT', 'HFT.archetype === HFT');
        assert(eAud.archetype === 'AUDITOR', 'AUDITOR.archetype === AUDITOR');
        assert(ePrn.archetype === 'PRINTER', 'PRINTER.archetype === PRINTER');

        for (const e of [eHft, eAud, ePrn]) {
            assert(e.hasSettled === true, `${e.archetype} hasSettled=true at construction`);
            assert(e.isEntering === false, `${e.archetype} isEntering=false at construction`);
            assert(e._hoverEnabled === false, `${e.archetype} HOVER_GATE auto-attivation disabled`);
            assert(e._fireSuppressed === true, `${e.archetype} _fireSuppressed=true (Conductor skip)`);
        }

        // Archetype-specific state
        assert(typeof eHft._swarmerBaseX === 'number', 'HFT has _swarmerBaseX initialized');
        assert(eHft._swarmerEntryDone === false, 'HFT entry not yet done');
        assert(eAud._auditorPhase === 'APPROACH', 'AUDITOR starts in APPROACH phase');
        assert(typeof eAud._auditorHoverY === 'number' && eAud._auditorHoverY > 0, 'AUDITOR has hover Y target');
        assert(ePrn._printerEntryDone === false, 'PRINTER entry not yet done');
        assert(typeof ePrn._printerTimer === 'number' && ePrn._printerTimer > 0, 'PRINTER timer initialized');
    });

    // ── Suite 4 — HFT zigzag oscillation ────────────────────────────────────
    _testRunner.suite('Archetypes — HFT zigzag', (assert) => {
        if (!G.Enemy) { assert(false, 'Enemy class not loaded — skipping'); return; }

        // Arrange
        G._gameHeight = 800;
        G._gameWidth = 400;
        const tHft = G.AGENT_TYPES.find(t => t.archetype === 'HFT');
        const baseX = 200;
        const e = new G.Enemy(baseX, 100, tHft);
        e._swarmerBaseX = baseX;
        e._swarmerEntryDone = true; // skip lateral entry — go straight to zigzag

        // Act — simulate 1 full second at 60fps
        const dt = 1 / 60;
        let minX = e.x, maxX = e.x;
        for (let i = 0; i < 60; i++) {
            e.update(dt, undefined, null, 0, 0, 200, 600);
            if (e.x < minX) minX = e.x;
            if (e.x > maxX) maxX = e.x;
        }

        // Assert — must oscillate over a meaningful range
        const cfg = G.Balance.ARCHETYPES.HFT;
        const range = maxX - minX;
        assert(range > cfg.ZIGZAG_AMPLITUDE * 1.5,
            `HFT zigzag range=${range.toFixed(1)} > ${(cfg.ZIGZAG_AMPLITUDE * 1.5).toFixed(1)}`);

        // Y must descend monotonically
        const yStart = 100;
        assert(e.y > yStart, `HFT descended (y went ${yStart} → ${e.y.toFixed(1)})`);
    });

    // ── Suite 5 — Auditor phase transitions ─────────────────────────────────
    _testRunner.suite('Archetypes — Auditor phases', (assert) => {
        if (!G.Enemy) { assert(false, 'Enemy class not loaded — skipping'); return; }

        // Arrange
        G._gameHeight = 800;
        G._gameWidth = 400;
        const tAud = G.AGENT_TYPES.find(t => t.archetype === 'AUDITOR');
        const e = new G.Enemy(200, -40, tAud);
        const cfg = G.Balance.ARCHETYPES.AUDITOR;
        const expectedHoverY = 800 * cfg.HOVER_Y_RATIO;

        // Act 1 — descend until reaching hover
        const dt = 0.05;
        let safety = 500;
        while (e._auditorPhase === 'APPROACH' && safety-- > 0) {
            e.update(dt, undefined, null, 0, 0, 200, 600);
        }

        // Assert — phase switched to DWELL at hoverY
        assert(e._auditorPhase === 'DWELL', `AUDITOR reached DWELL (phase=${e._auditorPhase})`);
        assert(Math.abs(e.y - expectedHoverY) < cfg.DESCEND_SPEED * dt + 1,
            `AUDITOR y settled near hoverY (${e.y.toFixed(1)} vs ${expectedHoverY})`);

        // Act 2 — drop HP below flee threshold and tick once
        e.hp = e.maxHp * (cfg.FLEE_HP_THRESHOLD * 0.5);
        e._auditorWritTimer = 999; // prevent firing during tick
        e.update(dt, undefined, null, 0, 0, 200, 600);

        // Assert — switched to FLEE
        assert(e._auditorPhase === 'FLEE', `AUDITOR fled after HP drop (phase=${e._auditorPhase})`);
        assert(e._auditorFleeDir === -1 || e._auditorFleeDir === 1, 'AUDITOR has flee direction');
    });

    // ── Suite 6 — Printer prints minions ────────────────────────────────────
    _testRunner.suite('Archetypes — Printer minions', (assert) => {
        if (!G.Enemy) { assert(false, 'Enemy class not loaded — skipping'); return; }

        // Arrange
        G._gameHeight = 800;
        G._gameWidth = 400;
        const tPrn = G.AGENT_TYPES.find(t => t.archetype === 'PRINTER');

        // Stash and replace Game.enemies for isolated test (cleanup at end).
        const savedEnemies = G.enemies;
        G.enemies = [];
        const savedAudio = G.Audio;
        G.Audio = null; // skip audio side effect

        const e = new G.Enemy(200, -50, tPrn);
        e._printerEntryDone = true; // skip descent
        e.y = 200;
        e._printerTimer = 0; // force print on next update

        // Act — single tick triggers print
        const cfg = G.Balance.ARCHETYPES.PRINTER;
        e.update(0.01, undefined, null, 0, 0, 200, 600);

        // Assert — minions appended to G.enemies
        assert(G.enemies.length === cfg.MINIONS_PER_PRINT,
            `PRINTER spawned ${G.enemies.length}/${cfg.MINIONS_PER_PRINT} minions`);
        if (G.enemies.length > 0) {
            const m = G.enemies[0];
            assert(m.isMinion === true, 'Spawned minion has isMinion=true');
            assert(m.hp <= G.MINION_TYPE.hp, 'Spawned minion hp scaled down');
            assert(m.hasSettled === true, 'Spawned minion is auto-settled');
        }
        assert(Math.abs(e._printerTimer - cfg.PRINT_INTERVAL) < 0.05,
            'PRINTER timer reset to PRINT_INTERVAL');

        // Cleanup
        G.enemies = savedEnemies;
        G.Audio = savedAudio;
    });

    // ── Suite 7 — Auditor writ firing ───────────────────────────────────────
    _testRunner.suite('Archetypes — Auditor writ firing', (assert) => {
        if (!G.Enemy) { assert(false, 'Enemy class not loaded — skipping'); return; }
        if (!G.Events) { assert(false, 'EventBus not loaded — skipping'); return; }

        // Arrange — capture emitted bullets
        const captured = [];
        const handler = (data) => { if (data && data.bullets) captured.push(...data.bullets); };
        G.Events.on('system:harmonic-bullets', handler);

        const tAud = G.AGENT_TYPES.find(t => t.archetype === 'AUDITOR');
        G._gameWidth = 400;
        G._gameHeight = 800;
        const e = new G.Enemy(200, 160, tAud);
        e._auditorPhase = 'DWELL';
        e._auditorWritTimer = 0; // force fire on next tick

        // Stash audio
        const savedAudio = G.Audio;
        G.Audio = null;

        // Act
        const cfg = G.Balance.ARCHETYPES.AUDITOR;
        e.update(0.01, undefined, null, 0, 0, 200, 600);

        // Assert — writ emitted with debuff payload
        assert(captured.length >= 1, `Writ event emitted (${captured.length} bullet(s))`);
        if (captured.length > 0) {
            const w = captured[captured.length - 1];
            assert(w.isWrit === true, 'Emitted bullet has isWrit=true');
            assert(w.debuff && w.debuff.type === 'FIRE_RATE', 'Writ debuff.type === FIRE_RATE');
            assert(w.debuff.mult > 1, 'Writ debuff.mult > 1');
            const speed = Math.hypot(w.vx, w.vy);
            assert(Math.abs(speed - cfg.WRIT_SPEED) < 1, `Writ speed ≈ ${cfg.WRIT_SPEED} (got ${speed.toFixed(1)})`);
        }

        // Cleanup
        G.Audio = savedAudio;
    });

    // ── Suite 8 — WaveManager._spawnArchetypesOnce gating ───────────────────
    _testRunner.suite('Archetypes — Wave gating', (assert) => {
        if (!G.Enemy) { assert(false, 'Enemy class not loaded — skipping'); return; }
        if (!G.WaveManager) { assert(false, 'WaveManager not loaded — skipping'); return; }

        // Arrange
        const wm = G.WaveManager;
        G._gameWidth = 400;
        G._gameHeight = 800;
        const savedEnemies = G.enemies;
        G.enemies = []; // empty — full budget

        // Act — C1W1 should NOT spawn HFT (gated W2+) and NOT PRINTER (gated C2+)
        const aliveBefore = (G.enemies || []).length;
        const a1 = wm._spawnArchetypesOnce(1, 1, 400);
        const printersAtC1W1 = a1.filter(e => e.archetype === 'PRINTER').length;
        assert(printersAtC1W1 === 0, 'C1W1: zero printers (gated to C2+)');

        // Act — C2W1 should spawn exactly 1 PRINTER
        G.enemies = [];
        // Stub Math.random to make HFT/AUDITOR roll deterministically not spawn
        const origRandom = Math.random;
        Math.random = () => 0.99; // above all spawn-chance thresholds (0.6, 0.8) → no HFT, no AUDITOR
        const a2 = wm._spawnArchetypesOnce(2, 1, 400);
        Math.random = origRandom;
        const printersAtC2W1 = a2.filter(e => e.archetype === 'PRINTER').length;
        assert(printersAtC2W1 === 1, `C2W1 with no-spawn RNG → exactly 1 PRINTER (got ${printersAtC2W1})`);

        // Act — global budget cap: pre-fill enemies with archetype agents
        G.enemies = [];
        for (let i = 0; i < (G.Balance.ARCHETYPES.MAX_CONCURRENT_AGENTS || 10); i++) {
            G.enemies.push({ active: true, archetype: 'HFT' });
        }
        const a3 = wm._spawnArchetypesOnce(3, 1, 400);
        assert(a3.length === 0, 'Global concurrent cap blocks new spawns');

        // Cleanup
        G.enemies = savedEnemies;
    });

    // ── Suite 9 — Player debuff system ──────────────────────────────────────
    _testRunner.suite('Archetypes — Player debuff', (assert) => {
        if (!G.Player) { assert(false, 'Player class not loaded — skipping'); return; }

        // Arrange — minimal Player instance
        const p = new G.Player(400, 800);
        p.configure('BTC');

        // Act 1 — apply a FIRE_RATE debuff
        const baseMult = p.getDebuffMult('FIRE_RATE');
        assert(baseMult === 1, `No debuff → mult === 1 (got ${baseMult})`);

        p.applyDebuff({ type: 'FIRE_RATE', mult: 1.43, duration: 3.0 });
        const activeMult = p.getDebuffMult('FIRE_RATE');
        assert(Math.abs(activeMult - 1.43) < 0.001, `Active debuff → mult ≈ 1.43 (got ${activeMult})`);

        // Act 2 — tick past expiration
        p.updateDebuffs(3.5);
        const expiredMult = p.getDebuffMult('FIRE_RATE');
        assert(expiredMult === 1, `Expired debuff → mult back to 1 (got ${expiredMult})`);
        assert(p._debuffs.length === 0, 'Expired debuff pruned from list');

        // Act 3 — invalid debuffs are ignored
        p.applyDebuff(null);
        p.applyDebuff({ type: 'FIRE_RATE', mult: 1.5, duration: 0 });
        p.applyDebuff({ duration: 1 }); // no type
        assert(p._debuffs.length === 0, 'Invalid debuffs are dropped (no type / no duration)');
    });
})();
