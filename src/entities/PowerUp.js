window.Game = window.Game || {};

// === WEAPON EVOLUTION v4.47 POWER-UP CONFIG ===
// Categories: upgrade (permanent weapon level), special (weapon effect),
//             utility (non-weapon), weapon/ship (legacy)
const POWERUP_CONFIG = {
    // === WEAPON EVOLUTION v4.47 TYPES ===
    // Upgrade (permanent weapon level)
    UPGRADE: { color: '#FFD700', symbol: '⬆', category: 'upgrade', name: 'UPGRADE' },

    // Specials (exclusive weapon effects, temporary 8s)
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

        // v5.25: Unified circle + icon for ALL types
        this.drawUnifiedPowerUp(ctx, x, y, cfg, pulse, glowColor);

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

    // === v5.25: UNIFIED POWER-UP — all types drawn as circle + icon ===

    drawUnifiedPowerUp(ctx, x, y, cfg, pulse, glowColor) {
        const CU = window.Game.ColorUtils;
        const r = 16 * pulse;
        const baseColor = (cfg.category === 'perk') ? glowColor : cfg.color;

        ctx.save();
        ctx.translate(x, y);

        // White blink: sharp flash every ~0.8s
        const blinkRaw = Math.sin(this.animTime * Math.PI * 2 / 0.8);
        const blink = Math.pow(Math.max(0, blinkRaw), 3) * 0.7;

        // 3D sphere: dark half (left) + light half (right)
        ctx.fillStyle = CU.darken(baseColor, 0.35);
        ctx.beginPath();
        ctx.arc(0, 0, r, Math.PI * 0.5, Math.PI * 1.5);
        ctx.fill();

        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI * 0.5, Math.PI * 0.5);
        ctx.fill();

        // Black outline
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        // Rim highlight arc (top-right)
        ctx.strokeStyle = CU.lighten(baseColor, 0.5);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r - 2, -Math.PI * 0.7, Math.PI * 0.05);
        ctx.stroke();

        // White icon
        this._drawPowerUpIcon(ctx, r);

        // White blink overlay
        if (blink > 0.01) {
            ctx.globalAlpha = blink;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    _drawPowerUpIcon(ctx, r) {
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        const s = r * 0.55; // icon scale

        switch (this.type) {
            case 'UPGRADE': {
                // Arrow pointing up
                ctx.beginPath();
                ctx.moveTo(0, -s);
                ctx.lineTo(s * 0.7, s * 0.1);
                ctx.lineTo(s * 0.25, s * 0.1);
                ctx.lineTo(s * 0.25, s * 0.7);
                ctx.lineTo(-s * 0.25, s * 0.7);
                ctx.lineTo(-s * 0.25, s * 0.1);
                ctx.lineTo(-s * 0.7, s * 0.1);
                ctx.closePath();
                ctx.fill();
                break;
            }

            case 'HOMING': {
                // Crosshair: circle + cross + center dot
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.65, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, -s); ctx.lineTo(0, s);
                ctx.moveTo(-s, 0); ctx.lineTo(s, 0);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(0, 0, 2, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'PIERCE': {
                // Penetrating arrow: arrow with line through
                ctx.beginPath();
                ctx.moveTo(0, -s);
                ctx.lineTo(s * 0.5, -s * 0.3);
                ctx.lineTo(s * 0.2, -s * 0.3);
                ctx.lineTo(s * 0.2, s * 0.6);
                ctx.lineTo(-s * 0.2, s * 0.6);
                ctx.lineTo(-s * 0.2, -s * 0.3);
                ctx.lineTo(-s * 0.5, -s * 0.3);
                ctx.closePath();
                ctx.fill();
                // Cross-through line (piercing)
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-s * 0.6, s * 0.1);
                ctx.lineTo(s * 0.6, s * 0.1);
                ctx.stroke();
                break;
            }

            case 'MISSILE': {
                // 4-point explosive star
                ctx.beginPath();
                for (let i = 0; i < 4; i++) {
                    const a = (Math.PI / 2) * i - Math.PI / 2;
                    const aInner = a + Math.PI / 4;
                    const ox = Math.cos(a) * s;
                    const oy = Math.sin(a) * s;
                    const ix = Math.cos(aInner) * s * 0.35;
                    const iy = Math.sin(aInner) * s * 0.35;
                    if (i === 0) ctx.moveTo(ox, oy);
                    else ctx.lineTo(ox, oy);
                    ctx.lineTo(ix, iy);
                }
                ctx.closePath();
                ctx.fill();
                break;
            }

            case 'SHIELD': {
                // Shield silhouette
                ctx.beginPath();
                ctx.moveTo(0, -s * 0.8);
                ctx.lineTo(s * 0.7, -s * 0.4);
                ctx.lineTo(s * 0.7, s * 0.1);
                ctx.quadraticCurveTo(s * 0.35, s * 0.7, 0, s * 0.9);
                ctx.quadraticCurveTo(-s * 0.35, s * 0.7, -s * 0.7, s * 0.1);
                ctx.lineTo(-s * 0.7, -s * 0.4);
                ctx.closePath();
                ctx.fill();
                break;
            }

            case 'SPEED': {
                // Lightning bolt
                ctx.beginPath();
                ctx.moveTo(s * 0.2, -s);
                ctx.lineTo(-s * 0.4, s * 0.05);
                ctx.lineTo(s * 0.05, s * 0.05);
                ctx.lineTo(-s * 0.2, s);
                ctx.lineTo(s * 0.4, -s * 0.05);
                ctx.lineTo(-s * 0.05, -s * 0.05);
                ctx.closePath();
                ctx.fill();
                break;
            }

            case 'PERK': {
                // Diamond shape
                ctx.beginPath();
                ctx.moveTo(0, -s);
                ctx.lineTo(s * 0.6, 0);
                ctx.lineTo(0, s);
                ctx.lineTo(-s * 0.6, 0);
                ctx.closePath();
                ctx.fill();
                break;
            }

            default: {
                // Legacy fallback: emoji symbol
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(this.config.symbol, 0, 0);
                break;
            }
        }
    }
}

window.Game.PowerUp = PowerUp;
