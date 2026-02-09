// Main Entry Point (Namespace Pattern)
const G = window.Game;
const Constants = G;
const audioSys = G.Audio;
const inputSys = G.Input;
const waveMgr = G.WaveManager;
const events = G.Events;
const runState = G.RunState;
window.Game.images = {}; // Placeholder, populated by main.js


// --- VERSION MIGRATION: Force clean slate on version change ---
(function() {
    const APP_VER = G.VERSION.replace(/[^0-9.]/g, '').trim();
    if (localStorage.getItem('fiat_app_version') !== APP_VER) {
        localStorage.clear();
        localStorage.setItem('fiat_app_version', APP_VER);
    }
})();

// --- GLOBAL STATE ---
let canvas, ctx, gameContainer;
let gameWidth = window.Game.Balance.GAME.BASE_WIDTH;
let gameHeight = window.Game.Balance.GAME.BASE_HEIGHT;
let gameState = 'VIDEO';
// v4.28.0: Sync local gameState with GameStateMachine on every transition
function setGameState(newState) {
    gameState = newState;
    if (G.GameState) G.GameState.transition(newState);
}
if (G.GameState) G.GameState.forceSet('VIDEO');
let userLang = navigator.language || navigator.userLanguage;
let currentLang = userLang.startsWith('it') ? 'IT' : 'EN';
G._currentLang = currentLang; // v4.11.0: Expose for StoryScreen localization
let isBearMarket = false; // 🐻
window.isBearMarket = isBearMarket; // Expose globally for WaveManager
G._gameWidth = gameWidth; // v4.0.1: Expose for Bullet horizontal bounds check

// PWA: Intercept install prompt for Android/Chrome
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window._deferredInstallPrompt = e;
});

// Game Entities
let player;
let bullets = [], enemyBullets = [], enemies = [], powerUps = [], particles = [], floatingTexts = [], muzzleFlashes = [], perkIcons = [];
window.enemyBullets = enemyBullets; // Expose for Player core hitbox indicator
// Sky state moved to SkyRenderer.js
let images = {}; // 🖼️ Asset Cache

// Load Assets
function loadAssets() {
    const assets = window.Game.ASSETS;
    let loaded = 0;
    const total = Object.keys(assets).length;

    function spriteHasTransparency(img) {
        const size = 64;
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const cctx = c.getContext('2d');
        cctx.drawImage(img, 0, 0, size, size);
        const data = cctx.getImageData(0, 0, size, size).data;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 255) return true;
        }
        return false;
    }

    for (const [key, src] of Object.entries(assets)) {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            loaded++;
            images[key] = img;
            if (!spriteHasTransparency(img)) {
                console.warn(`Asset appears fully opaque (no alpha): ${key} -> ${src}`);
            }
            /* console.log(`Loaded ${key}`); */
        };
        img.onerror = () => {
            img._failed = true;
            console.warn(`Asset failed to load: ${key} -> ${src}`);
        };
        images[key] = img;
    }
    window.Game.images = images; // Expose globally
}
loadAssets(); // Start loading immediately

let highScore = parseInt(localStorage.getItem('fiat_highscore')) || 0; // PERSISTENCE
// Note: High score UI update happens in updateModeIndicator() when intro screen is shown

// WEAPON PROGRESSION - Persisted in localStorage
const BASE_WEAPONS = ['WIDE', 'NARROW', 'FIRE']; // Always unlocked
const ADVANCED_WEAPONS = ['SPREAD', 'HOMING', 'LASER']; // Unlock per cycle
const WEAPON_UNLOCK_CYCLE = { SPREAD: 2, HOMING: 3, LASER: 4 }; // Cycle required
let maxCycleReached = parseInt(localStorage.getItem('fiat_maxcycle')) || 1;

function getUnlockedWeapons() {
    const unlocked = [...BASE_WEAPONS];
    for (const [weapon, cycle] of Object.entries(WEAPON_UNLOCK_CYCLE)) {
        if (maxCycleReached >= cycle) {
            unlocked.push(weapon);
        }
    }
    return unlocked;
}

// v4.19: Build player state snapshot for adaptive drop system
// v4.29: Pre-allocated to avoid per-call GC allocations
const _playerState = {
    shotLevel: 1,
    modifiers: { rate: 0, power: 0, spread: 0 },
    hasSpecial: false
};
function buildPlayerState() {
    if (!player) {
        _playerState.shotLevel = 1;
        _playerState.modifiers.rate = 0;
        _playerState.modifiers.power = 0;
        _playerState.modifiers.spread = 0;
        _playerState.hasSpecial = false;
        return _playerState;
    }
    _playerState.shotLevel = player.shotLevel || 1;
    _playerState.modifiers.rate = player.modifiers ? player.modifiers.rate.level : 0;
    _playerState.modifiers.power = player.modifiers ? player.modifiers.power.level : 0;
    _playerState.modifiers.spread = player.modifiers ? player.modifiers.spread.level : 0;
    _playerState.hasSpecial = !!player.special;
    return _playerState;
}

// v4.29: Pre-allocated objects for CollisionSystem callbacks — avoids per-call allocation
const _stateObj = { sacrificeState: null };
const _sparkOpts = { shotLevel: 1, hasPower: false, isKill: false, isHyper: false };

// v4.28.0: CollisionSystem initialization with callbacks
function initCollisionSystem() {
    if (!G.CollisionSystem) return;
    G.CollisionSystem.init({
        player: player,
        getBullets: () => bullets,
        getEnemyBullets: () => enemyBullets,
        getEnemies: () => enemies,
        getBoss: () => boss,
        getMiniBoss: () => miniBoss,
        getState: () => { _stateObj.sacrificeState = sacrificeState; return _stateObj; },
        callbacks: {
            // Player hit by enemy bullet (normal — not HYPER)
            onPlayerHit(eb, ebIdx, ebArr) {
                updateLivesUI(true);
                G.Bullet.Pool.release(eb);
                ebArr.splice(ebIdx, 1);
                shake = 20;
                bulletCancelStreak = 0;
                bulletCancelTimer = 0;
                grazeCount = 0;
                grazeMeter = Math.max(0, grazeMeter - 30);
                emitEvent('player_hit', { hp: player.hp, maxHp: player.maxHp });
                if (player.hp <= 0) {
                    startDeathSequence();
                } else {
                    applyHitStop('PLAYER_HIT', false);
                    triggerScreenFlash('PLAYER_HIT');
                }
                streak = 0;
                killStreak = 0;
                killStreakMult = 1.0;
            },
            // HYPER mode instant death
            onPlayerHyperDeath(eb, ebIdx, ebArr) {
                player.deactivateHyper();
                player.hp = 0;
                if (G.Debug) G.Debug.trackPlayerDeath(lives, level, 'hyper');
                deathAlreadyTracked = true;
                G.Bullet.Pool.release(eb);
                ebArr.splice(ebIdx, 1);
                shake = 60;
                showDanger(t('HYPER_FAILED'));
                startDeathSequence();
            },
            // Graze (near miss)
            onGraze(eb, isCloseGraze, isHyperActive) {
                lastGrazeTime = totalTime;
                const grazeBonus = isCloseGraze ? Balance.GRAZE.CLOSE_BONUS : 1;
                if (G.Debug) G.Debug.trackGraze(isCloseGraze);

                if (isHyperActive) {
                    player.extendHyper();
                    const hyperMult = Balance.HYPER.SCORE_MULT;
                    const grazePoints = Math.floor(Balance.GRAZE.POINTS_BASE * hyperMult * grazeBonus);
                    score += grazePoints;
                    updateScore(score);
                    createGrazeSpark(eb.x, eb.y, player.x, player.y, true);
                    createGrazeSpark(eb.x, eb.y, player.x, player.y, true);
                    if (totalTime - lastGrazeSoundTime > Balance.GRAZE.SOUND_THROTTLE) {
                        audioSys.play('hyperGraze');
                        lastGrazeSoundTime = totalTime;
                    }
                } else {
                    grazeCount += grazeBonus;
                    if (G.RankSystem) G.RankSystem.onGraze();
                    const meterGain = isCloseGraze ? Balance.GRAZE.METER_GAIN_CLOSE : Balance.GRAZE.METER_GAIN;
                    grazeMeter = Math.min(100, grazeMeter + meterGain);
                    grazeMultiplier = 1 + (grazeMeter / Balance.GRAZE.MULT_DIVISOR) * (Balance.GRAZE.MULT_MAX - 1);
                    const grazePoints = Math.floor(Balance.GRAZE.POINTS_BASE * grazeMultiplier * grazeBonus);
                    score += grazePoints;
                    updateScore(score);
                    createGrazeSpark(eb.x, eb.y, player.x, player.y, isCloseGraze);
                    if (isCloseGraze) applyHitStop('CLOSE_GRAZE', true);
                    const soundThrottle = Balance.GRAZE.SOUND_THROTTLE || 0.1;
                    if (totalTime - lastGrazeSoundTime > soundThrottle) {
                        audioSys.play(isCloseGraze ? 'grazeNearMiss' : 'graze');
                        lastGrazeSoundTime = totalTime;
                    }
                    if (grazeCount > 0 && grazeCount % 10 === 0) audioSys.play('grazeStreak');
                    if (grazeCount > 0 && grazeCount % Balance.GRAZE.PERK_THRESHOLD === 0) {
                        if (grazePerksThisLevel < Balance.GRAZE.MAX_PERKS_PER_LEVEL) {
                            applyRandomPerk();
                            audioSys.play('grazePerk');
                            G.MemeEngine.queueMeme('GRAZE', t('GRAZE_BONUS'), 'GRAZE');
                            grazePerksThisLevel++;
                        } else {
                            score += 500;
                            updateScore(score);
                            showGameInfo("+500 " + t('GRAZE_MASTER'));
                        }
                    }
                    if (grazeMeter >= Balance.HYPER.METER_THRESHOLD && player.hyperCooldown <= 0) {
                        if (Balance.HYPER.AUTO_ACTIVATE && player.canActivateHyper && player.canActivateHyper(grazeMeter)) {
                            player.activateHyper();
                            grazeMeter = 0;
                            updateGrazeUI();
                            triggerScreenFlash('HYPER_ACTIVATE');
                        } else if (!player.hyperAvailable) {
                            player.hyperAvailable = true;
                            showGameInfo(t('HYPER_READY') + " [H]");
                            audioSys.play('hyperReady');
                        }
                    }
                }
                updateGrazeUI();
            },
            // Enemy hit (but not killed)
            onEnemyHit(e, bullet, shouldDie) {
                audioSys.play('hitEnemy');
                const sparkColor = bullet.color || player.stats?.color || '#fff';
                _sparkOpts.shotLevel = player.shotLevel || 1;
                _sparkOpts.hasPower = player.modifiers?.power?.level > 0;
                _sparkOpts.isKill = shouldDie;
                _sparkOpts.isHyper = player.isHyperActive && player.isHyperActive();
                createBulletSpark(e.x, e.y, sparkColor, _sparkOpts);
            },
            // Enemy killed
            onEnemyKilled(e, bullet, enemyIdx, enemies) {
                audioSys.play('coinScore');
                applyHitStop('ENEMY_KILL', true);
                if (G.RankSystem) G.RankSystem.onKill();

                // Kill streak
                const now = totalTime;
                if (now - lastKillTime < Balance.SCORE.STREAK_TIMEOUT) {
                    killStreak++;
                    killStreakMult = Math.min(Balance.SCORE.STREAK_MULT_MAX, 1 + killStreak * Balance.SCORE.STREAK_MULT_PER_KILL);
                    if (killStreak === 10) { applyHitStop('STREAK_10', false); triggerScreenFlash('STREAK_10'); triggerScoreStreakColor(10); }
                    else if (killStreak === 25) { applyHitStop('STREAK_25', false); triggerScreenFlash('STREAK_25'); triggerScoreStreakColor(25); }
                    else if (killStreak === 50) { applyHitStop('STREAK_50', false); triggerScreenFlash('STREAK_50'); triggerScoreStreakColor(50); }
                } else {
                    killStreak = 1;
                    killStreakMult = 1.0;
                }
                lastKillTime = now;

                // Score calculation
                const perkMult = (runState && runState.getMod) ? runState.getMod('scoreMult', 1) : 1;
                const bearMult = isBearMarket ? Balance.SCORE.BEAR_MARKET_MULT : 1;
                const grazeKillBonus = grazeMeter >= Balance.SCORE.GRAZE_KILL_THRESHOLD ? Balance.SCORE.GRAZE_KILL_BONUS : 1;
                const hyperMult = (player.isHyperActive && player.isHyperActive()) ? Balance.HYPER.SCORE_MULT : 1;
                const isLastEnemy = enemies.length === 0;
                const lastEnemyMult = isLastEnemy && G.HarmonicConductor ? G.HarmonicConductor.getLastEnemyBonus() : 1;
                const sacrificeMult = sacrificeState === 'ACTIVE' ? Balance.SACRIFICE.SCORE_MULT : 1;
                const killScore = Math.floor(e.scoreVal * bearMult * perkMult * killStreakMult * grazeKillBonus * hyperMult * lastEnemyMult * sacrificeMult);
                score += killScore;
                updateScore(score);
                if (sacrificeState === 'ACTIVE') sacrificeScoreEarned += killScore;
                createFloatingScore(killScore, e.x, e.y - 20);

                if (isLastEnemy && lastEnemyMult > 1) {
                    applyHitStop('STREAK_25', false);
                    triggerScreenFlash('STREAK_25');
                    showGameInfo("💀 " + t('LAST_FIAT') + " x" + lastEnemyMult.toFixed(0));
                }

                createEnemyDeathExplosion(e.x, e.y, e.color, e.symbol || '$', e.shape);
                createScoreParticles(e.x, e.y, e.color);

                // Multi-kill
                _frameKills++;
                if (_frameKills >= 2) {
                    triggerScreenFlash('MULTI_KILL');
                    applyHitStop('STREAK_10', false);
                }
                if (Balance?.isStrongTier && Balance.isStrongTier(e.symbol)) {
                    const vfx = Balance?.VFX || {};
                    shake = Math.max(shake, vfx.STRONG_KILL_SHAKE || 3);
                }

                killCount++;
                streak++;
                if (streak > bestStreak) bestStreak = streak;
                if (G.Debug) G.Debug.trackKillStreak(streak);
                updateKillCounter();
                checkStreakMeme();
                emitEvent('enemy_killed', { score: killScore, x: e.x, y: e.y });

                // Mini-boss trigger
                if (!(G.CampaignState && G.CampaignState.isEnabled()) && e.symbol && fiatKillCounter[e.symbol] !== undefined && !miniBoss && !boss && !e.isMinion && bossWarningTimer <= 0 && (totalTime - lastMiniBossSpawnTime) >= Balance.MINI_BOSS.COOLDOWN && miniBossThisWave < (Balance.MINI_BOSS.MAX_PER_WAVE || 2)) {
                    fiatKillCounter[e.symbol]++;
                    const mapping = Balance.MINI_BOSS.CURRENCY_BOSS_MAP?.[e.symbol];
                    const threshold = mapping?.threshold || Balance.MINI_BOSS.KILL_THRESHOLD;
                    G.Debug.log('MINIBOSS', `Kill ${e.symbol}: ${fiatKillCounter[e.symbol]}/${threshold}`);
                    if (fiatKillCounter[e.symbol] >= threshold) {
                        let bossType = mapping?.boss || 'FEDERAL_RESERVE';
                        if (bossType === 'RANDOM') {
                            const rotation = G.BOSS_ROTATION || ['FEDERAL_RESERVE', 'BCE', 'BOJ'];
                            bossType = rotation[Math.floor(Math.random() * rotation.length)];
                        } else if (bossType === 'CYCLE_BOSS') {
                            const rotation = G.BOSS_ROTATION || ['FEDERAL_RESERVE', 'BCE', 'BOJ'];
                            bossType = rotation[(marketCycle - 1) % rotation.length];
                        }
                        G.Debug.trackMiniBossSpawn(bossType, e.symbol, fiatKillCounter[e.symbol]);
                        G.Debug._miniBossStartInfo = { type: bossType, trigger: e.symbol, killCount: fiatKillCounter[e.symbol], startTime: Date.now() };
                        lastMiniBossSpawnTime = totalTime;
                        miniBossThisWave++;
                        spawnMiniBoss(bossType, e.color);
                        Object.keys(fiatKillCounter).forEach(k => fiatKillCounter[k] = 0);
                    }
                }

                // Drop logic
                const useEvolution = !!(Balance.WEAPON_EVOLUTION && player.shotLevel);
                const dropInfo = G.DropSystem.tryEnemyDrop(e.symbol, e.x, e.y, totalTime, useEvolution ? buildPlayerState() : getUnlockedWeapons, useEvolution);
                if (dropInfo) {
                    powerUps.push(new G.PowerUp(dropInfo.x, dropInfo.y, dropInfo.type));
                    if (G.Debug) G.Debug.trackDropSpawned(dropInfo.type, dropInfo.category, 'enemy');
                }
            },
            // Boss hit by player bullet
            onBossHit(bullet, dmg, boss, bIdx, bArr) {
                audioSys.play('hitEnemy');
                // Boss drops
                const useEvolutionBoss = !!(Balance.WEAPON_EVOLUTION && player.shotLevel);
                const bossDropInfo = G.DropSystem.tryBossDrop(
                    boss.x + boss.width / 2, boss.y + boss.height, totalTime,
                    useEvolutionBoss ? buildPlayerState() : getUnlockedWeapons,
                    useEvolutionBoss
                );
                if (bossDropInfo) {
                    powerUps.push(new G.PowerUp(bossDropInfo.x, bossDropInfo.y, bossDropInfo.type));
                    audioSys.play('coinPerk');
                    if (G.Debug) G.Debug.trackDropSpawned(bossDropInfo.type, bossDropInfo.category, 'boss');
                }
            },
            // Boss killed
            onBossDeath(deadBoss) {
                const defeatedBossType = deadBoss.bossType || 'FEDERAL_RESERVE';
                const defeatedBossName = deadBoss.name || 'THE FED';
                const bossX = deadBoss.x + deadBoss.width / 2;
                const bossY = deadBoss.y + deadBoss.height / 2;
                createBossDeathExplosion(bossX, bossY);
                applyHitStop('BOSS_DEFEAT', false);
                triggerScreenFlash('BOSS_DEFEAT');
                if (G.TransitionManager) G.TransitionManager.startFadeOut(0.8, '#ffffff');
                const bossBonus = Balance.SCORE.BOSS_DEFEAT_BASE + (marketCycle * Balance.SCORE.BOSS_DEFEAT_PER_CYCLE);
                score += bossBonus;
                createFloatingScore(bossBonus, bossX, bossY - 50);
                boss.active = false; boss = null; window.boss = null; shake = 60; audioSys.play('explosion');
                audioSys.setBossPhase(0);
                enemyBullets.forEach(b => G.Bullet.Pool.release(b));
                enemyBullets.length = 0;
                window.enemyBullets = enemyBullets;
                bossJustDefeated = true;
                enemies.length = 0;
                G.enemies = enemies;
                if (G.HarmonicConductor) G.HarmonicConductor.enemies = enemies;
                if (miniBoss) { miniBoss.active = false; miniBoss = null; if (waveMgr) waveMgr.miniBossActive = false; }
                updateScore(score);
                showVictory("🏆 " + defeatedBossName + ' ' + t('DEFEATED'));
                const victoryMemes = { 'FEDERAL_RESERVE': "💥 INFLATION CANCELLED!", 'BCE': "💥 FRAGMENTATION COMPLETE!", 'BOJ': "💥 YEN LIBERATED!" };
                G.MemeEngine.queueMeme('BOSS_DEFEATED', victoryMemes[defeatedBossType] || "CENTRAL BANK DESTROYED!", defeatedBossName);
                console.log(`[BOSS DEFEATED] ${defeatedBossType} at level=${level}, cycle=${marketCycle}, wave=${waveMgr.wave}`);
                G.Debug.trackBossDefeat(defeatedBossType, level, marketCycle);
                if (G.Debug) { G.Debug.trackBossFightEnd(defeatedBossType, marketCycle); G.Debug.trackCycleEnd(marketCycle, Math.floor(score)); }
                marketCycle++;
                window.marketCycle = marketCycle;
                console.log(`[BOSS DEFEATED] Cycle incremented to ${marketCycle}, calling waveMgr.reset()`);
                G.Debug.trackCycleUp(marketCycle);
                if (G.Debug) G.Debug.trackCycleStart(marketCycle);
                checkWeaponUnlocks(marketCycle);
                waveMgr.reset();
                fiatKillCounter = { '¥': 0, '₽': 0, '₹': 0, '€': 0, '£': 0, '₣': 0, '₺': 0, '$': 0, '元': 0, 'Ⓒ': 0 };
                if (G.HarmonicConductor) { G.HarmonicConductor.reset(); G.HarmonicConductor.setDifficulty(level, marketCycle, isBearMarket); }
                const campaignState2 = G.CampaignState;
                const campaignComplete = !!(campaignState2 && campaignState2.isEnabled() && defeatedBossType === 'BOJ');
                const chapterId = G.BOSS_TO_CHAPTER && G.BOSS_TO_CHAPTER[defeatedBossType];
                const shouldShowChapter = chapterId && shouldShowStory(chapterId);
                if (campaignComplete && shouldShowChapter) {
                    showStoryScreen(chapterId, () => { showCampaignVictory(); });
                } else if (campaignComplete) {
                    showCampaignVictory();
                } else if (shouldShowChapter) {
                    showStoryScreen(chapterId, () => { startIntermission(t('CYCLE') + ' ' + marketCycle + ' ' + t('BEGINS')); });
                } else {
                    startIntermission(t('CYCLE') + ' ' + marketCycle + ' ' + t('BEGINS'));
                }
                emitEvent('boss_killed', { level: level, cycle: marketCycle, bossType: defeatedBossType, campaignComplete: campaignComplete });
                const bossDefeatPool = G.DIALOGUES && G.DIALOGUES.BOSS_DEFEAT && G.DIALOGUES.BOSS_DEFEAT[defeatedBossType];
                if (bossDefeatPool && bossDefeatPool.length > 0) {
                    const bossQuote = bossDefeatPool[Math.floor(Math.random() * bossDefeatPool.length)];
                    const quoteText = (typeof bossQuote === 'string' ? bossQuote : (bossQuote && bossQuote.text)) || '';
                    if (quoteText) G.MemeEngine.queueMeme('BOSS_DEFEATED', '\u201C' + quoteText + '\u201D', defeatedBossName);
                }
            },
            // Bullet cancel (player bullet vs enemy bullet)
            onBulletCancel(pb, eb, pbIdx, ebIdx, pbArr, ebArr) {
                createBulletSpark(eb.x, eb.y);
                eb.markedForDeletion = true;
                G.Bullet.Pool.release(eb);
                ebArr.splice(ebIdx, 1);
                bulletCancelStreak += 1;
                bulletCancelTimer = Balance.PERK.CANCEL_WINDOW;
                if (bulletCancelStreak >= Balance.PERK.BULLET_CANCEL_COUNT) {
                    bulletCancelStreak = 0;
                    applyRandomPerk();
                }
                if (!pb.penetration) {
                    pb.markedForDeletion = true;
                    G.Bullet.Pool.release(pb);
                    pbArr.splice(pbIdx, 1);
                }
            }
        }
    });
}

function checkWeaponUnlocks(cycle) {
    if (cycle > maxCycleReached) {
        maxCycleReached = cycle;
        localStorage.setItem('fiat_maxcycle', maxCycleReached);
        // Check for new unlocks
        for (const [weapon, reqCycle] of Object.entries(WEAPON_UNLOCK_CYCLE)) {
            if (reqCycle === cycle) {
                showGameInfo(t('WEAPON_UNLOCK') + ' ' + weapon + '!');
                if (G.Audio) G.Audio.play('levelUp');
            }
        }
    }
}

let boss = null;
let lives = window.Game.Balance.PLAYER.START_LIVES;
let shake = 0, gridDir = 1, gridSpeed = 25, intermissionTimer = 0;
// Screen transition moved to TransitionManager.js
let currentShipIdx = 0;
let lastWavePattern = 'RECT';
let perkChoiceActive = false;
let intermissionMeme = ""; // Meme shown during countdown
let lastCountdownNumber = 0; // Track countdown to trigger audio once per number
let debugMode = false; // F3 toggle for performance stats
let fpsHistory = []; // For smooth FPS display
let perkOffers = [];
let volatilityTimer = 0;
let memeSwapTimer = 0;
// v2.22.5: Expose boss and miniBoss for debug overlay
window.boss = null;
window.miniBoss = null;
// v2.22.6: Defensive flag to ensure no ghost bullets persist after boss death
let bossJustDefeated = false;
// --- BALANCE CONFIG ALIASES (for cleaner code) ---
const Balance = window.Game.Balance;

// --- PERK PAUSE SYSTEM ---
let perkPauseTimer = 0;       // When > 0, game is paused for perk display
let perkPauseData = null;     // Data about the perk being displayed

// --- BOSS WARNING SYSTEM ---
let bossWarningTimer = 0;     // When > 0, showing boss warning
let bossWarningType = null;   // Boss type to spawn after warning

let miniBoss = null; // Special boss spawned from kill counter

