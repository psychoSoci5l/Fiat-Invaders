window.Game = window.Game || {};

class Enemy extends window.Game.Entity {
    constructor(x, y, typeConf) {
        super(x, y, 50, 50); // Fixed size for now as per legacy spawn logic

        this.baseY = y;
        this.symbol = typeConf.s;
        this.name = typeConf.name || '???';
        this.color = typeConf.c;
        this.hp = typeConf.hp;
        this.scoreVal = typeConf.val;
        this.fireMin = typeConf.fireMin || 2.5;
        this.fireMax = typeConf.fireMax || 4.0;
        this.aimSpread = typeConf.aimSpread || 0.18;
        this.pattern = typeConf.pattern || 'SINGLE';
        this.shape = typeConf.shape || 'coin';
        this.burstCount = 0;
        this.burstTimer = 0;
        this.telegraphTimer = 0;
        this.telegraphLead = 0.12;

        this.active = true;
        this.fireTimer = 0; // Set by spawner for Fibonacci ramp-up
    }

    attemptFire(dt, target, rateMult = 1, bulletSpeed = 300, aimSpreadMult = 1, allowFire = true) {
        this.fireTimer -= dt * rateMult;
        this.burstTimer -= dt * rateMult;
        if (this.telegraphTimer > 0) this.telegraphTimer -= dt;

        if (!allowFire) return null;

        // Handle queued burst shots
        if (this.pattern === 'BURST' && this.burstCount > 0 && this.burstTimer <= 0) {
            this.burstTimer = 0.12;
            this.burstCount--;
            return this.buildBullet(target, bulletSpeed, aimSpreadMult);
        }

        if (this.fireTimer <= 0) {
            this.fireTimer = this.fireMin + Math.random() * (this.fireMax - this.fireMin);
            if (this.pattern === 'BURST') this.telegraphLead = 0.16;
            else if (this.pattern === 'DOUBLE') this.telegraphLead = 0.13;
            else this.telegraphLead = 0.10;
            const jitter = (Math.random() * 0.04) - 0.02;
            this.telegraphTimer = Math.max(0.06, this.telegraphLead + jitter);
            if (this.pattern === 'BURST') {
                this.burstCount = 2;
                this.burstTimer = Math.max(0.04, 0.06 + ((Math.random() * 0.02) - 0.01));
            }
            if (window.Game && window.Game.Audio) window.Game.Audio.play('enemyTelegraph');

            if (this.pattern === 'DOUBLE') {
                const b1 = this.buildBullet(target, bulletSpeed, aimSpreadMult, -0.08);
                const b2 = this.buildBullet(target, bulletSpeed, aimSpreadMult, 0.08);
                return [b1, b2];
            }

            return this.buildBullet(target, bulletSpeed, aimSpreadMult);
        }
        return null;
    }

    buildBullet(target, bulletSpeed, aimSpreadMult, extraAngle = 0) {
        // Aiming Logic
        let vx = 0;
        let vy = bulletSpeed;

        if (target) {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            let angle = Math.atan2(dy, dx);
            const spread = this.aimSpread * aimSpreadMult;
            angle += (Math.random() * 2 - 1) * spread + extraAngle;
            vx = Math.cos(angle) * bulletSpeed;
            vy = Math.sin(angle) * bulletSpeed;
        }

        return {
            x: this.x,
            y: this.y + 25,
            vx: vx,
            vy: vy,
            color: this.color, // Match enemy color
            w: 5,
            h: 5
        };
    }

    update(dt, globalTime, wavePattern, gridSpeed, gridDir) {
        // Horizontal Grid Move
        this.x += gridSpeed * gridDir * dt;

        // Vertical / Pattern Move
        if (wavePattern === 'V_SHAPE') {
            this.y = this.baseY + Math.sin(globalTime * 3) * 20;
        } else if (wavePattern === 'SINE_WAVE') {
            // Complex snake motion
            this.y = this.baseY + Math.sin(globalTime * 4 + (this.x / 100)) * 40;
        } else if (wavePattern === 'COLUMNS') {
            this.y = this.baseY; // Static columns
        } else {
            this.y = this.baseY;
        }

        // Rotation (optional, for fun)
        if (wavePattern === 'SINE_WAVE') {
            this.rotation = Math.cos(globalTime * 4 + (this.x / 100)) * 0.2;
        }
    }

