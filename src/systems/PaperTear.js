// PaperTear.js — Digital Scanline Void effect for intro title reveal
(function() {
    'use strict';
    var G = window.Game;
    var B; // Balance.PAPER_TEAR (lazy)

    var state = 'IDLE'; // IDLE, OPENING, OPEN, CLOSING, CLOSED
    var progress = 0;   // 0 = closed, 1 = fully open
    var timer = 0;
    var closeCallback = null;

    var width = 0, height = 0;
    var centerY = 0, halfH = 0;

    // Glitch segments: array of {x, len, offset}
    var glitchSegs = [];
    var glitchTimer = 0;

    // Shimmer phase (continuous)
    var shimmerPhase = 0;

    function cfg() {
        if (!B) B = G.Balance.PAPER_TEAR;
        return B;
    }

    function generateGlitch(w) {
        var c = cfg().GLITCH;
        var segs = [];
        for (var i = 0; i < c.COUNT; i++) {
            segs.push({
                x: Math.random() * (w - c.LENGTH_MAX),
                len: c.LENGTH_MIN + Math.random() * (c.LENGTH_MAX - c.LENGTH_MIN),
                offset: (c.OFFSET_MIN + Math.random() * (c.OFFSET_MAX - c.OFFSET_MIN)) * (Math.random() < 0.5 ? -1 : 1)
            });
        }
        return segs;
    }

    function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }
    function easeInQuart(t) { return t * t * t * t; }

    G.PaperTear = {
        init: function(w, h) {
            width = w; height = h;
            var c = cfg();
            centerY = h * c.CENTER_Y_RATIO;
            halfH = h * c.VOID_HALF_HEIGHT_RATIO;
            glitchSegs = generateGlitch(w);
            glitchTimer = 0;
            shimmerPhase = 0;
            state = 'IDLE';
            progress = 0;
            timer = 0;
        },

        setDimensions: function(w, h) {
            if (w !== width || h !== height) this.init(w, h);
        },

        open: function() {
            if (!cfg().ENABLED) { state = 'OPEN'; progress = 1; return; }
            state = 'OPENING';
            timer = 0;
            closeCallback = null;
        },

        close: function(cb) {
            if (!cfg().ENABLED) {
                state = 'CLOSED'; progress = 0;
                if (cb) cb();
                return;
            }
            state = 'CLOSING';
            timer = 0;
            closeCallback = cb || null;
        },

        update: function(dt) {
            var c = cfg();

            // Shimmer always ticks when visible
            if (progress > 0) {
                shimmerPhase += dt * c.SCANLINE.SHIMMER_SPEED;
            }

            // Refresh glitch segments periodically
            if (progress > 0) {
                glitchTimer += dt;
                if (glitchTimer >= c.GLITCH.REFRESH_RATE) {
                    glitchTimer -= c.GLITCH.REFRESH_RATE;
                    glitchSegs = generateGlitch(width);
                }
            }

            if (state === 'OPENING') {
                timer += dt;
                var t = Math.min(timer / c.OPEN_DURATION, 1);
                progress = easeOutQuart(t);
                if (t >= 1) { state = 'OPEN'; progress = 1; }
            } else if (state === 'CLOSING') {
                timer += dt;
                var t2 = Math.min(timer / c.CLOSE_DURATION, 1);
                progress = 1 - easeInQuart(t2);
                if (t2 >= 1) {
                    state = 'CLOSED'; progress = 0;
                    if (closeCallback) { var cb = closeCallback; closeCallback = null; cb(); }
                }
            }
            return progress;
        },

        draw: function(ctx) {
            if (progress <= 0) return;
            var c = cfg();
            var CU = G.ColorUtils;
            var sc = c.SCANLINE;
            var gl = c.GLITCH;
            var fl = c.FLASH;

            var yTop = centerY - halfH * progress;
            var yBot = centerY + halfH * progress;
            var voidH = yBot - yTop;

            ctx.save();

            // --- Void fill ---
            var vc = c.VOID_COLOR;
            ctx.fillStyle = CU.rgba(vc[0], vc[1], vc[2], c.VOID_ALPHA * Math.min(progress * 1.5, 1));
            ctx.fillRect(0, yTop, width, voidH);

            // --- Void scanlines (subtle CRT) ---
            if (voidH > 0) {
                var vsc = c.VOID_SCANLINES;
                ctx.fillStyle = CU.rgba(255, 255, 255, vsc.ALPHA);
                var startLine = Math.ceil(yTop / vsc.SPACING) * vsc.SPACING;
                for (var sy = startLine; sy < yBot; sy += vsc.SPACING) {
                    ctx.fillRect(0, sy, width, 1);
                }
            }

            // --- Flash (opening start / closing end) ---
            var flashAlpha = 0;
            if (state === 'OPENING' && timer < fl.DURATION) {
                flashAlpha = fl.ALPHA * (1 - timer / fl.DURATION);
            } else if (state === 'CLOSING' && progress < 0.05) {
                flashAlpha = fl.ALPHA * (1 - progress / 0.05);
            }
            if (flashAlpha > 0.01) {
                ctx.fillStyle = CU.rgba(sc.COLOR[0], sc.COLOR[1], sc.COLOR[2], flashAlpha);
                ctx.fillRect(0, centerY - 2, width, 4);
            }

            // --- Shimmer multiplier ---
            var shimmer = 1 + Math.sin(shimmerPhase) * sc.SHIMMER_AMOUNT;

            // --- Neon border lines (top & bottom) ---
            var prevComp = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = 'lighter';

            // Glow layer
            ctx.lineWidth = sc.LINE_WIDTH + sc.GLOW_SIZE;
            ctx.strokeStyle = CU.rgba(sc.COLOR[0], sc.COLOR[1], sc.COLOR[2], sc.GLOW_ALPHA * shimmer * Math.min(progress * 3, 1));
            ctx.beginPath();
            ctx.moveTo(0, yTop);
            ctx.lineTo(width, yTop);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, yBot);
            ctx.lineTo(width, yBot);
            ctx.stroke();

            // Core line
            ctx.lineWidth = sc.LINE_WIDTH;
            ctx.strokeStyle = CU.rgba(sc.COLOR[0], sc.COLOR[1], sc.COLOR[2], sc.LINE_ALPHA * shimmer * Math.min(progress * 3, 1));
            ctx.beginPath();
            ctx.moveTo(0, yTop);
            ctx.lineTo(width, yTop);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, yBot);
            ctx.lineTo(width, yBot);
            ctx.stroke();

            // --- Glitch segments ---
            if (progress > 0.15) {
                var glAlpha = gl.ALPHA * Math.min((progress - 0.15) * 4, 1);
                ctx.lineWidth = sc.LINE_WIDTH;
                for (var i = 0; i < glitchSegs.length; i++) {
                    var seg = glitchSegs[i];
                    ctx.strokeStyle = CU.rgba(sc.COLOR[0], sc.COLOR[1], sc.COLOR[2], glAlpha * shimmer);
                    // Glitch on top edge
                    ctx.beginPath();
                    ctx.moveTo(seg.x, yTop + seg.offset);
                    ctx.lineTo(seg.x + seg.len, yTop + seg.offset);
                    ctx.stroke();
                    // Glitch on bottom edge
                    ctx.beginPath();
                    ctx.moveTo(seg.x, yBot - seg.offset);
                    ctx.lineTo(seg.x + seg.len, yBot - seg.offset);
                    ctx.stroke();
                }
            }

            ctx.globalCompositeOperation = prevComp;
            ctx.restore();
        },

        getProgress: function() { return progress; },
        isActive: function() { return state !== 'IDLE' && state !== 'CLOSED'; },
        isAnimating: function() { return state === 'OPENING' || state === 'CLOSING'; },
        isOpen: function() { return state === 'OPEN'; },

        reset: function() {
            state = 'IDLE';
            progress = 0;
            timer = 0;
            closeCallback = null;
        }
    };
})();