// Drop system now managed by G.DropSystem singleton
// Boss fight drops also managed by G.DropSystem

// --- v4.28.0: Per-run variables now live in RunState ---
// Aliases for backward compat (avoid massive find-replace in all logic)
// These properties delegate to runState.xxx
let score, level, totalTime, killCount, streak, bestStreak;
let killStreak, killStreakMult, lastKillTime, lastScoreMilestone;
let grazeCount, grazeMeter, grazeMultiplier, grazePerksThisLevel, lastGrazeSoundTime, lastGrazeTime;
let bulletCancelStreak, bulletCancelTimer, perkCooldown;
let sacrificeState, sacrificeDecisionTimer, sacrificeActiveTimer, sacrificeScoreAtStart;
let sacrificesUsedThisRun, sacrificeScoreEarned, sacrificeGhostTrail;
let fiatKillCounter, lastMiniBossSpawnTime, miniBossThisWave;
let waveStartTime, _frameKills, _hyperAmbientTimer, marketCycle;

// Sync local aliases FROM RunState (call after runState.reset())
function syncFromRunState() {
    score = runState.score;
    level = runState.level;
    totalTime = runState.totalTime;
    killCount = runState.killCount;
    streak = runState.streak;
    bestStreak = runState.bestStreak;
    killStreak = runState.killStreak;
    killStreakMult = runState.killStreakMult;
    lastKillTime = runState.lastKillTime;
    lastScoreMilestone = runState.lastScoreMilestone;
    grazeCount = runState.grazeCount;
    grazeMeter = runState.grazeMeter;
    grazeMultiplier = runState.grazeMultiplier;
    grazePerksThisLevel = runState.grazePerksThisLevel;
    lastGrazeSoundTime = runState.lastGrazeSoundTime;
    lastGrazeTime = runState.lastGrazeTime;
    bulletCancelStreak = runState.bulletCancelStreak;
    bulletCancelTimer = runState.bulletCancelTimer;
    perkCooldown = runState.perkCooldown;
    sacrificeState = runState.sacrificeState;
    sacrificeDecisionTimer = runState.sacrificeDecisionTimer;
    sacrificeActiveTimer = runState.sacrificeActiveTimer;
    sacrificeScoreAtStart = runState.sacrificeScoreAtStart;
    sacrificesUsedThisRun = runState.sacrificesUsedThisRun;
    sacrificeScoreEarned = runState.sacrificeScoreEarned;
    sacrificeGhostTrail = runState.sacrificeGhostTrail;
    fiatKillCounter = runState.fiatKillCounter;
    lastMiniBossSpawnTime = runState.lastMiniBossSpawnTime;
    miniBossThisWave = runState.miniBossThisWave;
    waveStartTime = runState.waveStartTime;
    _frameKills = runState._frameKills;
    _hyperAmbientTimer = runState._hyperAmbientTimer;
    marketCycle = runState.marketCycle;
    // Expose globals for WaveManager & debug
    window.marketCycle = marketCycle;
    window.currentLevel = level;
    window.fiatKillCounter = fiatKillCounter;
}

// Initial sync
syncFromRunState();

// --- DIFFICULTY SYSTEM ---
// Single unified difficulty multiplier (0.0 = Level 1, capped at MAX_DIFFICULTY)
// Cached per-frame for performance (avoid recalculating in enemy loops)
let cachedDifficulty = 0;
let cachedGridSpeed = 0;

function getDifficulty() {
    return cachedDifficulty;
}

function _calculateDifficulty() {
    return Balance.calculateDifficulty(level, marketCycle);
}

// Call once per frame to update cached values
function updateDifficultyCache() {
    cachedDifficulty = _calculateDifficulty();
    cachedGridSpeed = Balance.calculateGridSpeed(cachedDifficulty, isBearMarket);
}

// Dynamic grid speed based on difficulty (uses cache)
function getGridSpeed() {
    return cachedGridSpeed;
}

const ui = {};

// --- HELPER FUNCTIONS ---
function t(key) { return Constants.TEXTS[currentLang][key] || key; }

// v2.24.6: Global bullet cap check (prevents runaway patterns like BOJ mini-boss)
function canSpawnEnemyBullet() {
    const cap = Balance.PATTERNS?.GLOBAL_BULLET_CAP || 150;
    return enemyBullets.length < cap;
}

// Juicy score update with bump effect
function updateScore(newScore) {
    const oldScore = score;
    score = newScore;
    const el = document.getElementById('scoreVal');
    if (el) {
        el.textContent = Math.floor(score);
        el.classList.remove('score-bump');
        void el.offsetWidth; // Force reflow
        el.classList.add('score-bump');
    }

    // Score pulse on milestone crossing (Ikeda juice)
    const threshold = Balance.JUICE?.SCORE_PULSE?.THRESHOLD || 10000;
    const currentMilestone = Math.floor(score / threshold);
    const previousMilestone = Math.floor(oldScore / threshold);
    if (currentMilestone > previousMilestone && currentMilestone > lastScoreMilestone) {
        lastScoreMilestone = currentMilestone;
        triggerScorePulse();
    }
}

// Trigger score pulse effect (delegates to EffectsRenderer)
function triggerScorePulse() {
    if (G.EffectsRenderer) G.EffectsRenderer.triggerScorePulse();
}
// DOM cache to avoid getElementById in hot path
var _domCache = {};
function _cachedEl(id) { return _domCache[id] || (_domCache[id] = document.getElementById(id) || ui[id]); }
function setStyle(id, prop, val) { var el = _cachedEl(id); if (el) el.style[prop] = val; }
function setUI(id, val) { var el = _cachedEl(id); if (el) el.innerText = val; }
function emitEvent(name, payload) { if (events && events.emit) events.emit(name, payload); }
function _countActive(arr) { var c = 0; for (var i = 0, len = arr.length; i < len; i++) { if (arr[i] && arr[i].life > 0) c++; } return c; }

// Shield button radial indicator update
var _shieldBtn = null, _shieldProgress = null, _shieldCached = false;
function updateShieldButton(player) {
    if (!_shieldCached) { _shieldBtn = document.getElementById('t-shield'); _shieldCached = true; }
    var btn = _shieldBtn;
    if (!btn) return;

    var progressCircle = _shieldProgress || (_shieldProgress = btn.querySelector('.shield-radial-progress'));
    const COOLDOWN_MAX = 10.0;
    const CIRCUMFERENCE = 188.5; // 2 * PI * 30

    btn.classList.remove('ready', 'active', 'cooldown');

    if (player.shieldActive) {
        btn.classList.add('active');
        if (progressCircle) progressCircle.style.strokeDashoffset = '0';
    } else if (player.shieldCooldown > 0) {
        btn.classList.add('cooldown');
        const progress = 1 - (player.shieldCooldown / COOLDOWN_MAX);
        const offset = CIRCUMFERENCE * (1 - progress);
        if (progressCircle) progressCircle.style.strokeDashoffset = String(offset);
    } else {
        btn.classList.add('ready');
        if (progressCircle) progressCircle.style.strokeDashoffset = '0';
    }
}

// v4.0.4: HYPER button state update (mirrors shield button pattern)
var _hyperBtn = null, _hyperProgress = null, _hyperCached = false;
function updateHyperButton(player, grazeMeter) {
    if (!_hyperCached) { _hyperBtn = document.getElementById('t-hyper'); _hyperCached = true; }
    var btn = _hyperBtn;
    if (!btn) return;

    // v4.21: Hide HYPER button when auto-activate is enabled (no manual input needed)
    if (Balance.HYPER.AUTO_ACTIVATE) {
        btn.classList.remove('visible');
        return;
    }

    // Show only on touch devices (legacy manual mode)
    if ('ontouchstart' in window && gameState === 'PLAY') {
        btn.classList.add('visible');
    } else {
        btn.classList.remove('visible');
        return;
    }

    var progressCircle = _hyperProgress || (_hyperProgress = btn.querySelector('.hyper-radial-progress'));
    const CIRCUMFERENCE = 188.5;
    const threshold = Balance.HYPER?.METER_THRESHOLD || 100;

    btn.classList.remove('ready', 'active');

    if (player.isHyperActive && player.isHyperActive()) {
        btn.classList.add('active');
        if (progressCircle) progressCircle.style.strokeDashoffset = '0';
    } else if (player.canActivateHyper && player.canActivateHyper(grazeMeter)) {
        btn.classList.add('ready');
        if (progressCircle) progressCircle.style.strokeDashoffset = '0';
    } else {
        // Show meter fill progress
        const progress = Math.min(1, grazeMeter / threshold);
        const offset = CIRCUMFERENCE * (1 - progress);
        if (progressCircle) progressCircle.style.strokeDashoffset = String(offset);
    }
}

// Meme functions delegate to MemeEngine singleton
function getRandomMeme() { return G.MemeEngine.getRandomMeme(); }
function getFiatDeathMeme() { return G.MemeEngine.getEnemyDeathMeme(); }
function getPowellMeme() { return G.MemeEngine.getPowellMeme(); }
function getBossMeme(bossType) { return G.MemeEngine.getBossMeme(bossType); }

function pushScoreTicker(text) {
    if (!ui.scoreTicker) return;
    const span = document.createElement('span');
    span.className = 'tick';
    span.textContent = text;
    ui.scoreTicker.appendChild(span);
    setTimeout(() => {
        if (span.parentNode) span.parentNode.removeChild(span);
    }, 1200);
}

function updateKillCounter() {
    const el = document.getElementById('killNum');
    if (!el) return;
    el.textContent = killCount;
    el.classList.add('pulse');
    setTimeout(() => el.classList.remove('pulse'), 100);
}

// Streak milestones - only impactful moments (10, 25, 50)
const STREAK_MEMES = [
    { at: 10, text: "🐋 WHALE ALERT!" },
    { at: 25, text: "💎 DIAMOND HANDS!" },
    { at: 50, text: "👑 SATOSHI REBORN!" }
];

function checkStreakMeme() {
    // Only major streak milestones - no random memes
    const meme = STREAK_MEMES.find(m => m.at === streak);
    if (meme) {
        G.MemeEngine.queueMeme('STREAK', meme.text, 'STREAK');
    }
}

// PowerUp memes - crypto-themed feedback
const POWERUP_MEMES = {
    // Legacy weapon types
    WIDE: "🔱 SPREAD THE FUD",
    NARROW: "🎯 LASER EYES",
    FIRE: "🔥 BURN THE FIAT",
    RAPID: "🚀 TO THE MOON",

    // WEAPON EVOLUTION v3.0 types
    UPGRADE: "⬆️ LEVEL UP!",
    RATE: "⚡ FIRE RATE++",
    POWER: "💥 POWER++",
    SPREAD: "🔱 SPREAD++",
    HOMING: "🎯 HEAT SEEKING",
    PIERCE: "🔥 PENETRATING",
    LASER: "⚡ BEAM MODE",
    MISSILE: "🚀 WARHEAD ARMED",
    SHIELD: "🛡️ HODL MODE",
    SPEED: "💨 ZOOM OUT"
};

// ============================================
// MESSAGE SYSTEM - Visual Categories
// ============================================

// Message system moved to MessageSystem.js

// Message functions - delegate to MessageSystem
function showMemeFun(text, duration = 1500) {
    if (G.MessageSystem) G.MessageSystem.showMemeFun(text, duration);
}
function showPowerUp(text) {
    if (G.MessageSystem) G.MessageSystem.showPowerUp(text);
}
function showGameInfo(text) {
    if (G.MessageSystem) G.MessageSystem.showGameInfo(text);
}
function showDanger(text) {
    if (G.MessageSystem) G.MessageSystem.showDanger(text, 20);
    else shake = Math.max(shake, 20); // Fallback shake
}
function showVictory(text) {
    if (G.MessageSystem) G.MessageSystem.showVictory(text);
}
function showMemePopup(text, duration = 1500) {
    if (G.MessageSystem) G.MessageSystem.showMemePopup(text, duration);
}
function updateTypedMessages(dt) {
    if (G.MessageSystem) G.MessageSystem.update(dt);
}
function drawTypedMessages(ctx) {
    const playerPos = player ? { x: player.x, y: player.y } : null;
    if (G.MessageSystem) G.MessageSystem.draw(ctx, totalTime, playerPos);
}

function canOfferPerk(perk) {
    if (!runState || !runState.perkStacks) return true;
    const stacks = runState.perkStacks[perk.id] || 0;
    const maxStacks = perk.maxStacks || 1;
    if (perk.stackable) return stacks < maxStacks;
    return stacks === 0;
}