    draw(ctx) {
        const x = this.x;
        const y = this.y;

        ctx.save();
        if (this.rotation) ctx.translate(x, y), ctx.rotate(this.rotation), ctx.translate(-x, -y);

        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3; // Bold cell-shaded outline

        // Draw based on shape type
        if (this.shape === 'coin') {
            this.drawCoin(ctx, x, y);
        } else if (this.shape === 'bill') {
            this.drawBill(ctx, x, y);
        } else if (this.shape === 'bar') {
            this.drawBar(ctx, x, y);
        } else if (this.shape === 'card') {
            this.drawCard(ctx, x, y);
        } else {
            this.drawCoin(ctx, x, y); // fallback
        }

        ctx.restore();

        // Telegraph indicator
        if (this.telegraphTimer > 0) {
            const mult = (this.pattern === 'BURST') ? 5 : (this.pattern === 'DOUBLE' ? 5.5 : 6);
            ctx.globalAlpha = Math.min(1, this.telegraphTimer * mult);
            ctx.strokeStyle = (this.pattern === 'BURST') ? '#ff6b6b' : (this.pattern === 'DOUBLE' ? '#4ecdc4' : '#fff');
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, 26, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    drawCoin(ctx, x, y) {
        // Shadow side (bottom-left arc) - cell-shading
        ctx.fillStyle = this.darkenColor(this.color, 0.35);
        ctx.beginPath();
        ctx.arc(x, y, 18, Math.PI * 0.4, Math.PI * 1.4);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fill();

        // Light side (top-right arc)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x, y, 18, Math.PI * 1.4, Math.PI * 0.4);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fill();

        // Full outline
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.stroke();

        // Inner circle (darker)
        ctx.fillStyle = this.darkenColor(this.color, 0.4);
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();

        // Rim lighting (top-right arc highlight)
        ctx.strokeStyle = this.lightenColor(this.color, 0.5);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 16, -Math.PI * 0.6, Math.PI * 0.1);
        ctx.stroke();

        // Edge notches (coin ridges)
        ctx.strokeStyle = this.darkenColor(this.color, 0.5);
        ctx.lineWidth = 1;
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            const x1 = x + Math.cos(angle) * 15;
            const y1 = y + Math.sin(angle) * 15;
            const x2 = x + Math.cos(angle) * 18;
            const y2 = y + Math.sin(angle) * 18;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // Symbol
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, x, y);
    }

    drawBill(ctx, x, y) {
        const w = 36, h = 20;

        // Shadow side (bottom-left triangle) - cell-shading
        ctx.fillStyle = this.darkenColor(this.color, 0.35);
        ctx.beginPath();
        ctx.moveTo(x - w/2, y - h/2);
        ctx.lineTo(x + w/2, y + h/2);
        ctx.lineTo(x - w/2, y + h/2);
        ctx.closePath();
        ctx.fill();

        // Light side (top-right triangle)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(x - w/2, y - h/2);
        ctx.lineTo(x + w/2, y - h/2);
        ctx.lineTo(x + w/2, y + h/2);
        ctx.closePath();
        ctx.fill();

        // Full outline
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - w/2, y - h/2, w, h);

        // Inner border
        ctx.strokeStyle = this.darkenColor(this.color, 0.5);
        ctx.lineWidth = 1;
        ctx.strokeRect(x - w/2 + 3, y - h/2 + 3, w - 6, h - 6);

        // Corner decorations
        ctx.fillStyle = this.darkenColor(this.color, 0.4);
        ctx.fillRect(x - w/2 + 2, y - h/2 + 2, 5, 5);
        ctx.fillRect(x + w/2 - 7, y - h/2 + 2, 5, 5);
        ctx.fillRect(x - w/2 + 2, y + h/2 - 7, 5, 5);
        ctx.fillRect(x + w/2 - 7, y + h/2 - 7, 5, 5);

