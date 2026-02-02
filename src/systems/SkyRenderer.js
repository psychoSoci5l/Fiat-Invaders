/**
 * SkyRenderer.js - Centralized sky and background rendering
 *
 * Handles: parallax clouds, hills, floating crypto symbols,
 * star field, lightning effects, bear market overlay.
 * Extracted from main.js for modularity.
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
    let skyTime = 0;

    // Lightning state (Bear Market)
    let lightningTimer = 0;
    let lightningFlash = 0;

    /**
     * Initialize sky system with canvas dimensions
     */
    function init(width, height) {
        gameWidth = width;
        gameHeight = height;
        initClouds();
        initHills();
        initFloatingSymbols();
        skyTime = 0;
        lightningTimer = 0;
        lightningFlash = 0;
    }

    /**
     * Update dimensions (for resize)
     */
    function setDimensions(width, height) {
        gameWidth = width;
        gameHeight = height;
        // Reinitialize hills with new dimensions
        initHills();
    }

    /**
     * Initialize cloud array
     */
    function initClouds() {
        clouds = [];
        const count = 12;
        for (let i = 0; i < count; i++) {
            clouds.push({
                x: Math.random() * gameWidth,
                y: Math.random() * gameHeight * 0.5,
                w: Math.random() * 100 + 50,
                h: Math.random() * 40 + 20,
                speed: Math.random() * 20 + 10,
                layer: Math.floor(Math.random() * 3)
            });
        }
    }

    /**
     * Initialize parallax hills (3 layers)
     */
    function initHills() {
        hills = [
            { layer: 0, y: gameHeight * 0.75, height: 120, speed: 5, offset: 0 },
            { layer: 1, y: gameHeight * 0.80, height: 100, speed: 12, offset: 50 },
            { layer: 2, y: gameHeight * 0.85, height: 80, speed: 20, offset: 100 }
        ];
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
     * Reset sky state (for new game)
     */
    function reset() {
        initClouds();
        initHills();
        initFloatingSymbols();
        skyTime = 0;
        lightningTimer = 0;
        lightningFlash = 0;
    }

    /**
     * Update sky animations
     * @param {number} dt - Delta time
     * @param {Object} context - Game context { isBearMarket, gameState }
     * @returns {Object} Effects to apply { shake, playSound }
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
            if (c.x + c.w < 0) {
                c.x = gameWidth + 50;
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

        // Bear Market Lightning
        if (isBearMarket && gameState === 'PLAY') {
            lightningTimer -= dt;
            if (lightningTimer <= 0) {
                lightningFlash = 0.4;
                lightningTimer = 1.5 + Math.random() * 3;
                effects.shake = 8;
                effects.playSound = 'hit';
            }
        }
        if (lightningFlash > 0) lightningFlash -= dt * 1.5;

        return effects;
    }

    /**
     * Draw the complete sky background
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} context - { level, isBearMarket, bossActive }
     */
    function draw(ctx, context = {}) {
        const { level = 1, isBearMarket = false, bossActive = false } = context;

        drawBands(ctx, level, isBearMarket, bossActive);
        drawFloatingSymbols(ctx, level, isBearMarket, bossActive);
        drawStars(ctx, level, isBearMarket, bossActive);
        drawHills(ctx, level, isBearMarket, bossActive);
        drawClouds(ctx, level, isBearMarket);
        drawLightning(ctx);
    }

    /**
     * Draw sky color bands
     */
    function drawBands(ctx, level, isBearMarket, bossActive) {
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
     * Draw star field (night/boss)
     */
    function drawStars(ctx, level, isBearMarket, bossActive) {
        const isNight = level >= 5 || bossActive;
        if (!isNight || isBearMarket) return;

        ctx.fillStyle = '#ffffcc';
        ctx.lineWidth = 1;
        for (let i = 0; i < 40; i++) {
            const sx = (i * 137 + level * 50) % gameWidth;
            const sy = (i * 89 + level * 30) % (gameHeight * 0.6);
            const baseSize = (i % 3) + 2;
            const twinkle = Math.sin(skyTime * (2 + i * 0.3) + i * 1.7);
            const alpha = 0.4 + (i % 4) * 0.1 + twinkle * 0.25;
            const size = baseSize * (1 + twinkle * 0.15);
            ctx.globalAlpha = Math.max(0.15, alpha);

            if (i % 3 === 0) {
                // 4-point star shape
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
     * Draw parallax hills
     */
    function drawHills(ctx, level, isBearMarket, bossActive) {
        if (bossActive) return; // No hills during boss (space)

        const hillColors = isBearMarket
            ? ['#1a0808', '#250c0c', '#301010']
            : level >= 4
                ? ['#151530', '#1a1a40', '#202050']
                : level >= 3
                    ? ['#4a3040', '#5a3848', '#6a4050']
                    : ['#3a6080', '#4a7090', '#5a80a0'];

        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;

        for (let idx = 0; idx < hills.length; idx++) {
            const h = hills[idx];
            const color = hillColors[idx] || hillColors[0];
            const y = h.y;

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(-10, gameHeight + 10);

            for (let x = -10; x <= gameWidth + 10; x += 30) {
                const waveY = y + Math.sin((x + h.offset) * 0.02) * 25
                            + Math.sin((x + h.offset) * 0.01 + idx) * 15;
                ctx.lineTo(x, waveY);
            }

            ctx.lineTo(gameWidth + 10, gameHeight + 10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }

    /**
     * Draw clouds
     */
    function drawClouds(ctx, level, isBearMarket) {
        const showClouds = level < 5;
        if (!showClouds) return;

        const cloudAlpha = level >= 4 ? 0.4 : 0.85;
        ctx.globalAlpha = cloudAlpha;

        const shadowColor = isBearMarket ? '#200808' : '#c8d8e8';
        const mainColor = isBearMarket ? '#301010' : '#f0f8ff';
        const strokeColor = isBearMarket ? '#401515' : '#8090a0';

        for (let i = 0; i < clouds.length; i++) {
            const c = clouds[i];

            // Cloud shadow
            ctx.fillStyle = shadowColor;
            ctx.beginPath();
            ctx.ellipse(c.x, c.y + 3, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Main cloud
            ctx.fillStyle = mainColor;
            ctx.beginPath();
            ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2.2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Outline
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    /**
     * Draw lightning flash and bolts
     */
    function drawLightning(ctx) {
        if (lightningFlash <= 0) return;

        // Screen flash
        ctx.fillStyle = `rgba(200, 150, 255, ${lightningFlash * 0.6})`;
        ctx.fillRect(0, 0, gameWidth, gameHeight);

        // Draw lightning bolts
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
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} totalTime - Total elapsed time for animation
     */
    function drawBearMarketOverlay(ctx, totalTime) {
        // Pulsing red vignette
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

        // Blood rain effect
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

    // Getters for state inspection
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
