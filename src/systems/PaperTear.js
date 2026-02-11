// PaperTear.js — Canvas "paper tear" effect for intro title reveal
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
    var topEdge = [];   // [{x, offset}]
    var botEdge = [];

    function cfg() {
        if (!B) B = G.Balance.PAPER_TEAR;
        return B;
    }

    function generateEdge(w) {
        var c = cfg().EDGE;
        var pts = [];
        var x = 0;
        while (x < w) {
            var seg = c.SEG_MIN + Math.random() * (c.SEG_MAX - c.SEG_MIN);
            var depth = c.DEPTH_MIN + Math.random() * (c.DEPTH_MAX - c.DEPTH_MIN);
            if (Math.random() < 0.5) depth = -depth;
            pts.push({ x: x, offset: depth });
            x += seg;
        }
        pts.push({ x: w, offset: pts.length ? pts[pts.length - 1].offset * 0.5 : 0 });
        return pts;
    }

    // Smooth ease with slow start (feels like paper pulling apart)
    function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }
    function easeInQuart(t) { return t * t * t * t; }

    G.PaperTear = {
        init: function(w, h) {
            width = w; height = h;
            var c = cfg();
            centerY = h * c.CENTER_Y_RATIO;
            halfH = h * c.VOID_HALF_HEIGHT_RATIO;
            topEdge = generateEdge(w);
            botEdge = generateEdge(w);
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
            // Top edge opens faster than bottom for asymmetric tear feel
            var topProg = Math.min(progress * 1.15, 1);
            var botProg = Math.min(progress * 0.9, 1);
            var yTop = centerY - halfH * topProg;
            var yBot = centerY + halfH * botProg;

            ctx.save();

            // Shadow
            if (c.SHADOW.ENABLED && progress > 0.1) {
                ctx.shadowColor = 'rgba(0,0,0,' + (c.SHADOW.ALPHA * progress) + ')';
                ctx.shadowBlur = c.SHADOW.BLUR * progress;
                ctx.shadowOffsetY = c.SHADOW.OFFSET_Y * progress;
            }

            // Void fill path
            ctx.beginPath();
            // Top edge (left to right)
            for (var i = 0; i < topEdge.length; i++) {
                var p = topEdge[i];
                var y = yTop + p.offset * topProg;
                if (i === 0) ctx.moveTo(p.x, y);
                else ctx.lineTo(p.x, y);
            }
            // Right side down
            ctx.lineTo(width, yBot + (botEdge.length ? botEdge[botEdge.length - 1].offset * botProg : 0));
            // Bottom edge (right to left)
            for (var j = botEdge.length - 1; j >= 0; j--) {
                var pb = botEdge[j];
                ctx.lineTo(pb.x, yBot + pb.offset * botProg);
            }
            ctx.closePath();

            var vc = c.VOID_COLOR;
            ctx.fillStyle = 'rgba(' + vc[0] + ',' + vc[1] + ',' + vc[2] + ',' + (c.VOID_ALPHA * Math.min(progress * 1.5, 1)) + ')';
            ctx.fill();

            // Reset shadow before stroke
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;

            // Edge highlights
            var ec = c.EDGE;
            ctx.strokeStyle = ec.HIGHLIGHT_COLOR;
            ctx.lineWidth = ec.HIGHLIGHT_WIDTH;
            ctx.globalAlpha = ec.HIGHLIGHT_ALPHA * Math.min(progress * 2, 1);

            // Top edge highlight
            ctx.beginPath();
            for (var k = 0; k < topEdge.length; k++) {
                var pt = topEdge[k];
                var yt = yTop + pt.offset * topProg;
                if (k === 0) ctx.moveTo(pt.x, yt);
                else ctx.lineTo(pt.x, yt);
            }
            ctx.stroke();

            // Bottom edge highlight
            ctx.beginPath();
            for (var m = 0; m < botEdge.length; m++) {
                var pbo = botEdge[m];
                var yb = yBot + pbo.offset * botProg;
                if (m === 0) ctx.moveTo(pbo.x, yb);
                else ctx.lineTo(pbo.x, yb);
            }
            ctx.stroke();

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
