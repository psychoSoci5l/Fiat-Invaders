window.Game = window.Game || {};

class Boss extends window.Game.Entity {
    constructor(gameWidth, gameHeight) {
        // BIGGER: 160x140 instead of 80x80
        super(gameWidth / 2 - 80, -160, 160, 140);
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;

        this.maxHp = 800;
        this.hp = 800;
        this.active = true;

        // 3 PHASES: PHASE1 (100-66%), PHASE2 (66-33%), PHASE3 (33-0%)
        this.phase = 1;
        this.phaseTransitioning = false;
        this.phaseTransitionTimer = 0;

        this.targetY = 145; // Below safe zone (HUD + perk bar)
        this.dir = 1;
        this.moveSpeed = 60;

        this.fireTimer = 0;
        this.printTimer = 0;
        this.hitTimer = 0;
        this.angle = 0;
        this.laserAngle = 0;
        this.animTime = 0;

        // Visual state
        this.eyeGlow = 0;
        this.shakeIntensity = 0;
    }

    damage(amount) {
        this.hp -= amount;
        this.hitTimer = 0.12;

        // Phase transitions
        const hpPct = this.hp / this.maxHp;
        if (hpPct <= 0.33 && this.phase < 3) {
            this.triggerPhaseTransition(3);
        } else if (hpPct <= 0.66 && this.phase < 2) {
            this.triggerPhaseTransition(2);
        }
    }

    triggerPhaseTransition(newPhase) {
        this.phase = newPhase;
        this.phaseTransitioning = true;
        this.phaseTransitionTimer = 1.5;
        this.shakeIntensity = 15;
        this.eyeGlow = 1;

        if (window.Game.Audio) {
            window.Game.Audio.play('bossPhaseChange');
            window.Game.Audio.setBossPhase(newPhase);
        }

        // Update Harmonic Conductor for new boss phase
        if (window.Game.HarmonicConductor) {
            window.Game.HarmonicConductor.setBossSequence(newPhase);
        }

        // Screen shake via global
        if (typeof shake !== 'undefined') shake = 30;
    }

