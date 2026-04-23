// GameplayCallbacks.js — Extracted from main.js v7.0
// CollisionSystem callback initialization (all collision logic)

window.Game = window.Game || {};

(function () {
    const G = window.Game;
    const Balance = G.Balance;

    // v4.29: Pre-allocated objects for CollisionSystem callbacks — avoids per-call allocation
    const _sparkOpts = { weaponLevel: 1, isKill: false, isHyper: false };

    /**
     * Initialize CollisionSystem with gameplay callbacks.
     * @param {Object} deps — All dependencies injected from main.js:
     *   Entity getters: player, getBullets, getEnemyBullets, getEnemies, getBoss, getMiniBoss
     *   State getters: getScore, getLives, getShake, getGrazeMeter, getGrazeCount,
     *     getGrazeMultiplier, getTotalTime, getLastGrazeSoundTime, getBulletCancelStreak,
     *     getBulletCancelTimer, getKillStreak, getKillStreakMult, getLastKillTime, getStreak,
     *     getBestStreak, getMarketCycle, getLevel, getKillCount, getIsBearMarket,
     *     getFrameKills, getLastGrazeTime, getMiniBossThisWave, getLastMiniBossSpawnTime,
     *     getFiatKillCounter, getDeathAlreadyTracked, getBossJustDefeated
     *   State setters: setScore, setShake, setGrazeMeter, setGrazeCount, setGrazeMultiplier,
     *     setBulletCancelStreak, setBulletCancelTimer, setKillStreak, setKillStreakMult,
     *     setLastKillTime, setStreak, setBestStreak, setMarketCycle, setKillCount,
     *     setFrameKills, setLastGrazeTime, setLastGrazeSoundTime, setGrazeCount,
     *     setMiniBossThisWave, setLastMiniBossSpawnTime, setFiatKillCounter,
     *     setDeathAlreadyTracked, setBossJustDefeated, setMiniBoss, setBoss, setLives
     *   Functions: updateScore, updateLivesUI, startDeathSequence, applyHitStop,
     *     triggerScreenFlash, emitEvent, createGrazeSpark, updateGrazeUI, showDanger,
     *     showVictory, showGameInfo, createBulletSpark, createExplosion,
     *     createEnemyDeathExplosion, createBossDeathExplosion, triggerScorePulse,
     *     triggerScoreStreakColor, updateKillCounter, checkStreakMeme, clearBattlefield,
     *     spawnMiniBoss, startIntermission, showStoryScreen, showGameCompletion,
     *     showCampaignVictory, restoreGameUI, buildPlayerState, getUnlockedWeapons,
     *     bossDeathTimeout, clearBossDeathTimeouts, shouldShowStory
     */
    function init(deps) {
        if (!G.CollisionSystem) return;

        const audioSys = G.Audio;
        const d = deps;

        G.CollisionSystem.init({
            player: d.player,
            getBullets: d.getBullets,
            getEnemyBullets: d.getEnemyBullets,
            getEnemies: d.getEnemies,
            getBoss: d.getBoss,
            getMiniBoss: d.getMiniBoss,
            getState: () => ({}),
            callbacks: {
                // Player hit by enemy bullet (normal — not HYPER)
                onPlayerHit(eb, ebIdx, ebArr) {
                    d.updateLivesUI(true);
                    G.Bullet.Pool.release(eb);
                    ebArr.splice(ebIdx, 1);
                    d.setShake(30); // v5.31: 20→30 (stronger impact feedback)
                    d.setBulletCancelStreak(0);
                    d.setBulletCancelTimer(0);
                    d.setGrazeCount(0);
                    d.setGrazeMeter(Math.max(0, d.getGrazeMeter() - 30));
                    d.emitEvent('player_hit', { hp: d.player.hp, maxHp: d.player.maxHp });
                    // v5.31: Impact particles on hit
                    if (G.ParticleSystem) G.ParticleSystem.createExplosion(d.player.x, d.player.y, '#ff4444', 8);
                    if (d.player.hp <= 0) {
                        d.startDeathSequence();
                    } else {
                        d.applyHitStop('PLAYER_HIT', false);
                        d.triggerScreenFlash('PLAYER_HIT');
                        G.EffectsRenderer.triggerDamageVignette();
                    }
                    d.setStreak(0);
                    d.setKillStreak(0);
                    d.setKillStreakMult(1.0);
                },
                // HYPER mode instant death
                onPlayerHyperDeath(eb, ebIdx, ebArr) {
                    d.player.deactivateHyper();
                    d.player.hp = 0;
                    if (G.Debug) G.Debug.trackPlayerDeath(d.getLives(), d.getLevel(), 'hyper');
                    d.setDeathAlreadyTracked(true);
                    G.Bullet.Pool.release(eb);
                    ebArr.splice(ebIdx, 1);
                    d.setShake(60);
                    d.showDanger(d.t('HYPER_FAILED'));
                    d.startDeathSequence();
                },
                // Graze (near miss)
                onGraze(eb, isCloseGraze, isHyperActive) {
                    const grazeBonus = isCloseGraze ? Balance.GRAZE.CLOSE_BONUS : 1;
                    if (G.Debug) G.Debug.trackGraze(isCloseGraze);

                    if (isHyperActive) {
                        const isHyperGodGraze = d.player._godchainActive;
                        const hyperMult = isHyperGodGraze ? (Balance.HYPERGOD?.SCORE_MULT ?? 5) : Balance.HYPER.SCORE_MULT;
                        const grazePoints = Math.floor(Balance.GRAZE.POINTS_BASE * hyperMult * grazeBonus);
                        d.setScore(d.getScore() + grazePoints);
                        d.updateScore(d.getScore(), grazePoints);
                        d.createGrazeSpark(eb.x, eb.y, d.player.x, d.player.y, true);
                        d.createGrazeSpark(eb.x, eb.y, d.player.x, d.player.y, true);
                        if (d.getTotalTime() - d.getLastGrazeSoundTime() > Balance.GRAZE.SOUND_THROTTLE) {
                            audioSys.play('hyperGraze');
                            d.setLastGrazeSoundTime(d.getTotalTime());
                        }
                    } else {
                        d.setGrazeCount(d.getGrazeCount() + grazeBonus);
                        if (G.RankSystem) G.RankSystem.onGraze();
                        d.setGrazeMultiplier(1 + (d.getGrazeMeter() / Balance.GRAZE.MULT_DIVISOR) * (Balance.GRAZE.MULT_MAX - 1));
                        const grazePoints = Math.floor(Balance.GRAZE.POINTS_BASE * d.getGrazeMultiplier() * grazeBonus);
                        d.setScore(d.getScore() + grazePoints);
                        d.updateScore(d.getScore(), grazePoints);
                        d.createGrazeSpark(eb.x, eb.y, d.player.x, d.player.y, isCloseGraze);
                        if (isCloseGraze) d.applyHitStop('CLOSE_GRAZE', true);
                        const soundThrottle = Balance.GRAZE.SOUND_THROTTLE || 0.1;
                        if (d.getTotalTime() - d.getLastGrazeSoundTime() > soundThrottle) {
                            audioSys.play(isCloseGraze ? 'grazeNearMiss' : 'graze');
                            d.setLastGrazeSoundTime(d.getTotalTime());
                        }
                        if (d.getGrazeCount() > 0 && d.getGrazeCount() % 10 === 0) audioSys.play('grazeStreak');
                    }
                    // Arcade: graze extends combo timer
                    if (G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode() && G.RunState.comboTimer > 0) {
                        G.RunState.comboTimer += Balance.ARCADE.COMBO.GRAZE_EXTEND;
                    }
                    d.updateGrazeUI();
                },
                // Enemy hit (but not killed)
                onEnemyHit(e, bullet, shouldDie) {
                    audioSys.play('hitEnemy');
                    const sparkColor = bullet.color || d.player.stats?.color || '#fff';
                    _sparkOpts.weaponLevel = d.player.weaponLevel ?? 1;
                    _sparkOpts.isKill = shouldDie;
                    _sparkOpts.isHyper = d.player.isHyperActive && d.player.isHyperActive();
                    d.createBulletSpark(e.x, e.y, sparkColor, _sparkOpts);
                },
                // Enemy killed
                onEnemyKilled(e, bullet, enemyIdx, enemies) {
                    // v5.15: Determine tier + elemType for destruction SFX
                    const _destroyCfg = Balance.VFX?.ENEMY_DESTROY;
                    let _killTier = 'WEAK';
                    if (Balance.isStrongTier && Balance.isStrongTier(e.symbol)) _killTier = 'STRONG';
                    else if (Balance.isMediumTier && Balance.isMediumTier(e.symbol)) _killTier = 'MEDIUM';
                    const _killElemType = bullet._elemFire ? 'fire' : bullet._elemLaser ? 'laser' : bullet._elemElectric ? 'electric' : null;
                    if (_destroyCfg?.SFX?.ENABLED) {
                        audioSys.play('enemyDestroy', { tier: _killTier });
                        if (_killElemType) audioSys.play('elemDestroyLayer', { elemType: _killElemType });
                    } else {
                        audioSys.play('coinScore');
                    }
                    d.applyHitStop('ENEMY_KILL', true);
                    if (G.RankSystem) G.RankSystem.onKill();

                    // Kill streak
                    const now = d.getTotalTime();
                    if (now - d.getLastKillTime() < Balance.SCORE.STREAK_TIMEOUT) {
                        const ks = d.getKillStreak() + 1;
                        d.setKillStreak(ks);
                        d.setKillStreakMult(Math.min(Balance.SCORE.STREAK_MULT_MAX, 1 + ks * Balance.SCORE.STREAK_MULT_PER_KILL));
                        if (ks === 10) { d.applyHitStop('STREAK_10', false); d.triggerScreenFlash('STREAK_10'); d.triggerScoreStreakColor(10); }
                        else if (ks === 25) { d.applyHitStop('STREAK_25', false); d.triggerScreenFlash('STREAK_25'); d.triggerScoreStreakColor(25); }
                        else if (ks === 50) { d.applyHitStop('STREAK_50', false); d.triggerScreenFlash('STREAK_50'); d.triggerScoreStreakColor(50); }
                    } else {
                        d.setKillStreak(1);
                        d.setKillStreakMult(1.0);
                    }
                    d.setLastKillTime(now);

                    // Arcade combo system
                    const _isArcade = G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode();
                    const comboCfg = Balance.ARCADE && Balance.ARCADE.COMBO;
                    let comboMult = 1.0;
                    if (_isArcade && comboCfg) {
                        const rs = G.RunState;
                        rs.comboCount++;
                        rs.comboTimer = comboCfg.TIMEOUT;
                        rs.comboDecayAnim = 0;
                        comboMult = Math.min(comboCfg.MULT_CAP, 1.0 + rs.comboCount * comboCfg.MULT_PER_COMBO);
                        rs.comboMult = comboMult;
                        if (rs.comboCount > rs.bestCombo) rs.bestCombo = rs.comboCount;
                    }

                    // Arcade modifier score multiplier
                    const arcadeScoreMult = (_isArcade && G.RunState.arcadeBonuses) ? G.RunState.arcadeBonuses.scoreMult : 1;

                    // Score calculation
                    const perkMult = 1;
                    const bearMult = d.getIsBearMarket() ? Balance.SCORE.BEAR_MARKET_MULT : 1;
                    const grazeKillBonus = d.getGrazeMeter() >= Balance.SCORE.GRAZE_KILL_THRESHOLD ? Balance.SCORE.GRAZE_KILL_BONUS : 1;
                    const isHyperGod = (d.player.isHyperActive && d.player.isHyperActive()) && d.player._godchainActive;
                    const hyperMult = isHyperGod
                        ? (Balance.HYPERGOD?.SCORE_MULT ?? 5)
                        : ((d.player.isHyperActive && d.player.isHyperActive()) ? Balance.HYPER.SCORE_MULT : 1);
                    const isLastEnemy = enemies.length === 0;
                    const lastEnemyMult = isLastEnemy && G.HarmonicConductor ? G.HarmonicConductor.getLastEnemyBonus() : 1;
                    // v7.0: Cap total multiplier to prevent degenerate scores
                    let totalMult = bearMult * perkMult * d.getKillStreakMult() * grazeKillBonus * hyperMult * lastEnemyMult * comboMult * arcadeScoreMult;
                    const multCap = Balance.HYPERGOD?.TOTAL_MULT_CAP;
                    if (multCap && totalMult > multCap) totalMult = multCap;
                    const killScore = Math.floor(e.scoreVal * totalMult);
                    d.setScore(d.getScore() + killScore);
                    d.updateScore(d.getScore(), killScore);

                    if (isLastEnemy && lastEnemyMult > 1) {
                        d.applyHitStop('STREAK_25', false);
                        d.triggerScreenFlash('STREAK_25');
                        d.showGameInfo("💀 " + d.t('LAST_FIAT') + " x" + lastEnemyMult.toFixed(0));
                    }

                    // v4.44: Clear player bullets when last enemy dies
                    if (isLastEnemy) {
                        d.clearBattlefield({ enemyBullets: false });
                    }

                    d.createEnemyDeathExplosion(e.x, e.y, e.color, e.symbol || '$', e.shape, _killElemType);

                    // Arcade: Volatile Rounds — AoE damage on kill
                    if (_isArcade && G.RunState.arcadeBonuses.volatileRounds && enemies.length > 0) {
                        const vr = Balance.ARCADE?.MODIFIER_TUNING?.VOLATILE_ROUNDS;
                        const aoeRadius = vr?.AOE_RADIUS ?? 30;
                        const aoeDmg = Math.floor((d.player.stats.baseDamage ?? 14) * (vr?.DMG_MULT ?? 0.5));
                        for (let vi = enemies.length - 1; vi >= 0; vi--) {
                            const ve = enemies[vi];
                            if (!ve || !ve.active) continue;
                            const dx = ve.x - e.x, dy = ve.y - e.y;
                            if (dx * dx + dy * dy < aoeRadius * aoeRadius) {
                                ve.hp -= aoeDmg;
                                ve.hitFlash = vr?.HIT_FLASH ?? 0.1;
                                d.createExplosion(ve.x, ve.y, e.color, 4);
                            }
                        }
                    }

                    // Arcade: Chain Lightning — kill chains to 1 nearby enemy (v7.12.6: 30% chance per CLAUDE.md)
                    if (_isArcade && G.RunState.arcadeBonuses.chainLightning && enemies.length > 0
                        && Math.random() < (Balance.ARCADE?.MODIFIER_TUNING?.CHAIN_LIGHTNING?.CHANCE ?? 0.30)) {
                        const cl = Balance.ARCADE?.MODIFIER_TUNING?.CHAIN_LIGHTNING;
                        const clRange = cl?.RANGE ?? 100;
                        let closest = null, closestDist = clRange * clRange;
                        for (let ci = 0; ci < enemies.length; ci++) {
                            const ce = enemies[ci];
                            if (!ce || !ce.active) continue;
                            const dx = ce.x - e.x, dy = ce.y - e.y;
                            const d2 = dx * dx + dy * dy;
                            if (d2 < closestDist) { closest = ce; closestDist = d2; }
                        }
                        if (closest) {
                            const chainDmg = Math.floor((d.player.stats.baseDamage ?? 14) * (cl?.DMG_MULT ?? 0.3));
                            closest.hp -= chainDmg;
                            closest.hitFlash = cl?.HIT_FLASH ?? 0.15;
                            d.createExplosion(closest.x, closest.y, '#00f0ff', 5);
                        }
                    }

                    // Multi-kill
                    d.setFrameKills(d.getFrameKills() + 1);
                    if (d.getFrameKills() >= 2) {
                        d.triggerScreenFlash('MULTI_KILL');
                        d.applyHitStop('STREAK_10', false);
                    }
                    if (Balance?.isStrongTier && Balance.isStrongTier(e.symbol)) {
                        const vfx = Balance?.VFX || {};
                        d.setShake(Math.max(d.getShake(), vfx.STRONG_KILL_SHAKE || 3));
                    }

                    d.setKillCount(d.getKillCount() + 1);
                    d.setStreak(d.getStreak() + 1);
                    if (d.getStreak() > d.getBestStreak()) d.setBestStreak(d.getStreak());
                    if (G.Debug) G.Debug.trackKillStreak(d.getStreak());
                    d.updateKillCounter();
                    d.checkStreakMeme();
                    d.emitEvent('enemy_killed', { score: killScore, x: e.x, y: e.y, pattern: e.entryPattern || null, symbol: e.symbol || null, v8Fall: !!e._v8Fall });

                    // Proximity Kill Meter
                    const dist = Math.abs(e.y - d.player.y);
                    const proxCfg = Balance.PROXIMITY_KILL;
                    if (dist < proxCfg.MAX_DISTANCE && !(d.player.isHyperActive && d.player.isHyperActive())) {
                        const t2 = 1 - Math.max(0, (dist - proxCfg.CLOSE_DISTANCE)) / (proxCfg.MAX_DISTANCE - proxCfg.CLOSE_DISTANCE);
                        let gain = proxCfg.METER_GAIN_MIN + t2 * (proxCfg.METER_GAIN_MAX - proxCfg.METER_GAIN_MIN);
                        // v7.12.6: Arcade JACKPOT modifier halves meter gain (malus side of pity×0.50 bonus)
                        if (_isArcade) gain *= (G.RunState.arcadeBonuses.grazeGainMult ?? 1);
                        d.setLastGrazeTime(d.getTotalTime());
                        d.setGrazeMeter(Math.min(100, d.getGrazeMeter() + gain));
                        if (d.getGrazeMeter() >= Balance.HYPER.METER_THRESHOLD && d.player.hyperCooldown <= 0) {
                            if (Balance.HYPER.AUTO_ACTIVATE && d.player.canActivateHyper && d.player.canActivateHyper(d.getGrazeMeter())) {
                                d.player.activateHyper();
                                d.setGrazeMeter(0);
                                d.updateGrazeUI();
                                d.triggerScreenFlash('HYPER_ACTIVATE');
                            } else if (!d.player.hyperAvailable) {
                                d.player.hyperAvailable = true;
                                audioSys.play('hyperReady');
                            }
                        }
                        d.updateGrazeUI();
                    }

                    // Mini-boss trigger
                    const _arcadeMini = (G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode() && Balance.ARCADE) ? Balance.ARCADE.MINI_BOSS : null;
                    const _mbCooldown = _arcadeMini ? _arcadeMini.COOLDOWN : Balance.MINI_BOSS.COOLDOWN;
                    const _mbMaxWave = _arcadeMini ? _arcadeMini.MAX_PER_WAVE : (Balance.MINI_BOSS.MAX_PER_WAVE || 2);
                    const boss = d.getBoss();
                    const miniBoss = d.getMiniBoss();
                    if (!(G.CampaignState && G.CampaignState.isEnabled()) && e.symbol && d.getFiatKillCounter()[e.symbol] !== undefined && !miniBoss && !boss && !e.isMinion && d.getBossWarningTimer() <= 0 && (d.getTotalTime() - d.getLastMiniBossSpawnTime()) >= _mbCooldown && d.getMiniBossThisWave() < _mbMaxWave) {
                        const fkc = d.getFiatKillCounter();
                        fkc[e.symbol]++;
                        const mapping = Balance.MINI_BOSS.CURRENCY_BOSS_MAP?.[e.symbol];
                        const _threshMult = _arcadeMini ? (_arcadeMini.THRESHOLD_MULT || 0.65) : 1.0;
                        const threshold = Math.floor((mapping?.threshold || Balance.MINI_BOSS.KILL_THRESHOLD) * _threshMult);
                        G.Debug.log('MINIBOSS', `Kill ${e.symbol}: ${fkc[e.symbol]}/${threshold}`);
                        if (fkc[e.symbol] >= threshold) {
                            let bossType = mapping?.boss || 'FEDERAL_RESERVE';
                            if (bossType === 'RANDOM') {
                                const rotation = G.BOSS_ROTATION || ['FEDERAL_RESERVE', 'BCE', 'BOJ'];
                                bossType = rotation[Math.floor(Math.random() * rotation.length)];
                            } else if (bossType === 'CYCLE_BOSS') {
                                const rotation = G.BOSS_ROTATION || ['FEDERAL_RESERVE', 'BCE', 'BOJ'];
                                bossType = rotation[(d.getMarketCycle() - 1) % rotation.length];
                            }
                            G.Debug.trackMiniBossSpawn(bossType, e.symbol, fkc[e.symbol]);
                            G.Debug._miniBossStartInfo = { type: bossType, trigger: e.symbol, killCount: fkc[e.symbol], startTime: Date.now() };
                            d.setLastMiniBossSpawnTime(d.getTotalTime());
                            d.setMiniBossThisWave(d.getMiniBossThisWave() + 1);
                            d.spawnMiniBoss(bossType, e.color);
                            const fkcReset = d.getFiatKillCounter();
                            Object.keys(fkcReset).forEach(k => fkcReset[k] = 0);
                        }
                    }

                    // Drop logic
                    const useEvolution = !!(Balance.WEAPON_EVOLUTION && d.player.weaponLevel);
                    const dropInfo = G.DropSystem.tryEnemyDrop(e.symbol, e.x, e.y, d.getTotalTime(), useEvolution ? d.buildPlayerState() : d.getUnlockedWeapons, useEvolution);
                    if (dropInfo) {
                        d.addPowerUp(new G.PowerUp(dropInfo.x, dropInfo.y, dropInfo.type));
                        if (G.Debug) G.Debug.trackDropSpawned(dropInfo.type, dropInfo.category, 'enemy');
                    }
                },
                // Boss hit by player bullet
                onBossHit(bullet, dmg, boss, bIdx, bArr) {
                    audioSys.play('hitEnemy');
                    const hitScore = Math.floor(dmg * 2);
                    d.setScore(d.getScore() + hitScore);
                    d.updateScore(d.getScore(), hitScore);
                    // Proximity Kill Meter: boss hits give small meter gain
                    const bossGain = Balance.PROXIMITY_KILL.BOSS_HIT_GAIN;
                    if (bossGain > 0 && !(d.player.isHyperActive && d.player.isHyperActive())) {
                        d.setLastGrazeTime(d.getTotalTime());
                        d.setGrazeMeter(Math.min(100, d.getGrazeMeter() + bossGain));
                        d.updateGrazeUI();
                    }
                    // Boss drops
                    const useEvolutionBoss = !!(Balance.WEAPON_EVOLUTION && d.player.weaponLevel);
                    const bossDropInfo = G.DropSystem.tryBossDrop(
                        boss.x + boss.width / 2, boss.y + boss.height, d.getTotalTime(),
                        useEvolutionBoss ? d.buildPlayerState() : d.getUnlockedWeapons,
                        useEvolutionBoss
                    );
                    if (bossDropInfo) {
                        d.addPowerUp(new G.PowerUp(bossDropInfo.x, bossDropInfo.y, bossDropInfo.type));
                        audioSys.play('coinPerk');
                        if (G.Debug) G.Debug.trackDropSpawned(bossDropInfo.type, bossDropInfo.category, 'boss');
                    }
                },
                // Boss killed — v5.11: Cinematic boss evolution flow
                onBossDeath(deadBoss) {
                    const defeatedBossType = deadBoss.bossType || 'FEDERAL_RESERVE';
                    const defeatedBossName = deadBoss.name || 'THE FED';
                    const bossX = deadBoss.x + deadBoss.width / 2;
                    const bossY = deadBoss.y + deadBoss.height / 2;

                    // T=0: Main explosion + FREEZE
                    d.createBossDeathExplosion(bossX, bossY);
                    d.applyHitStop('BOSS_DEFEAT_FREEZE', true);
                    d.triggerScreenFlash('BOSS_DEFEAT');
                    if (G.TransitionManager) G.TransitionManager.startFadeOut(0.8, '#ffffff');
                    const marketCycle = d.getMarketCycle();
                    const bossBonus = Balance.SCORE.BOSS_DEFEAT_BASE + (marketCycle * Balance.SCORE.BOSS_DEFEAT_PER_CYCLE);
                    d.setScore(d.getScore() + bossBonus);
                    d.updateScore(d.getScore(), bossBonus);
                    const boss = d.getBoss();
                    if (boss) { boss.active = false; }
                    d.setBoss(null);
                    d.setShake(Balance.EFFECTS.SHAKE.BOSS_DEFEAT || 80);
                    audioSys.play('explosion');
                    audioSys.setBossPhase(0);
                    if (G.Events) G.Events.emit('weather:boss_defeat');
                    if (G.WeatherController) G.WeatherController.setLevel(d.getLevel(), d.getIsBearMarket(), false);
                    const ebArr = d.getEnemyBullets();
                    ebArr.forEach(b => G.Bullet.Pool.release(b));
                    ebArr.length = 0;
                    window.enemyBullets = ebArr;
                    d.setBossJustDefeated(true);

                    // v8 S05: resume scroll at reduced "breathing" speed.
                    // NOTE: scheduleLevelEnd is deferred until after celebration/chapter flow
                    // to avoid racing with showStoryScreen modal (see line ~548).
                    // v7.11.1: V8 is campaign-only — Arcade follows the WaveManager + modifier-choice path.
                    const _v8ArcadeCheck = G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode();
                    const _v8Enabled = !!(Balance.V8_MODE && Balance.V8_MODE.ENABLED) && !_v8ArcadeCheck;
                    if (_v8Enabled) {
                        if (G.ScrollEngine && G.ScrollEngine.resume) G.ScrollEngine.resume(40);
                    }

                    if (d.player && d.player.hyperActive) d.player.deactivateHyper();
                    d.setGrazeMeter(0);
                    d.updateGrazeUI();
                    const enemies = d.getEnemies();
                    enemies.length = 0;
                    G.enemies = enemies;
                    if (G.HarmonicConductor) G.HarmonicConductor.enemies = enemies;
                    const miniBoss = d.getMiniBoss();
                    if (miniBoss) { G.MiniBossManager.clear(); d.setMiniBoss(null); }
                    d.updateScore(d.getScore());
                    d.showVictory("🏆 " + defeatedBossName + ' ' + d.t('DEFEATED'));
                    const victoryMemes = { 'FEDERAL_RESERVE': "💥 INFLATION CANCELLED!", 'BCE': "💥 FRAGMENTATION COMPLETE!", 'BOJ': "💥 YEN LIBERATED!" };
                    G.MemeEngine.queueMeme('BOSS_DEFEATED', victoryMemes[defeatedBossType] || "CENTRAL BANK DESTROYED!", defeatedBossName);
                    G.Debug.trackBossDefeat(defeatedBossType, d.getLevel(), marketCycle);
                    if (G.StatsTracker && G.StatsTracker.recordBossDefeat) G.StatsTracker.recordBossDefeat(defeatedBossType);
                    if (G.Debug) { G.Debug.trackBossFightEnd(defeatedBossType, marketCycle); G.Debug.trackCycleEnd(marketCycle, Math.floor(d.getScore())); }
                    const newCycle = marketCycle + 1;
                    d.setMarketCycle(newCycle);

                    // v5.11: APC with 3-level formula
                    const APC = Balance.ADAPTIVE_POWER;
                    if (APC && APC.ENABLED && newCycle >= 2) {
                        const wl = d.player ? (d.player.weaponLevel ?? 1) : 1;
                        const stacks = G.RunState.perkStacks || {};
                        let totalStacks = 0;
                        for (const k in stacks) totalStacks += stacks[k];
                        const hasSpec = !!(d.player && d.player.special);
                        const W = APC.WEIGHTS;
                        const weaponScore = (wl - 1) / 2;
                        const perkScore = Math.min(totalStacks / 8, 1);
                        const specialScore = hasSpec ? 1.0 : 0.0;
                        const ps = W.WEAPON * weaponScore + W.PERKS * perkScore + W.SPECIAL * specialScore;
                        const hpM = APC.HP_FLOOR + ps * APC.HP_RANGE;
                        let pAdj = 0;
                        if (ps < APC.WEAK_THRESHOLD) pAdj = APC.PITY_BONUS_WEAK;
                        else if (ps > APC.STRONG_THRESHOLD) pAdj = APC.PITY_PENALTY_STRONG;
                        G.RunState.cyclePower = { score: ps, hpMult: hpM, pityAdj: pAdj };
                    }
                    G.Debug.trackCycleUp(newCycle);
                    if (G.Debug) G.Debug.trackCycleStart(newCycle);
                    const waveMgr = G.WaveManager;
                    waveMgr.reset();
                    waveMgr.waveInProgress = true;
                    G.DropSystem.specialDroppedThisCycle = false;
                    d.resetFiatKillCounter();
                    if (G.HarmonicConductor) { G.HarmonicConductor.reset(); G.HarmonicConductor.setDifficulty(d.getLevel(), newCycle, d.getIsBearMarket()); }
                    const campaignState2 = G.CampaignState;
                    const _isArcadeMode = !(campaignState2 && campaignState2.isEnabled());
                    const campaignComplete = !!(campaignState2 && campaignState2.isEnabled() && defeatedBossType === 'BOJ');
                    const chapterId = G.BOSS_TO_CHAPTER && G.BOSS_TO_CHAPTER[defeatedBossType];
                    const shouldShowChapter = chapterId && d.shouldShowStory(chapterId);

                    // === v5.11: Cinematic boss death sequence ===
                    const BD = Balance.VFX?.BOSS_DEATH;
                    d.clearBossDeathTimeouts();

                    // T=0.3: Coin rain
                    if (BD?.COIN_RAIN?.ENABLED && G.ParticleSystem) {
                        d.bossDeathTimeout(() => {
                            const cw = Balance.GAME?.BASE_WIDTH || 600;
                            const ch = Balance.GAME?.BASE_HEIGHT || 800;
                            G.ParticleSystem.createCoinRain(cw, ch);
                        }, (BD.COIN_RAIN.START_DELAY || 0.3) * 1000);
                    }

                    // T=0.5: Freeze ends → SLOWMO
                    d.bossDeathTimeout(() => {
                        d.applyHitStop('BOSS_DEFEAT_SLOWMO', false);
                    }, 500);

                    // Chain explosions
                    if (BD) {
                        const chainCount = BD.CHAIN_EXPLOSIONS || 6;
                        const times = BD.CHAIN_TIMES || [0.0, 0.4, 0.8, 1.3, 1.8, 2.5];
                        const offsets = BD.CHAIN_OFFSETS || [[0,0],[-50,-30],[40,20],[-30,40],[50,-20],[0,10]];
                        const scales = BD.CHAIN_SCALE || [1.0, 0.8, 0.9, 1.0, 1.1, 1.5];
                        for (let i = 1; i < chainCount; i++) {
                            const delay = (times[i] || i * 0.4) * 1000;
                            const ox = offsets[i] ? offsets[i][0] : 0;
                            const oy = offsets[i] ? offsets[i][1] : 0;
                            const sc = scales[i] || 1.0;
                            d.bossDeathTimeout(() => {
                                d.createBossDeathExplosion(bossX + ox, bossY + oy);
                                if (sc >= 1.5) {
                                    d.triggerScreenFlash('BOSS_DEFEAT');
                                    d.setShake(Math.max(d.getShake(), 40));
                                }
                                audioSys.play('explosion');
                            }, delay);
                        }
                    }

                    // Evolution item spawn + fly
                    const WE = Balance.WEAPON_EVOLUTION;
                    const canEvolve = d.player && d.player.weaponLevel < (WE?.MAX_WEAPON_LEVEL || 3);
                    if (canEvolve && BD?.EVOLUTION_ITEM) {
                        const evoConf = BD.EVOLUTION_ITEM;
                        const spawnDelay = (evoConf.SPAWN_DELAY || 2.8) * 1000;
                        const flyDuration = (evoConf.FLY_DURATION || 1.2) * 1000;

                        d.bossDeathTimeout(() => {
                            const evoItem = {
                                x: bossX, y: bossY,
                                startX: bossX, startY: bossY,
                                timer: 0,
                                duration: flyDuration,
                                active: true,
                                size: evoConf.SIZE || 28,
                                glowColor: evoConf.GLOW_COLOR || '#00f0ff'
                            };
                            window._evolutionItem = evoItem;
                        }, spawnDelay);
                    }

                    // Delayed transition
                    const celebDelay = (Balance.TIMING.BOSS_CELEBRATION_DELAY || 5.0) * 1000;
                    d.bossDeathTimeout(() => {
                        if (_isArcadeMode && G.ModifierChoiceScreen) {
                            const picks = Balance.ARCADE.MODIFIERS.POST_BOSS_PICKS || 3;
                            if (G.RunState.arcadeBonuses.lastStandAvailable) {
                                G.RunState.arcadeBonuses.lastStandAvailable = true;
                            }
                            d.startIntermission(d.t('CYCLE') + ' ' + newCycle + ' ' + d.t('BEGINS'));
                            d.bossDeathTimeout(() => {
                                G.ModifierChoiceScreen.show(picks, () => {
                                    const extraL = G.RunState.arcadeBonuses.extraLives;
                                    if (extraL > 0) {
                                        d.setLives(d.getLives() + extraL);
                                        G.RunState.arcadeBonuses.extraLives = 0;
                                        d.updateLivesUI();
                                    } else if (extraL < 0) {
                                        d.setLives(Math.max(1, d.getLives() + extraL));
                                        G.RunState.arcadeBonuses.extraLives = 0;
                                        d.updateLivesUI();
                                    }
                                });
                            }, 1500);
                        } else if (campaignComplete && shouldShowChapter) {
                            d.showStoryScreen(chapterId, () => {
                                if (!localStorage.getItem('fiat_completion_seen')) {
                                    d.showGameCompletion(() => d.showCampaignVictory());
                                } else {
                                    d.showCampaignVictory();
                                }
                            });
                        } else if (campaignComplete) {
                            if (!localStorage.getItem('fiat_completion_seen')) {
                                d.showGameCompletion(() => d.showCampaignVictory());
                            } else {
                                d.showCampaignVictory();
                            }
                        } else if (shouldShowChapter) {
                            d.showStoryScreen(chapterId, () => {
                                d.restoreGameUI();
                                if (_v8Enabled && typeof window.advanceToNextV8Level === 'function') {
                                    window.advanceToNextV8Level();
                                } else {
                                    d.startIntermission(d.t('CYCLE') + ' ' + newCycle + ' ' + d.t('BEGINS'));
                                }
                            });
                        } else if (_v8Enabled && G.LevelScript && G.LevelScript.scheduleLevelEnd) {
                            G.LevelScript.scheduleLevelEnd(1);
                        } else {
                            d.startIntermission(d.t('CYCLE') + ' ' + newCycle + ' ' + d.t('BEGINS'));
                        }
                    }, celebDelay);
                    d.emitEvent('boss_killed', { level: d.getLevel(), cycle: newCycle, bossType: defeatedBossType, campaignComplete: campaignComplete });
                    const bossDefeatPool = G.DIALOGUES && G.DIALOGUES.BOSS_DEFEAT && G.DIALOGUES.BOSS_DEFEAT[defeatedBossType];
                    if (bossDefeatPool && bossDefeatPool.length > 0) {
                        const bossQuote = bossDefeatPool[Math.floor(Math.random() * bossDefeatPool.length)];
                        const quoteText = (typeof bossQuote === 'string' ? bossQuote : (bossQuote && bossQuote.text)) || '';
                        if (quoteText) G.MemeEngine.queueMeme('BOSS_DEFEATED', '\u201C' + quoteText + '\u201D', defeatedBossName);
                    }
                },
                // v5.31: Shield destroys enemy bullet on contact
                onShieldBulletDestroy(eb, ebIdx, ebArr) {
                    d.createBulletSpark(eb.x, eb.y, '#00f0ff', { isCancel: true });
                    eb.markedForDeletion = true;
                    G.Bullet.Pool.release(eb);
                    ebArr.splice(ebIdx, 1);
                    if (audioSys) audioSys.play('bulletCancel');
                },
                // v5.31: Energy Link beam cancels enemy bullet
                onLinkBeamCancel(eb, ebIdx, ebArr) {
                    d.createBulletSpark(eb.x, eb.y, '#00ccff', { isCancel: true });
                    eb.markedForDeletion = true;
                    G.Bullet.Pool.release(eb);
                    ebArr.splice(ebIdx, 1);
                    if (audioSys) audioSys.play('bulletCancel');
                },
                // v5.32: Reflector — enemy reflects player bullet back as enemy bullet
                onBulletReflected(enemy, originalBullet) {
                    const refCfg = Balance.ELITE_VARIANTS?.REFLECTOR;
                    if (!refCfg) return;
                    const angle = Math.atan2(d.player.y - enemy.y, d.player.x - enemy.x);
                    const spread = (Math.random() - 0.5) * (refCfg.REFLECT_SPREAD || 0.3);
                    const speed = refCfg.REFLECT_SPEED || 200;
                    const newBullet = {
                        x: enemy.x, y: enemy.y + 29,
                        vx: Math.cos(angle + spread) * speed,
                        vy: Math.sin(angle + spread) * speed,
                        color: '#ff44ff', w: 5, h: 5,
                        shape: 'coin', ownerColor: enemy.color,
                        isReflected: true
                    };
                    if (G.Events) G.Events.emit('harmonic_bullets', { bullets: [newBullet] });
                    if (audioSys) audioSys.play('grazeNearMiss');
                    d.createBulletSpark(enemy.x, enemy.y, '#ff44ff', { isCancel: true });
                },
                // Bullet cancel (player bullet vs enemy bullet)
                onBulletCancel(pb, eb, pbIdx, ebIdx, pbArr, ebArr) {
                    d.createBulletSpark(eb.x, eb.y, eb.color || '#ff4444', { isCancel: true });
                    eb.markedForDeletion = true;
                    G.Bullet.Pool.release(eb);
                    ebArr.splice(ebIdx, 1);
                    d.setBulletCancelStreak(d.getBulletCancelStreak() + 1);
                    if (!pb.penetration) {
                        pb.pierceHP = (pb.pierceHP || 1) - 1;
                        if (pb.pierceHP <= 0) {
                            pb.markedForDeletion = true;
                            G.Bullet.Pool.release(pb);
                            pbArr.splice(pbIdx, 1);
                        }
                    }
                }
            }
        });
    }

    G.GameplayCallbacks = { init: init };
})();
