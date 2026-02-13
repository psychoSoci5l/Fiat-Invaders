window.Game = window.Game || {};

// === WEAPON EVOLUTION v4.47 POWER-UP CONFIG ===
// Categories: upgrade (permanent weapon level), special (weapon effect),
//             utility (non-weapon), weapon/ship (legacy)
const POWERUP_CONFIG = {
    // === WEAPON EVOLUTION v4.47 TYPES ===
    // Upgrade (permanent weapon level)
    UPGRADE: { color: '#FFD700', symbol: '⬆', category: 'upgrade', name: 'UPGRADE' },

    // Specials (exclusive weapon effects, temporary 12s)
    HOMING:  { color: '#ff8800', symbol: '🎯', category: 'special', name: 'HOMING' },
    PIERCE:  { color: '#ff3344', symbol: '🔥', category: 'special', name: 'PIERCE' },
    MISSILE: { color: '#2288ff', symbol: '🚀', category: 'special', name: 'MISSILE' },

    // Utilities (non-weapon, distinct visual)
    SHIELD:  { color: '#00ff66', symbol: '🛡', category: 'utility', name: 'SHIELD' },
    SPEED:   { color: '#ffcc00', symbol: '💨', category: 'utility', name: 'SPEED' },

    // v4.61: Elemental perk drop (color determined dynamically in draw)
    PERK:    { color: '#bb44ff', symbol: '⚡', category: 'perk', name: 'PERK' },

    // === LEGACY TYPES (backward compatibility) ===
    WIDE:   { color: '#bb44ff', symbol: '🔱', category: 'weapon', name: 'WIDE' },
    NARROW: { color: '#2288ff', symbol: '🎯', category: 'weapon', name: 'NARROW' },
    FIRE:   { color: '#ff3344', symbol: '🔥', category: 'weapon', name: 'FIRE' },
    RAPID:  { color: '#ff2d95', symbol: '⚡', category: 'ship', name: 'RAPID' }
};

class PowerUp extends window.Game.Entity {
    constructor(x, y, type) {
        super(x, y, 30, 30);
        this.type = type;
        this.config = POWERUP_CONFIG[type] || { color: '#fff', symbol: '?', category: 'unknown', name: '?' };
        this.vy = 100; // Falls slowly
        this.wobble = Math.random() * Math.PI * 2;
        this.animTime = Math.random() * Math.PI * 2; // Random start phase
        this.rotation = 0;
    }

    update(dt) {
        this.y += this.vy * dt;
        this.wobble += 4 * dt;
        this.animTime += dt;
        this.rotation += dt * 2; // Slow rotation
        this.x += Math.sin(this.wobble) * 35 * dt;

        if (this.y > 1000) this.markedForDeletion = true;
    }