function rollWeighted(pool) {
    if (!pool || pool.length === 0) return null;
    let totalWeight = 0;
    pool.forEach(p => { totalWeight += (p.weight || 1); });
    let r = Math.random() * totalWeight;
    for (let i = 0; i < pool.length; i++) {
        r -= (pool[i].weight || 1);
        if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
}

function pickPerkOffers(count) {
    const basePool = (G.UPGRADES || []).filter(canOfferPerk);
    if (basePool.length === 0) return [];
    const picks = [];

    const rarePool = basePool.filter(p => p.rarity === 'rare' || p.rarity === 'epic');
    const includeRare = runState && runState.pityCounter >= 2 && rarePool.length > 0;
    if (includeRare) {
        const picked = rollWeighted(rarePool);
        if (picked) picks.push(picked);
    }

    const pool = basePool.filter(p => !picks.includes(p));
    for (let i = picks.length; i < count && pool.length > 0; i++) {
        const picked = rollWeighted(pool);
        if (!picked) break;
        picks.push(picked);
        const idx = pool.indexOf(picked);
        if (idx !== -1) pool.splice(idx, 1);
    }
    return picks;
}

let recentPerks = []; // Track last 3 perks acquired

function renderPerkBar(highlightId) {
    // Perk bar disabled - cleaner UI
    if (ui.perkBar) ui.perkBar.style.display = 'none';
}

function openPerkChoice() {
    if (!ui.perkModal || !ui.perkOptions) return;
    if (!G.UPGRADES || G.UPGRADES.length === 0) return;
    perkChoiceActive = true;
    setStyle('perk-modal', 'display', 'flex');

    perkOffers = pickPerkOffers(3);
    if (perkOffers.length === 0) {
        closePerkChoice();
        return;
    }
    ui.perkOptions.innerHTML = '';
    perkOffers.forEach(perk => {
        const btn = document.createElement('button');
        const rarityClass = perk.rarity ? `rarity-${perk.rarity}` : '';
        btn.className = `perk-card ${rarityClass}`.trim();
        btn.innerHTML = `<div class="perk-name">${perk.icon || ''} ${perk.name}</div>
            <div class="perk-desc">${perk.desc}</div>
            <div class="perk-rarity">${perk.rarity || 'common'}</div>`;
        btn.addEventListener('click', () => applyPerk(perk));
        ui.perkOptions.appendChild(btn);
    });
}

function closePerkChoice() {
    perkChoiceActive = false;
    setStyle('perk-modal', 'display', 'none');
    if (runState && runState.pityCounter === undefined) runState.pityCounter = 0;
}

function applyPerk(perk) {
    if (!perk) return;
    const prevMax = player.maxHp;
    if (perk.apply && runState) perk.apply(runState);
    if (runState) {
        runState.perks.push(perk.id);
        runState.perkStacks[perk.id] = (runState.perkStacks[perk.id] || 0) + 1;
    }

    // Track for display (last 3)
    const stacks = runState ? (runState.perkStacks[perk.id] || 1) : 1;
    const existing = recentPerks.find(p => p.id === perk.id);
    if (existing) {
        existing.stacks = stacks;
        // Move to end (most recent)
        recentPerks = recentPerks.filter(p => p.id !== perk.id);
        recentPerks.push(existing);
    } else {
        recentPerks.push({ id: perk.id, stacks: stacks });
    }

    // 1-hit = 1-life system: HP bonuses no longer affect gameplay
    // player.maxHp and player.hp remain at 1
    audioSys.play('perk');
    addPerkIcon(perk); // Visual glow effect above player
    updateLivesUI();
    renderPerkBar(perk.id);
    emitEvent('perk_selected', { id: perk.id });
    if (runState) {
        if (perk.rarity === 'rare' || perk.rarity === 'epic') runState.pityCounter = 0;
        else runState.pityCounter += 1;
    }
    closePerkChoice();
}

function applyRandomPerk() {
    if (!G.UPGRADES || G.UPGRADES.length === 0) return;
    if (perkCooldown > 0) return; // On cooldown, skip
    const offers = pickPerkOffers(1);
    if (!offers || offers.length === 0) return;

    const perk = offers[0];
    applyPerk(perk);
    perkCooldown = Balance.PERK.COOLDOWN_TIME; // Start cooldown
    audioSys.play('perk'); // Play perk sound
    // Perk icon appears above ship via addPerkIcon() called in applyPerk()
}

// --- INTRO SHIP ANIMATION & SELECTION ---
let introShipCanvas = null;
let introShipCtx = null;
let introShipTime = 0;
let selectedShipIndex = 0;
let introState = 'SPLASH'; // 'SPLASH' or 'SELECTION'
const SHIP_KEYS = ['BTC', 'ETH', 'SOL'];
const SHIP_DISPLAY = {
    // hit = hitbox rating (higher = smaller hitbox = easier to dodge)
    BTC: { name: 'BTC STRIKER', color: '#F7931A', symbol: 'B', spd: 6, pwr: 7, hit: 5 },
    ETH: { name: 'ETH HEAVY', color: '#8c7ae6', symbol: 'E', spd: 4, pwr: 8, hit: 3 },
    SOL: { name: 'SOL SPEEDSTER', color: '#00d2d3', symbol: 'S', spd: 9, pwr: 5, hit: 8 }
};

function initIntroShip() {
    introShipCanvas = document.getElementById('intro-ship-canvas');
    if (!introShipCanvas) return;
    introShipCtx = introShipCanvas.getContext('2d');
    updateShipUI();
    animateIntroShip();
}

// --- INTRO SHIP INIT (unified) ---
function initSplashShip() {
    // Now uses the same canvas as selection
    initIntroShip();
}

// --- STATE TRANSITIONS ---
window.enterSelectionState = function() {
    if (introState === 'SELECTION') return;
    introState = 'SELECTION';
    audioSys.play('coinUI');

    // Hide splash elements
    const title = document.getElementById('intro-title');
    const modeSelector = document.getElementById('mode-selector');
    const introVersion = document.querySelector('.intro-version');
    const modeExpl = document.getElementById('mode-explanation');
    if (title) title.classList.add('hidden');
    if (modeSelector) modeSelector.classList.add('hidden');
    if (introVersion) introVersion.style.display = 'none';
    if (modeExpl) modeExpl.classList.add('hidden');
    // Hide PWA install banner when entering selection
    setStyle('pwa-install-banner', 'display', 'none');

    // Show selection elements
    const header = document.getElementById('selection-header');
    const info = document.getElementById('selection-info');
    const modeIndicator = document.getElementById('current-mode-indicator');
    const scoreRow = document.getElementById('selection-score-row');
    const arrowLeft = document.getElementById('arrow-left');
    const arrowRight = document.getElementById('arrow-right');
    const shipArea = document.querySelector('.ship-area');

    if (header) header.style.display = 'block';
    if (info) info.style.display = 'block';
    if (modeIndicator) modeIndicator.style.display = 'flex';
    if (scoreRow) scoreRow.style.display = 'flex';
    if (arrowLeft) arrowLeft.classList.add('visible');
    if (arrowRight) arrowRight.classList.add('visible');
    if (shipArea) shipArea.classList.remove('hidden');

    // Update primary action button to LAUNCH state
    updatePrimaryButton('SELECTION');

    // Update badge content
    updateModeIndicator();

    // Update ship display
    updateShipUI();
}

// Go back to mode selection from ship selection
window.goBackToModeSelect = function() {
    if (introState === 'SPLASH') return;
    introState = 'SPLASH';
    audioSys.play('coinUI');

    // Hide selection elements
    const header = document.getElementById('selection-header');
    const info = document.getElementById('selection-info');
    const modeIndicator = document.getElementById('current-mode-indicator');
    const scoreRow = document.getElementById('selection-score-row');
    const arrowLeft = document.getElementById('arrow-left');
    const arrowRight = document.getElementById('arrow-right');

    if (header) header.style.display = 'none';
    if (info) info.style.display = 'none';
    if (modeIndicator) modeIndicator.style.display = 'none';
    if (scoreRow) scoreRow.style.display = 'none';
    if (arrowLeft) arrowLeft.classList.remove('visible');
    if (arrowRight) arrowRight.classList.remove('visible');

    // Show splash elements
    const title = document.getElementById('intro-title');
    const modeSelector = document.getElementById('mode-selector');
    const introVersion = document.querySelector('.intro-version');
    const modeExpl = document.getElementById('mode-explanation');
    const shipArea = document.querySelector('.ship-area');
    if (title) title.classList.remove('hidden');
    if (modeSelector) modeSelector.classList.remove('hidden');
    if (introVersion) introVersion.style.display = 'block';
    if (modeExpl) modeExpl.classList.remove('hidden');
    if (shipArea) shipArea.classList.add('hidden');

    // Update primary action button to TAP TO START state
    updatePrimaryButton('SPLASH');
}

// Handle primary action button click (unified for both states)
window.handlePrimaryAction = function() {
    if (introState === 'SPLASH') {
        enterSelectionState();
    } else {
        launchShipAndStart();
    }
}

// Update primary button appearance based on state
function updatePrimaryButton(state) {
    const btn = document.getElementById('btn-primary-action');
    if (!btn) return;

    if (state === 'SELECTION') {
        btn.classList.add('launch-state');
        btn.innerHTML = '🚀 ' + t('LAUNCH');
    } else {
        btn.classList.remove('launch-state');
        btn.innerHTML = t('TAP_START');
    }
}

// Update the mode indicator in selection screen
function updateModeIndicator() {
    const campaignState = G.CampaignState;
    const isStory = campaignState && campaignState.isEnabled();

    const modeText = document.getElementById('mode-indicator-text');
    const hint = document.getElementById('mode-indicator-hint');
    const scoreLabel = document.getElementById('score-row-label');
    const scoreValue = document.getElementById('badge-score-value');

    if (modeText) {
        modeText.innerText = isStory ? (t('MODE_STORY') || t('CAMPAIGN')) + ' MODE' : t('MODE_ARCADE') + ' MODE';
    }
    if (hint) {
        hint.innerText = t('CHANGE_MODE');
    }
    if (scoreLabel) {
        scoreLabel.innerText = t('HIGH_SCORE');
    }
    if (scoreValue) {
        scoreValue.innerText = highScore.toLocaleString();
    }
}

window.cycleShip = function(dir) {
    selectedShipIndex = (selectedShipIndex + dir + SHIP_KEYS.length) % SHIP_KEYS.length;
    updateShipUI();
    audioSys.play('coinUI');

    // Swap animation
    if (introShipCanvas) {
        introShipCanvas.classList.remove('ship-swap');
        void introShipCanvas.offsetWidth; // Force reflow
        introShipCanvas.classList.add('ship-swap');
    }
}

// --- GAME MODE SELECTION (Arcade vs Campaign) ---
window.setGameMode = function(mode) {
    const campaignState = G.CampaignState;
    const isEnabled = mode === 'campaign';

    // Reset story progress when switching TO Story mode (fixes intermittent start bug)
    if (isEnabled && !campaignState.isEnabled()) {
        campaignState.storyProgress = {
            PROLOGUE: false,
            CHAPTER_1: false,
            CHAPTER_2: false,
            CHAPTER_3: false
        };
    }

    campaignState.setEnabled(isEnabled);

    // Always reset boss defeats when starting Story Mode (v4.11.0)
    // Prevents partial progress from previous sessions carrying over
    if (isEnabled) {
        campaignState.resetCampaign();
    }

    // Update mode selector pills (SPLASH state)
    const storyPill = document.getElementById('mode-pill-story');
    const arcadePill = document.getElementById('mode-pill-arcade');

    if (storyPill) storyPill.classList.toggle('active', isEnabled);
    if (arcadePill) arcadePill.classList.toggle('active', !isEnabled);

    // Update mode explanation (SPLASH state)
    const storyDesc = document.getElementById('mode-story-desc');
    const arcadeDesc = document.getElementById('mode-arcade-desc');
    if (storyDesc) storyDesc.style.display = isEnabled ? 'block' : 'none';
    if (arcadeDesc) arcadeDesc.style.display = isEnabled ? 'none' : 'block';

    // Update mode indicator if in selection state
    if (introState === 'SELECTION') {
        updateModeIndicator();
    }

    audioSys.play('coinUI');
}

function updateCampaignProgressUI() {
    const campaignState = G.CampaignState;
    if (!campaignState) return;

    const slots = {
        'slot-fed': 'FEDERAL_RESERVE',
        'slot-bce': 'BCE',
        'slot-boj': 'BOJ'
    };

    const nextBoss = campaignState.getNextBoss();

    for (const [slotId, bossType] of Object.entries(slots)) {
        const el = document.getElementById(slotId);
        if (!el) continue;

        el.classList.remove('locked', 'defeated', 'current');

        if (campaignState.isBossDefeated(bossType)) {
            el.classList.add('defeated');
        } else if (!campaignState.isBossUnlocked(bossType)) {
            el.classList.add('locked');
        } else if (bossType === nextBoss) {
            el.classList.add('current');
        }
    }
}

function updateShipUI() {
    const key = SHIP_KEYS[selectedShipIndex];
    const ship = SHIP_DISPLAY[key];

    const nameEl = document.getElementById('ship-name');
    const statsEl = document.getElementById('ship-stats');

    if (nameEl) {
        nameEl.textContent = ship.name;
        nameEl.style.color = ship.color;
        // Black outline for readability on any background
        nameEl.style.textShadow = `0 0 10px ${ship.color}, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 8px rgba(0,0,0,0.8)`;
    }

    if (statsEl) {
        // Scale stats to 8-bar display (spd 4-9, pwr 5-8, hit 3-8)
        const spdScaled = Math.round(ship.spd * 0.8);
        const pwrScaled = Math.round(ship.pwr * 0.8);
        const hitScaled = Math.round(ship.hit * 0.8);  // Hitbox: higher = smaller = better
        const spdBar = '█'.repeat(spdScaled) + '░'.repeat(8 - spdScaled);
        const pwrBar = '█'.repeat(pwrScaled) + '░'.repeat(8 - pwrScaled);
        const hitBar = '█'.repeat(hitScaled) + '░'.repeat(8 - hitScaled);
        statsEl.innerHTML = `
            <span class="stat-item">SPD ${spdBar}</span>
            <span class="stat-item">PWR ${pwrBar}</span>
            <span class="stat-item">HIT ${hitBar}</span>
        `;
    }
}

function animateIntroShip() {
    if (!introShipCtx) return;
    introShipTime += 0.05;

    const ctx = introShipCtx;
    const w = introShipCanvas.width;
    const h = introShipCanvas.height;
    const cx = w / 2, cy = h / 2 + 10;

    ctx.clearRect(0, 0, w, h);

    // In SPLASH always show BTC, in SELECTION show selected ship
    const key = (introState === 'SPLASH') ? 'BTC' : SHIP_KEYS[selectedShipIndex];
    const ship = SHIP_DISPLAY[key];
    const scale = 1.6;

    // Hover animation
    const hover = Math.sin(introShipTime * 2) * 6;

    ctx.save();
    ctx.translate(cx, cy + hover);
    ctx.scale(scale, scale);

    // === REACTOR FLAMES (4-layer cell-shaded) ===
    const flameHeight = 25 + Math.sin(introShipTime * 12) * 10;
    const flameWidth = 12 + Math.sin(introShipTime * 10) * 4;
    const pulse = 1 + Math.sin(introShipTime * 8) * 0.15;

    // Outer glow (red)
    ctx.fillStyle = '#cc3300';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(-flameWidth * 1.4 * pulse, 14);
    ctx.lineTo(0, 14 + flameHeight * 1.2);
    ctx.lineTo(flameWidth * 1.4 * pulse, 14);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Main flame (orange)
    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.moveTo(-flameWidth, 14);
    ctx.lineTo(0, 14 + flameHeight);
    ctx.lineTo(flameWidth, 14);
    ctx.closePath();
    ctx.fill();

    // Inner flame (yellow)
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.moveTo(-flameWidth * 0.5, 14);
    ctx.lineTo(0, 14 + flameHeight * 0.65);
    ctx.lineTo(flameWidth * 0.5, 14);
    ctx.closePath();
    ctx.fill();

    // Hot core (white)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-flameWidth * 0.2, 14);
    ctx.lineTo(0, 14 + flameHeight * 0.35);
    ctx.lineTo(flameWidth * 0.2, 14);
    ctx.closePath();
    ctx.fill();

    // === SHIP BODY (cell-shaded two-tone) ===
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#111';

    const darkColor = G.ColorUtils ? G.ColorUtils.darken(ship.color, 0.3) : '#c47000';

    // Body - shadow side (left)
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(-22, 12);
    ctx.lineTo(0, 12);
    ctx.closePath();
    ctx.fill();

    // Body - light side (right)
    ctx.fillStyle = ship.color;
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(0, 12);
    ctx.lineTo(22, 12);
    ctx.closePath();
    ctx.fill();

    // Body outline
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(-22, 12);
    ctx.lineTo(22, 12);
    ctx.closePath();
    ctx.stroke();

    // === NOSE CONE (two-tone) ===
    ctx.fillStyle = '#c47d3a';
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(-10, -6);
    ctx.lineTo(0, -6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f6b26b';
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(0, -6);
    ctx.lineTo(10, -6);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(-10, -6);
    ctx.lineTo(10, -6);
    ctx.closePath();
    ctx.stroke();

    // === FINS ===
    ctx.fillStyle = '#2d8a91';
    ctx.beginPath();
    ctx.moveTo(-22, 8);
    ctx.lineTo(-34, 16);
    ctx.lineTo(-16, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#45b7c5';
    ctx.beginPath();
    ctx.moveTo(22, 8);
    ctx.lineTo(34, 16);
    ctx.lineTo(16, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // === COCKPIT ===
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.ellipse(0, -2, 6, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cockpit highlight
    ctx.fillStyle = 'rgba(100, 200, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-2, -5, 2, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // === SHIP SYMBOL ===
    const symbols = { BTC: '₿', ETH: 'Ξ', SOL: '◎' };
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = ship.color;
    ctx.shadowBlur = 8;
    ctx.fillText(symbols[key] || ship.symbol, 0, 5);
    ctx.shadowBlur = 0;

    ctx.restore();

    requestAnimationFrame(animateIntroShip);
}

// Helper to lighten a hex color (uses ColorUtils)
function lightenColor(hex, percent) {
    return window.Game.ColorUtils.lightenPercent(hex, percent);
}

// --- INITIALIZATION ---
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d', { alpha: false });
    gameContainer = document.getElementById('game-container');

    ['intro-screen', 'hangar-screen', 'settings-modal', 'pause-screen', 'gameover-screen',
        'scoreVal', 'lvlVal', 'weaponName', 'shieldBar', 'healthBar', 'finalScore',
        'version-tag', 'pause-btn', 'lang-btn', 'control-btn', 'joy-deadzone', 'joy-sensitivity',
        'ui-layer', 'touchControls', 'livesText', 'perk-modal', 'perk-options', 'perk-skip', 'control-toast',
        'intro-meme', 'gameover-meme', 'killsVal', 'streakVal'].forEach(id => {
            const key = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase()).replace('screen', '').replace('Val', '').replace('Bar', 'Bar').replace('layer', 'Layer').replace('Text', 'Text');
            ui[key] = document.getElementById(id);
        });

    // Hide HUD initially
    if (ui.uiLayer) ui.uiLayer.style.display = 'none';
    if (ui.touchControls) {
        ui.touchControls.classList.remove('visible');
        ui.touchControls.style.display = 'none';
    }

    // Platform detection for UI (manual controls visibility)
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.body.classList.add('is-touch');
    }

    const startBtn = document.getElementById('btn-primary-action');
    if (startBtn) {
        startBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            audioSys.init(); // Create context (stays suspended until user unmutes)
            inputSys.trigger('start');
        });
        startBtn.addEventListener('touchstart', (e) => {
            e.stopPropagation(); e.preventDefault();
            audioSys.init();
            inputSys.trigger('start');
        });
    }

    // Fix: Mobile Ship Selection Touch
    document.querySelectorAll('.ship-card').forEach(card => {
        const type = card.getAttribute('data-ship');
        card.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            e.preventDefault();
            selectShip(type);
        });
    });

    // Mute Button Logic (Class-based for multiple instances)
    document.querySelectorAll('.mute-toggle').forEach(btn => {
        const handleMute = (e) => {
            e.stopPropagation();
            if (e.type === 'touchstart') e.preventDefault(); // Prevent double firing & phantom click
            const isMuted = audioSys.toggleMute();
            updateMuteUI(isMuted);
        };
        btn.addEventListener('click', handleMute);
        btn.addEventListener('touchstart', handleMute);
    });

    // Sync initial state
    updateMuteUI(!audioSys.ctx || audioSys.ctx.state !== 'running');

    if (ui.perkSkip) {
        ui.perkSkip.addEventListener('click', () => closePerkChoice());
    }
    if (events && events.on) {
        events.on('intermission_start', () => closePerkChoice());
        events.on('enemy_killed', () => {
            if (runState && runState.flags && runState.flags.volatilityRush) {
                volatilityTimer = 2.0;
                if (runState.modifiers) runState.modifiers.tempFireRateMult = 0.6;
            }
        });
        // v4.6: GODCHAIN events
        events.on('GODCHAIN_ACTIVATED', () => {
            showPowerUp('🔥 ' + t('GODCHAIN_ON'));
            if (G.triggerScreenFlash) G.triggerScreenFlash('HYPER_ACTIVATE');
        });
        events.on('GODCHAIN_DEACTIVATED', () => {
            showPowerUp(t('GODCHAIN_OFF'));
        });
        // Harmonic Conductor bullet spawning
        events.on('harmonic_bullets', (data) => {
            if (!data || !data.bullets) return;
            var bds = data.bullets;
            for (var i = 0, len = bds.length; i < len; i++) {
                if (!canSpawnEnemyBullet()) break; // v2.24.6: Global cap
                var bd = bds[i];
                var bullet = G.Bullet.Pool.acquire(bd.x, bd.y, bd.vx, bd.vy, bd.color, bd.w || 8, bd.h || 8, false);
                bullet.beatSynced = true;
                bullet.shape = bd.shape || null;
                enemyBullets.push(bullet);
            }
        });
    }

    if (ui.joyDeadzone) {
        ui.joyDeadzone.addEventListener('input', (e) => {
            const dz = parseInt(e.target.value, 10) / 100;
            if (G.Input && G.Input.setJoystickSettings) G.Input.setJoystickSettings(dz, null);
        });
    }
    if (ui.joySensitivity) {
        ui.joySensitivity.addEventListener('input', (e) => {
            const s = parseInt(e.target.value, 10) / 100;
            if (G.Input && G.Input.setJoystickSettings) G.Input.setJoystickSettings(null, s);
        });
    }

    resize();
    window.addEventListener('resize', resize);
    // iOS needs orientationchange + delay for safe area recalculation
    window.addEventListener('orientationchange', () => setTimeout(resize, 100));

    // Initialize ParticleSystem with canvas dimensions
    if (G.ParticleSystem) G.ParticleSystem.init(gameWidth, gameHeight);

    // Initialize EffectsRenderer
    if (G.EffectsRenderer) G.EffectsRenderer.init(gameWidth, gameHeight);

    inputSys.init();

    // Vibration fallback: visual flash when vibration unavailable
    inputSys.setVibrationFallback((pattern) => {
        // Convert pattern to intensity (longer = stronger flash)
        const duration = Array.isArray(pattern) ? pattern.reduce((a, b) => a + b, 0) : pattern;
        const intensity = Math.min(0.3, duration / 200);  // Cap at 0.3 alpha
        // Trigger brief screen flash via EffectsRenderer
        if (gameState === 'PLAY' && G.EffectsRenderer) {
            G.EffectsRenderer.applyImpactFlash(intensity);
        }
    });

    player = new G.Player(gameWidth, gameHeight);
    waveMgr.init();

    // Initialize Campaign State
    if (G.CampaignState) G.CampaignState.init();

    const startApp = () => {
        const splash = document.getElementById('splash-layer');
        if (!splash || splash.style.opacity === '0') return;
        // App startup (log removed for production)
        setGameState('INTRO');
        introState = 'SPLASH';
        splash.style.opacity = '0';
        audioSys.init();
        setTimeout(() => {
            if (splash) splash.remove();
            setStyle('intro-screen', 'display', 'flex');

            // Init unified intro v4.8 - show splash elements, hide selection elements
            const title = document.getElementById('intro-title');
            const modeSelector = document.getElementById('mode-selector');
            const header = document.getElementById('selection-header');
            const info = document.getElementById('selection-info');
            const modeIndicator = document.getElementById('current-mode-indicator');
            const scoreRow = document.getElementById('selection-score-row');
            const arrowLeft = document.getElementById('arrow-left');
            const arrowRight = document.getElementById('arrow-right');

            if (title) title.classList.remove('hidden');
            if (modeSelector) modeSelector.classList.remove('hidden');
            if (header) header.style.display = 'none';
            if (info) info.style.display = 'none';
            if (modeIndicator) modeIndicator.style.display = 'none';
            if (scoreRow) scoreRow.style.display = 'none';
            if (arrowLeft) arrowLeft.classList.remove('visible');
            if (arrowRight) arrowRight.classList.remove('visible');

            // Reset primary button to TAP TO START state
            updatePrimaryButton('SPLASH');

            try { updateUIText(); } catch (e) { }
            initIntroShip();

            // Initialize sky background for INTRO state
            if (G.SkyRenderer) G.SkyRenderer.init(gameWidth, gameHeight);

            // Restore campaign mode UI state (v4.8: sync UI with stored preference)
            if (G.CampaignState) {
                setGameMode(G.CampaignState.isEnabled() ? 'campaign' : 'arcade');
            }

            // Open curtain after intro screen is ready
            const curtain = document.getElementById('curtain-overlay');
            if (curtain) {
                setTimeout(() => curtain.classList.add('open'), 100);
            }

            // PWA install prompt (first visit only)
            checkPWAInstallPrompt();
        }, 1000);
    };

    // --- PWA Install Prompt ---
    function dismissPWABanner() {
        const b = document.getElementById('pwa-install-banner');
        if (b) b.style.display = 'none';
        localStorage.setItem('fiat_pwa_dismissed', '1');
    }

    function checkPWAInstallPrompt() {
        // Skip if already standalone (PWA installed)
        if (window.navigator.standalone) return;
        if (window.matchMedia('(display-mode: standalone)').matches) return;
        // Skip if already dismissed
        if (localStorage.getItem('fiat_pwa_dismissed')) return;

        const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
        const banner = document.getElementById('pwa-install-banner');
        const text = document.getElementById('pwa-banner-text');
        const action = document.getElementById('pwa-banner-action');
        const close = document.getElementById('pwa-banner-close');
        if (!banner || !text || !action || !close) return;

        const T = G.TEXTS[currentLang] || G.TEXTS.EN;

        if (isIOS) {
            text.innerHTML = T.PWA_INSTALL_IOS;
            action.style.display = 'none';
        } else if (window._deferredInstallPrompt) {
            text.textContent = T.PWA_INSTALL_ANDROID;
            action.textContent = T.PWA_INSTALL_BTN;
            action.style.display = '';
            action.onclick = () => {
                window._deferredInstallPrompt.prompt();
                window._deferredInstallPrompt.userChoice.then(() => { window._deferredInstallPrompt = null; });
                dismissPWABanner();
            };
        } else {
            // Desktop/other without install prompt — don't show
            return;
        }

        banner.style.display = 'flex';
        close.onclick = dismissPWABanner;
        setTimeout(dismissPWABanner, 15000);
    }

    inputSys.on('escape', () => {
        if (gameState === 'VIDEO') startApp();
        else if (gameState === 'STORY_SCREEN' && G.StoryScreen) G.StoryScreen.handleTap();
        else if (gameState === 'PLAY' || gameState === 'PAUSE') togglePause();
        else if (gameState === 'SETTINGS') backToIntro();
    });

    inputSys.on('start', () => {
        if (gameState === 'VIDEO') startApp();
        else if (gameState === 'STORY_SCREEN' && G.StoryScreen) G.StoryScreen.handleTap();
        else if (gameState === 'INTERMISSION' && waveMgr && waveMgr.intermissionTimer > 0) {
            waveMgr.intermissionTimer = 0; // Skip boss-defeat intermission
        }
        else if (gameState === 'INTRO') {
            // Two-phase intro: SPLASH -> SELECTION -> PLAY
            if (introState === 'SPLASH') {
                enterSelectionState();
            } else {
                launchShipAndStart();
            }
        }
        else if (gameState === 'GAMEOVER') backToIntro();
    });

    inputSys.on('navigate', (code) => {
        // Ship selection only available in SELECTION state
        if (gameState === 'INTRO' && introState === 'SELECTION') {
            if (code === 'ArrowRight' || code === 'KeyD') {
                cycleShip(1);
            }
            if (code === 'ArrowLeft' || code === 'KeyA') {
                cycleShip(-1);
            }
        }
    });

    inputSys.on('toggleDebug', () => {
        debugMode = !debugMode;
        // Debug toggle feedback only shown in debug mode
        if (debugMode) G.Debug.log('STATE', 'Debug mode: ON');
    });

    const vid = document.getElementById('intro-video');
    const splash = document.getElementById('splash-layer');
    if (vid && splash) {
        vid.play().then(() => { vid.onended = startApp; }).catch(() => { });
        setTimeout(startApp, 4000); splash.addEventListener('click', startApp); splash.addEventListener('touchstart', startApp);
    } else {
        // No video - go directly to intro with splash state
        if (splash) splash.style.display = 'none';
        setStyle('intro-screen', 'display', 'flex');

        // Init unified intro v4.8.1
        const title = document.getElementById('intro-title');
        const modeSelector = document.getElementById('mode-selector');
        const header = document.getElementById('selection-header');
        const info = document.getElementById('selection-info');
        const modeIndicator = document.getElementById('current-mode-indicator');
        const scoreRow = document.getElementById('selection-score-row');

        if (title) title.classList.remove('hidden');
        if (modeSelector) modeSelector.classList.remove('hidden');
        if (header) header.style.display = 'none';
        if (info) info.style.display = 'none';
        if (modeIndicator) modeIndicator.style.display = 'none';
        if (scoreRow) scoreRow.style.display = 'none';

        // Reset primary button to TAP TO START state
        updatePrimaryButton('SPLASH');

        updateUIText();
        setGameState('INTRO');
        introState = 'SPLASH';
        initIntroShip();
    }

    // High score is displayed via updateModeIndicator() in updateUIText()

    // Story screen touch/click handling
    const storyTapHandler = (e) => {
        if (gameState === 'STORY_SCREEN' && G.StoryScreen) {
            e.preventDefault();
            G.StoryScreen.handleTap();
        }
    };
    canvas.addEventListener('click', storyTapHandler);
    canvas.addEventListener('touchstart', storyTapHandler, { passive: false });

    requestAnimationFrame(loop);
}

// Detect if running as installed PWA (standalone mode)
function isPWAStandalone() {
    // iOS Safari standalone mode
    if (window.navigator.standalone === true) return true;
    // Android/Desktop PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
    return false;
}

// Get safe area insets from CSS environment variables
function getSafeAreaInsets() {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.left = '0';
    div.style.top = '0';
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.paddingTop = 'env(safe-area-inset-top)';
    div.style.paddingBottom = 'env(safe-area-inset-bottom)';
    div.style.paddingLeft = 'env(safe-area-inset-left)';
    div.style.paddingRight = 'env(safe-area-inset-right)';
    div.style.boxSizing = 'border-box';
    div.style.visibility = 'hidden';
    div.style.pointerEvents = 'none';
    document.body.appendChild(div);
    const computed = getComputedStyle(div);
    const insets = {
        top: parseFloat(computed.paddingTop) || 0,
        bottom: parseFloat(computed.paddingBottom) || 0,
        left: parseFloat(computed.paddingLeft) || 0,
        right: parseFloat(computed.paddingRight) || 0
    };
    document.body.removeChild(div);
    return insets;
}

// Store safe area values globally for rendering adjustments
window.safeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 };
window.isPWA = false;

function resize() {
    window.isPWA = isPWAStandalone();
    const insets = getSafeAreaInsets();
    window.safeAreaInsets = insets;

    // In PWA standalone mode: use full screen
    // In browser (Safari): respect safe areas
    if (window.isPWA) {
        gameHeight = window.innerHeight;
        gameWidth = Math.min(600, window.innerWidth);
        // Position container at top (fullscreen)
        if (gameContainer) {
            gameContainer.style.top = '0';
            gameContainer.style.height = gameHeight + 'px';
            gameContainer.style.width = gameWidth + 'px';
        }
        // PWA mode: Force minimum top inset for status bar (env() may return 0)
        // iPhone 14 Pro Dynamic Island needs ~59px, older notch devices ~47px
        const pwaTopInset = Math.max(insets.top, 59);
        document.documentElement.style.setProperty('--pwa-top-inset', pwaTopInset + 'px');
    } else {
        // Safari/Browser mode: account for notch and home bar
        const safeTop = insets.top;
        const safeBottom = insets.bottom;
        gameHeight = window.innerHeight - safeTop - safeBottom;
        gameWidth = Math.min(600, window.innerWidth - insets.left - insets.right);
        // Position container below notch, above home bar
        if (gameContainer) {
            gameContainer.style.top = safeTop + 'px';
            gameContainer.style.height = gameHeight + 'px';
            gameContainer.style.width = gameWidth + 'px';
        }
    }

    // Canvas fills the container
    canvas.width = gameWidth;
    canvas.height = gameHeight;

    // v4.0.1: Expose gameWidth for Bullet horizontal bounds check
    G._gameWidth = gameWidth;
    // v4.32: Expose gameHeight for responsive formations, teleport bounds, HYPER particles
    G._gameHeight = gameHeight;

    if (player) {
        player.gameWidth = gameWidth;
        player.gameHeight = gameHeight;
    }

    // Update ParticleSystem dimensions
    if (G.ParticleSystem) {
        G.ParticleSystem.setDimensions(gameWidth, gameHeight);
    }
    // Update EffectsRenderer dimensions
    if (G.EffectsRenderer) {
        G.EffectsRenderer.setDimensions(gameWidth, gameHeight);
    }
    // Update MessageSystem dimensions (fixes text box positioning after resize)
    if (G.MessageSystem) {
        G.MessageSystem.setDimensions(gameWidth, gameHeight);
    }
    // Update SkyRenderer dimensions (fixes gradient cache + hill positions on resize)
    if (G.SkyRenderer) {
        G.SkyRenderer.setDimensions(gameWidth, gameHeight);
    }
}

function updateUIText() {
    if (document.getElementById('version-tag')) document.getElementById('version-tag').innerText = Constants.VERSION;
    if (ui.langBtn) ui.langBtn.innerText = currentLang;
    if (ui.controlBtn) ui.controlBtn.innerText = (G.Input && G.Input.touch && G.Input.touch.useJoystick) ? 'JOYSTICK' : 'SWIPE';
    if (ui.joyDeadzone && G.Input && G.Input.touch) ui.joyDeadzone.value = Math.round(G.Input.touch.deadzone * 100);
    if (ui.joySensitivity && G.Input && G.Input.touch) ui.joySensitivity.value = Math.round(G.Input.touch.sensitivity * 100);
    if (ui.introMeme) ui.introMeme.innerText = getRandomMeme();
    if (ui.memeTicker && !ui.memeTicker.innerText) ui.memeTicker.innerText = getRandomMeme();

    // Intro screen
    // Primary action button text updated via updatePrimaryButton()
    const selectionHeader = document.getElementById('selection-header');
    if (selectionHeader) selectionHeader.innerText = t('CHOOSE_SHIP');

    // Mode selector tabs (v4.8)
    const labelStory = document.getElementById('label-story');
    if (labelStory) labelStory.innerText = t('MODE_STORY') || t('CAMPAIGN');
    const labelArcade = document.getElementById('label-arcade');
    if (labelArcade) labelArcade.innerText = t('MODE_ARCADE') || t('ARCADE');

    // Mode description (v4.9: separate elements for Story/Arcade)
    const storyDesc = document.getElementById('mode-story-desc');
    const arcadeDesc = document.getElementById('mode-arcade-desc');
    if (storyDesc) storyDesc.innerText = t('MODE_STORY_DESC') || "Follow Bitcoin's rise against central banks.";
    if (arcadeDesc) arcadeDesc.innerText = t('MODE_ARCADE_DESC') || "Endless waves. High scores. Pure action.";

    // Primary action button
    const btnPrimary = document.getElementById('btn-primary-action');
    if (btnPrimary) {
        if (introState === 'SELECTION') {
            btnPrimary.innerHTML = '🚀 ' + t('LAUNCH');
        } else {
            btnPrimary.innerHTML = t('TAP_START');
        }
    }

    // Mode indicator
    const modeHint = document.getElementById('mode-indicator-hint');
    if (modeHint) modeHint.innerText = t('CHANGE_MODE');
    const scoreRowLabel = document.getElementById('score-row-label');
    if (scoreRowLabel) scoreRowLabel.innerText = t('HIGH_SCORE');
    updateModeIndicator();

    // HUD labels
    const scoreLabel = document.getElementById('score-label');
    if (scoreLabel) scoreLabel.innerText = t('ACCOUNT_BALANCE');
    const levelLabel = document.getElementById('level-label');
    if (levelLabel) levelLabel.innerText = t('LEVEL');
    const livesLabel = document.getElementById('lives-label');
    if (livesLabel) livesLabel.innerText = t('LIVES');
    const killLabel = document.getElementById('killLabel');
    if (killLabel) killLabel.innerText = t('KILLS');
    const grazeLabel = document.getElementById('graze-label');
    if (grazeLabel) grazeLabel.innerText = t('GRAZE');

    // Pause menu
    const pauseTitle = document.getElementById('pause-title');
    if (pauseTitle) pauseTitle.innerText = t('PAUSED');
    const resumeBtn = document.getElementById('btn-resume');
    if (resumeBtn) resumeBtn.innerText = '⟡ ' + t('RESUME');
    const settingsBtn = document.getElementById('btn-settings');
    if (settingsBtn) settingsBtn.innerText = '⟡ ' + t('SETTINGS');
    const manualBtn = document.getElementById('btn-manual');
    if (manualBtn) manualBtn.innerText = '⟡ ' + t('MANUAL');
    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) restartBtn.innerText = '⟡ ' + t('RESTART_RUN');
    const exitBtn = document.getElementById('btn-exit-title');
    if (exitBtn) exitBtn.innerText = '⟡ ' + t('EXIT');

    // Game Over
    const goTitle = document.querySelector('#gameover-screen h1');
    if (goTitle) goTitle.innerText = "LIQUIDATION EVENT";
    const goBtn = document.getElementById('btn-retry');
    if (goBtn) goBtn.innerText = t('RESTART');

    // Settings
    const setHeader = document.querySelector('#settings-modal h2');
    if (setHeader) setHeader.innerText = t('SETTINGS');
    const closeBtn = document.getElementById('btn-settings-close');
    if (closeBtn) closeBtn.innerText = t('CLOSE');
    // Select the lang row specifically (parent of #lang-btn)
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
        const langLabel = langBtn.parentElement.querySelector('.setting-label');
        if (langLabel) langLabel.innerText = t('LANG');
    }

    // Manual (if open, update text)
    updateManualText();
}

