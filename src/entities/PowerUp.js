window.Game = window.Game || {};

// Power-up visual config
const POWERUP_CONFIG = {
    // Weapon types (change firing pattern)
    WIDE:   { color: '#9b59b6', symbol: 'W', category: 'weapon' },
    NARROW: { color: '#3498db', symbol: 'N', category: 'weapon' },
    FIRE:   { color: '#e74c3c', symbol: 'F', category: 'weapon' },
    // Ship types (change ship stats)
    SPEED:  { color: '#f1c40f', symbol: '⚡', category: 'ship' },
    RAPID:  { color: '#e91e63', symbol: 'R', category: 'ship' },
    SHIELD: { color: '#2ecc71', symbol: 'S', category: 'ship' }
};

class PowerUp extends window.Game.Entity {
    constructor(x, y, type) {
        super(x, y, 30, 30);
        this.type = type;
        this.config = POWERUP_CONFIG[type] || { color: '#fff', symbol: '?', category: 'unknown' };
        this.vy = 120; // Falls slowly
        this.wobble = Math.random() * Math.PI * 2;
    }

    update(dt) {
        this.y += this.vy * dt;
        this.wobble += 5 * dt;
        this.x += Math.sin(this.wobble) * 40 * dt;

        if (this.y > 1000) this.markedForDeletion = true;
    }

    draw(ctx) {
        const x = this.x;
        const y = this.y;
        const cfg = this.config;

        // Different shape for weapon vs ship power-ups - bold cell-shaded outline
        ctx.fillStyle = cfg.color;
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;

        if (cfg.category === 'weapon') {
            // Diamond shape for weapons - two-tone cell-shading
            // Shadow side (left)
            ctx.fillStyle = this.darkenColor(cfg.color, 0.35);
            ctx.beginPath();
            ctx.moveTo(x, y - 16);
            ctx.lineTo(x - 14, y);
            ctx.lineTo(x, y + 16);
            ctx.closePath();
            ctx.fill();

            // Light side (right)
            ctx.fillStyle = cfg.color;
            ctx.beginPath();
            ctx.moveTo(x, y - 16);
            ctx.lineTo(x + 14, y);
            ctx.lineTo(x, y + 16);
            ctx.closePath();
            ctx.fill();

            // Full outline
            ctx.beginPath();
            ctx.moveTo(x, y - 16);
            ctx.lineTo(x + 14, y);
            ctx.lineTo(x, y + 16);
            ctx.lineTo(x - 14, y);
            ctx.closePath();
            ctx.stroke();

            // Rim lighting (top-right edges)
            ctx.strokeStyle = this.lightenColor(cfg.color, 0.5);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 2, y - 14);
            ctx.lineTo(x + 12, y - 2);
            ctx.stroke();
        } else {
            // Circle for ship power-ups - two-tone cell-shading
            // Shadow side (bottom-left arc)
            ctx.fillStyle = this.darkenColor(cfg.color, 0.35);
            ctx.beginPath();
            ctx.arc(x, y, 14, Math.PI * 0.4, Math.PI * 1.4);
            ctx.lineTo(x, y);
            ctx.closePath();
            ctx.fill();

            // Light side (top-right arc)
            ctx.fillStyle = cfg.color;
            ctx.beginPath();
            ctx.arc(x, y, 14, Math.PI * 1.4, Math.PI * 0.4);
            ctx.lineTo(x, y);
            ctx.closePath();
            ctx.fill();

            // Full outline
            ctx.beginPath();
            ctx.arc(x, y, 14, 0, Math.PI * 2);
            ctx.stroke();

            // Rim lighting (top-right arc)
            ctx.strokeStyle = this.lightenColor(cfg.color, 0.5);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 12, -Math.PI * 0.6, Math.PI * 0.1);
            ctx.stroke();
        }

        // Outer glow ring
        ctx.strokeStyle = cfg.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Symbol
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cfg.symbol, x, y + 1);
    }

    darkenColor(hex, amount) {
        const num = parseInt(hex.slice(1), 16);
        const r = Math.max(0, (num >> 16) - Math.floor(255 * amount));
        const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.floor(255 * amount));
        const b = Math.max(0, (num & 0x0000FF) - Math.floor(255 * amount));
        return `rgb(${r},${g},${b})`;
    }

    lightenColor(hex, amount) {
        const num = parseInt(hex.slice(1), 16);
        const r = Math.min(255, (num >> 16) + Math.floor(255 * amount));
        const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.floor(255 * amount));
        const b = Math.min(255, (num & 0x0000FF) + Math.floor(255 * amount));
        return `rgb(${r},${g},${b})`;
    }
}

window.Game.PowerUp = PowerUp;
