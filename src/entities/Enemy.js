window.Game = window.Game || {};

class Enemy extends window.Game.Entity {
    constructor(x, y, typeConf) {
        super(x, y, 65, 65); // Larger enemies for better proportions with bullets

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
        this.hitFlash = 0; // Flash white when hit

        // Special behaviors (set by spawner based on tier)
        this.isKamikaze = false;      // Weak tier: can dive at player
        this.kamikazeDiving = false;  // Currently diving
        this.kamikazeSpeed = window.Game.Balance.ENEMY_BEHAVIOR.KAMIKAZE_SPEED;

        this.hasShield = false;       // Medium tier: absorbs first hit
        this.shieldActive = false;    // Shield currently up
        this.shieldFlash = 0;         // Visual feedback

        this.canTeleport = false;     // Strong tier: can teleport
        this.teleportCooldown = 0;    // Time until next teleport
        this.teleportFlash = 0;       // Visual feedback

        this.isMinion = false;        // Boss minion type

        // Formation entry system
        this.isEntering = false;      // True while flying to position
        this.targetX = x;             // Final X position
        this.targetY = y;             // Final Y position
        this.entryDelay = 0;          // Staggered delay before starting entry
        this.entryProgress = 0;       // 0-1 progress of entry animation
        this.settleTimer = 0;         // Time to settle after reaching position
        this.hasSettled = false;      // True after settling complete (can fire)

        // Pre-cache colors for performance (avoid recalculating every frame)
        const CU = window.Game.ColorUtils;
        this._colorDark30 = CU.darken(this.color, 0.3);
        this._colorDark35 = CU.darken(this.color, 0.35);
        this._colorDark40 = CU.darken(this.color, 0.4);
        this._colorDark50 = CU.darken(this.color, 0.5);
        this._colorLight35 = CU.lighten(this.color, 0.35);
        this._colorLight40 = CU.lighten(this.color, 0.4);
        this._colorLight50 = CU.lighten(this.color, 0.5);
    }

    // Note: attemptFire() removed in v2.13.0 - all firing now handled by HarmonicConductor

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

        // Get bullet size from Balance config based on shape
        const Balance = window.Game.Balance;
        const visualConfig = Balance?.BULLET_VISUALS?.[this.shape] || Balance?.BULLET_VISUALS?.DEFAULT || {};
        const size = visualConfig.size || { w: 6, h: 6 };

