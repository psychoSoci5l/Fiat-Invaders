// CollisionSystem.js — Collision detection loops extracted from main.js
// v4.28.0: Decomposition Step 1
// Handles iteration + detection; side effects stay in main.js via callbacks

window.Game = window.Game || {};

(function() {
    const G = window.Game;
    const Balance = G.Balance;

    const CollisionSystem = {
        // Context object — set once via init()
        _ctx: null,
        _enemyGrid: null,
        _ebGrid: null,

        /**
         * Initialize with game context.
         * @param {Object} ctx
         *   player, getBullets, getEnemyBullets, getEnemies,
         *   getBoss, getMiniBoss, getState, callbacks
         */
        init(ctx) {
            this._ctx = ctx;
        },

        /**
         * Build spatial grids for current frame.
         * Call once per frame before collision checks.
         */
        buildGrids() {
            const grid = G.SpatialGrid;
            if (!grid) return;

            const ctx = this._ctx;
            if (!ctx) return;

            // Enemy grid (for player bullets vs enemies)
            grid.clear();
            const enemies = ctx.getEnemies();
            for (let i = 0; i < enemies.length; i++) {
                const e = enemies[i];
                if (e && !e.isEntering && e.hasSettled) grid.insert(e);
            }
            this._enemyGrid = true;

            // Enemy bullet grid (for bullet cancellation)
            if (!this._ebGridObj) this._ebGridObj = { cellSize: 80, cells: new Map() };
            this._ebGridObj.cells.clear();
            const enemyBullets = ctx.getEnemyBullets();
            for (let i = 0; i < enemyBullets.length; i++) {
                const eb = enemyBullets[i];
                if (eb && !eb.markedForDeletion) {
                    const cx = Math.floor(eb.x / 80);
                    const cy = Math.floor(eb.y / 80);
                    const key = (cx << 16) | (cy & 0xFFFF);
                    let cell = this._ebGridObj.cells.get(key);
                    if (!cell) { cell = []; this._ebGridObj.cells.set(key, cell); }
                    cell.push(eb);
                }
            }
            this._ebGrid = true;
        },

        // ─── Enemy Bullets vs Player ───────────────────────────────
        // Core hitbox for damage + graze zone for near-misses
        // Returns early if player dies (HYPER instant death or HP=0)
        processEnemyBulletsVsPlayer(dt) {
            const ctx = this._ctx;
            if (!ctx) return;

            const player = ctx.player;
            const enemyBullets = ctx.getEnemyBullets();
            const cb = ctx.callbacks;
            const state = ctx.getState();

            const coreR = player.getCoreHitboxSize ? player.getCoreHitboxSize() : (player.stats.coreHitboxSize || 6);
            const grazeR = coreR + Balance.GRAZE.RADIUS;
            const closeGrazeR = coreR + Balance.GRAZE.CLOSE_RADIUS;

            for (let i = enemyBullets.length - 1; i >= 0; i--) {
                const eb = enemyBullets[i];
                if (!eb) { enemyBullets.splice(i, 1); continue; }
                eb.update(dt);
                if (eb.markedForDeletion) {
                    G.Bullet.Pool.release(eb);
                    enemyBullets.splice(i, 1);
                    continue;
                }

                const ebR = eb.collisionRadius || Balance.BULLET_CONFIG.ENEMY_DEFAULT.collisionRadius;

                // Core hit check (take damage)
                if (G.BulletSystem.circleCollide(eb.x, eb.y, ebR, player.x, player.y, coreR)) {
                    // HYPER instant death
                    if (player.isHyperActive && player.isHyperActive()) {
                        cb.onPlayerHyperDeath(eb, i, enemyBullets);
                        return; // Exit — player is dead
                    }
                    // Normal hit
                    if (player.takeDamage()) {
                        cb.onPlayerHit(eb, i, enemyBullets);
                        if (player.hp <= 0) return; // Player died
                    }
                }
                // Graze zone (but not core) — award graze points
                else if (G.BulletSystem.circleCollide(eb.x, eb.y, ebR, player.x, player.y, grazeR) && !eb.grazed) {
                    eb.grazed = true;
                    const isCloseGraze = G.BulletSystem.circleCollide(eb.x, eb.y, ebR, player.x, player.y, closeGrazeR);
                    const isHyperActive = player.isHyperActive && player.isHyperActive();
                    cb.onGraze(eb, isCloseGraze, isHyperActive);
                }
            }
        },

        // ─── Player Bullets vs Boss ────────────────────────────────
        // Returns true if boss was killed (to skip further checks)
        processPlayerBulletVsBoss(bullet, bIdx, bullets) {
            const ctx = this._ctx;
            if (!ctx) return false;

            const boss = ctx.getBoss();
            if (!boss || !boss.active) return false;

            // AABB check (boss uses rect hitbox)
            if (bullet.x > boss.x && bullet.x < boss.x + boss.width &&
                bullet.y > boss.y && bullet.y < boss.y + boss.height) {

                const cb = ctx.callbacks;
                const player = ctx.player;
                const runState = G.RunState;

                const bossDivisor = G.Balance?.BOSS?.DMG_DIVISOR || 4;
                const baseBossDmg = Math.ceil((player.stats.baseDamage ?? 14) * (bullet.damageMult || 1) / bossDivisor);
                let dmg = baseBossDmg;

                boss.damage(dmg);
                cb.onBossHit(bullet, dmg, boss, bIdx, bullets);

                if (!bullet.penetration) {
                    bullet.markedForDeletion = true;
                    G.Bullet.Pool.release(bullet);
                    bullets.splice(bIdx, 1);
                } else {
                    // v5.0.8: Pierce decay on boss hit too
                    const pd = Balance.WEAPON_EVOLUTION?.PIERCE_DECAY;
                    if (pd) {
                        bullet._pierceCount = (bullet._pierceCount || 0) + 1;
                        bullet.damageMult *= pd.DAMAGE_MULT;
                        if (bullet._pierceCount >= pd.MAX_ENEMIES) {
                            bullet.markedForDeletion = true;
                            G.Bullet.Pool.release(bullet);
                            bullets.splice(bIdx, 1);
                        }
                    }
                }

                if (boss.hp <= 0) {
                    cb.onBossDeath(boss);
                    return true; // Boss killed
                }
                return true; // Hit but not killed
            }
            return false; // No hit
        },

        // ─── Player Bullets vs Enemies ─────────────────────────────
        // Iterates enemy array and checks circle collision
        // Uses spatial grid when available for O(1) lookups
        processPlayerBulletVsEnemy(bullet, bIdx, bullets) {
            const ctx = this._ctx;
            if (!ctx) return;

            const enemies = ctx.getEnemies();
            const cb = ctx.callbacks;
            const player = ctx.player;
            const runState = G.RunState;

            // Use spatial grid for narrow-phase candidates if available
            const grid = G.SpatialGrid;
            const hitR = Balance.BULLET_CONFIG.ENEMY_HITBOX_RADIUS || 29;
            const queryR = hitR + (bullet.collisionRadius || 4) + 10;
            const candidates = (grid && this._enemyGrid) ? grid.query(bullet.x, bullet.y, queryR) : enemies;

            // v5.3: Laser beam line-segment collision
            const beamCfg = Balance.ELEMENTAL?.LASER?.BEAM;
            const isBeam = bullet._elemLaser && !bullet.special && beamCfg?.ENABLED;
            let beamTailX, beamTailY;
            if (isBeam) {
                const spd = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy) || 1;
                beamTailX = bullet.x - (bullet.vx / spd) * beamCfg.LENGTH;
                beamTailY = bullet.y - (bullet.vy / spd) * beamCfg.LENGTH;
            }

            for (let j = candidates.length - 1; j >= 0; j--) {
                const e = candidates[j];
                if (!e) continue;
                if (e.isEntering || !e.hasSettled) continue;

                const eR = Balance.BULLET_CONFIG.ENEMY_HITBOX_RADIUS;
                const hit = isBeam
                    ? G.BulletSystem.lineSegmentVsCircle(bullet.x, bullet.y, beamTailX, beamTailY, e.x, e.y, eR)
                    : G.BulletSystem.bulletHitsEntity(bullet, e, eR);
                if (hit) {
                    const baseDmg = player.stats.baseDamage ?? 14;
                    let dmg = baseDmg;

                    if (bullet.damageMult && bullet.damageMult > 1) dmg *= bullet.damageMult;
                    if (player.getSmartContractMult) dmg *= player.getSmartContractMult(e);

                    const shouldDie = e.takeDamage(dmg);
                    cb.onEnemyHit(e, bullet, shouldDie);

                    // v5.13: Laser beam impact VFX
                    if (isBeam && G.ParticleSystem?.createLaserBeamImpact) {
                        const bAngle = Math.atan2(bullet.vy, bullet.vx);
                        G.ParticleSystem.createLaserBeamImpact(e.x, e.y, bAngle);
                    }

                    if (shouldDie) {
                        const eIdx = enemies.indexOf(e);
                        if (eIdx >= 0) enemies.splice(eIdx, 1);
                        cb.onEnemyKilled(e, bullet, eIdx, enemies);

                        // v4.60: Elemental effects on kill
                        if (bullet._elemFire || bullet._elemElectric) {
                            this._applyElementalOnKill(e, bullet, dmg, enemies);
                        }
                    }

                    // Missile AoE
                    if (bullet.isMissile && bullet.aoeRadius > 0) {
                        G.BulletSystem.handleMissileExplosion(bullet, enemies, ctx.getBoss());
                    }

                    if (!bullet.penetration) {
                        bullet.markedForDeletion = true;
                        G.Bullet.Pool.release(bullet);
                        bullets.splice(bIdx, 1);
                        return; // Non-penetrating stops
                    }
                    // v5.13: Laser pierce-through flash
                    if (isBeam && G.ParticleSystem?.createLaserPierceFlash) {
                        G.ParticleSystem.createLaserPierceFlash(e.x, e.y);
                    }
                    // v5.0.8: Pierce decay — reduce damage after each enemy pierced
                    const pd = Balance.WEAPON_EVOLUTION?.PIERCE_DECAY;
                    if (pd) {
                        bullet._pierceCount = (bullet._pierceCount || 0) + 1;
                        bullet.damageMult *= pd.DAMAGE_MULT;
                        if (bullet._pierceCount >= pd.MAX_ENEMIES) {
                            bullet.markedForDeletion = true;
                            G.Bullet.Pool.release(bullet);
                            bullets.splice(bIdx, 1);
                            return;
                        }
                    }
                }
            }
        },

        // ─── Bullet Cancellation ───────────────────────────────────
        // Player bullets cancel enemy bullets on contact
        // Uses spatial grid when available
        processBulletCancellation() {
            const ctx = this._ctx;
            if (!ctx) return;

            const bullets = ctx.getBullets();
            const enemyBullets = ctx.getEnemyBullets();
            const cb = ctx.callbacks;

            if (bullets.length === 0 || enemyBullets.length === 0) return;

            const useGrid = this._ebGrid && this._ebGridObj;

            const beamCfg = Balance.ELEMENTAL?.LASER?.BEAM;

            for (let i = bullets.length - 1; i >= 0; i--) {
                const b = bullets[i];
                if (!b || b.markedForDeletion) continue;
                const bR = b.collisionRadius || 4;

                // v5.3: Beam bullets use line-segment collision for cancellation
                const isBeam = b._elemLaser && !b.special && beamCfg?.ENABLED;
                let beamTailX, beamTailY;
                if (isBeam) {
                    const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1;
                    beamTailX = b.x - (b.vx / spd) * beamCfg.LENGTH;
                    beamTailY = b.y - (b.vy / spd) * beamCfg.LENGTH;
                }

                if (useGrid) {
                    // Grid-accelerated: query nearby enemy bullets
                    const queryR = isBeam ? (beamCfg.LENGTH + 10) : (bR + (Balance.BULLET_CONFIG.ENEMY_DEFAULT.collisionRadius || 6) + 10);
                    const minCx = Math.floor((b.x - queryR) / 80);
                    const maxCx = Math.floor((b.x + queryR) / 80);
                    const minCy = Math.floor((b.y - queryR) / 80);
                    const maxCy = Math.floor((b.y + queryR) / 80);

                    for (let cx = minCx; cx <= maxCx; cx++) {
                        for (let cy = minCy; cy <= maxCy; cy++) {
                            const key = (cx << 16) | (cy & 0xFFFF);
                            const cell = this._ebGridObj.cells.get(key);
                            if (!cell) continue;
                            for (let k = cell.length - 1; k >= 0; k--) {
                                const eb = cell[k];
                                if (!eb || eb.markedForDeletion) continue;
                                const ebR = eb.collisionRadius || Balance.BULLET_CONFIG.ENEMY_DEFAULT.collisionRadius;
                                const cancelHit = isBeam
                                    ? G.BulletSystem.lineSegmentVsCircle(b.x, b.y, beamTailX, beamTailY, eb.x, eb.y, ebR)
                                    : G.BulletSystem.circleCollide(b.x, b.y, bR, eb.x, eb.y, ebR);
                                if (cancelHit) {
                                    // Find original index for callback
                                    const j = enemyBullets.indexOf(eb);
                                    if (j >= 0) cb.onBulletCancel(b, eb, i, j, bullets, enemyBullets);
                                    if (b.markedForDeletion) break;
                                }
                            }
                            if (b.markedForDeletion) break;
                        }
                        if (b.markedForDeletion) break;
                    }
                } else {
                    // Fallback: original O(n*m) loop
                    for (let j = enemyBullets.length - 1; j >= 0; j--) {
                        const eb = enemyBullets[j];
                        if (!eb || eb.markedForDeletion) continue;
                        const ebR = eb.collisionRadius || Balance.BULLET_CONFIG.ENEMY_DEFAULT.collisionRadius;

                        const cancelHit = isBeam
                            ? G.BulletSystem.lineSegmentVsCircle(b.x, b.y, beamTailX, beamTailY, eb.x, eb.y, ebR)
                            : G.BulletSystem.circleCollide(b.x, b.y, bR, eb.x, eb.y, ebR);
                        if (cancelHit) {
                            cb.onBulletCancel(b, eb, i, j, bullets, enemyBullets);
                            if (b.markedForDeletion) break;
                        }
                    }
                }
            }
        }
    };

    // ─── v4.60: Elemental on-kill effects ─────────────────────────
    CollisionSystem._applyElementalOnKill = function(deadEnemy, bullet, killDmg, enemies, depth) {
        const elCfg = Balance.ELEMENTAL;
        if (!elCfg) return;

        // v5.0.7: Contagion — cascade depth check
        depth = depth || 0;
        const conCfg = elCfg.CONTAGION;
        const perkLvl = G.RunState ? G.RunState.perkLevel : 0;
        const maxDepth = (conCfg?.ENABLED && perkLvl > 0)
            ? (conCfg.MAX_DEPTH[Math.min(perkLvl, conCfg.MAX_DEPTH.length) - 1] || 0)
            : 0;
        const damageDecay = conCfg?.DAMAGE_DECAY || 0.5;

        // Fire: splash damage to nearby enemies
        if (bullet._elemFire) {
            const fireCfg = elCfg.FIRE;
            const splashR = fireCfg?.SPLASH_RADIUS || 40;
            const splashDmg = killDmg * (fireCfg?.SPLASH_DAMAGE || 0.30);
            for (let i = enemies.length - 1; i >= 0; i--) {
                const en = enemies[i];
                if (!en || en.markedForDeletion) continue;
                const dx = en.x - deadEnemy.x;
                const dy = en.y - deadEnemy.y;
                if (dx * dx + dy * dy <= splashR * splashR) {
                    const died = en.takeDamage(splashDmg);
                    if (G.Debug) G.Debug.trackContagion('fire', depth, splashDmg, died);
                    if (died) {
                        enemies.splice(i, 1);
                        if (this._ctx && this._ctx.callbacks && this._ctx.callbacks.onEnemyKilled) {
                            this._ctx.callbacks.onEnemyKilled(en, bullet, i, enemies);
                        }
                        // v5.0.7: Contagion cascade
                        if (depth < maxDepth) {
                            const decayedDmg = splashDmg * damageDecay;
                            this._applyElementalOnKill(en, bullet, decayedDmg, enemies, depth + 1);
                        }
                    }
                    // v5.13: Napalm impact (fallback to fire impact if disabled)
                    if (G.ParticleSystem) {
                        if (G.ParticleSystem.createNapalmImpact) {
                            G.ParticleSystem.createNapalmImpact(en.x, en.y);
                        } else if (G.ParticleSystem.createFireImpact) {
                            G.ParticleSystem.createFireImpact(en.x, en.y);
                        }
                    }
                    // v5.13: Contagion cascade VFX (line from source to splash target)
                    if (depth > 0 && G.ParticleSystem?.addCanvasEffect) {
                        const cvfx = G.Balance?.ELEMENTAL?.CONTAGION_VFX;
                        if (cvfx?.ENABLED) {
                            G.ParticleSystem.addCanvasEffect({
                                type: 'contagion_line', timer: cvfx.LINE_DURATION, maxTimer: cvfx.LINE_DURATION,
                                x1: deadEnemy.x, y1: deadEnemy.y, x2: en.x, y2: en.y,
                                color: cvfx.COLORS.FIRE, width: cvfx.LINE_WIDTH
                            });
                            G.ParticleSystem.addCanvasEffect({
                                type: 'ripple', timer: cvfx.RIPPLE_DURATION, maxTimer: cvfx.RIPPLE_DURATION,
                                x: en.x, y: en.y, color: cvfx.COLORS.FIRE, radius: cvfx.RIPPLE_RADIUS
                            });
                        }
                    }
                }
            }
        }

        // Electric: chain damage to 1-2 nearest enemies
        if (bullet._elemElectric) {
            const elecCfg = elCfg.ELECTRIC;
            const chainR = elecCfg?.CHAIN_RADIUS || 80;
            const chainDmg = killDmg * (elecCfg?.CHAIN_DAMAGE || 0.20);
            const maxTargets = elecCfg?.CHAIN_TARGETS || 2;

            // Find nearest N enemies within radius
            const targets = [];
            for (let i = 0; i < enemies.length; i++) {
                const en = enemies[i];
                if (!en || en.markedForDeletion) continue;
                const dx = en.x - deadEnemy.x;
                const dy = en.y - deadEnemy.y;
                const distSq = dx * dx + dy * dy;
                if (distSq <= chainR * chainR) {
                    targets.push({ enemy: en, distSq });
                }
            }
            targets.sort((a, b) => a.distSq - b.distSq);

            for (let t = 0; t < Math.min(maxTargets, targets.length); t++) {
                const tgt = targets[t];
                const died = tgt.enemy.takeDamage(chainDmg);
                if (G.Debug) G.Debug.trackContagion('electric', depth, chainDmg, died);
                if (died) {
                    const idx = enemies.indexOf(tgt.enemy);
                    if (idx >= 0) enemies.splice(idx, 1);
                    if (this._ctx && this._ctx.callbacks && this._ctx.callbacks.onEnemyKilled) {
                        this._ctx.callbacks.onEnemyKilled(tgt.enemy, bullet, idx, enemies);
                    }
                    // v5.0.7: Contagion cascade
                    if (depth < maxDepth) {
                        const decayedDmg = chainDmg * damageDecay;
                        this._applyElementalOnKill(tgt.enemy, bullet, decayedDmg, enemies, depth + 1);
                    }
                }
                // v5.13: Lightning bolt (fallback to electric chain if disabled)
                if (G.ParticleSystem) {
                    if (G.ParticleSystem.createLightningBolt) {
                        G.ParticleSystem.createLightningBolt(deadEnemy.x, deadEnemy.y, tgt.enemy.x, tgt.enemy.y);
                    } else if (G.ParticleSystem.createElectricChain) {
                        G.ParticleSystem.createElectricChain(deadEnemy.x, deadEnemy.y, tgt.enemy.x, tgt.enemy.y);
                    }
                }
                // v5.13: Contagion cascade VFX (line + ripple)
                if (depth > 0 && G.ParticleSystem?.addCanvasEffect) {
                    const cvfx = G.Balance?.ELEMENTAL?.CONTAGION_VFX;
                    if (cvfx?.ENABLED) {
                        G.ParticleSystem.addCanvasEffect({
                            type: 'contagion_line', timer: cvfx.LINE_DURATION, maxTimer: cvfx.LINE_DURATION,
                            x1: deadEnemy.x, y1: deadEnemy.y, x2: tgt.enemy.x, y2: tgt.enemy.y,
                            color: cvfx.COLORS.ELECTRIC, width: cvfx.LINE_WIDTH
                        });
                        G.ParticleSystem.addCanvasEffect({
                            type: 'ripple', timer: cvfx.RIPPLE_DURATION, maxTimer: cvfx.RIPPLE_DURATION,
                            x: tgt.enemy.x, y: tgt.enemy.y, color: cvfx.COLORS.ELECTRIC, radius: cvfx.RIPPLE_RADIUS
                        });
                    }
                }
            }
        }
    };

    G.CollisionSystem = CollisionSystem;
})();
