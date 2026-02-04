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

    // ========== BALANCE ANALYTICS ==========
    // Automatic tracking for Phase 25 balance testing

    analytics: {
        // Run info
        runStart: 0,
        ship: '',
        mode: '',

        // Timing (milliseconds)
        cycleStartTimes: {},      // { 1: 0, 2: 45000, 3: 95000 }
        cycleDurations: {},       // { 1: 45000, 2: 50000, 3: 55000 }
        bossStartTimes: {},       // { 'FED_1': 40000, 'BCE_2': 90000 }
        bossDurations: {},        // { 'FED_1': 5000, 'BCE_2': 7000 }
        waveStartTimes: [],       // timestamps per wave start

        // Combat
        deaths: [],               // [{ time, cycle, wave, horde, cause, x, y }]
        grazeCount: 0,
        closeGrazeCount: 0,
        maxKillStreak: 0,
        currentStreak: 0,

        // HYPER
        hyperActivations: 0,
        hyperTotalDuration: 0,
        hyperDeaths: 0,
        hyperScoreGained: 0,

        // Power-ups
        powerUpsCollected: [],    // [{ time, type, wave, cycle }]
        pityTimerTriggers: 0,

        // Sacrifice
        sacrificeOpportunities: 0,
        sacrificeAccepted: 0,
        sacrificeSuccess: 0,
        sacrificeFail: 0,

        // Boss
        bossData: [],             // [{ type, cycle, duration, damageToPlayer, phases }]

        // Mini-boss
        miniBossData: [],         // [{ type, trigger, killCount, duration }]

        // Score checkpoints
        scoreAtCycleEnd: {},      // { 1: 50000, 2: 120000 }
        finalScore: 0,
    },

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
    trackPlayerDeath(lives, level, cause = 'bullet') {
        this.counters.playerDeaths++;
        this.log('STATE', `💔 PLAYER DEATH #${this.counters.playerDeaths}: ${lives} lives left, L${level}`);

        // Analytics
        const a = this.analytics;
        const G = window.Game;
        a.deaths.push({
            time: Date.now() - a.runStart,
            cycle: window.marketCycle || 1,
            wave: G.WaveManager?.wave || 0,
            horde: G.WaveManager?.currentHorde || 1,
            cause: cause,
            duringHyper: window.hyperActive || false,
            duringBoss: !!window.boss
        });
        if (window.hyperActive) {
            a.hyperDeaths++;
        }
    },

    // ========== BALANCE ANALYTICS TRACKING ==========

    /**
     * Start a new analytics run
     */
    startAnalyticsRun(ship, mode) {
        this.analytics = {
            runStart: Date.now(),
            ship: ship || 'BTC',
            mode: mode || 'Normal',
            cycleStartTimes: { 1: 0 },
            cycleDurations: {},
            bossStartTimes: {},
            bossDurations: {},
            waveStartTimes: [],
            deaths: [],
            grazeCount: 0,
            closeGrazeCount: 0,
            maxKillStreak: 0,
            currentStreak: 0,
            hyperActivations: 0,
            hyperTotalDuration: 0,
            hyperDeaths: 0,
            hyperScoreGained: 0,
            powerUpsCollected: [],
            pityTimerTriggers: 0,
            sacrificeOpportunities: 0,
            sacrificeAccepted: 0,
            sacrificeSuccess: 0,
            sacrificeFail: 0,
            bossData: [],
            miniBossData: [],
            scoreAtCycleEnd: {},
            finalScore: 0,
        };
        console.log(`[ANALYTICS] Run started: ${ship} / ${mode}`);
    },

    /**
     * Track cycle start
     */
    trackCycleStart(cycle) {
        const a = this.analytics;
        a.cycleStartTimes[cycle] = Date.now() - a.runStart;
    },

    /**
     * Track cycle end
     */
    trackCycleEnd(cycle, score) {
        const a = this.analytics;
        const startTime = a.cycleStartTimes[cycle] || 0;
        a.cycleDurations[cycle] = (Date.now() - a.runStart) - startTime;
        a.scoreAtCycleEnd[cycle] = score;
    },

    /**
     * Track boss fight start
     */
    trackBossFightStart(bossType, cycle) {
        const a = this.analytics;
        const key = `${bossType}_${cycle}`;
        a.bossStartTimes[key] = Date.now() - a.runStart;
    },

    /**
     * Track boss fight end
     */
    trackBossFightEnd(bossType, cycle, damageToPlayer = 0) {
        const a = this.analytics;
        const key = `${bossType}_${cycle}`;
        const startTime = a.bossStartTimes[key] || (Date.now() - a.runStart);
        const duration = (Date.now() - a.runStart) - startTime;
        a.bossDurations[key] = duration;
        a.bossData.push({
            type: bossType,
            cycle: cycle,
            duration: duration,
            damageToPlayer: damageToPlayer
        });
    },

    /**
     * Track graze
     */
    trackGraze(isClose = false) {
        const a = this.analytics;
        a.grazeCount++;
        if (isClose) {
            a.closeGrazeCount++;
        }
    },

    /**
     * Track kill streak
     */
    trackKillStreak(streak) {
        const a = this.analytics;
        a.currentStreak = streak;
        if (streak > a.maxKillStreak) {
            a.maxKillStreak = streak;
        }
    },

    /**
     * Track HYPER activation
     */
    trackHyperActivate() {
        this.analytics.hyperActivations++;
        this.analytics._hyperStart = Date.now();
        this.analytics._hyperScoreStart = window.score || 0;
    },

    /**
     * Track HYPER end
     */
    trackHyperEnd() {
        const a = this.analytics;
        if (a._hyperStart) {
            a.hyperTotalDuration += (Date.now() - a._hyperStart);
            a.hyperScoreGained += (window.score || 0) - (a._hyperScoreStart || 0);
            a._hyperStart = null;
        }
    },

    /**
     * Track power-up collected
     */
    trackPowerUpCollected(type, isPityTimer = false) {
        const a = this.analytics;
        const G = window.Game;
        a.powerUpsCollected.push({
            time: Date.now() - a.runStart,
            type: type,
            wave: G.WaveManager?.wave || 0,
            cycle: window.marketCycle || 1
        });
        if (isPityTimer) {
            a.pityTimerTriggers++;
        }
    },

    /**
     * Track sacrifice opportunity
     */
    trackSacrificeOpportunity() {
        this.analytics.sacrificeOpportunities++;
    },

    /**
     * Track sacrifice accepted
     */
    trackSacrificeAccepted() {
        this.analytics.sacrificeAccepted++;
    },

    /**
     * Track sacrifice result
     */
    trackSacrificeResult(success) {
        if (success) {
            this.analytics.sacrificeSuccess++;
        } else {
            this.analytics.sacrificeFail++;
        }
    },

    /**
     * Track mini-boss fight
     */
    trackMiniBossFight(type, trigger, killCount, duration) {
        this.analytics.miniBossData.push({
            type: type,
            trigger: trigger,
            killCount: killCount,
            duration: duration
        });
    },

    /**
     * End run and store final score
     */
    endAnalyticsRun(score) {
        this.analytics.finalScore = score;
        this.analytics.runEnd = Date.now();
        console.log('[ANALYTICS] Run ended. Use dbg.report() to see results.');
    },

    /**
     * Generate balance report
     */
    report() {
        const a = this.analytics;
        const runTime = (a.runEnd || Date.now()) - a.runStart;

        const formatTime = (ms) => {
            const sec = Math.floor(ms / 1000);
            const min = Math.floor(sec / 60);
            return `${min}:${(sec % 60).toString().padStart(2, '0')}`;
        };

        console.log('');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║             BALANCE ANALYTICS REPORT v2.24.3               ║');
        console.log('╠════════════════════════════════════════════════════════════╣');
        console.log(`║ Ship: ${a.ship.padEnd(10)} Mode: ${a.mode.padEnd(15)} ║`);
        console.log(`║ Total Run Time: ${formatTime(runTime).padEnd(10)} Final Score: ${(a.finalScore || 0).toString().padStart(8)} ║`);
        console.log('╠════════════════════════════════════════════════════════════╣');

        // Cycle Timings
        console.log('║ CYCLE TIMINGS                                              ║');
        console.log('║ ──────────────────────────────────────────────────────────║');
        for (let c = 1; c <= 3; c++) {
            const dur = a.cycleDurations[c];
            const score = a.scoreAtCycleEnd[c];
            if (dur !== undefined) {
                const target = c === 1 ? '4-5m' : c === 2 ? '5-6m' : '6-7m';
                const status = dur < 240000 ? '⚡FAST' : dur > 420000 ? '🐢SLOW' : '✅OK';
                console.log(`║   Cycle ${c}: ${formatTime(dur).padEnd(6)} (target ${target}) ${status.padEnd(8)} Score: ${score || '?'}`);
            }
        }

        // Boss Fights
        console.log('║                                                            ║');
        console.log('║ BOSS FIGHTS                                                ║');
        console.log('║ ──────────────────────────────────────────────────────────║');
        if (a.bossData.length === 0) {
            console.log('║   No bosses defeated                                       ║');
        }
        for (const boss of a.bossData) {
            const durSec = (boss.duration / 1000).toFixed(1);
            const status = boss.duration < 45000 ? '⚡FAST' : boss.duration > 90000 ? '🐢SLOW' : '✅OK';
            console.log(`║   ${boss.type.padEnd(15)} C${boss.cycle}: ${durSec.padStart(5)}s ${status}`);
        }

        // Deaths
        console.log('║                                                            ║');
        console.log('║ DEATHS                                                     ║');
        console.log('║ ──────────────────────────────────────────────────────────║');
        console.log(`║   Total: ${a.deaths.length}  (During HYPER: ${a.hyperDeaths})                     ║`);
        for (const d of a.deaths) {
            const when = formatTime(d.time);
            const where = d.duringBoss ? 'BOSS' : `W${d.wave}H${d.horde}`;
            console.log(`║     @${when} C${d.cycle} ${where.padEnd(8)} ${d.cause}`);
        }

        // Graze & HYPER
        console.log('║                                                            ║');
        console.log('║ GRAZE & HYPER                                              ║');
        console.log('║ ──────────────────────────────────────────────────────────║');
        console.log(`║   Grazes: ${a.grazeCount.toString().padEnd(6)} Close: ${a.closeGrazeCount.toString().padEnd(6)} (${a.grazeCount > 0 ? Math.round(a.closeGrazeCount/a.grazeCount*100) : 0}%)`);
        console.log(`║   HYPER Activations: ${a.hyperActivations}`);
        console.log(`║   HYPER Total Time: ${formatTime(a.hyperTotalDuration)}`);
        console.log(`║   HYPER Score Gained: ${a.hyperScoreGained}`);
        console.log(`║   Max Kill Streak: ${a.maxKillStreak}`);

        // Power-ups
        console.log('║                                                            ║');
        console.log('║ POWER-UPS                                                  ║');
        console.log('║ ──────────────────────────────────────────────────────────║');
        console.log(`║   Collected: ${a.powerUpsCollected.length}  Pity Timer: ${a.pityTimerTriggers}`);
        // Group by type
        const byType = {};
        for (const p of a.powerUpsCollected) {
            byType[p.type] = (byType[p.type] || 0) + 1;
        }
        const typeStr = Object.entries(byType).map(([t, c]) => `${t}:${c}`).join(' ');
        if (typeStr) {
            console.log(`║   Types: ${typeStr}`);
        }

        // Sacrifice
        console.log('║                                                            ║');
        console.log('║ SACRIFICE                                                  ║');
        console.log('║ ──────────────────────────────────────────────────────────║');
        console.log(`║   Opportunities: ${a.sacrificeOpportunities}  Accepted: ${a.sacrificeAccepted}`);
        console.log(`║   Success: ${a.sacrificeSuccess}  Fail: ${a.sacrificeFail}`);

        // Mini-boss
        console.log('║                                                            ║');
        console.log('║ MINI-BOSS                                                  ║');
        console.log('║ ──────────────────────────────────────────────────────────║');
        if (a.miniBossData.length === 0) {
            console.log('║   No mini-bosses spawned                                   ║');
        }
        for (const mb of a.miniBossData) {
            console.log(`║   ${mb.type} (${mb.trigger} x${mb.killCount}) - ${(mb.duration/1000).toFixed(1)}s`);
        }

        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log('');

        // Return data for screenshot/export
        return this.getAnalyticsData();
    },

    /**
     * Get raw analytics data for export
     */
    getAnalyticsData() {
        return JSON.parse(JSON.stringify(this.analytics));
    },

    /**
     * Quick balance test preset
     */
    balanceTest() {
        this.ENABLED = true;
        this.OVERLAY_ENABLED = true;
        this.categories.WAVE = true;
        this.categories.BOSS = true;
        this.categories.HORDE = true;
        this.categories.STATE = true;
        console.log('[DEBUG] Balance testing mode enabled');
        console.log('[DEBUG] Use dbg.report() after game over to see analytics');
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
        ctx.fillRect(5, 100, 180, 380);

        // Border
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(5, 100, 180, 380);

        // Title
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('═══ DEBUG v2.24.3 ═══', 12, 115);

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

        // Fiat Kill Counter (for mini-boss trigger debugging)
        const fkc = window.fiatKillCounter;
        if (fkc) {
            y += 5;
            ctx.fillStyle = '#ffcc00';
            ctx.fillText('─── KILL COUNTER ───', 12, y); y += lineHeight;
            ctx.fillStyle = '#ffffff';
            // Show top 3 currencies by kill count
            const sorted = Object.entries(fkc).sort((a, b) => b[1] - a[1]).slice(0, 3);
            for (const [sym, count] of sorted) {
                if (count > 0) {
                    const threshold = G.Balance?.MINI_BOSS?.CURRENCY_BOSS_MAP?.[sym]?.threshold || 30;
                    ctx.fillText(`${sym}: ${count}/${threshold}`, 12, y); y += lineHeight;
                }
            }
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
        ctx.fillText(`Session: ${sessionTime}s`, 12, 475);

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