    update(dt, player) {
        this.animTime += dt;
        if (this.hitTimer > 0) this.hitTimer -= dt;
        if (this.eyeGlow > 0) this.eyeGlow -= dt * 0.5;
        if (this.shakeIntensity > 0) this.shakeIntensity -= dt * 10;

        // Phase transition pause
        if (this.phaseTransitioning) {
            this.phaseTransitionTimer -= dt;
            if (this.phaseTransitionTimer <= 0) {
                this.phaseTransitioning = false;
            }
            // Shake during transition
            this.x += (Math.random() - 0.5) * this.shakeIntensity;
            this.y = this.targetY + (Math.random() - 0.5) * this.shakeIntensity;
            return null;
        }

        // Entrance Animation
        if (this.y < this.targetY) {
            this.y += 80 * dt;
            return null;
        }

        // Movement based on phase
        if (this.phase === 1) {
            // Slow patrol
            this.x += this.moveSpeed * this.dir * dt;
            if (this.x < 20 || this.x + this.width > this.gameWidth - 20) {
                this.dir *= -1;
            }
        } else if (this.phase === 2) {
            // Faster, erratic movement
            this.moveSpeed = 120;
            this.x += this.moveSpeed * this.dir * dt;
            this.y = this.targetY + Math.sin(this.animTime * 3) * 20;
            if (this.x < 20 || this.x + this.width > this.gameWidth - 20) {
                this.dir *= -1;
            }
        } else {
            // Phase 3: RAGE - Erratic aggressive movement
            this.moveSpeed = 180;

            // Figure-8 pattern with random jerks
            const baseX = this.gameWidth / 2 - this.width / 2;
            const patternX = Math.sin(this.animTime * 2) * 150;
            const patternY = Math.sin(this.animTime * 4) * 30;

            // Lerp to pattern position with some randomness
            const targetX = baseX + patternX;
            this.x += (targetX - this.x) * 3 * dt + (Math.random() - 0.5) * 8;
            this.y = this.targetY + patternY + (Math.random() - 0.5) * 5;

            // Keep in bounds
            this.x = Math.max(20, Math.min(this.gameWidth - this.width - 20, this.x));

            // Spawn minions more frequently
            this.printTimer -= dt;
            if (this.printTimer <= 0) {
                this.printMoney();
                this.printTimer = 2.5;
            }
        }

        // Attack Logic
        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
            return this.attack(player);
        }
        return null;
    }

    printMoney() {
        const G = window.Game;
        if (!G.enemies) return;

        // Spawn strong minions in Phase 3
        const typeIdx = Math.min(G.FIAT_TYPES.length - 1, 7); // Strong type
        G.enemies.push(new G.Enemy(this.x - 40, this.y + 80, G.FIAT_TYPES[typeIdx]));
        G.enemies.push(new G.Enemy(this.x + this.width + 40, this.y + 80, G.FIAT_TYPES[typeIdx]));

        if (G.Audio) G.Audio.play('coin');
    }

    attack(player) {
        const bullets = [];
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height;
        const Patterns = window.Game.BulletPatterns;
        const Colors = window.Game.BULLET_HELL_COLORS || {};

        // Fallback if BulletPatterns not loaded
        if (!Patterns) {
            // Simple spread shot fallback
            this.fireTimer = 1.0;
            for (let i = -2; i <= 2; i++) {
                const angle = Math.PI / 2 + (i * 0.25);
                bullets.push({
                    x: cx, y: cy - 20,
                    vx: Math.cos(angle) * 180,
                    vy: Math.sin(angle) * 180,
                    color: '#ff69b4', w: 10, h: 10
                });
            }
            return bullets;
        }

        // Ikeda-style geometric patterns per phase
        if (this.phase === 1) {
            // PHASE 1: Alternating expandingRing and sineWave
            this.fireTimer = 0.8;
            this.angle += 0.15;

            // Every other attack: ring vs wave
            if (Math.floor(this.angle * 2) % 2 === 0) {
                // Expanding ring (cyan)
                const ringBullets = Patterns.expandingRing(cx, cy - 20, this.angle, {
                    count: 12,
                    speed: 140,
                    color: Colors.CYAN || '#00ffff',
                    size: 10,
                    rotate: true
                });
                bullets.push(...ringBullets);
            } else {
                // Sine wave (pink)
                const waveBullets = Patterns.sineWave(cx, cy - 20, this.animTime, {
                    count: 10,
                    width: 350,
                    amplitude: 25,
                    speed: 160,
                    color: Colors.PINK || '#ff69b4',
                    size: 8
                });
                bullets.push(...waveBullets);
            }
        } else if (this.phase === 2) {
            // PHASE 2: Spiral + flower burst every 3s
            this.fireTimer = 0.18;
            this.angle += 0.3;

            // Dual spiral (orange)
            const spiralBullets = Patterns.spiral(cx, cy - 20, this.angle, {
                arms: 2,
                speed: 200,
                color: Colors.ORANGE || '#ff8c00',
                size: 10
            });
            bullets.push(...spiralBullets);

            // Flower burst every ~3 seconds
            if (Math.floor(this.animTime * 0.33) !== Math.floor((this.animTime - 0.18) * 0.33)) {
                const flowerBullets = Patterns.flower(cx, cy - 30, this.animTime, {
                    petals: 6,
                    bulletsPerPetal: 3,
                    speed: 180,
                    color: Colors.MAGENTA || '#ff00ff',
                    size: 9
                });
                bullets.push(...flowerBullets);
            }

            // Aimed burst occasionally
            if (Math.floor(this.angle * 3) % 5 === 0 && player) {
                const aimedBullets = Patterns.aimedBurst(cx, cy, player.x, player.y, {
                    count: 3,
                    speed: 250,
                    spread: 0.3,
                    color: '#e74c3c',
                    size: 11
                });
                bullets.push(...aimedBullets);
            }
        } else {
            // PHASE 3: CHAOS - Quad spiral + curtain with gap
            this.fireTimer = 0.1;
            this.angle += 0.22;
            this.laserAngle += 0.06;

            // Quad spiral (yellow/pink alternating)
            const spiralColor = Math.floor(this.angle * 2) % 2 === 0 ?
                (Colors.YELLOW || '#ffff00') : (Colors.PINK || '#ff69b4');
            const spiralBullets = Patterns.spiral(cx, cy - 20, this.angle, {
                arms: 4,
                speed: 220,
                color: spiralColor,
                size: 10
            });
            bullets.push(...spiralBullets);

            // Curtain with gap (follows player) every ~1.5s
            if (Math.floor(this.animTime * 0.67) !== Math.floor((this.animTime - 0.1) * 0.67) && player) {
                const curtainBullets = Patterns.curtain(cx, cy - 40, player.x, {
                    width: 450,
                    count: 18,
                    gapSize: 70,
                    speed: 180,
                    color: Colors.CYAN || '#00ffff',
                    size: 9
                });
                bullets.push(...curtainBullets);
            }

            // Side cannons with double helix
            const helixBullets = Patterns.doubleHelix(this.x + 20, cy - 30, this.laserAngle, {
                speed: 200,
                color1: Colors.PINK || '#ff69b4',
                color2: Colors.CYAN || '#00ffff',
                size: 8
            });
            bullets.push(...helixBullets);

            const helixBullets2 = Patterns.doubleHelix(this.x + this.width - 20, cy - 30, this.laserAngle + Math.PI, {
                speed: 200,
                color1: Colors.CYAN || '#00ffff',
                color2: Colors.PINK || '#ff69b4',
                size: 8
            });
            bullets.push(...helixBullets2);
        }

        return bullets;
    }

    draw(ctx) {
        const x = this.x;
        const y = this.y;
        const w = this.width;
        const h = this.height;
        const cx = x + w / 2;

        ctx.save();

        // Phase-based color scheme
        const isHit = this.hitTimer > 0;
        const baseColor = this.phase === 3 ? '#4a1a1a' : (this.phase === 2 ? '#3d3d3d' : '#5a5a5a');
        const accentColor = this.phase === 3 ? '#ff0000' : (this.phase === 2 ? '#f39c12' : '#2ecc71');

        // AURA EFFECT - Pulsing danger glow (bigger in higher phases)
        const auraPulse = Math.sin(this.animTime * 4) * 0.15 + 0.3;
        const auraSize = 20 + this.phase * 15;
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = auraPulse * (this.phase * 0.3);
        ctx.beginPath();
        ctx.ellipse(cx, y + h / 2, w / 2 + auraSize, h / 2 + auraSize * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // MAIN BODY - Central Bank Vault - two-tone cell-shading
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 4;

        // Shadow side (left half of vault)
        ctx.fillStyle = isHit ? '#ffffff' : this.darkenColor(baseColor, 0.25);
        ctx.beginPath();
        ctx.roundRect(x + 10, y + 30, (w - 20) / 2, h - 40, 8);
        ctx.fill();

        // Light side (right half of vault)
        ctx.fillStyle = isHit ? '#ffffff' : baseColor;
        ctx.beginPath();
        ctx.roundRect(x + 10 + (w - 20) / 2, y + 30, (w - 20) / 2, h - 40, 8);
        ctx.fill();

        // Full vault outline
        ctx.beginPath();
        ctx.roundRect(x + 10, y + 30, w - 20, h - 40, 8);
        ctx.stroke();

        // Rim lighting (top and right edge of vault)
        ctx.strokeStyle = this.lightenColor(baseColor, 0.4);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 30);
        ctx.lineTo(x + w - 18, y + 30);
        ctx.quadraticCurveTo(x + w - 10, y + 30, x + w - 10, y + 38);
        ctx.lineTo(x + w - 10, y + h - 18);
        ctx.stroke();

        // Top section (printer)
        ctx.fillStyle = isHit ? '#ffffff' : '#333';
        ctx.beginPath();
        ctx.roundRect(x + 30, y + 5, w - 60, 35, 5);
        ctx.fill();
        ctx.stroke();

        // Printer slot
        ctx.fillStyle = '#111';
        ctx.fillRect(x + 50, y + 15, w - 100, 8);

        // Money coming out animation (Phase 2+)
        if (this.phase >= 2) {
            const moneyOffset = (this.animTime * 50) % 20;
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(x + 55, y + 12 + moneyOffset, 15, 6);
            ctx.fillRect(x + w - 70, y + 12 + (moneyOffset + 10) % 20, 15, 6);

            // Smoke/steam from printer
            ctx.globalAlpha = 0.4;
            for (let i = 0; i < 3; i++) {
                const smokeX = cx + Math.sin(this.animTime * 3 + i * 2) * 15;
                const smokeY = y - 5 - (this.animTime * 30 + i * 10) % 25;
                const smokeSize = 6 + i * 2;
                ctx.fillStyle = '#aaa';
                ctx.beginPath();
                ctx.arc(smokeX, smokeY, smokeSize, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        // FACE PANEL
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.roundRect(x + 25, y + 45, w - 50, 50, 5);
        ctx.fill();

        // EYES - Get angrier with each phase
        const eyeSize = 12 + this.phase * 2;
        const eyeY = y + 65;
        const eyeSpacing = 25 + this.phase * 5;

        // Eye glow (when transitioning or phase 3)
        if (this.eyeGlow > 0 || this.phase === 3) {
            const glowAlpha = this.phase === 3 ? 0.5 + Math.sin(this.animTime * 10) * 0.3 : this.eyeGlow;
            ctx.fillStyle = `rgba(255, 0, 0, ${glowAlpha})`;
            ctx.beginPath();
            ctx.arc(cx - eyeSpacing, eyeY, eyeSize + 8, 0, Math.PI * 2);
            ctx.arc(cx + eyeSpacing, eyeY, eyeSize + 8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Eye whites - bold cell-shaded outline
        ctx.fillStyle = this.phase === 3 ? '#ffcccc' : '#fff';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx - eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pupils - track player or spin in rage
        let pupilOffsetX = 0, pupilOffsetY = 0;
        if (this.phase === 3) {
            // Spinning crazy eyes
            pupilOffsetX = Math.cos(this.animTime * 5) * 4;
            pupilOffsetY = Math.sin(this.animTime * 5) * 4;
        }

        ctx.fillStyle = this.phase === 3 ? '#ff0000' : '#111';
        ctx.beginPath();
        ctx.arc(cx - eyeSpacing + pupilOffsetX, eyeY + pupilOffsetY, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.arc(cx + eyeSpacing + pupilOffsetX, eyeY + pupilOffsetY, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Angry eyebrows (Phase 2+)
        if (this.phase >= 2) {
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(cx - eyeSpacing - eyeSize, eyeY - eyeSize - 5);
            ctx.lineTo(cx - eyeSpacing + eyeSize, eyeY - eyeSize + 3);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + eyeSpacing + eyeSize, eyeY - eyeSize - 5);
            ctx.lineTo(cx + eyeSpacing - eyeSize, eyeY - eyeSize + 3);
            ctx.stroke();
        }

        // VAULT DIAL - bold cell-shaded outline
        ctx.fillStyle = '#c0c0c0';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, y + 110, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Dial inner
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(cx, y + 110, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Dial tick (rotating)
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 3;
        const dialAngle = this.animTime * 2;
        ctx.beginPath();
        ctx.moveTo(cx, y + 110);
        ctx.lineTo(cx + Math.cos(dialAngle) * 14, y + 110 + Math.sin(dialAngle) * 14);
        ctx.stroke();

        // SIDE CANNONS (Phase 2+) - bold cell-shaded outline
        if (this.phase >= 2) {
            ctx.fillStyle = '#444';
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 3;
            // Left cannon
            ctx.beginPath();
            ctx.roundRect(x - 5, y + 70, 20, 35, 3);
            ctx.fill();
            ctx.stroke();
            // Right cannon
            ctx.beginPath();
            ctx.roundRect(x + w - 15, y + 70, 20, 35, 3);
            ctx.fill();
            ctx.stroke();

            // Cannon glow
            ctx.fillStyle = accentColor;
            ctx.beginPath();
            ctx.arc(x + 5, y + 100, 5, 0, Math.PI * 2);
            ctx.arc(x + w - 5, y + 100, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // $ SYMBOL on vault (pulsing in phase 3)
        ctx.fillStyle = accentColor;
        if (this.phase === 3) {
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 15 + Math.sin(this.animTime * 10) * 8;
        }
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', cx, y + 145);
        ctx.shadowBlur = 0;

        // Phase 3 RAGE effects - energy sparks around body
        if (this.phase === 3) {
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const sparkAngle = this.animTime * 8 + i * Math.PI / 2;
                const sparkDist = 70 + Math.sin(this.animTime * 12 + i) * 15;
                const sparkX = cx + Math.cos(sparkAngle) * sparkDist;
                const sparkY = y + h / 2 + Math.sin(sparkAngle) * sparkDist * 0.5;

                ctx.globalAlpha = 0.6 + Math.sin(this.animTime * 15 + i * 2) * 0.4;
                ctx.beginPath();
                // Lightning bolt shape
                ctx.moveTo(sparkX - 4, sparkY - 6);
                ctx.lineTo(sparkX + 2, sparkY - 1);
                ctx.lineTo(sparkX - 2, sparkY + 1);
                ctx.lineTo(sparkX + 4, sparkY + 6);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // HP BAR - Bigger and more prominent
        const hpPct = Math.max(0, this.hp / this.maxHp);
        const barW = w + 40;
        const barH = 12;
        const barX = x - 20;
        const barY = y - 30;

        // Bar background
        ctx.fillStyle = '#330000';
        ctx.fillRect(barX, barY, barW, barH);

        // HP fill with phase colors
        const hpColor = this.phase === 3 ? '#ff0000' : (this.phase === 2 ? '#f39c12' : '#2ecc71');
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barY, barW * hpPct, barH);

        // Bar border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);

        // Phase indicator
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`PHASE ${this.phase}`, cx, barY - 8);

        // Boss name
        ctx.font = 'bold 16px Arial';
        ctx.fillText('THE FED', cx, barY - 22);

        ctx.restore();
    }

    darkenColor(hex, amount) {
        // Handle rgb() format
        if (hex.startsWith('rgb')) {
            const match = hex.match(/(\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
                const r = Math.max(0, parseInt(match[1]) - Math.floor(255 * amount));
                const g = Math.max(0, parseInt(match[2]) - Math.floor(255 * amount));
                const b = Math.max(0, parseInt(match[3]) - Math.floor(255 * amount));
                return `rgb(${r},${g},${b})`;
            }
        }
        // Handle hex format
        const num = parseInt(hex.slice(1), 16);
        const r = Math.max(0, (num >> 16) - Math.floor(255 * amount));
        const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.floor(255 * amount));
        const b = Math.max(0, (num & 0x0000FF) - Math.floor(255 * amount));
        return `rgb(${r},${g},${b})`;
    }

    lightenColor(hex, amount) {
        // Handle rgb() format
        if (hex.startsWith('rgb')) {
            const match = hex.match(/(\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
                const r = Math.min(255, parseInt(match[1]) + Math.floor(255 * amount));
                const g = Math.min(255, parseInt(match[2]) + Math.floor(255 * amount));
                const b = Math.min(255, parseInt(match[3]) + Math.floor(255 * amount));
                return `rgb(${r},${g},${b})`;
            }
        }
        // Handle hex format
        const num = parseInt(hex.slice(1), 16);
        const r = Math.min(255, (num >> 16) + Math.floor(255 * amount));
        const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.floor(255 * amount));
        const b = Math.min(255, (num & 0x0000FF) + Math.floor(255 * amount));
        return `rgb(${r},${g},${b})`;
    }
}

window.Game.Boss = Boss;
