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

        /**
         * Initialize with game context.
         * @param {Object} ctx
         *   player, getBullets, getEnemyBullets, getEnemies,
         *   getBoss, getMiniBoss, getState, callbacks
         */
        init(ctx) {
            this._ctx = ctx;
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

                // SACRIFICE MODE: total invincibility
                if (state.sacrificeState === 'ACTIVE') continue;

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

                const baseBossDmg = Math.ceil((player.stats.baseDamage || 14) / 4);
                const dmgMult = (runState && runState.getMod) ? runState.getMod('damageMult', 1) : 1;
                let dmg = baseBossDmg * dmgMult;
                if (bullet.isHodl) dmg = Math.ceil(dmg * Balance.SCORE.HODL_MULT_BOSS);
                if (runState && runState.flags && runState.flags.hodlBonus && bullet.isHodl) dmg = Math.ceil(dmg * 1.15);

                boss.damage(dmg);
                cb.onBossHit(bullet, dmg, boss, bIdx, bullets);

                if (!bullet.penetration) {
                    bullet.markedForDeletion = true;
                    G.Bullet.Pool.release(bullet);
                    bullets.splice(bIdx, 1);
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
        processPlayerBulletVsEnemy(bullet, bIdx, bullets) {
            const ctx = this._ctx;
            if (!ctx) return;

            const enemies = ctx.getEnemies();
            const cb = ctx.callbacks;
            const player = ctx.player;
            const runState = G.RunState;

            for (let j = enemies.length - 1; j >= 0; j--) {
                const e = enemies[j];
                if (!e) continue;
                if (e.isEntering || !e.hasSettled) continue;

                if (G.BulletSystem.bulletHitsEntity(bullet, e, Balance.BULLET_CONFIG.ENEMY_HITBOX_RADIUS)) {
                    const baseDmg = player.stats.baseDamage || 14;
                    const dmgMult = (runState && runState.getMod) ? runState.getMod('damageMult', 1) : 1;
                    let dmg = baseDmg * dmgMult;

                    if (bullet.damageMult && bullet.damageMult > 1) dmg *= bullet.damageMult;
                    if (bullet.isHodl) dmg *= Balance.SCORE.HODL_MULT_ENEMY;
                    if (runState && runState.flags && runState.flags.hodlBonus && bullet.isHodl) dmg *= 1.15;
                    if (player.getSmartContractMult) dmg *= player.getSmartContractMult(e);

                    const shouldDie = e.takeDamage(dmg);
                    cb.onEnemyHit(e, bullet, shouldDie);

                    if (shouldDie) {
                        enemies.splice(j, 1);
                        cb.onEnemyKilled(e, bullet, j, enemies);
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
                    // Penetrating bullets continue
                }
            }
        },

        // ─── Bullet Cancellation ───────────────────────────────────
        // Player bullets cancel enemy bullets on contact
        processBulletCancellation() {
            const ctx = this._ctx;
            if (!ctx) return;

            const bullets = ctx.getBullets();
            const enemyBullets = ctx.getEnemyBullets();
            const cb = ctx.callbacks;

            if (bullets.length === 0 || enemyBullets.length === 0) return;

            for (let i = bullets.length - 1; i >= 0; i--) {
                const b = bullets[i];
                if (!b || b.markedForDeletion) continue;
                const bR = b.collisionRadius || 4;

                for (let j = enemyBullets.length - 1; j >= 0; j--) {
                    const eb = enemyBullets[j];
                    if (!eb || eb.markedForDeletion) continue;
                    const ebR = eb.collisionRadius || Balance.BULLET_CONFIG.ENEMY_DEFAULT.collisionRadius;

                    if (G.BulletSystem.circleCollide(b.x, b.y, bR, eb.x, eb.y, ebR)) {
                        cb.onBulletCancel(b, eb, i, j, bullets, enemyBullets);
                        // Pierce: if bullet still alive, continue hitting more enemy bullets
                        if (b.markedForDeletion) break;
                    }
                }
            }
        }
    };

    G.CollisionSystem = CollisionSystem;
})();
