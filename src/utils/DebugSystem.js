window.Game = window.Game || {};

/**
 * DebugSystem - Toggleable debug logging and event tracking for development
 *
 * CONSOLE COMMANDS:
 *   Game.Debug.enableAll()       // Enable all logging
 *   Game.Debug.disableAll()      // Disable all logging
 *   Game.Debug.status()          // Show current settings
 *   Game.Debug.showOverlay()     // Show visual debug overlay
 *   Game.Debug.hideOverlay()     // Hide visual debug overlay
 *   Game.Debug.stats()           // Show event statistics
 *   Game.Debug.history()         // Show recent event history
 *   Game.Debug.resetStats()      // Reset all counters
 *
 * SHORTCUT: window.dbg (e.g., dbg.stats(), dbg.showOverlay())
 */
window.Game.Debug = {
    // Master switch - set to false for production
    ENABLED: true,

    // Visual overlay toggle
    OVERLAY_ENABLED: false,

    // Individual category toggles
    categories: {
        WAVE: true,      // WaveManager state transitions
        BOSS: true,      // Boss spawn, damage, defeat
        HORDE: true,     // Horde transitions
        MINIBOSS: true,  // Mini-boss triggers
        ENEMY: false,    // Enemy spawn/death (very verbose)
        BULLET: false,   // Bullet collisions (extremely verbose)
        PERK: false,     // Perk triggers
        DROP: false,     // Power-up drops
        INPUT: false,    // Input events
        AUDIO: false,    // Audio events
        STATE: true,     // Game state changes
        CONDUCTOR: false, // HarmonicConductor events
    },

    // ========== EVENT TRACKING ==========

    // Counters for tracking events
    counters: {
        // Boss events
        bossSpawns: 0,
        bossDefeats: 0,
        bossPhaseChanges: 0,

        // Mini-boss events
        miniBossSpawns: 0,
        miniBossDefeats: 0,
        miniBossTriggers: {},  // Per-currency triggers: { '$': 2, '€': 1 }

        // Wave events
        wavesStarted: 0,
        wavesCompleted: 0,
        hordeTransitions: 0,
        intermissions: 0,

        // Level/Cycle
        levelUps: 0,
        cycleUps: 0,

        // Combat
        enemiesKilled: 0,
        playerDeaths: 0,
        bulletsCleared: 0,

        // HarmonicConductor
        conductorResets: 0,
        conductorGenerations: 0,
    },

    // Event history (last N events)
    history: [],
    MAX_HISTORY: 50,

    // Session start time
    sessionStart: Date.now(),

    // ========== LOGGING ==========

    /**
     * Log a debug message if category is enabled
     */
    log(category, message, data = null) {
        if (!this.ENABLED) return;
        if (!this.categories[category]) return;

        const timestamp = ((Date.now() - this.sessionStart) / 1000).toFixed(2);
        const prefix = `[${category} +${timestamp}s]`;

        if (data !== null) {
            console.log(prefix, message, data);
        } else {
            console.log(prefix, message);
        }

        // Add to history
        this._addHistory(category, message, data);
    },

    /**
     * Log with full timestamp
     */
    logTime(category, message, data = null) {
        if (!this.ENABLED) return;
        if (!this.categories[category]) return;

        const prefix = `[${category} @${new Date().toLocaleTimeString()}]`;
        if (data !== null) {
            console.log(prefix, message, data);
        } else {
            console.log(prefix, message);
        }

        this._addHistory(category, message, data);
    },

    _addHistory(category, message, data) {
        const entry = {
            time: Date.now() - this.sessionStart,
            category,
            message,
            data: data ? JSON.stringify(data).substring(0, 100) : null
        };
        this.history.push(entry);
        if (this.history.length > this.MAX_HISTORY) {
            this.history.shift();
        }
    },

    // ========== EVENT TRACKING METHODS ==========

    /**
     * Track boss spawn event
     */
    trackBossSpawn(bossType, hp, level, cycle) {
        this.counters.bossSpawns++;
        this.log('BOSS', `🔴 BOSS SPAWN #${this.counters.bossSpawns}: ${bossType}`, { hp, level, cycle });
    },

    /**
     * Track boss defeat event
     */
    trackBossDefeat(bossType, level, cycle) {
        this.counters.bossDefeats++;
        this.log('BOSS', `✅ BOSS DEFEAT #${this.counters.bossDefeats}: ${bossType}`, { level, cycle });
    },

    /**
     * Track boss phase change
     */
    trackBossPhase(bossType, phase) {
        this.counters.bossPhaseChanges++;
        this.log('BOSS', `⚡ BOSS PHASE ${phase}: ${bossType}`);
    },

    /**
     * Track mini-boss spawn
     */
    trackMiniBossSpawn(bossType, triggerSymbol, killCount) {
        this.counters.miniBossSpawns++;
        if (!this.counters.miniBossTriggers[triggerSymbol]) {
            this.counters.miniBossTriggers[triggerSymbol] = 0;
        }
        this.counters.miniBossTriggers[triggerSymbol]++;
        this.log('MINIBOSS', `🟠 MINIBOSS SPAWN #${this.counters.miniBossSpawns}: ${bossType} (trigger: ${triggerSymbol} x${killCount})`);
    },

    /**
     * Track mini-boss defeat
     */
    trackMiniBossDefeat(bossType) {
        this.counters.miniBossDefeats++;
        this.log('MINIBOSS', `✅ MINIBOSS DEFEAT #${this.counters.miniBossDefeats}: ${bossType}`);
    },

    /**
     * Track wave start
     */
    trackWaveStart(wave, horde, level, pattern, enemyCount) {
        this.counters.wavesStarted++;
        this.log('WAVE', `🌊 WAVE START #${this.counters.wavesStarted}: W${wave}H${horde} L${level}`, { pattern, enemies: enemyCount });
    },

    /**
     * Track wave complete
     */
    trackWaveComplete(wave, level) {
        this.counters.wavesCompleted++;
        this.log('WAVE', `✅ WAVE COMPLETE #${this.counters.wavesCompleted}: W${wave} L${level}`);
    },

    /**
     * Track horde transition
     */
    trackHordeTransition(fromHorde, toHorde, wave) {
        this.counters.hordeTransitions++;
        this.log('HORDE', `🔄 HORDE TRANSITION #${this.counters.hordeTransitions}: H${fromHorde}→H${toHorde} W${wave}`);
    },

    /**
     * Track intermission
     */
    trackIntermission(level, wave) {
        this.counters.intermissions++;
        this.log('WAVE', `⏸️ INTERMISSION #${this.counters.intermissions}: L${level} W${wave}`);
    },

    /**
     * Track level up
     */
    trackLevelUp(newLevel, cycle) {
        this.counters.levelUps++;
        this.log('STATE', `⬆️ LEVEL UP #${this.counters.levelUps}: L${newLevel} C${cycle}`);
    },

    /**
     * Track cycle up (after boss defeat)
     */
    trackCycleUp(newCycle) {
        this.counters.cycleUps++;
        this.log('STATE', `🔄 CYCLE UP #${this.counters.cycleUps}: C${newCycle}`);
    },

    /**
     * Track HarmonicConductor reset
     */
    trackConductorReset(generation) {
        this.counters.conductorResets++;
        this.counters.conductorGenerations = generation;
        this.log('CONDUCTOR', `🎵 CONDUCTOR RESET #${this.counters.conductorResets}: gen=${generation}`);
    },

    /**
     * Track enemy killed
     */
    trackEnemyKill(symbol, isMinion) {
        this.counters.enemiesKilled++;
        if (this.categories.ENEMY) {
            this.log('ENEMY', `💀 Enemy killed: ${symbol}${isMinion ? ' (minion)' : ''}`);
        }
    },

    /**
     * Track player death
     */
    trackPlayerDeath(lives, level) {
        this.counters.playerDeaths++;
        this.log('STATE', `💔 PLAYER DEATH #${this.counters.playerDeaths}: ${lives} lives left, L${level}`);
    },

    // ========== CATEGORY CONTROLS ==========

    enable(category) {
        if (this.categories.hasOwnProperty(category)) {
            this.categories[category] = true;
            console.log(`[DEBUG] Enabled: ${category}`);
        } else {
            console.warn(`[DEBUG] Unknown category: ${category}. Available:`, Object.keys(this.categories));
        }
    },

    disable(category) {
        if (this.categories.hasOwnProperty(category)) {
            this.categories[category] = false;
            console.log(`[DEBUG] Disabled: ${category}`);
        }
    },

    enableAll() {
        Object.keys(this.categories).forEach(cat => {
            this.categories[cat] = true;
        });
        console.log('[DEBUG] All categories enabled');
    },

    disableAll() {
        Object.keys(this.categories).forEach(cat => {
            this.categories[cat] = false;
        });
        console.log('[DEBUG] All categories disabled');
    },

    // ========== STATUS & STATS ==========

    /**
     * Show current settings
     */
    status() {
        console.log('╔══════════════════════════════════════╗');
        console.log('║       DEBUG SYSTEM STATUS            ║');
        console.log('╠══════════════════════════════════════╣');
        console.log(`║ Master: ${this.ENABLED ? '✅ ON' : '❌ OFF'}                         ║`);
        console.log(`║ Overlay: ${this.OVERLAY_ENABLED ? '✅ ON' : '❌ OFF'}                        ║`);
        console.log('╠══════════════════════════════════════╣');
        console.log('║ Categories:                          ║');
        Object.entries(this.categories).forEach(([cat, enabled]) => {
            const status = enabled ? '✅' : '❌';
            console.log(`║   ${status} ${cat.padEnd(12)}`);
        });
        console.log('╚══════════════════════════════════════╝');
    },

    /**
     * Show event statistics
     */
    stats() {
        const c = this.counters;
        const sessionTime = ((Date.now() - this.sessionStart) / 1000).toFixed(0);

        console.log('╔══════════════════════════════════════╗');
        console.log('║       EVENT STATISTICS               ║');
        console.log(`║       Session: ${sessionTime}s                    ║`);
        console.log('╠══════════════════════════════════════╣');
        console.log('║ BOSS EVENTS:                         ║');
        console.log(`║   Spawns: ${c.bossSpawns}  Defeats: ${c.bossDefeats}  Phases: ${c.bossPhaseChanges}`);
        console.log('║ MINI-BOSS EVENTS:                    ║');
        console.log(`║   Spawns: ${c.miniBossSpawns}  Defeats: ${c.miniBossDefeats}`);
        if (Object.keys(c.miniBossTriggers).length > 0) {
            console.log(`║   Triggers: ${JSON.stringify(c.miniBossTriggers)}`);
        }
        console.log('║ WAVE EVENTS:                         ║');
        console.log(`║   Started: ${c.wavesStarted}  Completed: ${c.wavesCompleted}`);
        console.log(`║   Horde Trans: ${c.hordeTransitions}  Intermissions: ${c.intermissions}`);
        console.log('║ PROGRESSION:                         ║');
        console.log(`║   Level Ups: ${c.levelUps}  Cycle Ups: ${c.cycleUps}`);
        console.log('║ COMBAT:                              ║');
        console.log(`║   Enemies Killed: ${c.enemiesKilled}  Player Deaths: ${c.playerDeaths}`);
        console.log('║ CONDUCTOR:                           ║');
        console.log(`║   Resets: ${c.conductorResets}  Current Gen: ${c.conductorGenerations}`);
        console.log('╚══════════════════════════════════════╝');
    },

    /**
     * Show recent event history
     */
    showHistory(count = 20) {
        console.log('╔══════════════════════════════════════╗');
        console.log('║       RECENT EVENT HISTORY           ║');
        console.log('╠══════════════════════════════════════╣');
        const recent = this.history.slice(-count);
        recent.forEach(entry => {
            const time = (entry.time / 1000).toFixed(2);
            console.log(`║ +${time}s [${entry.category}] ${entry.message}`);
            if (entry.data) {
                console.log(`║        └─ ${entry.data}`);
            }
        });
        console.log('╚══════════════════════════════════════╝');
    },

    /**
     * Reset all counters
     */
    resetStats() {
        this.counters = {
            bossSpawns: 0,
            bossDefeats: 0,
            bossPhaseChanges: 0,
            miniBossSpawns: 0,
            miniBossDefeats: 0,
            miniBossTriggers: {},
            wavesStarted: 0,
            wavesCompleted: 0,
            hordeTransitions: 0,
            intermissions: 0,
            levelUps: 0,
            cycleUps: 0,
            enemiesKilled: 0,
            playerDeaths: 0,
            bulletsCleared: 0,
            conductorResets: 0,
            conductorGenerations: 0,
        };
        this.history = [];
        this.sessionStart = Date.now();
        console.log('[DEBUG] Stats reset');
    },

    // ========== VISUAL OVERLAY ==========

    showOverlay() {
        this.OVERLAY_ENABLED = true;
        console.log('[DEBUG] Overlay enabled - will draw on next frame');
    },

    hideOverlay() {
        this.OVERLAY_ENABLED = false;
        console.log('[DEBUG] Overlay disabled');
    },

    toggleOverlay() {
        this.OVERLAY_ENABLED = !this.OVERLAY_ENABLED;
        console.log(`[DEBUG] Overlay ${this.OVERLAY_ENABLED ? 'enabled' : 'disabled'}`);
    },

    /**
     * Draw debug overlay on canvas
     * Call this from main.js draw loop when OVERLAY_ENABLED
     */
    drawOverlay(ctx, gameState) {
        if (!this.OVERLAY_ENABLED) return;

        const G = window.Game;
        const c = this.counters;

        // Get game state
        const level = window.currentLevel || 1;
        const cycle = window.marketCycle || 1;
        const waveMgr = G.WaveManager;
        const wave = waveMgr ? waveMgr.wave : 0;
        const horde = waveMgr ? waveMgr.currentHorde : 0;
        const enemies = G.enemies ? G.enemies.length : 0;
        const enemyBullets = window.enemyBullets ? window.enemyBullets.length : 0;
        const bullets = G.bullets ? G.bullets.length : 0;
        const boss = window.boss || null;
        const miniBoss = window.miniBoss || null;
        const conductor = G.HarmonicConductor;

        ctx.save();

        // Semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(5, 100, 180, 320);

        // Border
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(5, 100, 180, 320);

        // Title
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('═══ DEBUG v2.22.5 ═══', 12, 115);

        ctx.font = '10px monospace';
        let y = 132;
        const lineHeight = 13;

        // Game State
        ctx.fillStyle = '#ffff00';
        ctx.fillText(`STATE: ${gameState}`, 12, y); y += lineHeight;

        ctx.fillStyle = '#ffffff';
        ctx.fillText(`Level: ${level}  Cycle: ${cycle}`, 12, y); y += lineHeight;
        ctx.fillText(`Wave: ${wave}  Horde: ${horde}`, 12, y); y += lineHeight;

        // Entities
        y += 5;
        ctx.fillStyle = '#00ffff';
        ctx.fillText('─── ENTITIES ───', 12, y); y += lineHeight;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`Enemies: ${enemies}`, 12, y); y += lineHeight;
        ctx.fillText(`Enemy Bullets: ${enemyBullets}`, 12, y); y += lineHeight;
        ctx.fillText(`Player Bullets: ${bullets}`, 12, y); y += lineHeight;

        // Boss Status
        y += 5;
        ctx.fillStyle = '#ff6600';
        ctx.fillText('─── BOSS ───', 12, y); y += lineHeight;
        if (boss) {
            ctx.fillStyle = '#ff0000';
            ctx.fillText(`ACTIVE: ${boss.bossType}`, 12, y); y += lineHeight;
            ctx.fillText(`HP: ${boss.hp}/${boss.maxHp}`, 12, y); y += lineHeight;
            ctx.fillText(`Phase: ${boss.phase}`, 12, y); y += lineHeight;
        } else {
            ctx.fillStyle = '#888888';
            ctx.fillText(`No boss active`, 12, y); y += lineHeight;
        }

        // MiniBoss Status
        if (miniBoss) {
            ctx.fillStyle = '#ff00ff';
            ctx.fillText(`MINIBOSS: ${miniBoss.bossType || 'legacy'}`, 12, y); y += lineHeight;
        }

        // Counters
        y += 5;
        ctx.fillStyle = '#00ff00';
        ctx.fillText('─── COUNTERS ───', 12, y); y += lineHeight;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`Boss: ${c.bossSpawns}/${c.bossDefeats}`, 12, y); y += lineHeight;
        ctx.fillText(`MiniBoss: ${c.miniBossSpawns}/${c.miniBossDefeats}`, 12, y); y += lineHeight;
        ctx.fillText(`Waves: ${c.wavesStarted}/${c.wavesCompleted}`, 12, y); y += lineHeight;
        ctx.fillText(`Hordes: ${c.hordeTransitions}`, 12, y); y += lineHeight;

        // Conductor
        if (conductor) {
            y += 5;
            ctx.fillStyle = '#ff69b4';
            ctx.fillText('─── CONDUCTOR ───', 12, y); y += lineHeight;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`Gen: ${conductor.generation || 0}`, 12, y); y += lineHeight;
            ctx.fillText(`Seq: ${conductor.currentSequence ? 'active' : 'null'}`, 12, y); y += lineHeight;
            ctx.fillText(`Phase: ${conductor.waveIntensity?.currentPhase || 'N/A'}`, 12, y); y += lineHeight;
        }

        // Session time
        const sessionTime = ((Date.now() - this.sessionStart) / 1000).toFixed(0);
        ctx.fillStyle = '#888888';
        ctx.fillText(`Session: ${sessionTime}s`, 12, 415);

        ctx.restore();
    },

    // ========== QUICK TOGGLES ==========

    setProduction() {
        this.ENABLED = false;
        this.OVERLAY_ENABLED = false;
        console.log('[DEBUG] Production mode - all logging disabled');
    },

    setDevelopment() {
        this.ENABLED = true;
        console.log('[DEBUG] Development mode - logging enabled');
    },

    /**
     * Quick setup for boss debugging
     */
    debugBoss() {
        this.ENABLED = true;
        this.OVERLAY_ENABLED = true;
        this.categories.BOSS = true;
        this.categories.MINIBOSS = true;
        this.categories.WAVE = true;
        this.categories.STATE = true;
        console.log('[DEBUG] Boss debugging enabled with overlay');
    },

    /**
     * Quick setup for wave debugging
     */
    debugWaves() {
        this.ENABLED = true;
        this.OVERLAY_ENABLED = true;
        this.categories.WAVE = true;
        this.categories.HORDE = true;
        this.categories.STATE = true;
        console.log('[DEBUG] Wave debugging enabled with overlay');
    },

    /**
     * Get current state snapshot for external analysis
     */
    getSnapshot() {
        const G = window.Game;
        return {
            timestamp: Date.now(),
            sessionTime: Date.now() - this.sessionStart,
            counters: { ...this.counters },
            gameState: {
                level: window.currentLevel,
                cycle: window.marketCycle,
                wave: G.WaveManager?.wave,
                horde: G.WaveManager?.currentHorde,
                bossActive: !!window.boss,
                miniBossActive: !!window.miniBoss,
                enemies: G.enemies?.length || 0,
                enemyBullets: window.enemyBullets?.length || 0,
            },
            conductor: {
                generation: G.HarmonicConductor?.generation || 0,
                hasSequence: !!G.HarmonicConductor?.currentSequence,
                phase: G.HarmonicConductor?.waveIntensity?.currentPhase,
            }
        };
    }
};

// Shortcut alias
window.dbg = window.Game.Debug;

// Console helper message
console.log('[DEBUG] DebugSystem loaded. Commands: dbg.stats(), dbg.showOverlay(), dbg.debugBoss()');
