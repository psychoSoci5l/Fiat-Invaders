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

        // Different shape for weapon vs ship power-ups
        ctx.fillStyle = cfg.color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        if (cfg.category === 'weapon') {
            // Diamond shape for weapons
            ctx.beginPath();
            ctx.moveTo(x, y - 16);
            ctx.lineTo(x + 14, y);
            ctx.lineTo(x, y + 16);
            ctx.lineTo(x - 14, y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else {
            // Circle for ship power-ups
            ctx.beginPath();
            ctx.arc(x, y, 14, 0, Math.PI * 2);
            ctx.fill();
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
}

window.Game.PowerUp = PowerUp;
