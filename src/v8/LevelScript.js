window.Game = window.Game || {};

/**
 * LevelScript v8 — Scripted spawn table for Gradius-feel (burst-based).
 *
 * Bypasses WaveManager. Spawns enemies from the top of the screen at scripted
 * absolute timestamps. Triggers the v6 boss at BOSS_AT_S.
 *
 * Burst format: each entry has `lanes: [a,b,c]` (array of 0..1 lane positions).
 * Single-lane `lane: X` still works for back-compat.
 * Active only when G.Balance.V8_MODE.ENABLED === true.
 */
(function() {
    'use strict';
    const G = window.Game;

    G.LevelScript = {
        // Burst spawn table — sorted by at_s ASCENDING (mandatory).
        // lanes[] = 0..1 positions across screen width. Each lane = 1 enemy.
        // currencies: array matched by lane index, single string = all same.
        SCRIPT: [
            // 0-30s OPENING — 3-enemy V/line bursts ~every 4s, WEAK tier
            { at_s: 1.5,  currencies: '¥',              lanes: [0.2, 0.5, 0.8] },
            { at_s: 5.5,  currencies: ['₽','₹','¥'],    lanes: [0.15, 0.5, 0.85] },
            { at_s: 9.5,  currencies: '₹',              lanes: [0.3, 0.7],        pattern: 'SINE' },
            { at_s: 13.0, currencies: ['¥','₽','¥','₹'],lanes: [0.15, 0.4, 0.6, 0.85] },
            { at_s: 17.5, currencies: ['₹','₽','₹'],    lanes: [0.25, 0.5, 0.75], pattern: 'SINE' },
            { at_s: 21.5, currencies: '¥',              lanes: [0.1, 0.3, 0.5, 0.7, 0.9] },
            { at_s: 26.0, currencies: ['₽','₹','¥','₽'],lanes: [0.2, 0.4, 0.6, 0.8] },

            // 30-60s BUILDUP — MEDIUM tier, mix SINE+DIVE, 4-5/burst
            { at_s: 31.5, currencies: ['€','£','€'],    lanes: [0.25, 0.5, 0.75], pattern: 'SINE' },
            { at_s: 34.5, currencies: ['¥','₹','¥','₹'],lanes: [0.15, 0.4, 0.6, 0.85] },
            { at_s: 37.5, currencies: ['£','€','£'],    lanes: [0.3, 0.5, 0.7],   pattern: 'SINE' },
            { at_s: 40.5, currencies: ['₺','₣','₺','₣','₺'], lanes: [0.1, 0.3, 0.5, 0.7, 0.9] },
            { at_s: 44.0, currencies: ['€','£','€','£'],lanes: [0.2, 0.4, 0.6, 0.8], pattern: 'SINE' },
            { at_s: 47.5, currencies: '₽',              lanes: [0.15, 0.35, 0.55, 0.75, 0.95] },
            { at_s: 51.0, currencies: ['€','₣','£','€'],lanes: [0.25, 0.45, 0.65, 0.85], pattern: 'SINE' },
            { at_s: 54.5, currencies: ['₺','£','₺','£'],lanes: [0.1, 0.35, 0.6, 0.9] },
            { at_s: 58.0, currencies: ['€','£','₣','€','£'], lanes: [0.2, 0.35, 0.5, 0.65, 0.8], pattern: 'SINE' },

            // 60-90s — denser mix, HOVER compare
            { at_s: 62.0, currencies: ['£','€','£','€'],lanes: [0.15, 0.4, 0.6, 0.85] },
            { at_s: 65.0, currencies: '€',              lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
            { at_s: 67.5, currencies: ['₺','₣','₺','₣'],lanes: [0.2, 0.4, 0.6, 0.8], pattern: 'SINE' },
            { at_s: 70.5, currencies: ['£','€','£','€','£'], lanes: [0.1, 0.3, 0.5, 0.7, 0.9] },
            { at_s: 73.5, currencies: ['€','£'],        lanes: [0.35, 0.65],      pattern: 'HOVER' },
            { at_s: 76.0, currencies: ['₣','€','₣','€','₣'], lanes: [0.15, 0.35, 0.5, 0.65, 0.85], pattern: 'SINE' },
            { at_s: 79.0, currencies: '£',              lanes: [0.2, 0.4, 0.6, 0.8] },

            // 90-130s ESCALATION — STRONG tier arrives + SWOOP from sides
            { at_s: 82.0, currencies: ['$','元','$'],   lanes: [0.25, 0.5, 0.75] },
            { at_s: 85.0, currencies: ['Ⓒ','€','Ⓒ'],  lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
            { at_s: 88.0, currencies: '$',              lanes: [0.15, 0.4, 0.6, 0.85] },
            { at_s: 90.5, currencies: ['元','€','元','€'], lanes: [0.2, 0.4, 0.6, 0.8], pattern: 'SINE' },
            { at_s: 93.5, currencies: '$',              lanes: [0.1, 0.9],        pattern: 'SWOOP' }, // flanking swoops
            { at_s: 95.0, currencies: ['Ⓒ','$','Ⓒ','$'], lanes: [0.15, 0.4, 0.6, 0.85] },
            { at_s: 98.0, currencies: ['€','£','€'],    lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
            { at_s: 101.0, currencies: ['$','元','$','元','$'], lanes: [0.1, 0.3, 0.5, 0.7, 0.9] },
            { at_s: 104.5, currencies: 'Ⓒ',             lanes: [0.25, 0.45, 0.65, 0.85], pattern: 'SINE' },
            { at_s: 107.0, currencies: '元',            lanes: [0.15, 0.85],      pattern: 'SWOOP' },
            { at_s: 108.5, currencies: ['$','Ⓒ','$','Ⓒ'], lanes: [0.2, 0.4, 0.6, 0.8] },
            { at_s: 112.0, currencies: ['€','£'],       lanes: [0.35, 0.65],      pattern: 'HOVER' },
            { at_s: 114.5, currencies: ['$','元','$','元','$'], lanes: [0.1, 0.3, 0.5, 0.7, 0.9], pattern: 'SINE' },
            { at_s: 118.0, currencies: 'Ⓒ',             lanes: [0.2, 0.4, 0.6, 0.8] },
            { at_s: 121.0, currencies: ['$','元'],      lanes: [0.1, 0.9],        pattern: 'SWOOP' },
            { at_s: 123.0, currencies: ['元','Ⓒ','元','Ⓒ','元'], lanes: [0.15, 0.35, 0.5, 0.65, 0.85] },
            { at_s: 126.0, currencies: ['$','Ⓒ','$'],  lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
            { at_s: 129.0, currencies: '$',             lanes: [0.2, 0.4, 0.6, 0.8], pattern: 'SINE' },

            // 130-150s PEAK — max density wall, multi-pattern
            { at_s: 131.0, currencies: '$',             lanes: [0.1, 0.9],        pattern: 'SWOOP' },
            { at_s: 132.5, currencies: ['元','Ⓒ','元','Ⓒ','元'], lanes: [0.2, 0.35, 0.5, 0.65, 0.8] },
            { at_s: 135.0, currencies: ['$','元','$'], lanes: [0.25, 0.5, 0.75], pattern: 'HOVER' },
            { at_s: 137.0, currencies: 'Ⓒ',             lanes: [0.15, 0.35, 0.55, 0.75, 0.95], pattern: 'SINE' },
            { at_s: 139.5, currencies: ['元','$'],     lanes: [0.1, 0.9],         pattern: 'SWOOP' },
            { at_s: 141.0, currencies: ['$','元','Ⓒ','元','$'], lanes: [0.2, 0.35, 0.5, 0.65, 0.8] },
            { at_s: 143.5, currencies: ['元','Ⓒ'],     lanes: [0.35, 0.65],       pattern: 'HOVER' },
            { at_s: 145.5, currencies: '$',             lanes: [0.1, 0.3, 0.5, 0.7, 0.9], pattern: 'SINE' },
            { at_s: 148.0, currencies: ['元','$'],     lanes: [0.15, 0.85],       pattern: 'SWOOP' },

            // 150-168s CORRIDOR CRUSH SET-PIECE — wall relentless
            { at_s: 150.5, currencies: ['$','元','Ⓒ','元','$'], lanes: [0.15, 0.35, 0.5, 0.65, 0.85] },
            { at_s: 152.5, currencies: ['$','元'],     lanes: [0.1, 0.9],         pattern: 'SWOOP' },
            { at_s: 153.5, currencies: ['元','Ⓒ','元'],lanes: [0.25, 0.5, 0.75],  pattern: 'SINE' },
            { at_s: 155.5, currencies: ['$','元','$','元','$','元'], lanes: [0.1, 0.25, 0.4, 0.6, 0.75, 0.9] },
            { at_s: 158.0, currencies: ['Ⓒ','元','Ⓒ'], lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
            { at_s: 160.0, currencies: ['$','元','$'], lanes: [0.15, 0.85],       pattern: 'SWOOP' },
            { at_s: 161.5, currencies: ['元','$','元','$','元'], lanes: [0.2, 0.35, 0.5, 0.65, 0.8], pattern: 'SINE' },
            { at_s: 164.0, currencies: ['$','Ⓒ','$','Ⓒ','$'], lanes: [0.1, 0.3, 0.5, 0.7, 0.9] },
            { at_s: 166.5, currencies: ['元','$'],     lanes: [0.1, 0.9],         pattern: 'SWOOP' }
        ],

        // S4: Corridor crush set-piece anchors (non-spawn events on the timeline)
        ANCHORS: [
            { at_s: 150, action: 'CRUSH_ENTER' },
            { at_s: 152, action: 'CRUSH_PEAK'  },
            { at_s: 168, action: 'CRUSH_EXIT'  }
        ],

        _idx: 0,
        _anchorIdx: 0,
        _elapsed: 0,
        _bossSpawned: false,
        _hcPrimed: false,
        _levelEndTimer: -1,

        // Live run metrics (reset each run)
        _stats: null,

        reset() {
            this._idx = 0;
            this._anchorIdx = 0;
            this._elapsed = 0;
            this._bossSpawned = false;
            this._hcPrimed = false;
            this._levelEndTimer = -1;
            this._stats = {
                startedAt: 0,
                burstsFired: 0,
                spawned: 0,
                killed: 0,
                aliveSamples: 0,
                aliveSum: 0,
                aliveMax: 0,
                deadTimeSec: 0   // cumulative dt while enemies.length===0 (no boss)
            };
            // Hook enemy_killed once per reset (remove prior hook if any)
            if (G.Events && typeof G.Events.on === 'function') {
                if (this._killHook && typeof G.Events.off === 'function') {
                    G.Events.off('enemy_killed', this._killHook);
                }
                this._killHook = () => { if (this._stats) this._stats.killed++; };
                G.Events.on('enemy_killed', this._killHook);
            }
        },

        _primeConductor() {
            if (this._hcPrimed) return;
            const hc = G.HarmonicConductor;
            if (!hc || !hc.setSequence) return;
            const level = window.currentLevel || 1;
            const cycle = window.marketCycle || 1;
            const intensity = (G.Audio && typeof G.Audio.intensity === 'number') ? G.Audio.intensity : 0.5;
            hc.setDifficulty(level, cycle, !!window.isBearMarket);
            hc.setSequence('SINE_WAVE', intensity, !!window.isBearMarket);
            // startWave expects enemy count — count total spawns across all bursts
            let totalSpawns = 0;
            for (let i = 0; i < this.SCRIPT.length; i++) {
                const e = this.SCRIPT[i];
                totalSpawns += (e.lanes && e.lanes.length) ? e.lanes.length : 1;
            }
            hc.startWave(totalSpawns);
            this._hcPrimed = true;
            if (G.Debug) G.Debug.log('V8', `primed: ${this.SCRIPT.length} bursts / ${totalSpawns} spawns, boss @ t=${(G.Balance.V8_MODE.BOSS_AT_S||0)}s`);
        },

        tick(dt) {
            const cfg = G.Balance && G.Balance.V8_MODE;
            if (!cfg || !cfg.ENABLED) return null;

            this._elapsed += dt;
            this._primeConductor();

            // Live metrics: track alive + dead-time (on-demand via dbg.v8())
            const arr = G.enemies || [];
            const aliveNow = arr.length;
            if (this._stats) {
                this._stats.aliveSamples++;
                this._stats.aliveSum += aliveNow;
                if (aliveNow > this._stats.aliveMax) this._stats.aliveMax = aliveNow;
                if (aliveNow === 0 && !window.boss) this._stats.deadTimeSec += dt;
            }

            while (this._idx < this.SCRIPT.length &&
                   this.SCRIPT[this._idx].at_s <= this._elapsed) {
                this._spawnBurst(this.SCRIPT[this._idx]);
                this._idx++;
            }

            while (this._anchorIdx < this.ANCHORS.length &&
                   this.ANCHORS[this._anchorIdx].at_s <= this._elapsed) {
                this._handleAnchor(this.ANCHORS[this._anchorIdx].action);
                this._anchorIdx++;
            }

            if (this._levelEndTimer >= 0) {
                this._levelEndTimer -= dt;
                if (this._levelEndTimer <= 0) {
                    this._levelEndTimer = -1;
                    if (G.Debug) G.Debug.log('V8', 'LEVEL_END fired');
                    return { action: 'LEVEL_END' };
                }
            }

            if (!this._bossSpawned && this._elapsed >= cfg.BOSS_AT_S) {
                this._bossSpawned = true;
                if (G.Debug) G.Debug.log('V8', `boss trigger @ t=${this._elapsed.toFixed(1)}s`);
                return { action: 'SPAWN_BOSS' };
            }
            return null;
        },

        _handleAnchor(action) {
            const se = G.ScrollEngine;
            const fx = G.EffectsRenderer;
            const audio = G.Audio;
            if (action === 'CRUSH_ENTER') {
                if (se && se.setSpeedMultiplier) se.setSpeedMultiplier(1.8, 2.0);
                if (audio && audio.setDetune) audio.setDetune(-100, 2.0);
            } else if (action === 'CRUSH_PEAK') {
                if (fx && fx.applyShake) fx.applyShake(4.0);
                if (fx && fx.triggerDamageVignette) fx.triggerDamageVignette();
            } else if (action === 'CRUSH_EXIT') {
                if (fx && fx.applyShake) fx.applyShake(0);
                if (se && se.setSpeedMultiplier) se.setSpeedMultiplier(1.0, 1.5);
                if (audio && audio.setDetune) audio.setDetune(0, 1.5);
            }
            if (G.Debug) G.Debug.log('V8', `anchor ${action} @ t=${this._elapsed.toFixed(1)}s`);
        },

        scheduleLevelEnd(delay) {
            this._levelEndTimer = Math.max(0, delay || 0);
            if (G.Debug) G.Debug.log('V8', `level end scheduled in ${this._levelEndTimer.toFixed(1)}s`);
        },

        _spawnBurst(entry) {
            if (this._stats) this._stats.burstsFired++;
            const lanes = Array.isArray(entry.lanes) ? entry.lanes
                        : (typeof entry.lane === 'number' ? [entry.lane] : [0.5]);
            const currs = entry.currencies !== undefined ? entry.currencies : entry.currency;
            for (let i = 0; i < lanes.length; i++) {
                const lane = lanes[i];
                const currency = Array.isArray(currs) ? currs[i % currs.length] : (currs || '¥');
                this._spawn(lane, currency, entry.pattern);
            }
        },

        _spawn(lane, currencySymbol, pattern) {
            const Balance = G.Balance;
            if (!Balance) return;

            const currencyType = Balance.getCurrencyBySymbol(currencySymbol);
            if (!currencyType) return;

            const gw = G._gameWidth || 400;
            const spawnY = Balance.V8_MODE.SPAWN_Y_OFFSET || -80;
            const pat = pattern || 'DIVE';
            const patCfg = Balance.V8_MODE.PATTERNS || {};
            const defaultVy = Balance.V8_MODE.DEFAULT_ENEMY_VY;

            let spawnX;
            let swoopDir = 0;
            if (pat === 'SWOOP' && patCfg.SWOOP) {
                const m = patCfg.SWOOP.SIDE_MARGIN || 30;
                const fromLeft = (lane || 0.5) < 0.5;
                spawnX = fromLeft ? m : gw - m;
                swoopDir = fromLeft ? 1 : -1;
            } else {
                spawnX = Math.max(30, Math.min(gw - 30, (lane || 0.5) * gw));
            }

            const level = window.currentLevel || 1;
            const cycle = window.marketCycle || 1;
            const diff = Balance.calculateDifficulty(level, cycle);
            const scaledHP = Balance.calculateEnemyHP(diff, cycle);
            const scaledType = Object.assign({}, currencyType, {
                hp: currencyType.hp * scaledHP
            });

            const enemy = new G.Enemy(spawnX, spawnY, scaledType);
            enemy.isEntering = false;
            enemy.hasSettled = true;
            enemy._v8Fall = true;
            enemy.entryPattern = pat;
            enemy._v8SpawnX = spawnX;
            enemy._v8PatTimer = 0;
            enemy.fireTimer = 0.8 + Math.random() * 1.2;

            if (pat === 'HOVER' && patCfg.HOVER) {
                enemy.vy = patCfg.HOVER.APPROACH_VY || 60;
            } else if (pat === 'SWOOP' && patCfg.SWOOP) {
                enemy.vy = patCfg.SWOOP.APPROACH_VY || 50;
                enemy._v8SwoopDir = swoopDir;
            } else {
                enemy.vy = defaultVy;
            }

            const arr = G.enemies;
            if (arr) {
                arr.push(enemy);
                if (G.HarmonicConductor) G.HarmonicConductor.enemies = arr;
            }
            if (this._stats) this._stats.spawned++;
        }
    };
})();