        return {
            x: this.x,
            y: this.y + 32, // Adjusted for larger enemy size
            vx: vx,
            vy: vy,
            color: this.color, // Match enemy color
            w: size.w,
            h: size.h,
            shape: this.shape  // Pass enemy shape for visual differentiation
        };
    }

    update(dt, globalTime, wavePattern, gridSpeed, gridDir, playerX, playerY) {
        // Decrement hit flash
        if (this.hitFlash > 0) this.hitFlash -= dt * 8; // Fast fade
        if (this.shieldFlash > 0) this.shieldFlash -= dt * 5;
        if (this.teleportFlash > 0) this.teleportFlash -= dt * 4;
        if (this.teleportCooldown > 0) this.teleportCooldown -= dt;

        // FORMATION ENTRY - Handle entry animation before normal movement
        if (this.isEntering) {
            // Wait for entry delay
            if (this.entryDelay > 0) {
                this.entryDelay -= dt;
                return; // Don't move yet
            }

            const Balance = window.Game.Balance;
            const entryConfig = Balance?.FORMATION_ENTRY || {};
            const entrySpeed = entryConfig.ENTRY_SPEED || 350;
            const curveIntensity = entryConfig.CURVE_INTENSITY || 0.4;
            const settleTime = entryConfig.SETTLE_TIME || 0.3;

            // Calculate distance to target
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 5) {
                // Move towards target with slight curve
                const moveAmount = entrySpeed * dt;
                const t = 1 - (dist / 400); // Progress factor

                // Add horizontal curve for visual interest (sine wave entry)
                const curveOffset = Math.sin(t * Math.PI) * curveIntensity * 50;
                const adjustedDx = dx + curveOffset * (this.targetX > 300 ? -1 : 1);

                const angle = Math.atan2(dy, adjustedDx);
                this.x += Math.cos(angle) * moveAmount;
                this.y += Math.sin(angle) * moveAmount;

                // Update entry progress for visual feedback
                this.entryProgress = Math.min(1, t);

                // Slight rotation during entry
                this.rotation = Math.sin(t * Math.PI * 2) * 0.15;
            } else {
                // Snap to target position
                this.x = this.targetX;
                this.y = this.targetY;
                this.baseY = this.targetY;
                this.rotation = 0;

                // Start settle timer
                if (this.settleTimer === 0) {
                    this.settleTimer = settleTime;
                }

                this.settleTimer -= dt;
                if (this.settleTimer <= 0) {
                    this.isEntering = false;
                    this.hasSettled = true;
                    this.entryProgress = 1;
                }
            }
            return; // Skip normal movement during entry
        }

        // KAMIKAZE DIVE - When diving, ignore normal movement
        if (this.kamikazeDiving && playerY !== undefined) {
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            this.x += (dx / dist) * this.kamikazeSpeed * dt;
            this.y += (dy / dist) * this.kamikazeSpeed * dt;
            this.rotation = Math.atan2(dy, dx) - Math.PI / 2;
            return; // Skip normal movement
        }

        // TELEPORT - Random chance when player is close
        if (this.canTeleport && this.teleportCooldown <= 0 && playerX !== undefined) {
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Teleport if player bullet might be coming (player below, within range)
            if (dist < 200 && dy > 0 && Math.random() < 0.01) { // 1% chance per frame
                this.doTeleport();
            }
        }

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

    // Trigger kamikaze dive towards player
    triggerKamikaze() {
        if (!this.isKamikaze || this.kamikazeDiving) return;
        this.kamikazeDiving = true;
        if (window.Game.Audio) window.Game.Audio.play('enemyTelegraph');
    }

    // Short-range teleport to dodge
    doTeleport() {
        const offsetX = (Math.random() - 0.5) * 120; // Random horizontal offset
        const offsetY = (Math.random() * 40) - 20;   // Small vertical offset
        this.x += offsetX;
        this.y += offsetY;
        // Clamp to safe bounds (canvas max 600px, margin 50px)
        this.x = Math.max(50, Math.min(550, this.x));
        this.y = Math.max(100, Math.min(500, this.y));
        this.teleportCooldown = 3 + Math.random() * 2; // 3-5 second cooldown
        this.teleportFlash = 1;
        if (window.Game.Audio) window.Game.Audio.play('grazeNearMiss');
    }

    // Take damage - returns true if enemy should die
    takeDamage(amount) {
        // Shield absorbs first hit
        if (this.shieldActive) {
            this.shieldActive = false;
            this.shieldFlash = 1;
            if (window.Game.Audio) window.Game.Audio.play('shieldDeactivate');
            return false; // Don't reduce HP
        }

        this.hp -= amount;
        this.hitFlash = 1;
        return this.hp <= 0;
    }

    // Activate shield (called by spawner)
    activateShield() {
        if (this.hasShield) {
            this.shieldActive = true;
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
        if (this.isMinion) {
            this.drawMinion(ctx, x, y);
        } else if (this.shape === 'coin') {
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

        // Hit flash effect (white overlay)
        if (this.hitFlash > 0) {
            ctx.globalAlpha = this.hitFlash;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(x, y, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Telegraph indicator (larger for bigger enemies)
        if (this.telegraphTimer > 0) {
            const mult = (this.pattern === 'BURST') ? 5 : (this.pattern === 'DOUBLE' ? 5.5 : 6);
            ctx.globalAlpha = Math.min(1, this.telegraphTimer * mult);
            ctx.strokeStyle = (this.pattern === 'BURST') ? '#ff6b6b' : (this.pattern === 'DOUBLE' ? '#4ecdc4' : '#fff');
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, 34, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // SHIELD indicator (blue hexagonal barrier)
        if (this.shieldActive) {
            const shieldPulse = Math.sin(Date.now() * 0.01) * 0.2 + 0.8;
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 3;
            ctx.globalAlpha = shieldPulse;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 2;
                const px = x + Math.cos(angle) * 35;
                const py = y + Math.sin(angle) * 35;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Shield break flash
        if (this.shieldFlash > 0) {
            ctx.globalAlpha = this.shieldFlash;
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(x, y, 40 + (1 - this.shieldFlash) * 20, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Teleport flash effect
        if (this.teleportFlash > 0) {
            ctx.globalAlpha = this.teleportFlash * 0.6;
            ctx.fillStyle = '#9b59b6';
            ctx.beginPath();
            ctx.arc(x, y, 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Kamikaze dive indicator (red trailing flames)
        if (this.kamikazeDiving) {
            ctx.globalAlpha = 0.7;
            for (let i = 1; i <= 3; i++) {
                const trailX = x - Math.sin(this.rotation + Math.PI / 2) * i * 15;
                const trailY = y - Math.cos(this.rotation + Math.PI / 2) * i * 15;
                ctx.fillStyle = i === 1 ? '#ff6600' : (i === 2 ? '#ff3300' : '#cc0000');
                ctx.beginPath();
                ctx.arc(trailX, trailY, 15 - i * 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    }

    drawCoin(ctx, x, y) {
        const r = 25; // Larger radius for better proportions

        // Shadow side (bottom-left arc) - cell-shading
        ctx.fillStyle = this._colorDark35;
        ctx.beginPath();
        ctx.arc(x, y, r, Math.PI * 0.4, Math.PI * 1.4);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fill();

        // Light side (top-right arc)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x, y, r, Math.PI * 1.4, Math.PI * 0.4);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fill();

        // Full outline
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();

        // Inner circle (darker)
        ctx.fillStyle = this._colorDark40;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // Rim lighting (top-right arc highlight)
        ctx.strokeStyle = this._colorLight50;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r - 2, -Math.PI * 0.6, Math.PI * 0.1);
        ctx.stroke();

        // Edge notches (8 for larger coin)
        ctx.strokeStyle = this._colorDark50;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const x1 = x + Math.cos(angle) * (r - 4);
            const y1 = y + Math.sin(angle) * (r - 4);
            const x2 = x + Math.cos(angle) * r;
            const y2 = y + Math.sin(angle) * r;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // Symbol (larger)
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, x, y);
    }

    drawBill(ctx, x, y) {
        const w = 48, h = 28; // Larger bill

        // Shadow side (bottom-left triangle) - cell-shading
        ctx.fillStyle = this._colorDark35;
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
        ctx.strokeStyle = this._colorDark50;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - w/2 + 4, y - h/2 + 4, w - 8, h - 8);

        // Corner decorations (larger)
        ctx.fillStyle = this._colorDark40;
        ctx.fillRect(x - w/2 + 3, y - h/2 + 3, 7, 7);
        ctx.fillRect(x + w/2 - 10, y - h/2 + 3, 7, 7);
        ctx.fillRect(x - w/2 + 3, y + h/2 - 10, 7, 7);
        ctx.fillRect(x + w/2 - 10, y + h/2 - 10, 7, 7);

        // Rim lighting (top and right edge)
        ctx.strokeStyle = this._colorLight50;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - w/2 + 3, y - h/2);
        ctx.lineTo(x + w/2, y - h/2);
        ctx.lineTo(x + w/2, y + h/2 - 3);
        ctx.stroke();

        // Symbol (larger)
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, x, y);
    }

    drawBar(ctx, x, y) {
        // Gold bar / ingot shape (trapezoid) - larger front face with two-tone
        // Shadow side (left half)
        ctx.fillStyle = this._colorDark30;
        ctx.beginPath();
        ctx.moveTo(x - 26, y + 14);
        ctx.lineTo(x - 18, y - 14);
        ctx.lineTo(x, y - 14);
        ctx.lineTo(x, y + 14);
        ctx.closePath();
        ctx.fill();

        // Light side (right half)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(x, y + 14);
        ctx.lineTo(x, y - 14);
        ctx.lineTo(x + 18, y - 14);
        ctx.lineTo(x + 26, y + 14);
        ctx.closePath();
        ctx.fill();

        // Full outline
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 26, y + 14);
        ctx.lineTo(x - 18, y - 14);
        ctx.lineTo(x + 18, y - 14);
        ctx.lineTo(x + 26, y + 14);
        ctx.closePath();
        ctx.stroke();

        // Top face (lighter) - cell-shading highlight
        ctx.fillStyle = this._colorLight35;
        ctx.beginPath();
        ctx.moveTo(x - 18, y - 14);
        ctx.lineTo(x - 13, y - 20);
        ctx.lineTo(x + 13, y - 20);
        ctx.lineTo(x + 18, y - 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Shine line
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(x - 10, y - 17);
        ctx.lineTo(x + 10, y - 17);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Symbol (larger)
        ctx.fillStyle = '#111';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, x, y + 2);
    }

    drawCard(ctx, x, y) {
        const w = 44, h = 30; // Larger card

        // Shadow side (bottom-left) - cell-shading
        ctx.fillStyle = this._colorDark35;
        ctx.beginPath();
        ctx.moveTo(x - w/2 + 5, y - h/2);
        ctx.lineTo(x + w/2, y + h/2);
        ctx.lineTo(x - w/2, y + h/2);
        ctx.lineTo(x - w/2, y - h/2 + 5);
        ctx.quadraticCurveTo(x - w/2, y - h/2, x - w/2 + 5, y - h/2);
        ctx.closePath();
        ctx.fill();

        // Light side (top-right)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(x - w/2 + 5, y - h/2);
        ctx.lineTo(x + w/2 - 5, y - h/2);
        ctx.quadraticCurveTo(x + w/2, y - h/2, x + w/2, y - h/2 + 5);
        ctx.lineTo(x + w/2, y + h/2 - 5);
        ctx.quadraticCurveTo(x + w/2, y + h/2, x + w/2 - 5, y + h/2);
        ctx.lineTo(x + w/2, y + h/2);
        ctx.lineTo(x - w/2 + 5, y - h/2);
        ctx.closePath();
        ctx.fill();

        // Full outline
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        this.roundRect(ctx, x - w/2, y - h/2, w, h, 5);
        ctx.stroke();

        // Chip (larger with detail)
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(x - w/2 + 5, y - 6, 12, 12);
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - w/2 + 5, y - 6, 12, 12);
        // Chip lines
        ctx.strokeStyle = '#c9a007';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - w/2 + 8, y - 3);
        ctx.lineTo(x - w/2 + 14, y - 3);
        ctx.moveTo(x - w/2 + 8, y + 3);
        ctx.lineTo(x - w/2 + 14, y + 3);
        ctx.stroke();

        // Magnetic stripe
        ctx.fillStyle = '#222';
        ctx.fillRect(x - w/2, y + h/2 - 8, w, 5);

        // Rim lighting (top and right edge)
        ctx.strokeStyle = this._colorLight50;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - w/2 + 8, y - h/2);
        ctx.lineTo(x + w/2 - 5, y - h/2);
        ctx.quadraticCurveTo(x + w/2, y - h/2, x + w/2, y - h/2 + 5);
        ctx.lineTo(x + w/2, y + h/2 - 10);
        ctx.stroke();

        // Symbol (larger)
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, x + 8, y - 3);
    }

    drawMinion(ctx, x, y) {
        // Boss minions: smaller, flying money with glow
        const r = 18; // Smaller than regular enemies
        const pulse = Math.sin(Date.now() * 0.01) * 0.15 + 1;

        // Flying animation - minions bob up and down
        const bobOffset = Math.sin(Date.now() * 0.005 + x * 0.1) * 5;
        y += bobOffset;

        // Danger glow (minions are aggressive)
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.3 * pulse;
        ctx.beginPath();
        ctx.arc(x, y, r + 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Main body (small coin)
        ctx.fillStyle = this._colorDark35;
        ctx.beginPath();
        ctx.arc(x, y, r, Math.PI * 0.4, Math.PI * 1.4);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x, y, r, Math.PI * 1.4, Math.PI * 0.4);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fill();

        // Outline
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();

        // Wing-like sparkles on sides (flying money effect)
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.7;
        const wingAngle = Date.now() * 0.02;
        for (let i = -1; i <= 1; i += 2) {
            const wingX = x + i * (r + 4);
            const wingY = y + Math.sin(wingAngle + i) * 4;
            ctx.beginPath();
            ctx.moveTo(wingX, wingY - 6);
            ctx.lineTo(wingX + i * 8, wingY);
            ctx.lineTo(wingX, wingY + 6);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Symbol (smaller)
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, x, y);
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

}

window.Game.Enemy = Enemy;
