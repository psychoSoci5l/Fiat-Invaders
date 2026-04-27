// ScoreManager v1.0 — Extracted from main.js
// Manages score, kill counter, streak memes, high scores, arcade records, and weapon unlocks.
window.Game = window.Game || {};
(function () {
    'use strict';
    const G = window.Game;
    const Balance = G.Balance;

    // --- Internal State ---
    var _deps = {};

    // Weapon progression
    var BASE_WEAPONS = ['WIDE', 'NARROW', 'FIRE'];
    var ADVANCED_WEAPONS = ['SPREAD', 'HOMING'];
    var WEAPON_UNLOCK_CYCLE = { SPREAD: 2, HOMING: 3 };
    var maxCycleReached = parseInt(localStorage.getItem('fiat_maxcycle')) || 1;

    // Score pulse
    var _scorePulseTierClasses = ['score-normal', 'score-big', 'score-massive', 'score-legendary'];
    var _tierOrder = ['MICRO', 'NORMAL', 'BIG', 'MASSIVE', 'LEGENDARY'];
    var _scorePulseAccumulator = 0;
    var _scorePulseAccTimer = 0;

    // Streak
    var STREAK_MEMES = [
        { at: 10, text: "🐋 WHALE ALERT!" },
        { at: 25, text: "💎 DIAMOND HANDS!" },
        { at: 50, text: "👑 SATOSHI REBORN!" }
    ];

    // --- High Score ---
    function highScoreKey() {
        if (G.DailyMode && G.DailyMode.isActive()) return 'fiat_highscore_' + G.DailyMode.modeToken();
        var isStory = G.CampaignState && G.CampaignState.isEnabled();
        return isStory ? 'fiat_highscore_story' : 'fiat_highscore_arcade';
    }

    function loadHighScoreForMode() {
        return parseInt(localStorage.getItem(highScoreKey())) || 0;
    }

    // --- Arcade Records ---
    function loadArcadeRecords() {
        try { return JSON.parse(localStorage.getItem('fiat_arcade_records')) || { bestCycle: 0, bestLevel: 0, bestKills: 0 }; }
        catch { return { bestCycle: 0, bestLevel: 0, bestKills: 0 }; }
    }

    function saveArcadeRecords(records) {
        _deps.safeSetItem('fiat_arcade_records', JSON.stringify(records));
    }

    function checkArcadeRecords() {
        var records = loadArcadeRecords();
        var newBest = false;
        var mc = _deps.getMarketCycle();
        var lv = _deps.getLevel();
        var kc = _deps.getKillCount();
        if (mc > records.bestCycle) { records.bestCycle = mc; newBest = true; }
        if (lv > records.bestLevel) { records.bestLevel = lv; newBest = true; }
        if (kc > records.bestKills) { records.bestKills = kc; newBest = true; }
        if (newBest) saveArcadeRecords(records);
        return { newBest: newBest, records: records };
    }

    // --- Weapon Progression ---
    function getUnlockedWeapons() {
        var unlocked = BASE_WEAPONS.slice();
        for (var weapon in WEAPON_UNLOCK_CYCLE) {
            if (WEAPON_UNLOCK_CYCLE.hasOwnProperty(weapon)) {
                if (maxCycleReached >= WEAPON_UNLOCK_CYCLE[weapon]) {
                    unlocked.push(weapon);
                }
            }
        }
        return unlocked;
    }

    function checkWeaponUnlocks(cycle) {
        if (cycle > maxCycleReached) {
            maxCycleReached = cycle;
            _deps.safeSetItem('fiat_maxcycle', maxCycleReached);
            for (var weapon in WEAPON_UNLOCK_CYCLE) {
                if (WEAPON_UNLOCK_CYCLE.hasOwnProperty(weapon) && WEAPON_UNLOCK_CYCLE[weapon] === cycle) {
                    if (G.MessageSystem) G.MessageSystem.showGameInfo(_deps.t('WEAPON_UNLOCK') + ' ' + weapon + '!');
                    if (G.Audio) G.Audio.play('levelUp');
                }
            }
        }
    }

    // --- Score Pulse ---
    function _getScoreTier(gain) {
        var tiers = Balance.JUICE?.SCORE_PULSE_TIERS;
        if (!tiers) return 'MICRO';
        if (gain >= (tiers.LEGENDARY?.threshold ?? 5000)) return 'LEGENDARY';
        if (gain >= (tiers.MASSIVE?.threshold ?? 2000)) return 'MASSIVE';
        if (gain >= (tiers.BIG?.threshold ?? 500)) return 'BIG';
        if (gain >= (tiers.NORMAL?.threshold ?? 100)) return 'NORMAL';
        return 'MICRO';
    }

    function triggerScorePulse() {
        if (G.EffectsRenderer) G.EffectsRenderer.triggerScorePulse();
    }

    // --- Score Update ---
    function updateScore(newScore, scoreGain) {
        var oldScore = _deps.getScore();
        _deps.setScore(newScore);

        // Update DOM
        var el = document.getElementById('scoreVal');
        if (!el) return;
        el.textContent = Math.floor(newScore);

        // Emit event
        if (G.Events) G.Events.emit('score:changed', { score: Math.floor(newScore), gain: scoreGain || 0 });

        // Determine tier from gain
        if (scoreGain > 0) {
            var tier = _getScoreTier(scoreGain);
            var tierIdx = _tierOrder.indexOf(tier);

            // Accumulator: rapid gains bump tier up
            var tiers = Balance.JUICE?.SCORE_PULSE_TIERS;
            var decayTime = tiers?.ACCUMULATOR_DECAY ?? 0.4;
            var maxBump = tiers?.ACCUMULATOR_MAX_BUMP ?? 2;
            if (_scorePulseAccTimer > 0 && tierIdx > 0) {
                _scorePulseAccumulator = Math.min(_scorePulseAccumulator + 1, maxBump);
                tierIdx = Math.min(tierIdx + _scorePulseAccumulator, _tierOrder.length - 1);
                tier = _tierOrder[tierIdx];
            } else {
                _scorePulseAccumulator = 0;
            }
            _scorePulseAccTimer = decayTime;

            // Apply CSS class for NORMAL+
            if (tierIdx >= 1) {
                var className = _scorePulseTierClasses[tierIdx - 1];
                for (var i = 0; i < _scorePulseTierClasses.length; i++) {
                    el.classList.remove(_scorePulseTierClasses[i]);
                }
                void el.offsetWidth;
                el.classList.add(className);

                // BIG+: HUD particle burst
                if (tierIdx >= 2 && G.ParticleSystem?.createScoreHudBurst) {
                    G.ParticleSystem.createScoreHudBurst(tier);
                }

                // LEGENDARY: screen glow
                if (tierIdx >= 4) {
                    triggerScorePulse();
                }
            }
        }

        // New high score detection
        var hs = _deps.getHighScore();
        if (newScore > hs && oldScore <= hs && hs > 0) {
            for (var j = 0; j < _scorePulseTierClasses.length; j++) {
                el.classList.remove(_scorePulseTierClasses[j]);
            }
            el.classList.remove('score-record-break');
            void el.offsetWidth;
            el.classList.add('score-record-break');
            el.classList.add('score-new-record');
            if (G.ParticleSystem?.createScoreHudBurst) G.ParticleSystem.createScoreHudBurst('LEGENDARY');
            triggerScorePulse();
            if (G.MessageSystem) G.MessageSystem.showGameInfo("NEW HIGH SCORE!");
            if (G.Audio) G.Audio.play('weaponDeploy');
        }

        // Score pulse on milestone crossing
        var threshold = Balance.JUICE?.SCORE_PULSE?.THRESHOLD || 10000;
        var currentMilestone = Math.floor(newScore / threshold);
        var previousMilestone = Math.floor(oldScore / threshold);
        var lastMS = _deps.getLastScoreMilestone();
        if (currentMilestone > previousMilestone && currentMilestone > lastMS) {
            _deps.setLastScoreMilestone(currentMilestone);
            triggerScorePulse();
        }
    }

    // --- Kill Counter ---
    function updateKillCounter() {
        var el = document.getElementById('killNum');
        if (!el) return;
        el.textContent = _deps.getKillCount();
        el.classList.add('pulse');
        setTimeout(function () { el.classList.remove('pulse'); }, 100);
    }

    // --- Streak Meme ---
    function checkStreakMeme() {
        var s = _deps.getStreak();
        var meme = null;
        for (var i = 0; i < STREAK_MEMES.length; i++) {
            if (STREAK_MEMES[i].at === s) {
                meme = STREAK_MEMES[i];
                break;
            }
        }
        if (meme && G.MemeEngine) {
            G.MemeEngine.queueMeme('STREAK', meme.text, 'STREAK');
        }
    }

    // --- Score Ticker ---
    function pushScoreTicker(text) {
        var tickerEl = document.getElementById('scoreTicker');
        if (!tickerEl) return;
        var span = document.createElement('span');
        span.className = 'tick';
        span.textContent = text;
        tickerEl.appendChild(span);
        setTimeout(function () {
            if (span.parentNode) span.parentNode.removeChild(span);
        }, 1200);
    }

    // --- Score Streak Color (reactive HUD) ---
    function triggerScoreStreakColor(streakLevel) {
        var reactive = G.Balance?.REACTIVE_HUD;
        if (!reactive?.ENABLED) return;
        var scoreEl = document.querySelector('.hud-score-compact');
        if (!scoreEl) return;
        var prev = _deps.getReactiveStreakClass();
        if (prev) scoreEl.classList.remove(prev);
        var className = 'score-streak-' + streakLevel;
        scoreEl.classList.add(className);
        _deps.setReactiveStreakClass(className);
        _deps.setReactiveStreakTimer(reactive.SCORE_STREAK_DURATION || 0.5);
    }

    // --- Reset pulse state (called from syncFromRunState) ---
    function resetPulseState() {
        _scorePulseAccumulator = 0;
        _scorePulseAccTimer = 0;
        var el = document.getElementById('scoreVal');
        if (el) {
            el.classList.remove('score-new-record', 'score-record-break');
            for (var i = 0; i < _scorePulseTierClasses.length; i++) {
                el.classList.remove(_scorePulseTierClasses[i]);
            }
        }
    }

    // --- Public API ---
    G.ScoreManager = {
        init: function (deps) {
            _deps = deps || {};
        },

        update: function (dt) {
            if (_scorePulseAccTimer > 0) _scorePulseAccTimer -= dt;
        },

        highScoreKey: highScoreKey,
        loadHighScoreForMode: loadHighScoreForMode,
        loadArcadeRecords: loadArcadeRecords,
        saveArcadeRecords: saveArcadeRecords,
        checkArcadeRecords: checkArcadeRecords,

        getUnlockedWeapons: getUnlockedWeapons,
        checkWeaponUnlocks: checkWeaponUnlocks,

        updateScore: updateScore,
        updateKillCounter: updateKillCounter,
        checkStreakMeme: checkStreakMeme,
        pushScoreTicker: pushScoreTicker,

        triggerScorePulse: triggerScorePulse,
        triggerScoreStreakColor: triggerScoreStreakColor,

        resetPulseState: resetPulseState,

        // Expose internal for backward compat
        _getScoreTier: _getScoreTier,
    };

})();