window.toggleLang = function () { currentLang = (currentLang === 'EN') ? 'IT' : 'EN'; G._currentLang = currentLang; localStorage.setItem('fiat_lang', currentLang); updateUIText(); };
window.toggleSettings = function () { setStyle('settings-modal', 'display', (document.getElementById('settings-modal').style.display === 'flex') ? 'none' : 'flex'); updateUIText(); };
window.toggleHelpPanel = function () {
    const panel = document.getElementById('help-panel');
    if (panel) panel.style.display = (panel.style.display === 'flex') ? 'none' : 'flex';
};
window.toggleCreditsPanel = function () {
    const panel = document.getElementById('credits-panel');
    if (panel) panel.style.display = (panel.style.display === 'flex') ? 'none' : 'flex';
};

// Manual modal functions
window.toggleManual = function () {
    const modal = document.getElementById('manual-modal');
    if (!modal) return;
    const isVisible = modal.style.display === 'flex';
    modal.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
        updateManualText();
        audioSys.play('coinUI');
    }
};

window.selectManualTab = function (tabId) {
    // Update tab buttons
    document.querySelectorAll('.manual-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    // Update panels
    document.querySelectorAll('.manual-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === 'tab-' + tabId);
    });
    audioSys.play('click');
};

function updateManualText() {
    const modal = document.getElementById('manual-modal');
    if (!modal) return;

    // Update all elements with data-i18n attribute
    modal.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        const text = t(key);
        if (text && text !== key) {
            el.textContent = text;
        }
    });
}
window.toggleControlMode = function () {
    const useJoystick = !(G.Input && G.Input.touch && G.Input.touch.useJoystick);
    if (G.Input && G.Input.setControlMode) G.Input.setControlMode(useJoystick ? 'JOYSTICK' : 'SWIPE');
    showControlToast(useJoystick ? 'JOYSTICK' : 'SWIPE');
    updateUIText();
};

function showControlToast(mode) {
    if (!ui.controlToast) return;
    ui.controlToast.innerText = `CONTROLS: ${mode}`;
    ui.controlToast.style.display = 'block';
    clearTimeout(ui.controlToast._hideTimer);
    ui.controlToast._hideTimer = setTimeout(() => {
        ui.controlToast.style.display = 'none';
    }, 1200);
}
window.goToHangar = function () {
    audioSys.init(); // Create context (stays suspended until user unmutes)
    audioSys.startMusic(); // Queue music (plays when unmuted)
    window.scrollTo(0, 0);
    setStyle('intro-screen', 'display', 'none');
    setStyle('hangar-screen', 'display', 'flex');
    setGameState('HANGAR');
    if (G.SkyRenderer) G.SkyRenderer.init(gameWidth, gameHeight); // Start BG effect early
    if (G.MessageSystem) G.MessageSystem.init(gameWidth, gameHeight, {
        onShake: (intensity) => { shake = Math.max(shake, intensity); },
        onPlaySound: (sound) => { if (audioSys) audioSys.play(sound); }
    });
    if (G.MemeEngine) G.MemeEngine.initDOM();
    if (G.MessageSystem) G.MessageSystem.initDOM();
}

// Ship launch animation - goes directly to game (skips hangar)
let isLaunching = false;
window.launchShipAndStart = function () {
    if (isLaunching) return;
    isLaunching = true;

    // Init audio context (stays suspended until user unmutes)
    if (!audioSys.ctx) audioSys.init();

    const shipCanvas = document.getElementById('intro-ship-canvas');
    const introScreen = document.getElementById('intro-screen');
    const curtain = document.getElementById('curtain-overlay');

    // CRITICAL: Get ship's current position before moving it
    const shipRect = shipCanvas.getBoundingClientRect();
    const shipStartX = shipRect.left;
    const shipStartY = shipRect.top;
    const originalParent = shipCanvas.parentNode;
    const originalNextSibling = shipCanvas.nextSibling;

    // Create a fixed container and move the ACTUAL canvas into it
    const launchShip = document.createElement('div');
    launchShip.id = 'launch-ship-container';
    launchShip.style.cssText = `
        position: fixed;
        left: ${shipStartX}px;
        top: ${shipStartY}px;
        width: ${shipRect.width}px;
        height: ${shipRect.height}px;
        z-index: 10000;
        pointer-events: none;
    `;

    // Move the actual canvas (not clone!) so it keeps its drawing
    launchShip.appendChild(shipCanvas);
    document.body.appendChild(launchShip);
    shipCanvas.style.width = '100%';
    shipCanvas.style.height = '100%';

    // Helper: check if element is visible
    const isVisible = (el) => {
        if (!el) return false;
        if (el.closest('.hidden')) return false;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        return true;
    };

    // Destroy element with explosion effect
    function destroyElement(el, delay = 0) {
        setTimeout(() => {
            audioSys.play('shoot');

            const rect = el.getBoundingClientRect();
            const text = el.innerText || el.textContent || '';
            const chars = text.split('');

            // Create flying letter particles
            chars.forEach((char, i) => {
                if (char.trim() === '') return;
                const particle = document.createElement('span');
                particle.className = 'text-particle';
                particle.innerText = char;
                particle.style.left = (rect.left + (i / chars.length) * rect.width) + 'px';
                particle.style.top = rect.top + 'px';
                particle.style.color = getComputedStyle(el).color;
                particle.style.fontSize = getComputedStyle(el).fontSize;
                particle.style.fontWeight = getComputedStyle(el).fontWeight;

                const vx = (Math.random() - 0.5) * 500;
                const vy = (Math.random() - 0.5) * 400;
                const rotation = (Math.random() - 0.5) * 720;

                particle.style.setProperty('--vx', vx + 'px');
                particle.style.setProperty('--vy', vy + 'px');
                particle.style.setProperty('--rot', rotation + 'deg');

                document.body.appendChild(particle);
                setTimeout(() => particle.remove(), 1200);
            });

            // Hide original element
            el.style.opacity = '0';
            el.style.transform = 'scale(1.3)';
            el.style.transition = 'all 0.15s';
        }, delay);
    }

    // IMMEDIATELY explode all visible UI elements (staggered for effect)
    const elementsToExplode = [
        '.intro-icons',
        '.intro-version',
        '.current-mode-indicator',
        '.selection-score-row',
        '.selection-info',
        '.selection-header',
        '.intro-title',
        '.mode-selector',
        '.primary-action-container'
    ];

    // Track destroyed elements for reset in finishLaunch
    const destroyTargets = [];

    let explodeDelay = 0;
    elementsToExplode.forEach(selector => {
        const el = document.querySelector(selector);
        if (el && isVisible(el)) {
            destroyTargets.push({ el });
            destroyElement(el, explodeDelay);
            explodeDelay += 40; // Stagger explosions
        }
    });

    // Hide intro-screen container after explosions start (keeps canvas visible via launchShip)
    setTimeout(() => {
        if (introScreen) {
            introScreen.style.opacity = '0';
            introScreen.style.pointerEvents = 'none';
        }
    }, 150);

    // Animation variables
    let currentY = shipStartY;
    let velocity = 0;
    const maxVelocity = 600;
    const acceleration = 400;
    let lastTime = performance.now();
    let launchTime = 0;

    // Animation loop
    function animateLaunch(currentTime) {
        const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
        lastTime = currentTime;
        launchTime += dt;

        // Phase 1: Charge up (shake and glow) for 0.4s
        if (launchTime < 0.4) {
            const intensity = launchTime / 0.4;
            const shake = Math.sin(launchTime * 60) * (2 + intensity * 5);
            const glow = 20 + intensity * 40;
            launchShip.style.transform = `translateX(${shake}px) scale(${1 + intensity * 0.1})`;
            launchShip.style.filter = `drop-shadow(0 0 ${glow}px rgba(247, 147, 26, 0.9))`;

            requestAnimationFrame(animateLaunch);
            return;
        }

        // Phase 2: LIFTOFF!
        const flightTime = launchTime - 0.4;

        // Accelerate
        const accelMult = Math.min(1, flightTime * 2);
        velocity += acceleration * accelMult * dt;
        if (velocity > maxVelocity) velocity = maxVelocity;

        // Move ship UP
        currentY -= velocity * dt;

        // Visual effects
        const scale = 1.1 + Math.min(0.25, (shipStartY - currentY) * 0.0004);
        const glowSize = 40 + (shipStartY - currentY) * 0.06;
        const trailLength = Math.min(80, (shipStartY - currentY) * 0.15);

        launchShip.style.top = currentY + 'px';
        launchShip.style.transform = `scale(${scale})`;
        launchShip.style.filter = `drop-shadow(0 ${trailLength}px ${glowSize}px rgba(255, 150, 0, 0.9))`;

        // Continue until off screen
        if (currentY > -shipRect.height - 100) {
            requestAnimationFrame(animateLaunch);
        } else {
            finishLaunch();
        }

        // Close curtain when ship is halfway up
        if (currentY < window.innerHeight * 0.4 && curtain && curtain.classList.contains('open')) {
            curtain.classList.remove('open');
        }
    }

    function finishLaunch() {
        isLaunching = false;

        // IMPORTANT: Hide intro screen FIRST to prevent visual glitch
        setStyle('intro-screen', 'display', 'none');

        // Move canvas back to original parent
        shipCanvas.style.width = '';
        shipCanvas.style.height = '';
        shipCanvas.style.transform = '';
        shipCanvas.style.filter = '';

        if (originalNextSibling) {
            originalParent.insertBefore(shipCanvas, originalNextSibling);
        } else {
            originalParent.appendChild(shipCanvas);
        }

        // Remove launch container
        if (launchShip && launchShip.parentNode) {
            launchShip.remove();
        }

        // Reset destroyed elements
        destroyTargets.forEach(t => {
            if (t.el) {
                t.el.style.opacity = '';
                t.el.style.transform = '';
                t.el.style.transition = '';
            }
        });

        // Configure player and start
        const selectedShipKey = SHIP_KEYS[selectedShipIndex];
        player.configure(selectedShipKey);

        audioSys.startMusic();
        if (G.SkyRenderer) G.SkyRenderer.init(gameWidth, gameHeight);

        // Tutorial check (v4.12.0): show tutorial on first launch
        function afterTutorial() {
            // Story Mode: Show Prologue before first game
            const campaignState = G.CampaignState;
            if (campaignState && campaignState.isEnabled() && shouldShowStory('PROLOGUE')) {
                // Open curtain first, then show story
                setTimeout(() => {
                    if (curtain) curtain.classList.add('open');
                }, 100);

                showStoryScreen('PROLOGUE', () => {
                    startGame();
                });
            } else {
                // Arcade mode or Prologue already seen - start directly
                startGame();
                setTimeout(() => {
                    if (curtain) curtain.classList.add('open');
                }, 100);
            }
        }

        // v4.19.2: per-mode tutorial with backward compat
        const isStory = !!(G.CampaignState && G.CampaignState.isEnabled());
        const tutMode = isStory ? 'story' : 'arcade';
        const tutKey = 'fiat_tutorial_' + tutMode + '_seen';
        if (!localStorage.getItem(tutKey) && !localStorage.getItem('fiat_tutorial_seen')) {
            showTutorial(afterTutorial, tutMode);
        } else {
            afterTutorial();
        }
    }

    // Start animation
    requestAnimationFrame(animateLaunch);
}

// === Tutorial System (v4.12.0, v4.19.2: mode-aware) ===
let tutorialStep = 0;
let tutorialCallback = null;
let tutorialMode = 'arcade';

function showTutorial(callback, gameMode) {
    tutorialStep = 0;
    tutorialCallback = callback;
    tutorialMode = gameMode || 'arcade';
    const overlay = document.getElementById('tutorial-overlay');
    if (!overlay) { callback(); return; }

    // v4.19.2: Dynamic mobile control text based on current control mode
    const controlMode = localStorage.getItem('fiat_control_mode') || 'SWIPE';
    const mobileEl = overlay.querySelector('.mobile-only .tutorial-text');
    if (mobileEl) mobileEl.setAttribute('data-i18n',
        controlMode === 'JOYSTICK' ? 'TUT_CONTROLS_MOBILE_JOY' : 'TUT_CONTROLS_MOBILE_SWIPE');

    // v4.19.2: Mode-specific objective text
    const objEl = overlay.querySelector('#tut-step-1 .tutorial-text');
    if (objEl) objEl.setAttribute('data-i18n',
        tutorialMode === 'story' ? 'TUT_OBJECTIVE_STORY' : 'TUT_OBJECTIVE_ARCADE');

    overlay.style.display = 'flex';
    updateTutorialStep();
    updateTutorialText();
}

function updateTutorialStep() {
    const dots = document.querySelectorAll('.tutorial-dot');
    const steps = document.querySelectorAll('.tutorial-step');
    const nextBtn = document.getElementById('tut-next');
    const T = G.TEXTS[G._currentLang || 'EN'] || G.TEXTS.EN;

    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === tutorialStep);
        dot.classList.toggle('done', i < tutorialStep);
    });
    steps.forEach((step, i) => {
        step.classList.toggle('active', i === tutorialStep);
    });

    if (nextBtn) {
        nextBtn.textContent = tutorialStep === 2 ? (T.TUT_GOT_IT || 'GOT IT!') : (T.TUT_NEXT || 'NEXT');
    }
}

function updateTutorialText() {
    const T = G.TEXTS[G._currentLang || 'EN'] || G.TEXTS.EN;
    const overlay = document.getElementById('tutorial-overlay');
    if (!overlay) return;
    overlay.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (T[key]) el.textContent = T[key];
    });
}

window.nextTutorialStep = function() {
    tutorialStep++;
    if (tutorialStep > 2) {
        completeTutorial();
    } else {
        updateTutorialStep();
    }
};

window.skipTutorial = function() {
    completeTutorial();
};

function completeTutorial() {
    // v4.19.2: per-mode tutorial flag (backward compat via fiat_tutorial_seen at call site)
    localStorage.setItem('fiat_tutorial_' + tutorialMode + '_seen', '1');
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) overlay.style.display = 'none';
    if (tutorialCallback) tutorialCallback();
    tutorialCallback = null;
}

window.togglePause = function () {
    if (gameState === 'PLAY' || gameState === 'INTERMISSION') { setGameState('PAUSE'); setStyle('pause-screen', 'display', 'flex'); setStyle('pause-btn', 'display', 'none'); }
    else if (gameState === 'PAUSE') { setGameState('PLAY'); setStyle('pause-screen', 'display', 'none'); setStyle('pause-btn', 'display', 'block'); }
};
window.restartRun = function () {
    setStyle('pause-screen', 'display', 'none');
    audioSys.resetState(); // Reset audio state for new run
    startGame();
};
window.restartFromGameOver = function () {
    setStyle('gameover-screen', 'display', 'none');
    audioSys.resetState(); // Reset audio state for new run
    startGame();
};
window.backToIntro = function () {
    // Close curtain first
    const curtain = document.getElementById('curtain-overlay');
    if (curtain) curtain.classList.remove('open');

    setTimeout(() => {
        // v4.21: Comprehensive cleanup of ALL game overlays
        setStyle('pause-screen', 'display', 'none');
        setStyle('gameover-screen', 'display', 'none');
        setStyle('hangar-screen', 'display', 'none');
        setStyle('perk-modal', 'display', 'none');
        if (ui.uiLayer) ui.uiLayer.style.display = 'none'; // HIDE HUD
        if (ui.touchControls) {
            ui.touchControls.classList.remove('visible');
            ui.touchControls.style.display = 'none';
        }
        // Hide meme popup
        const memePopup = document.getElementById('meme-popup');
        if (memePopup) { memePopup.classList.remove('show'); memePopup.classList.remove('hide'); }
        // Hide dialogue overlay (story mode leaves it with pointer-events)
        const dialogueContainer = document.getElementById('dialogue-container');
        if (dialogueContainer) dialogueContainer.classList.remove('visible');
        // Hide campaign victory screen if exists
        const victoryScreen = document.getElementById('campaign-victory-screen');
        if (victoryScreen) victoryScreen.style.display = 'none';
        closePerkChoice();

        // Show intro screen and reset styles from launch animation
        const introScreen = document.getElementById('intro-screen');
        if (introScreen) {
            introScreen.style.display = 'flex';
            introScreen.style.opacity = '1';
            introScreen.style.pointerEvents = 'auto';
        }

        setGameState('INTRO');
        introState = 'SPLASH';

        // Reset to splash state (unified intro v4.8.1)
        const title = document.getElementById('intro-title');
        const modeSelector = document.getElementById('mode-selector');
        const header = document.getElementById('selection-header');
        const info = document.getElementById('selection-info');
        const modeIndicator = document.getElementById('current-mode-indicator');
        const scoreRow = document.getElementById('selection-score-row');
        const arrowLeft = document.getElementById('arrow-left');
        const arrowRight = document.getElementById('arrow-right');

        // Show splash elements and reset styles from destroy animation
        if (title) {
            title.classList.remove('hidden');
            title.style.opacity = '';
            title.style.transform = '';
        }
        if (modeSelector) {
            modeSelector.classList.remove('hidden');
            modeSelector.style.opacity = '';
            modeSelector.style.transform = '';
        }

        // Reset mode explanation and ship area (hidden by enterSelectionState)
        const modeExpl = document.getElementById('mode-explanation');
        const shipArea = document.querySelector('.ship-area');
        if (modeExpl) modeExpl.classList.remove('hidden');
        if (shipArea) shipArea.classList.add('hidden');

        // Reset primary button to TAP TO START state
        updatePrimaryButton('SPLASH');

        // Hide selection elements
        if (header) header.style.display = 'none';
        if (info) info.style.display = 'none';
        if (modeIndicator) modeIndicator.style.display = 'none';
        if (scoreRow) scoreRow.style.display = 'none';
        if (arrowLeft) arrowLeft.classList.remove('visible');
        if (arrowRight) arrowRight.classList.remove('visible');

        // Reset other elements that were exploded during launch
        const introIcons = document.querySelector('.intro-icons');
        const introVersion = document.querySelector('.intro-version');
        if (introIcons) {
            introIcons.style.opacity = '1';
            introIcons.style.transform = '';
        }
        if (introVersion) {
            introVersion.style.opacity = '';
            introVersion.style.transform = '';
            introVersion.style.display = '';
        }

        audioSys.resetState();
        audioSys.init();
        if (G.HarmonicConductor) G.HarmonicConductor.reset();
        initIntroShip();

        // Reopen curtain
        setTimeout(() => {
            if (curtain) curtain.classList.add('open');
        }, 100);
    }, 800);
};

function selectShip(type) {
    player.configure(type);
    setStyle('hangar-screen', 'display', 'none');
    startGame();
}
window.selectShip = selectShip;

window.toggleBearMode = function () {
    isBearMarket = !isBearMarket;
    window.isBearMarket = isBearMarket; // Expose globally for WaveManager

    // Update body class
    if (isBearMarket) {
        document.body.classList.add('bear-mode');
        audioSys.play('bearMarketToggle'); // Ominous toggle sound
        // Story: Bear market start dialogue
        if (G.Story) G.Story.onBearMarketStart();
    } else {
        document.body.classList.remove('bear-mode');
    }

    // Update toggle switch in settings
    const toggle = document.getElementById('bear-toggle');
    if (toggle) {
        const label = toggle.querySelector('.switch-label');
        if (isBearMarket) {
            toggle.classList.add('active');
            if (label) label.textContent = 'ON';
        } else {
            toggle.classList.remove('active');
            if (label) label.textContent = 'OFF';
        }
    }

    // Restart game if currently playing (mode change requires restart)
    if (gameState === 'PLAY' || gameState === 'PAUSE' || gameState === 'INTERMISSION') {
        const modeName = isBearMarket ? 'BEAR MARKET' : 'BULL MARKET';
        if (confirm(`Passare a ${modeName}?\nLa partita verrà riavviata.`)) {
            setStyle('settings-modal', 'display', 'none');
            setStyle('pause-screen', 'display', 'none');
            startGame(); // Restart with new mode
        } else {
            // User cancelled - revert the toggle
            isBearMarket = !isBearMarket;
            window.isBearMarket = isBearMarket;
            if (isBearMarket) {
                document.body.classList.add('bear-mode');
                toggle.classList.add('active');
                toggle.querySelector('.switch-label').textContent = 'ON';
            } else {
                document.body.classList.remove('bear-mode');
                toggle.classList.remove('active');
                toggle.querySelector('.switch-label').textContent = 'OFF';
            }
        }
    }
};

function updateMuteUI(isMuted) {
    document.querySelectorAll('.mute-toggle').forEach(btn => {
        // Check if it's a cell-shaded SVG button
        if (btn.classList.contains('btn-icon')) {
            const svg = btn.querySelector('.icon-svg');
            if (svg) {
                if (isMuted) {
                    btn.classList.add('muted');
                    svg.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
                } else {
                    btn.classList.remove('muted');
                    svg.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
                }
            }
        } else {
            // Legacy emoji buttons
            btn.innerText = isMuted ? '🔇' : '🔊';
        }
    });
}

function updateLevelUI() {
    setUI('lvlVal', level);
    // Trigger level up animation
    const lvlEl = document.getElementById('lvlVal');
    if (lvlEl) {
        lvlEl.classList.remove('level-up');
        void lvlEl.offsetWidth; // Force reflow
        lvlEl.classList.add('level-up');
    }
    window.currentLevel = level;
}

/**
 * Show story screen and transition to callback when complete
 * @param {string} storyId - ID from STORY_CONTENT (PROLOGUE, CHAPTER_1, etc.)
 * @param {Function} onComplete - Function to call when story is dismissed
 */
function showStoryScreen(storyId, onComplete) {
    if (!G.StoryScreen || !G.STORY_CONTENT || !G.STORY_CONTENT[storyId]) {
        // Story system not loaded or story not found - skip
        if (onComplete) onComplete();
        return;
    }

    // Mark story as shown in campaign state
    const campaignState = G.CampaignState;
    if (campaignState && campaignState.storyProgress) {
        campaignState.storyProgress[storyId] = true;
        campaignState.save();
    }

    setGameState('STORY_SCREEN');

    // Hide HUD during story
    if (ui.uiLayer) ui.uiLayer.style.display = 'none';
    if (ui.touchControls) ui.touchControls.style.display = 'none';

    G.StoryScreen.show(storyId, () => {
        setGameState('PLAY');
        // Restore HUD after story screen (was hidden at line 2048-2049)
        if (ui.uiLayer) ui.uiLayer.style.display = 'flex';
        if (ui.touchControls) {
            ui.touchControls.style.display = 'block';
            requestAnimationFrame(() => {
                if (ui.touchControls) ui.touchControls.classList.add('visible');
            });
        }
        if (onComplete) onComplete();
    });
}

/**
 * Check if a story chapter should be shown (hasn't been shown yet in this campaign)
 */
function shouldShowStory(storyId) {
    const campaignState = G.CampaignState;
    if (!campaignState || !campaignState.isEnabled()) return false;
    if (!G.STORY_CONTENT || !G.STORY_CONTENT[storyId]) return false;

    // Check if already shown
    if (campaignState.storyProgress && campaignState.storyProgress[storyId]) {
        return false;
    }
    return true;
}

function updateLivesUI(wasHit = false) {
    // Shake animation when hit
    if (wasHit && ui.livesText) {
        ui.livesText.classList.remove('lives-shake');
        void ui.livesText.offsetWidth; // Force reflow
        ui.livesText.classList.add('lives-shake');
    }

    // v4.4: Reactive HUD - lives danger state
    const livesEl = document.querySelector('.hud-lives');
    if (livesEl) {
        const threshold = G.Balance?.REACTIVE_HUD?.LIVES_DANGER_THRESHOLD || 1;
        livesEl.classList.toggle('lives-danger', lives <= threshold);
    }
}

/**
 * v4.4: Reactive HUD - dynamic visual feedback on HUD elements
 * Score color on streaks, HYPER glow, lives danger, graze shimmer
 */
let _reactiveStreakClass = '';
let _reactiveStreakTimer = 0;

