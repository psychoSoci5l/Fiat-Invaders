/**
 * BossSpawner.js - Boss warning and spawning logic
 *
 * v7.20: Extracted from main.js as part of Fase 1 refactoring (ADR-0014).
 * Encapsulates startBossWarning and spawnBoss with explicit state contracts.
 *
 * Both methods receive a context object with module-level state from main.js
 * and return an object with state mutations for the caller to apply.
 */

(function () {
    'use strict';

    const G = window.Game = window.Game || {};

    // ── Boss Rotation ─────────────────────────────────────────
    const DEFAULT_ROTATION = ['FEDERAL_RESERVE', 'BCE', 'BOJ'];

    function getBossForCycle(marketCycle) {
        var rotation = G.BOSS_ROTATION || DEFAULT_ROTATION;
        return rotation[(marketCycle - 1) % rotation.length];
    }

    function getBossFlashColor(bossType) {
        return bossType === 'BCE' ? '#000033' : (bossType === 'BOJ' ? '#330000' : '#400000');
    }

    function getBossMemeText(bossType) {
        return G.MemeEngine ? G.MemeEngine.getBossMeme(bossType) : '';
    }

    function showDanger(text) {
        if (G.MessageSystem) G.MessageSystem.showDanger(text, 20);
    }

    // ── Public API ─────────────────────────────────────────────

    G.BossSpawner = {

        /**
         * Start the boss warning phase: clear battlefield, set timer, shake screen.
         * @param {{ marketCycle: number }} ctx — module-level state from main.js
         * @returns {{ bossWarningType: string, bossWarningTimer: number, enemies: Array, shake: number }}
         */
        startWarning: function (ctx) {
            var bossWarningType = getBossForCycle(ctx.marketCycle);

            G.clearBattlefield();

            var shake = 10;
            G.Audio && G.Audio.play('explosion');

            return {
                bossWarningType: bossWarningType,
                bossWarningTimer: G.Balance.BOSS.WARNING_DURATION,
                enemies: [],
                shake: shake
            };
        },

        /**
         * Spawn the boss: create instance, scale HP, set up arena, trigger effects.
         * @param {{
         *   marketCycle: number,
         *   gameWidth: number,
         *   gameHeight: number,
         *   level: number,
         *   isBearMarket: boolean,
         *   miniBoss: *,
         *   memeSwapTimer: number
         * }} ctx — module-level state from main.js
         * @returns {{
         *   boss: Object|null,
         *   miniBoss: null,
         *   memeSwapTimer: number,
         *   memeTickerText: string,
         *   enemies: Array
         * }}
         */
        spawn: function (ctx) {
            var bossType = getBossForCycle(ctx.marketCycle);

            // v7.2.0: in V8_MODE, LevelScript declares the boss per level
            // v7.11.1: V8 is campaign-only — Arcade keeps the FED→BCE→BOJ cycle
            var isArcadeBossOverride = G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode();
            if (G.Balance && G.Balance.V8_MODE && G.Balance.V8_MODE.ENABLED &&
                !isArcadeBossOverride && G.LevelScript && G.LevelScript.BOSS_TYPE) {
                bossType = G.LevelScript.BOSS_TYPE;
            }

            var campaignState = G.CampaignState;
            var bossConfig = G.BOSSES && (G.BOSSES[bossType] || G.BOSSES.FEDERAL_RESERVE);

            // Flash color based on boss via TransitionManager
            if (G.TransitionManager) {
                G.TransitionManager.startFadeOut(0.6, getBossFlashColor(bossType));
            }

            var newBoss = new G.Boss(ctx.gameWidth, ctx.gameHeight, bossType);

            // Scale boss HP using Balance config
            var Balance = G.Balance;
            var hpConfig = Balance && Balance.BOSS && Balance.BOSS.HP;
            var baseHp = hpConfig ? hpConfig.BASE : 500;
            var hpPerLevel = hpConfig ? hpConfig.PER_LEVEL : 50;
            var hpPerCycle = hpConfig ? hpConfig.PER_CYCLE : 100;

            // Perk-aware scaling
            var runState = G.RunState;
            var perkCount = (runState && runState.perks) ? runState.perks.length : 0;
            var perkScaling = 1 + (perkCount * (hpConfig ? hpConfig.PERK_SCALE : 0.1));

            // NG+ scaling (campaign mode)
            var ngPlusMult = (campaignState && campaignState.isEnabled()) ? campaignState.getNGPlusMultiplier() : 1;

            var rawHp = baseHp + (ctx.level * hpPerLevel) + ((ctx.marketCycle - 1) * hpPerCycle);
            newBoss.hp = Math.max(hpConfig ? hpConfig.MIN_FLOOR : 100, Math.floor(rawHp * perkScaling * ngPlusMult));
            newBoss.maxHp = newBoss.hp;

            // Analytics
            if (G.Debug) {
                G.Debug.trackBossFightStart(bossType, ctx.marketCycle);
                G.Debug.trackBossSpawn(bossType, newBoss.hp, ctx.level, ctx.marketCycle);
            }

            // Weather
            if (G.WeatherController) {
                G.WeatherController.setLevel(ctx.level, ctx.isBearMarket, true);
            }

            // Reset boss drops
            if (G.DropSystem) G.DropSystem.resetBossDrops();

            // Clear miniBoss if active
            if (ctx.miniBoss && G.MiniBossManager) {
                G.MiniBossManager.clear();
            }

            G.clearBattlefield();

            // Danger message + meme
            var dangerMsg = bossConfig ? (bossConfig.country + ' ' + bossConfig.name + ' ' + bossConfig.country) : bossType;
            showDanger('⚠️ ' + dangerMsg + ' ⚠️');

            if (G.MemeEngine) {
                G.MemeEngine.queueMeme('BOSS_SPAWN', getBossMemeText(bossType), bossType);
            }

            if (G.Audio) {
                G.Audio.play('bossSpawn');
                G.Audio.setBossPhase(1);
            }

            if (G.Events) G.Events.emit('weather:boss-spawn');

            // Set Harmonic Conductor to boss sequence (enemies reference synced by caller)
            if (G.HarmonicConductor) {
                G.HarmonicConductor.setBossSequence(1);
            }

            // Boss intro dialogue
            var bossIntroPool = G.DIALOGUES && G.DIALOGUES.BOSS_INTRO && G.DIALOGUES.BOSS_INTRO[bossType];
            if (bossIntroPool && bossIntroPool.length > 0 && G.MemeEngine) {
                var intro = bossIntroPool[Math.floor(Math.random() * bossIntroPool.length)];
                G.MemeEngine.queueMeme('BOSS_SPAWN', intro.text, intro.speaker);
            }

            // Stop camera scroll for boss arena (V8 mode)
            if (G.Balance && G.Balance.V8_MODE && G.Balance.V8_MODE.ENABLED &&
                G.ScrollEngine && G.ScrollEngine.halt) {
                G.ScrollEngine.halt();
            }

            var memeTickerText = getBossMemeText(bossType);

            return {
                boss: newBoss,
                miniBoss: null,
                memeSwapTimer: G.Balance ? G.Balance.MEMES.BOSS_TICKER_INTERVAL : 12,
                memeTickerText: memeTickerText,
                enemies: []
            };
        }
    };

})();
