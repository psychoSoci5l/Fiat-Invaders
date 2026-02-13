/**
 * BulletSystem.js - Centralized bullet collision & explosion utilities
 * v4.22.0 - Circle-based collision, Missile AoE, Debug hitbox overlay
 *
 * Provides:
 *   G.BulletSystem.circleCollide(x1,y1,r1, x2,y2,r2) -> boolean
 *   G.BulletSystem.bulletHitsEntity(bullet, entity, entityRadius) -> boolean
 *   G.BulletSystem.handleMissileExplosion(bullet, enemies, boss) -> { damaged }
 *   G.BulletSystem.drawDebugOverlay(ctx, playerBullets, enemyBullets, enemies, player, boss)
 */
(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    G.BulletSystem = {
        debugEnabled: false,

        // ========== COLLISION DETECTION (Circle-based) ==========

        /**
         * Circle vs circle collision test (no sqrt, uses distSq)
         * @returns {boolean}
         */
        circleCollide(x1, y1, r1, x2, y2, r2) {
            const dx = x1 - x2;
            const dy = y1 - y2;
            const rSum = r1 + r2;
            return (dx * dx + dy * dy) <= (rSum * rSum);
        },

        /**
         * Test if a bullet's collision radius overlaps an entity's hitbox radius
         * Uses bullet.collisionRadius getter (from Bullet.js)
         * @param {Bullet} bullet
         * @param {Entity} entity - must have x, y
         * @param {number} entityRadius
         * @returns {boolean}
         */
        bulletHitsEntity(bullet, entity, entityRadius) {
            const br = bullet.collisionRadius || 4;
            const dx = bullet.x - entity.x;
            const dy = bullet.y - entity.y;
            const rSum = br + entityRadius;
            return (dx * dx + dy * dy) <= (rSum * rSum);
        },

        // ========== LINE-SEGMENT vs CIRCLE (Laser Beam collision) ==========

        /**
         * Test if a line segment (x1,y1)→(x2,y2) intersects a circle (cx,cy,r)
         * Projects circle center onto segment, clamps to [0,1], checks distance ≤ r
         * @returns {boolean}
         */
        lineSegmentVsCircle(x1, y1, x2, y2, cx, cy, r) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const fx = x1 - cx;
            const fy = y1 - cy;
            const lenSq = dx * dx + dy * dy;
            if (lenSq < 0.001) {
                // Degenerate segment — fallback to point-vs-circle
                return (fx * fx + fy * fy) <= (r * r);
            }
            // t = projection of circle center onto segment, clamped [0,1]
            let t = -(fx * dx + fy * dy) / lenSq;
            if (t < 0) t = 0;
            else if (t > 1) t = 1;
            const nearX = x1 + t * dx;
            const nearY = y1 + t * dy;
            const distX = nearX - cx;
            const distY = nearY - cy;
            return (distX * distX + distY * distY) <= (r * r);
        },

        // ========== MISSILE AoE EXPLOSION ==========

        /**
         * Handle missile explosion on impact
         * Damages all enemies within AoE radius, applies knockback, particles, shake
         * @param {Bullet} bullet - the missile bullet (has aoeRadius, damageMult)
         * @param {Array} enemies - active enemies array
         * @param {Object|null} boss - active boss or null
         * @returns {{ damaged: Array }} list of { enemy, damage } entries
         */
        handleMissileExplosion(bullet, enemies, boss) {
            const cfg = G.Balance?.BULLET_CONFIG?.PLAYER_MISSILE?.explosion;
            if (!cfg) return { damaged: [] };

            const cx = bullet.x;
            const cy = bullet.y;
            const aoeR = bullet.aoeRadius || cfg.radius;
            const baseDmg = (window.player?.stats?.baseDamage || 14) * (bullet.damageMult || 1) * cfg.damage;
            const aoeRSq = aoeR * aoeR;
            const damaged = [];

            // Damage enemies within radius
            for (let i = enemies.length - 1; i >= 0; i--) {
                const e = enemies[i];
                if (!e || e.markedForDeletion) continue;
                if (e.isEntering || !e.hasSettled) continue;

                const dx = e.x - cx;
                const dy = e.y - cy;
                const distSq = dx * dx + dy * dy;

                if (distSq <= aoeRSq) {
                    // Radial falloff: full damage at center, half at edge
                    const dist = Math.sqrt(distSq);
                    const falloff = 1 - (dist / aoeR) * 0.5;
                    const dmg = baseDmg * falloff;

                    damaged.push({ enemy: e, damage: dmg });

                    // Apply damage
                    e.takeDamage(dmg);

                    // Knockback: push away from epicenter
                    if (dist > 1) {
                        const kbForce = cfg.knockback * falloff;
                        e.x += (dx / dist) * kbForce * 0.1;
                        e.y += (dy / dist) * kbForce * 0.1;
                    }
                }
            }

            // Damage boss if within radius
            if (boss && boss.active) {
                const bCenterX = boss.x + (boss.width || 0) * 0.5;
                const bCenterY = boss.y + (boss.height || 0) * 0.5;
                const dx = bCenterX - cx;
                const dy = bCenterY - cy;
                const distSq = dx * dx + dy * dy;

                if (distSq <= aoeRSq) {
                    const dist = Math.sqrt(distSq);
                    const falloff = 1 - (dist / aoeR) * 0.5;
                    const dmg = baseDmg * falloff;
                    if (boss.damage) {
                        boss.damage(dmg);
                    }
                }
            }

            // Explosion particles
            if (G.ParticleSystem && G.ParticleSystem.createExplosion) {
                G.ParticleSystem.createExplosion(cx, cy, cfg.particles, '#2288ff');
            }

            // Screen shake
            if (typeof window.shake !== 'undefined') {
                window.shake = Math.max(window.shake || 0, cfg.shake);
            }

            // Audio
            if (G.Audio && G.Audio.play) {
                G.Audio.play('explosion');
            }

            return { damaged };
        },

        // ========== DEBUG HITBOX OVERLAY ==========

        /**
         * Draw collision circles for all active bullets and entities
         * Toggle: G.BulletSystem.debugEnabled or dbg.hitboxes()
         */
        drawDebugOverlay(ctx, playerBullets, enemyBullets, enemies, player, boss) {
            if (!this.debugEnabled) return;

            const Balance = G.Balance;
            const cfg = Balance?.BULLET_CONFIG;
            if (!cfg) return;

            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.lineWidth = 1;

            // Player bullets (magenta circles / cyan beam lines)
            if (playerBullets) {
                const beamCfg = G.Balance?.ELEMENTAL?.LASER?.BEAM;
                ctx.strokeStyle = '#ff00ff';
                for (let i = 0; i < playerBullets.length; i++) {
                    const b = playerBullets[i];
                    if (!b || b.markedForDeletion) continue;

                    // Laser beam: draw collision segment (cyan line)
                    if (b._elemLaser && !b.special && beamCfg?.ENABLED) {
                        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1;
                        const ndx = b.vx / speed;
                        const ndy = b.vy / speed;
                        const tailX = b.x - ndx * beamCfg.LENGTH;
                        const tailY = b.y - ndy * beamCfg.LENGTH;
                        ctx.strokeStyle = '#00ffff';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(b.x, b.y);
                        ctx.lineTo(tailX, tailY);
                        ctx.stroke();
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = '#ff00ff';
                        continue;
                    }

                    const r = b.collisionRadius || 4;
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
                    ctx.stroke();

                    // Velocity vector (green line)
                    ctx.strokeStyle = '#00ff00';
                    ctx.beginPath();
                    ctx.moveTo(b.x, b.y);
                    ctx.lineTo(b.x + b.vx * 0.03, b.y + b.vy * 0.03);
                    ctx.stroke();
                    ctx.strokeStyle = '#ff00ff';

                    // Missile AoE radius (dashed circle)
                    if (b.isMissile && b.aoeRadius > 0) {
                        ctx.setLineDash([4, 4]);
                        ctx.strokeStyle = '#ff4444';
                        ctx.beginPath();
                        ctx.arc(b.x, b.y, b.aoeRadius, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.setLineDash([]);
                        ctx.strokeStyle = '#ff00ff';
                    }
                }
            }

            // Enemy bullets (red circles)
            if (enemyBullets) {
                ctx.strokeStyle = '#ff3333';
                for (let i = 0; i < enemyBullets.length; i++) {
                    const eb = enemyBullets[i];
                    if (!eb || eb.markedForDeletion) continue;
                    const r = eb.collisionRadius || cfg.ENEMY_DEFAULT.collisionRadius;
                    ctx.beginPath();
                    ctx.arc(eb.x, eb.y, r, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            // Enemies (green circles)
            if (enemies) {
                ctx.strokeStyle = '#00ff00';
                const eR = cfg.ENEMY_HITBOX_RADIUS;
                for (let i = 0; i < enemies.length; i++) {
                    const e = enemies[i];
                    if (!e || e.markedForDeletion) continue;
                    ctx.beginPath();
                    ctx.arc(e.x, e.y, eR, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            // Player hitboxes (yellow core, cyan graze)
            if (player && !player.markedForDeletion) {
                const coreR = player.getCoreHitboxSize ? player.getCoreHitboxSize() : (player.stats?.coreHitboxSize || cfg.PLAYER_CORE_RADIUS);
                const grazeR = coreR + (Balance?.GRAZE?.RADIUS || 25);

                // Graze zone (cyan, dashed)
                ctx.strokeStyle = '#00ffff';
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.arc(player.x, player.y, grazeR, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

                // Core hitbox (yellow, solid)
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(player.x, player.y, coreR, 0, Math.PI * 2);
                ctx.stroke();
                ctx.lineWidth = 1;
            }

            // Boss hitbox (orange rect)
            if (boss && boss.active) {
                ctx.strokeStyle = '#ff8800';
                ctx.lineWidth = 2;
                ctx.strokeRect(boss.x, boss.y, boss.width || 160, boss.height || 140);
                ctx.lineWidth = 1;
            }

            // Legend (top-left, small)
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#000';
            ctx.fillRect(200, 100, 140, 82);
            ctx.font = '9px monospace';
            ctx.fillStyle = '#ff00ff'; ctx.fillText('magenta = player bullet', 204, 112);
            ctx.fillStyle = '#ff3333'; ctx.fillText('red = enemy bullet', 204, 124);
            ctx.fillStyle = '#00ff00'; ctx.fillText('green = enemy hitbox', 204, 136);
            ctx.fillStyle = '#ffff00'; ctx.fillText('yellow = player core', 204, 148);
            ctx.fillStyle = '#00ffff'; ctx.fillText('cyan = graze/beam seg', 204, 160);
            ctx.fillStyle = '#ff8800'; ctx.fillText('orange = boss hitbox', 204, 172);

            ctx.restore();
        }
    };
})();