function updateReactiveHUD() {
    const reactive = G.Balance?.REACTIVE_HUD;
    if (!reactive?.ENABLED) return;

    const scoreEl = document.querySelector('.hud-score-compact');
    if (!scoreEl) return;

    // Score streak color (fades after SCORE_STREAK_DURATION)
    if (_reactiveStreakTimer > 0) {
        _reactiveStreakTimer -= (1 / 60); // Approximate dt
        if (_reactiveStreakTimer <= 0 && _reactiveStreakClass) {
            scoreEl.classList.remove(_reactiveStreakClass);
            _reactiveStreakClass = '';
        }
    }

    // HYPER mode score glow
    const isHyper = player && player.hyperActive;
    scoreEl.classList.toggle('score-hyper', isHyper);

    // Graze approaching shimmer
    const grazeMeterEl = document.getElementById('graze-meter');
    if (grazeMeterEl) {
        const grazePercent = typeof grazeMeter !== 'undefined' ? grazeMeter : 0;
        const approaching = grazePercent >= (reactive.GRAZE_APPROACHING_THRESHOLD || 80) && grazePercent < 100;
        grazeMeterEl.classList.toggle('graze-approaching', approaching);
    }
}

// Called from kill streak milestones
function triggerScoreStreakColor(streakLevel) {
    const reactive = G.Balance?.REACTIVE_HUD;
    if (!reactive?.ENABLED) return;

    const scoreEl = document.querySelector('.hud-score-compact');
    if (!scoreEl) return;

    // Remove old class
    if (_reactiveStreakClass) scoreEl.classList.remove(_reactiveStreakClass);

    const className = `score-streak-${streakLevel}`;
    scoreEl.classList.add(className);
    _reactiveStreakClass = className;
    _reactiveStreakTimer = reactive.SCORE_STREAK_DURATION || 0.5;
}

function startGame() {
    audioSys.init();

    // Always reset story progress when starting Story Mode (shows all chapters fresh)
    if (G.CampaignState && G.CampaignState.isEnabled()) {
        G.CampaignState.storyProgress = {
            PROLOGUE: false,
            CHAPTER_1: false,
            CHAPTER_2: false,
            CHAPTER_3: false
        };
    }

    setStyle('intro-screen', 'display', 'none'); setStyle('gameover-screen', 'display', 'none'); setStyle('pause-screen', 'display', 'none'); setStyle('pause-btn', 'display', 'block');
    if (ui.uiLayer) ui.uiLayer.style.display = 'flex'; // SHOW HUD
    // Show touch controls with opacity fade-in to avoid visual flash
    if (ui.touchControls) {
        ui.touchControls.classList.remove('visible'); // Ensure clean state
        ui.touchControls.style.display = 'block';
        // Delay adding visible class to trigger CSS transition after display change
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                ui.touchControls.classList.add('visible');
            });
        });
    }

    // v4.28.0: RunState handles all per-run variable resets
    if (runState && runState.reset) runState.reset();
    syncFromRunState();

    // v4.20.0: Ensure meme popup DOM refs are cached
    if (G.MemeEngine) G.MemeEngine.initDOM();
    // v4.26.0: Ensure message strip DOM refs are cached
    if (G.MessageSystem) G.MessageSystem.initDOM();
    // v4.1.0: Initialize rank system
    if (G.RankSystem) G.RankSystem.init();
    // 1-hit = 1-life system: ignore stats.hp and bonuses
    player.maxHp = 1;
    player.hp = 1;
    volatilityTimer = 0;
    memeSwapTimer = Balance.MEMES.TICKER_SWAP_INTERVAL;
    closePerkChoice();
    recentPerks = []; // Reset perk display
    renderPerkBar();

    lives = Balance.PLAYER.START_LIVES; setUI('scoreVal', '0'); setUI('lvlVal', '1'); setUI('livesText', lives);
    updateDifficultyCache(); // Initialize difficulty cache for level 1

    // Analytics: Start tracking run
    if (G.Debug) {
        G.Debug.startAnalyticsRun(player.stats?.name || 'BTC', window.isBearMarket ? 'Bear Market' : 'Normal');
        G.Debug.trackCycleStart(1);
    }
    audioSys.setLevel(1, true); // Set music theme for level 1 (instant, no crossfade)
    // Clear particles via ParticleSystem
    if (G.ParticleSystem) G.ParticleSystem.clear();
    bullets = []; enemies = []; enemyBullets = []; powerUps = []; particles = []; floatingTexts = []; muzzleFlashes = []; perkIcons = []; boss = null; miniBoss = null;
    if (G.MessageSystem) G.MessageSystem.reset(); // Reset typed messages
    // Sync all array references after reset
    G.enemies = enemies;
    window.enemyBullets = enemyBullets;
    window.boss = null; window.miniBoss = null; // v2.22.5: Sync for debug overlay
    if (G.HarmonicConductor) G.HarmonicConductor.enemies = enemies;
    updateGrazeUI(); // Reset grazing UI

    waveMgr.reset();
    gridDir = 1;
    // gridSpeed now computed dynamically via getGridSpeed()

    setGameState('PLAY');

    // WEAPON EVOLUTION v3.0: Full reset on new game (resets shot level to 1)
    if (player.fullReset) {
        player.fullReset();
    } else {
        player.resetState();
    }

    // v4.21: Always reset campaign boss defeats on new game (fresh cycle every run)
    const campaignState = G.CampaignState;
    if (campaignState && campaignState.isEnabled()) {
        campaignState.resetCampaign();
    }

    if (isBearMarket) {
        // 1-hit = 1-life is now default for all modes
        // Bear Market speed handled in getGridSpeed() via 1.3x multiplier
        showDanger("🩸 " + t('SURVIVE_CRASH') + " 🩸");
    }

    updateKillCounter(); // Reset display
    miniBoss = null;
    G.DropSystem.reset(); // Reset drop system (pity timer, weapon cooldown, boss drops)
    G.MemeEngine.reset(); // Reset meme engine (ticker timer, popup cooldown)
    perkPauseTimer = 0; // Reset perk pause
    perkPauseData = null;
    bossWarningTimer = 0; // Reset boss warning
    bossWarningType = null;

    // Reset visual effects
    shake = 0;
    deathAlreadyTracked = false; // Reset death tracking flag
    if (G.SkyRenderer) G.SkyRenderer.reset(); // Reset sky state (lightning, etc.)
    if (G.TransitionManager) G.TransitionManager.reset();

    updateLivesUI();

    // Initialize Harmonic Conductor
    if (G.HarmonicConductor) {
        G.HarmonicConductor.init(enemies, player, gameWidth, gameHeight);
        G.HarmonicConductor.setDifficulty(level, marketCycle, isBearMarket);
        G.HarmonicConductor.enabled = true;
    }

    // v4.28.0: Initialize CollisionSystem with game context
    initCollisionSystem();

    emitEvent('run_start', { bear: isBearMarket });

    // Story: Ship selection dialogue
    if (G.Story) {
        G.Story.onShipSelect(player.type);
    }
}

function highlightShip(idx) {
    document.querySelectorAll('.ship-card').forEach((el, i) => {
        el.style.transform = (i === idx) ? "scale(1.1)" : "scale(1)";
        el.style.border = (i === idx) ? "2px solid #00ff00" : "1px solid #333";
    });
}

function startIntermission(msgOverride) {
    setGameState('INTERMISSION');
    waveMgr.intermissionTimer = Balance.TIMING.INTERMISSION_DURATION;
    waveMgr.waveInProgress = false; // Safety reset

    // Hide any active story dialogue box - meme is shown in countdown overlay instead
    if (G.DialogueUI && G.DialogueUI.isVisible) G.DialogueUI.hide();

    // v2.22.5: Track intermission event
    G.Debug.trackIntermission(level, waveMgr.wave);

    // Convert all remaining enemy bullets to bonus points with explosion effect
    const bulletBonus = enemyBullets.length * 10;
    if (enemyBullets.length > 0) {
        enemyBullets.forEach(eb => {
            createExplosion(eb.x, eb.y, eb.color || '#ff0', 6);
        });
        if (bulletBonus > 0) {
            score += bulletBonus;
            updateScore(score);
            addText(`+${bulletBonus} ${t('BULLET_BONUS')}`, gameWidth / 2, gameHeight / 2 + 50, '#0ff', 18);
        }
    }

    // Release bullets back to pool before clearing (v2.22.3 memory leak fix)
    bullets.forEach(b => G.Bullet.Pool.release(b));
    enemyBullets.forEach(b => G.Bullet.Pool.release(b));
    bullets = []; enemyBullets = [];
    window.enemyBullets = enemyBullets; // Update for Player core hitbox indicator

    // Play wave complete jingle (unless boss defeat which has its own sound)
    if (!msgOverride) {
        audioSys.play('waveComplete');
        // Note: No showVictory() here - the countdown overlay provides visual feedback
    }

    // v4.6: Pick intermission meme via MemeEngine (curated + deduplicated)
    // Priority: level-specific story dialogues > INTERMISSION pool > fallback
    const dialogues = G.DIALOGUES;
    const levelMemes = dialogues && dialogues.LEVEL_COMPLETE && dialogues.LEVEL_COMPLETE[level];
    if (levelMemes && levelMemes.length > 0) {
        const picked = levelMemes[Math.floor(Math.random() * levelMemes.length)];
        intermissionMeme = (typeof picked === 'string' ? picked : (picked && picked.text)) || "HODL";
    } else {
        intermissionMeme = G.MemeEngine.getIntermissionMeme();
    }

    // v4.20.0: Show intermission meme via DOM popup
    if (intermissionMeme) {
        const memeDisplay = intermissionMeme.length > 50
            ? '\u201C' + intermissionMeme.substring(0, 47) + '...\u201D'
            : '\u201C' + intermissionMeme + '\u201D';
        G.MemeEngine.queueMeme('STREAK', memeDisplay, '');
    }

    // Show override text if provided (boss defeat, etc.)
    if (msgOverride) {
        addText(msgOverride, gameWidth / 2, gameHeight / 2 - 80, '#00ff00', 30);
    }
    emitEvent('intermission_start', { level: level, wave: waveMgr.wave });
}

function startHordeTransition() {
    // Horde 1 cleared, brief pause before horde 2
    // This is a quick transition - NOT a full level complete celebration

    // v2.22.5: Track horde transition
    G.Debug.trackHordeTransition(1, 2, waveMgr.wave);

    waveMgr.startHordeTransition();
    waveMgr.waveInProgress = false;

    // Convert enemy bullets to half bonus (less reward between hordes)
    const bulletBonus = Math.floor(enemyBullets.length * 5); // Half value compared to intermission
    if (enemyBullets.length > 0) {
        enemyBullets.forEach(eb => {
            createExplosion(eb.x, eb.y, eb.color || '#ff0', 4);
        });
        if (bulletBonus > 0) {
            score += bulletBonus;
            updateScore(score);
        }
    }

    // Clear bullets but keep player state (graze meter, etc.)
    // Release bullets back to pool before clearing (v2.22.3 memory leak fix)
    bullets.forEach(b => G.Bullet.Pool.release(b));
    enemyBullets.forEach(b => G.Bullet.Pool.release(b));
    bullets = [];
    enemyBullets = [];
    window.enemyBullets = enemyBullets;

    // Softer sound for horde transition (not full waveComplete celebration)
    audioSys.play('coinScore');

    // No message here - wait for "HORDE 2!" in startHorde2()
    // This keeps the transition clean and quick

    emitEvent('horde_transition', { wave: waveMgr.wave, fromHorde: 1, toHorde: 2 });
}

function startHorde2() {
    // Spawn horde 2 for current wave
    setGameState('PLAY');
    waveMgr.waveInProgress = false;

    // v4.4: Horde 2 notification via WAVE_STRIP
    if (G.MessageSystem) {
        const text = G.TEXTS?.[currentLang]?.HORDE_2_INCOMING || 'HORDE 2!';
        G.MessageSystem.showWaveStrip(text);
    }
    triggerScreenFlash('WAVE_START');

    // Spawn horde 2 with pattern variant
    const spawnData = waveMgr.spawnWave(gameWidth, 2);
    enemies = spawnData.enemies;
    lastWavePattern = spawnData.pattern;
    gridDir = 1;

    // v2.22.5: Track wave start (horde 2)
    G.Debug.trackWaveStart(waveMgr.wave - 1, 2, level, spawnData.pattern, enemies.length);

    // Sync global enemies reference
    G.enemies = enemies;

    // Track wave start time for this horde
    waveStartTime = totalTime;

    // Update Harmonic Conductor for horde 2
    if (G.HarmonicConductor) {
        G.HarmonicConductor.enemies = enemies;
        G.HarmonicConductor.setDifficulty(level, marketCycle, isBearMarket);
        G.HarmonicConductor.setSequence(lastWavePattern, audioSys.intensity, isBearMarket);
        G.HarmonicConductor.startWave(enemies.length);
    }

    emitEvent('horde_start', { wave: waveMgr.wave, horde: 2, pattern: lastWavePattern });
}

function startBossWarning() {
    console.log(`[BOSS WARNING] Called. level=${level}, cycle=${marketCycle}, wave=${waveMgr.wave}`);
    // v4.21: Unified boss rotation for both Story and Arcade (FED→BCE→BOJ cycle)
    const bossRotation = G.BOSS_ROTATION || ['FEDERAL_RESERVE', 'BCE', 'BOJ'];
    bossWarningType = bossRotation[(marketCycle - 1) % bossRotation.length];
    console.log(`[BOSS WARNING] Type: ${bossWarningType}, timer=${Balance.BOSS.WARNING_DURATION}s`);
    // Start warning timer
    bossWarningTimer = Balance.BOSS.WARNING_DURATION;

    // Clear remaining enemies and bullets for clean boss entrance
    enemies = [];
    bullets = [];
    enemyBullets.forEach(b => { b.markedForDeletion = true; G.Bullet.Pool.release(b); });
    enemyBullets = [];
    // Sync all array references
    G.enemies = enemies;
    window.enemyBullets = enemyBullets;
    if (G.HarmonicConductor) G.HarmonicConductor.enemies = enemies;

    // Play warning sound (use explosion for dramatic effect)
    audioSys.play('explosion');

    // Dramatic screen shake
    shake = 10;
}

function spawnBoss() {
    console.log(`[SPAWN BOSS] Called. level=${level}, cycle=${marketCycle}`);
    // v4.21: Unified boss rotation for both Story and Arcade (FED→BCE→BOJ cycle)
    const bossRotation = G.BOSS_ROTATION || ['FEDERAL_RESERVE', 'BCE', 'BOJ'];
    let bossType = bossRotation[(marketCycle - 1) % bossRotation.length];
    const campaignState = G.CampaignState; // Still needed for NG+ multiplier

    const bossConfig = G.BOSSES[bossType] || G.BOSSES.FEDERAL_RESERVE;

    // Flash color based on boss via TransitionManager
    const bossFlashColor = bossType === 'BCE' ? '#000033' : (bossType === 'BOJ' ? '#330000' : '#400000');
    if (G.TransitionManager) G.TransitionManager.startFadeOut(0.6, bossFlashColor);

    boss = new G.Boss(gameWidth, gameHeight, bossType);
    window.boss = boss; // v2.22.5: Expose for debug overlay

    // Scale boss HP using Balance config
    const Balance = G.Balance;
    const hpConfig = Balance.BOSS.HP;
    const baseHp = hpConfig.BASE;
    const hpPerLevel = hpConfig.PER_LEVEL;
    const hpPerCycle = hpConfig.PER_CYCLE;

    // Perk-aware scaling: boss gets stronger based on player's accumulated power
    const perkCount = (runState && runState.perks) ? runState.perks.length : 0;
    const perkScaling = 1 + (perkCount * hpConfig.PERK_SCALE);

    // v4.10.2: Removed dmgCompensation (was punishing player for damage perks — counterintuitive)
    // perkScaling already accounts for perk count including Kinetic Rounds

    // NG+ scaling (campaign mode)
    const ngPlusMult = (campaignState && campaignState.isEnabled()) ? campaignState.getNGPlusMultiplier() : 1;

    const rawHp = baseHp + (level * hpPerLevel) + ((marketCycle - 1) * hpPerCycle);
    boss.hp = Math.max(hpConfig.MIN_FLOOR, Math.floor(rawHp * perkScaling * ngPlusMult));
    boss.maxHp = boss.hp;
    console.log(`[SPAWN BOSS] Type=${bossType}, HP=${boss.hp}, position=(${boss.x}, ${boss.y})`);

    // Analytics: Track boss fight start
    if (G.Debug) G.Debug.trackBossFightStart(bossType, marketCycle);

    // v2.22.5: Track boss spawn event
    G.Debug.trackBossSpawn(bossType, boss.hp, level, marketCycle);

    // Reset boss drop tracking for new boss fight
    G.DropSystem.resetBossDrops();

    // v2.22.1 fix: Clear all entities for clean boss entrance
    enemies = [];
    if (window.Game) window.Game.enemies = enemies;

    // v2.22.4: Clear miniBoss if active - only main boss should exist
    if (miniBoss) {
        miniBoss.active = false;
        miniBoss = null;
        if (waveMgr) waveMgr.miniBossActive = false;
    }

    // Clear player bullets to prevent instant boss damage from bullets fired during warning
    const bulletsClearedCount = bullets.length;
    bullets.forEach(b => { b.markedForDeletion = true; G.Bullet.Pool.release(b); });
    bullets = [];
    console.log(`[SPAWN BOSS] Cleared ${bulletsClearedCount} player bullets, ${enemies.length} enemies`);

    // Boss-specific danger message
    const dangerMsg = bossConfig.country + ' ' + bossConfig.name + ' ' + bossConfig.country;
    showDanger("⚠️ " + dangerMsg + " ⚠️");
    G.MemeEngine.queueMeme('BOSS_SPAWN', getBossMeme(bossType), bossConfig.name);
    audioSys.play('bossSpawn');
    audioSys.setBossPhase(1); // Start boss music phase 1

    // Set Harmonic Conductor to boss sequence
    // IMPORTANT: Share same reference to prevent desync (v2.22.3 fix)
    if (G.HarmonicConductor) {
        G.HarmonicConductor.enemies = enemies;  // Share reference, don't create new array
        G.HarmonicConductor.setBossSequence(1);
    }

    // Start with boss-specific meme in the ticker
    if (ui.memeTicker) ui.memeTicker.innerText = getBossMeme(bossType);
    memeSwapTimer = Balance.MEMES.BOSS_TICKER_INTERVAL;

    // v4.20.0: Boss intro dialogue via meme popup (was DialogueUI at bottom)
    const bossIntroPool = G.DIALOGUES?.BOSS_INTRO?.[bossType];
    if (bossIntroPool && bossIntroPool.length > 0) {
        const intro = bossIntroPool[Math.floor(Math.random() * bossIntroPool.length)];
        G.MemeEngine.queueMeme('BOSS_SPAWN', intro.text, intro.speaker);
    }
}

// Mini-Boss System - v2.18.0: Spawns actual boss types based on currency mapping
// bossTypeOrSymbol: Either a boss type ('FEDERAL_RESERVE', 'BCE', 'BOJ') or currency symbol for legacy
// triggerColor: Color of the triggering currency (for visual theming)
function spawnMiniBoss(bossTypeOrSymbol, triggerColor) {
    // Slow down time for dramatic effect
    applyHitStop('BOSS_DEFEAT', false); // 500ms slowmo

    // Clear regular enemies and bullets for 1v1 fight
    enemyBullets.forEach(b => { b.markedForDeletion = true; G.Bullet.Pool.release(b); });
    enemyBullets = [];
    window.enemyBullets = enemyBullets; // Update for Player core hitbox indicator

    // Store current enemies to restore later
    const savedEnemies = [...enemies];
    enemies = [];
    // Update global references
    G.enemies = enemies;
    if (window.Game) window.Game.enemies = enemies;

    // Pause wave spawning during mini-boss
    if (waveMgr) waveMgr.miniBossActive = true;

    // Stop HarmonicConductor from firing (it has its own enemies reference)
    if (G.HarmonicConductor) {
        G.HarmonicConductor.enemies = enemies; // Now empty
    }

    // Determine if this is a boss type or legacy symbol
    const validBossTypes = ['FEDERAL_RESERVE', 'BCE', 'BOJ'];
    const isBossType = validBossTypes.includes(bossTypeOrSymbol);

    if (isBossType) {
        // v2.18.0: Spawn actual boss as mini-boss
        const bossType = bossTypeOrSymbol;
        const bossConfig = G.BOSSES[bossType] || G.BOSSES.FEDERAL_RESERVE;

        // Create actual Boss instance (scaled down HP for mini-boss encounter)
        miniBoss = new G.Boss(gameWidth, gameHeight, bossType);
        window.miniBoss = miniBoss; // v2.22.5: Expose for debug overlay
        miniBoss.isMiniBoss = true;
        miniBoss.savedEnemies = savedEnemies;
        miniBoss.triggerColor = triggerColor;

        // Scale HP for mini-boss (60% of normal boss HP) v2.24.10: 0.5→0.6 (+20%)
        const perkCount = (runState && runState.perks) ? runState.perks.length : 0;
        const perkScaling = 1 + (perkCount * Balance.BOSS.HP.PERK_SCALE);
        const fullBossHp = Balance.calculateBossHP(level, marketCycle);
        const miniBossHp = Math.floor(fullBossHp * 0.6 * perkScaling);
        miniBoss.hp = miniBossHp;
        miniBoss.maxHp = miniBossHp;

        // Display signature meme
        const signatureMeme = G.BOSS_SIGNATURE_MEMES?.[bossType];
        showDanger(bossConfig.name + ' ' + t('APPEARS'));
        if (signatureMeme) {
            G.MemeEngine.queueMeme('MINI_BOSS_SPAWN', signatureMeme, bossConfig.name);
        }
    } else {
        // Legacy: Spawn giant fiat currency mini-boss
        const symbol = bossTypeOrSymbol;
        const color = triggerColor;
        const fiatNames = { '¥': 'YEN', '€': 'EURO', '£': 'POUND', '$': 'DOLLAR', '₽': 'RUBLE', '₹': 'RUPEE', '₣': 'FRANC', '₺': 'LIRA', '元': 'YUAN', 'Ⓒ': 'CBDC' };

        // Mini-boss HP formula: significantly buffed + perk scaling
        const baseHp = 400;
        const hpPerLevel = 100;
        const hpPerCycle = 150;
        const perkCount = (runState && runState.perks) ? runState.perks.length : 0;
        const perkScaling = 1 + (perkCount * 0.10); // +10% HP per perk
        const rawHp = baseHp + (level * hpPerLevel) + (marketCycle * hpPerCycle);
        const scaledHp = Math.floor(rawHp * perkScaling);

        miniBoss = {
            x: gameWidth / 2,
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
            savedEnemies: savedEnemies, // Restore after defeat
            animTime: 0,
            active: true
        };
        window.miniBoss = miniBoss; // v2.22.5: Expose for debug overlay

        showDanger(miniBoss.name + ' ' + t('REVENGE'));
        G.MemeEngine.queueMeme('MINI_BOSS_SPAWN', getFiatDeathMeme(), miniBoss.name);
    }

    audioSys.play('bossSpawn');
}

function updateMiniBoss(dt) {
    if (!miniBoss || !miniBoss.active) return;

    // v2.18.0: Check if this is a Boss instance (isMiniBoss flag)
    if (miniBoss instanceof G.Boss) {
        // Use Boss's own update method
        const attackBullets = miniBoss.update(dt, player);
        if (attackBullets && attackBullets.length > 0) {
            for (const bd of attackBullets) {
                if (!canSpawnEnemyBullet()) break; // v2.24.6: Global cap
                const bullet = G.Bullet.Pool.acquire(
                    bd.x, bd.y, bd.vx, bd.vy, bd.color, bd.w, bd.h, false
                );
                // Copy special properties (homing, etc.)
                if (bd.isHoming) {
                    bullet.isHoming = true;
                    bullet.homingStrength = bd.homingStrength || 2.5;
                    bullet.targetX = player.x;
                    bullet.targetY = player.y;
                    bullet.maxSpeed = bd.maxSpeed || 200;
                }
                enemyBullets.push(bullet);
            }
        }
        return;
    }

    // Legacy mini-boss update
    miniBoss.animTime += dt;

    // Move to target position
    if (miniBoss.y < miniBoss.targetY) {
        miniBoss.y += 60 * dt;
    }

    // Oscillate horizontally
    miniBoss.x = gameWidth / 2 + Math.sin(miniBoss.animTime * 1.5) * 150;

    // Fire patterns
    miniBoss.fireTimer -= dt;
    if (miniBoss.fireTimer <= 0) {
        miniBoss.fireTimer = miniBoss.fireRate - (miniBoss.hp / miniBoss.maxHp) * 0.3;
        fireMiniBossBullets();
    }

    // Phase changes based on HP
    const hpPct = miniBoss.hp / miniBoss.maxHp;
    if (hpPct < 0.3 && miniBoss.phase < 2) {
        miniBoss.phase = 2;
        miniBoss.fireRate = 0.4;
        shake = 15;
    } else if (hpPct < 0.6 && miniBoss.phase < 1) {
        miniBoss.phase = 1;
        miniBoss.fireRate = 0.6;
    }
}

