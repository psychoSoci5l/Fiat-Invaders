/**
 * PerkIconManager.js — Manages perk glow icons floating above player
 * Extracted from main.js (v4.49 refactor)
 */
(function () {
    'use strict';
    const G = window.Game;
    const Balance = G.Balance;

    const RARITY_COLORS = {
        common: '#95a5a6',
        uncommon: '#3498db',
        rare: '#9b59b6',
        epic: '#f39c12'
    };

    let icons = [];

    function addIcon(perk, playerX, playerY) {
        if (!Balance.HUD_MESSAGES.PERK_NOTIFICATION) return;
        if (!perk) return;
        const lifetime = Balance.TIMING.PERK_ICON_LIFETIME;
        icons.push({
            icon: perk.icon || '?',
            name: perk.name || 'Perk',
            color: RARITY_COLORS[perk.rarity] || RARITY_COLORS.common,
            rarity: perk.rarity || 'common',
            x: playerX,
            y: playerY - 60,
            life: lifetime,
            maxLife: lifetime,
            scale: 0,
            glowPhase: 0
        });
    }

    function update(dt) {
        for (let i = icons.length - 1; i >= 0; i--) {
            const p = icons[i];
            p.life -= dt;
            p.y -= 25 * dt;
            p.glowPhase += dt * 6;

            const age = p.maxLife - p.life;
            if (age < 0.3) {
                p.scale = age / 0.3;
            } else if (p.life < 0.5) {
                p.scale = p.life / 0.5;
            } else {
                p.scale = 1;
            }

            if (p.life <= 0) icons.splice(i, 1);
        }
    }

    function draw(ctx, gameWidth) {
        const CU = G.ColorUtils;
        for (let i = 0; i < icons.length; i++) {
            const p = icons[i];
            if (p.scale <= 0) continue;

            const alpha = Math.min(1, p.life / 0.5);
            const glowIntensity = 0.5 + Math.sin(p.glowPhase) * 0.3;
            const size = 36 * p.scale;

            ctx.save();
            ctx.globalAlpha = alpha;

            if (!p._rgb) p._rgb = CU.parseHex(p.color);
            const pr = p._rgb.r, pg = p._rgb.g, pb = p._rgb.b;

            // Outer glow
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 1.8);
            gradient.addColorStop(0, CU.rgba(pr, pg, pb, glowIntensity * 0.5));
            gradient.addColorStop(0.5, CU.rgba(pr, pg, pb, 0.25));
            gradient.addColorStop(1, CU.rgba(pr, pg, pb, 0));
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size * 1.8, 0, Math.PI * 2);
            ctx.fill();

            // Inner glow
            const innerGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 0.9);
            innerGlow.addColorStop(0, '#fff');
            innerGlow.addColorStop(0.3, p.color);
            innerGlow.addColorStop(1, CU.rgba(pr, pg, pb, 0));
            ctx.fillStyle = innerGlow;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size * 0.9, 0, Math.PI * 2);
            ctx.fill();

            // Icon
            ctx.font = CU.font('bold', size, 'Arial');
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.fillStyle = '#fff';
            ctx.strokeText(p.icon, p.x, p.y);
            ctx.fillText(p.icon, p.x, p.y);

            // Perk name below icon
            if (p.scale > 0.5) {
                const nameAlpha = (p.scale - 0.5) * 2 * alpha;
                ctx.globalAlpha = nameAlpha;
                ctx.font = 'bold 14px "Courier New", monospace';
                const namePadding = 60;
                const nameX = Math.max(namePadding, Math.min(gameWidth - namePadding, p.x));
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.strokeText(p.name, nameX, p.y + size * 0.8);
                ctx.fillStyle = p.color;
                ctx.fillText(p.name, nameX, p.y + size * 0.8);
            }

            ctx.restore();
        }
    }

    function reset() {
        icons = [];
    }

    G.PerkIconManager = {
        addIcon,
        update,
        draw,
        reset
    };
})();
