/**
 * SkyRenderer.js - Centralized sky and background rendering
 *
 * v4.24.0: Cell-shading sky enhancement
 * A) Smooth gradient sky (cached)
 * B) Enhanced star field (90 stars + shooting stars)
 * C) 5-layer parallax hills with silhouettes
 * D) Atmospheric particles (dust/pollen/firefly/ember)
 * E) Multi-lobe cell-shaded clouds
 * F) Horizon glow band
 *
 * Handles: parallax clouds, hills, floating crypto symbols,
 * star field, lightning effects, bear market overlay.
 */

(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    // Screen dimensions (set via init)
    let gameWidth = 0;
    let gameHeight = 0;

    // Sky state
    let clouds = [];
    let hills = [];
    let floatingSymbols = [];
    let stars = [];
    let shootingStars = [];
    let atmosphericParticles = [];
    let skyTime = 0;
    let shootingStarTimer = 0;

    // Gradient cache
    let cachedGradient = null;
    let cachedGradientKey = '';

    // Silhouette cache (per hill layer)
    let hillSilhouettes = [];

    // Lightning state (Bear Market)
    let lightningTimer = 0;
    let lightningFlash = 0;
    let lightningTarget = 0;

    // Off-screen canvas cache (v4.31)
    let _skyBgCanvas = null, _skyBgCtx = null;
    let _skyBgKey = '';
    let _hillsCanvas = null, _hillsCtx = null;
    let _hillsFrameCount = 0;
    let _hillsNeedsRedraw = true;
    let _hillsColorKey = '';
    let _hillsBossWas = false;
    let _offscreenW = 0, _offscreenH = 0;

    // Shorthand
    const CU = () => G.ColorUtils;

    /**
     * Create/resize off-screen canvases, or dispose if disabled
     */
    function _ensureOffscreen() {
        const cfg = G.Balance?.SKY?.OFFSCREEN;
        if (!cfg?.ENABLED) {
            // Dispose
            _skyBgCanvas = _skyBgCtx = null;
            _hillsCanvas = _hillsCtx = null;
            _offscreenW = _offscreenH = 0;
            return;
        }
        if (gameWidth <= 0 || gameHeight <= 0) return;
        if (_offscreenW === gameWidth && _offscreenH === gameHeight) return;

        // Sky background canvas (opaque — no alpha needed)
        _skyBgCanvas = document.createElement('canvas');
        _skyBgCanvas.width = gameWidth;
        _skyBgCanvas.height = gameHeight;
        _skyBgCtx = _skyBgCanvas.getContext('2d', { alpha: false });

        // Hills canvas (transparent — hills drawn over sky)
        _hillsCanvas = document.createElement('canvas');
        _hillsCanvas.width = gameWidth;
        _hillsCanvas.height = gameHeight;
        _hillsCtx = _hillsCanvas.getContext('2d');

        _offscreenW = gameWidth;
        _offscreenH = gameHeight;

        // Invalidate caches — gradient created on one context can't be reused on another
        cachedGradient = null;
        cachedGradientKey = '';
        _skyBgKey = '';
        _hillsNeedsRedraw = true;
        _hillsColorKey = '';
        _hillsFrameCount = 0;
    }

    /**
     * Initialize sky system with canvas dimensions
     */
    function init(width, height) {
        gameWidth = width;
        gameHeight = height;
        initClouds();
        initHills();
        initFloatingSymbols();
        initStars();
        initAtmosphericParticles();
        skyTime = 0;
        shootingStarTimer = 2 + Math.random() * 5;
        lightningTimer = 0;
        lightningFlash = 0;
        lightningTarget = 0;
        cachedGradient = null;
        cachedGradientKey = '';
        _ensureOffscreen();
    }

    /**
     * Update dimensions (for resize)
     */
    function setDimensions(width, height) {
        gameWidth = width;
        gameHeight = height;
        initHills();
        // Invalidate gradient cache on resize
        cachedGradient = null;
        cachedGradientKey = '';
        // Recreate off-screen canvases at new size
        _offscreenW = 0;
        _offscreenH = 0;
        _ensureOffscreen();
    }

    /**
     * Initialize star array (deterministic positions)
     */
    function initStars() {
        const cfg = G.Balance?.SKY?.STARS;
        const count = cfg?.COUNT || 90;
        const minSize = cfg?.MIN_SIZE || 1.5;
        const maxSize = cfg?.MAX_SIZE || 3.5;
        stars = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                x: (i * 137.5 + 42) % gameWidth,
                y: (i * 89.3 + 17) % (gameHeight * 0.65),
                size: minSize + ((i * 31) % 100) / 100 * (maxSize - minSize),
                brightness: 0.3 + ((i * 53) % 100) / 100 * 0.7,
                twinklePhase: (i * 1.7) % (Math.PI * 2),
                twinkleSpeed: 1.5 + (i % 5) * 0.4,
                isCross: (i % 5 === 0),    // every 5th star is a cross shape
                depthFactor: 0.3 + ((i * 67) % 100) / 100 * 0.7  // parallax depth
            });
        }
    }

    /**
     * Initialize cloud array with multi-lobe data
     */
    function initClouds() {
        clouds = [];
        const cfg = G.Balance?.SKY?.CLOUDS;
        const count = cfg?.COUNT || 12;
        const lobesMin = cfg?.LOBES_MIN || 2;
        const lobesMax = cfg?.LOBES_MAX || 4;

        for (let i = 0; i < count; i++) {
            const lobeCount = (cfg?.ENABLED !== false && lobesMin >= 2)
                ? lobesMin + Math.floor(((i * 37) % 100) / 100 * (lobesMax - lobesMin + 1))
                : 1;
            const baseW = Math.random() * 100 + 50;
            const baseH = Math.random() * 40 + 20;

            // Generate lobe offsets
            const lobes = [];
            for (let l = 0; l < lobeCount; l++) {
                lobes.push({
                    ox: (l - (lobeCount - 1) / 2) * (baseW * 0.35) + (Math.random() - 0.5) * baseW * 0.15,
                    oy: (Math.random() - 0.5) * baseH * 0.3,
                    wMult: 0.7 + Math.random() * 0.5,
                    hMult: 0.6 + Math.random() * 0.5
                });
            }

            clouds.push({
                x: Math.random() * gameWidth,
                y: Math.random() * gameHeight * 0.5,
                w: baseW,
                h: baseH,
                speed: Math.random() * 20 + 10,
                layer: Math.floor(Math.random() * 3),
                lobes: lobes
            });
        }
    }

    /**
     * Initialize parallax hills (5 layers from config)
     */
    function initHills() {
        const cfg = G.Balance?.SKY?.HILLS;
        const layers = cfg?.LAYERS || [
            { yRatio: 0.65, height: 60,  speed: 2  },
            { yRatio: 0.70, height: 80,  speed: 4  },
            { yRatio: 0.75, height: 100, speed: 5  },
            { yRatio: 0.80, height: 110, speed: 12 },
            { yRatio: 0.85, height: 90,  speed: 20 }
        ];
        hills = [];
        for (let i = 0; i < layers.length; i++) {
            const l = layers[i];
            hills.push({
                layer: i,
                y: gameHeight * l.yRatio,
                height: l.height,
                speed: l.speed,
                offset: i * 50,
                amp1: l.amp1 || 25,
                freq1: l.freq1 || 0.02,
                amp2: l.amp2 || 15,
                freq2: l.freq2 || 0.01
            });
        }
        // Generate silhouettes for distant layers
        initHillSilhouettes();
    }

    /**
     * Generate deterministic silhouette positions for distant hill layers
     */
    function initHillSilhouettes() {
        const cfg = G.Balance?.SKY?.HILLS?.SILHOUETTES;
        hillSilhouettes = [];
        if (!cfg?.ENABLED) return;

        const maxLayer = cfg.MAX_LAYER || 2;
        for (let li = 0; li <= maxLayer && li < hills.length; li++) {
            const layerSils = [];
            // deterministic seed per layer
            let seed = (li + 1) * 7919;
            const step = 40;
            for (let x = 0; x < gameWidth + 200; x += step) {
                seed = (seed * 1103515245 + 12345) & 0x7fffffff;
                const chance = (seed % 1000) / 1000;
                if (chance < (cfg.DENSITY || 0.02) * step) {
                    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
                    const isTree = (seed % 2) === 0;
                    if (isTree) {
                        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
                        const h = (cfg.TREE_HEIGHT_MIN || 6) +
                            (seed % ((cfg.TREE_HEIGHT_MAX || 18) - (cfg.TREE_HEIGHT_MIN || 6)));
                        layerSils.push({ type: 'tree', x: x, h: h });
                    } else {
                        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
                        const w = (cfg.BUILDING_WIDTH_MIN || 8) +
                            (seed % ((cfg.BUILDING_WIDTH_MAX || 16) - (cfg.BUILDING_WIDTH_MIN || 8)));
                        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
                        const h = (cfg.BUILDING_HEIGHT_MIN || 10) +
                            (seed % ((cfg.BUILDING_HEIGHT_MAX || 25) - (cfg.BUILDING_HEIGHT_MIN || 10)));
                        layerSils.push({ type: 'building', x: x, w: w, h: h });
                    }
                }
            }
            hillSilhouettes[li] = layerSils;
        }
    }

    /**
     * Initialize floating crypto symbols
     */
    function initFloatingSymbols() {
        const symbols = ['₿', 'Ξ', '◎', '₮', '∞'];
        floatingSymbols = [];
        for (let i = 0; i < 8; i++) {
            floatingSymbols.push({
                symbol: symbols[i % symbols.length],
                x: Math.random() * gameWidth,
                y: Math.random() * gameHeight * 0.6 + gameHeight * 0.15,
                speed: Math.random() * 15 + 8,
                size: Math.random() * 12 + 14,
                alpha: Math.random() * 0.15 + 0.08,
                wobble: Math.random() * Math.PI * 2
            });
        }
    }

    /**
     * Initialize atmospheric particles
     */
    function initAtmosphericParticles() {
        const cfg = G.Balance?.SKY?.PARTICLES;
        const count = cfg?.COUNT || 20;
        const minSize = cfg?.MIN_SIZE || 1.5;
        const maxSize = cfg?.MAX_SIZE || 3.5;
        atmosphericParticles = [];
        for (let i = 0; i < count; i++) {
            atmosphericParticles.push({
                x: Math.random() * gameWidth,
                y: Math.random() * gameHeight,
                size: minSize + Math.random() * (maxSize - minSize),
                alpha: (cfg?.MIN_ALPHA || 0.06) + Math.random() * ((cfg?.MAX_ALPHA || 0.20) - (cfg?.MIN_ALPHA || 0.06)),
                phase: Math.random() * Math.PI * 2,
                driftX: (Math.random() - 0.5) * (cfg?.DRIFT_SPEED || 12),
                driftY: -(Math.random() * 5 + 3)  // slight upward drift
            });
        }
    }

    /**
     * Reset sky state (for new game)
     */
    function reset() {
        initClouds();
        initHills();
        initFloatingSymbols();
        initStars();
        initAtmosphericParticles();
        shootingStars = [];
        skyTime = 0;
        shootingStarTimer = 2 + Math.random() * 5;
        lightningTimer = 0;
        lightningFlash = 0;
        lightningTarget = 0;
        cachedGradient = null;
        cachedGradientKey = '';
        // Reset off-screen dirty flags
        _skyBgKey = '';
        _hillsNeedsRedraw = true;
        _hillsColorKey = '';
        _hillsFrameCount = 0;
        _hillsBossWas = false;
    }

    /**
     * Update sky animations
     */
    function update(dt, context = {}) {
        const { isBearMarket = false, gameState = 'PLAY' } = context;
        const speedMult = isBearMarket ? 5.0 : 1.0;
        skyTime += dt;

        let effects = { shake: 0, playSound: null };

        // Update clouds
        for (let i = 0; i < clouds.length; i++) {
            const c = clouds[i];
            c.x -= c.speed * (c.layer + 1) * 0.5 * speedMult * dt;
            if (c.x + c.w < -50) {
                c.x = gameWidth + 50 + Math.random() * 100;
                c.y = Math.random() * gameHeight * 0.5;
            }
        }

        // Update parallax hills offset
        for (let i = 0; i < hills.length; i++) {
            const h = hills[i];
            h.offset += h.speed * speedMult * dt;
            if (h.offset > 628) h.offset -= 628;
        }

        // Update floating crypto symbols
        for (let i = 0; i < floatingSymbols.length; i++) {
            const s = floatingSymbols[i];
            s.x -= s.speed * speedMult * dt;
            s.wobble += dt * 2;
            if (s.x < -30) {
                s.x = gameWidth + 30;
                s.y = Math.random() * gameHeight * 0.5 + gameHeight * 0.15;
            }
        }

        // Update atmospheric particles
        const pCfg = G.Balance?.SKY?.PARTICLES;
        for (let i = 0; i < atmosphericParticles.length; i++) {
            const p = atmosphericParticles[i];
            p.x += p.driftX * speedMult * dt;
            p.y += p.driftY * speedMult * dt;
            p.phase += (pCfg?.WOBBLE_SPEED || 1.5) * dt;
            p.x += Math.sin(p.phase) * (pCfg?.WOBBLE_AMP || 15) * dt;
            // Wrap
            if (p.x < -10) p.x = gameWidth + 10;
            if (p.x > gameWidth + 10) p.x = -10;
            if (p.y < -10) p.y = gameHeight + 10;
            if (p.y > gameHeight + 10) p.y = -10;
        }

        // Update shooting stars
        const sCfg = G.Balance?.SKY?.STARS?.SHOOTING_STARS;
        if (sCfg?.ENABLED !== false) {
            shootingStarTimer -= dt;
            if (shootingStarTimer <= 0 && shootingStars.length < (sCfg?.MAX_ACTIVE || 2)) {
                // Spawn a shooting star
                const speed = sCfg?.SPEED || 350;
                const angle = Math.PI * 0.15 + Math.random() * Math.PI * 0.2; // 27-63 deg
                shootingStars.push({
                    x: Math.random() * gameWidth * 0.8,
                    y: Math.random() * gameHeight * 0.3,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    length: sCfg?.LENGTH || 40,
                    alpha: 0.8 + Math.random() * 0.2,
                    life: 0
                });
                shootingStarTimer = (sCfg?.SPAWN_INTERVAL_MIN || 4) +
                    Math.random() * ((sCfg?.SPAWN_INTERVAL_MAX || 12) - (sCfg?.SPAWN_INTERVAL_MIN || 4));
            }
            for (let i = shootingStars.length - 1; i >= 0; i--) {
                const ss = shootingStars[i];
                ss.x += ss.vx * dt;
                ss.y += ss.vy * dt;
                ss.life += dt;
                ss.alpha -= dt * 0.5;
                if (ss.alpha <= 0 || ss.x > gameWidth + 50 || ss.y > gameHeight) {
                    shootingStars.splice(i, 1);
                }
            }
        }

        // Star parallax drift
        const starDrift = (G.Balance?.SKY?.STARS?.DRIFT_SPEED || 3) * dt;
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            s.x -= starDrift * s.depthFactor;
            if (s.x < -5) s.x += gameWidth + 10;
        }

        // Bear Market Lightning
        if (isBearMarket && gameState === 'PLAY') {
            lightningTimer -= dt;
            if (lightningTimer <= 0) {
                lightningTarget = 0.4;
                lightningTimer = 1.5 + Math.random() * 3;
                effects.shake = 8;
                effects.playSound = 'hit';
            }
        }
        if (lightningTarget > 0) {
            lightningFlash += (lightningTarget - lightningFlash) * dt * 30;
            if (lightningFlash >= lightningTarget * 0.95) {
                lightningFlash = lightningTarget;
                lightningTarget = 0;
            }
        } else if (lightningFlash > 0) {
            lightningFlash -= dt * 1.5;
            if (lightningFlash < 0) lightningFlash = 0;
        }

        return effects;
    }

    /**
     * Render sky gradient onto off-screen canvas (only on key change)
     */
    function _renderSkyBg(level, isBearMarket, bossActive) {
        const key = level + '-' + (isBearMarket ? 1 : 0) + '-' + (bossActive ? 1 : 0) + '-' + gameHeight;
        if (key === _skyBgKey) return;
        drawBands(_skyBgCtx, level, isBearMarket, bossActive);
        _skyBgKey = key;
    }

    /**
     * Render hills onto off-screen canvas (throttled + invalidation)
     */
    function _renderHills(level, isBearMarket) {
        // Color invalidation: level or bear market changed
        const colorKey = level + '-' + (isBearMarket ? 1 : 0);
        if (colorKey !== _hillsColorKey) {
            _hillsNeedsRedraw = true;
            _hillsColorKey = colorKey;
        }

        // Boss transition: was boss, now not → force redraw
        if (_hillsBossWas) {
            _hillsNeedsRedraw = true;
            _hillsBossWas = false;
        }

        // Throttle check
        const interval = G.Balance?.SKY?.OFFSCREEN?.HILLS_REDRAW_INTERVAL || 2;
        _hillsFrameCount++;
        if (!_hillsNeedsRedraw && (_hillsFrameCount % interval !== 0)) return;

        // Redraw
        _hillsCtx.clearRect(0, 0, gameWidth, gameHeight);
        drawHills(_hillsCtx, level, isBearMarket, false);
        _hillsNeedsRedraw = false;
    }

    /**
     * Draw the complete sky background
     */
    function draw(ctx, context = {}) {
        const { level = 1, isBearMarket = false, bossActive = false } = context;
        const skyEnabled = G.Balance?.SKY?.ENABLED !== false;
        const useOffscreen = G.Balance?.SKY?.OFFSCREEN?.ENABLED && _skyBgCanvas && _hillsCanvas;

        if (useOffscreen) {
            // Sky BG: blit cached gradient (redrawn only on level/bear/boss change)
            _renderSkyBg(level, isBearMarket, bossActive);
            ctx.drawImage(_skyBgCanvas, 0, 0);

            // Animated elements: draw direct every frame
            drawFloatingSymbols(ctx, level, isBearMarket, bossActive);
            drawStars(ctx, level, isBearMarket, bossActive);
            if (skyEnabled && G.Balance?.SKY?.PARTICLES?.ENABLED !== false) {
                drawAtmosphericParticles(ctx, level, isBearMarket, bossActive);
            }
            if (skyEnabled && G.Balance?.SKY?.HORIZON_GLOW?.ENABLED !== false) {
                drawHorizonGlow(ctx, level, isBearMarket, bossActive);
            }

            // Hills: throttled off-screen redraw
            if (!bossActive) {
                _renderHills(level, isBearMarket);
                ctx.drawImage(_hillsCanvas, 0, 0);
            }
            if (bossActive) _hillsBossWas = true;

            drawClouds(ctx, level, isBearMarket);
            drawLightning(ctx);
        } else {
            // Fallback: original direct-draw pipeline (pre-v4.31)
            drawBands(ctx, level, isBearMarket, bossActive);
            drawFloatingSymbols(ctx, level, isBearMarket, bossActive);
            drawStars(ctx, level, isBearMarket, bossActive);
            if (skyEnabled && G.Balance?.SKY?.PARTICLES?.ENABLED !== false) {
                drawAtmosphericParticles(ctx, level, isBearMarket, bossActive);
            }
            if (skyEnabled && G.Balance?.SKY?.HORIZON_GLOW?.ENABLED !== false) {
                drawHorizonGlow(ctx, level, isBearMarket, bossActive);
            }
            drawHills(ctx, level, isBearMarket, bossActive);
            drawClouds(ctx, level, isBearMarket);
            drawLightning(ctx);
        }
    }

    /**
     * Draw sky color bands (gradient or flat fallback)
     */
    function drawBands(ctx, level, isBearMarket, bossActive) {
        const skyCfg = G.Balance?.SKY;
        const useGradient = skyCfg?.ENABLED !== false && skyCfg?.GRADIENTS?.ENABLED !== false;

        if (useGradient) {
            // Build cache key
            const key = level + '-' + (isBearMarket ? 1 : 0) + '-' + (bossActive ? 1 : 0) + '-' + gameHeight;
            if (key !== cachedGradientKey || !cachedGradient) {
                const grad = skyCfg.GRADIENTS;
                let colors;
                if (isBearMarket) {
                    colors = grad.BEAR;
                } else if (bossActive) {
                    colors = grad.BOSS;
                } else {
                    const skyLevel = Math.min(5, level);
                    colors = grad.LEVELS[skyLevel] || grad.LEVELS[1];
                }
                const lg = ctx.createLinearGradient(0, 0, 0, gameHeight);
                const step = 1 / (colors.length - 1);
                for (let i = 0; i < colors.length; i++) {
                    lg.addColorStop(i * step, colors[i]);
                }
                cachedGradient = lg;
                cachedGradientKey = key;
            }
            ctx.fillStyle = cachedGradient;
            ctx.fillRect(0, 0, gameWidth, gameHeight);
        } else {
            // Legacy flat bands
            let bands = [];
            if (isBearMarket) {
                bands = [
                    { color: '#1a0000', height: 0.2 },
                    { color: '#2a0505', height: 0.25 },
                    { color: '#3a0a0a', height: 0.25 },
                    { color: '#2a0000', height: 0.3 }
                ];
            } else if (bossActive) {
                bands = [
                    { color: '#000008', height: 0.25 },
                    { color: '#05051a', height: 0.25 },
                    { color: '#0a0a20', height: 0.25 },
                    { color: '#0f0f28', height: 0.25 }
                ];
            } else {
                const skyLevel = Math.min(5, level);
                if (skyLevel === 1) {
                    bands = [
                        { color: '#3a80c9', height: 0.2 },
                        { color: '#5a9fd9', height: 0.25 },
                        { color: '#7bbfeb', height: 0.25 },
                        { color: '#9dd5f5', height: 0.3 }
                    ];
                } else if (skyLevel === 2) {
                    bands = [
                        { color: '#2a6bb8', height: 0.2 },
                        { color: '#4a8bc8', height: 0.25 },
                        { color: '#7ab5d8', height: 0.25 },
                        { color: '#d4c87c', height: 0.3 }
                    ];
                } else if (skyLevel === 3) {
                    bands = [
                        { color: '#3a4558', height: 0.2 },
                        { color: '#8b49a6', height: 0.2 },
                        { color: '#d74c3c', height: 0.25 },
                        { color: '#e38c22', height: 0.35 }
                    ];
                } else if (skyLevel === 4) {
                    bands = [
                        { color: '#15152e', height: 0.25 },
                        { color: '#2a2a4e', height: 0.25 },
                        { color: '#3a2f5b', height: 0.25 },
                        { color: '#2d1b4e', height: 0.25 }
                    ];
                } else {
                    bands = [
                        { color: '#080812', height: 0.25 },
                        { color: '#101025', height: 0.25 },
                        { color: '#151535', height: 0.25 },
                        { color: '#1a1a40', height: 0.25 }
                    ];
                }
            }
            let yPos = 0;
            for (const band of bands) {
                const bandHeight = gameHeight * band.height;
                ctx.fillStyle = band.color;
                ctx.fillRect(0, yPos, gameWidth, bandHeight + 1);
                yPos += bandHeight;
            }
        }
    }

    /**
     * Draw floating crypto symbols
     */
    function drawFloatingSymbols(ctx, level, isBearMarket, bossActive) {
        if (isBearMarket || bossActive) return;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < floatingSymbols.length; i++) {
            const s = floatingSymbols[i];
            const wobbleY = Math.sin(s.wobble) * 5;
            ctx.globalAlpha = s.alpha;
            ctx.font = `bold ${s.size}px Arial`;
            ctx.fillStyle = level >= 4 ? '#8888aa' : '#aabbcc';
            ctx.fillText(s.symbol, s.x, s.y + wobbleY);
        }
        ctx.globalAlpha = 1;
    }

    /**
     * Draw star field (enhanced — visible from L3+)
     */
    function drawStars(ctx, level, isBearMarket, bossActive) {
        const cfg = G.Balance?.SKY?.STARS;
        if (cfg?.ENABLED === false) {
            // Legacy fallback
            drawStarsLegacy(ctx, level, isBearMarket, bossActive);
            return;
        }

        // Determine visibility
        const minLevel = cfg?.MIN_VISIBLE_LEVEL || 3;
        const isVisible = level >= minLevel || bossActive;
        if (!isVisible || isBearMarket) return;

        // Get alpha for this level
        let baseAlpha;
        if (bossActive) {
            baseAlpha = 1.0;
        } else {
            const alphaMap = cfg?.ALPHA_BY_LEVEL || { 3: 0.25, 4: 0.55, 5: 1.0 };
            baseAlpha = alphaMap[Math.min(level, 5)] || 1.0;
        }

        ctx.fillStyle = '#ffffcc';
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            const twinkle = Math.sin(skyTime * s.twinkleSpeed + s.twinklePhase);
            const alpha = s.brightness * baseAlpha * (0.6 + twinkle * 0.4);
            if (alpha < 0.05) continue;
            const size = s.size * (1 + twinkle * 0.15);

            ctx.globalAlpha = alpha;

            if (s.isCross) {
                // 4-point star shape
                ctx.beginPath();
                ctx.moveTo(s.x, s.y - size);
                ctx.lineTo(s.x + size * 0.3, s.y);
                ctx.lineTo(s.x + size, s.y);
                ctx.lineTo(s.x + size * 0.3, s.y);
                ctx.lineTo(s.x, s.y + size);
                ctx.lineTo(s.x - size * 0.3, s.y);
                ctx.lineTo(s.x - size, s.y);
                ctx.lineTo(s.x - size * 0.3, s.y);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(s.x, s.y, size * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw shooting stars
        for (let i = 0; i < shootingStars.length; i++) {
            const ss = shootingStars[i];
            if (ss.alpha <= 0) continue;
            const len = ss.length;
            const nx = ss.vx / Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy);
            const ny = ss.vy / Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy);

            ctx.globalAlpha = ss.alpha * baseAlpha;
            ctx.strokeStyle = '#ffffee';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ss.x, ss.y);
            ctx.lineTo(ss.x - nx * len, ss.y - ny * len);
            ctx.stroke();

            // Bright head
            ctx.globalAlpha = ss.alpha * baseAlpha * 1.2;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ss.x, ss.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    }

    /**
     * Legacy star drawing (for when SKY.STARS.ENABLED is false)
     */
    function drawStarsLegacy(ctx, level, isBearMarket, bossActive) {
        const isNight = level >= 5 || bossActive;
        if (!isNight || isBearMarket) return;

        ctx.fillStyle = '#ffffcc';
        for (let i = 0; i < 40; i++) {
            const sx = (i * 137 + level * 50) % gameWidth;
            const sy = (i * 89 + level * 30) % (gameHeight * 0.6);
            const baseSize = (i % 3) + 2;
            const twinkle = Math.sin(skyTime * (2 + i * 0.3) + i * 1.7);
            const alpha = 0.4 + (i % 4) * 0.1 + twinkle * 0.25;
            const size = baseSize * (1 + twinkle * 0.15);
            ctx.globalAlpha = Math.max(0.15, alpha);

            if (i % 3 === 0) {
                ctx.beginPath();
                ctx.moveTo(sx, sy - size);
                ctx.lineTo(sx + size * 0.3, sy);
                ctx.lineTo(sx + size, sy);
                ctx.lineTo(sx + size * 0.3, sy);
                ctx.lineTo(sx, sy + size);
                ctx.lineTo(sx - size * 0.3, sy);
                ctx.lineTo(sx - size, sy);
                ctx.lineTo(sx - size * 0.3, sy);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(sx, sy, size * 0.6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }

    /**
     * Draw atmospheric particles (dust, pollen, firefly, ember)
     */
    function drawAtmosphericParticles(ctx, level, isBearMarket, bossActive) {
        const cfg = G.Balance?.SKY?.PARTICLES;
        if (!cfg?.ENABLED) return;

        const theme = isBearMarket
            ? cfg.BEAR_THEME
            : cfg.THEMES[Math.min(level, 5)] || cfg.THEMES[1];
        const outlineThreshold = cfg.OUTLINE_THRESHOLD || 3.0;
        const isFirefly = theme.type === 'firefly';
        const blinkSpeed = cfg.FIREFLY_BLINK_SPEED || 3.0;

        for (let i = 0; i < atmosphericParticles.length; i++) {
            const p = atmosphericParticles[i];
            let alpha = p.alpha;

            // Firefly blinking
            if (isFirefly) {
                const blink = Math.sin(skyTime * blinkSpeed + p.phase * 3);
                alpha *= Math.max(0, blink);
                if (alpha < 0.01) continue;
            }

            ctx.globalAlpha = alpha;

            // Cell-shaded: outline on larger particles
            if (p.size >= outlineThreshold) {
                ctx.fillStyle = '#111';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size + 1, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.fillStyle = theme.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    /**
     * Draw horizon glow band (drawn just before hills)
     */
    function drawHorizonGlow(ctx, level, isBearMarket, bossActive) {
        if (bossActive) return;

        const cfg = G.Balance?.SKY?.HORIZON_GLOW;
        if (!cfg?.ENABLED) return;

        // Get Y position from first hill layer
        const firstHillY = hills.length > 0 ? hills[0].y : gameHeight * 0.65;
        const h = cfg.HEIGHT || 8;
        const pulse = Math.sin(skyTime * (cfg.PULSE_SPEED || 1.5));
        const alpha = (cfg.ALPHA_MIN || 0.12) + (pulse * 0.5 + 0.5) * ((cfg.ALPHA_MAX || 0.28) - (cfg.ALPHA_MIN || 0.12));

        let color;
        if (isBearMarket) {
            color = cfg.BEAR_COLOR || '#4a0000';
        } else {
            color = cfg.COLORS[Math.min(level, 5)] || cfg.COLORS[1];
        }

        ctx.globalAlpha = alpha;
        const grad = ctx.createLinearGradient(0, firstHillY - h, 0, firstHillY + h);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.4, color);
        grad.addColorStop(0.6, color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, firstHillY - h, gameWidth, h * 2);
        ctx.globalAlpha = 1;
    }

    /**
     * Draw parallax hills (5 layers + silhouettes)
     */
    function drawHills(ctx, level, isBearMarket, bossActive) {
        if (bossActive) return;

        const cfg = G.Balance?.SKY?.HILLS;
        const useEnhanced = cfg?.ENABLED !== false;

        let hillColors;
        if (useEnhanced) {
            if (isBearMarket) {
                hillColors = cfg.BEAR_COLORS || ['#1a0808', '#220606', '#1e0505', '#1a0404', '#160303'];
            } else {
                const lvl = Math.min(level, 5);
                hillColors = cfg.COLORS[lvl] || cfg.COLORS[1];
            }
        } else {
            // Legacy 3 colors
            hillColors = isBearMarket
                ? ['#1a0808', '#250c0c', '#301010']
                : level >= 4
                    ? ['#151530', '#1a1a40', '#202050']
                    : level >= 3
                        ? ['#4a3040', '#5a3848', '#6a4050']
                        : ['#3a6080', '#4a7090', '#5a80a0'];
        }

        ctx.lineWidth = 3;

        for (let idx = 0; idx < hills.length; idx++) {
            const h = hills[idx];
            const color = hillColors[idx] || hillColors[hillColors.length - 1];
            const y = h.y;

            ctx.fillStyle = color;
            ctx.strokeStyle = '#111';
            ctx.beginPath();
            ctx.moveTo(-10, gameHeight + 10);

            // Store wave Y values for silhouette placement
            const waveYs = [];
            const step = 30;
            for (let x = -10; x <= gameWidth + 10; x += step) {
                const waveY = y + Math.sin((x + h.offset) * h.freq1) * h.amp1
                            + Math.sin((x + h.offset) * h.freq2 + idx) * h.amp2;
                ctx.lineTo(x, waveY);
                waveYs.push({ x: x, y: waveY });
            }

            ctx.lineTo(gameWidth + 10, gameHeight + 10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Draw silhouettes on distant layers
            if (useEnhanced && hillSilhouettes[idx]) {
                const sils = hillSilhouettes[idx];
                ctx.fillStyle = color;
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 1.5;

                for (let si = 0; si < sils.length; si++) {
                    const sil = sils[si];
                    // Find wave Y at this x position (accounting for offset)
                    const wrappedX = ((sil.x + h.offset) % (gameWidth + 200));
                    const screenX = wrappedX < 0 ? wrappedX + gameWidth + 200 : wrappedX;
                    if (screenX < -20 || screenX > gameWidth + 20) continue;

                    const silY = y + Math.sin((screenX + h.offset) * h.freq1) * h.amp1
                               + Math.sin((screenX + h.offset) * h.freq2 + idx) * h.amp2;

                    if (sil.type === 'tree') {
                        // Triangle tree
                        const tw = sil.h * 0.6;
                        ctx.beginPath();
                        ctx.moveTo(screenX, silY - sil.h);
                        ctx.lineTo(screenX - tw / 2, silY);
                        ctx.lineTo(screenX + tw / 2, silY);
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                    } else {
                        // Rectangle building
                        ctx.fillRect(screenX - sil.w / 2, silY - sil.h, sil.w, sil.h);
                        ctx.strokeRect(screenX - sil.w / 2, silY - sil.h, sil.w, sil.h);
                    }
                }
                ctx.lineWidth = 3;
            }
        }
    }

    /**
     * Draw clouds (multi-lobe cell-shaded)
     */
    function drawClouds(ctx, level, isBearMarket) {
        const showClouds = level < 5;
        if (!showClouds) return;

        const cfg = G.Balance?.SKY?.CLOUDS;
        const useEnhanced = cfg?.ENABLED !== false && cfg?.LOBES_MIN >= 2;

        const cloudAlpha = level >= 4 ? 0.4 : 0.85;
        ctx.globalAlpha = cloudAlpha;

        // Choose color scheme
        let colors;
        if (useEnhanced) {
            if (isBearMarket) {
                colors = cfg.COLORS.BEAR;
            } else if (level >= 4) {
                colors = cfg.COLORS.NIGHT;
            } else {
                colors = cfg.COLORS.NORMAL;
            }
        } else {
            colors = {
                shadow: isBearMarket ? '#200808' : '#c8d8e8',
                main: isBearMarket ? '#301010' : '#f0f8ff',
                highlight: isBearMarket ? '#401818' : '#ffffff',
                outline: isBearMarket ? '#401515' : '#8090a0'
            };
        }

        const shadowOffY = cfg?.SHADOW_OFFSET_Y || 4;
        const outlineWidth = cfg?.OUTLINE_WIDTH || 2;
        const layerScale = cfg?.LAYER_SCALE || { back: 1.3, front: 0.7 };
        const highlightOff = cfg?.HIGHLIGHT_OFFSET || -0.25;

        for (let i = 0; i < clouds.length; i++) {
            const c = clouds[i];
            // Scale by layer depth
            const scale = c.layer === 0 ? layerScale.back : c.layer === 2 ? layerScale.front : 1.0;

            if (useEnhanced && c.lobes && c.lobes.length > 1) {
                // Multi-lobe cloud
                const sw = c.w * scale;
                const sh = c.h * scale;

                // Shadow layer
                ctx.fillStyle = colors.shadow;
                for (let l = 0; l < c.lobes.length; l++) {
                    const lb = c.lobes[l];
                    ctx.beginPath();
                    ctx.ellipse(
                        c.x + lb.ox * scale,
                        c.y + lb.oy * scale + shadowOffY,
                        sw / 2 * lb.wMult,
                        sh / 2 * lb.hMult,
                        0, 0, Math.PI * 2
                    );
                    ctx.fill();
                }

                // Main body
                ctx.fillStyle = colors.main;
                for (let l = 0; l < c.lobes.length; l++) {
                    const lb = c.lobes[l];
                    ctx.beginPath();
                    ctx.ellipse(
                        c.x + lb.ox * scale,
                        c.y + lb.oy * scale,
                        sw / 2 * lb.wMult,
                        sh / 2.2 * lb.hMult,
                        0, 0, Math.PI * 2
                    );
                    ctx.fill();
                }

                // Highlight lobe (top, lighter)
                ctx.fillStyle = colors.highlight;
                const hl = c.lobes[Math.floor(c.lobes.length / 2)]; // center lobe
                ctx.beginPath();
                ctx.ellipse(
                    c.x + hl.ox * scale,
                    c.y + hl.oy * scale + sh * highlightOff,
                    sw / 2 * hl.wMult * 0.7,
                    sh / 3 * hl.hMult * 0.6,
                    0, 0, Math.PI * 2
                );
                ctx.fill();

                // Outline per lobe
                ctx.strokeStyle = colors.outline;
                ctx.lineWidth = outlineWidth;
                for (let l = 0; l < c.lobes.length; l++) {
                    const lb = c.lobes[l];
                    ctx.beginPath();
                    ctx.ellipse(
                        c.x + lb.ox * scale,
                        c.y + lb.oy * scale,
                        sw / 2 * lb.wMult,
                        sh / 2.2 * lb.hMult,
                        0, 0, Math.PI * 2
                    );
                    ctx.stroke();
                }
            } else {
                // Legacy single-ellipse cloud
                ctx.fillStyle = colors.shadow;
                ctx.beginPath();
                ctx.ellipse(c.x, c.y + 3, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = colors.main;
                ctx.beginPath();
                ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2.2, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = colors.outline;
                ctx.lineWidth = outlineWidth;
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
    }

    /**
     * Draw lightning flash and bolts
     */
    function drawLightning(ctx) {
        if (!G.Balance?.JUICE?.SCREEN_EFFECTS?.LIGHTNING) return;
        if (lightningFlash <= 0) return;

        ctx.fillStyle = `rgba(200, 150, 255, ${lightningFlash * 0.6})`;
        ctx.fillRect(0, 0, gameWidth, gameHeight);

        if (lightningFlash > 0.15) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${lightningFlash * 2})`;
            ctx.lineWidth = 3;
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 15;

            for (let bolt = 0; bolt < 2; bolt++) {
                const startX = gameWidth * 0.2 + bolt * gameWidth * 0.5 + Math.random() * 50;
                let x = startX;
                let y = 0;

                ctx.beginPath();
                ctx.moveTo(x, y);

                while (y < gameHeight * 0.4) {
                    x += (Math.random() - 0.5) * 40;
                    y += 20 + Math.random() * 30;
                    ctx.lineTo(x, y);

                    if (Math.random() < 0.3) {
                        const branchX = x + (Math.random() - 0.5) * 60;
                        const branchY = y + 30 + Math.random() * 20;
                        ctx.moveTo(x, y);
                        ctx.lineTo(branchX, branchY);
                        ctx.moveTo(x, y);
                    }
                }
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }
    }

    /**
     * Draw Bear Market danger overlay
     */
    function drawBearMarketOverlay(ctx, totalTime) {
        if (!G.Balance?.JUICE?.SCREEN_EFFECTS?.BEAR_VIGNETTE) return;
        const pulse = Math.sin(totalTime * 2) * 0.1 + 0.25;
        const gradient = ctx.createRadialGradient(
            gameWidth / 2, gameHeight / 2, gameHeight * 0.3,
            gameWidth / 2, gameHeight / 2, gameHeight * 0.8
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.7, `rgba(80, 0, 0, ${pulse * 0.3})`);
        gradient.addColorStop(1, `rgba(100, 0, 0, ${pulse * 0.6})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, gameWidth, gameHeight);

        // Blood rain
        ctx.strokeStyle = 'rgba(150, 20, 20, 0.4)';
        ctx.lineWidth = 2;
        const rainCount = 15;
        for (let i = 0; i < rainCount; i++) {
            const seed = i * 137.5 + totalTime * 100;
            const x = ((seed * 7) % gameWidth);
            const y = ((seed * 3 + totalTime * 300) % (gameHeight + 50)) - 25;
            const len = 15 + (i % 3) * 8;

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 2, y + len);
            ctx.stroke();
        }

        // Edge danger indicators
        const dangerPulse = Math.sin(totalTime * 8) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255, 0, 0, ${dangerPulse * 0.15})`;
        ctx.fillRect(0, 0, gameWidth, 8);
        ctx.fillRect(0, gameHeight - 8, gameWidth, 8);
    }

    // Getters
    function getLightningFlash() { return lightningFlash; }

    // Export to namespace
    G.SkyRenderer = {
        init,
        setDimensions,
        reset,
        update,
        draw,
        drawBearMarketOverlay,
        getLightningFlash
    };
})();