function fireMiniBossBullets() {
    if (!miniBoss) return;
    if (!canSpawnEnemyBullet()) return; // v2.24.6: Global cap
    const bulletSpeed = 170 + (miniBoss.phase * 42); // Reduced 15%

    // Different patterns per phase
    if (miniBoss.phase === 0) {
        // Simple aimed shot
        const dx = player.x - miniBoss.x;
        const dy = player.y - miniBoss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const vx = (dx / dist) * bulletSpeed;
        const vy = (dy / dist) * bulletSpeed;
        enemyBullets.push(G.Bullet.Pool.acquire(miniBoss.x, miniBoss.y + 60, vx, vy, miniBoss.color, 8, 8, false));
    } else if (miniBoss.phase === 1) {
        // Triple spread
        for (let angle = -0.3; angle <= 0.3; angle += 0.3) {
            if (!canSpawnEnemyBullet()) break; // v2.24.6: Global cap
            const dx = player.x - miniBoss.x;
            const dy = player.y - miniBoss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const baseAngle = Math.atan2(dy, dx) + angle;
            const vx = Math.cos(baseAngle) * bulletSpeed;
            const vy = Math.sin(baseAngle) * bulletSpeed;
            enemyBullets.push(G.Bullet.Pool.acquire(miniBoss.x, miniBoss.y + 60, vx, vy, miniBoss.color, 8, 8, false));
        }
    } else {
        // Circle burst
        for (let i = 0; i < 8; i++) {
            if (!canSpawnEnemyBullet()) break; // v2.24.6: Global cap
            const angle = (Math.PI * 2 / 8) * i + miniBoss.animTime;
            const vx = Math.cos(angle) * bulletSpeed * 0.8;
            const vy = Math.sin(angle) * bulletSpeed * 0.8;
            enemyBullets.push(G.Bullet.Pool.acquire(miniBoss.x, miniBoss.y + 40, vx, vy, miniBoss.color, 6, 6, false));
        }
    }
    audioSys.play('enemyShoot');
}

