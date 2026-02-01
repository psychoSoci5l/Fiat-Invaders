window.Game = window.Game || {};

// Power-up visual config with icons
const POWERUP_CONFIG = {
    // Weapon types (change firing pattern)
    WIDE:   { color: '#9b59b6', symbol: '🔱', category: 'weapon', name: 'WIDE' },
    NARROW: { color: '#3498db', symbol: '🎯', category: 'weapon', name: 'NARROW' },
    FIRE:   { color: '#e74c3c', symbol: '🔥', category: 'weapon', name: 'FIRE' },
    SPREAD: { color: '#2ecc71', symbol: '🌟', category: 'weapon', name: 'SPREAD' },
    HOMING: { color: '#e67e22', symbol: '🚀', category: 'weapon', name: 'HOMING' },
    LASER:  { color: '#00ffff', symbol: '⚡', category: 'weapon', name: 'LASER' },
    // Ship types (change ship stats)
    SPEED:  { color: '#f1c40f', symbol: '⚡', category: 'ship', name: 'SPEED' },
    RAPID:  { color: '#e91e63', symbol: '⚡', category: 'ship', name: 'RAPID' },
    SHIELD: { color: '#2ecc71', symbol: '🛡', category: 'ship', name: 'SHIELD' }
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

        // Outer animated glow
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 28 * pulse);
        gradient.addColorStop(0, cfg.color);
        gradient.addColorStop(0.5, this.alphaColor(cfg.color, 0.3));
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.globalAlpha = glowPulse;
        ctx.beginPath();
        ctx.arc(x, y, 28 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Draw based on type
        if (cfg.category === 'weapon') {
            this.drawWeaponPowerUp(ctx, x, y, cfg, pulse);
        } else {
            this.drawShipPowerUp(ctx, x, y, cfg, pulse);
        }

        ctx.restore();
    }

    drawWeaponPowerUp(ctx, x, y, cfg, pulse) {
        const size = 18 * pulse;

        // Hexagonal crystal shape
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.rotation * 0.5);

        // Outer hexagon - shadow side
        ctx.fillStyle = this.darkenColor(cfg.color, 0.3);
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
        ctx.strokeStyle = this.lightenColor(cfg.color, 0.4);
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
        } else if (this.type === 'LASER') {
            // Lightning bolt / beam shape
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(0, -iconSize);
            ctx.lineTo(-iconSize * 0.3, -iconSize * 0.2);
            ctx.lineTo(iconSize * 0.2, -iconSize * 0.1);
            ctx.lineTo(-iconSize * 0.2, iconSize * 0.5);
            ctx.lineTo(iconSize * 0.1, iconSize * 0.3);
            ctx.lineTo(0, iconSize);
            ctx.stroke();
            // Center glow dot
            ctx.beginPath();
            ctx.arc(0, 0, iconSize * 0.2, 0, Math.PI * 2);
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
        ctx.strokeStyle = this.lightenColor(cfg.color, 0.3);
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const angle = this.rotation + (Math.PI / 2) * i;
            ctx.beginPath();
            ctx.arc(0, 0, size + 4, angle, angle + 0.4);
            ctx.stroke();
        }

        // Main body - shadow
        ctx.fillStyle = this.darkenColor(cfg.color, 0.35);
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
        ctx.strokeStyle = this.lightenColor(cfg.color, 0.5);
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

    alphaColor(hex, alpha) {
        const num = parseInt(hex.slice(1), 16);
        const r = (num >> 16);
        const g = ((num >> 8) & 0xFF);
        const b = (num & 0xFF);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    darkenColor(hex, amount) {
        const num = parseInt(hex.slice(1), 16);
        const r = Math.max(0, (num >> 16) - Math.floor(255 * amount));
        const g = Math.max(0, ((num >> 8) & 0xFF) - Math.floor(255 * amount));
        const b = Math.max(0, (num & 0xFF) - Math.floor(255 * amount));
        return `rgb(${r},${g},${b})`;
    }

    lightenColor(hex, amount) {
        const num = parseInt(hex.slice(1), 16);
        const r = Math.min(255, (num >> 16) + Math.floor(255 * amount));
        const g = Math.min(255, ((num >> 8) & 0xFF) + Math.floor(255 * amount));
        const b = Math.min(255, (num & 0xFF) + Math.floor(255 * amount));
        return `rgb(${r},${g},${b})`;
    }
}

window.Game.PowerUp = PowerUp;
