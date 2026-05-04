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
                applyHitStop, showDanger, canSpawnEnemyBullet,
                bossDeathTimeout } = _deps;

        applyHitStop('BOSS_DEFEAT_SLOWMO', false);

        // Save enemies and suspend the wave BEFORE clearing the battlefield.
        // WaveManager.suspendStreaming captures the streaming state snapshot
        // so it can be resumed after mini-boss defeat. clearBattlefield() runs
        // after — it provides bullet VFX + score bonus and resets streaming
        // internals (which are already safely snapshotted).
        const savedEnemies = [...getEnemies()];
        if (waveMgr) waveMgr.suspendStreaming(savedEnemies);

        if (G.clearBattlefield) {
            G.clearBattlefield();
        } else {
            const eb = getEnemyBullets();
            eb.forEach(b => { b.markedForDeletion = true; G.Bullet.Pool.release(b); });
            setEnemyBullets([]);
        }

        // Clear enemies — the wave is now suspended
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

        const hpPct = miniBoss.hp / miniBoss.maxHp;
        const pulse = Math.sin(miniBoss.animTime * 3.5) * 0.12;
        const rgb = G.ColorUtils.hexToRgb(miniBoss.color);
        const isDamaged = hpPct < 0.3;

        // ── Outer glow (additive) ──
        ctx.globalCompositeOperation = 'lighter';
        const glowGrad = ctx.createRadialGradient(0, 0, 15, 0, 0, 100);
        glowGrad.addColorStop(0, `rgba(${rgb}, 0.35)`);
        glowGrad.addColorStop(0.5, `rgba(${rgb}, 0.12)`);
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 100 + pulse * 20, 0, Math.PI * 2);
        ctx.fill();

        // Rotating outer ring
        ctx.strokeStyle = `rgba(${rgb}, 0.20)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 72, miniBoss.animTime * 0.8, miniBoss.animTime * 0.8 + Math.PI * 1.6);
        ctx.stroke();

        ctx.globalCompositeOperation = 'source-over';

        // ── Hexagon body ──
        const hexR = 56;
        const hexGrad = ctx.createLinearGradient(0, -hexR, 0, hexR);
        hexGrad.addColorStop(0, `rgba(${rgb}, 0.85)`);
        hexGrad.addColorStop(1, `rgba(${rgb}, 0.50)`);
        ctx.fillStyle = hexGrad;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 / 6) * i - Math.PI / 2;
            const hx = Math.cos(a) * hexR;
            const hy = Math.sin(a) * hexR;
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Edge highlight
        ctx.strokeStyle = `rgba(${rgb}, 0.45)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // ── Inner ring ──
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.stroke();

        // ── Dark core ──
        ctx.fillStyle = '#08081a';
        ctx.beginPath();
        ctx.arc(0, 0, 37, 0, Math.PI * 2);
        ctx.fill();

        // ── Currency symbol with glow ──
        ctx.shadowColor = miniBoss.color;
        ctx.shadowBlur = 18 + pulse * 12;
        ctx.fillStyle = isDamaged ? '#fff' : '#f0f0ff';
        ctx.font = 'bold 56px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(miniBoss.symbol, 0, 0);
        ctx.shadowBlur = 0;

        // ── Damage cracks + red flash (<30% HP) ──
        if (isDamaged) {
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-28, -22); ctx.lineTo(-12, -6); ctx.lineTo(-20, 12);
            ctx.moveTo(22, -16); ctx.lineTo(30, 6); ctx.lineTo(16, 24);
            ctx.moveTo(6, -36); ctx.lineTo(0, -26);
            ctx.stroke();

            ctx.fillStyle = `rgba(255, 0, 0, ${0.08 + Math.abs(pulse) * 0.35})`;
            ctx.beginPath();
            ctx.arc(0, 0, 48, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Phase dots (3 around the hexagon) ──
        for (let p = 0; p < 3; p++) {
            const da = -Math.PI / 2 + (p * Math.PI * 2 / 3);
            const dx = Math.cos(da) * 51;
            const dy = Math.sin(da) * 51;
            ctx.fillStyle = miniBoss.phase >= p ? miniBoss.color : '#333';
            ctx.shadowColor = miniBoss.phase >= p ? miniBoss.color : 'transparent';
            ctx.shadowBlur = miniBoss.phase >= p ? 4 : 0;
            ctx.beginPath();
            ctx.arc(dx, dy, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // ── HP bar ──
        const barW = 114, barH = 7, barY = 72;
        ctx.fillStyle = '#15152a';
        ctx.fillRect(-barW / 2, barY, barW, barH);
        const barGrad = ctx.createLinearGradient(-barW / 2, 0, -barW / 2 + barW * hpPct, 0);
        barGrad.addColorStop(0, isDamaged ? '#ff3333' : miniBoss.color);
        barGrad.addColorStop(1, isDamaged ? '#ff7777' : '#ffffff');
        ctx.fillStyle = barGrad;
        ctx.fillRect(-barW / 2, barY, barW * hpPct, barH);
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barW / 2, barY, barW, barH);

        // ── Name ──
        ctx.fillStyle = isDamaged ? '#ff7777' : '#bbb';
        ctx.font = 'bold 13px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(miniBoss.name + ' BOSS', 0, barY + 20);

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
                if (G.StatsTracker && G.StatsTracker.recordMiniBossDefeat) G.StatsTracker.recordMiniBossDefeat();
                setShake(40);
                G.Audio.play('explosion');

                if (window.Game.applyHitStop) window.Game.applyHitStop('BOSS_DEFEAT_SLOWMO', false);
                if (window.Game.triggerScreenFlash) window.Game.triggerScreenFlash('BOSS_DEFEAT');

                // Resume the wave: WaveManager restores streaming state + saved enemies
                var restored = (waveMgr && typeof waveMgr.resumeStreaming === 'function')
                    ? waveMgr.resumeStreaming()
                    : [];
                setEnemies(restored);
                setWaveStartTime(getTotalTime());

                if (G.HarmonicConductor) G.HarmonicConductor.enemies = restored;

                // Arcade: mini-boss defeat → modifier choice (2-card)
                // v7.31: keep miniBossActive=true + waveInProgress=true during the
                // modifier pick window so WaveManager doesn't trigger a full boss
                // spawn or intermission while the player is choosing cards.
                if (G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode() && G.ModifierChoiceScreen) {
                    if (waveMgr) waveMgr.waveInProgress = true;
                    const picks = (G.Balance.ARCADE && G.Balance.ARCADE.MODIFIERS && G.Balance.ARCADE.MODIFIERS.POST_MINIBOSS_PICKS) || 2;
                    const _showModChoice = () => {
                        G.ModifierChoiceScreen.show(picks, () => {
                            const rs = G.RunState;
                            const extraL = rs.arcadeBonuses.extraLives;
                            if (extraL !== 0 && G.adjustLives) {
                                G.adjustLives(extraL);
                                rs.arcadeBonuses.extraLives = 0;
                            }
                            // Unblock WaveManager now that modifier pick is done
                            if (waveMgr) {
                                waveMgr.miniBossActive = false;
                                waveMgr.waveInProgress = false;
                            }
                        });
                    };
                    if (typeof bossDeathTimeout === 'function') {
                        bossDeathTimeout(_showModChoice, 800);
                    } else {
                        setTimeout(_showModChoice, 800);
                    }
                } else {
                    if (waveMgr) waveMgr.miniBossActive = false;
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
