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
        ctx.save();
        ctx.translate(this.x, this.y);

        // Glow
        ctx.shadowBlur = 15;
        const color = this.type === 'SHIELD' ? '#00ffff' : (this.type === 'RAPID' ? '#ff00ff' : '#FFD700');
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        // Bitcoin Shape (Circle + B)
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let symbol = '₿';
        if (this.type === 'SHIELD') symbol = '🛡️';
        if (this.type === 'RAPID') symbol = '⚡';

        ctx.fillText(symbol, 0, 2);

        ctx.restore();
    }
}

window.Game.PowerUp = PowerUp;
