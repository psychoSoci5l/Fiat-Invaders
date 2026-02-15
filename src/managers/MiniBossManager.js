/**
 * MiniBossManager.js — Mini-boss spawn, update, draw, hit detection
 * Extracted from main.js (v4.49 refactor)
 */
(function () {
    'use strict';
    const G = window.Game;
    const Balance = G.Balance;

    let miniBoss = null;
    let _deps = {};

    function init(deps) {
        _deps = deps || {};
    }

    function get() { return miniBoss; }
    function isActive() { return miniBoss && miniBoss.active; }

    function spawn(bossTypeOrSymbol, triggerColor) {
        const { gameWidth, gameHeight, level, marketCycle, runState,
                player, waveMgr, enemies: getEnemies, setEnemies,
                enemyBullets: getEnemyBullets, setEnemyBullets,
                applyHitStop, showDanger, canSpawnEnemyBullet } = _deps;

        applyHitStop('BOSS_DEFEAT_SLOWMO', false);

        // Clear all bullets (player + enemy) with VFX + score bonus
        if (G.clearBattlefield) {
            G.clearBattlefield();
        } else {
            // Fallback: manual clear without VFX
            const eb = getEnemyBullets();
            eb.forEach(b => { b.markedForDeletion = true; G.Bullet.Pool.release(b); });
            setEnemyBullets([]);
        }

        // Save and clear enemies
        const savedEnemies = [...getEnemies()];
        setEnemies([]);

        if (waveMgr) waveMgr.miniBossActive = true;
        if (G.HarmonicConductor) G.HarmonicConductor.enemies = getEnemies();

        const validBossTypes = ['FEDERAL_RESERVE', 'BCE', 'BOJ'];
        const isBossType = validBossTypes.includes(bossTypeOrSymbol);

        if (isBossType) {
            const bossType = bossTypeOrSymbol;
            const bossConfig = G.BOSSES[bossType] || G.BOSSES.FEDERAL_RESERVE;

            miniBoss = new G.Boss(gameWidth(), gameHeight(), bossType);
            window.miniBoss = miniBoss;
            miniBoss.isMiniBoss = true;
            miniBoss.savedEnemies = savedEnemies;
            miniBoss.triggerColor = triggerColor;

            const perkCount = (runState() && runState().perks) ? runState().perks.length : 0;
            const perkScaling = 1 + (perkCount * Balance.BOSS.HP.PERK_SCALE);
            const fullBossHp = Balance.calculateBossHP(level(), marketCycle());
            const _arcadeMB = (G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode() && Balance.ARCADE) ? Balance.ARCADE.MINI_BOSS : null;
            const hpMult = _arcadeMB ? (_arcadeMB.HP_MULT || 0.50) : 0.6;
            const miniBossHp = Math.floor(fullBossHp * hpMult * perkScaling);
            miniBoss.hp = miniBossHp;
            miniBoss.maxHp = miniBossHp;

            const signatureMeme = G.BOSS_SIGNATURE_MEMES?.[bossType];
            showDanger(bossConfig.name + ' ' + _deps.t('APPEARS'));
            if (signatureMeme) {
                G.MemeEngine.queueMeme('MINI_BOSS_SPAWN', signatureMeme, bossConfig.name);
            }
        } else {
            const symbol = bossTypeOrSymbol;
            const color = triggerColor;
            const fiatNames = { '¥': 'YEN', '€': 'EURO', '£': 'POUND', '$': 'DOLLAR', '₽': 'RUBLE', '₹': 'RUPEE', '₣': 'FRANC', '₺': 'LIRA', '元': 'YUAN', 'Ⓒ': 'CBDC' };

            const baseHp = 400;
            const hpPerLevel = 100;
            const hpPerCycle = 150;
            const perkCount = (runState() && runState().perks) ? runState().perks.length : 0;
            const perkScaling = 1 + (perkCount * 0.10);
            const rawHp = baseHp + (level() * hpPerLevel) + (marketCycle() * hpPerCycle);
            const scaledHp = Math.floor(rawHp * perkScaling);

            miniBoss = {
                x: gameWidth() / 2,
                y: 150,
                targetY: 180,
                width: 120,
                height: 120,
                hp: scaledHp,
                maxHp: scaledHp,
                symbol: symbol,
                color: color,
                name: fiatNames[symbol] || 'FIAT',
                fireTimer: 0,
                fireRate: 0.8,
                phase: 0,
                phaseTimer: 0,
                savedEnemies: savedEnemies,
                animTime: 0,
                active: true
            };
            window.miniBoss = miniBoss;

            showDanger(miniBoss.name + ' ' + _deps.t('REVENGE'));
            G.MemeEngine.queueMeme('MINI_BOSS_SPAWN', _deps.getFiatDeathMeme(), miniBoss.name);
        }

        G.Audio.play('bossSpawn');
    }

    function update(dt) {
        if (!miniBoss || !miniBoss.active) return;

        const { player, canSpawnEnemyBullet, gameWidth } = _deps;
        const getEB = _deps.enemyBullets;
        const pl = player();

        if (miniBoss instanceof G.Boss) {
            const attackBullets = miniBoss.update(dt, pl);
            if (attackBullets && attackBullets.length > 0) {
                const eb = getEB();
                for (const bd of attackBullets) {
                    if (!canSpawnEnemyBullet()) break;
                    const bullet = G.Bullet.Pool.acquire(bd.x, bd.y, bd.vx, bd.vy, bd.color, bd.w, bd.h, false);
                    if (bd.isHoming) {
                        bullet.isHoming = true;
                        bullet.homingStrength = bd.homingStrength || 2.5;
                        bullet.targetX = pl.x;
                        bullet.targetY = pl.y;
                        bullet.maxSpeed = bd.maxSpeed || 200;
                    }
                    eb.push(bullet);
                }
            }
            return;
        }

        // Legacy mini-boss update
        miniBoss.animTime += dt;
        if (miniBoss.y < miniBoss.targetY) miniBoss.y += 60 * dt;
        miniBoss.x = gameWidth() / 2 + Math.sin(miniBoss.animTime * 1.5) * 150;

        miniBoss.fireTimer -= dt;
        if (miniBoss.fireTimer <= 0) {
            miniBoss.fireTimer = miniBoss.fireRate - (miniBoss.hp / miniBoss.maxHp) * 0.3;
            _fireBullets();
        }

        const hpPct = miniBoss.hp / miniBoss.maxHp;
        if (hpPct < 0.3 && miniBoss.phase < 2) {
            miniBoss.phase = 2;
            miniBoss.fireRate = 0.4;
            _deps.setShake(15);
        } else if (hpPct < 0.6 && miniBoss.phase < 1) {
            miniBoss.phase = 1;
            miniBoss.fireRate = 0.6;
        }
    }

    function _fireBullets() {
        if (!miniBoss) return;
        const { player, canSpawnEnemyBullet, enemyBullets: getEB } = _deps;
        if (!canSpawnEnemyBullet()) return;
        const pl = player();
        const eb = getEB();
        const bulletSpeed = 170 + (miniBoss.phase * 42);

        if (miniBoss.phase === 0) {
            const dx = pl.x - miniBoss.x;
            const dy = pl.y - miniBoss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const vx = (dx / dist) * bulletSpeed;
            const vy = (dy / dist) * bulletSpeed;
            eb.push(G.Bullet.Pool.acquire(miniBoss.x, miniBoss.y + 60, vx, vy, miniBoss.color, 8, 8, false));
        } else if (miniBoss.phase === 1) {
            for (let angle = -0.3; angle <= 0.3; angle += 0.3) {
                if (!canSpawnEnemyBullet()) break;
                const dx = pl.x - miniBoss.x;
                const dy = pl.y - miniBoss.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const baseAngle = Math.atan2(dy, dx) + angle;
                const vx = Math.cos(baseAngle) * bulletSpeed;
                const vy = Math.sin(baseAngle) * bulletSpeed;
                eb.push(G.Bullet.Pool.acquire(miniBoss.x, miniBoss.y + 60, vx, vy, miniBoss.color, 8, 8, false));
            }
        } else {
            for (let i = 0; i < 8; i++) {
                if (!canSpawnEnemyBullet()) break;
                const angle = (Math.PI * 2 / 8) * i + miniBoss.animTime;
                const vx = Math.cos(angle) * bulletSpeed * 0.8;
                const vy = Math.sin(angle) * bulletSpeed * 0.8;
                eb.push(G.Bullet.Pool.acquire(miniBoss.x, miniBoss.y + 40, vx, vy, miniBoss.color, 6, 6, false));
            }
        }
        G.Audio.play('enemyShoot');
    }

    function draw(ctx) {
        if (!miniBoss || !miniBoss.active) return;

        if (miniBoss instanceof G.Boss) {
            miniBoss.draw(ctx);
            return;
        }

        ctx.save();
        ctx.translate(miniBoss.x, miniBoss.y);

        const pulseAlpha = 0.3 + Math.sin(miniBoss.animTime * 5) * 0.2;
        const hpPct = miniBoss.hp / miniBoss.maxHp;

        ctx.fillStyle = `rgba(${G.ColorUtils.hexToRgb(miniBoss.color)}, ${pulseAlpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, 80 + Math.sin(miniBoss.animTime * 3) * 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = miniBoss.color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
            const x = Math.cos(angle) * 55;
            const y = Math.sin(angle) * 55;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = miniBoss.color;
        ctx.font = 'bold 50px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(miniBoss.symbol, 0, 0);

        const barWidth = 100;
        const barHeight = 8;
        ctx.fillStyle = '#333';
        ctx.fillRect(-barWidth / 2, 70, barWidth, barHeight);
        ctx.fillStyle = hpPct > 0.3 ? miniBoss.color : '#ff0000';
        ctx.fillRect(-barWidth / 2, 70, barWidth * hpPct, barHeight);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barWidth / 2, 70, barWidth, barHeight);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Courier New';
        ctx.fillText(miniBoss.name + ' BOSS', 0, 90);

        ctx.restore();
    }

    function checkHit(b) {
        if (!miniBoss || !miniBoss.active) return false;
        if (miniBoss.isEntering) return false; // Invulnerable during entrance

        const { player, runState, score: getScore, setScore, marketCycle,
                waveMgr, setEnemies, enemyBullets: getEB, setEnemyBullets,
                showVictory, createEnemyDeathExplosion, createExplosion,
                setShake, totalTime: getTotalTime, setWaveStartTime,
                setBossJustDefeated } = _deps;

        const isBossInstance = miniBoss instanceof G.Boss;
        const hitboxW = isBossInstance ? miniBoss.width / 2 : 44;
        const hitboxH = isBossInstance ? miniBoss.height / 2 : 44;
        const bossX = isBossInstance ? (miniBoss.x + miniBoss.width / 2) : miniBoss.x;
        const bossY = isBossInstance ? (miniBoss.y + miniBoss.height / 2) : miniBoss.y;

        if (Math.abs(b.x - bossX) < hitboxW && Math.abs(b.y - bossY) < hitboxH) {
            const pl = player();
            const rs = runState();
            const baseDmg = pl.stats.baseDamage ?? 14;
            let dmg = baseDmg;

            if (isBossInstance) {
                miniBoss.damage(dmg);
            } else {
                miniBoss.hp -= dmg;
            }
            G.Audio.play('hitEnemy');

            if (miniBoss.hp <= 0) {
                G.Debug.trackMiniBossDefeat(isBossInstance ? miniBoss.bossType : miniBoss.name);

                if (G.Debug._miniBossStartInfo) {
                    const info = G.Debug._miniBossStartInfo;
                    const duration = Date.now() - info.startTime;
                    G.Debug.trackMiniBossFight(info.type, info.trigger, info.killCount, duration);
                    G.Debug._miniBossStartInfo = null;
                }

                // Ghost bullet fix
                const eb = getEB();
                if (eb.length > 0) {
                    G.Debug.log('BULLET', `[MINIBOSS] Cleared ${eb.length} ghost bullets on mini-boss defeat`);
                    eb.forEach(b2 => G.Bullet.Pool.release(b2));
                    eb.length = 0;
                    window.enemyBullets = eb;
                }

                if (G.HarmonicConductor) G.HarmonicConductor.reset();
                setBossJustDefeated(true);

                const bonusScore = isBossInstance ? 3000 * marketCycle() : 2000 * marketCycle();
                const newScore = getScore() + bonusScore;
                setScore(newScore);
                _deps.updateScore(newScore);

                const deathX = isBossInstance ? (miniBoss.x + miniBoss.width / 2) : miniBoss.x;
                const deathY = isBossInstance ? (miniBoss.y + miniBoss.height / 2) : miniBoss.y;
                const deathColor = isBossInstance ? (miniBoss.color || '#ffffff') : miniBoss.color;
                const deathSymbol = isBossInstance ? (miniBoss.symbol || '$') : miniBoss.symbol;
                const deathName = isBossInstance ? (miniBoss.name || 'BOSS') : miniBoss.name;

                createEnemyDeathExplosion(deathX, deathY, deathColor, deathSymbol);
                createExplosion(deathX - 40, deathY - 30, deathColor, 15);
                createExplosion(deathX + 40, deathY + 30, deathColor, 15);
                createExplosion(deathX, deathY, '#fff', 20);

                showVictory(deathName + ' ' + _deps.t('DESTROYED'));
                G.MemeEngine.queueMeme('MINI_BOSS_DEFEATED', isBossInstance ? "CENTRAL BANK REKT!" : "FIAT IS DEAD!", deathName);
                setShake(40);
                G.Audio.play('explosion');

                if (window.Game.applyHitStop) window.Game.applyHitStop('BOSS_DEFEAT_SLOWMO', false);
                if (window.Game.triggerScreenFlash) window.Game.triggerScreenFlash('BOSS_DEFEAT');

                // Restore enemies
                const restored = (miniBoss.savedEnemies && miniBoss.savedEnemies.length > 0)
                    ? miniBoss.savedEnemies : [];
                setEnemies(restored);
                setWaveStartTime(getTotalTime());

                if (G.HarmonicConductor) G.HarmonicConductor.enemies = restored;
                if (waveMgr) waveMgr.miniBossActive = false;

                // Arcade: mini-boss defeat → modifier choice (2-card)
                if (G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode() && G.ModifierChoiceScreen) {
                    const picks = (G.Balance.ARCADE && G.Balance.ARCADE.MODIFIERS && G.Balance.ARCADE.MODIFIERS.POST_MINIBOSS_PICKS) || 2;
                    setTimeout(() => {
                        G.ModifierChoiceScreen.show(picks, () => {
                            const rs = G.RunState;
                            const extraL = rs.arcadeBonuses.extraLives;
                            if (extraL !== 0 && G.adjustLives) {
                                G.adjustLives(extraL);
                                rs.arcadeBonuses.extraLives = 0;
                            }
                        });
                    }, 800);
                }

                miniBoss = null;
                window.miniBoss = null;
            }
            return true;
        }
        return false;
    }

    function clear() {
        if (miniBoss) {
            miniBoss.active = false;
            if (_deps.waveMgr) _deps.waveMgr.miniBossActive = false;
        }
        miniBoss = null;
        window.miniBoss = null;
    }

    function reset() {
        miniBoss = null;
        window.miniBoss = null;
    }

    G.MiniBossManager = {
        init,
        get,
        isActive,
        spawn,
        update,
        draw,
        checkHit,
        clear,
        reset
    };
})();