        // Rim lighting (top and right edge)
        ctx.strokeStyle = this.lightenColor(this.color, 0.5);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - w/2 + 2, y - h/2);
        ctx.lineTo(x + w/2, y - h/2);
        ctx.lineTo(x + w/2, y + h/2 - 2);
        ctx.stroke();

        // Symbol
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, x, y);
    }

    drawBar(ctx, x, y) {
        // Gold bar / ingot shape (trapezoid) - front face with two-tone
        // Shadow side (left half)
        ctx.fillStyle = this.darkenColor(this.color, 0.3);
        ctx.beginPath();
        ctx.moveTo(x - 20, y + 10);
        ctx.lineTo(x - 14, y - 10);
        ctx.lineTo(x, y - 10);
        ctx.lineTo(x, y + 10);
        ctx.closePath();
        ctx.fill();

        // Light side (right half)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(x, y + 10);
        ctx.lineTo(x, y - 10);
        ctx.lineTo(x + 14, y - 10);
        ctx.lineTo(x + 20, y + 10);
        ctx.closePath();
        ctx.fill();

        // Full outline
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 20, y + 10);
        ctx.lineTo(x - 14, y - 10);
        ctx.lineTo(x + 14, y - 10);
        ctx.lineTo(x + 20, y + 10);
        ctx.closePath();
        ctx.stroke();

        // Top face (lighter) - cell-shading highlight
        ctx.fillStyle = this.lightenColor(this.color, 0.35);
        ctx.beginPath();
        ctx.moveTo(x - 14, y - 10);
        ctx.lineTo(x - 10, y - 14);
        ctx.lineTo(x + 10, y - 14);
        ctx.lineTo(x + 14, y - 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Shine line + rim lighting
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(x - 8, y - 12);
        ctx.lineTo(x + 8, y - 12);
        ctx.stroke();

        // Rim light on right edge
        ctx.strokeStyle = this.lightenColor(this.color, 0.4);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 14, y - 10);
        ctx.lineTo(x + 20, y + 10);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Symbol
        ctx.fillStyle = '#111';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, x, y + 2);
    }

    drawCard(ctx, x, y) {
        const w = 32, h = 22;

        // Shadow side (bottom-left) - cell-shading
        ctx.fillStyle = this.darkenColor(this.color, 0.35);
        ctx.beginPath();
        ctx.moveTo(x - w/2 + 4, y - h/2);
        ctx.lineTo(x + w/2, y + h/2);
        ctx.lineTo(x - w/2, y + h/2);
        ctx.lineTo(x - w/2, y - h/2 + 4);
        ctx.quadraticCurveTo(x - w/2, y - h/2, x - w/2 + 4, y - h/2);
        ctx.closePath();
        ctx.fill();

        // Light side (top-right)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(x - w/2 + 4, y - h/2);
        ctx.lineTo(x + w/2 - 4, y - h/2);
        ctx.quadraticCurveTo(x + w/2, y - h/2, x + w/2, y - h/2 + 4);
        ctx.lineTo(x + w/2, y + h/2 - 4);
        ctx.quadraticCurveTo(x + w/2, y + h/2, x + w/2 - 4, y + h/2);
        ctx.lineTo(x + w/2, y + h/2);
        ctx.lineTo(x - w/2 + 4, y - h/2);
        ctx.closePath();
        ctx.fill();

        // Full outline
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        this.roundRect(ctx, x - w/2, y - h/2, w, h, 4);
        ctx.stroke();

        // Chip
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(x - w/2 + 4, y - 4, 8, 8);
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - w/2 + 4, y - 4, 8, 8);
        // Chip lines
        ctx.beginPath();
        ctx.moveTo(x - w/2 + 8, y - 4);
        ctx.lineTo(x - w/2 + 8, y + 4);
        ctx.moveTo(x - w/2 + 4, y);
        ctx.lineTo(x - w/2 + 12, y);
        ctx.stroke();

        // Magnetic stripe
        ctx.fillStyle = '#222';
        ctx.fillRect(x - w/2, y + h/2 - 6, w, 4);

        // Rim lighting (top and right edge)
        ctx.strokeStyle = this.lightenColor(this.color, 0.5);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - w/2 + 6, y - h/2);
        ctx.lineTo(x + w/2 - 4, y - h/2);
        ctx.quadraticCurveTo(x + w/2, y - h/2, x + w/2, y - h/2 + 4);
        ctx.lineTo(x + w/2, y + h/2 - 8);
        ctx.stroke();

        // Symbol
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, x + 6, y - 2);
    }

    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
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

window.Game.Enemy = Enemy;
