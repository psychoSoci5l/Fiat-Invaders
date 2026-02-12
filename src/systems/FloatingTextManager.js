/**
 * FloatingTextManager.js — Manages floating text and score popups
 * Extracted from main.js (v4.49 refactor)
 */
(function () {
    'use strict';
    const G = window.Game;
    const Balance = G.Balance;

    const MAX_FLOATING_TEXTS = 8;
    let texts = [];

    function findSlot() {
        let oldestIdx = -1;
        let oldestLife = Infinity;
        for (let i = 0; i < texts.length; i++) {
            const ft = texts[i];
            if (!ft || ft.life <= 0) return i;
            if (ft.life < oldestLife) {
                oldestLife = ft.life;
                oldestIdx = i;
            }
        }
        if (texts.length < MAX_FLOATING_TEXTS) return texts.length;
        return oldestIdx;
    }

    function addText(text, x, y, c, size) {
        if (!Balance.HUD_MESSAGES.FLOATING_TEXT) return;
        size = size || 20;
        const slot = findSlot();
        texts[slot] = { text, x, y, c, size, life: 1.0 };
    }

    function createFloatingScore(scoreValue, x, y, killStreak) {
        const config = Balance.JUICE?.FLOAT_SCORE;
        if (!config) return;
        if (scoreValue < (config.MIN_VALUE || 100)) return;

        let scale = 1;
        if (scoreValue >= 2000) {
            scale = config.SCALE_HUGE || 2.0;
        } else if (scoreValue >= 500) {
            scale = config.SCALE_LARGE || 1.5;
        }

        const vfx = Balance?.VFX;
        if (vfx?.COMBO_SCORE_SCALE && killStreak > 5) {
            const streakBonus = Math.min(0.5, (killStreak - 5) * 0.03);
            scale *= (1 + streakBonus);
        }

        const baseSize = 18;
        const size = Math.floor(baseSize * scale);
        const duration = config.DURATION || 1.2;
        const velocity = config.VELOCITY || -80;

        const slot = findSlot();
        texts[slot] = {
            text: '+' + Math.floor(scoreValue),
            x: x + (Math.random() - 0.5) * 20,
            y: y,
            c: '#FFD700',
            size: size,
            life: duration,
            maxLife: duration,
            vy: velocity
        };
    }

    function update(dt) {
        for (let i = 0; i < texts.length; i++) {
            const ft = texts[i];
            if (!ft || ft.life <= 0) continue;
            const velocity = ft.vy ? Math.abs(ft.vy) : 50;
            ft.y -= velocity * dt;
            ft.life -= dt;
        }
    }

    function draw(ctx, gameWidth) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        for (let i = 0; i < texts.length; i++) {
            const t = texts[i];
            if (!t || t.life <= 0) continue;
            const maxLife = t.maxLife || 1.0;
            const fadeStart = maxLife * 0.3;
            const alpha = t.life < fadeStart ? t.life / fadeStart : 1;
            ctx.font = G.ColorUtils.font('bold', t.size || 20, 'Courier New');
            ctx.globalAlpha = alpha;
            const padding = 80;
            const clampedX = Math.max(padding, Math.min(gameWidth - padding, t.x));
            ctx.strokeText(t.text, clampedX, t.y);
            ctx.fillStyle = t.c;
            ctx.fillText(t.text, clampedX, t.y);
        }
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
    }

    function reset() {
        texts = [];
    }

    G.FloatingTextManager = {
        addText,
        createFloatingScore,
        update,
        draw,
        reset
    };
})();
