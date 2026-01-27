window.Game = window.Game || {};

class PowerUp extends window.Game.Entity {
    constructor(x, y, type) {
        super(x, y, 30, 30);
        this.type = type; // 'RAPID_FIRE', 'SHIELD', 'NUKE'
        this.vy = 150; // Falls slowly
        this.wobble = Math.random() * Math.PI * 2;
    }

    update(dt) {
        this.y += this.vy * dt;
        this.wobble += 5 * dt;
        this.x += Math.sin(this.wobble) * 50 * dt; // Slight drift

        if (this.y > 1000) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Glow
        ctx.shadowBlur = 15;
        let color = '#FFD700'; // Default
        let symbol = '?';

        if (this.type === 'RAPID_FIRE') { color = '#00ff00'; symbol = '🕯️'; } // Green Candle
        else if (this.type === 'SHIELD') { color = '#3498db'; symbol = '🛡️'; } // Insurance
        else if (this.type === 'NUKE') { color = '#ff0000'; symbol = '☢️'; } // Liquidation

        ctx.shadowColor = color;
        ctx.fillStyle = color; // For text/icon, or shape?
        // Let's draw a containing circle with border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; // Center dark

        // Shape
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff'; // Text color
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillText(symbol, 0, 2);

        ctx.restore();
    }
}

window.Game.PowerUp = PowerUp;