function drawMiniBoss(ctx) {
    if (!miniBoss || !miniBoss.active) return;

    // v2.18.0: Check if this is a Boss instance
    if (miniBoss instanceof G.Boss) {
        miniBoss.draw(ctx);
        return;
    }

    // Legacy mini-boss drawing
    ctx.save();
    ctx.translate(miniBoss.x, miniBoss.y);

    // Pulsing glow based on HP
    const pulseAlpha = 0.3 + Math.sin(miniBoss.animTime * 5) * 0.2;
    const hpPct = miniBoss.hp / miniBoss.maxHp;

    // Outer glow
    ctx.fillStyle = `rgba(${hexToRgb(miniBoss.color)}, ${pulseAlpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, 80 + Math.sin(miniBoss.animTime * 3) * 10, 0, Math.PI * 2);
    ctx.fill();

    // Main body - giant hexagonal coin shape
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

    // Inner circle
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.fill();

    // Symbol
    ctx.fillStyle = miniBoss.color;
    ctx.font = 'bold 50px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(miniBoss.symbol, 0, 0);

    // HP bar
    const barWidth = 100;
    const barHeight = 8;
    ctx.fillStyle = '#333';
    ctx.fillRect(-barWidth / 2, 70, barWidth, barHeight);
    ctx.fillStyle = hpPct > 0.3 ? miniBoss.color : '#ff0000';
    ctx.fillRect(-barWidth / 2, 70, barWidth * hpPct, barHeight);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-barWidth / 2, 70, barWidth, barHeight);

    // Name tag
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Courier New';
    ctx.fillText(miniBoss.name + ' BOSS', 0, 90);

    ctx.restore();
}

function hexToRgb(hex) {
    return window.Game.ColorUtils.hexToRgb(hex);
}

function checkMiniBossHit(b) {
    if (!miniBoss || !miniBoss.active) return false;

    // v2.18.0: Handle Boss instance mini-boss
    const isBossInstance = miniBoss instanceof G.Boss;
    const hitboxW = isBossInstance ? miniBoss.width / 2 : 44;
    const hitboxH = isBossInstance ? miniBoss.height / 2 : 44;
    const bossX = isBossInstance ? (miniBoss.x + miniBoss.width / 2) : miniBoss.x;
    const bossY = isBossInstance ? (miniBoss.y + miniBoss.height / 2) : miniBoss.y;

    if (Math.abs(b.x - bossX) < hitboxW && Math.abs(b.y - bossY) < hitboxH) {
        const baseDmg = player.stats.baseDamage || 14;
        const dmgMult = (runState && runState.getMod) ? runState.getMod('damageMult', 1) : 1;
        let dmg = baseDmg * dmgMult;
        if (b.isHodl) dmg *= Balance.SCORE.HODL_MULT_BOSS; // HODL bonus vs boss

        if (isBossInstance) {
            miniBoss.damage(dmg);
        } else {
            miniBoss.hp -= dmg;
        }
        audioSys.play('hitEnemy');

        if (miniBoss.hp <= 0) {
            // Mini-boss defeated!
            // v2.22.5: Track mini-boss defeat
            G.Debug.trackMiniBossDefeat(isBossInstance ? miniBoss.bossType : miniBoss.name);

            // v2.24.3: Track mini-boss fight duration for analytics
            if (G.Debug._miniBossStartInfo) {
                const info = G.Debug._miniBossStartInfo;
                const duration = Date.now() - info.startTime;
                G.Debug.trackMiniBossFight(info.type, info.trigger, info.killCount, duration);
                G.Debug._miniBossStartInfo = null;
            }

            // === GHOST BULLET FIX v2.23.0 ===
            // Clear all mini-boss bullets (same as main boss cleanup at line ~2735)
            if (enemyBullets.length > 0) {
                G.Debug.log('BULLET', `[MINIBOSS] Cleared ${enemyBullets.length} ghost bullets on mini-boss defeat`);
                enemyBullets.forEach(b => G.Bullet.Pool.release(b));
                enemyBullets.length = 0;
                window.enemyBullets = enemyBullets;
            }

            // Reset HarmonicConductor to invalidate pending setTimeout callbacks (same as main boss)
            if (G.HarmonicConductor) {
                G.HarmonicConductor.reset();
            }

            // Set defensive flag for next frame cleanup (same as main boss)
            bossJustDefeated = true;

            const bonusScore = isBossInstance ? 3000 * marketCycle : 2000 * marketCycle;
            score += bonusScore;
            updateScore(score);

            // Epic mini-boss death
            const deathX = isBossInstance ? (miniBoss.x + miniBoss.width / 2) : miniBoss.x;
            const deathY = isBossInstance ? (miniBoss.y + miniBoss.height / 2) : miniBoss.y;
            const deathColor = isBossInstance ? (miniBoss.color || '#ffffff') : miniBoss.color;
            const deathSymbol = isBossInstance ? (miniBoss.symbol || '$') : miniBoss.symbol;
            const deathName = isBossInstance ? (miniBoss.name || 'BOSS') : miniBoss.name;

            createEnemyDeathExplosion(deathX, deathY, deathColor, deathSymbol);
            createExplosion(deathX - 40, deathY - 30, deathColor, 15);
            createExplosion(deathX + 40, deathY + 30, deathColor, 15);
            createExplosion(deathX, deathY, '#fff', 20);

            showVictory(deathName + ' ' + t('DESTROYED'));
            G.MemeEngine.queueMeme('MINI_BOSS_DEFEATED', isBossInstance ? "CENTRAL BANK REKT!" : "FIAT IS DEAD!", deathName);
            shake = 40;
            audioSys.play('explosion');

            // Hit stop for epic moment
            if (window.Game.applyHitStop) {
                window.Game.applyHitStop('BOSS_DEFEAT', false);
            }
            if (window.Game.triggerScreenFlash) {
                window.Game.triggerScreenFlash('BOSS_DEFEAT');
            }

            // Clear boss minions, then restore wave enemies (v4.6.1: fix stuck game when savedEnemies empty)
            enemies = (miniBoss.savedEnemies && miniBoss.savedEnemies.length > 0)
                ? miniBoss.savedEnemies
                : [];
            waveStartTime = totalTime;
            // Update global references
            G.enemies = enemies;
            if (window.Game) window.Game.enemies = enemies;

            // Update HarmonicConductor with restored enemies
            if (G.HarmonicConductor) {
                G.HarmonicConductor.enemies = enemies;
            }

            // Resume wave spawning
            if (waveMgr) waveMgr.miniBossActive = false;

            miniBoss = null;
            window.miniBoss = null; // v2.22.5: Sync for debug overlay
        }
        return true;
    }
    return false;
}

function update(dt) {
    if (gameState !== 'PLAY' && gameState !== 'INTERMISSION') return;

    // v2.22.6: Defensive cleanup - ensure no ghost bullets from previous boss persist
    if (bossJustDefeated) {
        if (enemyBullets.length > 0) {
            G.Debug.log('BULLET', `[DEFENSIVE] Cleared ${enemyBullets.length} ghost bullets after boss defeat`);
            enemyBullets.forEach(b => G.Bullet.Pool.release(b));
            enemyBullets.length = 0;
            window.enemyBullets = enemyBullets;
        }
        bossJustDefeated = false;
    }

    // HYPER MODE time dilation (slight slow-mo for better readability)
    if (player && player.isHyperActive && player.isHyperActive()) {
        dt *= Balance.HYPER.TIME_SCALE;
    }

    totalTime += dt;

    // Perk pause disabled - perks now show only as floating icon above ship
    // Game continues without interruption

    if (bulletCancelTimer > 0) {
        bulletCancelTimer -= dt;
        if (bulletCancelTimer <= 0) bulletCancelStreak = 0;
    }
    if (perkCooldown > 0) {
        perkCooldown -= dt;
    }
    if (volatilityTimer > 0) {
        volatilityTimer -= dt;
        if (volatilityTimer <= 0 && runState && runState.modifiers) {
            runState.modifiers.tempFireRateMult = 1;
        }
    }

    // Graze meter decay: lose points if not actively grazing (not during HYPER)
    const isHyperActive = player && player.isHyperActive && player.isHyperActive();
    if (!isHyperActive && grazeMeter > 0 && totalTime - lastGrazeTime > Balance.GRAZE.DECAY_DELAY) {
        grazeMeter = Math.max(0, grazeMeter - Balance.GRAZE.DECAY_RATE * dt);
        grazeMultiplier = 1 + (grazeMeter / Balance.GRAZE.MULT_DIVISOR) * (Balance.GRAZE.MULT_MAX - 1);

        // Check if meter dropped below threshold, hide HYPER ready indicator
        if (grazeMeter < Balance.HYPER.METER_THRESHOLD && player.hyperAvailable) {
            player.hyperAvailable = false;
        }
        updateGrazeUI();
    }

    // HYPER cooldown finished - can now rebuild meter
    if (player && player.hyperCooldown <= 0 && grazeMeter >= Balance.HYPER.METER_THRESHOLD && !player.hyperAvailable && !isHyperActive) {
        player.hyperAvailable = true;
        showGameInfo(t('HYPER_READY') + " [H]");
        audioSys.play('hyperReady');
    }

    // Boss meme rotation via popup (v4.20.0: replaces ticker)
    if (boss && boss.active && Balance.HUD_MESSAGES.MEME_TICKER) {
        memeSwapTimer -= dt;
        if (memeSwapTimer <= 0) {
            const bossConfig = G.BOSSES?.[boss.type];
            const bossLabel = bossConfig?.name || boss.type;
            G.MemeEngine.queueMeme('BOSS_TICKER', getBossMeme(boss.type), bossLabel);
            memeSwapTimer = Balance.MEMES.BOSS_TICKER_INTERVAL;
        }
    }
    // Hide legacy ticker if present
    if (ui.memeTicker) ui.memeTicker.style.display = 'none';

    // v2.22.1: Include boss warning state to prevent duplicate boss spawn actions
    const isBossActive = !!boss || bossWarningTimer > 0;
    const waveAction = waveMgr.update(dt, gameState, enemies.length, isBossActive);

    // Boss warning timer countdown
    if (bossWarningTimer > 0) {
        bossWarningTimer -= dt;
        if (bossWarningTimer <= 0) {
            G.Debug.log('BOSS', '[BOSS] Warning timer expired, spawning boss');
            spawnBoss(); // Actually spawn boss after warning
        }
    }

    if (waveAction) {
        G.Debug.log('WAVE', `[WAVE] Action: ${waveAction.action} | level=${level}, enemies=${enemies.length}, boss=${!!boss}, bossTimer=${bossWarningTimer.toFixed(2)}`);
        if (waveAction.action === 'START_HORDE_TRANSITION') {
            startHordeTransition();
        } else if (waveAction.action === 'START_HORDE_2') {
            startHorde2();
        } else if (waveAction.action === 'START_INTERMISSION') {
            // v4.21: Seamless wave transition — no blocking countdown
            // Inline cleanup (was in startIntermission)
            G.Debug.trackIntermission(level, waveMgr.wave);
            if (enemyBullets.length > 0) {
                const bulletBonus = enemyBullets.length * 10;
                enemyBullets.forEach(eb => createExplosion(eb.x, eb.y, eb.color || '#ff0', 6));
                if (bulletBonus > 0) {
                    score += bulletBonus;
                    updateScore(score);
                    addText(`+${bulletBonus} ${t('BULLET_BONUS')}`, gameWidth / 2, gameHeight / 2 + 50, '#0ff', 18);
                }
            }
            bullets.forEach(b => G.Bullet.Pool.release(b));
            enemyBullets.forEach(b => G.Bullet.Pool.release(b));
            bullets = []; enemyBullets = [];
            window.enemyBullets = enemyBullets;
            audioSys.play('waveComplete');
            // Queue meme via popup (non-blocking)
            const waveMeme = G.MemeEngine.getIntermissionMeme();
            if (waveMeme) G.MemeEngine.queueMeme('STREAK', '\u201C' + waveMeme + '\u201D', '');
            emitEvent('intermission_start', { level: level, wave: waveMgr.wave });
            // Immediately start next wave (fall through to START_WAVE)
            waveAction.action = 'START_WAVE';
        }
        if (waveAction.action === 'SPAWN_BOSS') {
            startBossWarning(); // Start warning instead of immediate spawn
        } else if (waveAction.action === 'START_WAVE') {
            setGameState('PLAY');
            triggerScreenFlash('WAVE_START'); // Brief white flash at wave start
            // Increment level for every wave EXCEPT the very first one (level=1, wave=1)
            const isFirstWaveEver = (level === 1 && waveMgr.wave === 1);
            if (!isFirstWaveEver) {
                level++;
                // v2.22.5: Track level up
                G.Debug.trackLevelUp(level, marketCycle);
                audioSys.setLevel(level); // Change music theme for new level
                audioSys.play('levelUp'); // Triumphant jingle
                updateLevelUI(); // With animation
                grazePerksThisLevel = 0; // Reset graze perk cap for new level
                // NOTE: Removed showGameInfo("📈 LEVEL " + level) - unified in wave info below
            }

            // v3.0.7: Unified compact wave info message
            const waveNumber = waveMgr.wave;
            const wavesPerCycle = G.Balance.WAVES.PER_CYCLE;
            const flavorKeys = ['WAVE_FLAVOR_1', 'WAVE_FLAVOR_2', 'WAVE_FLAVOR_3', 'WAVE_FLAVOR_4', 'WAVE_FLAVOR_5'];
            const flavorKey = flavorKeys[Math.min(waveNumber - 1, flavorKeys.length - 1)];
            const flavorText = t(flavorKey);

            // Format: "CYCLE X" + " • " + "WAVE Y/5" (localized)
            const cycleText = t('CYCLE') + ' ' + marketCycle;
            const waveText = t('WAVE_OF') + ' ' + waveNumber + '/' + wavesPerCycle;
            G.MessageSystem.showWaveInfo(cycleText, waveText, wavesPerCycle, flavorText);

            // Update global level BEFORE spawnWave so enemy HP scaling is correct
            window.currentLevel = level;

            // Reset horde state for new wave
            waveMgr.currentHorde = 1;
            miniBossThisWave = 0; // v4.10.2: Reset per-wave mini-boss counter

            const spawnData = waveMgr.spawnWave(gameWidth, 1); // Start with horde 1
            enemies = spawnData.enemies;
            lastWavePattern = spawnData.pattern;
            gridDir = 1;

            // v2.22.5: Track wave start
            G.Debug.trackWaveStart(waveMgr.wave, 1, level, spawnData.pattern, enemies.length);

            // Sync global enemies reference (used by Boss.js for minion spawning)
            G.enemies = enemies;

            // Track wave start time
            waveStartTime = totalTime;

            // Update Harmonic Conductor for new wave
            if (G.HarmonicConductor) {
                G.HarmonicConductor.enemies = enemies;
                G.HarmonicConductor.setDifficulty(level, marketCycle, isBearMarket);
                G.HarmonicConductor.setSequence(lastWavePattern, audioSys.intensity, isBearMarket);
                G.HarmonicConductor.startWave(enemies.length); // Track wave intensity
            }

            emitEvent('wave_start', { wave: waveNumber, level: level, pattern: lastWavePattern, horde: 1 });
        }
    }

    if (gameState === 'PLAY') {
        // Always update player for movement, but block firing while enemies enter formation
        const enemiesEntering = G.HarmonicConductor && G.HarmonicConductor.areEnemiesEntering();
        const newBullets = player.update(dt, enemiesEntering);
        if (newBullets && newBullets.length > 0) {
            bullets.push(...newBullets);
            createMuzzleFlashParticles(player.x, player.y - 25, player.stats.color, {
                shotLevel: player.shotLevel || 1,
                hasPower: player.modifiers?.power?.level > 0,
                hasRate: player.modifiers?.rate?.level > 0
            });
        }

        // Power-up economy tracking: modifier overlap per frame
        if (G.Debug?.analytics?.runStart) {
            const mods = player.modifiers;
            const activeCount = (mods.rate.timer > 0 ? 1 : 0) + (mods.power.timer > 0 ? 1 : 0) + (mods.spread.timer > 0 ? 1 : 0);
            G.Debug.trackModifierFrame(activeCount);
        }

        // HYPER MODE: manual activation removed in v4.21 (now auto-activates when meter is full)
        // Legacy manual trigger kept as fallback if AUTO_ACTIVATE is disabled
        if (!Balance.HYPER.AUTO_ACTIVATE && (inputSys.isDown('KeyH') || inputSys.touch.hyper) && player.canActivateHyper && player.canActivateHyper(grazeMeter)) {
            player.activateHyper();
            grazeMeter = 0;
            updateGrazeUI();
            triggerScreenFlash('HYPER_ACTIVATE');
        }

        let sPct = player.shieldActive ? 100 : Math.max(0, 100 - (player.shieldCooldown / 8 * 100));
        setStyle('shieldBar', 'width', sPct + "%");
        setStyle('shieldBar', 'backgroundColor', player.shieldActive ? '#fff' : (player.shieldCooldown <= 0 ? player.stats.color : '#555'));
        updateShieldButton(player);
        updateHyperButton(player, grazeMeter);

        // v4.1.0: Update dynamic difficulty rank
        if (G.RankSystem) G.RankSystem.update(dt);

        updateBullets(dt);
        updateEnemies(dt);

        if (boss && boss.active) {
            const bossBullets = boss.update(dt, player);
            if (bossBullets && bossBullets.length > 0) {
                for (var bi = 0, bLen = bossBullets.length; bi < bLen; bi++) {
                    if (!canSpawnEnemyBullet()) break;
                    var bd = bossBullets[bi];
                    var bullet = G.Bullet.Pool.acquire(bd.x, bd.y, bd.vx, bd.vy, bd.color, bd.w, bd.h, false);
                    if (bd.isHoming) {
                        bullet.isHoming = true;
                        bullet.homingStrength = bd.homingStrength || 2.5;
                        bullet.targetX = player ? player.x : gameWidth / 2;
                        bullet.targetY = player ? player.y : gameHeight;
                        bullet.maxSpeed = bd.maxSpeed || 200;
                    }
                    enemyBullets.push(bullet);
                }
            }
            // Update drop system cooldowns
            G.DropSystem.update(dt);
        }

        // Mini-boss update (fiat revenge boss)
        if (miniBoss && miniBoss.active) {
            updateMiniBoss(dt);
        }

        // Dynamic music intensity calculation
        let intensity = 0;
        intensity += enemyBullets.length * 2;        // +2 per enemy bullet on screen
        intensity += (100 - grazeMeter);             // Less graze = more tension
        intensity += boss ? 30 : 0;                  // Boss present
        intensity += lives === 1 ? 20 : 0;           // Last life (1-hit = 1-life system)
        intensity += enemies.length;                 // More enemies = more intense
        audioSys.setIntensity(intensity);

        // Near-death heartbeat (last life in 1-hit = 1-life system)
        if (lives === 1) {
            if (!audioSys.isNearDeath) {
                audioSys.setNearDeath(true);
            }
            // Play heartbeat every 0.75s
            if (typeof nearDeathTimer === 'undefined') window.nearDeathTimer = 0;
            window.nearDeathTimer -= dt;
            if (window.nearDeathTimer <= 0) {
                audioSys.play('nearDeath');
                window.nearDeathTimer = 0.75;
            }
        } else {
            if (audioSys.isNearDeath) {
                audioSys.setNearDeath(false);
            }
            window.nearDeathTimer = 0;
        }
    }
    updateFloatingTexts(dt);
    updateTypedMessages(dt);
    updatePerkIcons(dt);
    updateParticles(dt);
    if (G.TransitionManager) G.TransitionManager.update(dt);
}

function updateBullets(dt) {
    // Player Bullets — update + collision via CollisionSystem
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        if (!b) { bullets.splice(i, 1); continue; }
        b.update(dt, enemies, boss);
        if (b.markedForDeletion) {
            G.Bullet.Pool.release(b);
            bullets.splice(i, 1);
        } else {
            // v4.28.0: Boss collision delegated to CollisionSystem
            if (boss && boss.active) {
                if (G.CollisionSystem.processPlayerBulletVsBoss(b, i, bullets)) {
                    continue; // Hit or killed boss, bullet handled
                }
            }
            if (miniBoss && miniBoss.active && checkMiniBossHit(b)) {
                if (!b.penetration) {
                    b.markedForDeletion = true;
                    G.Bullet.Pool.release(b);
                    bullets.splice(i, 1);
                }
            } else {
                // v4.28.0: Enemy collision delegated to CollisionSystem
                G.CollisionSystem.processPlayerBulletVsEnemy(b, i, bullets);
            }
        }
    }

    // v4.28.0: Enemy bullet vs player delegated to CollisionSystem
    G.CollisionSystem.processEnemyBulletsVsPlayer(dt);
}

// Graze spark effect - particles flying toward player
function createGrazeSpark(bx, by, px, py, isCloseGraze = false) {
    if (G.ParticleSystem) G.ParticleSystem.createGrazeSpark(bx, by, px, py, isCloseGraze);
}

// Update graze meter UI
function updateGrazeUI() {
    const fill = document.getElementById('graze-fill');
    const meter = document.getElementById('graze-meter');
    if (fill) {
        fill.style.width = grazeMeter + '%';
    }
    // Pulsing effect when meter is full
    if (meter) {
        if (grazeMeter >= 100) {
            meter.classList.add('graze-full');
        } else {
            meter.classList.remove('graze-full');
        }
    }
    const count = document.getElementById('graze-count');
    if (count) {
        count.textContent = grazeCount;
    }
}

// Draw HYPER mode UI (timer and ready indicator)
function drawHyperUI(ctx) {
    if (!player) return;

    const isHyperActive = player.isHyperActive && player.isHyperActive();
    const centerX = gameWidth / 2;

    // HYPER ACTIVE: Show countdown timer at top
    if (isHyperActive) {
        const timeLeft = player.getHyperTimeRemaining ? player.getHyperTimeRemaining() : 0;
        const pulse = Math.sin(totalTime * 10) * 0.1 + 0.9;

        ctx.save();

        // Background bar
        const barWidth = 200;
        const barHeight = 30;
        const barX = centerX - barWidth / 2;
        const barY = 55;

        // Bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

        // Time fill (golden, depleting)
        const fillRatio = timeLeft / Balance.HYPER.BASE_DURATION;
        const fillColor = fillRatio < 0.3 ? '#ff4444' : '#FFD700';
        ctx.fillStyle = fillColor;
        ctx.fillRect(barX, barY, barWidth * Math.min(1, fillRatio), barHeight);

        // Border
        ctx.strokeStyle = fillRatio < 0.3 ? '#ff6666' : '#fff';
        ctx.lineWidth = 3;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // HYPER text
        ctx.font = G.ColorUtils.font('bold', 18 * pulse, '"Courier New", monospace');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText('HYPER x5', centerX, barY + barHeight / 2);
        ctx.fillText('HYPER x5', centerX, barY + barHeight / 2);

        // Time remaining number
        ctx.font = 'bold 24px "Courier New", monospace';
        ctx.fillStyle = fillColor;
        ctx.strokeText(timeLeft.toFixed(1) + 's', centerX, barY + barHeight + 20);
        ctx.fillText(timeLeft.toFixed(1) + 's', centerX, barY + barHeight + 20);

        ctx.restore();
    }
    // HYPER READY: Show pulsing indicator
    else if (player.hyperAvailable && grazeMeter >= Balance.HYPER.METER_THRESHOLD) {
        const pulse = Math.sin(totalTime * 6) * 0.15 + 0.85;

        ctx.save();
        ctx.font = G.ColorUtils.font('bold', 20 * pulse, '"Courier New", monospace');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        var hyperReadyLabel = '⚡ ' + t('HYPER_READY') + ' [H] ⚡';
        ctx.strokeText(hyperReadyLabel, centerX, 70);
        ctx.fillText(hyperReadyLabel, centerX, 70);

        ctx.restore();
    }
    // HYPER COOLDOWN: Show cooldown timer
    else if (player.hyperCooldown > 0) {
        ctx.save();
        ctx.font = '14px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(150, 150, 150, 0.7)';
        ctx.fillText(`HYPER: ${player.hyperCooldown.toFixed(1)}s`, centerX, 70);
        ctx.restore();
    }
}

// Draw Satoshi's Sacrifice UI (decision button or active countdown)
function drawSacrificeUI(ctx) {
    const centerX = gameWidth / 2;
    const centerY = gameHeight / 2;
    const config = Balance.SACRIFICE;

    // DECISION MODE: Show sacrifice button
    if (sacrificeState === 'DECISION') {
        ctx.save();

        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, gameWidth, gameHeight);

        // Pulsing button
        const pulse = Math.sin(totalTime * 8) * 0.1 + 1;
        const btnSize = config.BUTTON_SIZE * pulse;

        // Button glow
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 30;

        // Button background
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, btnSize);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(0.7, '#F7931A');
        gradient.addColorStop(1, '#996600');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, btnSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // Button border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Bitcoin symbol
        ctx.font = G.ColorUtils.font('bold', btnSize * 0.5, 'Arial');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText('₿', centerX, centerY - 5);

        // Text above button
        ctx.font = 'bold 28px "Courier New", monospace';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.strokeText('SATOSHI\'S SACRIFICE', centerX, centerY - btnSize / 2 - 40);
        ctx.fillText('SATOSHI\'S SACRIFICE', centerX, centerY - btnSize / 2 - 40);

        // Instructions below button
        ctx.font = 'bold 18px "Courier New", monospace';
        ctx.fillStyle = '#FFD700';
        ctx.strokeText('[SPACE] to SACRIFICE ALL ' + Math.floor(sacrificeScoreAtStart) + ' PTS', centerX, centerY + btnSize / 2 + 30);
        ctx.fillText('[SPACE] to SACRIFICE ALL ' + Math.floor(sacrificeScoreAtStart) + ' PTS', centerX, centerY + btnSize / 2 + 30);

        // Timer
        ctx.font = 'bold 24px "Courier New", monospace';
        const timerColor = sacrificeDecisionTimer < 1 ? '#ff4444' : '#fff';
        ctx.fillStyle = timerColor;
        ctx.fillText(sacrificeDecisionTimer.toFixed(1) + 's', centerX, centerY + btnSize / 2 + 60);

        ctx.restore();
    }
    // ACTIVE MODE: Show countdown and score tracker
    else if (sacrificeState === 'ACTIVE') {
        ctx.save();

        const timeLeft = sacrificeActiveTimer;
        const pulse = Math.sin(totalTime * 6) * 0.1 + 1;

        // Large countdown at top
        ctx.font = G.ColorUtils.font('bold', config.COUNTDOWN_FONT_SIZE * pulse, '"Courier New", monospace');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Glow
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 20;

        ctx.fillStyle = timeLeft < 3 ? '#ff4444' : '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 5;
        ctx.strokeText('SATOSHI MODE', centerX, 100);
        ctx.fillText('SATOSHI MODE', centerX, 100);

        ctx.font = 'bold 48px "Courier New", monospace';
        ctx.strokeText(Math.ceil(timeLeft) + 's', centerX, 150);
        ctx.fillText(Math.ceil(timeLeft) + 's', centerX, 150);

        // Score tracker (bottom)
        ctx.font = 'bold 20px "Courier New", monospace';
        ctx.fillStyle = '#FFD700';
        const needed = Math.floor(sacrificeScoreAtStart * config.SUCCESS_THRESHOLD);
        const earned = Math.floor(sacrificeScoreEarned);
        const progress = earned >= needed ? '✓ GOAL MET!' : earned + ' / ' + needed;
        ctx.strokeText('x10 SCORE | ' + progress, centerX, gameHeight - 50);
        ctx.fillText('x10 SCORE | ' + progress, centerX, gameHeight - 50);

        ctx.restore();
    }
}

// v4.28.0: checkBulletCollisions removed — logic moved to CollisionSystem.processPlayerBulletVsEnemy

function updateEnemies(dt) {
    let hitEdge = false;
    const currentGridSpeed = getGridSpeed(); // Dynamic grid speed

    // Update Harmonic Conductor (handles beat-synced telegraph visuals)
    if (G.HarmonicConductor) {
        G.HarmonicConductor.update(dt);
    }

    // Block grid movement until ALL enemies have completed entry animation
    const allSettled = enemies.length > 0 && !enemies.some(e => e && !e.hasSettled);
    const effectiveGridDir = allSettled ? gridDir : 0;

    // Cache player hitbox size once (avoid repeated property access per enemy)
    const hitR = (player.stats.hitboxSize || 30) + 15;
    const playerX = player.x;
    const playerY = player.y;

    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e) continue; // Safety check
        e.update(dt, totalTime, lastWavePattern, currentGridSpeed, effectiveGridDir, playerX, playerY);
        // Only check edges when formation is complete (all settled)
        if (allSettled && ((gridDir === 1 && e.x > gameWidth - 20) || (gridDir === -1 && e.x < 20))) hitEdge = true;

        // Kamikaze trigger - weak tier enemies occasionally dive at player
        if (e.isKamikaze && !e.kamikazeDiving && e.y > gameHeight * 0.33 && Math.random() < 0.0005) {
            e.triggerKamikaze();
        }

        // Collision check with player (consolidated from forEach)
        if (Math.abs(e.x - playerX) < hitR && Math.abs(e.y - playerY) < hitR) {
            if (player.takeDamage()) {
                updateLivesUI(true); // Hit animation
                shake = 40; // Heavy shake
                applyHitStop('PLAYER_HIT', false); // Contact hit slowmo
                triggerScreenFlash('PLAYER_HIT');
                emitEvent('player_hit', { hp: player.hp, maxHp: player.maxHp });
                if (player.hp <= 0) {
                    startDeathSequence();
                }
            }
            if (player.hp > 0) streak = 0;
        }
    }

    // Bear Market: enemies drop faster (Panic Selling)
    // Note: hitEdge only triggers when allSettled=true, so all enemies are settled here
    if (hitEdge) {
        gridDir *= -1;
        const dropAmount = isBearMarket ? 35 : 20;
        for (let i = 0, len = enemies.length; i < len; i++) {
            enemies[i].baseY += dropAmount;
        }
    }
}

function startDeathSequence() {
    // Check if Satoshi's Sacrifice should be offered
    const sacrificeConfig = Balance.SACRIFICE;
    const canSacrifice = sacrificeConfig && sacrificeConfig.ENABLED &&
                         lives === 1 && // Last life
                         score > 0 && // Has score to sacrifice
                         sacrificeState === 'NONE' && // Not already in sacrifice
                         sacrificesUsedThisRun < 1; // Max 1 sacrifice per run

    if (canSacrifice) {
        // Enter sacrifice decision state instead of death
        enterSacrificeDecision();
        return;
    }

    // v4.1.0: Signal death to rank system
    if (G.RankSystem) G.RankSystem.onDeath();

    // Normal death sequence (1-hit = 1-life system)
    // 1. Explode ALL enemy bullets visually (not just clear them)
    enemyBullets.forEach(b => {
        if (b && !b.markedForDeletion) {
            // Create explosion effect for each bullet
            createBulletExplosion(b.x, b.y, b.color || '#ff0000');
        }
        b.markedForDeletion = true;
    });

    // 2. Bullet time 2 seconds (slowmo, not freeze - no countdown visuals)
    if (G.EffectsRenderer) {
        G.EffectsRenderer.setHitStop(Balance.TIMING.HIT_STOP_DEATH, false); // false = slowmo
        G.EffectsRenderer.applyImpactFlash(Balance.EFFECTS.FLASH.DEATH_OPACITY);
        G.EffectsRenderer.applyShake(Balance.EFFECTS.SHAKE.PLAYER_DEATH);
    }
    deathTimer = Balance.TIMING.DEATH_DURATION;

    // 3. Play Sound
    audioSys.play('explosion');
}

// Enter Satoshi's Sacrifice decision window
function enterSacrificeDecision() {
    sacrificeState = 'DECISION';
    sacrificeDecisionTimer = Balance.SACRIFICE.DECISION_WINDOW;
    sacrificeScoreAtStart = score;

    // Analytics: Track sacrifice opportunity
    if (G.Debug) G.Debug.trackSacrificeOpportunity();

    // Extreme slow-mo during decision
    // (handled in game loop via sacrificeState check)

    // Play dramatic sound
    audioSys.play('sacrificeOffer');

    // Screen effect
    shake = 20;
    triggerScreenFlash('PLAYER_HIT');
}

// Activate Satoshi's Sacrifice
function activateSacrifice() {
    sacrificeState = 'ACTIVE';
    sacrificeActiveTimer = Balance.SACRIFICE.INVINCIBILITY_DURATION;
    sacrificeScoreEarned = 0;
    sacrificesUsedThisRun++; // Increment sacrifice counter (max 1 per run)

    // Analytics: Track sacrifice accepted
    if (G.Debug) G.Debug.trackSacrificeAccepted();

    // Reset score to 0 (the sacrifice)
    score = 0;
    updateScore(0);

    // Make player invincible
    player.invulnTimer = Balance.SACRIFICE.INVINCIBILITY_DURATION + 1; // Slightly longer than mode

    // Play activation sound
    audioSys.play('sacrificeActivate');

    // Epic visual feedback
    applyHitStop('BOSS_DEFEAT', false); // Long slowmo
    triggerScreenFlash('BOSS_DEFEAT'); // White flash
    shake = 40;

    showDanger("⚡ SATOSHI MODE ⚡");
}

// End Satoshi's Sacrifice and determine outcome
function endSacrifice() {
    const config = Balance.SACRIFICE;
    const sacrificedAmount = sacrificeScoreAtStart;
    const earnedAmount = sacrificeScoreEarned;
    const success = earnedAmount >= (sacrificedAmount * config.SUCCESS_THRESHOLD);

    sacrificeState = 'NONE';
    sacrificeGhostTrail = [];

    // Analytics: Track sacrifice result
    if (G.Debug) G.Debug.trackSacrificeResult(success);

    if (success) {
        // SUCCESS - Satoshi approves!
        lives += config.SUCCESS_BONUS_LIVES;
        setUI('livesText', lives);
        updateLivesUI();

        showVictory("💎 SATOSHI APPROVES 💎");
        audioSys.play('sacrificeSuccess');
        applyHitStop('BOSS_DEFEAT', false);
        triggerScreenFlash('HYPER_ACTIVATE'); // Gold flash

        // Bonus message
        const profit = earnedAmount - sacrificedAmount;
        if (profit > 0) {
            showGameInfo("+" + Math.floor(profit) + " " + t('PROFIT'));
        }
    } else {
        // FAILURE - NGMI but survive
        showDanger("📉 NGMI 📉");
        audioSys.play('sacrificeFail');
        applyHitStop('PLAYER_HIT', false);
        triggerScreenFlash('PLAYER_HIT');

        // Still survive (that's the point of sacrifice)
        player.hp = 1;  // 1-hit = 1-life system
        player.invulnTimer = Balance.TIMING.INVULNERABILITY;
    }

    // Clear bullets for fairness
    enemyBullets.forEach(b => {
        b.markedForDeletion = true;
    });
}

// Decline sacrifice (let death happen)
function declineSacrifice() {
    sacrificeState = 'NONE';

    // Continue with normal death
    if (G.EffectsRenderer) {
        G.EffectsRenderer.setHitStop(Balance.TIMING.HIT_STOP_DEATH, true);
        G.EffectsRenderer.applyImpactFlash(Balance.EFFECTS.FLASH.DEATH_OPACITY);
        G.EffectsRenderer.applyShake(Balance.EFFECTS.SHAKE.PLAYER_DEATH);
    }
    deathTimer = Balance.TIMING.DEATH_DURATION;
    audioSys.play('explosion');
    enemyBullets.forEach(b => {
        b.markedForDeletion = true;
    });
}

function executeDeath() {
    lives--;
    setUI('livesText', lives);

    // Track death in analytics (skip if already tracked, e.g., HYPER death)
    if (G.Debug && !deathAlreadyTracked) {
        G.Debug.trackPlayerDeath(lives, level, 'bullet');
    }
    deathAlreadyTracked = false; // Reset for next death

    // WEAPON EVOLUTION v3.0: Apply death penalty (soft reset)
    if (player.applyDeathPenalty && Balance.WEAPON_EVOLUTION) {
        player.applyDeathPenalty();
        // v4.4: weapon status now shown via diegetic pips on ship
    }

    if (lives > 0) {
        // RESPAWN - 1-hit = 1-life system
        player.hp = 1;
        player.invulnTimer = Balance.TIMING.INVULNERABILITY;
        updateLivesUI();
        showGameInfo("💚 " + t('RESPAWN'));
        G.MemeEngine.queueMeme('DEATH', t('RESPAWN'), 'REKT');
        // Maybe move player to center?
        player.x = gameWidth / 2;
    } else {
        // GAME OVER
        triggerGameOver();
    }
}

function draw() {
    if (gameState === 'VIDEO') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, gameWidth, gameHeight); return; }

    // STORY_SCREEN: Full-screen narrative display
    if (gameState === 'STORY_SCREEN' && G.StoryScreen) {
        G.StoryScreen.draw(ctx, gameWidth, gameHeight);
        return;
    }

    ctx.save();
    // Apply screen shake via EffectsRenderer
    if (G.EffectsRenderer) {
        G.EffectsRenderer.applyShakeTransform(ctx);
    }

    // Sky via SkyRenderer
    if (G.SkyRenderer) {
        G.SkyRenderer.draw(ctx, { level, isBearMarket, bossActive: boss && boss.active });
    }

    // Impact Flash via EffectsRenderer
    if (G.EffectsRenderer) {
        G.EffectsRenderer.drawImpactFlash(ctx);
    }

    // HYPER MODE screen overlay (golden tint)
    const isHyperActive = player && player.isHyperActive && player.isHyperActive();
    if (isHyperActive && G.EffectsRenderer) {
        G.EffectsRenderer.drawHyperOverlay(ctx, totalTime);
    }

    // SACRIFICE MODE screen overlay (white/ethereal)
    if (sacrificeState === 'ACTIVE' && G.EffectsRenderer) {
        G.EffectsRenderer.drawSacrificeOverlay(ctx, totalTime);
        ctx.fillRect(-20, -20, gameWidth + 40, gameHeight + 40);
    }

    if (gameState === 'PLAY' || gameState === 'PAUSE' || gameState === 'GAMEOVER' || gameState === 'INTERMISSION') {
        // Draw sacrifice ghost trail (before player)
        if (sacrificeState === 'ACTIVE' && sacrificeGhostTrail.length > 0) {
            ctx.save();
            sacrificeGhostTrail.forEach((ghost, i) => {
                ctx.globalAlpha = ghost.alpha * 0.4;
                // Simple ghost silhouette
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(ghost.x, ghost.y, 20 - i * 2, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        }

        // Player glow during sacrifice
        if (sacrificeState === 'ACTIVE' && player) {
            ctx.save();
            const glowPulse = 1 + Math.sin(totalTime * 8) * 0.3;
            ctx.shadowColor = '#FFFFFF';
            ctx.shadowBlur = 30 * glowPulse;
            ctx.globalAlpha = 0.8;
        }

        player.draw(ctx);

        // End player glow
        if (sacrificeState === 'ACTIVE') {
            ctx.restore();
        }

        // Enemies (for loop instead of forEach) with off-screen culling
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (!e) continue; // Safety check
            // Skip draw if completely off-screen (80px margin for 58px enemies + shadow)
            if (e.x > -80 && e.x < gameWidth + 80 && e.y > -80 && e.y < gameHeight + 80) {
                e.draw(ctx);
            }
        }

        if (boss && boss.active) {
            boss.draw(ctx);
        }
        if (miniBoss && miniBoss.active) {
            drawMiniBoss(ctx);
        }

        // v4.30: Batched glow pass (additive) — all player bullet glows in one composite switch
        const _glowCfg = G.Balance?.GLOW;
        if (_glowCfg?.ENABLED && _glowCfg?.BULLET?.ENABLED) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < bullets.length; i++) {
                const b = bullets[i];
                if (b.x < -20 || b.x > gameWidth + 20 || b.y < -20 || b.y > gameHeight + 20) continue;
                b.drawGlow(ctx);
            }
            ctx.restore();
        }

        // Bullet bodies with culling (for loop)
        for (let i = 0; i < bullets.length; i++) {
            const b = bullets[i];
            // Off-screen culling (X and Y)
            if (b.x > -20 && b.x < gameWidth + 20 && b.y > -20 && b.y < gameHeight + 20) b.draw(ctx);
        }

        // Screen dimming when many enemy bullets (configurable)
        if (Balance?.JUICE?.SCREEN_EFFECTS?.SCREEN_DIMMING && enemyBullets.length > 15) {
            const dimAlpha = Math.min(0.25, (enemyBullets.length - 15) * 0.01);
            ctx.fillStyle = `rgba(0, 0, 0, ${dimAlpha})`;
            ctx.fillRect(0, 0, gameWidth, gameHeight);
        }

        // Harmonic Conductor telegraphs (draw BEFORE bullets for layering)
        if (G.HarmonicConductor) {
            G.HarmonicConductor.draw(ctx);
        }

        // Enemy bullets with culling
        for (let i = 0; i < enemyBullets.length; i++) {
            const eb = enemyBullets[i];
            if (!eb) continue; // Safety check
            // Off-screen culling (X and Y)
            if (eb.x > -20 && eb.x < gameWidth + 20 && eb.y > -20 && eb.y < gameHeight + 20) eb.draw(ctx);
        }

        // PowerUps with off-screen culling
        for (let i = 0; i < powerUps.length; i++) {
            const p = powerUps[i];
            if (!p) continue; // Safety check
            // Skip draw if completely off-screen (40px is powerup size)
            if (p.x > -40 && p.x < gameWidth + 40 && p.y > -40 && p.y < gameHeight + 40) {
                p.draw(ctx);
            }
        }

        drawParticles(ctx);

        // v4.30: Floating texts — shared setup hoisted before loop
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        for (let i = 0; i < floatingTexts.length; i++) {
            const t = floatingTexts[i];
            if (!t || t.life <= 0) continue;
            const maxLife = t.maxLife || 1.0;
            const fadeStart = maxLife * 0.3;
            const alpha = t.life < fadeStart ? t.life / fadeStart : 1;
            ctx.font = G.ColorUtils.font('bold', t.size || 20, 'Courier New');
            ctx.globalAlpha = alpha;
            const padding = 80;
            const clampedX = Math.max(padding, Math.min(gameWidth - padding, t.x));
            ctx.strokeText(t.text, clampedX, t.y);
            ctx.fillStyle = t.c;
            ctx.fillText(t.text, clampedX, t.y);
        }
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';

        // Perk icons (glow above player)
        drawPerkIcons(ctx);

        // Typed messages (GAME_INFO, DANGER, VICTORY) - distinct visual styles
        drawTypedMessages(ctx);

        // HYPER MODE UI (timer when active, "READY" when available)
        drawHyperUI(ctx);

        // SACRIFICE UI (decision button or active countdown)
        drawSacrificeUI(ctx);

        // v4.21: Intermission countdown removed (seamless wave transitions)
        // Boss-defeat intermission still uses timer but no visual countdown overlay
        // (boss defeat has its own celebration via showVictory/showDanger)
        if (gameState !== 'INTERMISSION') {
            lastCountdownNumber = 0;
        }

        // Perk pause overlay disabled - using floating icon above ship instead

        // Boss warning overlay
        if (bossWarningTimer > 0 && bossWarningType) {
            drawBossWarningOverlay(ctx);
        }
    }
    // Bear Market danger vignette overlay via SkyRenderer
    if (isBearMarket && gameState === 'PLAY' && G.SkyRenderer) {
        G.SkyRenderer.drawBearMarketOverlay(ctx, totalTime);
    }

    // Screen flash overlay via EffectsRenderer
    if (G.EffectsRenderer) {
        G.EffectsRenderer.drawScreenFlash(ctx);
        G.EffectsRenderer.drawScorePulse(ctx);
        // v4.4: Low-HP danger vignette
        G.EffectsRenderer.drawLowHPVignette(ctx, lives, totalTime);
    }

    ctx.restore(); // Restore shake

    // Screen transition overlay via TransitionManager
    if (G.TransitionManager) G.TransitionManager.draw(ctx);

    // Debug overlay (F3 toggle)
    if (debugMode) drawDebug(ctx);

    // v4.1.1: Expose HUD state for debug overlay
    if (G.Debug && G.Debug.OVERLAY_ENABLED) {
        G._hudState = {
            score, lives, level, gameState,
            grazeMeter, grazeCount, grazeMultiplier,
            killStreak, killStreakMult, bestStreak,
            floatingTexts: _countActive(floatingTexts),
            perkIcons: _countActive(perkIcons),
            intermissionMeme,
            intermissionTimer: waveMgr ? waveMgr.intermissionTimer : 0,
            bossWarningTimer,
            perkCooldown,
            bulletCancelStreak,
            player: player ? {
                x: Math.round(player.x),
                y: Math.round(player.y),
                hp: player.hp,
                shieldActive: player.shieldActive,
                shieldCooldown: player.shieldCooldown,
                hyperAvailable: player.hyperAvailable,
                isHyper: player.isHyperActive ? player.isHyperActive() : false,
                hyperTimer: player.getHyperTimeRemaining ? player.getHyperTimeRemaining() : 0,
                shotLevel: player.shotLevel || 1,
                special: player.special || null,
                specialTimer: player.specialTimer || 0,
                type: player.type
            } : null,
            msgSystem: {
                hasActive: G.MessageSystem ? G.MessageSystem.hasActiveMessages() : false
            },
            dialogue: {
                visible: G.DialogueUI ? G.DialogueUI.isVisible : false
            }
        };
        G.Debug.drawOverlay(ctx, gameState);
    }
    // v4.22: Bullet hitbox debug overlay
    if (G.BulletSystem && G.BulletSystem.debugEnabled) {
        G.BulletSystem.drawDebugOverlay(ctx, bullets, enemyBullets, enemies, player, boss);
    }
    // v4.10: Perf overlay always draws when perf profiling is active (independent of debug overlay)
    if (G.Debug._perf.overlayEnabled) {
        G.Debug.drawPerfOverlay(ctx, gameWidth);
    }
}

// Perk pause overlay - shows acquired perk with dimmed background
function drawPerkPauseOverlay(ctx) {
    if (!perkPauseData) return;

    const centerX = gameWidth / 2;
    const centerY = gameHeight / 2;

    // Dim background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    // Perk card background
    const cardW = 280;
    const cardH = 140;
    const cardX = centerX - cardW / 2;
    const cardY = centerY - cardH / 2;

    // Rarity colors
    const rarityColors = {
        common: '#888',
        uncommon: '#2ecc71',
        rare: '#3498db',
        epic: '#9b59b6'
    };
    const rarityColor = rarityColors[perkPauseData.rarity] || '#888';

    // Card with glow
    ctx.save();

    // Glow effect
    ctx.shadowColor = rarityColor;
    ctx.shadowBlur = 20;

    // Card background (manual rounded rect for compatibility)
    ctx.fillStyle = 'rgba(20, 20, 30, 0.95)';
    ctx.strokeStyle = rarityColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    const r = 10;
    ctx.moveTo(cardX + r, cardY);
    ctx.lineTo(cardX + cardW - r, cardY);
    ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + r);
    ctx.lineTo(cardX + cardW, cardY + cardH - r);
    ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - r, cardY + cardH);
    ctx.lineTo(cardX + r, cardY + cardH);
    ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - r);
    ctx.lineTo(cardX, cardY + r);
    ctx.quadraticCurveTo(cardX, cardY, cardX + r, cardY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    // "PERK ACQUIRED" header
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = rarityColor;
    ctx.fillText('PERK ACQUIRED', centerX, cardY + 22);

    // Icon + Name
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${perkPauseData.icon} ${perkPauseData.name}`, centerX, cardY + 60);

    // Description
    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText(perkPauseData.desc, centerX, cardY + 90);

    // Rarity badge
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = rarityColor;
    ctx.fillText(perkPauseData.rarity.toUpperCase(), centerX, cardY + 120);

    ctx.restore();
}

