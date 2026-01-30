window.Game = window.Game || {};

class PowerUp extends window.Game.Entity {
    constructor(x, y, type) {
        super(x, y, 30, 30);
        this.type = type; // 'RAPID', 'SPREAD', 'SHIELD'
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
        const x = this.x;
        const y = this.y;

        // Optimized: no shadowBlur
        const color = this.type === 'SHIELD' ? '#00ffff' : (this.type === 'RAPID' ? '#ff00ff' : '#FFD700');
        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        // Circle
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Outer glow ring (cheap fake glow)
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Symbol
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let symbol = 'B';
        if (this.type === 'SHIELD') symbol = 'S';
        if (this.type === 'RAPID') symbol = 'R';

        ctx.fillText(symbol, x, y + 1);
    }
}

window.Game.PowerUp = PowerUp;
