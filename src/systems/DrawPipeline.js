/**
 * DrawPipeline.js - Centralized render layer pipeline
 *
 * v7.13.0: Replaces the monolithic draw() function in main.js
 * with a layered, extensible rendering pipeline.
 *
 * Each render step registers to a numbered layer. Layers execute
 * in ascending order. Per-layer composite operations (e.g. 'lighter'
 * for glow passes) are wrapped in automatic ctx.save/restore.
 *
 * Layers 0-25 execute INSIDE the screen-shake transform.
 * Layers 26-31 execute OUTSIDE shake (transition, debug overlays).
 */

(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    // ── Layer Enum ──────────────────────────────────────────
    // Lower index = drawn first (bottom layer)
    const LAYER = {
        BACKGROUND:      0,
        SKY:             1,
        WEATHER:         2,
        TITLE_ANIM:      3,
        IMPACT_FLASH:    4,
        HYPER_OVERLAY:   5,
        GLOW_ENEMY:      6,
        ENTITY_ENEMY:    7,
        GLOW_BULLET:     8,
        BULLET:          9,
        ENERGY_LINK:    10,
        SCREEN_DIM:     11,
        HARMONIC:       12,
        ENEMY_BULLET:   13,
        DANGER_ZONE:    14,
        POWERUP:        15,
        PARTICLE:       16,
        EVOLUTION_ITEM: 17,
        FLOATING_TEXT:  18,
        PERK_ICON:      19,
        MESSAGE:        20,
        ARCADE_HUD:     21,
        BOSS_WARNING:   22,
        COUNTDOWN:      23,
        BEAR_MARKET:    24,
        EFFECTS:        25,

        // Outside shake transform:
        TRANSITION:     26,
        DEBUG:          27,
        V8_HUD:         28,
        DEBUG_HUD:      29,
        DEBUG_HITBOX:   30,
        DEBUG_PERF:     31
    };

    const _INSIDE_SHAKE_MAX = LAYER.EFFECTS;  // 25

    // ── Internal State ──────────────────────────────────────
    /** @type {Array<Array<{fn: Function, handle: string}>>} */
    let _layers = [];

    /** @type {Object<number, string|null>} */
    let _compositeOps = {};

    /** @type {Object<number, boolean>} */
    let _layerEnabled = {};

    /** @type {Object<string, {layer: number, fn: Function}>} */
    let _handles = {};

    let _handleCounter = 0;
    let _numLayers = 0;

    // ── Initialization ──────────────────────────────────────

    /**
     * Initialize the pipeline
     * @param {CanvasRenderingContext2D} ctx - The main canvas context
     */
    function init(ctx) {
        // Determine number of layers from enum
        _numLayers = 0;
        for (const key in LAYER) {
            if (LAYER.hasOwnProperty(key)) {
                const idx = LAYER[key];
                if (idx >= _numLayers) _numLayers = idx + 1;
            }
        }

        _layers = [];
        _compositeOps = {};
        _layerEnabled = {};
        _handles = {};
        _handleCounter = 0;

        for (let i = 0; i < _numLayers; i++) {
            _layers[i] = [];
            _compositeOps[i] = null;
            _layerEnabled[i] = true;
        }
    }

    /**
     * Remove all registrations and reset state
     */
    function reset() {
        init(null);
    }

    // ── Registration ────────────────────────────────────────

    /**
     * Register a draw callback at a specific layer
     * @param {number} layer - LAYER enum value
     * @param {function(CanvasRenderingContext2D, Object):void} fn - Callback receives (ctx, frameContext)
     * @param {number} [priority=0] - Higher = drawn first within layer
     * @returns {string} Registration handle (for unregister)
     */
    function register(layer, fn, priority) {
        if (layer < 0 || layer >= _numLayers) {
            console.warn('[DrawPipeline] Invalid layer:', layer);
            return '';
        }
        const handle = '_p' + (_handleCounter++);
        const entry = {
            fn: fn,
            priority: (priority != null) ? priority : 0,
            handle: handle
        };

        _layers[layer].push(entry);
        // Sort descending by priority (higher = drawn first)
        _layers[layer].sort(function(a, b) {
            return b.priority - a.priority;
        });

        _handles[handle] = { layer: layer, fn: fn };
        return handle;
    }

    /**
     * Unregister a callback by its handle
     * @param {string} handle
     */
    function unregister(handle) {
        const info = _handles[handle];
        if (!info) return;
        const arr = _layers[info.layer];
        for (let i = 0; i < arr.length; i++) {
            if (arr[i].handle === handle) {
                arr.splice(i, 1);
                break;
            }
        }
        delete _handles[handle];
    }

    // ── Layer Configuration ─────────────────────────────────

    /**
     * Set composite operation for a layer
     * @param {number} layer
     * @param {string|null} compositeOp - e.g. 'lighter', or null for source-over
     */
    function setLayerComposite(layer, compositeOp) {
        if (layer >= 0 && layer < _numLayers) {
            _compositeOps[layer] = compositeOp || null;
        }
    }

    /**
     * Enable or disable an entire layer
     * @param {number} layer
     * @param {boolean} enabled
     */
    function setLayerEnabled(layer, enabled) {
        if (layer >= 0 && layer < _numLayers) {
            _layerEnabled[layer] = enabled;
        }
    }

    /**
     * Check if a layer is enabled
     * @param {number} layer
     * @returns {boolean}
     */
    function isLayerEnabled(layer) {
        if (layer < 0 || layer >= _numLayers) return false;
        return _layerEnabled[layer] !== false;
    }

    // ── Core Draw Loop ──────────────────────────────────────

    /**
     * Execute the pipeline for one frame
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} fc - Frame context (game state, entities, module refs)
     *
     * Frame context should contain:
     *   { gameWidth, gameHeight, gameState, totalTime, level, isBearMarket,
     *     bossActive, player, enemies, bullets, enemyBullets, powerUps,
     *     lives, storyScreen, effectsRenderer, ... }
     */
    function draw(ctx, fc) {
        if (!fc) return;

        // ═══ EARLY RETURN STATES ════════════════════════════
        if (fc.gameState === 'VIDEO') {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, fc.gameWidth, fc.gameHeight);
            _execLayer(LAYER.BACKGROUND, ctx, fc);
            return;
        }

        if (fc.gameState === 'STORY_SCREEN' && fc.storyScreen) {
            fc.storyScreen.draw(ctx, fc.gameWidth, fc.gameHeight);
            return;
        }

        // ═══ INSIDE SHAKE TRANSFORM ═════════════════════════
        ctx.save();
        if (fc.effectsRenderer) {
            fc.effectsRenderer.applyShakeTransform(ctx);
        }

        for (let layerIdx = LAYER.BACKGROUND; layerIdx <= _INSIDE_SHAKE_MAX; layerIdx++) {
            _execLayer(layerIdx, ctx, fc);
        }

        ctx.restore(); // End shake

        // ═══ OUTSIDE SHAKE TRANSFORM ════════════════════════
        for (let layerIdx = _INSIDE_SHAKE_MAX + 1; layerIdx < _numLayers; layerIdx++) {
            _execLayer(layerIdx, ctx, fc);
        }
    }

    /**
     * Execute all callbacks for a single layer
     * @param {number} layerIdx
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} fc
     */
    function _execLayer(layerIdx, ctx, fc) {
        if (!_layerEnabled[layerIdx]) return;

        const callbacks = _layers[layerIdx];
        if (!callbacks || callbacks.length === 0) return;

        const compositeOp = _compositeOps[layerIdx];
        let needsRestore = false;

        if (compositeOp) {
            ctx.save();
            ctx.globalCompositeOperation = compositeOp;
            needsRestore = true;
        }

        for (let i = 0; i < callbacks.length; i++) {
            callbacks[i].fn(ctx, fc);
        }

        if (needsRestore) {
            ctx.restore();
        }
    }

    // ── Overlay Drawing Helpers ──────────────────────────────
    // (used by registered layer callbacks, accept fc for state)

    function _drawStartCountdown(ctx, fc) {
        var CU = G.ColorUtils;
        var centerX = fc.gameWidth / 2;
        var centerY = fc.gameHeight / 2;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (fc.startCountdownTimer > 0) {
            var num = Math.ceil(fc.startCountdownTimer);
            var frac = fc.startCountdownTimer - Math.floor(fc.startCountdownTimer);
            var pulseScale = 1.0 + frac * 0.3;

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.scale(pulseScale, pulseScale);

            ctx.globalCompositeOperation = 'lighter';
            ctx.font = CU.font('bold', 80, 'Courier New, monospace');
            ctx.fillStyle = CU.rgba(255, 170, 0, 0.15);
            ctx.fillText(num, 0, 0);

            ctx.globalCompositeOperation = 'source-over';
            ctx.lineWidth = 4;
            ctx.strokeStyle = CU.rgba(0, 0, 0, 0.8);
            ctx.strokeText(num, 0, 0);
            ctx.fillStyle = '#ffaa00';
            ctx.fillText(num, 0, 0);

            ctx.restore();
        } else if (fc.startCountdownGoTimer > 0) {
            var goDur = (fc.balance && fc.balance.TIMING && fc.balance.TIMING.START_COUNTDOWN_GO) || 0.5;
            var goProgress = 1 - (fc.startCountdownGoTimer / goDur);
            var goScale = 1.0 + goProgress * 0.4;
            var goAlpha = 1.0 - goProgress;

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.scale(goScale, goScale);
            ctx.globalAlpha = goAlpha;

            ctx.globalCompositeOperation = 'lighter';
            ctx.font = CU.font('bold', 72, 'Courier New, monospace');
            ctx.fillStyle = CU.rgba(57, 255, 20, 0.2);
            ctx.fillText('GO!', 0, 0);

            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = goAlpha;
            ctx.lineWidth = 4;
            ctx.strokeStyle = CU.rgba(0, 0, 0, 0.8);
            ctx.strokeText('GO!', 0, 0);
            ctx.fillStyle = '#39ff14';
            ctx.fillText('GO!', 0, 0);

            ctx.restore();
        }

        ctx.restore();
    }

    function _drawBossWarningOverlay(ctx, fc) {
        if (!fc.bossWarningType) return;

        var centerX = fc.gameWidth / 2;
        var centerY = fc.gameHeight / 2;

        var bossConfig = G.BOSSES[fc.bossWarningType] || G.BOSSES.FEDERAL_RESERVE;

        var pulse = Math.sin(fc.bossWarningTimer * 8) * 0.5 + 0.5;
        var overlayAlpha = 0.3 + pulse * 0.2;

        ctx.fillStyle = 'rgba(80, 0, 0, ' + overlayAlpha + ')';
        ctx.fillRect(0, 0, fc.gameWidth, fc.gameHeight);

        var gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, fc.gameWidth * 0.7);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, fc.gameWidth, fc.gameHeight);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        var warningAlpha = pulse > 0.5 ? 1 : 0.3;
        ctx.font = 'bold 32px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255, 50, 50, ' + warningAlpha + ')';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.strokeText('⚠ WARNING ⚠', centerX, centerY - 60);
        ctx.fillText('⚠ WARNING ⚠', centerX, centerY - 60);

        var bossName = bossConfig.name || 'CENTRAL BANK';
        ctx.font = 'bold 28px "Courier New", monospace';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(bossName, centerX, centerY);
        ctx.fillText(bossName, centerX, centerY);

        ctx.font = 'bold 24px "Courier New", monospace';
        ctx.fillStyle = '#ff6666';
        ctx.strokeText('INCOMING', centerX, centerY + 40);
        ctx.fillText('INCOMING', centerX, centerY + 40);

        var countdown = Math.ceil(fc.bossWarningTimer);
        var cu = G.ColorUtils;
        ctx.font = cu.font('bold', 60 + pulse * 10, '"Courier New", monospace');
        ctx.fillStyle = '#ffaa00';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 5;
        ctx.strokeText(countdown, centerX, centerY + 110);
        ctx.fillText(countdown, centerX, centerY + 110);

        ctx.restore();
    }

    // ── Bulk Layer Registration ──────────────────────────────
    // Extracted from main.js initDrawPipeline() per ADR-0014.
    // Callbacks use `fc` (frame context) instead of closure variables.
    // `deps` provides helper function references still in main.js.

    var _pipelineInited = false;

    function registerAll(deps) {
        if (_pipelineInited) return;
        _pipelineInited = true;

        deps = deps || {};

        // L.BACKGROUND (0) — handled as early-return in pipeline core

        // L.SKY (1)
        register(LAYER.SKY, function(ctx, fc) {
            if (G.SkyRenderer) {
                G.SkyRenderer.draw(ctx, { level: fc.level, isBearMarket: fc.isBearMarket, bossActive: fc.bossActive });
            }
        });

        // L.WEATHER (2)
        register(LAYER.WEATHER, function(ctx, fc) {
            if (G.WeatherController) {
                G.WeatherController.draw(ctx, { isBearMarket: fc.isBearMarket, level: fc.level, bossActive: fc.bossActive });
            }
        });

        // L.TITLE_ANIM (3) — INTRO state only
        register(LAYER.TITLE_ANIM, function(ctx, fc) {
            if (fc.gameState === 'INTRO' && G.TitleAnimator && G.TitleAnimator.isActive()) {
                G.TitleAnimator.draw(ctx);
            }
        });

        // L.IMPACT_FLASH (4)
        register(LAYER.IMPACT_FLASH, function(ctx, fc) {
            if (fc.effectsRenderer) fc.effectsRenderer.drawImpactFlash(ctx);
        });

        // L.HYPER_OVERLAY (5)
        register(LAYER.HYPER_OVERLAY, function(ctx, fc) {
            var isHyper = fc.player && fc.player.isHyperActive && fc.player.isHyperActive();
            if (isHyper && fc.effectsRenderer) {
                fc.effectsRenderer.drawHyperVignette(ctx, true, fc.totalTime);
            }
        });

        // L.GLOW_ENEMY (6) — additive composite
        setLayerComposite(LAYER.GLOW_ENEMY, 'lighter');
        register(LAYER.GLOW_ENEMY, function(ctx, fc) {
            var _glowCfg = fc.balance && fc.balance.GLOW;
            if (!_glowCfg || !_glowCfg.ENABLED || !_glowCfg.ENEMY || !_glowCfg.ENEMY.ENABLED) return;
            for (var i = 0; i < fc.enemies.length; i++) {
                var e = fc.enemies[i];
                if (!e) continue;
                if (G.CullingHelper.isOnScreen(e.x, e.y, 80, fc.gameWidth, fc.gameHeight)) {
                    e.drawGlow(ctx);
                }
            }
        });

        // L.ENTITY_ENEMY (7)
        register(LAYER.ENTITY_ENEMY, function(ctx, fc) {
            var gs = fc.gameState;
            if (gs !== 'PLAY' && gs !== 'WARMUP' && gs !== 'PAUSE' && gs !== 'GAMEOVER' && gs !== 'INTERMISSION') return;
            if (fc.player) fc.player.draw(ctx);
            for (var i = 0; i < fc.enemies.length; i++) {
                var e = fc.enemies[i];
                if (!e) continue;
                if (G.CullingHelper.isOnScreen(e.x, e.y, 80, fc.gameWidth, fc.gameHeight)) {
                    e.draw(ctx);
                }
            }
            if (fc.boss && fc.boss.active) fc.boss.draw(ctx);
            if (fc.miniBoss && fc.miniBoss.active && deps.drawMiniBoss) deps.drawMiniBoss(ctx);
        });

        // L.GLOW_BULLET (8) — additive composite
        setLayerComposite(LAYER.GLOW_BULLET, 'lighter');
        register(LAYER.GLOW_BULLET, function(ctx, fc) {
            var _glowCfg = fc.balance && fc.balance.GLOW;
            if (!_glowCfg || !_glowCfg.ENABLED || !_glowCfg.BULLET || !_glowCfg.BULLET.ENABLED) return;
            for (var i = 0; i < fc.bullets.length; i++) {
                var b = fc.bullets[i];
                var gm = (b._elemLaser && !b.special) ? 130 : 20;
                if (G.CullingHelper.isOnScreen(b.x, b.y, gm, fc.gameWidth, fc.gameHeight)) {
                    b.drawGlow(ctx);
                }
            }
        });

        // L.BULLET (9)
        register(LAYER.BULLET, function(ctx, fc) {
            var gs = fc.gameState;
            if (gs !== 'PLAY' && gs !== 'WARMUP' && gs !== 'PAUSE' && gs !== 'GAMEOVER' && gs !== 'INTERMISSION') return;
            for (var i = 0; i < fc.bullets.length; i++) {
                var b = fc.bullets[i];
                var margin = (b._elemLaser && !b.special) ? 130 : 20;
                if (G.CullingHelper.isOnScreen(b.x, b.y, margin, fc.gameWidth, fc.gameHeight)) b.draw(ctx);
            }
        });

        // L.ENERGY_LINK (10)
        register(LAYER.ENERGY_LINK, function(ctx, fc) {
            var gs = fc.gameState;
            if (gs !== 'PLAY' && gs !== 'WARMUP' && gs !== 'PAUSE' && gs !== 'GAMEOVER' && gs !== 'INTERMISSION') return;
            var _linkCfg = fc.balance && fc.balance.VFX && fc.balance.VFX.ENERGY_LINK;
            if (_linkCfg && _linkCfg.ENABLED !== false && deps.drawEnergyLinks) {
                deps.drawEnergyLinks(ctx, fc.bullets, _linkCfg);
            }
        });

        // L.SCREEN_DIM (11)
        register(LAYER.SCREEN_DIM, function(ctx, fc) {
            var gs = fc.gameState;
            if (gs !== 'PLAY' && gs !== 'WARMUP' && gs !== 'PAUSE' && gs !== 'GAMEOVER' && gs !== 'INTERMISSION') return;
            if (fc.balance && fc.balance.JUICE && fc.balance.JUICE.SCREEN_EFFECTS && fc.balance.JUICE.SCREEN_EFFECTS.SCREEN_DIMMING && fc.enemyBullets.length > 15) {
                var dimAlpha = Math.min(0.25, (fc.enemyBullets.length - 15) * 0.01);
                ctx.fillStyle = 'rgba(0, 0, 0, ' + dimAlpha + ')';
                ctx.fillRect(0, 0, fc.gameWidth, fc.gameHeight);
            }
        });

        // L.HARMONIC (12)
        register(LAYER.HARMONIC, function(ctx, fc) {
            var gs = fc.gameState;
            if (gs !== 'PLAY' && gs !== 'WARMUP' && gs !== 'PAUSE' && gs !== 'GAMEOVER' && gs !== 'INTERMISSION') return;
            if (G.HarmonicConductor) G.HarmonicConductor.draw(ctx);
        });

        // L.ENEMY_BULLET (13)
        register(LAYER.ENEMY_BULLET, function(ctx, fc) {
            var gs = fc.gameState;
            if (gs !== 'PLAY' && gs !== 'WARMUP' && gs !== 'PAUSE' && gs !== 'GAMEOVER' && gs !== 'INTERMISSION') return;
            for (var i = 0; i < fc.enemyBullets.length; i++) {
                var eb = fc.enemyBullets[i];
                if (!eb) continue;
                if (G.CullingHelper.isOnScreen(eb.x, eb.y, 20, fc.gameWidth, fc.gameHeight)) eb.draw(ctx);
            }
        });

        // L.DANGER_ZONE (14)
        register(LAYER.DANGER_ZONE, function(ctx, fc) {
            var gs = fc.gameState;
            if (gs !== 'PLAY' && gs !== 'WARMUP' && gs !== 'PAUSE' && gs !== 'GAMEOVER' && gs !== 'INTERMISSION') return;
            for (var dzi = 0; dzi < fc.dangerZones.length; dzi++) {
                var dz = fc.dangerZones[dzi];
                var dzAlpha = dz.alpha * (dz.timer / dz.duration);
                var pulse = Math.sin(Date.now() * 0.008) * 0.1 + 0.9;
                ctx.globalAlpha = dzAlpha * pulse;
                ctx.fillStyle = dz.color;
                ctx.beginPath();
                ctx.arc(dz.x, dz.y, dz.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = dz.color;
                ctx.lineWidth = 2;
                ctx.globalAlpha = dzAlpha * 0.6;
                ctx.beginPath();
                ctx.arc(dz.x, dz.y, dz.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        });

        // L.POWERUP (15)
        register(LAYER.POWERUP, function(ctx, fc) {
            var gs = fc.gameState;
            if (gs !== 'PLAY' && gs !== 'WARMUP' && gs !== 'PAUSE' && gs !== 'GAMEOVER' && gs !== 'INTERMISSION') return;
            for (var i = 0; i < fc.powerUps.length; i++) {
                var p = fc.powerUps[i];
                if (!p) continue;
                if (G.CullingHelper.isOnScreen(p.x, p.y, 40, fc.gameWidth, fc.gameHeight)) p.draw(ctx);
            }
        });

        // L.PARTICLE (16)
        register(LAYER.PARTICLE, function(ctx, fc) {
            var gs = fc.gameState;
            if (gs !== 'PLAY' && gs !== 'WARMUP' && gs !== 'PAUSE' && gs !== 'GAMEOVER' && gs !== 'INTERMISSION') return;
            if (deps.drawParticles) deps.drawParticles(ctx);
        });

        // L.EVOLUTION_ITEM (17)
        register(LAYER.EVOLUTION_ITEM, function(ctx, fc) {
            var gs = fc.gameState;
            if (gs !== 'PLAY' && gs !== 'WARMUP' && gs !== 'PAUSE' && gs !== 'GAMEOVER' && gs !== 'INTERMISSION') return;
            if (deps.drawEvolutionItem) deps.drawEvolutionItem(ctx);
        });

        // L.FLOATING_TEXT (18)
        register(LAYER.FLOATING_TEXT, function(ctx, fc) {
            var gs = fc.gameState;
            if (gs !== 'PLAY' && gs !== 'WARMUP' && gs !== 'PAUSE' && gs !== 'GAMEOVER' && gs !== 'INTERMISSION') return;
            if (fc.floatingTextManager) fc.floatingTextManager.draw(ctx, fc.gameWidth);
        });

        // L.PERK_ICON (19)
        register(LAYER.PERK_ICON, function(ctx, fc) {
            var gs = fc.gameState;
            if (gs !== 'PLAY' && gs !== 'WARMUP' && gs !== 'PAUSE' && gs !== 'GAMEOVER' && gs !== 'INTERMISSION') return;
            if (fc.perkIconManager) fc.perkIconManager.draw(ctx, fc.gameWidth);
        });

        // L.MESSAGE (20)
        register(LAYER.MESSAGE, function(ctx, fc) {
            var gs = fc.gameState;
            if (gs !== 'PLAY' && gs !== 'WARMUP' && gs !== 'PAUSE' && gs !== 'GAMEOVER' && gs !== 'INTERMISSION') return;
            if (deps.drawTypedMessages) deps.drawTypedMessages(ctx);
        });

        // L.ARCADE_HUD (21)
        register(LAYER.ARCADE_HUD, function(ctx, fc) {
            var gs = fc.gameState;
            if (gs !== 'PLAY' && gs !== 'WARMUP' && gs !== 'PAUSE' && gs !== 'GAMEOVER' && gs !== 'INTERMISSION') return;
            if (deps.drawArcadeComboHUD) deps.drawArcadeComboHUD(ctx);
        });

        // L.BOSS_WARNING (22)
        register(LAYER.BOSS_WARNING, function(ctx, fc) {
            var gs = fc.gameState;
            if (gs !== 'PLAY' && gs !== 'WARMUP' && gs !== 'PAUSE' && gs !== 'GAMEOVER' && gs !== 'INTERMISSION') return;
            if (fc.bossWarningTimer > 0 && fc.bossWarningType) _drawBossWarningOverlay(ctx, fc);
        });

        // L.COUNTDOWN (23)
        register(LAYER.COUNTDOWN, function(ctx, fc) {
            var gs = fc.gameState;
            if (gs !== 'PLAY' && gs !== 'WARMUP' && gs !== 'PAUSE' && gs !== 'GAMEOVER' && gs !== 'INTERMISSION') return;
            if (fc.startCountdownActive) _drawStartCountdown(ctx, fc);
        });

        // L.BEAR_MARKET (24)
        register(LAYER.BEAR_MARKET, function(ctx, fc) {
            if (fc.isBearMarket && fc.gameState === 'PLAY' && fc.skyRenderer) {
                fc.skyRenderer.drawBearMarketOverlay(ctx, fc.totalTime);
            }
        });

        // L.EFFECTS (25)
        register(LAYER.EFFECTS, function(ctx, fc) {
            if (fc.effectsRenderer) {
                fc.effectsRenderer.drawScreenFlash(ctx);
                fc.effectsRenderer.drawScorePulse(ctx);
                fc.effectsRenderer.drawDamageVignette(ctx);
                fc.effectsRenderer.drawLowHPVignette(ctx, fc.lives, fc.totalTime);
                var gcActive = fc.player && fc.player._godchainActive;
                fc.effectsRenderer.drawGodchainVignette(ctx, gcActive, fc.totalTime);
            }
        });

        // ── OUTSIDE SHAKE ──────────────────────────────────────

        // L.TRANSITION (26)
        register(LAYER.TRANSITION, function(ctx, fc) {
            if (fc.transitionManager) fc.transitionManager.draw(ctx);
        });

        // L.DEBUG (27)
        register(LAYER.DEBUG, function(ctx, fc) {
            if (fc.debugMode && deps.drawDebug) deps.drawDebug(ctx);
        });

        // L.V8_HUD (28)
        register(LAYER.V8_HUD, function(ctx, fc) {
            if (!fc.balance || !fc.balance.V8_MODE || !fc.balance.V8_MODE.ENABLED || fc.gameState !== 'PLAY' || !fc.levelScript) return;
            var ls = fc.levelScript;
            var elapsed = ls._elapsed || 0;
            var bossAt = ls.BOSS_AT_S || 170;
            var crushIn = ls.CRUSH_ENTER_S || 150;
            var crushOut = ls.CRUSH_EXIT_S || 168;
            var bossAlive = fc.boss && fc.boss.active;
            var endTimer = ls._levelEndTimer;
            var lvlTag = 'L' + ls.currentLevelNum();
            var label = null, color = '#00f0ff', pulse = false;
            if (endTimer >= 0) {
                label = 'VICTORY +' + endTimer.toFixed(1) + 's';
                color = '#ffaa00';
            } else if (bossAlive) {
                // skip
            } else if (elapsed >= crushOut && elapsed < bossAt) {
                label = lvlTag + '  BOSS INCOMING';
                color = '#ff2d95';
                pulse = true;
            } else if (elapsed >= crushIn && elapsed < crushOut) {
                label = '⚠ CORRIDOR CRUSH ⚠';
                color = '#ff2d95';
                pulse = true;
            } else if (elapsed < bossAt) {
                var rem = Math.max(0, bossAt - elapsed);
                label = lvlTag + '  BOSS  T-' + Math.ceil(rem) + 's';
            }
            if (label) {
                var cw = ctx.canvas.width;
                var y = (G._safeTop || 0) + 52;
                ctx.save();
                var alpha = pulse ? (0.75 + 0.25 * Math.sin(fc.totalTime * 6)) : 0.9;
                ctx.globalAlpha = alpha;
                ctx.font = 'bold 14px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = color;
                ctx.globalAlpha = alpha * 0.25;
                ctx.fillText(label, cw / 2, y);
                ctx.globalAlpha = alpha * 0.6;
                ctx.fillText(label, cw / 2, y);
                ctx.globalAlpha = alpha;
                ctx.fillText(label, cw / 2, y);
                ctx.restore();
            }
        });

        // L.DEBUG_HUD (29)
        register(LAYER.DEBUG_HUD, function(ctx, fc) {
            if (G.Debug && G.Debug.OVERLAY_ENABLED) {
                G._hudState = {
                    score: fc.score, lives: fc.lives, level: fc.level, gameState: fc.gameState,
                    grazeMeter: fc.grazeMeter, grazeCount: fc.grazeCount, grazeMultiplier: fc.grazeMultiplier,
                    killStreak: fc.killStreak, killStreakMult: fc.killStreakMult, bestStreak: fc.bestStreak,
                    floatingTexts: deps.countActive ? deps.countActive(fc.floatingTexts) : 0,
                    perkIcons: deps.countActive ? deps.countActive(fc.perkIcons) : 0,
                    intermissionMeme: fc.intermissionMeme,
                    intermissionTimer: G.WaveManager ? G.WaveManager.intermissionTimer : 0,
                    bossWarningTimer: fc.bossWarningTimer,
                    perkCooldown: fc.perkCooldown,
                    bulletCancelStreak: fc.bulletCancelStreak,
                    player: fc.player ? {
                        x: Math.round(fc.player.x), y: Math.round(fc.player.y),
                        hp: fc.player.hp, shieldActive: fc.player.shieldActive,
                        shieldCooldown: fc.player.shieldCooldown,
                        hyperAvailable: fc.player.hyperAvailable,
                        isHyper: fc.player.isHyperActive ? fc.player.isHyperActive() : false,
                        hyperTimer: fc.player.getHyperTimeRemaining ? fc.player.getHyperTimeRemaining() : 0,
                        weaponLevel: fc.player.weaponLevel || 1,
                        special: fc.player.special || null,
                        specialTimer: fc.player.specialTimer || 0,
                        type: fc.player.type
                    } : null,
                    msgSystem: { hasActive: G.MessageSystem ? G.MessageSystem.hasActiveMessages() : false },
                    dialogue: { visible: G.DialogueUI ? G.DialogueUI.isVisible : false }
                };
                G.Debug.drawOverlay(ctx, fc.gameState);
            }
        });

        // L.DEBUG_HITBOX (30)
        register(LAYER.DEBUG_HITBOX, function(ctx, fc) {
            if (fc.bulletSystem && fc.bulletSystem.debugEnabled) {
                fc.bulletSystem.drawDebugOverlay(ctx, fc.bullets, fc.enemyBullets, fc.enemies, fc.player, fc.boss);
            }
        });

        // L.DEBUG_PERF (31)
        register(LAYER.DEBUG_PERF, function(ctx, fc) {
            if (G.Debug && G.Debug._perf && G.Debug._perf.overlayEnabled) {
                G.Debug.drawPerfOverlay(ctx, fc.gameWidth);
            }
        });
    }

    // ── Export ──────────────────────────────────────────────
    G.DrawPipeline = {
        init: init,
        reset: reset,
        register: register,
        unregister: unregister,
        registerAll: registerAll,
        draw: draw,
        setLayerComposite: setLayerComposite,
        setLayerEnabled: setLayerEnabled,
        isLayerEnabled: isLayerEnabled,
        LAYER: LAYER
    };
})();
