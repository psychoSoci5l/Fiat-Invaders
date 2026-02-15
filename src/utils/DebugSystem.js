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
            bossData: [],
            miniBossData: [],
            scoreAtCycleEnd: {},
            finalScore: 0,

            // Power-up economy tracking (v4.14.1)
            dropsSpawned: [],          // [{ time, type, category, source:'enemy'|'boss', wave, cycle }]
            dropsExpired: 0,           // counter di drop non raccolti
            // v4.19: Adaptive drop suppression tracking
            dropsSuppressed: [],       // [{ time, powerScore, weaponLevel, hasSpecial }]
            weaponTimeline: [],        // [{ time, event, detail }]
            godchainActivations: 0,
            godchainTotalDuration: 0,
            _godchainStart: null,
            modifierOverlapFrames: 0,  // frames con 2+ modifier attivi
            _totalTrackedFrames: 0,
            // v5.0.8: Progression tracking
            progressionLog: [],        // [{ time, type, before, after, wave, cycle }]
            // v5.0.8: Contagion tracking
            contagionEvents: [],       // [{ time, element, depth, damage, killed, perkLevel, wave, cycle }]
            contagionSummary: { fire: 0, electric: 0, cascadeKills: 0, maxDepth: 0 },
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
     * v5.0.8: Track progression state change (before/after pickup)
     * @param {string} type - Power-up type (UPGRADE, PIERCE, PERK, etc.)
     * @param {Object} before - Snapshot before pickup
     * @param {Object} after  - Snapshot after pickup
     */
    trackProgression(type, before, after) {
        const a = this.analytics;
        if (!a.runStart) return;
        const G = window.Game;
        const time = Date.now() - a.runStart;
        const wave = G.WaveManager?.wave || 0;
        const cycle = window.marketCycle || 1;

        const entry = { time, type, before, after, wave, cycle };
        a.progressionLog.push(entry);

        // Real-time console log
        const sec = Math.floor(time / 1000);
        const min = Math.floor(sec / 60);
        const ts = `${min}:${(sec % 60).toString().padStart(2, '0')}`;

        const changes = [];
        if (before.weaponLevel !== after.weaponLevel)
            changes.push(`WPN ${before.weaponLevel}→${after.weaponLevel}`);
        if (before.special !== after.special)
            changes.push(`SPE ${before.special || '-'}→${after.special || '-'}`);
        if (before.perkLevel !== after.perkLevel)
            changes.push(`PERK ${before.perkLevel}→${after.perkLevel}`);
        if (before.shieldActive !== after.shieldActive)
            changes.push(`SHIELD ${before.shieldActive ? 'ON' : 'OFF'}→${after.shieldActive ? 'ON' : 'OFF'}`);
        if (before.hyperActive !== after.hyperActive)
            changes.push(`HYPER ${before.hyperActive ? 'ON' : 'OFF'}→${after.hyperActive ? 'ON' : 'OFF'}`);
        if (before.effectiveLevel !== after.effectiveLevel)
            changes.push(`EFF_LV ${before.effectiveLevel}→${after.effectiveLevel}`);
        if (before.pierceHP !== after.pierceHP)
            changes.push(`PIERCE_HP ${before.pierceHP}→${after.pierceHP}`);

        const changeStr = changes.length > 0 ? changes.join(' | ') : '(no change)';
        const stateStr = `WPN:${after.weaponLevel} SPE:${after.special || '-'} PERK:${after.perkLevel} EFF:${after.effectiveLevel} PIERCE:${after.pierceHP}`;

        const color = type === 'UPGRADE' ? '#0f0'
            : type === 'PERK' ? '#f80'
            : type === 'PIERCE' ? '#f44'
            : type === 'HOMING' ? '#0ff'
            : type === 'MISSILE' ? '#ff0'
            : '#fff';

        console.log(
            `%c[PROG] @${ts} C${cycle}W${wave} ▸ ${type}%c  ${changeStr}  %c[${stateStr}]`,
            `color: ${color}; font-weight: bold`,
            'color: #fff',
            'color: #888'
        );
    },

    /**
     * v5.0.8: Progression report — full pickup history with state diffs
     */
    progressionReport() {
        const a = this.analytics;
        const log = a.progressionLog;
        if (!log || log.length === 0) {
            console.log('[PROG] No progression data — play a run first');
            return;
        }

        const formatTime = (ms) => {
            const sec = Math.floor(ms / 1000);
            const min = Math.floor(sec / 60);
            return `${min}:${(sec % 60).toString().padStart(2, '0')}`;
        };

        console.log('');
        console.log('%c╔════════════════════════════════════════════════════════════╗', 'color: #f80');
        console.log('%c║         PROGRESSION TRACKER REPORT v5.0.8                  ║', 'color: #f80; font-weight: bold');
        console.log('%c╠════════════════════════════════════════════════════════════╣', 'color: #f80');
        console.log('%c║  TIME  │ C│W │ PICKUP   │ CHANGE                          ║', 'color: #888');
        console.log('%c╠════════════════════════════════════════════════════════════╣', 'color: #f80');

        for (const e of log) {
            const ts = formatTime(e.time);
            const b = e.before;
            const af = e.after;

            // Build change description
            const diffs = [];
            if (b.weaponLevel !== af.weaponLevel)
                diffs.push(`WPN ${b.weaponLevel}→${af.weaponLevel}`);
            if (b.special !== af.special)
                diffs.push(`SPE ${b.special || '-'}→${af.special || '-'}`);
            if (b.perkLevel !== af.perkLevel)
                diffs.push(`PERK ${b.perkLevel}→${af.perkLevel}`);
            if (b.effectiveLevel !== af.effectiveLevel)
                diffs.push(`EFF ${b.effectiveLevel}→${af.effectiveLevel}`);
            if (b.pierceHP !== af.pierceHP)
                diffs.push(`PIERCE ${b.pierceHP}→${af.pierceHP}`);
            if (b.shieldActive !== af.shieldActive)
                diffs.push('SHIELD ' + (af.shieldActive ? 'ON' : 'OFF'));

            const diffStr = diffs.length > 0 ? diffs.join(' | ') : '(no state change)';

            const color = e.type === 'UPGRADE' ? 'color: #0f0'
                : e.type === 'PERK' ? 'color: #f80'
                : e.type === 'PIERCE' ? 'color: #f44'
                : e.type === 'HOMING' ? 'color: #0ff'
                : e.type === 'MISSILE' ? 'color: #ff0'
                : 'color: #fff';

            console.log(
                `%c║ ${ts.padEnd(5)} │C${e.cycle}│W${String(e.wave).padEnd(2)}│ ${e.type.padEnd(9)}│%c ${diffStr}`,
                color,
                'color: #fff'
            );
        }

        // Summary: power curve analysis
        console.log('%c╠══ POWER CURVE SUMMARY ════════════════════════════════════╣', 'color: #f80');

        // Count by type
        const byType = {};
        for (const e of log) byType[e.type] = (byType[e.type] || 0) + 1;
        const typeStr = Object.entries(byType).map(([t, c]) => `${t}:${c}`).join('  ');
        console.log(`%c║  Pickups: ${log.length} — ${typeStr}`, 'color: #fff');

        // Time to reach each weapon level
        const wpnTimes = {};
        for (const e of log) {
            if (e.after.weaponLevel > e.before.weaponLevel) {
                wpnTimes[e.after.weaponLevel] = formatTime(e.time);
            }
        }
        if (Object.keys(wpnTimes).length > 0) {
            const wpnStr = Object.entries(wpnTimes).map(([lv, t]) => `LV${lv}@${t}`).join('  ');
            console.log(`%c║  Weapon milestones: ${wpnStr}`, 'color: #0f0');
        }

        // Pierce HP escalation
        const lastEntry = log[log.length - 1];
        if (lastEntry) {
            console.log(`%c║  Final state: WPN:${lastEntry.after.weaponLevel} SPE:${lastEntry.after.special || '-'} PERK:${lastEntry.after.perkLevel} EFF:${lastEntry.after.effectiveLevel} PIERCE:${lastEntry.after.pierceHP}`, 'color: #ff0');
        }

        // Pierce progression over time
        const pierceEntries = log.filter(e => e.after.pierceHP !== e.before.pierceHP);
        if (pierceEntries.length > 0) {
            const pierceStr = pierceEntries.map(e => `${e.before.pierceHP}→${e.after.pierceHP}@${formatTime(e.time)}`).join('  ');
            console.log(`%c║  Pierce escalation: ${pierceStr}`, 'color: #f44');
        }

        console.log('%c╚════════════════════════════════════════════════════════════╝', 'color: #f80');
    },

    /**
     * v5.0.8: Track elemental contagion event
     * @param {string} element - 'fire' or 'electric'
     * @param {number} depth - cascade depth (0 = direct, 1+ = contagion)
     * @param {number} damage - damage dealt
     * @param {boolean} killed - whether target died
     */
    trackContagion(element, depth, damage, killed) {
        const a = this.analytics;
        if (!a.runStart) return;
        const G = window.Game;
        const time = Date.now() - a.runStart;

        a.contagionEvents.push({
            time, element, depth, damage: Math.round(damage),
            killed,
            perkLevel: G.RunState?.perkLevel || 0,
            wave: G.WaveManager?.wave || 0,
            cycle: window.marketCycle || 1
        });

        // Update summary
        const s = a.contagionSummary;
        s[element]++;
        if (killed && depth > 0) s.cascadeKills++;
        if (depth > s.maxDepth) s.maxDepth = depth;
    },

    /**
     * v5.0.8: Contagion report — elemental cascade analysis
     */
    contagionReport() {
        const a = this.analytics;
        const events = a.contagionEvents;
        if (!events || events.length === 0) {
            console.log('[CONTAGION] No contagion data — play a run with elemental perks first');
            return;
        }

        const formatTime = (ms) => {
            const sec = Math.floor(ms / 1000);
            const min = Math.floor(sec / 60);
            return `${min}:${(sec % 60).toString().padStart(2, '0')}`;
        };

        const s = a.contagionSummary;
        const totalHits = events.length;
        const kills = events.filter(e => e.killed);
        const cascadeHits = events.filter(e => e.depth > 0);
        const cascadeKills = kills.filter(e => e.depth > 0);
        const directKills = kills.filter(e => e.depth === 0);

        console.log('');
        console.log('%c╔════════════════════════════════════════════════════════════╗', 'color: #8844ff');
        console.log('%c║         ELEMENTAL CONTAGION REPORT v5.0.8                  ║', 'color: #8844ff; font-weight: bold');
        console.log('%c╠════════════════════════════════════════════════════════════╣', 'color: #8844ff');

        // Overview
        console.log('%c╠══ OVERVIEW ═══════════════════════════════════════════════╣', 'color: #0ff');
        console.log(`%c║  Total elemental hits: ${totalHits}  (Fire: ${s.fire}  Electric: ${s.electric})`, 'color: #fff');
        console.log(`%c║  Kills: ${kills.length}  (direct: ${directKills.length}  cascade: ${cascadeKills.length})`, 'color: #0f0');
        console.log(`%c║  Max cascade depth reached: ${s.maxDepth}`, s.maxDepth >= 2 ? 'color: #f80' : 'color: #fff');
        console.log(`%c║  Cascade hits (depth>0): ${cascadeHits.length}  kills: ${cascadeKills.length}`, cascadeKills.length > 0 ? 'color: #f80' : 'color: #888');

        if (totalHits > 0) {
            const killRate = ((kills.length / totalHits) * 100).toFixed(1);
            console.log(`%c║  Kill rate: ${killRate}%`, parseFloat(killRate) > 50 ? 'color: #0f0' : 'color: #ff0');
        }

        // By element breakdown
        console.log('%c╠══ BY ELEMENT ═════════════════════════════════════════════╣', 'color: #0ff');
        for (const elem of ['fire', 'electric']) {
            const elemEvents = events.filter(e => e.element === elem);
            if (elemEvents.length === 0) continue;
            const elemKills = elemEvents.filter(e => e.killed);
            const elemCascade = elemEvents.filter(e => e.depth > 0);
            const elemCascadeKills = elemKills.filter(e => e.depth > 0);
            const avgDmg = elemEvents.reduce((sum, e) => sum + e.damage, 0) / elemEvents.length;
            const color = elem === 'fire' ? '#ff4400' : '#8844ff';
            console.log(`%c║  ${elem.toUpperCase().padEnd(10)} hits: ${elemEvents.length}  kills: ${elemKills.length}  cascade: ${elemCascade.length} (${elemCascadeKills.length} kills)  avgDmg: ${Math.round(avgDmg)}`, `color: ${color}`);
        }

        // Cascade depth distribution
        console.log('%c╠══ CASCADE DEPTH DISTRIBUTION ════════════════════════════╣', 'color: #0ff');
        const byDepth = {};
        for (const e of events) {
            byDepth[e.depth] = byDepth[e.depth] || { hits: 0, kills: 0 };
            byDepth[e.depth].hits++;
            if (e.killed) byDepth[e.depth].kills++;
        }
        for (const [d, data] of Object.entries(byDepth).sort((a, b) => a[0] - b[0])) {
            const label = d === '0' ? 'Direct (d0)' : `Cascade d${d}`;
            const bar = '█'.repeat(Math.min(20, Math.round(data.hits / totalHits * 40)));
            console.log(`%c║  ${label.padEnd(14)} ${bar} ${data.hits} hits, ${data.kills} kills`, 'color: #fff');
        }

        // Timeline: show cascade chains (group events within 100ms)
        console.log('%c╠══ NOTABLE CHAINS (3+ hits within 100ms) ══════════════════╣', 'color: #0ff');
        let chainStart = 0;
        let chainCount = 0;
        let chains = [];
        for (let i = 0; i < events.length; i++) {
            if (i === 0 || events[i].time - events[i - 1].time > 100) {
                if (chainCount >= 3) {
                    chains.push({ start: chainStart, count: chainCount, events: events.slice(chainStart, i) });
                }
                chainStart = i;
                chainCount = 1;
            } else {
                chainCount++;
            }
        }
        if (chainCount >= 3) {
            chains.push({ start: chainStart, count: chainCount, events: events.slice(chainStart) });
        }

        if (chains.length === 0) {
            console.log('%c║  No notable chains (need 3+ elemental hits in <100ms)    ║', 'color: #888');
        }
        for (const chain of chains.slice(-10)) {
            const t = formatTime(chain.events[0].time);
            const kills = chain.events.filter(e => e.killed).length;
            const maxD = Math.max(...chain.events.map(e => e.depth));
            const elems = [...new Set(chain.events.map(e => e.element[0].toUpperCase()))].join('+');
            console.log(`%c║  @${t} — ${chain.count} hits, ${kills} kills, depth ${maxD}, [${elems}]`, kills > 2 ? 'color: #f80' : 'color: #fff');
        }

        console.log('%c╚════════════════════════════════════════════════════════════╝', 'color: #8844ff');
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

    // ========== POWER-UP ECONOMY TRACKING v4.14.1 ==========

    /**
     * Track a drop spawned (enemy or boss)
     */
    trackDropSpawned(type, category, source) {
        const a = this.analytics;
        if (!a.runStart) return;
        const G = window.Game;
        a.dropsSpawned.push({
            time: Date.now() - a.runStart,
            type: type,
            category: category || 'unknown',
            source: source,
            wave: G.WaveManager?.wave || 0,
            cycle: window.marketCycle || 1
        });
    },

    /**
     * Track a drop that expired (not collected)
     */
    trackDropExpired() {
        const a = this.analytics;
        if (!a.runStart) return;
        a.dropsExpired++;
    },

    /**
     * Track a drop suppressed by adaptive system (v4.19)
     * @param {Object} playerState - { weaponLevel, hasSpecial }
     */
    trackDropSuppressed(playerState) {
        const a = this.analytics;
        if (!a.runStart) return;
        const DS = window.Game.DropSystem;
        const powerScore = DS ? DS.getPlayerPowerScore(playerState) : 0;
        a.dropsSuppressed.push({
            time: Date.now() - a.runStart,
            powerScore: powerScore,
            weaponLevel: playerState.weaponLevel,
            hasSpecial: playerState.hasSpecial
        });
    },

    /**
     * Track modifier overlap per frame
     * @param {number} activeModCount - number of active modifiers this frame
     */
    trackModifierFrame(activeModCount) {
        const a = this.analytics;
        a._totalTrackedFrames++;
        if (activeModCount >= 2) {
            a.modifierOverlapFrames++;
        }
    },

    /**
     * Track GODCHAIN activation
     */
    trackGodchainActivate() {
        const a = this.analytics;
        if (!a.runStart) return;
        a.godchainActivations++;
        a._godchainStart = Date.now();
        this.trackWeaponEvent('GODCHAIN_ON', '');
    },

    /**
     * Track GODCHAIN deactivation
     */
    trackGodchainDeactivate() {
        const a = this.analytics;
        if (!a.runStart) return;
        if (a._godchainStart) {
            a.godchainTotalDuration += (Date.now() - a._godchainStart);
            a._godchainStart = null;
        }
        this.trackWeaponEvent('GODCHAIN_OFF', '');
    },

    /**
     * Track a weapon evolution event
     * @param {string} event - UPGRADE, MODIFIER, SPECIAL, DEATH_PENALTY, GODCHAIN_ON/OFF, MODIFIER_EXPIRED, SPECIAL_EXPIRED
     * @param {string} detail - e.g. 'SHOT_LV2', 'RATE_LV1', 'HOMING'
     */
    trackWeaponEvent(event, detail) {
        const a = this.analytics;
        if (!a.runStart) return;
        a.weaponTimeline.push({
            time: Date.now() - a.runStart,
            event: event,
            detail: detail
        });
    },

    /**
     * Power-Up Economy Report — detailed analysis of drop lifecycle
     */
    powerUpReport() {
        const a = this.analytics;
        const runTime = (a.runEnd || Date.now()) - a.runStart;

        const formatTime = (ms) => {
            const sec = Math.floor(ms / 1000);
            const min = Math.floor(sec / 60);
            return `${min}:${(sec % 60).toString().padStart(2, '0')}`;
        };

        const spawned = a.dropsSpawned.length;
        const collected = a.powerUpsCollected.length;
        const expired = a.dropsExpired;
        const collectionRate = spawned > 0 ? ((collected / spawned) * 100).toFixed(1) : '0.0';

        console.log('');
        console.log('%c╔════════════════════════════════════════════════════════════╗', 'color: #f80');
        console.log('%c║           POWER-UP ECONOMY REPORT v4.14.1                 ║', 'color: #f80; font-weight: bold');
        console.log('%c╠════════════════════════════════════════════════════════════╣', 'color: #f80');
        console.log(`%c║ Run Time: ${formatTime(runTime).padEnd(10)} Ship: ${(a.ship || '?').padEnd(8)}`, 'color: #fff');

        // 1. DROP ECONOMY
        console.log('%c╠══ DROP ECONOMY ═══════════════════════════════════════════╣', 'color: #0ff');
        console.log(`%c║   Spawned:  ${spawned}`, 'color: #fff');
        console.log(`%c║   Collected: ${collected}`, 'color: #0f0');
        console.log(`%c║   Expired:  ${expired}`, expired > 0 ? 'color: #f00' : 'color: #fff');
        console.log(`%c║   Collection Rate: ${collectionRate}%`, parseFloat(collectionRate) < 50 ? 'color: #ff0' : 'color: #0f0');
        if (spawned > 0 && spawned !== collected + expired) {
            console.log(`%c║   In-flight: ${spawned - collected - expired}`, 'color: #888');
        }

        // 2. DROPS BY SOURCE
        console.log('%c╠══ DROPS BY SOURCE ════════════════════════════════════════╣', 'color: #0ff');
        const bySource = { enemy: 0, boss: 0 };
        for (const d of a.dropsSpawned) {
            bySource[d.source] = (bySource[d.source] || 0) + 1;
        }
        console.log(`%c║   Enemy: ${bySource.enemy}    Boss: ${bySource.boss}`, 'color: #fff');

        // 3. DROPS BY CATEGORY
        console.log('%c╠══ DROPS BY CATEGORY ══════════════════════════════════════╣', 'color: #0ff');
        const byCat = {};
        for (const d of a.dropsSpawned) {
            byCat[d.category] = (byCat[d.category] || 0) + 1;
        }
        const catStr = Object.entries(byCat).map(([c, n]) => `${c}: ${n}`).join('  ');
        console.log(`%c║   ${catStr || '(none)'}`, 'color: #fff');

        // Collected by type
        const collByType = {};
        for (const p of a.powerUpsCollected) {
            collByType[p.type] = (collByType[p.type] || 0) + 1;
        }
        const collStr = Object.entries(collByType).map(([t, c]) => `${t}:${c}`).join(' ');
        if (collStr) {
            console.log(`%c║   Collected: ${collStr}`, 'color: #0f0');
        }

        // 4. WEAPON TIMELINE
        console.log('%c╠══ WEAPON TIMELINE (last 30) ═════════════════════════════╣', 'color: #0ff');
        const timeline = a.weaponTimeline.slice(-30);
        if (timeline.length === 0) {
            console.log('%c║   (no events)                                            ║', 'color: #888');
        }
        for (const ev of timeline) {
            const t = formatTime(ev.time);
            const detail = ev.detail ? ` ${ev.detail}` : '';
            const color = ev.event.includes('EXPIRED') || ev.event === 'DEATH_PENALTY' ? 'color: #f44'
                : ev.event.includes('GODCHAIN') ? 'color: #f80'
                : 'color: #fff';
            console.log(`%c║   @${t}  ${ev.event}${detail}`, color);
        }

        // 5. MODIFIER ANALYSIS
        console.log('%c╠══ MODIFIER ANALYSIS ══════════════════════════════════════╣', 'color: #0ff');
        const totalFrames = a._totalTrackedFrames;
        const overlapFrames = a.modifierOverlapFrames;
        const overlapPct = totalFrames > 0 ? ((overlapFrames / totalFrames) * 100).toFixed(1) : '0.0';
        console.log(`%c║   Tracked Frames: ${totalFrames}`, 'color: #fff');
        console.log(`%c║   Overlap Frames (2+ mods): ${overlapFrames} (${overlapPct}%)`, 'color: #fff');

        // 6. GODCHAIN
        console.log('%c╠══ GODCHAIN ═══════════════════════════════════════════════╣', 'color: #0ff');
        const gcActs = a.godchainActivations;
        let gcTotal = a.godchainTotalDuration;
        // If still active, add current duration
        if (a._godchainStart) {
            gcTotal += (Date.now() - a._godchainStart);
        }
        const gcAvg = gcActs > 0 ? (gcTotal / gcActs / 1000).toFixed(1) : '0.0';
        console.log(`%c║   Activations: ${gcActs}`, 'color: #fff');
        console.log(`%c║   Total Duration: ${(gcTotal / 1000).toFixed(1)}s`, 'color: #fff');
        console.log(`%c║   Avg Duration: ${gcAvg}s`, 'color: #fff');

        // 7. WEAPON STATE FINAL
        console.log('%c╠══ WEAPON STATE (final) ═══════════════════════════════════╣', 'color: #0ff');
        const p = window.player;
        if (p) {
            console.log(`%c║   Weapon Level: ${p.weaponLevel ?? 1}`, 'color: #fff');
            console.log(`%c║   Special: ${p.special || 'none'} (${(p.specialTimer || 0).toFixed(1)}s)`, 'color: #fff');
            console.log(`%c║   GODCHAIN: ${p._godchainActive ? 'ACTIVE' : 'inactive'}`, p._godchainActive ? 'color: #f80; font-weight: bold' : 'color: #888');
        } else {
            console.log('%c║   (no player)                                            ║', 'color: #888');
        }

        // 8. ADAPTIVE SUPPRESSION (v4.19)
        console.log('%c╠══ ADAPTIVE SUPPRESSION (v4.19) ═══════════════════════════╣', 'color: #0ff');
        const suppressed = a.dropsSuppressed || [];
        const suppCount = suppressed.length;
        const totalAttempts = spawned + suppCount;
        const suppRate = totalAttempts > 0 ? ((suppCount / totalAttempts) * 100).toFixed(1) : '0.0';
        const avgPower = suppCount > 0
            ? (suppressed.reduce((s, d) => s + d.powerScore, 0) / suppCount).toFixed(2)
            : '0.00';
        console.log(`%c║   Suppressed: ${suppCount}  (of ${totalAttempts} attempts, ${suppRate}%)`, suppCount > 0 ? 'color: #ff0' : 'color: #fff');
        console.log(`%c║   Avg Power Score at suppression: ${avgPower}`, 'color: #fff');
        if (suppCount > 0) {
            const last5 = suppressed.slice(-5);
            for (const s of last5) {
                console.log(`%c║     @${formatTime(s.time)} score=${s.powerScore.toFixed(2)} wpn=${s.weaponLevel} spc=${s.hasSpecial}`, 'color: #888');
            }
        }

        // v4.59: APC section
        const cp = G.RunState ? G.RunState.cyclePower : null;
        if (cp && cp.score > 0) {
            console.log('%c╠══ ADAPTIVE POWER CALIBRATION ═══════════════════════════╣', 'color: #bb44ff');
            console.log(`%c║   Power Score: ${cp.score.toFixed(2)}  HP Mult: ${cp.hpMult.toFixed(3)}  Pity Adj: ${cp.pityAdj}`, 'color: #bb44ff');
        }

        console.log('%c╚════════════════════════════════════════════════════════════╝', 'color: #f80');
        console.log('');

        return this.getAnalyticsData();
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

        // Drop Balancer v5.19
        const _DS = window.Game.DropSystem;
        if (_DS && window.Game.Balance.ADAPTIVE_DROP_BALANCER && window.Game.Balance.ADAPTIVE_DROP_BALANCER.ENABLED) {
            console.log('║                                                            ║');
            console.log('║ DROP BALANCER                                              ║');
            console.log('║ ──────────────────────────────────────────────────────────║');
            const tSinceDrop = _DS._lastDropGameTime > 0
                ? ((a.runEnd ? (a.runEnd - a.runStart) / 1000 : 0) - _DS._lastDropGameTime).toFixed(1)
                : 'N/A';
            const killRate = _DS._recentKillTimes.length >= 3
                ? ((_DS._recentKillTimes.length - 1) / (_DS._recentKillTimes[_DS._recentKillTimes.length - 1] - _DS._recentKillTimes[0])).toFixed(2)
                : 'N/A';
            console.log(`║   Struggle drops: ${_DS._struggleDropCount}  Domination suppresses: ${_DS._dominationSuppressCount}`);
            console.log(`║   Last kill rate: ${killRate} k/s  Time since drop: ${tSinceDrop}s`);
            console.log(`║   Death grace until: ${_DS._deathGraceUntil > 0 ? _DS._deathGraceUntil.toFixed(1) + 's' : 'none'}`);
        }

        // Performance
        console.log('║                                                            ║');
        console.log('║ PERFORMANCE                                                ║');
        console.log('║ ──────────────────────────────────────────────────────────║');
        const p = this._perf;
        if (p._totalFrames === 0) {
            console.log('║   Profiler not active (run dbg.perf() before playing)     ║');
        } else {
            const total = p._totalFrames;
            const duration = (performance.now() - p._startTime) / 1000;
            const avgFps = total / duration;
            const avgFrame = p._sumFrame / total;
            const avgUpdate = p._sumUpdate / total;
            const avgDraw = p._sumDraw / total;

            // Histogram percentiles
            const hist = p._histogram;
            const pct = function(n) {
                var target = Math.floor(total * n / 100);
                var cumulative = 0;
                for (var i = 0; i < p._histBuckets; i++) {
                    cumulative += hist[i];
                    if (cumulative >= target) return (i + 0.5) * p._histStep;
                }
                return p._worstFrame;
            };

            // Verdict
            const jankPct = p._above16 / total;
            var verdict;
            if (avgFps >= 58 && jankPct < 0.001) verdict = 'EXCELLENT';
            else if (avgFps >= 55 && jankPct < 0.01) verdict = 'GREAT';
            else if (avgFps >= 50 && jankPct < 0.05) verdict = 'GOOD';
            else if (avgFps >= 40) verdict = 'NEEDS WORK';
            else verdict = 'POOR';

            const pk = p._entityPeaks;
            console.log(`║   Avg FPS: ${avgFps.toFixed(1)}    Frames: ${total}`);
            console.log(`║   Frame — avg: ${avgFrame.toFixed(2)}ms  P95: ${pct(95).toFixed(2)}ms  P99: ${pct(99).toFixed(2)}ms  worst: ${p._worstFrame.toFixed(1)}ms`);
            console.log(`║   Breakdown — update: ${avgUpdate.toFixed(2)}ms (${avgFrame > 0 ? (avgUpdate/avgFrame*100).toFixed(0) : 0}%)  draw: ${avgDraw.toFixed(2)}ms (${avgFrame > 0 ? (avgDraw/avgFrame*100).toFixed(0) : 0}%)`);
            console.log(`║   Jank — >16ms: ${p._above16} (${(p._above16/total*100).toFixed(2)}%)  >25ms: ${p._above25}  >33ms: ${p._above33}`);
            console.log(`║   GC Spikes (>8ms): ${p._gcPauses}`);
            console.log(`║   Peaks — enemies: ${pk.enemies}  eBullets: ${pk.eBullets}  pBullets: ${pk.pBullets}  particles: ${pk.particles}`);
            console.log(`║   Verdict: ${verdict}`);
        }

        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log('');

        // v5.0.8: Auto-append progression report if data exists
        if (a.progressionLog && a.progressionLog.length > 0) {
            this.progressionReport();
        }

        // v5.0.8: Auto-append contagion report if data exists
        if (a.contagionEvents && a.contagionEvents.length > 0) {
            this.contagionReport();
        }

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
        this.OVERLAY_ENABLED = false; // v4.16: overlay off by default (use dbg.showOverlay() if needed)
        this.categories.WAVE = true;
        this.categories.BOSS = true;
        this.categories.HORDE = true;
        this.categories.STATE = true;
        this.perf(); // Auto-start performance profiling
        this._perf.overlayEnabled = false; // v4.16: FPS counter off too — all data in console
        console.log('[DEBUG] Balance testing mode enabled (perf profiling auto-started)');
        console.log('[DEBUG] Overlays OFF — use dbg.showOverlay() or dbg.perfOverlay() to enable');
        console.log('[DEBUG] Use dbg.report() or dbg.powerUpReport() after game over to see analytics');
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

        // Semi-transparent background (dynamic height based on content)
        const overlayHeight = G._hudState ? 620 : 440;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(5, 100, 185, overlayHeight);

        // Border
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(5, 100, 185, overlayHeight);

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

        // Rank System
        const rankSys = G.RankSystem;
        if (rankSys && G.Balance?.RANK?.ENABLED) {
            y += 5;
            ctx.fillStyle = '#ffa500';
            ctx.fillText('─── RANK ───', 12, y); y += lineHeight;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`Rank: ${rankSys.getRankLabel()} (${rankSys.rank.toFixed(2)})`, 12, y); y += lineHeight;
            ctx.fillText(`FR Mult: ${rankSys.getFireRateMultiplier().toFixed(2)}x`, 12, y); y += lineHeight;
            ctx.fillText(`Count Mult: ${rankSys.getEnemyCountMultiplier().toFixed(2)}x`, 12, y); y += lineHeight;
        }

        // HUD State (v4.1.1)
        const hud = G._hudState;
        if (hud) {
            y += 5;
            ctx.fillStyle = '#00ff99';
            ctx.fillText('─── HUD ───', 12, y); y += lineHeight;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`Score: ${hud.score}  Lives: ${hud.lives}`, 12, y); y += lineHeight;
            ctx.fillText(`Graze: ${hud.grazeMeter.toFixed(0)}%  x${hud.grazeMultiplier.toFixed(1)}`, 12, y); y += lineHeight;
            ctx.fillText(`Streak: ${hud.killStreak} (best:${hud.bestStreak})`, 12, y); y += lineHeight;
            ctx.fillText(`Floats:${hud.floatingTexts} Perks:${hud.perkIcons}`, 12, y); y += lineHeight;

            // Player state
            const p = hud.player;
            if (p) {
                ctx.fillStyle = '#F7931A';
                ctx.fillText(`${p.type} [${p.x},${p.y}]`, 12, y); y += lineHeight;
                ctx.fillStyle = '#ffffff';
                const shieldTxt = p.shieldActive ? 'ACTIVE' : (p.shieldCooldown > 0 ? p.shieldCooldown.toFixed(1) + 's' : 'ready');
                ctx.fillText(`Shield: ${shieldTxt}`, 12, y); y += lineHeight;
                const hyperTxt = p.isHyper ? `ON ${p.hyperTimer.toFixed(1)}s` : (p.hyperAvailable ? 'READY' : 'charging');
                ctx.fillText(`HYPER: ${hyperTxt}`, 12, y); y += lineHeight;
                ctx.fillText(`Wpn:${p.weaponLevel} Spc:${p.special || '-'}`, 12, y); y += lineHeight;
                if (p.special) {
                    ctx.fillText(`  Timer: ${p.specialTimer.toFixed(1)}s`, 12, y); y += lineHeight;
                }
            }

            // Intermission state
            if (hud.gameState === 'INTERMISSION') {
                ctx.fillStyle = '#FFD700';
                ctx.fillText(`Countdown: ${hud.intermissionTimer.toFixed(1)}s`, 12, y); y += lineHeight;
                if (hud.intermissionMeme) {
                    const memePreview = hud.intermissionMeme.length > 18 ? hud.intermissionMeme.substring(0, 16) + '..' : hud.intermissionMeme;
                    ctx.fillText(`Meme: ${memePreview}`, 12, y); y += lineHeight;
                }
            }

            // Messages / Dialogue state
            ctx.fillStyle = '#cccccc';
            const msgTxt = hud.msgSystem.hasActive ? 'ACTIVE' : 'idle';
            const dlgTxt = hud.dialogue.visible ? 'VISIBLE' : 'hidden';
            ctx.fillText(`Msgs:${msgTxt} Dlg:${dlgTxt}`, 12, y); y += lineHeight;
        }

        // Session time
        const sessionTime = ((Date.now() - this.sessionStart) / 1000).toFixed(0);
        ctx.fillStyle = '#888888';
        y += 5;
        ctx.fillText(`Session: ${sessionTime}s`, 12, y);

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
     * v5.7: Instantly spawn a boss for testing. Usage:
     *   dbg.boss()        → FED (default)
     *   dbg.boss('bce')   → BCE
     *   dbg.boss('boj')   → BOJ
     *   dbg.boss('fed')   → FED
     * Must be in PLAY state (start a game first, then call from console).
     */
    boss(type) {
        const G = window.Game;
        const map = { fed: 'FEDERAL_RESERVE', bce: 'BCE', boj: 'BOJ' };
        const bossType = map[(type || 'fed').toLowerCase()] || 'FEDERAL_RESERVE';

        if (!G.GameState?.is('PLAY') && !G.GameState?.is('WARMUP')) {
            console.warn('[DEBUG] Start a game first (need PLAY state). Then call dbg.boss()');
            return;
        }

        // Force PLAY state if in WARMUP
        if (G.GameState?.is('WARMUP')) G._setGameState('PLAY');

        // Clear enemies
        if (G.enemies) { G.enemies.length = 0; }
        if (window.enemyBullets) { window.enemyBullets.length = 0; }

        // Override boss rotation to force specific type
        const origRotation = G.BOSS_ROTATION;
        G.BOSS_ROTATION = [bossType];
        window.marketCycle = 1; // Cycle 1 for consistent rotation

        // Spawn
        if (G._spawnBoss) {
            G._spawnBoss();
            console.log(`[DEBUG] 🎯 Boss spawned: ${bossType}. Use dbg.boss('bce') or dbg.boss('boj') to try others.`);
        } else {
            console.warn('[DEBUG] _spawnBoss not available. Is main.js loaded?');
        }

        // Restore rotation
        G.BOSS_ROTATION = origRotation;
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
            },
            hud: G._hudState || null
        };
    },

    // ========== HUD DEBUG COMMANDS v4.1.1 ==========

    /**
     * Quick setup for HUD debugging
     */
    debugHUD() {
        this.ENABLED = true;
        this.OVERLAY_ENABLED = true;
        this.categories.STATE = true;
        this.categories.PERK = true;
        this.categories.DROP = true;
        console.log('[DEBUG] HUD debugging enabled with overlay');
    },

    /**
     * Show full HUD state snapshot in console
     */
    hudStatus() {
        const G = window.Game;
        const hud = G._hudState;
        if (!hud) {
            console.log('[DEBUG] HUD state not available (overlay must run once first, try dbg.showOverlay())');
            return;
        }

        console.log('%c═══ HUD STATUS ═══', 'color: #00ff99; font-weight: bold; font-size: 14px');

        // Core game state
        console.log(`%c  State: ${hud.gameState}  Score: ${hud.score}  Lives: ${hud.lives}  Level: ${hud.level}`, 'color: #fff');

        // Graze & streak
        console.log(`%c  Graze: ${hud.grazeMeter.toFixed(1)}% (${hud.grazeCount} total) x${hud.grazeMultiplier.toFixed(2)}`, 'color: #0ff');
        console.log(`%c  Streak: ${hud.killStreak} (best: ${hud.bestStreak}) x${hud.killStreakMult.toFixed(2)}`, 'color: #ff0');

        // Floating elements
        console.log(`%c  Floating texts: ${hud.floatingTexts}  Perk icons: ${hud.perkIcons}`, 'color: #aaa');

        // Player
        const p = hud.player;
        if (p) {
            console.log(`%c  Player: ${p.type} at [${p.x}, ${p.y}]`, 'color: #F7931A; font-weight: bold');
            console.log(`    Shield: ${p.shieldActive ? 'ACTIVE' : (p.shieldCooldown > 0 ? 'cooldown ' + p.shieldCooldown.toFixed(1) + 's' : 'ready')}`);
            console.log(`    HYPER: ${p.isHyper ? 'ACTIVE ' + p.hyperTimer.toFixed(1) + 's' : (p.hyperAvailable ? 'READY' : 'charging')}`);
            console.log(`    Weapon: Lv${p.weaponLevel}  Special: ${p.special || 'none'}${p.special ? ' (' + p.specialTimer.toFixed(1) + 's)' : ''}`);
        } else {
            console.log(`%c  Player: NOT FOUND`, 'color: #f00');
        }

        // Intermission
        if (hud.gameState === 'INTERMISSION') {
            console.log(`%c  Countdown: ${hud.intermissionTimer.toFixed(1)}s`, 'color: #FFD700');
            console.log(`  Meme: "${hud.intermissionMeme || '(none)'}"`);
        }

        // Messages & dialogue
        console.log(`  Messages: ${hud.msgSystem.hasActive ? 'ACTIVE' : 'idle'}  Dialogue: ${hud.dialogue.visible ? 'VISIBLE' : 'hidden'}`);

        // Boss warning
        if (hud.bossWarningTimer > 0) {
            console.log(`%c  BOSS WARNING: ${hud.bossWarningTimer.toFixed(1)}s`, 'color: #f00; font-weight: bold');
        }

        // Perk cooldown / bullet cancel
        if (hud.perkCooldown > 0) console.log(`  Perk cooldown: ${hud.perkCooldown.toFixed(1)}s`);
        if (hud.bulletCancelStreak > 0) console.log(`  Cancel streak: ${hud.bulletCancelStreak}`);

        // HUD_MESSAGES toggles
        const hmsg = G.Balance?.HUD_MESSAGES;
        if (hmsg) {
            console.log('%c  ─── Message Toggles ───', 'color: #888');
            console.log(`    GAME_INFO:${hmsg.GAME_INFO ? '✓' : '✗'}  DANGER:${hmsg.DANGER ? '✓' : '✗'}  VICTORY:${hmsg.VICTORY ? '✓' : '✗'}`);
            console.log(`    PERK:${hmsg.PERK_NOTIFICATION ? '✓' : '✗'}  FLOAT:${hmsg.FLOATING_TEXT ? '✓' : '✗'}  MEME:${hmsg.MEME_POPUP ? '✓' : '✗'}`);
        }
    },

    /**
     * Toggle a HUD_MESSAGES flag at runtime
     * @param {string} key - e.g. 'FLOATING_TEXT', 'MEME_POPUP', 'DANGER'
     * @param {boolean} [value] - true/false (omit to toggle)
     */
    toggleHudMsg(key, value) {
        const hmsg = window.Game.Balance?.HUD_MESSAGES;
        if (!hmsg) {
            console.log('[DEBUG] Balance.HUD_MESSAGES not found');
            return;
        }
        const k = key.toUpperCase();
        if (!(k in hmsg)) {
            console.log(`[DEBUG] Unknown HUD_MESSAGES key: ${k}`);
            console.log(`  Available: ${Object.keys(hmsg).filter(k => typeof hmsg[k] === 'boolean').join(', ')}`);
            return;
        }
        hmsg[k] = value !== undefined ? !!value : !hmsg[k];
        console.log(`[DEBUG] HUD_MESSAGES.${k} = ${hmsg[k]}`);
    },

    // ========== WEAPON EVOLUTION v3.0 DEBUG COMMANDS ==========

    /**
     * Set player shot level (1-3)
     * @param {number} level - Shot level to set
     */
    setShot(level) {
        const player = window.player;
        if (!player) {
            console.log('[DEBUG] No player found');
            return;
        }
        const max = window.Game.Balance?.WEAPON_EVOLUTION?.MAX_WEAPON_LEVEL || 3;
        player.weaponLevel = Math.max(1, Math.min(max, level));
        console.log(`[DEBUG] Weapon level set to ${player.weaponLevel}`);
    },

    /**
     * Set active special
     * @param {string} type - 'HOMING', 'PIERCE', 'MISSILE', or null to clear
     */
    setSpecial(type) {
        const player = window.player;
        if (!player) {
            console.log('[DEBUG] No player found');
            return;
        }
        const WE = window.Game.Balance?.WEAPON_EVOLUTION;
        if (type === null || type === 'none' || type === '') {
            player.special = null;
            player.specialTimer = 0;
            console.log('[DEBUG] Special cleared');
        } else {
            player.special = type.toUpperCase();
            player.specialTimer = WE?.SPECIAL_DURATION || 12;
            console.log(`[DEBUG] Special set to ${player.special} (${player.specialTimer}s)`);
        }
    },

    /**
     * Max out weapon level (for testing)
     */
    maxWeapon() {
        const player = window.player;
        if (!player) {
            console.log('[DEBUG] No player found');
            return;
        }
        const WE = window.Game.Balance?.WEAPON_EVOLUTION;
        player.weaponLevel = WE?.MAX_WEAPON_LEVEL || 3;
        console.log(`[DEBUG] Weapon maxed: Level=${player.weaponLevel}`);
    },

    /**
     * Force GODCHAIN mode ON (set weapon level to max)
     */
    godchain() {
        const player = window.player;
        if (!player) {
            console.log('[DEBUG] No player found');
            return;
        }
        this.maxWeapon();
        console.log(`[DEBUG] GODCHAIN forced ON — weapon level ${player.weaponLevel}`);
    },

    /**
     * Show GODCHAIN status
     */
    godchainStatus() {
        const player = window.player;
        if (!player) {
            console.log('[DEBUG] No player found');
            return;
        }
        const active = player._godchainActive ? 'ACTIVE' : 'INACTIVE';
        console.log(`[DEBUG] GODCHAIN: ${active}`);
        console.log(`  Weapon Level: ${player.weaponLevel ?? 1} (need 5)`);
    },

    // ========== PERFORMANCE PROFILER v4.10 ==========

    _perf: {
        enabled: false,
        overlayEnabled: false,
        // Pre-allocated circular buffers (5 seconds @ 60fps) — for overlay/recent
        _bufSize: 300,
        _bufIdx: 0,
        _bufCount: 0,
        _frameTimes: null,   // Float64Array
        _updateTimes: null,  // Float64Array
        _drawTimes: null,    // Float64Array
        // Running stats (FULL SESSION)
        _totalFrames: 0,
        _gcPauses: 0,        // frames > 8ms (realistic threshold)
        _worstFrame: 0,
        _bestFrame: 999,
        _sumFrame: 0,
        _sumUpdate: 0,       // Session-wide update time sum
        _sumDraw: 0,         // Session-wide draw time sum
        // Session-wide jank counters
        _above16: 0,
        _above25: 0,
        _above33: 0,
        // Histogram for session-wide percentiles (200 buckets, 0.25ms each, covers 0-50ms)
        _histBuckets: 200,
        _histStep: 0.25,     // ms per bucket
        _histogram: null,    // Uint32Array
        // Entity peaks
        _entityPeaks: { enemies: 0, eBullets: 0, pBullets: 0, particles: 0 },
        // Entity density tracking (v4.48)
        _entitySamples: [],
        _entitySampleInterval: 30,
        _entityFrameCounter: 0,
        _entitySums: { enemies: 0, eBullets: 0, pBullets: 0, particles: 0 },
        _entitySampleCount: 0,
        // Timestamp
        _startTime: 0,
        // FPS counter
        _fpsFrames: 0,
        _fpsLastTime: 0,
        _fpsDisplay: 0,
        // Sorted frame buffer for recent percentiles
        _sortBuf: null,
    },

    /**
     * Initialize perf buffers (called once on first perf() call)
     */
    _initPerfBuffers() {
        const p = this._perf;
        if (!p._frameTimes) {
            p._frameTimes = new Float64Array(p._bufSize);
            p._updateTimes = new Float64Array(p._bufSize);
            p._drawTimes = new Float64Array(p._bufSize);
            p._sortBuf = new Float64Array(p._bufSize);
            p._histogram = new Uint32Array(p._histBuckets);
        }
    },

    /**
     * Start performance profiling
     * Usage: dbg.perf()
     */
    perf() {
        this._initPerfBuffers();
        const p = this._perf;
        p.enabled = true;
        p.overlayEnabled = true;
        p._bufIdx = 0;
        p._bufCount = 0;
        p._totalFrames = 0;
        p._gcPauses = 0;
        p._worstFrame = 0;
        p._bestFrame = 999;
        p._sumFrame = 0;
        p._sumUpdate = 0;
        p._sumDraw = 0;
        p._above16 = 0;
        p._above25 = 0;
        p._above33 = 0;
        p._histogram.fill(0);
        p._entityPeaks = { enemies: 0, eBullets: 0, pBullets: 0, particles: 0 };
        p._entitySamples = [];
        p._entityFrameCounter = 0;
        p._entitySums = { enemies: 0, eBullets: 0, pBullets: 0, particles: 0 };
        p._entitySampleCount = 0;
        p._startTime = performance.now();
        p._fpsLastTime = performance.now();
        p._fpsFrames = 0;
        p._fpsDisplay = 0;
        console.log('[PERF] Profiling started. Play normally, then run dbg.perfReport()');
        console.log('[PERF] FPS overlay enabled (top-right corner)');
    },

    /**
     * Stop profiling
     */
    perfStop() {
        this._perf.enabled = false;
        this._perf.overlayEnabled = false;
        console.log('[PERF] Profiling stopped.');
    },

    /**
     * Record one frame's timing data (called from main.js loop)
     * @param {number} frameMs - total frame time
     * @param {number} updateMs - update() time
     * @param {number} drawMs - draw() time
     * @param {object} counts - { enemies, eBullets, pBullets, particles }
     */
    perfFrame(frameMs, updateMs, drawMs, counts) {
        const p = this._perf;
        if (!p.enabled) return;

        // Store in circular buffer (for overlay/recent metrics)
        const idx = p._bufIdx;
        p._frameTimes[idx] = frameMs;
        p._updateTimes[idx] = updateMs;
        p._drawTimes[idx] = drawMs;
        p._bufIdx = (idx + 1) % p._bufSize;
        if (p._bufCount < p._bufSize) p._bufCount++;

        // Session-wide running stats
        p._totalFrames++;
        p._sumFrame += frameMs;
        p._sumUpdate += updateMs;
        p._sumDraw += drawMs;
        if (frameMs > p._worstFrame) p._worstFrame = frameMs;
        if (frameMs < p._bestFrame) p._bestFrame = frameMs;

        // Session-wide jank counters
        if (frameMs > 16.67) p._above16++;
        if (frameMs > 25) p._above25++;
        if (frameMs > 33.33) p._above33++;

        // GC pause detection: frame > 8ms (absolute threshold — our code usually <2ms)
        if (frameMs > 8) p._gcPauses++;

        // Histogram for session-wide percentiles
        var bucket = Math.min((frameMs / p._histStep) | 0, p._histBuckets - 1);
        p._histogram[bucket]++;

        // Entity peaks + density sampling
        if (counts) {
            const pk = p._entityPeaks;
            if (counts.enemies > pk.enemies) pk.enemies = counts.enemies;
            if (counts.eBullets > pk.eBullets) pk.eBullets = counts.eBullets;
            if (counts.pBullets > pk.pBullets) pk.pBullets = counts.pBullets;
            if (counts.particles > pk.particles) pk.particles = counts.particles;

            // v4.48: Entity density sampling
            p._entitySums.enemies += counts.enemies;
            p._entitySums.eBullets += counts.eBullets;
            p._entitySums.pBullets += counts.pBullets;
            p._entitySums.particles += counts.particles;
            p._entitySampleCount++;
            p._entityFrameCounter++;
            if (p._entityFrameCounter >= p._entitySampleInterval) {
                p._entityFrameCounter = 0;
                p._entitySamples.push({
                    t: ((performance.now() - p._startTime) / 1000).toFixed(1),
                    enemies: counts.enemies,
                    eBullets: counts.eBullets,
                    pBullets: counts.pBullets,
                    particles: counts.particles,
                    wave: window.currentLevel || 0,
                    level: window.marketCycle || 1
                });
            }
        }

        // FPS counter (update every 500ms)
        p._fpsFrames++;
        const now = performance.now();
        const fpsDelta = now - p._fpsLastTime;
        if (fpsDelta >= 500) {
            p._fpsDisplay = Math.round(p._fpsFrames / (fpsDelta / 1000));
            p._fpsFrames = 0;
            p._fpsLastTime = now;
        }
    },

    /**
     * Draw performance overlay (top-right corner)
     * Called from main.js draw when perf overlay is active
     */
    drawPerfOverlay(ctx, gameWidth) {
        const p = this._perf;
        if (!p.overlayEnabled || p._bufCount < 2) return;

        const w = 160;
        const h = 110;
        const x = (gameWidth || 600) - w - 5;
        const y = 5;

        ctx.save();

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        // FPS (big)
        const fps = p._fpsDisplay;
        ctx.font = 'bold 22px monospace';
        ctx.fillStyle = fps >= 55 ? '#00ff00' : fps >= 40 ? '#ffff00' : '#ff0000';
        ctx.fillText(fps + ' FPS', x + 8, y + 22);

        // Frame time stats
        const avg = p._totalFrames > 0 ? (p._sumFrame / p._totalFrames) : 0;
        const count = p._bufCount;
        let recent = 0;
        for (let i = 0; i < Math.min(30, count); i++) {
            const ri = (p._bufIdx - 1 - i + p._bufSize) % p._bufSize;
            recent += p._frameTimes[ri];
        }
        const recentAvg = Math.min(30, count) > 0 ? recent / Math.min(30, count) : 0;

        ctx.font = '10px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`frame: ${recentAvg.toFixed(1)}ms avg`, x + 8, y + 36);
        ctx.fillText(`worst: ${p._worstFrame.toFixed(1)}ms  gc: ${p._gcPauses}`, x + 8, y + 48);

        // Frame time bar graph (last 60 frames)
        const barY = y + 55;
        const barH = 45;
        const barCount = Math.min(60, count);
        const barW = (w - 16) / 60;

        // 16.67ms target line
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.4)';
        ctx.lineWidth = 1;
        const targetY = barY + barH - (16.67 / 33.33) * barH;
        ctx.beginPath();
        ctx.moveTo(x + 8, targetY);
        ctx.lineTo(x + w - 8, targetY);
        ctx.stroke();

        // Bars
        for (let i = 0; i < barCount; i++) {
            const ri = (p._bufIdx - barCount + i + p._bufSize) % p._bufSize;
            const ms = p._frameTimes[ri];
            const barHeight = Math.min((ms / 33.33) * barH, barH);
            const bx = x + 8 + i * barW;
            const by = barY + barH - barHeight;

            ctx.fillStyle = ms <= 16.67 ? '#00ff00' : ms <= 25 ? '#ffff00' : '#ff0000';
            ctx.fillRect(bx, by, Math.max(barW - 0.5, 1), barHeight);
        }

        // Labels
        ctx.fillStyle = '#888888';
        ctx.font = '8px monospace';
        ctx.fillText('16ms', x + w - 30, targetY - 2);
        ctx.fillText(`${p._totalFrames} frames`, x + 8, y + h - 2);

        ctx.restore();
    },

    /**
     * Generate detailed performance report
     * Usage: dbg.perfReport()
     */
    perfReport() {
        const p = this._perf;
        if (p._totalFrames === 0) {
            console.log('[PERF] No data. Run dbg.perf() first and play a game.');
            return;
        }

        const total = p._totalFrames;
        const duration = (performance.now() - p._startTime) / 1000;
        const avg = p._sumFrame / total;

        // Compute session-wide percentiles from histogram
        const hist = p._histogram;
        const pct = function(n) {
            var target = Math.floor(total * n / 100);
            var cumulative = 0;
            for (var i = 0; i < p._histBuckets; i++) {
                cumulative += hist[i];
                if (cumulative >= target) return (i + 0.5) * p._histStep;
            }
            return p._worstFrame;
        };

        // Session-wide update/draw breakdown
        const avgUpdate = p._sumUpdate / total;
        const avgDraw = p._sumDraw / total;

        console.log('');
        console.log('%c╔════════════════════════════════════════════════════════════╗', 'color: #0f0');
        console.log('%c║         PERFORMANCE PROFILER REPORT v4.10.1               ║', 'color: #0f0; font-weight: bold');
        console.log('%c╠════════════════════════════════════════════════════════════╣', 'color: #0f0');

        console.log(`%c║ Duration: ${duration.toFixed(1)}s    Total Frames: ${total}`, 'color: #fff');
        console.log(`%c║ Avg FPS: ${(total / duration).toFixed(1)}    Last FPS: ${p._fpsDisplay}`, 'color: #fff');

        console.log('%c╠══ FRAME TIME (full session) ══════════════════════════════╣', 'color: #0ff');
        console.log(`%c║   Average:  ${avg.toFixed(2)} ms`, 'color: #fff');
        console.log(`%c║   Best:     ${p._bestFrame.toFixed(2)} ms`, 'color: #0f0');
        console.log(`%c║   Worst:    ${p._worstFrame.toFixed(2)} ms`, p._worstFrame > 33 ? 'color: #f00' : 'color: #ff0');
        console.log(`%c║   P50:      ${pct(50).toFixed(2)} ms (median)`, 'color: #fff');
        console.log(`%c║   P95:      ${pct(95).toFixed(2)} ms`, pct(95) > 16 ? 'color: #ff0' : 'color: #fff');
        console.log(`%c║   P99:      ${pct(99).toFixed(2)} ms (1% worst)`, pct(99) > 25 ? 'color: #f00' : 'color: #fff');

        console.log('%c╠══ TIME BREAKDOWN (full session) ══════════════════════════╣', 'color: #0ff');
        console.log(`%c║   Update: ${avgUpdate.toFixed(2)} ms (${avg > 0 ? (avgUpdate/avg*100).toFixed(0) : 0}%)`, 'color: #fff');
        console.log(`%c║   Draw:   ${avgDraw.toFixed(2)} ms (${avg > 0 ? (avgDraw/avg*100).toFixed(0) : 0}%)`, 'color: #fff');
        console.log(`%c║   Other:  ${Math.max(0, avg - avgUpdate - avgDraw).toFixed(2)} ms (${avg > 0 ? (Math.max(0, avg-avgUpdate-avgDraw)/avg*100).toFixed(0) : 0}%)`, 'color: #888');

        console.log('%c╠══ JANK ANALYSIS (full session) ═══════════════════════════╣', 'color: #0ff');
        console.log(`%c║   Frames >16.7ms (miss 60fps): ${p._above16}/${total} (${(p._above16/total*100).toFixed(2)}%)`, p._above16/total > 0.01 ? 'color: #ff0' : 'color: #0f0');
        console.log(`%c║   Frames >25ms (miss 40fps):   ${p._above25}/${total} (${(p._above25/total*100).toFixed(2)}%)`, p._above25 > 0 ? 'color: #f00' : 'color: #0f0');
        console.log(`%c║   Frames >33ms (miss 30fps):   ${p._above33}/${total} (${(p._above33/total*100).toFixed(2)}%)`, p._above33 > 0 ? 'color: #f00' : 'color: #0f0');
        console.log(`%c║   Spikes >8ms (GC/system):     ${p._gcPauses}`, p._gcPauses > 20 ? 'color: #ff0' : 'color: #0f0');

        console.log('%c╠══ ENTITY PEAKS ═══════════════════════════════════════════╣', 'color: #0ff');
        const pk = p._entityPeaks;
        console.log(`%c║   Enemies:         ${pk.enemies}`, 'color: #fff');
        console.log(`%c║   Enemy Bullets:   ${pk.eBullets}`, 'color: #fff');
        console.log(`%c║   Player Bullets:  ${pk.pBullets}`, 'color: #fff');
        console.log(`%c║   Particles:       ${pk.particles}`, 'color: #fff');

        // Verdict based on session-wide data
        console.log('%c╠══ VERDICT ════════════════════════════════════════════════╣', 'color: #0ff');
        const avgFps = total / duration;
        const jankPct = p._above16 / total;
        if (avgFps >= 58 && jankPct < 0.001) {
            console.log('%c║   🟢 EXCELLENT — Smooth 60fps, virtually no jank', 'color: #0f0; font-weight: bold');
        } else if (avgFps >= 55 && jankPct < 0.01) {
            console.log('%c║   🟢 GREAT — Solid 60fps with rare dips', 'color: #0f0; font-weight: bold');
        } else if (avgFps >= 50 && jankPct < 0.05) {
            console.log('%c║   🟡 GOOD — Mostly smooth, occasional drops', 'color: #ff0; font-weight: bold');
        } else if (avgFps >= 40) {
            console.log('%c║   🟠 NEEDS WORK — Noticeable frame drops', 'color: #f80; font-weight: bold');
        } else {
            console.log('%c║   🔴 POOR — Significant performance issues', 'color: #f00; font-weight: bold');
        }

        console.log('%c╚════════════════════════════════════════════════════════════╝', 'color: #0f0');
        console.log('');
    },

    /**
     * Toggle hitbox debug overlay (v4.22)
     * Shows collision circles for all bullets, enemies, and player
     */
    hitboxes() {
        if (!window.Game.BulletSystem) {
            console.log('[DEBUG] BulletSystem not loaded');
            return;
        }
        window.Game.BulletSystem.debugEnabled = !window.Game.BulletSystem.debugEnabled;
        console.log(`[DEBUG] Hitbox overlay: ${window.Game.BulletSystem.debugEnabled ? 'ON' : 'OFF'}`);
    },

    /**
     * Show current weapon evolution state
     */
    weaponStatus() {
        const player = window.player;
        if (!player) {
            console.log('[DEBUG] No player found');
            return;
        }
        console.log('[DEBUG] Weapon Evolution State:');
        console.log(`  Weapon Level: ${player.weaponLevel ?? 1}`);
        console.log(`  Modifiers:`);
        console.log(`    Special: ${player.special || 'none'}${player.special ? ' (' + (player.specialTimer || 0).toFixed(1) + 's)' : ''}`);
        console.log(`    GODCHAIN: ${player._godchainActive ? 'ACTIVE' : 'inactive'}`);
        console.log(`  Special: ${player.special || 'none'} (${(player.specialTimer || 0).toFixed(1)}s)`);
    },

    /**
     * Formation audit — console-only report (no overlay)
     * Usage: dbg.formations()
     */
    formations() {
        const G = window.Game;
        const WM = G.WaveManager;
        if (!WM) { console.log('[DEBUG] WaveManager not found'); return; }

        const Balance = G.Balance;
        const FORMATIONS = Balance?.WAVE_DEFINITIONS?.FORMATIONS || {};
        const names = Object.keys(FORMATIONS);
        const testWidths = [360, 414, 768];
        const testCount = 12;
        const spacingMin = Balance?.FORMATION?.SPACING_MIN || 62;
        const issues = [];

        console.log(`%c[FORMATION AUDIT] ${names.length} formations × ${testWidths.length} widths (n=${testCount})`, 'color:#f39c12;font-weight:bold');

        names.forEach(name => {
            const row = [];
            testWidths.forEach(simW => {
                const positions = WM.generateFormation(name, testCount, simW);
                if (!positions || positions.length === 0) { row.push(`${simW}px: EMPTY`); return; }

                let offScreen = 0;
                let minSpacing = Infinity;
                for (let i = 0; i < positions.length; i++) {
                    const p = positions[i];
                    if (p.x < 0 || p.x > simW) offScreen++;
                    for (let j = i + 1; j < positions.length; j++) {
                        const q = positions[j];
                        const d = Math.sqrt((p.x - q.x) ** 2 + (p.y - q.y) ** 2);
                        if (d < minSpacing) minSpacing = d;
                    }
                }

                const tag = (offScreen > 0 || minSpacing < spacingMin) ? '!!' : 'OK';
                row.push(`${simW}px: n=${positions.length} spc=${Math.round(minSpacing)} ${offScreen > 0 ? 'OFF=' + offScreen : ''} [${tag}]`);
                if (offScreen > 0) issues.push(`${name}@${simW}: ${offScreen} off-screen`);
                if (minSpacing < spacingMin) issues.push(`${name}@${simW}: minSpacing=${Math.round(minSpacing)} < ${spacingMin}`);
            });
            console.log(`  ${name.padEnd(18)} ${row.join('  |  ')}`);
        });

        if (issues.length > 0) {
            console.warn(`%c[AUDIT] ${issues.length} issues:`, 'color:#e74c3c;font-weight:bold');
            issues.forEach(i => console.warn('  ' + i));
        } else {
            console.log('%c[AUDIT] All formations OK', 'color:#2ecc71;font-weight:bold');
        }
    },

    /**
     * v4.48: Entity Density Report
     * Usage: dbg.entityReport()
     */
    entityReport() {
        const p = this._perf;
        if (!p._entitySampleCount) {
            console.log('[ENTITY] No data. Run dbg.perf() first and play a game.');
            return;
        }
        const pk = p._entityPeaks;
        const sc = p._entitySampleCount;
        const avg = {
            enemies: (p._entitySums.enemies / sc).toFixed(1),
            eBullets: (p._entitySums.eBullets / sc).toFixed(1),
            pBullets: (p._entitySums.pBullets / sc).toFixed(1),
            particles: (p._entitySums.particles / sc).toFixed(1)
        };

        // Wave grouping
        const waveGroups = {};
        p._entitySamples.forEach(s => {
            const w = s.wave;
            const key = w <= 2 ? 'W1-W2' : w <= 4 ? 'W3-W4' : 'W5+Boss';
            if (!waveGroups[key]) waveGroups[key] = { enemies: 0, eBullets: 0, pBullets: 0, count: 0 };
            waveGroups[key].enemies += s.enemies;
            waveGroups[key].eBullets += s.eBullets;
            waveGroups[key].pBullets += s.pBullets;
            waveGroups[key].count++;
        });

        // Hot spots (>100 total entities)
        const hotSpots = p._entitySamples.filter(s =>
            s.enemies + s.eBullets + s.pBullets + s.particles > 100
        ).map(s => ({
            t: s.t, wave: s.wave,
            total: s.enemies + s.eBullets + s.pBullets + s.particles,
            en: s.enemies, eb: s.eBullets, pb: s.pBullets
        }));

        // Player bullet excess frames
        const pBulHigh100 = p._entitySamples.filter(s => s.pBullets > 100).length;
        const pBulHigh200 = p._entitySamples.filter(s => s.pBullets > 200).length;
        const totalSamples = p._entitySamples.length;

        const L = '║';
        const line = (txt) => console.log(`${L}  ${txt.padEnd(56)}${L}`);
        console.log('%c╔══════════════════════════════════════════════════════════╗', 'color:#3498db');
        console.log('%c║           ENTITY DENSITY REPORT                         ║', 'color:#3498db;font-weight:bold');
        console.log('%c╠══ SESSION AVERAGES ══════════════════════════════════════╣', 'color:#3498db');
        line(`Enemies:     ${avg.enemies} avg    ${pk.enemies} peak`);
        line(`E.Bullets:   ${avg.eBullets} avg   ${pk.eBullets} peak`);
        line(`P.Bullets:   ${avg.pBullets} avg   ${pk.pBullets} peak`);
        line(`Particles:   ${avg.particles} avg   ${pk.particles} peak`);
        console.log('%c╠══ DENSITY BY WAVE ═══════════════════════════════════════╣', 'color:#3498db');
        ['W1-W2', 'W3-W4', 'W5+Boss'].forEach(key => {
            const g = waveGroups[key];
            if (g && g.count > 0) {
                line(`${key}:  enemies ${(g.enemies/g.count).toFixed(0)}  eBul ${(g.eBullets/g.count).toFixed(0)}  pBul ${(g.pBullets/g.count).toFixed(0)}`);
            }
        });
        console.log('%c╠══ HOT SPOTS (>100 total entities) ═══════════════════════╣', 'color:#3498db');
        if (hotSpots.length === 0) {
            line('None detected');
        } else {
            hotSpots.slice(0, 10).forEach(h => {
                const warn = h.total > 300 ? '  !!' : '';
                line(`@${h.t}s  W${h.wave} -- ${h.en}en + ${h.eb}eb + ${h.pb}pb = ${h.total} total${warn}`);
            });
            if (hotSpots.length > 10) line(`... and ${hotSpots.length - 10} more`);
        }
        console.log('%c╠══ PLAYER BULLET ANALYSIS ════════════════════════════════╣', 'color:#3498db');
        line(`Avg pBullets: ${avg.pBullets}`);
        line(`>100 pBul samples: ${pBulHigh100} (${totalSamples ? ((pBulHigh100/totalSamples)*100).toFixed(1) : 0}%)`);
        line(`>200 pBul samples: ${pBulHigh200} (${totalSamples ? ((pBulHigh200/totalSamples)*100).toFixed(1) : 0}%)`);
        console.log('%c╚══════════════════════════════════════════════════════════╝', 'color:#3498db');
    },

    // ═══════════════════════════════════════════════════════════
    // ARCADE: ROGUE PROTOCOL DEBUG UTILITIES (v5.8.0)
    // ═══════════════════════════════════════════════════════════

    /**
     * dbg.arcade() — Full Arcade status report
     */
    arcade() {
        const G = window.Game;
        const rs = G.RunState;
        if (!rs) { console.log('[DEBUG] RunState not loaded'); return; }

        const isArcade = G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode();
        const ab = rs.arcadeBonuses;
        const mods = rs.arcadeModifiers;

        console.log('');
        console.log('%c╔══════════════════════════════════════════════════════════╗', 'color:#bb44ff');
        console.log('%c║            ARCADE: ROGUE PROTOCOL STATUS                ║', 'color:#bb44ff');
        console.log('%c╠══════════════════════════════════════════════════════════╣', 'color:#bb44ff');
        const l = (t) => console.log(`%c║ ${t.padEnd(56)}║`, 'color:#bb44ff');

        l(`Mode: ${isArcade ? 'ARCADE' : 'STORY'}`);
        l(`Cycle: ${window.marketCycle || 1}  Level: ${window.currentLevel || 1}`);
        l('');
        l('--- COMBO ---');
        l(`Combo: ${rs.comboCount}  Timer: ${rs.comboTimer.toFixed(1)}s  Mult: ${rs.comboMult.toFixed(2)}x`);
        l(`Best Combo: ${rs.bestCombo}  Picks: ${rs.arcadeModifierPicks}`);
        l('');
        l('--- MODIFIERS (' + mods.length + ') ---');
        if (mods.length === 0) {
            l('  (none)');
        } else {
            const counts = {};
            mods.forEach(id => counts[id] = (counts[id] || 0) + 1);
            Object.keys(counts).forEach(id => {
                const mod = G.ArcadeModifiers.getModifierById(id);
                const name = mod ? mod.name : id;
                const cat = mod ? mod.category : '?';
                l(`  ${name} x${counts[id]} [${cat}]`);
            });
        }
        l('');
        l('--- BONUSES ---');
        l(`FireRate: ${ab.fireRateMult.toFixed(2)}x  Damage: ${ab.damageMult.toFixed(2)}x`);
        l(`Pierce+: ${ab.piercePlus}  Speed: ${ab.speedMult.toFixed(2)}x`);
        l(`Score: ${ab.scoreMult.toFixed(2)}x  DropRate: ${ab.dropRateMult.toFixed(2)}x`);
        l(`EnemyHP: ${ab.enemyHpMult.toFixed(2)}x  EnemyBulSpd: ${ab.enemyBulletSpeedMult.toFixed(2)}x`);
        l(`Crit: ${(ab.critChance * 100).toFixed(0)}%  GrazeRadius: ${ab.grazeRadiusMult.toFixed(2)}x`);
        l(`Pity: ${ab.pityMult.toFixed(2)}x  NanoShield: ${ab.nanoShieldCooldown > 0 ? ab.nanoShieldTimer.toFixed(0) + 's' : 'OFF'}`);
        l(`LastStand: ${ab.lastStandAvailable ? 'READY' : 'used/off'}  Volatile: ${ab.volatileRounds}`);
        l(`Chain: ${ab.chainLightning}  NoShield: ${ab.noShieldDrops}`);
        console.log('%c╚══════════════════════════════════════════════════════════╝', 'color:#bb44ff');
    },

    /**
     * dbg.arcadeMod(id) — Force-apply a modifier by ID
     * Usage: dbg.arcadeMod('OVERCLOCK')  dbg.arcadeMod('BERSERKER')
     */
    arcadeMod(id) {
        const G = window.Game;
        if (!G.ArcadeModifiers) { console.log('[DEBUG] ArcadeModifiers not loaded'); return; }
        const mod = G.ArcadeModifiers.getModifierById(id);
        if (!mod) {
            console.log(`[DEBUG] Unknown modifier: "${id}". Available:`);
            G.ArcadeModifiers.MODIFIER_POOL.forEach(m => console.log(`  ${m.id} — ${m.name} [${m.category}]`));
            return;
        }
        G.ArcadeModifiers.applyModifier(id);
        console.log(`[DEBUG] Applied modifier: ${mod.name} [${mod.category}]`);
        // Show updated bonuses
        this.arcade();
    },

    /**
     * dbg.arcadePick(count) — Force-open modifier choice screen
     * Usage: dbg.arcadePick()  dbg.arcadePick(2)
     */
    arcadePick(count) {
        const G = window.Game;
        if (!G.ModifierChoiceScreen) { console.log('[DEBUG] ModifierChoiceScreen not loaded'); return; }
        const n = count || 3;
        G.ModifierChoiceScreen.show(n, () => {
            console.log('[DEBUG] Modifier picked! Updated state:');
            this.arcade();
        });
        console.log(`[DEBUG] Opened modifier choice (${n} cards)`);
    },

    /**
     * dbg.arcadeCombo(n) — Set combo to N instantly
     * Usage: dbg.arcadeCombo(50)
     */
    arcadeCombo(n) {
        const rs = window.Game.RunState;
        if (!rs) { console.log('[DEBUG] RunState not loaded'); return; }
        const combo = n || 50;
        rs.comboCount = combo;
        rs.comboTimer = 3.0;
        rs.comboMult = Math.min(5.0, 1.0 + combo * 0.05);
        rs.comboDecayAnim = 0;
        if (combo > rs.bestCombo) rs.bestCombo = combo;
        console.log(`[DEBUG] Combo set to ${combo} (mult: ${rs.comboMult.toFixed(2)}x, timer: 3.0s)`);
    },

    /**
     * dbg.arcadeMax() — Apply all offensive modifiers for max power testing
     */
    arcadeMax() {
        const G = window.Game;
        if (!G.ArcadeModifiers) { console.log('[DEBUG] ArcadeModifiers not loaded'); return; }
        ['OVERCLOCK', 'OVERCLOCK', 'ARMOR_PIERCING', 'CRITICAL_HIT', 'VOLATILE_ROUNDS', 'CHAIN_LIGHTNING'].forEach(id => {
            G.ArcadeModifiers.applyModifier(id);
        });
        console.log('[DEBUG] Applied max offense loadout: OVERCLOCK x2, ARMOR_PIERCING, CRITICAL_HIT, VOLATILE_ROUNDS, CHAIN_LIGHTNING');
        this.arcade();
    },

    /**
     * dbg.arcadeTank() — Apply all defensive modifiers
     */
    arcadeTank() {
        const G = window.Game;
        if (!G.ArcadeModifiers) { console.log('[DEBUG] ArcadeModifiers not loaded'); return; }
        ['NANO_SHIELD', 'EXTRA_LIFE', 'EXTRA_LIFE', 'BULLET_TIME', 'BULLET_TIME', 'WIDER_GRAZE', 'EMERGENCY_HEAL'].forEach(id => {
            G.ArcadeModifiers.applyModifier(id);
        });
        if (G.adjustLives) G.adjustLives(2); // Apply extra lives immediately
        console.log('[DEBUG] Applied max defense loadout: NANO_SHIELD, EXTRA_LIFE x2, BULLET_TIME x2, WIDER_GRAZE, EMERGENCY_HEAL');
        this.arcade();
    },

    /**
     * dbg.arcadeWild() — Apply all wild modifiers for chaos testing
     */
    arcadeWild() {
        const G = window.Game;
        if (!G.ArcadeModifiers) { console.log('[DEBUG] ArcadeModifiers not loaded'); return; }
        ['DOUBLE_SCORE', 'BULLET_HELL', 'SPEED_DEMON'].forEach(id => {
            G.ArcadeModifiers.applyModifier(id);
        });
        console.log('[DEBUG] Applied wild loadout: DOUBLE_SCORE, BULLET_HELL, SPEED_DEMON');
        this.arcade();
    },

    /**
     * dbg.arcadeReset() — Clear all modifiers and reset bonuses
     */
    arcadeReset() {
        const rs = window.Game.RunState;
        if (!rs) { console.log('[DEBUG] RunState not loaded'); return; }
        rs.arcadeModifiers = [];
        rs.arcadeModifierPicks = 0;
        rs.comboCount = 0;
        rs.comboTimer = 0;
        rs.comboMult = 1.0;
        rs.bestCombo = 0;
        rs.comboDecayAnim = 0;
        if (window.Game.ArcadeModifiers) window.Game.ArcadeModifiers.recalculateBonuses();
        console.log('[DEBUG] Arcade state reset — all modifiers cleared');
    },

    /**
     * dbg.arcadeCycle(n) — Jump to cycle N for testing post-C3 scaling
     * Usage: dbg.arcadeCycle(5)
     */
    arcadeCycle(n) {
        const cycle = n || 4;
        window.marketCycle = cycle;
        if (window.Game.RunState) window.Game.RunState.marketCycle = cycle;
        const diff = window.Game.Balance.calculateDifficulty(window.currentLevel || 1, cycle);
        console.log(`[DEBUG] Market cycle set to ${cycle}. Difficulty: ${diff.toFixed(3)}`);
        console.log(`[DEBUG] Post-C3 scaling: ${cycle > 3 ? '+' + ((cycle - 3) * 20) + '% difficulty' : 'N/A (within C1-C3)'}`);
    },

    /**
     * dbg.arcadeHelp() — Show all arcade debug commands
     */
    arcadeHelp() {
        console.log('');
        console.log('%c ARCADE DEBUG COMMANDS ', 'background:#bb44ff;color:#000;font-weight:bold;padding:2px 8px');
        console.log('  dbg.arcade()          — Full status report');
        console.log('  dbg.arcadeMod(id)     — Apply modifier by ID');
        console.log('  dbg.arcadePick(n)     — Open modifier choice (2 or 3 cards)');
        console.log('  dbg.arcadeCombo(n)    — Set combo counter to N');
        console.log('  dbg.arcadeMax()       — Apply all offense modifiers');
        console.log('  dbg.arcadeTank()      — Apply all defense modifiers');
        console.log('  dbg.arcadeWild()      — Apply all wild modifiers');
        console.log('  dbg.arcadeReset()     — Clear all modifiers');
        console.log('  dbg.arcadeCycle(n)    — Jump to cycle N');
        console.log('  dbg.arcadeHelp()      — This help');
        console.log('');
        console.log('  Modifier IDs: OVERCLOCK, ARMOR_PIERCING, VOLATILE_ROUNDS, CRITICAL_HIT,');
        console.log('    CHAIN_LIGHTNING, NANO_SHIELD, EXTRA_LIFE, BULLET_TIME, WIDER_GRAZE,');
        console.log('    EMERGENCY_HEAL, DOUBLE_SCORE, BULLET_HELL, SPEED_DEMON, JACKPOT, BERSERKER');
    }
};

// Shortcut alias
window.dbg = window.Game.Debug;

// Console helper message
console.log('[DEBUG] DebugSystem loaded. Commands: dbg.stats(), dbg.showOverlay(), dbg.perf(), dbg.perfReport(), dbg.entityReport(), dbg.boss(type), dbg.debugBoss(), dbg.debugHUD(), dbg.hudStatus(), dbg.toggleHudMsg(key), dbg.maxWeapon(), dbg.weaponStatus(), dbg.godchain(), dbg.godchainStatus(), dbg.powerUpReport(), dbg.progressionReport(), dbg.contagionReport(), dbg.hitboxes(), dbg.formations(), dbg.arcade(), dbg.arcadeHelp()');