    draw(ctx) {
        const x = this.x;
        const y = this.y;
        const cfg = this.config;
        const pulse = Math.sin(this.animTime * 6) * 0.2 + 1;
        const glowPulse = Math.sin(this.animTime * 4) * 0.3 + 0.5;

        ctx.save();

        // v4.61: Dynamic glow color for PERK type
        const glowColor = (cfg.category === 'perk' && window.Game.PerkManager && window.Game.PerkManager.getNextPerkColor)
            ? window.Game.PerkManager.getNextPerkColor() : cfg.color;

        // Outer animated glow
        const _puGlow = window.Game.Balance?.GLOW;
        const _useAdditivePU = _puGlow?.ENABLED && _puGlow?.POWERUP?.ENABLED;
        const _puRadius = 28 * pulse * (_useAdditivePU ? _puGlow.POWERUP.RADIUS_MULT : 1);
        if (_useAdditivePU) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; }
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, _puRadius);
        gradient.addColorStop(0, glowColor);
        gradient.addColorStop(0.5, window.Game.ColorUtils.withAlpha(glowColor, 0.3));
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.globalAlpha = _useAdditivePU ? _puGlow.POWERUP.ALPHA : glowPulse;
        ctx.beginPath();
        ctx.arc(x, y, _puRadius, 0, Math.PI * 2);
        ctx.fill();
        if (_useAdditivePU) { ctx.restore(); } else { ctx.globalAlpha = 1; }

        // Draw based on category
        switch (cfg.category) {
            case 'upgrade':
                this.drawUpgradePowerUp(ctx, x, y, cfg, pulse);
                break;
            case 'special':
                this.drawSpecialPowerUp(ctx, x, y, cfg, pulse);
                break;
            case 'utility':
                this.drawUtilityPowerUp(ctx, x, y, cfg, pulse);
                break;
            case 'perk':
                this.drawPerkPowerUp(ctx, x, y, cfg, pulse);
                break;
            case 'weapon':
                this.drawWeaponPowerUp(ctx, x, y, cfg, pulse);
                break;
            case 'ship':
            default:
                this.drawShipPowerUp(ctx, x, y, cfg, pulse);
        }

        // Light sweep effect — diagonal shine that passes over periodically
        const sweepPeriod = 1;
        const sweepPhase = (this.animTime % sweepPeriod) / sweepPeriod;
        if (sweepPhase < 0.25) {
            const t = sweepPhase / 0.25; // 0→1 during active sweep
            const sweepX = x + (t - 0.5) * 56;
            const alpha = Math.sin(t * Math.PI) * 0.55;

            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, 20 * pulse, 0, Math.PI * 2);
            ctx.clip();

            ctx.globalAlpha = alpha;
            ctx.translate(sweepX, y);
            ctx.rotate(-0.785); // 45 degrees
            ctx.fillStyle = '#fff';
            ctx.fillRect(-5, -36, 10, 72);
            ctx.restore();
        }

        ctx.restore();
    }

    // === WEAPON EVOLUTION v3.0 DRAW METHODS ===

    /**
     * UPGRADE power-up: Pulsing golden star (permanent shot level)
     */
    drawUpgradePowerUp(ctx, x, y, cfg, pulse) {
        const size = 20 * pulse;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.rotation);

        // Outer starburst rays
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI / 4) * i;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * size * 0.7, Math.sin(angle) * size * 0.7);
            ctx.lineTo(Math.cos(angle) * size * 1.3, Math.sin(angle) * size * 1.3);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Glow shadow for star
        ctx.shadowColor = 'rgba(255,215,0,0.4)';
        ctx.shadowBlur = 8;

        // Main 6-point star
        ctx.fillStyle = cfg.color;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const outerAngle = (Math.PI / 3) * i - Math.PI / 2;
            const innerAngle = outerAngle + Math.PI / 6;
            const outerX = Math.cos(outerAngle) * size;
            const outerY = Math.sin(outerAngle) * size;
            const innerX = Math.cos(innerAngle) * (size * 0.45);
            const innerY = Math.sin(innerAngle) * (size * 0.45);
            if (i === 0) ctx.moveTo(outerX, outerY);
            else ctx.lineTo(outerX, outerY);
            ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        ctx.fill();

        // Remove shadow for detail work
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Bold outline
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner bright core
        ctx.fillStyle = '#FFEE88';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Up arrow symbol
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.2);
        ctx.lineTo(size * 0.12, size * 0.05);
        ctx.lineTo(-size * 0.12, size * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(-size * 0.05, 0, size * 0.1, size * 0.15);

        ctx.restore();
    }

    /**
     * UTILITY power-up: Rounded capsule shape (non-weapon, distinct from specials)
     * SHIELD = green capsule, SPEED = yellow capsule
     */
    drawUtilityPowerUp(ctx, x, y, cfg, pulse) {
        const w = 14 * pulse;
        const h = 20 * pulse;

        ctx.save();
        ctx.translate(x, y);

        // Glow shadow
        ctx.shadowColor = cfg.color;
        ctx.shadowBlur = 6;

        // Capsule body (rounded rectangle)
        const radius = w * 0.6;
        ctx.fillStyle = window.Game.ColorUtils.darken(cfg.color, 0.3);
        ctx.beginPath();
        ctx.moveTo(-w + radius, -h);
        ctx.lineTo(w - radius, -h);
        ctx.arcTo(w, -h, w, -h + radius, radius);
        ctx.lineTo(w, h - radius);
        ctx.arcTo(w, h, w - radius, h, radius);
        ctx.lineTo(-w + radius, h);
        ctx.arcTo(-w, h, -w, h - radius, radius);
        ctx.lineTo(-w, -h + radius);
        ctx.arcTo(-w, -h, -w + radius, -h, radius);
        ctx.closePath();
        ctx.fill();

        // Remove shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Light side overlay
        ctx.fillStyle = cfg.color;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(w - radius, -h);
        ctx.arcTo(w, -h, w, -h + radius, radius);
        ctx.lineTo(w, h - radius);
        ctx.arcTo(w, h, w - radius, h, radius);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // Bold outline
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-w + radius, -h);
        ctx.lineTo(w - radius, -h);
        ctx.arcTo(w, -h, w, -h + radius, radius);
        ctx.lineTo(w, h - radius);
        ctx.arcTo(w, h, w - radius, h, radius);
        ctx.lineTo(-w + radius, h);
        ctx.arcTo(-w, h, -w, h - radius, radius);
        ctx.lineTo(-w, -h + radius);
        ctx.arcTo(-w, -h, -w + radius, -h, radius);
        ctx.closePath();
        ctx.stroke();

        // Cross/plus indicator (utility symbol)
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.5);
        ctx.lineTo(0, h * 0.5);
        ctx.moveTo(-w * 0.5, 0);
        ctx.lineTo(w * 0.5, 0);
        ctx.stroke();

        // Center icon
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cfg.symbol, 0, 0);

        ctx.restore();
    }

    /**
     * SPECIAL power-up: Circular with orbiting ring (exclusive temp effect)
     */
    drawSpecialPowerUp(ctx, x, y, cfg, pulse) {
        const size = 16 * pulse;

        ctx.save();
        ctx.translate(x, y);

        // Orbiting ring
        ctx.strokeStyle = window.Game.ColorUtils.lighten(cfg.color, 0.3);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, size + 6, 0, Math.PI * 2);
        ctx.stroke();

        // Orbiting dots on the ring
        for (let i = 0; i < 3; i++) {
            const angle = this.rotation * 2 + (Math.PI * 2 / 3) * i;
            const dotX = Math.cos(angle) * (size + 6);
            const dotY = Math.sin(angle) * (size + 6);
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Glow shadow for circle
        ctx.shadowColor = cfg.color;
        ctx.shadowBlur = 8;

        // Main circular body - shadow side
        ctx.fillStyle = window.Game.ColorUtils.darken(cfg.color, 0.35);
        ctx.beginPath();
        ctx.arc(0, 0, size, Math.PI * 0.5, Math.PI * 1.5);
        ctx.fill();

        // Main body - light side
        ctx.fillStyle = cfg.color;
        ctx.beginPath();
        ctx.arc(0, 0, size, -Math.PI * 0.5, Math.PI * 0.5);
        ctx.fill();

        // Remove shadow for detail work
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Bold outline
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.stroke();

        // Rim highlight
        ctx.strokeStyle = window.Game.ColorUtils.lighten(cfg.color, 0.5);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, size - 2, -Math.PI * 0.7, Math.PI * 0.1);
        ctx.stroke();

        // Center icon
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cfg.symbol, 0, 0);

        ctx.restore();
    }

    /**
     * PERK power-up: Diamond crystal, color based on next elemental perk
     */
    drawPerkPowerUp(ctx, x, y, cfg, pulse) {
        const size = 18 * pulse;
        const perkColor = (window.Game.PerkManager && window.Game.PerkManager.getNextPerkColor)
            ? window.Game.PerkManager.getNextPerkColor()
            : '#bb44ff';

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.rotation * 0.3);

        // Diamond shape (tall hexagon)
        const drawDiamond = (s) => {
            ctx.beginPath();
            ctx.moveTo(0, -s);           // top point
            ctx.lineTo(s * 0.6, -s * 0.3); // upper right
            ctx.lineTo(s * 0.6, s * 0.3);  // lower right
            ctx.lineTo(0, s);              // bottom point
            ctx.lineTo(-s * 0.6, s * 0.3); // lower left
            ctx.lineTo(-s * 0.6, -s * 0.3); // upper left
            ctx.closePath();
        };

        // Glow shadow
        ctx.shadowColor = perkColor;
        ctx.shadowBlur = 10;

        // Main body — dark side
        drawDiamond(size);
        ctx.fillStyle = window.Game.ColorUtils.darken(perkColor, 0.3);
        ctx.fill();

        // Light side overlay
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = perkColor;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.6, -size * 0.3);
        ctx.lineTo(size * 0.6, size * 0.3);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // Remove shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Bold outline
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        drawDiamond(size);
        ctx.stroke();

        // Inner facet lines
        ctx.strokeStyle = window.Game.ColorUtils.lighten(perkColor, 0.4);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.6);
        ctx.lineTo(size * 0.35, 0);
        ctx.lineTo(0, size * 0.6);
        ctx.lineTo(-size * 0.35, 0);
        ctx.closePath();
        ctx.stroke();

        // Bright core
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Element symbol in center
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const symbols = { '#ff4400': '🔥', '#00f0ff': '⚡', '#8844ff': '⛓' };
        ctx.fillText(symbols[perkColor] || '✦', 0, 0);

        ctx.restore();
    }

    drawWeaponPowerUp(ctx, x, y, cfg, pulse) {
        const size = 18 * pulse;

        // Hexagonal crystal shape
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.rotation * 0.5);

        // Outer hexagon - shadow side
        ctx.fillStyle = window.Game.ColorUtils.darken(cfg.color, 0.3);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const px = Math.cos(angle) * size;
            const py = Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Light side overlay
        ctx.fillStyle = cfg.color;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.866, -size * 0.5);
        ctx.lineTo(size * 0.866, size * 0.5);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // Bold outline
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const px = Math.cos(angle) * size;
            const py = Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // Inner crystal facets
        ctx.strokeStyle = window.Game.ColorUtils.lighten(cfg.color, 0.4);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.6);
        ctx.lineTo(size * 0.4, 0);
        ctx.lineTo(0, size * 0.6);
        ctx.lineTo(-size * 0.4, 0);
        ctx.closePath();
        ctx.stroke();

        // Center bright core
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Type-specific icon on top
        this.drawWeaponIcon(ctx, x, y, cfg, size);
    }

    drawWeaponIcon(ctx, x, y, cfg, size) {
        ctx.save();
        ctx.translate(x, y);

        const iconSize = size * 0.6;
        ctx.strokeStyle = '#fff';
        ctx.fillStyle = '#fff';
        ctx.lineWidth = 2;

        if (this.type === 'WIDE') {
            // Trident shape
            ctx.beginPath();
            ctx.moveTo(0, -iconSize);
            ctx.lineTo(0, iconSize * 0.3);
            ctx.moveTo(-iconSize * 0.6, -iconSize * 0.5);
            ctx.lineTo(-iconSize * 0.6, -iconSize);
            ctx.moveTo(iconSize * 0.6, -iconSize * 0.5);
            ctx.lineTo(iconSize * 0.6, -iconSize);
            ctx.moveTo(-iconSize * 0.6, -iconSize * 0.5);
            ctx.lineTo(iconSize * 0.6, -iconSize * 0.5);
            ctx.stroke();
        } else if (this.type === 'NARROW') {
            // Crosshair
            ctx.beginPath();
            ctx.arc(0, 0, iconSize * 0.6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, -iconSize);
            ctx.lineTo(0, iconSize);
            ctx.moveTo(-iconSize, 0);
            ctx.lineTo(iconSize, 0);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, iconSize * 0.15, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'FIRE') {
            // Flame shape
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(0, -iconSize);
            ctx.quadraticCurveTo(iconSize * 0.6, -iconSize * 0.3, iconSize * 0.4, iconSize * 0.3);
            ctx.quadraticCurveTo(iconSize * 0.2, iconSize * 0.1, 0, iconSize * 0.5);
            ctx.quadraticCurveTo(-iconSize * 0.2, iconSize * 0.1, -iconSize * 0.4, iconSize * 0.3);
            ctx.quadraticCurveTo(-iconSize * 0.6, -iconSize * 0.3, 0, -iconSize);
            ctx.fill();
        } else if (this.type === 'SPREAD') {
            // 5-point star
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const outerAngle = (Math.PI * 2 / 5) * i - Math.PI / 2;
                const innerAngle = outerAngle + Math.PI / 5;
                const outerX = Math.cos(outerAngle) * iconSize;
                const outerY = Math.sin(outerAngle) * iconSize;
                const innerX = Math.cos(innerAngle) * (iconSize * 0.4);
                const innerY = Math.sin(innerAngle) * (iconSize * 0.4);
                if (i === 0) ctx.moveTo(outerX, outerY);
                else ctx.lineTo(outerX, outerY);
                ctx.lineTo(innerX, innerY);
            }
            ctx.closePath();
            ctx.fill();
        } else if (this.type === 'HOMING') {
            // Missile/rocket shape
            ctx.beginPath();
            ctx.moveTo(0, -iconSize);           // Nose
            ctx.lineTo(iconSize * 0.4, iconSize * 0.2);   // Right
            ctx.lineTo(iconSize * 0.6, iconSize * 0.7);   // Right fin
            ctx.lineTo(iconSize * 0.2, iconSize * 0.4);   // Right inner
            ctx.lineTo(0, iconSize * 0.8);               // Tail
            ctx.lineTo(-iconSize * 0.2, iconSize * 0.4);  // Left inner
            ctx.lineTo(-iconSize * 0.6, iconSize * 0.7);  // Left fin
            ctx.lineTo(-iconSize * 0.4, iconSize * 0.2);  // Left
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    drawShipPowerUp(ctx, x, y, cfg, pulse) {
        const size = 16 * pulse;

        ctx.save();
        ctx.translate(x, y);

        // Circular capsule with ring
        // Outer ring
        ctx.strokeStyle = cfg.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, size + 4, 0, Math.PI * 2);
        ctx.stroke();

        // Inner rotating segments
        ctx.strokeStyle = window.Game.ColorUtils.lighten(cfg.color, 0.3);
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const angle = this.rotation + (Math.PI / 2) * i;
            ctx.beginPath();
            ctx.arc(0, 0, size + 4, angle, angle + 0.4);
            ctx.stroke();
        }

        // Main body - shadow
        ctx.fillStyle = window.Game.ColorUtils.darken(cfg.color, 0.35);
        ctx.beginPath();
        ctx.arc(0, 0, size, Math.PI * 0.5, Math.PI * 1.5);
        ctx.fill();

        // Main body - light
        ctx.fillStyle = cfg.color;
        ctx.beginPath();
        ctx.arc(0, 0, size, -Math.PI * 0.5, Math.PI * 0.5);
        ctx.fill();

        // Outline
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.stroke();

        // Rim light
        ctx.strokeStyle = window.Game.ColorUtils.lighten(cfg.color, 0.5);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, size - 2, -Math.PI * 0.7, Math.PI * 0.1);
        ctx.stroke();

        ctx.restore();

        // Type-specific icon
        this.drawShipIcon(ctx, x, y, cfg, size);
    }

    drawShipIcon(ctx, x, y, cfg, size) {
        ctx.save();
        ctx.translate(x, y);

        ctx.strokeStyle = '#fff';
        ctx.fillStyle = '#fff';
        ctx.lineWidth = 2;

        if (this.type === 'SPEED') {
            // Lightning bolt
            ctx.beginPath();
            ctx.moveTo(3, -size * 0.7);
            ctx.lineTo(-4, 0);
            ctx.lineTo(1, 0);
            ctx.lineTo(-3, size * 0.7);
            ctx.lineTo(4, 0);
            ctx.lineTo(-1, 0);
            ctx.closePath();
            ctx.fill();
        } else if (this.type === 'RAPID') {
            // Triple bullets going up
            for (let i = -1; i <= 1; i++) {
                ctx.fillRect(i * 5 - 1.5, -size * 0.5, 3, size * 0.4);
                ctx.fillRect(i * 5 - 1.5, size * 0.1, 3, size * 0.4);
            }
        } else if (this.type === 'SHIELD') {
            // Shield shape
            ctx.beginPath();
            ctx.moveTo(0, -size * 0.6);
            ctx.lineTo(size * 0.6, -size * 0.3);
            ctx.lineTo(size * 0.6, size * 0.1);
            ctx.quadraticCurveTo(size * 0.3, size * 0.6, 0, size * 0.7);
            ctx.quadraticCurveTo(-size * 0.3, size * 0.6, -size * 0.6, size * 0.1);
            ctx.lineTo(-size * 0.6, -size * 0.3);
            ctx.closePath();
            ctx.fill();
            // Inner detail
            ctx.strokeStyle = cfg.color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -size * 0.3);
            ctx.lineTo(0, size * 0.4);
            ctx.stroke();
        }

        ctx.restore();
    }

}

window.Game.PowerUp = PowerUp;