// Boss warning overlay - dramatic warning before boss spawns
function drawBossWarningOverlay(ctx) {
    if (!bossWarningType) return;

    const centerX = gameWidth / 2;
    const centerY = gameHeight / 2;

    // Get boss config for display
    const bossConfig = G.BOSSES[bossWarningType] || G.BOSSES.FEDERAL_RESERVE;

    // Pulsing red overlay
    const pulse = Math.sin(bossWarningTimer * 8) * 0.5 + 0.5; // 0-1 oscillation
    const overlayAlpha = 0.3 + pulse * 0.2;

    // Red danger overlay
    ctx.fillStyle = `rgba(80, 0, 0, ${overlayAlpha})`;
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    // Vignette effect
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, gameWidth * 0.7);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // "WARNING" flashing text
    const warningAlpha = pulse > 0.5 ? 1 : 0.3;
    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.fillStyle = `rgba(255, 50, 50, ${warningAlpha})`;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeText('⚠ WARNING ⚠', centerX, centerY - 60);
    ctx.fillText('⚠ WARNING ⚠', centerX, centerY - 60);

    // Boss name
    const bossName = bossConfig.name || 'CENTRAL BANK';
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(bossName, centerX, centerY);
    ctx.fillText(bossName, centerX, centerY);

    // "INCOMING" text
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillStyle = '#ff6666';
    ctx.strokeText('INCOMING', centerX, centerY + 40);
    ctx.fillText('INCOMING', centerX, centerY + 40);

    // Countdown (shows seconds remaining)
    const countdown = Math.ceil(bossWarningTimer);
    ctx.font = G.ColorUtils.font('bold', 60 + pulse * 10, '"Courier New", monospace');
    ctx.fillStyle = '#F7931A';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.strokeText(countdown, centerX, centerY + 110);
    ctx.fillText(countdown, centerX, centerY + 110);

    ctx.restore();
}

function drawDebug(ctx) {
    // Calculate FPS
    const now = performance.now();
    fpsHistory.push(now);
    while (fpsHistory.length > 0 && fpsHistory[0] < now - 1000) fpsHistory.shift();
    const fps = fpsHistory.length;

    ctx.save();
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(5, gameHeight - 85, 140, 80);

    ctx.fillStyle = fps >= 55 ? '#0f0' : (fps >= 30 ? '#ff0' : '#f00');
    ctx.fillText(`FPS: ${fps}`, 10, gameHeight - 70);
    ctx.fillStyle = '#0f0';
    ctx.fillText(`Particles: ${G.ParticleSystem ? G.ParticleSystem.getCount() : 0}/${G.ParticleSystem ? G.ParticleSystem.MAX_PARTICLES : 80}`, 10, gameHeight - 55);
    ctx.fillText(`Bullets: ${bullets.length}`, 10, gameHeight - 40);
    ctx.fillText(`Enemy Bullets: ${enemyBullets.length}`, 10, gameHeight - 25);
    ctx.fillText(`Enemies: ${enemies.length}`, 10, gameHeight - 10);
    ctx.restore();
}

// Sky functions moved to SkyRenderer.js

// Screen transition functions moved to TransitionManager.js
// drawBearMarketOverlay and drawSky moved to SkyRenderer.js

const MAX_FLOATING_TEXTS = 8; // Limit simultaneous floating texts (unified limit)

// Find an available slot or oldest entry to reuse (O(1) amortized vs O(n) shift)
function findFloatingTextSlot() {
    let oldestIdx = -1;
    let oldestLife = Infinity;
    for (let i = 0; i < floatingTexts.length; i++) {
        const ft = floatingTexts[i];
        if (!ft || ft.life <= 0) return i; // Empty/expired slot
        if (ft.life < oldestLife) {
            oldestLife = ft.life;
            oldestIdx = i;
        }
    }
    // No empty slot - grow array or overwrite oldest
    if (floatingTexts.length < MAX_FLOATING_TEXTS) return floatingTexts.length;
    return oldestIdx;
}

function addText(text, x, y, c, size = 20) {
    if (!Balance.HUD_MESSAGES.FLOATING_TEXT) return;
    const slot = findFloatingTextSlot();
    floatingTexts[slot] = { text, x, y, c, size, life: 1.0 };
}

// Floating score numbers (Ikeda juice - shows meaningful score gains)
function createFloatingScore(scoreValue, x, y) {
    const config = Balance.JUICE?.FLOAT_SCORE;
    if (!config) return;

    // Only show significant scores
    if (scoreValue < (config.MIN_VALUE || 100)) return;

    // Scale based on score magnitude
    let scale = 1;
    if (scoreValue >= 2000) {
        scale = config.SCALE_HUGE || 2.0;
    } else if (scoreValue >= 500) {
        scale = config.SCALE_LARGE || 1.5;
    }

    // v4.5: Streak-based scaling (scores grow with combo)
    const vfx = Balance?.VFX;
    if (vfx?.COMBO_SCORE_SCALE && killStreak > 5) {
        const streakBonus = Math.min(0.5, (killStreak - 5) * 0.03); // +3% per kill above 5, max +50%
        scale *= (1 + streakBonus);
    }

    const baseSize = 18;
    const size = Math.floor(baseSize * scale);
    const duration = config.DURATION || 1.2;
    const velocity = config.VELOCITY || -80;

    // Use slot-based insertion (O(1) instead of shift O(n))
    const slot = findFloatingTextSlot();
    floatingTexts[slot] = {
        text: '+' + Math.floor(scoreValue),
        x: x + (Math.random() - 0.5) * 20, // Slight randomization
        y: y,
        c: '#FFD700', // Gold
        size: size,
        life: duration,
        maxLife: duration,
        vy: velocity
    };
}

function updateFloatingTexts(dt) {
    for (let i = 0; i < floatingTexts.length; i++) {
        const ft = floatingTexts[i];
        if (!ft || ft.life <= 0) continue; // Skip empty/expired slots
        // Use custom velocity if set, otherwise default
        const velocity = ft.vy ? Math.abs(ft.vy) : 50;
        ft.y -= velocity * dt;
        ft.life -= dt;
        // No splice needed - slot will be reused by findFloatingTextSlot
    }
}

// --- PERK ICONS (Glow effect above player) ---
const RARITY_COLORS = {
    common: '#95a5a6',
    uncommon: '#3498db',
    rare: '#9b59b6',
    epic: '#f39c12'
};

function addPerkIcon(perk) {
    if (!Balance.HUD_MESSAGES.PERK_NOTIFICATION) return;
    if (!player || !perk) return;
    const lifetime = Balance.TIMING.PERK_ICON_LIFETIME;
    perkIcons.push({
        icon: perk.icon || '?',
        name: perk.name || 'Perk',
        color: RARITY_COLORS[perk.rarity] || RARITY_COLORS.common,
        rarity: perk.rarity || 'common',
        x: player.x,
        y: player.y - 60,
        life: lifetime,
        maxLife: lifetime,
        scale: 0,
        glowPhase: 0
    });
}

function updatePerkIcons(dt) {
    for (let i = perkIcons.length - 1; i >= 0; i--) {
        const p = perkIcons[i];
        p.life -= dt;
        p.y -= 25 * dt;   // Float upward
        p.glowPhase += dt * 6;  // Glow pulse speed

        // Scale animation: grow in first 0.3s, then shrink in last 0.5s
        const age = p.maxLife - p.life;
        if (age < 0.3) {
            p.scale = age / 0.3;  // 0 -> 1
        } else if (p.life < 0.5) {
            p.scale = p.life / 0.5;  // 1 -> 0
        } else {
            p.scale = 1;
        }

        if (p.life <= 0) perkIcons.splice(i, 1);
    }
}

// Helper to convert hex color to rgba (uses ColorUtils)
function hexToRgba(hex, alpha) {
    return window.Game.ColorUtils.hexToRgba(hex, alpha);
}

function drawPerkIcons(ctx) {
    for (let i = 0; i < perkIcons.length; i++) {
        const p = perkIcons[i];
        if (p.scale <= 0) continue;

        const alpha = Math.min(1, p.life / 0.5);  // Fade out in last 0.5s
        const glowIntensity = 0.5 + Math.sin(p.glowPhase) * 0.3;
        const size = 36 * p.scale;

        ctx.save();
        ctx.globalAlpha = alpha;

        // v4.11: Parse hex once, use cached rgba for gradient stops
        const CU = G.ColorUtils;
        if (!p._rgb) p._rgb = CU.parseHex(p.color);
        const pr = p._rgb.r, pg = p._rgb.g, pb = p._rgb.b;

        // Outer glow (large, soft)
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 1.8);
        gradient.addColorStop(0, CU.rgba(pr, pg, pb, glowIntensity * 0.5));
        gradient.addColorStop(0.5, CU.rgba(pr, pg, pb, 0.25));
        gradient.addColorStop(1, CU.rgba(pr, pg, pb, 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Inner glow (brighter)
        const innerGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 0.9);
        innerGlow.addColorStop(0, '#fff');
        innerGlow.addColorStop(0.3, p.color);
        innerGlow.addColorStop(1, CU.rgba(pr, pg, pb, 0));
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 0.9, 0, Math.PI * 2);
        ctx.fill();

        // Icon
        ctx.font = G.ColorUtils.font('bold', size, 'Arial');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // v4.11: Stroke outline instead of GPU-expensive shadowBlur
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.fillStyle = '#fff';
        ctx.strokeText(p.icon, p.x, p.y);
        ctx.fillText(p.icon, p.x, p.y);

        // Perk name below icon (smaller, fades in)
        if (p.scale > 0.5) {
            const nameAlpha = (p.scale - 0.5) * 2 * alpha;
            ctx.globalAlpha = nameAlpha;
            ctx.font = 'bold 14px "Courier New", monospace';
            // Clamp X to prevent name overflow at screen edges
            const namePadding = 60;
            const nameX = Math.max(namePadding, Math.min(gameWidth - namePadding, p.x));
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(p.name, nameX, p.y + size * 0.8);
            ctx.fillStyle = p.color;
            ctx.fillText(p.name, nameX, p.y + size * 0.8);
        }

        ctx.restore();
    }
}

// --- PARTICLES (Delegated to ParticleSystem) ---
// All particle functions delegate to G.ParticleSystem for centralized management

function addParticle(props) {
    return G.ParticleSystem ? G.ParticleSystem.addParticle(props) : false;
}

function createBulletSpark(x, y, color, opts) {
    if (G.ParticleSystem) G.ParticleSystem.createBulletSpark(x, y, color, opts);
}

function createPowerUpPickupEffect(x, y, color) {
    if (G.ParticleSystem) G.ParticleSystem.createPowerUpPickupEffect(x, y, color);
}

function createMuzzleFlashParticles(x, y, color, opts) {
    if (G.ParticleSystem) G.ParticleSystem.createMuzzleFlashParticles(x, y, color, opts);
}

function createExplosion(x, y, color, count = 12) {
    if (G.ParticleSystem) G.ParticleSystem.createExplosion(x, y, color, count);
}

// Bullet explosion effect for 1-hit = 1-life death sequence
function createBulletExplosion(x, y, color) {
    if (G.ParticleSystem) {
        // Double spark burst for more visible effect
        G.ParticleSystem.createBulletSpark(x, y, color);
        G.ParticleSystem.createBulletSpark(x, y, color);
    }
    // Play bullet cancel sound for each explosion
    if (audioSys) audioSys.play('bulletCancel');
}

function createEnemyDeathExplosion(x, y, color, symbol, shape) {
    if (G.ParticleSystem) G.ParticleSystem.createEnemyDeathExplosion(x, y, color, symbol, shape);
}

function createBossDeathExplosion(x, y) {
    if (G.ParticleSystem) G.ParticleSystem.createBossDeathExplosion(x, y);
}

function createScoreParticles(x, y, color) {
    if (G.ParticleSystem) G.ParticleSystem.createScoreParticles(x, y, color);
}

function updateParticles(dt) {
    if (G.ParticleSystem) G.ParticleSystem.update(dt);
}

function drawParticles(ctx) {
    if (G.ParticleSystem) G.ParticleSystem.draw(ctx);
}

let lastTime = 0;
let deathTimer = 0; // 💀 Sequence Timer
let deathAlreadyTracked = false; // Flag to prevent double tracking (HYPER deaths)
let gameOverPending = false;

// --- EFFECTS (Delegated to EffectsRenderer) ---
// Wrapper functions for backward compatibility
function applyHitStop(type, freeze = true) {
    if (G.EffectsRenderer) G.EffectsRenderer.applyHitStop(type, freeze);
}

function triggerScreenFlash(type) {
    if (G.EffectsRenderer) G.EffectsRenderer.triggerScreenFlash(type);
}

// Expose juice functions globally for entity classes to use
window.Game.applyHitStop = applyHitStop;
window.Game.triggerScreenFlash = triggerScreenFlash;

function loop(timestamp) {
    const realDt = (timestamp - lastTime) / 1000; // Save real delta before modifying lastTime
    let dt = realDt;
    lastTime = timestamp;
    if (dt > 0.1) dt = 0.1;

    // Update cached difficulty values once per frame
    updateDifficultyCache();
    _frameKills = 0; // v4.5: Reset multi-kill counter

    // v4.5: HYPER ambient sparkles
    if (player && player.isHyperActive && player.isHyperActive() && G.ParticleSystem) {
        const vfx = Balance?.VFX || {};
        _hyperAmbientTimer -= dt;
        if (_hyperAmbientTimer <= 0) {
            _hyperAmbientTimer = vfx.HYPER_AMBIENT_INTERVAL || 0.12;
            const gw = G._gameWidth || 600;
            const gh = G._gameHeight || 900;
            G.ParticleSystem.addParticle({
                x: Math.random() * gw,
                y: Math.random() * gh * 0.6,
                vx: (Math.random() - 0.5) * 20,
                vy: -15 - Math.random() * 25,
                life: 0.6 + Math.random() * 0.4,
                maxLife: 1.0,
                color: '#FFD700',
                size: 1.5 + Math.random() * 2
            });
        }
    }

    // Death Sequence (uses real time, not slowed time)
    if (deathTimer > 0) {
        deathTimer -= realDt;
        if (deathTimer <= 0) {
            deathTimer = 0;
            executeDeath(); // Trigger actual death logic after slow-mo
        }
    }

    // Satoshi's Sacrifice System
    if (sacrificeState === 'DECISION') {
        // Extreme slow-mo during decision
        dt *= Balance.SACRIFICE.DECISION_TIME_SCALE;

        // Update decision timer
        sacrificeDecisionTimer -= realDt;

        // Check for activation input (Space or touch)
        if (inputSys.isDown('Space') || inputSys.isDown('KeyS')) {
            activateSacrifice();
        }

        // Timer expired - decline automatically
        if (sacrificeDecisionTimer <= 0) {
            declineSacrifice();
        }
    } else if (sacrificeState === 'ACTIVE') {
        // Update sacrifice timer
        sacrificeActiveTimer -= realDt;

        // Update ghost trail for visual effect
        if (player) {
            sacrificeGhostTrail.unshift({ x: player.x, y: player.y, alpha: 1 });
            if (sacrificeGhostTrail.length > Balance.SACRIFICE.GHOST_TRAIL_COUNT) {
                sacrificeGhostTrail.pop();
            }
            // Fade ghost trail
            sacrificeGhostTrail.forEach((g, i) => {
                g.alpha = 1 - (i / sacrificeGhostTrail.length);
            });
        }

        // Warning when time is running low
        if (sacrificeActiveTimer <= Balance.SACRIFICE.WARNING_TIME && sacrificeActiveTimer > Balance.SACRIFICE.WARNING_TIME - 0.1) {
            showDanger("⚠️ " + Math.ceil(sacrificeActiveTimer) + t('TIME_LEFT'));
        }

        // Sacrifice ended
        if (sacrificeActiveTimer <= 0) {
            endSacrifice();
        }
    }

    // Update effects via EffectsRenderer (hit stop, screen flash, score pulse)
    if (G.EffectsRenderer) {
        const effectResult = G.EffectsRenderer.update(realDt);
        dt = effectResult.dt; // May be modified by hit stop
    }

    // Remove old "delayed game over" check since executeDeath handles it
    // if (player && player.hp <= 0 && hitStopTimer <= 0 && gameState === 'PLAY') { ... }

    // STORY_SCREEN: Update story display, skip normal game update
    if (gameState === 'STORY_SCREEN' && G.StoryScreen) {
        G.StoryScreen.update(dt);
        draw();
        requestAnimationFrame(loop);
        return; // Skip normal game update
    }

    // v4.10: Performance profiler timing
    var _perfT0 = 0, _perfT1 = 0, _perfT2 = 0;
    if (G.Debug._perf.enabled) _perfT0 = performance.now();

    update(dt);
    updatePowerUps(dt);
    // v4.4: Expose state to player for diegetic HUD drawing
    if (player) {
        player._livesDisplay = lives;
        player._grazePercent = typeof grazeMeter !== 'undefined' ? grazeMeter : 0;
        // Reuse object to avoid per-frame allocation
        var ws = player._weaponState || (player._weaponState = {});
        ws.shotLevel = player.shotLevel || 1;
        ws.modifiers = player.modifiers;
        ws.special = player.special;
        ws.specialTimer = player.specialTimer;
    }

    // v4.4: Reactive HUD - score streak colors + HYPER score
    updateReactiveHUD();
    // Sky update via SkyRenderer
    if (G.SkyRenderer) {
        const skyEffects = G.SkyRenderer.update(dt, { isBearMarket, gameState });
        if (skyEffects.shake > 0) shake = Math.max(shake, skyEffects.shake);
        if (skyEffects.playSound) audioSys.play(skyEffects.playSound);
    }

    if (G.Debug._perf.enabled) _perfT1 = performance.now();

    draw();

    // v4.10: Record frame perf data
    if (G.Debug._perf.enabled) {
        _perfT2 = performance.now();
        G.Debug.perfFrame(
            _perfT2 - _perfT0,
            _perfT1 - _perfT0,
            _perfT2 - _perfT1,
            {
                enemies: enemies ? enemies.length : 0,
                eBullets: enemyBullets ? enemyBullets.length : 0,
                pBullets: bullets ? bullets.length : 0,
                particles: G.ParticleSystem ? G.ParticleSystem.getCount() : 0
            }
        );
    }

    requestAnimationFrame(loop);
}

// Game Center Mock (replace with Capacitor plugin for iOS)
function submitToGameCenter(scoreValue) {
    // TODO: In production, use Capacitor GameCenter plugin
    // e.g., GameCenter.submitScore({ leaderboardId: 'fiat_invaders_highscore', score: scoreValue });
    // console.log('[GameCenter] Score submitted:', scoreValue);  // Removed for production
    emitEvent('gamecenter_submit', { score: scoreValue });
}

// Campaign Victory - All 3 central banks defeated!
function showCampaignVictory() {
    const campaignState = G.CampaignState;

    // Analytics: End run tracking (v4.11.0 — was missing, score stayed 0)
    if (G.Debug) G.Debug.endAnalyticsRun(Math.floor(score));

    // Dramatic screen effects
    shake = 30;
    if (G.TransitionManager) G.TransitionManager.startFadeOut(1.0, '#ffd700'); // Gold!

    // Show campaign complete screen
    setGameState('CAMPAIGN_VICTORY');

    // Create victory overlay if doesn't exist
    let victoryOverlay = document.getElementById('campaign-victory-screen');
    if (!victoryOverlay) {
        victoryOverlay = document.createElement('div');
        victoryOverlay.id = 'campaign-victory-screen';
        victoryOverlay.className = 'campaign-victory-screen';
        victoryOverlay.innerHTML = `
            <div class="victory-content">
                <h1 class="victory-title">🏆 CAMPAIGN COMPLETE 🏆</h1>
                <div class="victory-subtitle">ALL CENTRAL BANKS DESTROYED</div>
                <div class="boss-trophies">
                    <div class="trophy">💵 FED</div>
                    <div class="trophy">💶 BCE</div>
                    <div class="trophy">💴 BOJ</div>
                </div>
                <div class="final-score">FINAL SCORE: <span id="campaign-final-score">0</span></div>
                <div class="ng-plus-info" id="ng-plus-info"></div>
                <div class="victory-actions">
                    <button class="btn btn-primary btn-lg" onclick="startNewGamePlus()">NEW GAME+ 🔄</button>
                    <button class="btn btn-secondary" onclick="backToIntroFromVictory()">MAIN MENU</button>
                </div>
            </div>
        `;
        document.body.appendChild(victoryOverlay);
    }

    // Update score
    const scoreEl = document.getElementById('campaign-final-score');
    if (scoreEl) scoreEl.textContent = Math.floor(score);

    // Update NG+ info
    const ngInfo = document.getElementById('ng-plus-info');
    if (ngInfo) {
        const ngLevel = campaignState ? campaignState.ngPlusLevel : 0;
        if (ngLevel > 0) {
            ngInfo.textContent = `NG+${ngLevel} COMPLETE! Next: NG+${ngLevel + 1}`;
        } else {
            ngInfo.textContent = 'Unlock NG+ with carried perks!';
        }
    }

    victoryOverlay.style.display = 'flex';

    // Epic victory audio
    audioSys.play('levelUp');
    setTimeout(() => audioSys.play('levelUp'), 300);
    setTimeout(() => audioSys.play('levelUp'), 600);

    // Save high score
    if (score > highScore) {
        highScore = Math.floor(score);
        localStorage.setItem('fiat_highscore', highScore);
        // Update badge score display (v4.8)
        const badgeScore = document.getElementById('badge-score-value');
        if (badgeScore) badgeScore.innerText = highScore.toLocaleString();
        submitToGameCenter(highScore);
    }

    emitEvent('campaign_complete', { score: score, ngPlusLevel: campaignState?.ngPlusLevel || 0 });
}

// Start New Game+ with perk carryover
window.startNewGamePlus = function() {
    const campaignState = G.CampaignState;
    if (!campaignState) return;

    // Get current perks to carry over
    const perksToCarry = (runState && runState.perks) ? runState.perks.slice() : [];
    campaignState.startNewGamePlus(perksToCarry);

    // Hide victory screen
    const victoryOverlay = document.getElementById('campaign-victory-screen');
    if (victoryOverlay) victoryOverlay.style.display = 'none';

    // Apply carried perks to new run
    if (runState && runState.reset) runState.reset();
    if (runState && campaignState.getCarryoverPerks().length > 0) {
        // Re-apply carried perks
        const carriedPerks = campaignState.getCarryoverPerks();
        carriedPerks.forEach(perkId => {
            const perk = G.Upgrades?.ALL_PERKS?.find(p => p.id === perkId);
            if (perk && runState.applyPerk) {
                runState.applyPerk(perk);
            }
        });
    }

    // Start new campaign run
    startGame();
    updateCampaignProgressUI();

    audioSys.play('coinUI');
}

// Return to intro from campaign victory
window.backToIntroFromVictory = function() {
    const victoryOverlay = document.getElementById('campaign-victory-screen');
    if (victoryOverlay) victoryOverlay.style.display = 'none';

    backToIntro();
}

function triggerGameOver() {
    // Analytics: End run tracking
    if (G.Debug) {
        G.Debug.endAnalyticsRun(Math.floor(score));
    }

    if (score > highScore) {
        highScore = Math.floor(score);
        localStorage.setItem('fiat_highscore', highScore);
        // Update badge score display (v4.8)
        const badgeScore = document.getElementById('badge-score-value');
        if (badgeScore) badgeScore.innerText = highScore.toLocaleString();
        submitToGameCenter(highScore); // Game Center hook
    }
    setGameState('GAMEOVER');
    setStyle('gameover-screen', 'display', 'flex');
    setUI('finalScore', Math.floor(score));
    if (ui.gameoverMeme) ui.gameoverMeme.innerText = getRandomMeme();

    // Story: Game over dialogue
    if (G.Story) {
        G.Story.onGameOver();
    }
    if (ui.kills) ui.kills.innerText = killCount;
    if (ui.streak) ui.streak.innerText = bestStreak;
    setStyle('pause-btn', 'display', 'none');
    audioSys.play('explosion');
}

function updatePowerUps(dt) {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        let p = powerUps[i];
        if (!p) { powerUps.splice(i, 1); continue; } // Safety check
        p.update(dt);
        if (p.markedForDeletion) {
            if (G.Debug) G.Debug.trackDropExpired();
            powerUps.splice(i, 1);
        } else {
            if (Math.abs(p.x - player.x) < 40 && Math.abs(p.y - player.y) < 40) {
                // Pickup effect!
                createPowerUpPickupEffect(p.x, p.y, p.config.color);

                // WEAPON EVOLUTION v3.0: Use applyPowerUp for new types
                const evolutionTypes = ['UPGRADE', 'RATE', 'POWER', 'SPREAD', 'HOMING', 'PIERCE', 'LASER', 'MISSILE', 'SHIELD', 'SPEED'];
                if (evolutionTypes.includes(p.type) && player.applyPowerUp) {
                    player.applyPowerUp(p.type);
                } else {
                    player.upgrade(p.type);
                }

                // Crypto-themed powerup feedback via meme popup
                const meme = POWERUP_MEMES[p.type] || p.type;
                const puCategory = p.config?.category || 'MODIFIER';
                G.MemeEngine.queueMeme(puCategory.toUpperCase(), meme, p.type);
                // Analytics: Track power-up
                if (G.Debug) G.Debug.trackPowerUpCollected(p.type, p.isPityDrop || false);
                powerUps.splice(i, 1);
                emitEvent('powerup_pickup', { type: p.type, category: p.config?.category });
            }
        }
    }

    // v4.28.0: Bullet cancellation delegated to CollisionSystem
    G.CollisionSystem.processBulletCancellation();
}

init();

// URL parameter: ?perf=1 auto-enables FPS overlay (for mobile testing)
if (new URLSearchParams(window.location.search).has('perf')) {
    if (window.dbg && window.dbg.perf) window.dbg.perf();
}
