// Main Entry Point (Namespace Pattern)
const G = window.Game;
const Constants = G;
const audioSys = G.Audio;
const inputSys = G.Input;
const waveMgr = G.WaveManager;
const events = G.Events;
const runState = G.RunState;
window.Game.images = {}; // Placeholder, populated by main.js


// --- VERSION TRACKING (v4.50: no longer clears localStorage) ---
(function() {
    const APP_VER = G.VERSION.replace(/[^0-9.]/g, '').trim();
    localStorage.setItem('fiat_app_version', APP_VER);
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
G._setGameState = setGameState; // debug access
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

// Boss death timeout tracking (prevent orphan timeouts on restart)
let _bossDeathTimeouts = [];
function bossDeathTimeout(fn, delay) {
    const id = setTimeout(fn, delay);
    _bossDeathTimeouts.push(id);
    return id;
}
function clearBossDeathTimeouts() {
    _bossDeathTimeouts.forEach(id => clearTimeout(id));
    _bossDeathTimeouts = [];
    window._evolutionItem = null;
}
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

// HIGH SCORE — mode-specific persistence (v4.50)
function highScoreKey() {
    const isStory = G.CampaignState && G.CampaignState.isEnabled();
    return isStory ? 'fiat_highscore_story' : 'fiat_highscore_arcade';
}
function loadHighScoreForMode() {
    return parseInt(localStorage.getItem(highScoreKey())) || 0;
}
let highScore = loadHighScoreForMode(); // PERSISTENCE

// ARCADE RECORDS — persistent progression tracking (v4.50)
function loadArcadeRecords() {
    try { return JSON.parse(localStorage.getItem('fiat_arcade_records')) || { bestCycle: 0, bestLevel: 0, bestKills: 0 }; }
    catch { return { bestCycle: 0, bestLevel: 0, bestKills: 0 }; }
}
function saveArcadeRecords(records) {
    localStorage.setItem('fiat_arcade_records', JSON.stringify(records));
}
function checkArcadeRecords() {
    const records = loadArcadeRecords();
    let newBest = false;
    if (marketCycle > records.bestCycle) { records.bestCycle = marketCycle; newBest = true; }
    if (level > records.bestLevel) { records.bestLevel = level; newBest = true; }
    if (killCount > records.bestKills) { records.bestKills = killCount; newBest = true; }
    if (newBest) saveArcadeRecords(records);
    return { newBest, records };
}
// Note: High score UI update happens in updateModeIndicator() when intro screen is shown

// === PLATFORM DETECTION (v5.17.2) ===
function getPlatform() {
    return ('ontouchstart' in window || navigator.maxTouchPoints > 0) ? 'M' : 'D';
}

// === NICKNAME MANAGER (v5.17) ===
function getNickname() { return localStorage.getItem('fiat_nickname') || ''; }
function hasNickname() { return getNickname().length >= 3; }
function setNickname(name) {
    const clean = (name || '').toUpperCase().trim();
    if (!/^[A-Z0-9 ]{3,6}$/.test(clean)) return false;
    localStorage.setItem('fiat_nickname', clean);
    return true;
}
function showNicknamePrompt(callback) {
    const overlay = document.getElementById('nickname-overlay');
    const input = document.getElementById('nickname-input');
    const error = document.getElementById('nickname-error');
    const btn = document.getElementById('nickname-confirm');
    const title = document.getElementById('nickname-title');
    if (!overlay || !input || !btn) { callback(); return; }
    overlay.style.display = 'flex';
    if (title) title.textContent = t('NICK_TITLE');
    input.placeholder = t('NICK_PLACEHOLDER');
    btn.textContent = t('NICK_CONFIRM');
    if (error) error.style.display = 'none';
    input.value = getNickname();
    input.focus();
    function submit() {
        if (setNickname(input.value)) {
            overlay.style.display = 'none';
            input.removeEventListener('keydown', onKey);
            btn.removeEventListener('click', submit);
            callback();
        } else {
            if (error) {
                error.textContent = t('NICK_INVALID');
                error.style.display = 'block';
            }
        }
    }
    function onKey(e) { if (e.key === 'Enter') submit(); }
    input.addEventListener('keydown', onKey);
    btn.addEventListener('click', submit);
}

// === SCORE INTEGRITY (v5.17.2) ===
const _sk = (()=>{
    const d = [44,9,80,110,122,77,5,3,34,71,120,36,115,18,99,45,29,76,93,14,125,11,106,38];
    const m = [74,127,51,92];
    return d.map((v,i) => String.fromCharCode(v ^ m[i % m.length])).join('');
})();
async function signScore(payload) {
    const message = `${payload.s}|${payload.k}|${payload.c}|${payload.w}|${payload.sh}|${payload.mode}|${payload.p}|${payload.t}`;
    const key = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(_sk),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
    return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// === LEADERBOARD SYSTEM (v5.17) ===
G.Leaderboard = {
    _cache: null,
    _cacheTime: 0,
    _visible: false,

    async fetchScores(mode) {
        mode = mode || 'story';
        // Cache for 30s
        if (this._cache && Date.now() - this._cacheTime < 30000) return this._cache;
        try {
            const res = await fetch(`${G.LEADERBOARD_API}/lb?mode=${mode}`);
            const data = await res.json();
            if (data.ok) {
                this._cache = data.scores;
                this._cacheTime = Date.now();
                return data.scores;
            }
        } catch (e) { /* offline */ }
        return null;
    },

    async submitScore(data) {
        const payload = {
            n: getNickname(),
            s: Math.floor(data.score),
            k: data.kills,
            c: data.cycle,
            w: data.wave,
            sh: data.ship,
            b: data.bear ? 1 : 0,
            p: getPlatform(),
            mode: data.mode || 'story',
            t: Date.now()
        };
        try {
            const sig = await signScore(payload);
            const res = await fetch(`${G.LEADERBOARD_API}/score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payload, sig })
            });
            const result = await res.json();
            this._cache = null; // Invalidate cache
            return result;
        } catch (e) {
            return { ok: false, error: 'offline' };
        }
    },

    async getRank(mode, score) {
        try {
            const res = await fetch(`${G.LEADERBOARD_API}/rank?mode=${mode || 'story'}&score=${Math.floor(score)}`);
            return await res.json();
        } catch (e) {
            return { ok: false, error: 'offline' };
        }
    },

    toggle() {
        const panel = document.getElementById('leaderboard-panel');
        if (!panel) return;
        this._visible = !this._visible;
        panel.style.display = this._visible ? 'flex' : 'none';
        if (this._visible) this._loadAndRender();
    },

    async _loadAndRender() {
        const loading = document.getElementById('lb-loading');
        const table = document.getElementById('lb-table');
        const empty = document.getElementById('lb-empty');
        const title = document.getElementById('lb-title');
        const closeBtn = document.getElementById('lb-close-btn');
        if (title) title.textContent = t('LB_TITLE');
        if (closeBtn) closeBtn.textContent = t('CLOSE');
        if (loading) loading.style.display = 'block';
        if (loading) loading.textContent = t('LB_LOADING');
        if (table) table.style.display = 'none';
        if (empty) empty.style.display = 'none';

        // Update table headers
        const ths = table ? table.querySelectorAll('th') : [];
        if (ths.length >= 5) {
            ths[0].textContent = t('LB_RANK');
            ths[1].textContent = t('LB_PLAYER');
            ths[2].textContent = t('LB_SCORE');
            ths[3].textContent = 'SHIP';
            ths[4].textContent = '';
        }

        const scores = await this.fetchScores();
        if (loading) loading.style.display = 'none';
        if (!scores) {
            if (empty) { empty.textContent = t('LB_ERROR'); empty.style.display = 'block'; }
            return;
        }
        if (scores.length === 0) {
            if (empty) { empty.textContent = t('LB_EMPTY'); empty.style.display = 'block'; }
            return;
        }
        this.renderTable(scores);
        if (table) table.style.display = 'table';

        // Show player rank
        const nick = getNickname();
        const rankSection = document.getElementById('lb-player-rank');
        if (rankSection && nick) {
            const result = await this.getRank('story', Math.floor(score));
            if (result.ok) {
                rankSection.style.display = 'flex';
                const label = rankSection.querySelector('.lb-rank-label');
                const val = document.getElementById('lb-rank-val');
                if (label) label.textContent = t('LB_YOUR_RANK');
                if (val) val.textContent = `#${result.rank}`;
            } else {
                rankSection.style.display = 'none';
            }
        }
    },

    renderTable(scores) {
        const tbody = document.getElementById('lb-tbody');
        if (!tbody) return;
        const nick = getNickname();
        tbody.innerHTML = '';
        scores.forEach((entry, i) => {
            const tr = document.createElement('tr');
            const rank = i + 1;
            if (rank === 1) tr.className = 'lb-rank-1';
            else if (rank === 2) tr.className = 'lb-rank-2';
            else if (rank === 3) tr.className = 'lb-rank-3';
            if (entry.n === nick) tr.classList.add('lb-self');
            const platIcon = entry.p === 'M' ? '📱' : entry.p === 'D' ? '🖥' : '';
            tr.innerHTML = `<td>${rank}</td><td>${entry.n}</td><td>${entry.s.toLocaleString()}</td><td>${entry.sh}</td><td class="lb-col-plat">${platIcon}</td>`;
            tbody.appendChild(tr);
        });
    },

    async renderGameoverRank(scoreVal, killCount, cycle, wave, ship, bear) {
        const section = document.getElementById('gameover-rank-section');
        const rankVal = document.getElementById('gameover-rank-val');
        const top5El = document.getElementById('gameover-top5');
        const viewBtn = document.getElementById('btn-view-lb');
        if (!section) return;

        if (viewBtn) viewBtn.textContent = t('LB_VIEW_FULL');

        if (!hasNickname()) { section.style.display = 'none'; return; }
        section.style.display = 'block';

        const rankLabel = section.querySelector('.rank-label');
        if (rankLabel) rankLabel.textContent = t('LB_YOUR_RANK');
        if (rankVal) rankVal.textContent = t('LB_SUBMITTING');

        // Submit score
        const result = await this.submitScore({
            score: scoreVal, kills: killCount, cycle, wave, ship, bear, mode: 'story'
        });

        // Remove previous tier badge
        const oldTier = section.querySelector('.gameover-rank-tier');
        if (oldTier) oldTier.remove();

        if (result.ok && result.rank > 0) {
            if (rankVal) rankVal.textContent = `#${result.rank}`;
            // Show tier badge for top 10/5/3
            let tierText = null, tierClass = '';
            if (result.rank <= 3) { tierText = t('LB_TOP3'); tierClass = 'rank-tier-3'; }
            else if (result.rank <= 5) { tierText = t('LB_TOP5'); tierClass = 'rank-tier-5'; }
            else if (result.rank <= 10) { tierText = t('LB_TOP10'); tierClass = 'rank-tier-10'; }
            if (tierText) {
                const badge = document.createElement('div');
                badge.className = `gameover-rank-tier ${tierClass}`;
                badge.textContent = tierText;
                section.insertBefore(badge, section.firstChild);
            }
        } else if (result.ok && result.rank === -1) {
            if (rankVal) rankVal.textContent = '-';
        } else {
            if (rankVal) rankVal.textContent = t('LB_OFFLINE');
        }

        // Fetch top 5 for mini-display
        const scores = await this.fetchScores();
        if (top5El && scores && scores.length > 0) {
            const top5 = scores.slice(0, 5);
            const nick = getNickname();
            top5El.innerHTML = top5.map((e, i) => {
                const cls = e.n === nick ? 'top5-self' : (i === 0 ? 'top5-gold' : '');
                const pi = e.p === 'M' ? '📱' : e.p === 'D' ? '🖥' : '';
                return `<span class="${cls}">${i + 1}. ${e.n} ${e.s.toLocaleString()} ${pi}</span>`;
            }).join('<br>');
        }
    }
};

// WEAPON PROGRESSION - Persisted in localStorage
const BASE_WEAPONS = ['WIDE', 'NARROW', 'FIRE']; // Always unlocked
const ADVANCED_WEAPONS = ['SPREAD', 'HOMING']; // Unlock per cycle
const WEAPON_UNLOCK_CYCLE = { SPREAD: 2, HOMING: 3 }; // Cycle required
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

// v4.47: Build player state snapshot for adaptive drop system
// Pre-allocated to avoid per-call GC allocations
const _playerState = {
    weaponLevel: 1,
    hasSpecial: false,
    hasShield: false,
    hasSpeed: false,
    perkLevel: 0
};
function buildPlayerState() {
    if (!player) {
        _playerState.weaponLevel = 1;
        _playerState.hasSpecial = false;
        _playerState.hasShield = false;
        _playerState.hasSpeed = false;
        return _playerState;
    }
    _playerState.weaponLevel = player.weaponLevel ?? 1;
    _playerState.hasSpecial = !!player.special;
    _playerState.hasShield = !!player.shieldActive;
    _playerState.hasSpeed = player.shipPowerUp === 'SPEED';
    _playerState.perkLevel = G.RunState ? G.RunState.perkLevel : 0;
    return _playerState;
}

// v4.29: Pre-allocated objects for CollisionSystem callbacks — avoids per-call allocation
const _sparkOpts = { weaponLevel: 1, isKill: false, isHyper: false };

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
        getState: () => ({}),
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
                    G.EffectsRenderer.triggerDamageVignette();
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
                // Note: lastGrazeTime NOT reset here — meter decay is tied to proximity kills only
                const grazeBonus = isCloseGraze ? Balance.GRAZE.CLOSE_BONUS : 1;
                if (G.Debug) G.Debug.trackGraze(isCloseGraze);

                if (isHyperActive) {
                    const hyperMult = Balance.HYPER.SCORE_MULT;
                    const grazePoints = Math.floor(Balance.GRAZE.POINTS_BASE * hyperMult * grazeBonus);
                    score += grazePoints;
                    updateScore(score, grazePoints);
                    createGrazeSpark(eb.x, eb.y, player.x, player.y, true);
                    createGrazeSpark(eb.x, eb.y, player.x, player.y, true);
                    if (totalTime - lastGrazeSoundTime > Balance.GRAZE.SOUND_THROTTLE) {
                        audioSys.play('hyperGraze');
                        lastGrazeSoundTime = totalTime;
                    }
                } else {
                    grazeCount += grazeBonus;
                    if (G.RankSystem) G.RankSystem.onGraze();
                    // Graze gives score + VFX but NOT meter (meter from proximity kills)
                    grazeMultiplier = 1 + (grazeMeter / Balance.GRAZE.MULT_DIVISOR) * (Balance.GRAZE.MULT_MAX - 1);
                    const grazePoints = Math.floor(Balance.GRAZE.POINTS_BASE * grazeMultiplier * grazeBonus);
                    score += grazePoints;
                    updateScore(score, grazePoints);
                    createGrazeSpark(eb.x, eb.y, player.x, player.y, isCloseGraze);
                    if (isCloseGraze) applyHitStop('CLOSE_GRAZE', true);
                    const soundThrottle = Balance.GRAZE.SOUND_THROTTLE || 0.1;
                    if (totalTime - lastGrazeSoundTime > soundThrottle) {
                        audioSys.play(isCloseGraze ? 'grazeNearMiss' : 'graze');
                        lastGrazeSoundTime = totalTime;
                    }
                    if (grazeCount > 0 && grazeCount % 10 === 0) audioSys.play('grazeStreak');
                }
                // Arcade: graze extends combo timer
                if (G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode() && G.RunState.comboTimer > 0) {
                    G.RunState.comboTimer += Balance.ARCADE.COMBO.GRAZE_EXTEND;
                }
                updateGrazeUI();
            },
            // Enemy hit (but not killed)
            onEnemyHit(e, bullet, shouldDie) {
                audioSys.play('hitEnemy');
                const sparkColor = bullet.color || player.stats?.color || '#fff';
                _sparkOpts.weaponLevel = player.weaponLevel ?? 1;
                _sparkOpts.isKill = shouldDie;
                _sparkOpts.isHyper = player.isHyperActive && player.isHyperActive();
                createBulletSpark(e.x, e.y, sparkColor, _sparkOpts);
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
                const bearMult = isBearMarket ? Balance.SCORE.BEAR_MARKET_MULT : 1;
                const grazeKillBonus = grazeMeter >= Balance.SCORE.GRAZE_KILL_THRESHOLD ? Balance.SCORE.GRAZE_KILL_BONUS : 1;
                const hyperMult = (player.isHyperActive && player.isHyperActive()) ? Balance.HYPER.SCORE_MULT : 1;
                const isLastEnemy = enemies.length === 0;
                const lastEnemyMult = isLastEnemy && G.HarmonicConductor ? G.HarmonicConductor.getLastEnemyBonus() : 1;
                const killScore = Math.floor(e.scoreVal * bearMult * perkMult * killStreakMult * grazeKillBonus * hyperMult * lastEnemyMult * comboMult * arcadeScoreMult);
                score += killScore;
                updateScore(score, killScore);

                if (isLastEnemy && lastEnemyMult > 1) {
                    applyHitStop('STREAK_25', false);
                    triggerScreenFlash('STREAK_25');
                    showGameInfo("💀 " + t('LAST_FIAT') + " x" + lastEnemyMult.toFixed(0));
                }

                // v4.44: Clear player bullets when last enemy dies (prevent pre-damage on incoming boss/wave)
                if (isLastEnemy) {
                    bullets.forEach(b => { b.markedForDeletion = true; G.Bullet.Pool.release(b); });
                    bullets.length = 0;
                }

                createEnemyDeathExplosion(e.x, e.y, e.color, e.symbol || '$', e.shape, _killElemType);

                // Arcade: Volatile Rounds — AoE damage on kill
                if (_isArcade && G.RunState.arcadeBonuses.volatileRounds && enemies.length > 0) {
                    const vr = Balance.ARCADE?.MODIFIER_TUNING?.VOLATILE_ROUNDS;
                    const aoeRadius = vr?.AOE_RADIUS ?? 30;
                    const aoeDmg = Math.floor((player.stats.baseDamage ?? 14) * (vr?.DMG_MULT ?? 0.5));
                    for (let vi = enemies.length - 1; vi >= 0; vi--) {
                        const ve = enemies[vi];
                        if (!ve || !ve.active) continue;
                        const dx = ve.x - e.x, dy = ve.y - e.y;
                        if (dx * dx + dy * dy < aoeRadius * aoeRadius) {
                            ve.hp -= aoeDmg;
                            ve.hitFlash = vr?.HIT_FLASH ?? 0.1;
                            createExplosion(ve.x, ve.y, e.color, 4);
                        }
                    }
                }

                // Arcade: Chain Lightning — kill chains to 1 nearby enemy
                if (_isArcade && G.RunState.arcadeBonuses.chainLightning && enemies.length > 0) {
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
                        const chainDmg = Math.floor((player.stats.baseDamage ?? 14) * (cl?.DMG_MULT ?? 0.3));
                        closest.hp -= chainDmg;
                        closest.hitFlash = cl?.HIT_FLASH ?? 0.15;
                        createExplosion(closest.x, closest.y, '#00f0ff', 5);
                    }
                }

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

                // Proximity Kill Meter — closer kills (vertically) fill meter faster
                // v4.61: Skip accumulation during HYPER (meter resets to 0 on HYPER end)
                const dist = Math.abs(e.y - player.y);
                const proxCfg = Balance.PROXIMITY_KILL;
                if (dist < proxCfg.MAX_DISTANCE && !(player.isHyperActive && player.isHyperActive())) {
                    const t2 = 1 - Math.max(0, (dist - proxCfg.CLOSE_DISTANCE)) / (proxCfg.MAX_DISTANCE - proxCfg.CLOSE_DISTANCE);
                    const gain = proxCfg.METER_GAIN_MIN + t2 * (proxCfg.METER_GAIN_MAX - proxCfg.METER_GAIN_MIN);
                    lastGrazeTime = totalTime;
                    grazeMeter = Math.min(100, grazeMeter + gain);
                    if (grazeMeter >= Balance.HYPER.METER_THRESHOLD && player.hyperCooldown <= 0) {
                        if (Balance.HYPER.AUTO_ACTIVATE && player.canActivateHyper && player.canActivateHyper(grazeMeter)) {
                            player.activateHyper();
                            grazeMeter = 0;
                            updateGrazeUI();
                            triggerScreenFlash('HYPER_ACTIVATE');
                        } else if (!player.hyperAvailable) {
                            player.hyperAvailable = true;
                            // v5.4.0: No text — slim bar in drawHyperUI handles visual
                            audioSys.play('hyperReady');
                        }
                    }
                    updateGrazeUI();
                }


                // Mini-boss trigger
                const _arcadeMini = (G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode() && Balance.ARCADE) ? Balance.ARCADE.MINI_BOSS : null;
                const _mbCooldown = _arcadeMini ? _arcadeMini.COOLDOWN : Balance.MINI_BOSS.COOLDOWN;
                const _mbMaxWave = _arcadeMini ? _arcadeMini.MAX_PER_WAVE : (Balance.MINI_BOSS.MAX_PER_WAVE || 2);
                if (!(G.CampaignState && G.CampaignState.isEnabled()) && e.symbol && fiatKillCounter[e.symbol] !== undefined && !miniBoss && !boss && !e.isMinion && bossWarningTimer <= 0 && (totalTime - lastMiniBossSpawnTime) >= _mbCooldown && miniBossThisWave < _mbMaxWave) {
                    fiatKillCounter[e.symbol]++;
                    const mapping = Balance.MINI_BOSS.CURRENCY_BOSS_MAP?.[e.symbol];
                    const _threshMult = _arcadeMini ? (_arcadeMini.THRESHOLD_MULT || 0.65) : 1.0;
                    const threshold = Math.floor((mapping?.threshold || Balance.MINI_BOSS.KILL_THRESHOLD) * _threshMult);
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
                const useEvolution = !!(Balance.WEAPON_EVOLUTION && player.weaponLevel);
                const dropInfo = G.DropSystem.tryEnemyDrop(e.symbol, e.x, e.y, totalTime, useEvolution ? buildPlayerState() : getUnlockedWeapons, useEvolution);
                if (dropInfo) {
                    powerUps.push(new G.PowerUp(dropInfo.x, dropInfo.y, dropInfo.type));
                    if (G.Debug) G.Debug.trackDropSpawned(dropInfo.type, dropInfo.category, 'enemy');
                }
            },
            // Boss hit by player bullet
            onBossHit(bullet, dmg, boss, bIdx, bArr) {
                audioSys.play('hitEnemy');
                // v4.45: Score per boss hit (was 0 — score stayed frozen during boss fight)
                const hitScore = Math.floor(dmg * 2);
                score += hitScore;
                updateScore(score, hitScore);
                // Proximity Kill Meter: boss hits give small meter gain (skip during HYPER)
                const bossGain = Balance.PROXIMITY_KILL.BOSS_HIT_GAIN;
                if (bossGain > 0 && !(player.isHyperActive && player.isHyperActive())) {
                    lastGrazeTime = totalTime;
                    grazeMeter = Math.min(100, grazeMeter + bossGain);
                    updateGrazeUI();
                }
                // Boss drops
                const useEvolutionBoss = !!(Balance.WEAPON_EVOLUTION && player.weaponLevel);
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
            // Boss killed — v5.11: Cinematic boss evolution flow
            onBossDeath(deadBoss) {
                const defeatedBossType = deadBoss.bossType || 'FEDERAL_RESERVE';
                const defeatedBossName = deadBoss.name || 'THE FED';
                const bossX = deadBoss.x + deadBoss.width / 2;
                const bossY = deadBoss.y + deadBoss.height / 2;

                // T=0: Main explosion + FREEZE
                createBossDeathExplosion(bossX, bossY);
                applyHitStop('BOSS_DEFEAT_FREEZE', true);
                triggerScreenFlash('BOSS_DEFEAT');
                if (G.TransitionManager) G.TransitionManager.startFadeOut(0.8, '#ffffff');
                const bossBonus = Balance.SCORE.BOSS_DEFEAT_BASE + (marketCycle * Balance.SCORE.BOSS_DEFEAT_PER_CYCLE);
                score += bossBonus;
                updateScore(score, bossBonus);
                boss.active = false; boss = null; window.boss = null; shake = Balance.EFFECTS.SHAKE.BOSS_DEFEAT || 80; audioSys.play('explosion');
                audioSys.setBossPhase(0);
                if (G.Events) G.Events.emit('weather:boss_defeat');
                if (G.WeatherController) G.WeatherController.setLevel(level, isBearMarket, false);
                enemyBullets.forEach(b => G.Bullet.Pool.release(b));
                enemyBullets.length = 0;
                window.enemyBullets = enemyBullets;
                bossJustDefeated = true;
                if (player && player.hyperActive) player.deactivateHyper();
                grazeMeter = 0;
                updateGrazeUI();
                enemies.length = 0;
                G.enemies = enemies;
                if (G.HarmonicConductor) G.HarmonicConductor.enemies = enemies;
                if (miniBoss) { G.MiniBossManager.clear(); miniBoss = null; }
                updateScore(score);
                showVictory("🏆 " + defeatedBossName + ' ' + t('DEFEATED'));
                const victoryMemes = { 'FEDERAL_RESERVE': "💥 INFLATION CANCELLED!", 'BCE': "💥 FRAGMENTATION COMPLETE!", 'BOJ': "💥 YEN LIBERATED!" };
                G.MemeEngine.queueMeme('BOSS_DEFEATED', victoryMemes[defeatedBossType] || "CENTRAL BANK DESTROYED!", defeatedBossName);
                console.log(`[BOSS DEFEATED] ${defeatedBossType} at level=${level}, cycle=${marketCycle}, wave=${waveMgr.wave}`);
                G.Debug.trackBossDefeat(defeatedBossType, level, marketCycle);
                if (G.Debug) { G.Debug.trackBossFightEnd(defeatedBossType, marketCycle); G.Debug.trackCycleEnd(marketCycle, Math.floor(score)); }
                marketCycle++;
                window.marketCycle = marketCycle;

                // v5.11: APC with 3-level formula
                const APC = G.Balance.ADAPTIVE_POWER;
                if (APC && APC.ENABLED && marketCycle >= 2) {
                    const wl = player ? (player.weaponLevel ?? 1) : 1;
                    const stacks = G.RunState.perkStacks || {};
                    let totalStacks = 0;
                    for (const k in stacks) totalStacks += stacks[k];
                    const hasSpec = !!(player && player.special);
                    const W = APC.WEIGHTS;
                    const weaponScore = (wl - 1) / 2; // v5.11: 3 levels (0, 0.5, 1.0)
                    const perkScore = Math.min(totalStacks / 8, 1);
                    const specialScore = hasSpec ? 1.0 : 0.0;
                    const ps = W.WEAPON * weaponScore + W.PERKS * perkScore + W.SPECIAL * specialScore;
                    const hpM = APC.HP_FLOOR + ps * APC.HP_RANGE;
                    let pAdj = 0;
                    if (ps < APC.WEAK_THRESHOLD) pAdj = APC.PITY_BONUS_WEAK;
                    else if (ps > APC.STRONG_THRESHOLD) pAdj = APC.PITY_PENALTY_STRONG;
                    G.RunState.cyclePower = { score: ps, hpMult: hpM, pityAdj: pAdj };
                    console.log(`[APC] C${marketCycle} powerScore=${ps.toFixed(2)} hpMult=${hpM.toFixed(3)} pityAdj=${pAdj} (wl=${wl} perks=${totalStacks} spec=${hasSpec})`);
                }
                console.log(`[BOSS DEFEATED] Cycle incremented to ${marketCycle}, calling waveMgr.reset()`);
                G.Debug.trackCycleUp(marketCycle);
                if (G.Debug) G.Debug.trackCycleStart(marketCycle);
                waveMgr.reset();
                waveMgr.waveInProgress = true;
                G.DropSystem.specialDroppedThisCycle = false; // v5.18: reset guaranteed SPECIAL for new cycle
                fiatKillCounter = { '¥': 0, '₽': 0, '₹': 0, '€': 0, '£': 0, '₣': 0, '₺': 0, '$': 0, '元': 0, 'Ⓒ': 0 };
                if (G.HarmonicConductor) { G.HarmonicConductor.reset(); G.HarmonicConductor.setDifficulty(level, marketCycle, isBearMarket); }
                const campaignState2 = G.CampaignState;
                const _isArcadeMode = !(campaignState2 && campaignState2.isEnabled());
                const campaignComplete = !!(campaignState2 && campaignState2.isEnabled() && defeatedBossType === 'BOJ');
                const chapterId = G.BOSS_TO_CHAPTER && G.BOSS_TO_CHAPTER[defeatedBossType];
                const shouldShowChapter = chapterId && shouldShowStory(chapterId);

                // === v5.11: Cinematic boss death sequence ===
                const BD = Balance.VFX?.BOSS_DEATH;

                // v5.13.1: All boss death timeouts tracked for cleanup on restart
                clearBossDeathTimeouts();

                // T=0.3: Coin rain
                if (BD?.COIN_RAIN?.ENABLED && G.ParticleSystem) {
                    bossDeathTimeout(() => {
                        const cw = G.Balance.GAME?.BASE_WIDTH || 600;
                        const ch = G.Balance.GAME?.BASE_HEIGHT || 800;
                        G.ParticleSystem.createCoinRain(cw, ch);
                    }, (BD.COIN_RAIN.START_DELAY || 0.3) * 1000);
                }

                // T=0.5: Freeze ends → SLOWMO
                bossDeathTimeout(() => {
                    applyHitStop('BOSS_DEFEAT_SLOWMO', false);
                }, 500);

                // Chain explosions (config-driven)
                if (BD) {
                    const chainCount = BD.CHAIN_EXPLOSIONS || 6;
                    const times = BD.CHAIN_TIMES || [0.0, 0.4, 0.8, 1.3, 1.8, 2.5];
                    const offsets = BD.CHAIN_OFFSETS || [[0,0],[-50,-30],[40,20],[-30,40],[50,-20],[0,10]];
                    const scales = BD.CHAIN_SCALE || [1.0, 0.8, 0.9, 1.0, 1.1, 1.5];
                    for (let i = 1; i < chainCount; i++) { // i=0 is the main explosion already fired
                        const delay = (times[i] || i * 0.4) * 1000;
                        const ox = offsets[i] ? offsets[i][0] : 0;
                        const oy = offsets[i] ? offsets[i][1] : 0;
                        const sc = scales[i] || 1.0;
                        bossDeathTimeout(() => {
                            createBossDeathExplosion(bossX + ox, bossY + oy);
                            if (sc >= 1.5) {
                                // Climax explosion: extra flash + shake
                                triggerScreenFlash('BOSS_DEFEAT');
                                shake = Math.max(shake, 40);
                            }
                            audioSys.play('explosion');
                        }, delay);
                    }
                }

                // Evolution item spawn + fly
                const WE = Balance.WEAPON_EVOLUTION;
                const canEvolve = player && player.weaponLevel < (WE?.MAX_WEAPON_LEVEL || 3);
                if (canEvolve && BD?.EVOLUTION_ITEM) {
                    const evoConf = BD.EVOLUTION_ITEM;
                    const spawnDelay = (evoConf.SPAWN_DELAY || 2.8) * 1000;
                    const flyDuration = (evoConf.FLY_DURATION || 1.2) * 1000;

                    bossDeathTimeout(() => {
                        // Create evolution item object (managed inline)
                        const evoItem = {
                            x: bossX, y: bossY,
                            startX: bossX, startY: bossY,
                            timer: 0,
                            duration: flyDuration,
                            active: true,
                            size: evoConf.SIZE || 28,
                            glowColor: evoConf.GLOW_COLOR || '#00f0ff'
                        };
                        // Store on window for game loop access
                        window._evolutionItem = evoItem;
                    }, spawnDelay);
                }

                // Delayed transition — let the celebration breathe
                const celebDelay = (Balance.TIMING.BOSS_CELEBRATION_DELAY || 5.0) * 1000;
                bossDeathTimeout(() => {
                    if (_isArcadeMode && G.ModifierChoiceScreen) {
                        const picks = Balance.ARCADE.MODIFIERS.POST_BOSS_PICKS || 3;
                        if (G.RunState.arcadeBonuses.lastStandAvailable) {
                            G.RunState.arcadeBonuses.lastStandAvailable = true;
                        }
                        startIntermission(t('CYCLE') + ' ' + marketCycle + ' ' + t('BEGINS'));
                        bossDeathTimeout(() => {
                            G.ModifierChoiceScreen.show(picks, () => {
                                const extraL = G.RunState.arcadeBonuses.extraLives;
                                if (extraL > 0) {
                                    lives += extraL;
                                    G.RunState.arcadeBonuses.extraLives = 0;
                                    updateLivesUI();
                                } else if (extraL < 0) {
                                    lives = Math.max(1, lives + extraL);
                                    G.RunState.arcadeBonuses.extraLives = 0;
                                    updateLivesUI();
                                }
                            });
                        }, 1500);
                    } else if (campaignComplete && shouldShowChapter) {
                        showStoryScreen(chapterId, () => { showCampaignVictory(); });
                    } else if (campaignComplete) {
                        showCampaignVictory();
                    } else if (shouldShowChapter) {
                        showStoryScreen(chapterId, () => { restoreGameUI(); startIntermission(t('CYCLE') + ' ' + marketCycle + ' ' + t('BEGINS')); });
                    } else {
                        startIntermission(t('CYCLE') + ' ' + marketCycle + ' ' + t('BEGINS'));
                    }
                }, celebDelay);
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
                createBulletSpark(eb.x, eb.y, eb.color || '#ff4444', { isCancel: true });
                eb.markedForDeletion = true;
                G.Bullet.Pool.release(eb);
                ebArr.splice(ebIdx, 1);
                bulletCancelStreak += 1;
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
let warmupShown = false; // v4.37: warmup phase shown once per session
let perkChoiceActive = false;
let intermissionMeme = ""; // Meme shown during countdown
let lastCountdownNumber = 0; // Track countdown to trigger audio once per number
let debugMode = false; // F3 toggle for performance stats
let fpsHistory = []; // For smooth FPS display
// perkOffers moved to PerkManager.js
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
let fiatKillCounter, lastMiniBossSpawnTime, miniBossThisWave;
let waveStartTime, _frameKills, _hyperAmbientTimer, marketCycle;

// v5.14: Score Pulse Tier system — HUD-reactive feedback replaces floating text
var _scorePulseTierClasses = ['score-normal', 'score-big', 'score-massive', 'score-legendary'];
var _scorePulseAccumulator = 0;
var _scorePulseAccTimer = 0;

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
    // v5.14: Reset score pulse state
    _scorePulseAccumulator = 0;
    _scorePulseAccTimer = 0;
    const scoreEl = document.getElementById('scoreVal');
    if (scoreEl) {
        scoreEl.classList.remove('score-new-record', 'score-record-break');
        for (let i = 0; i < _scorePulseTierClasses.length; i++) scoreEl.classList.remove(_scorePulseTierClasses[i]);
    }
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

// v5.14: Score Pulse Tier system (moved above syncFromRunState call)

function _getScoreTier(gain) {
    const tiers = Balance.JUICE?.SCORE_PULSE_TIERS;
    if (!tiers) return 'MICRO';
    if (gain >= (tiers.LEGENDARY?.threshold ?? 5000)) return 'LEGENDARY';
    if (gain >= (tiers.MASSIVE?.threshold ?? 2000)) return 'MASSIVE';
    if (gain >= (tiers.BIG?.threshold ?? 500)) return 'BIG';
    if (gain >= (tiers.NORMAL?.threshold ?? 100)) return 'NORMAL';
    return 'MICRO';
}

var _tierOrder = ['MICRO', 'NORMAL', 'BIG', 'MASSIVE', 'LEGENDARY'];

function updateScore(newScore, scoreGain) {
    const oldScore = score;
    score = newScore;
    window.score = score;
    const el = document.getElementById('scoreVal');
    if (!el) return;
    el.textContent = Math.floor(score);

    // Determine tier from gain
    if (scoreGain > 0) {
        let tier = _getScoreTier(scoreGain);
        let tierIdx = _tierOrder.indexOf(tier);

        // Accumulator: rapid gains bump tier up
        const tiers = Balance.JUICE?.SCORE_PULSE_TIERS;
        const decayTime = tiers?.ACCUMULATOR_DECAY ?? 0.4;
        const maxBump = tiers?.ACCUMULATOR_MAX_BUMP ?? 2;
        if (_scorePulseAccTimer > 0 && tierIdx > 0) {
            _scorePulseAccumulator = Math.min(_scorePulseAccumulator + 1, maxBump);
            tierIdx = Math.min(tierIdx + _scorePulseAccumulator, _tierOrder.length - 1);
            tier = _tierOrder[tierIdx];
        } else {
            _scorePulseAccumulator = 0;
        }
        _scorePulseAccTimer = decayTime;

        // Apply CSS class for NORMAL+
        if (tierIdx >= 1) {
            const className = _scorePulseTierClasses[tierIdx - 1];
            for (let i = 0; i < _scorePulseTierClasses.length; i++) {
                el.classList.remove(_scorePulseTierClasses[i]);
            }
            void el.offsetWidth; // Force reflow
            el.classList.add(className);

            // BIG+: HUD particle burst
            if (tierIdx >= 2 && G.ParticleSystem?.createScoreHudBurst) {
                G.ParticleSystem.createScoreHudBurst(tier);
            }

            // LEGENDARY: screen glow
            if (tierIdx >= 4) {
                triggerScorePulse();
            }
        }
    } else {
        // No gain (direct set) — just update text, no animation
    }

    // v5.14: New high score detection
    if (score > highScore && oldScore <= highScore && highScore > 0) {
        // One-shot record break animation
        for (let i = 0; i < _scorePulseTierClasses.length; i++) {
            el.classList.remove(_scorePulseTierClasses[i]);
        }
        el.classList.remove('score-record-break');
        void el.offsetWidth;
        el.classList.add('score-record-break');
        // Persistent magenta glow
        el.classList.add('score-new-record');
        // Particle burst + screen glow
        if (G.ParticleSystem?.createScoreHudBurst) G.ParticleSystem.createScoreHudBurst('LEGENDARY');
        triggerScorePulse();
        // HUD message
        showGameInfo("NEW HIGH SCORE!");
        if (audioSys) audioSys.play('weaponDeploy');
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

// Shield button radial indicator update (v5.7: button hidden, tap-on-ship replaces it)
var _shieldBtn = null, _shieldProgress = null, _shieldCached = false;
function updateShieldButton(player) {
    return; // v5.7: Shield button removed — cooldown shown via diegetic ring on ship
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

    // WEAPON EVOLUTION v4.47 types
    UPGRADE: "⬆️ LEVEL UP!",
    HOMING: "🎯 HEAT SEEKING",
    PIERCE: "🔥 PENETRATING",
    MISSILE: "🚀 WARHEAD ARMED",
    SHIELD: "🛡️ HODL MODE",
    PERK: "✦ ELEMENT UNLOCKED",
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
function showPickup(text) {
    if (G.MessageSystem) G.MessageSystem.showPickup(text);
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

// --- PERK SYSTEM (delegated to PerkManager) ---
function openPerkChoice() { G.PerkManager.open(); perkChoiceActive = G.PerkManager.isActive(); }
function closePerkChoice() { G.PerkManager.close(); perkChoiceActive = G.PerkManager.isActive(); }
function applyPerk(perk) { G.PerkManager.apply(perk); perkChoiceActive = G.PerkManager.isActive(); }
function applyRandomPerk() {
    const cd = G.PerkManager.applyRandom(perkCooldown);
    if (cd > 0) perkCooldown = cd;
}
function renderPerkBar(id) { G.PerkManager.renderBar(id); }

// --- INTRO SHIP ANIMATION & SELECTION ---
let introShipCanvas = null;
let introShipCtx = null;
let introShipTime = 0;
let introShipAnimId = null;
let selectedShipIndex = 0;
let introState = 'SPLASH'; // 'SPLASH' or 'SELECTION'
const SHIP_KEYS = ['BTC', 'ETH', 'SOL'];
const SHIP_DISPLAY = {
    // hit = hitbox rating (higher = smaller hitbox = easier to dodge)
    BTC: { name: 'BTC STRIKER', accent: '#bb44ff', symbol: '₿',
        bodyDark: '#2a2040', bodyLight: '#6644aa', noseDark: '#4d3366', noseLight: '#9966cc',
        finDark: '#1a4455', finLight: '#2a6677', spd: 6, pwr: 7, hit: 5 },
    ETH: { name: 'ETH HEAVY', accent: '#8c7ae6', symbol: 'Ξ',
        bodyDark: '#1a2040', bodyLight: '#4a5a8e', noseDark: '#2a3366', noseLight: '#7a8ecc',
        finDark: '#1a3455', finLight: '#2a5077', spd: 4, pwr: 8, hit: 3 },
    SOL: { name: 'SOL SPEEDSTER', accent: '#00d2d3', symbol: '◎',
        bodyDark: '#0a2a2a', bodyLight: '#1a6a6a', noseDark: '#0a3a3a', noseLight: '#2a8a8a',
        finDark: '#0a3455', finLight: '#1a5a77', spd: 9, pwr: 5, hit: 8 }
};

function initIntroShip() {
    // Cancel any existing rAF loop before starting a new one (prevents N loops after N restarts)
    if (introShipAnimId) { cancelAnimationFrame(introShipAnimId); introShipAnimId = null; }
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

// --- v4.35: Title animation helpers ---
let _introActionCooldown = 0;

function _cleanupAnimClasses() {
    const els = [
        document.getElementById('mode-selector'),
        document.getElementById('mode-explanation'),
        document.querySelector('.primary-action-container'),
        document.querySelector('.intro-icons'),
        document.querySelector('.intro-version'),
        document.getElementById('intro-title')
    ];
    els.forEach(el => {
        if (el) el.classList.remove('anim-hidden', 'anim-show', 'anim-active');
    });
    // Also clean subtitle visibility class
    const sub = document.getElementById('title-subtitle');
    if (sub) sub.classList.remove('anim-visible');
}

// --- STATE TRANSITIONS ---
// v4.43: Inner selection logic (called after paper tear closes or directly)
function _doEnterSelection() {
    if (introState === 'SELECTION') return;
    introState = 'SELECTION';
    audioSys.play('coinUI');
    // v4.35: Hide title animator and clean up anim classes
    if (G.TitleAnimator) G.TitleAnimator.hide();
    _cleanupAnimClasses();
    if (G.PaperTear) G.PaperTear.reset();

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

window.enterSelectionState = function() {
    if (introState === 'SELECTION') return;
    // v4.43: Close paper tear first, then transition
    if (G.PaperTear && G.PaperTear.isOpen()) {
        _introActionCooldown = 0.8;
        G.PaperTear.close(_doEnterSelection);
        return;
    }
    _doEnterSelection();
}

// Go back to mode selection from ship selection
window.goBackToModeSelect = function() {
    if (introState === 'SPLASH') return;
    introState = 'SPLASH';
    audioSys.play('coinUI');
    // v4.35: Restore title animator in loop state (no replay)
    if (G.TitleAnimator && !G.TitleAnimator.isActive()) {
        G.TitleAnimator.start(true);
    }
    // v4.43: Reopen paper tear
    if (G.PaperTear) G.PaperTear.open();

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
    // v4.35: Cooldown prevents rapid-fire state transitions
    if (_introActionCooldown > 0) return;
    // v4.43: Block during paper tear closing
    if (G.PaperTear && G.PaperTear.isAnimating() && !G.PaperTear.isOpen()) return;
    if (introState === 'SPLASH') {
        // v4.35: Skip animation on button tap during ANIMATING
        if (G.TitleAnimator && G.TitleAnimator.isAnimating()) {
            G.TitleAnimator.skip();
            _introActionCooldown = 0.4;
            return;
        }
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
        btn.innerHTML = t('LAUNCH');
    } else {
        btn.classList.remove('launch-state');
        btn.innerHTML = t('TAP_START');
    }
}

// Update the mode indicator in selection screen
function updateModeIndicator() {
    const campaignState = G.CampaignState;
    const isStory = campaignState && campaignState.isEnabled();

    // Reload highScore for current mode (v4.50)
    highScore = loadHighScoreForMode();

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

    // Arcade records row (v4.50)
    const recordsRow = document.getElementById('arcade-records-row');
    if (recordsRow) {
        if (!isStory) {
            const rec = loadArcadeRecords();
            recordsRow.style.display = (rec.bestCycle || rec.bestLevel || rec.bestKills) ? 'flex' : 'none';
            const cl = document.getElementById('rec-cycle-label');
            const ll = document.getElementById('rec-level-label');
            const kl = document.getElementById('rec-kills-label');
            if (cl) cl.innerText = t('BEST_CYCLE');
            if (ll) ll.innerText = t('BEST_LEVEL');
            if (kl) kl.innerText = t('BEST_KILLS');
            setUI('rec-cycle-val', rec.bestCycle);
            setUI('rec-level-val', rec.bestLevel);
            setUI('rec-kills-val', rec.bestKills);
        } else {
            recordsRow.style.display = 'none';
        }
    }
}

window.cycleShip = function(dir) {
    selectedShipIndex = (selectedShipIndex + dir + SHIP_KEYS.length) % SHIP_KEYS.length;
    updateShipUI();
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
        nameEl.style.color = ship.accent;
        // Black outline for readability on any background
        nameEl.style.textShadow = `0 0 10px ${ship.accent}, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 8px rgba(0,0,0,0.8)`;
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

    // Chevron geometry (LV1 preview, matches Player._drawShipBody)
    const bodyHalfW = 22;
    const finExt = 0;
    const outline = '#1a1028';
    const tipY = -36;
    const shoulderX = bodyHalfW * 0.45;
    const shoulderY = -16;
    const wingY = -6;
    const waistX = bodyHalfW - 2;
    const waistY = 8;
    const rearX = bodyHalfW + 2;
    const rearY = 16;
    const centerRearY = 10;

    // === REACTOR FLAMES (4-layer, from rearY) ===
    const flameHeight = 25 + Math.sin(introShipTime * 12) * 10;
    const flameWidth = 12 + Math.sin(introShipTime * 10) * 4;
    const pulse = 1 + Math.sin(introShipTime * 8) * 0.15;

    ctx.fillStyle = '#cc3300';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(-flameWidth * 1.4 * pulse, rearY);
    ctx.lineTo(0, rearY + flameHeight * 1.2);
    ctx.lineTo(flameWidth * 1.4 * pulse, rearY);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.moveTo(-flameWidth, rearY);
    ctx.lineTo(0, rearY + flameHeight);
    ctx.lineTo(flameWidth, rearY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.moveTo(-flameWidth * 0.5, rearY);
    ctx.lineTo(0, rearY + flameHeight * 0.65);
    ctx.lineTo(flameWidth * 0.5, rearY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-flameWidth * 0.2, rearY);
    ctx.lineTo(0, rearY + flameHeight * 0.35);
    ctx.lineTo(flameWidth * 0.2, rearY);
    ctx.closePath();
    ctx.fill();

    // === CHEVRON BODY (two-tone left/right) ===
    ctx.lineWidth = 3;
    ctx.strokeStyle = outline;

    // Left half (dark)
    ctx.fillStyle = ship.bodyDark;
    ctx.beginPath();
    ctx.moveTo(0, tipY);
    ctx.lineTo(-shoulderX, shoulderY);
    ctx.lineTo(-bodyHalfW, wingY);
    ctx.lineTo(-waistX, waistY);
    ctx.lineTo(-rearX, rearY);
    ctx.lineTo(0, centerRearY);
    ctx.closePath();
    ctx.fill();

    // Right half (light)
    ctx.fillStyle = ship.bodyLight;
    ctx.beginPath();
    ctx.moveTo(0, tipY);
    ctx.lineTo(shoulderX, shoulderY);
    ctx.lineTo(bodyHalfW, wingY);
    ctx.lineTo(waistX, waistY);
    ctx.lineTo(rearX, rearY);
    ctx.lineTo(0, centerRearY);
    ctx.closePath();
    ctx.fill();

    // Full chevron outline
    ctx.beginPath();
    ctx.moveTo(0, tipY);
    ctx.lineTo(-shoulderX, shoulderY);
    ctx.lineTo(-bodyHalfW, wingY);
    ctx.lineTo(-waistX, waistY);
    ctx.lineTo(-rearX, rearY);
    ctx.lineTo(0, centerRearY);
    ctx.lineTo(rearX, rearY);
    ctx.lineTo(waistX, waistY);
    ctx.lineTo(bodyHalfW, wingY);
    ctx.lineTo(shoulderX, shoulderY);
    ctx.closePath();
    ctx.stroke();

    // === DORSAL SPINE (accent center line) ===
    ctx.save();
    ctx.strokeStyle = ship.accent;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, tipY + 6);
    ctx.lineTo(0, centerRearY - 2);
    ctx.stroke();
    ctx.restore();

    // === NOSE CAP (two-tone tip) ===
    ctx.lineWidth = 2;
    ctx.strokeStyle = outline;
    ctx.fillStyle = ship.noseDark;
    ctx.beginPath();
    ctx.moveTo(0, tipY);
    ctx.lineTo(-8, -20);
    ctx.lineTo(0, -20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = ship.noseLight;
    ctx.beginPath();
    ctx.moveTo(0, tipY);
    ctx.lineTo(0, -20);
    ctx.lineTo(8, -20);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, tipY);
    ctx.lineTo(-8, -20);
    ctx.lineTo(8, -20);
    ctx.closePath();
    ctx.stroke();

    // === NOSE BARREL (rect + glow tip) ===
    {
        const nbPulse = Math.sin(introShipTime * 6) * 0.3 + 0.7;
        ctx.fillStyle = ship.noseLight;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.rect(-2.5, -40, 5, 4);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = ship.accent;
        ctx.globalAlpha = nbPulse * 0.6;
        ctx.beginPath();
        ctx.arc(0, -40, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // === FINS (swept-back teal triangles) ===
    ctx.lineWidth = 3;
    ctx.strokeStyle = outline;

    ctx.fillStyle = ship.finDark;
    ctx.beginPath();
    ctx.moveTo(-bodyHalfW, wingY + 2);
    ctx.lineTo(-40 - finExt, rearY);
    ctx.lineTo(-bodyHalfW + 6, rearY + 2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = ship.finLight;
    ctx.beginPath();
    ctx.moveTo(bodyHalfW, wingY + 2);
    ctx.lineTo(40 + finExt, rearY);
    ctx.lineTo(bodyHalfW - 6, rearY + 2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // === RIM LIGHTING (edge highlights) ===
    ctx.strokeStyle = '#9977cc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(3, tipY + 4);
    ctx.lineTo(bodyHalfW - 2, wingY);
    ctx.stroke();

    ctx.strokeStyle = ship.noseLight;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(2, tipY + 2);
    ctx.lineTo(6, -22);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // === COCKPIT (BTC: path ₿, others: text symbol) ===
    if (key === 'BTC') {
        // Path-drawn ₿ (matches Player._drawBtcSymbolPath)
        const s = 0.9;
        const cockpitColor = '#00f0ff';
        ctx.save();
        ctx.translate(0, -2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const drawBPath = () => {
            ctx.beginPath();
            ctx.moveTo(-3 * s, -7 * s);
            ctx.lineTo(-3 * s, 7 * s);
            ctx.moveTo(-3 * s, -7 * s);
            ctx.lineTo(1 * s, -7 * s);
            ctx.quadraticCurveTo(6 * s, -7 * s, 6 * s, -3.5 * s);
            ctx.quadraticCurveTo(6 * s, 0, 1 * s, 0);
            ctx.lineTo(-3 * s, 0);
            ctx.moveTo(1 * s, 0);
            ctx.quadraticCurveTo(7 * s, 0, 7 * s, 3.5 * s);
            ctx.quadraticCurveTo(7 * s, 7 * s, 1 * s, 7 * s);
            ctx.lineTo(-3 * s, 7 * s);
            ctx.moveTo(-1 * s, -9 * s);
            ctx.lineTo(-1 * s, -6 * s);
            ctx.moveTo(2 * s, -9 * s);
            ctx.lineTo(2 * s, -6 * s);
            ctx.moveTo(-1 * s, 6 * s);
            ctx.lineTo(-1 * s, 9 * s);
            ctx.moveTo(2 * s, 6 * s);
            ctx.lineTo(2 * s, 9 * s);
            ctx.stroke();
        };

        // Outer glow
        ctx.lineWidth = 5 * s;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
        drawBPath();
        // Inner bright
        ctx.lineWidth = 1.8 * s;
        ctx.strokeStyle = cockpitColor;
        drawBPath();
        // Core white
        ctx.lineWidth = 0.8 * s;
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.8;
        drawBPath();

        ctx.restore();
    } else {
        // ETH / SOL: text symbol fallback
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = ship.accent;
        ctx.shadowBlur = 8;
        ctx.fillText(ship.symbol, 0, -2);
        ctx.shadowBlur = 0;
    }

    ctx.restore();

    introShipAnimId = requestAnimationFrame(animateIntroShip);
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
            audioSys.init(); // Create audio context
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

    // Music Toggle Buttons (v4.34.0 — separate music/SFX)
    document.querySelectorAll('.music-toggle').forEach(btn => {
        const handleMusic = (e) => {
            e.stopPropagation();
            if (e.type === 'touchstart') e.preventDefault();
            const isMuted = audioSys.toggleMusic();
            localStorage.setItem('fiat_music_muted', isMuted ? '1' : '0');
            updateMusicUI(isMuted);
        };
        btn.addEventListener('click', handleMusic);
        btn.addEventListener('touchstart', handleMusic);
    });

    // SFX Toggle Buttons
    document.querySelectorAll('.sfx-toggle').forEach(btn => {
        const handleSfx = (e) => {
            e.stopPropagation();
            if (e.type === 'touchstart') e.preventDefault();
            const isMuted = audioSys.toggleSfx();
            localStorage.setItem('fiat_sfx_muted', isMuted ? '1' : '0');
            updateSfxUI(isMuted);
        };
        btn.addEventListener('click', handleSfx);
        btn.addEventListener('touchstart', handleSfx);
    });

    // Sync initial state from localStorage (music OFF by default, SFX ON by default)
    const musicPref = localStorage.getItem('fiat_music_muted');
    const musicMuted = musicPref === null ? true : musicPref === '1';
    const sfxMuted = localStorage.getItem('fiat_sfx_muted') === '1';
    audioSys.applyMuteStates(musicMuted, sfxMuted);
    updateMusicUI(musicMuted);
    updateSfxUI(sfxMuted);

    if (ui.perkSkip) {
        ui.perkSkip.addEventListener('click', () => closePerkChoice());
    }
    if (events && events.on) {
        events.on('intermission_start', () => closePerkChoice());
        events.on('enemy_killed', () => {
        });
        // v4.6: GODCHAIN events
        events.on('GODCHAIN_ACTIVATED', () => {
            showPickup('🔥 ' + t('GODCHAIN_ON'));
            if (G.triggerScreenFlash) G.triggerScreenFlash('HYPER_ACTIVATE');
        });
        events.on('GODCHAIN_DEACTIVATED', () => {
            showPickup(t('GODCHAIN_OFF'));
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
                bullet.ownerColor = bd.ownerColor || null; // v4.56: enemy color for core tint
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

            // v4.51: Glow What's New button if version changed since last visit
            try {
                const seenVer = localStorage.getItem('fiat_whatsnew_seen');
                if (seenVer !== G.VERSION) {
                    const wnBtn = document.getElementById('intro-whatsnew');
                    if (wnBtn) wnBtn.classList.add('btn-glow-notify');
                }
            } catch(e) {}

            // v4.35: Title Animation — set subtitle text, init and start animator
            const subtitleEl = document.getElementById('title-subtitle');
            if (subtitleEl) subtitleEl.textContent = t('TITLE_SUBTITLE');
            if (G.TitleAnimator) {
                G.TitleAnimator.init(gameWidth, gameHeight, {
                    onControlsReady: function() { /* controls revealed by TitleAnimator */ }
                });
                // Add anim-active to title, anim-hidden to controls
                if (title) title.classList.add('anim-active');
                const primaryAction = document.querySelector('.primary-action-container');
                const introIcons = document.querySelector('.intro-icons');
                const introVersion = document.querySelector('.intro-version');
                const modeExpl = document.getElementById('mode-explanation');
                if (modeSelector) modeSelector.classList.add('anim-hidden');
                if (primaryAction) primaryAction.classList.add('anim-hidden');
                if (introIcons) introIcons.classList.add('anim-hidden');
                if (introVersion) introVersion.classList.add('anim-hidden');
                if (modeExpl) modeExpl.classList.add('anim-hidden');
                G.TitleAnimator.start(false);
            }

            try { updateUIText(); } catch (e) { }
            initIntroShip();

            // Initialize sky background for INTRO state
            if (G.SkyRenderer) G.SkyRenderer.init(gameWidth, gameHeight);
    if (G.WeatherController) G.WeatherController.init(gameWidth, gameHeight);
    if (G.WeatherController) G.WeatherController.setIntroMode();
    if (G.PaperTear) { G.PaperTear.init(gameWidth, gameHeight); G.PaperTear.open(); }

            // Restore campaign mode UI state (v4.8: sync UI with stored preference)
            if (G.CampaignState) {
                setGameMode(G.CampaignState.isEnabled() ? 'campaign' : 'arcade');
            }

            // Open curtain after intro screen is ready
            const curtain = document.getElementById('curtain-overlay');
            if (curtain) {
                setTimeout(() => curtain.classList.add('open'), 100);
            }

            // PWA install prompt — delay until after title animation (2.4s)
            setTimeout(checkPWAInstallPrompt, 3000);
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
        else if (gameState === 'PLAY' || gameState === 'WARMUP' || gameState === 'PAUSE') togglePause();
        else if (gameState === 'SETTINGS') backToIntro();
    });

    inputSys.on('start', () => {
        if (gameState === 'VIDEO') startApp();
        else if (gameState === 'STORY_SCREEN' && G.StoryScreen) G.StoryScreen.handleTap();
        else if (gameState === 'INTERMISSION' && waveMgr && waveMgr.intermissionTimer > 0) {
            waveMgr.intermissionTimer = 0; // Skip boss-defeat intermission
        }
        else if (gameState === 'INTRO') {
            // v4.35: Cooldown prevents rapid-fire state transitions (key repeat)
            if (_introActionCooldown > 0) return;
            // v4.43: Block tap during paper tear closing animation
            if (G.PaperTear && G.PaperTear.isAnimating() && !G.PaperTear.isOpen()) return;
            // v4.35: Skip title animation on tap during ANIMATING
            if (introState === 'SPLASH' && G.TitleAnimator && G.TitleAnimator.isAnimating()) {
                G.TitleAnimator.skip();
                _introActionCooldown = 0.4;
                return;
            }
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

        // v4.51: Glow What's New button if version changed
        try {
            const seenVer = localStorage.getItem('fiat_whatsnew_seen');
            if (seenVer !== G.VERSION) {
                const wnBtn = document.getElementById('intro-whatsnew');
                if (wnBtn) wnBtn.classList.add('btn-glow-notify');
            }
        } catch(e) {}

        updateUIText();
        setGameState('INTRO');
        introState = 'SPLASH';
        initIntroShip();
        if (G.WeatherController) G.WeatherController.setIntroMode();

        // v4.35: Title Animation for no-video path
        const subtitleEl = document.getElementById('title-subtitle');
        if (subtitleEl) subtitleEl.textContent = t('TITLE_SUBTITLE');
        if (G.TitleAnimator) {
            G.TitleAnimator.init(gameWidth, gameHeight, {});
            if (title) title.classList.add('anim-active');
            const primaryAction = document.querySelector('.primary-action-container');
            const introIcons = document.querySelector('.intro-icons');
            const introVersion = document.querySelector('.intro-version');
            const modeExpl = document.getElementById('mode-explanation');
            if (modeSelector) modeSelector.classList.add('anim-hidden');
            if (primaryAction) primaryAction.classList.add('anim-hidden');
            if (introIcons) introIcons.classList.add('anim-hidden');
            if (introVersion) introVersion.classList.add('anim-hidden');
            if (modeExpl) modeExpl.classList.add('anim-hidden');
            G.TitleAnimator.start(false);
        }
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
        const pwaBottomInset = Math.max(insets.bottom, 34); // iPhone home indicator min
        document.documentElement.style.setProperty('--pwa-bottom-inset', pwaBottomInset + 'px');
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
    // v5.4.0: Cache message-strip position for canvas HUD alignment
    const stripElResize = document.getElementById('message-strip');
    if (stripElResize) {
        window._stripTopY = parseFloat(getComputedStyle(stripElResize).top) || 67;
    }
    // Update SkyRenderer dimensions (fixes gradient cache + hill positions on resize)
    if (G.SkyRenderer) {
        G.SkyRenderer.setDimensions(gameWidth, gameHeight);
        if (G.WeatherController) G.WeatherController.setDimensions(gameWidth, gameHeight);
    }
    // v4.35: Update TitleAnimator dimensions
    if (G.TitleAnimator) {
        G.TitleAnimator.setDimensions(gameWidth, gameHeight);
    }
    // v5.5: Update StoryScreen dimensions (cinematic backgrounds)
    if (G.StoryScreen && G.StoryScreen.isShowing()) {
        G.StoryScreen.setDimensions(gameWidth, gameHeight);
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
    // v4.35: Update subtitle text on language change
    const subtitleEl = document.getElementById('title-subtitle');
    if (subtitleEl) subtitleEl.textContent = t('TITLE_SUBTITLE');
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
            btnPrimary.innerHTML = t('LAUNCH');
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
    const privacyLink = document.getElementById('privacy-link');
    if (privacyLink) privacyLink.innerText = t('PRIVACY');
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
window.togglePrivacyPanel = function () {
    const panel = document.getElementById('privacy-panel');
    if (panel) panel.style.display = (panel.style.display === 'flex') ? 'none' : 'flex';
};

// What's New panel (v4.50)
const WHATS_NEW = [
    {
        version: 'v5.7.0', date: '2026-02-14', title: 'Boss Redesign + Tap Shield',
        items: [
            'NEW: All 3 bosses completely redesigned — FED (Illuminati Pyramid), BCE (Star Fortress), BOJ (Golden Torii)',
            'NEW: Hexgrid energy shield — honeycomb pattern with radial wave animation replaces flat circle',
            'NEW: Tap on your ship to activate shield (mobile) — pulsing cyan ring shows when ready',
            'Boss HP bar redesigned with gradient fill, glow, and phase markers',
            'Status texts slightly larger across all message types for better readability'
        ]
    },
    {
        version: 'v5.3.0', date: '2026-02-13', title: 'Gradius-Style Laser Beam',
        items: [
            'NEW: Laser perk now fires a 110px elongated beam bolt — 3-layer glow (white core, cyan mid, additive outer)',
            'Gradius-style single beam — multi-cannon levels merge into one powerful central beam with combined damage',
            'Beam collides along its entire length — enemies and enemy bullets are hit by the full segment',
            'Shimmer animation, head glow, and full elemental overlay support (Fire/Electric/GODCHAIN/HYPER)'
        ]
    },
    {
        version: 'v5.1.0', date: '2026-02-13', title: 'Directional Muzzle Flash',
        items: [
            'NEW: Cannon-aligned muzzle flash — V-shaped flare fires from actual gun positions',
            'Muzzle flash scales with weapon level and changes color with elemental perks',
            'Fire: wider red flash — Laser: tall cyan beam — Electric: violet arcs — GODCHAIN: fire tongues',
            'Directional spark particles now shoot upward from each cannon barrel'
        ]
    },
    {
        version: 'v4.61.0', date: '2026-02-13', title: 'Elemental Perk Drops',
        items: [
            'NEW: Elemental Perks — Fire, Laser, Electric — now drop as physical power-ups (diamond crystals)',
            'Fixed order: Fire (splash damage) → Laser (+speed, +pierce) → Electric (chain lightning)',
            'Collecting all 3 elements activates GODCHAIN — further drops re-trigger it',
            'DIP meter no longer accumulates during HYPER — resets to zero when HYPER ends',
            'HODL mode removed — was unusable on mobile (autofire requires touch)',
            'HYPER duration fixed at 10 seconds (no extensions)',
            'Meter decay doubled — stay aggressive to keep it filled'
        ]
    },
    {
        version: 'v4.58.0', date: '2026-02-12', title: 'Cyberpunk Damage FX',
        items: [
            'NEW: Enemies visually deteriorate below 50% HP with 5 layered cyberpunk effects',
            'Neon outline flickers and glitches — cracks appear on the body',
            'Bright neon sparks replace old grey smoke',
            'Glow halo destabilizes: faster pulse, dimmer, desaturated',
            'Body darkens progressively — damage is now unmistakable'
        ]
    },
    {
        version: 'v4.53.0', date: '2026-02-12', title: 'Premium Purple Neon',
        items: [
            'Full UI color unification: all buttons, menus, modals now neon violet',
            'BTC ship recolored to violet',
            'Story screen highlights, tutorial, manual, settings — all violet themed',
            'Arcade mode temporarily disabled (work in progress)'
        ]
    },
    {
        version: 'v4.50.0', date: '2026-02-12', title: 'Arcade Mode Enhancements',
        items: [
            'Separate high scores for Story and Arcade modes',
            'Arcade gameover shows Cycle, Level, Wave stats',
            'Persistent arcade records (best cycle, level, kills) with NEW BEST badge',
            'Arcade records displayed in selection screen',
            'Records now persist across updates'
        ]
    },
    {
        version: 'v4.49.0', date: '2026-02-12', title: 'Architectural Refactor',
        items: [
            'Extracted 4 modules from main.js for better code organization',
            'Added test suite with 103 assertions'
        ]
    },
    {
        version: 'v4.48.0', date: '2026-02-12', title: 'Balance Recalibration',
        items: [
            'Enemy and Boss HP rebalanced for weapon evolution system',
            'Improved adaptive drop intelligence',
            'Weapon pacing tuned (level 5 reached in cycle 2)'
        ]
    },
    {
        version: 'v4.47.0', date: '2026-02-12', title: 'Weapon Evolution Redesign',
        items: [
            'New 5-level linear weapon system (replaces old 3+3+6)',
            '3 specials: Homing, Pierce, Missile',
            '2 utilities: Shield, Speed (capsule visual)',
            'Laser removed'
        ]
    }
];
const WHATS_NEW_PLANNED = [
    'Leaderboard online',
    'New enemy types & formations',
    'Achievement system',
    'New bosses'
];
let whatsNewRendered = false;
function renderWhatsNew() {
    const container = document.getElementById('whatsnew-content');
    if (!container || whatsNewRendered) return;
    let html = '';
    for (const entry of WHATS_NEW) {
        html += `<div class="whatsnew-version"><h3>${entry.version} — ${entry.title}</h3><span class="wn-date">${entry.date}</span><ul>`;
        for (const item of entry.items) html += `<li>${item}</li>`;
        html += '</ul></div>';
    }
    if (WHATS_NEW_PLANNED.length) {
        html += '<div class="whatsnew-planned"><h3>COMING SOON</h3><ul>';
        for (const item of WHATS_NEW_PLANNED) html += `<li>${item}</li>`;
        html += '</ul></div>';
    }
    container.innerHTML = html;
    whatsNewRendered = true;
}
window.toggleWhatsNew = function () {
    const panel = document.getElementById('whatsnew-panel');
    if (!panel) return;
    const isVisible = panel.style.display === 'flex';
    panel.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
        renderWhatsNew();
        // i18n
        const title = document.getElementById('whatsnew-title');
        const closeBtn = document.getElementById('btn-whatsnew-close');
        if (title) title.innerText = t('WHATS_NEW') || "WHAT'S NEW";
        if (closeBtn) closeBtn.innerText = t('CLOSE') || 'CLOSE';
        audioSys.play('coinUI');
        // Mark version as seen — remove glow
        try { localStorage.setItem('fiat_whatsnew_seen', G.VERSION); } catch(e) {}
        const wnBtn = document.getElementById('intro-whatsnew');
        if (wnBtn) wnBtn.classList.remove('btn-glow-notify');
    }
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
    audioSys.init();
    audioSys.startMusic(); // Resumes context + starts music
    window.scrollTo(0, 0);
    setStyle('intro-screen', 'display', 'none');
    setStyle('hangar-screen', 'display', 'flex');
    setGameState('HANGAR');
    if (G.SkyRenderer) G.SkyRenderer.init(gameWidth, gameHeight);
    if (G.WeatherController) G.WeatherController.init(gameWidth, gameHeight); // Start BG effect early
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

    // v5.17: Prompt nickname before first launch
    if (!hasNickname()) {
        isLaunching = false;
        showNicknamePrompt(() => launchShipAndStart());
        return;
    }

    // Init audio context and resume immediately (must be synchronous with user gesture)
    if (!audioSys.ctx) audioSys.init();
    if (audioSys.ctx && audioSys.ctx.state === 'suspended') {
        audioSys.unlockWebAudio();
        audioSys.ctx.resume().catch(e => console.warn('[Audio] resume failed:', e));
    }

    const shipCanvas = document.getElementById('intro-ship-canvas');
    const introScreen = document.getElementById('intro-screen');
    const curtain = document.getElementById('curtain-overlay');

    // v5.0: ship canvas removed from HTML — skip launch animation if missing
    if (!shipCanvas) {
        if (introScreen) { introScreen.style.display = 'none'; }
        selectedShipIndex = 0;
        player.configure(SHIP_KEYS[selectedShipIndex]);
        audioSys.startMusic();
        if (G.SkyRenderer) G.SkyRenderer.init(gameWidth, gameHeight);
        if (G.WeatherController) G.WeatherController.init(gameWidth, gameHeight);
        const campaignState = G.CampaignState;
        if (campaignState && campaignState.isEnabled() && shouldShowStory('PROLOGUE')) {
            setTimeout(() => { if (curtain) curtain.classList.add('open'); }, 100);
            showStoryScreen('PROLOGUE', () => { startGame(); });
        } else {
            startGame();
            setTimeout(() => { if (curtain) curtain.classList.add('open'); }, 100);
        }
        isLaunching = false;
        return;
    }

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

        // Configure player with selected ship
        const selectedShipKey = SHIP_KEYS[selectedShipIndex];
        player.configure(selectedShipKey);

        audioSys.startMusic();
        if (G.SkyRenderer) G.SkyRenderer.init(gameWidth, gameHeight);
    if (G.WeatherController) G.WeatherController.init(gameWidth, gameHeight);

        // Show prologue if needed, then start game (WARMUP + tutorial on first play)
        const campaignState = G.CampaignState;
        if (campaignState && campaignState.isEnabled() && shouldShowStory('PROLOGUE')) {
            setTimeout(() => {
                if (curtain) curtain.classList.add('open');
            }, 100);
            showStoryScreen('PROLOGUE', () => {
                startGame();
            });
        } else {
            startGame();
            setTimeout(() => {
                if (curtain) curtain.classList.add('open');
            }, 100);
        }
    }

    // Start animation
    requestAnimationFrame(animateLaunch);
}

// === Tutorial System (v5.12 progressive steps) ===
let tutorialCallback = null;
let tutorialStep = 0;

function showTutorialOverlay() {
    const overlay = document.getElementById('tutorial-overlay');
    if (!overlay) { endWarmup(); return; }
    // Localize texts
    const T = G.TEXTS[G._currentLang || 'EN'] || G.TEXTS.EN;
    overlay.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (T[key]) el.textContent = T[key];
    });
    // Reset to step 0
    tutorialStep = 0;
    for (let i = 0; i < 3; i++) {
        const step = document.getElementById('tut-step-' + i);
        if (step) {
            step.className = 'tut-step' + (i === 0 ? ' tut-step--active' : '');
        }
    }
    // Update dots
    updateTutDots(0);
    // Button text = NEXT
    const btn = document.getElementById('tut-go-btn');
    if (btn) {
        btn.textContent = T.TUT_NEXT || 'NEXT';
        btn.onclick = handleTutorialButton;
    }
    overlay.style.display = 'flex';
    tutorialCallback = endWarmup;
}

function updateTutDots(activeIdx) {
    const dots = document.querySelectorAll('.tut-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === activeIdx);
    });
}

function advanceTutorial() {
    const curStep = document.getElementById('tut-step-' + tutorialStep);
    tutorialStep++;
    const nextStep = document.getElementById('tut-step-' + tutorialStep);
    if (!curStep || !nextStep) return;

    // Animate out current
    curStep.className = 'tut-step tut-step--out';
    // After out animation, show next
    setTimeout(() => {
        curStep.className = 'tut-step';
        nextStep.className = 'tut-step tut-step--active';
        updateTutDots(tutorialStep);
        // Last step → change button to GO!
        if (tutorialStep === 2) {
            const T = G.TEXTS[G._currentLang || 'EN'] || G.TEXTS.EN;
            const btn = document.getElementById('tut-go-btn');
            if (btn) btn.textContent = T.GO || 'GO!';
        }
    }, 250);
}

function handleTutorialButton() {
    if (tutorialStep < 2) {
        advanceTutorial();
    } else {
        completeTutorial();
    }
}

window.completeTutorial = completeTutorial;
function completeTutorial() {
    const tutMode = (G.CampaignState && G.CampaignState.isEnabled()) ? 'story' : 'arcade';
    localStorage.setItem('fiat_tutorial_' + tutMode + '_seen', '1');
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) {
        overlay.style.transition = 'opacity 0.2s ease-out';
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
            overlay.style.transition = '';
            overlay.style.opacity = '';
        }, 200);
    }
    if (tutorialCallback) tutorialCallback();
    tutorialCallback = null;
}

window.togglePause = function () {
    if (gameState === 'PLAY' || gameState === 'WARMUP' || gameState === 'INTERMISSION') {
        const wasWarmup = gameState === 'WARMUP';
        setGameState('PAUSE'); setStyle('pause-screen', 'display', 'flex'); setStyle('pause-btn', 'display', 'none');
        if (wasWarmup) window._pausedFromWarmup = true;
    }
    else if (gameState === 'PAUSE') {
        if (window._pausedFromWarmup) { setGameState('WARMUP'); window._pausedFromWarmup = false; }
        else { setGameState('PLAY'); }
        setStyle('pause-screen', 'display', 'none'); setStyle('pause-btn', 'display', 'block');
    }
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
    clearBossDeathTimeouts(); // v5.13.1: Cancel orphan boss death timeouts

    // Immediately hide touch controls (before curtain animation)
    if (ui.touchControls) {
        ui.touchControls.classList.remove('visible');
        ui.touchControls.style.display = 'none';
    }
    setStyle('control-zone-hint', 'display', 'none');

    // Close curtain first
    const curtain = document.getElementById('curtain-overlay');
    if (curtain) curtain.classList.remove('open');

    setTimeout(() => {
        // v4.21: Comprehensive cleanup of ALL game overlays
        setStyle('pause-screen', 'display', 'none');
        setStyle('gameover-screen', 'display', 'none');
        setStyle('hangar-screen', 'display', 'none');
        setStyle('perk-modal', 'display', 'none');
        // v4.37: Hide tutorial overlay
        setStyle('tutorial-overlay', 'display', 'none');
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

        // v4.51: Glow What's New button if version changed
        try {
            const seenVer = localStorage.getItem('fiat_whatsnew_seen');
            if (seenVer !== G.VERSION) {
                const wnBtn = document.getElementById('intro-whatsnew');
                if (wnBtn) wnBtn.classList.add('btn-glow-notify');
            }
        } catch(e) {}

        setGameState('INTRO');
        introState = 'SPLASH';
        if (G.WeatherController) G.WeatherController.setIntroMode();

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

        // Release pooled bullets before leaving gameplay (prevents pool leak across restarts)
        if (typeof bullets !== 'undefined' && bullets.length) { bullets.forEach(b => G.Bullet.Pool.release(b)); bullets.length = 0; }
        if (typeof enemyBullets !== 'undefined' && enemyBullets.length) { enemyBullets.forEach(b => G.Bullet.Pool.release(b)); enemyBullets.length = 0; }

        audioSys.resetState();
        audioSys.init();
        if (G.HarmonicConductor) G.HarmonicConductor.reset();
        initIntroShip();

        // v4.35: Restart TitleAnimator in skip mode (no replay on return)
        if (G.TitleAnimator) {
            _cleanupAnimClasses();
            const subtitleEl = document.getElementById('title-subtitle');
            if (subtitleEl) subtitleEl.textContent = t('TITLE_SUBTITLE');
            G.TitleAnimator.init(gameWidth, gameHeight, {});
            G.TitleAnimator.start(true);
        }
        // v4.43: Reinit and reopen paper tear
        if (G.PaperTear) { G.PaperTear.init(gameWidth, gameHeight); G.PaperTear.open(); }

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

function updateMusicUI(isMuted) {
    document.querySelectorAll('.music-toggle').forEach(btn => {
        const svg = btn.querySelector('.icon-svg');
        if (svg) {
            if (isMuted) {
                btn.classList.add('muted');
                svg.innerHTML = '<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/><line x1="3" y1="3" x2="21" y2="21" stroke="#c0392b" stroke-width="2.5"/>';
            } else {
                btn.classList.remove('muted');
                svg.innerHTML = '<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>';
            }
        }
    });
}

function updateSfxUI(isMuted) {
    document.querySelectorAll('.sfx-toggle').forEach(btn => {
        const svg = btn.querySelector('.icon-svg');
        if (svg) {
            if (isMuted) {
                btn.classList.add('muted');
                svg.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
            } else {
                btn.classList.remove('muted');
                svg.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>';
            }
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

/** Restore HUD + touchControls after story screen */
function restoreGameUI() {
    if (ui.uiLayer) ui.uiLayer.style.display = 'flex';
    if (ui.touchControls) {
        ui.touchControls.style.display = 'block';
        requestAnimationFrame(() => {
            if (ui.touchControls) ui.touchControls.classList.add('visible');
        });
    }
    setStyle('control-zone-hint', 'display', 'block');
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
    setStyle('control-zone-hint', 'display', 'none');

    G.StoryScreen.show(storyId, () => {
        // Let onComplete handle state transition and UI — don't force PLAY or show controls here
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
    clearBossDeathTimeouts(); // v5.13.1: Cancel orphan boss death timeouts

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
    setStyle('control-zone-hint', 'display', 'block');

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
    memeSwapTimer = Balance.MEMES.TICKER_SWAP_INTERVAL;
    closePerkChoice();
    G.PerkManager.reset(); // Reset perk display
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
    // Release pooled bullets before clearing arrays (prevents pool leak on restart)
    bullets.forEach(b => G.Bullet.Pool.release(b));
    enemyBullets.forEach(b => G.Bullet.Pool.release(b));
    bullets = []; enemies = []; enemyBullets = []; powerUps = []; particles = []; floatingTexts = []; muzzleFlashes = []; perkIcons = []; boss = null; miniBoss = null;
    if (G.FloatingTextManager) G.FloatingTextManager.reset();
    if (G.PerkIconManager) G.PerkIconManager.reset();
    if (G.MessageSystem) G.MessageSystem.reset(); // Reset typed messages
    // Sync all array references after reset
    G.enemies = enemies;
    window.enemyBullets = enemyBullets;
    window.boss = null; window.miniBoss = null; // v2.22.5: Sync for debug overlay
    window._evolutionItem = null; // v5.11: Clear any pending evolution item
    if (G.HarmonicConductor) G.HarmonicConductor.enemies = enemies;
    updateGrazeUI(); // Reset grazing UI

    waveMgr.reset();
    gridDir = 1;
    // gridSpeed now computed dynamically via getGridSpeed()

    // v4.37: First game → WARMUP + tutorial overlay. Retry → straight to PLAY.
    if (!warmupShown) {
        setGameState('WARMUP');
        warmupShown = true;
        showTutorialOverlay();
    } else {
        setGameState('PLAY');
        showShipIntroMeme();
    }

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
    G.MiniBossManager.reset(); miniBoss = null;
    G.DropSystem.reset(); // Reset drop system (pity timer, weapon cooldown, boss drops)
    G.MemeEngine.reset(); // Reset meme engine (ticker timer, popup cooldown)
    perkPauseTimer = 0; // Reset perk pause
    perkPauseData = null;
    bossWarningTimer = 0; // Reset boss warning
    bossWarningType = null;

    // Reset visual effects
    shake = 0;
    deathAlreadyTracked = false; // Reset death tracking flag
    if (G.SkyRenderer) G.SkyRenderer.reset();
    if (G.WeatherController) { G.WeatherController.reset(); G.WeatherController.setLevel(1, false, false); }
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

    // v4.49: Initialize PerkManager with dependencies
    G.PerkManager.init({
        getRunState: () => runState,
        getPlayer: () => player,
        setStyle,
        updateLivesUI,
        emitEvent
    });

    // v4.49: Initialize MiniBossManager with dependencies
    G.MiniBossManager.init({
        gameWidth: () => gameWidth,
        gameHeight: () => gameHeight,
        level: () => level,
        marketCycle: () => marketCycle,
        runState: () => runState,
        player: () => player,
        waveMgr,
        enemies: () => enemies,
        setEnemies: (e) => { enemies = e; G.enemies = enemies; if (window.Game) window.Game.enemies = enemies; },
        enemyBullets: () => enemyBullets,
        setEnemyBullets: (eb) => { enemyBullets = eb; window.enemyBullets = enemyBullets; },
        score: () => score,
        setScore: (s) => { score = s; },
        updateScore,
        totalTime: () => totalTime,
        setWaveStartTime: (t2) => { waveStartTime = t2; },
        setBossJustDefeated: (v) => { bossJustDefeated = v; },
        setShake: (v) => { shake = Math.max(shake, v); },
        applyHitStop,
        showDanger,
        showVictory,
        createEnemyDeathExplosion,
        createExplosion,
        canSpawnEnemyBullet,
        getFiatDeathMeme,
        t
    });

    emitEvent('run_start', { bear: isBearMarket });
}

// Ship intro meme (non-blocking popup from DIALOGUES.SHIP_INTRO)
function showShipIntroMeme() {
    const dialogues = window.Game.DIALOGUES && window.Game.DIALOGUES.SHIP_INTRO;
    if (!dialogues || !player) return;
    const lines = dialogues[player.type];
    if (!lines || !lines.length) return;
    const text = lines[Math.floor(Math.random() * lines.length)];
    if (G.MemeEngine) G.MemeEngine.queueMeme('SHIP_INTRO', text, player.type);
}

// v4.37: End warmup — transition from tutorial overlay to PLAY
window.endWarmup = function() {
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) overlay.style.display = 'none';
    // Cleanup legacy warmup-overlay if present (old cached code)
    const legacyWarmup = document.getElementById('warmup-overlay');
    if (legacyWarmup) legacyWarmup.remove();
    setGameState('PLAY');
    // Ship intro as meme popup (non-blocking)
    showShipIntroMeme();
};

function highlightShip(idx) {
    document.querySelectorAll('.ship-card').forEach((el, i) => {
        el.style.transform = (i === idx) ? "scale(1.1)" : "scale(1)";
        el.style.border = (i === idx) ? "2px solid #00ff00" : "1px solid #333";
    });
}

function startIntermission(msgOverride) {
    setGameState('INTERMISSION');
    // v5.4.0: Boss defeat uses longer intermission (6s, skippable)
    const isBossDefeat = !!msgOverride;
    const _isArcade2 = G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode();
    const duration = isBossDefeat
        ? (_isArcade2 ? (Balance.ARCADE.INTERMISSION_BOSS_DURATION || 4.0) : (Balance.TIMING.INTERMISSION_BOSS_DURATION || 6.0))
        : (_isArcade2 ? (Balance.ARCADE.INTERMISSION_DURATION || 2.0) : Balance.TIMING.INTERMISSION_DURATION);
    waveMgr.intermissionTimer = duration;
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
            updateScore(score, bulletBonus);
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
        if (G.Events) G.Events.emit('weather:wave_clear');
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

    // v5.4.0: Boss defeat → sequenced messages over 6s
    if (isBossDefeat) {
        // t=0: VICTORY + boss meme already queued by onBossDeath callback
        // t=2s: weapon unlock check
        setTimeout(() => checkWeaponUnlocks(window.marketCycle), 2000);
        // t=4s: "CYCLE X BEGINS" via wave info strip
        setTimeout(() => {
            if (msgOverride) {
                G.MessageSystem.showWaveInfo(msgOverride, '');
            }
        }, 4000);
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
            updateScore(score, bulletBonus);
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

    // v4.42: Ambient weather with boss active
    if (G.WeatherController) G.WeatherController.setLevel(level, isBearMarket, true);

    // Reset boss drop tracking for new boss fight
    G.DropSystem.resetBossDrops();

    // v2.22.1 fix: Clear all entities for clean boss entrance
    enemies = [];
    if (window.Game) window.Game.enemies = enemies;

    // v2.22.4: Clear miniBoss if active - only main boss should exist
    if (miniBoss) { G.MiniBossManager.clear(); miniBoss = null; }

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
    if (G.Events) G.Events.emit('weather:boss_spawn');

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

G._spawnBoss = spawnBoss; // v5.7: debug access

// Mini-Boss System - v2.18.0: Spawns actual boss types based on currency mapping
// bossTypeOrSymbol: Either a boss type ('FEDERAL_RESERVE', 'BCE', 'BOJ') or currency symbol for legacy
// triggerColor: Color of the triggering currency (for visual theming)
// --- MINI-BOSS (delegated to MiniBossManager) ---
function spawnMiniBoss(type, color) { G.MiniBossManager.spawn(type, color); miniBoss = G.MiniBossManager.get(); }
function updateMiniBoss(dt) { G.MiniBossManager.update(dt); miniBoss = G.MiniBossManager.get(); }
function drawMiniBoss(ctx) { G.MiniBossManager.draw(ctx); }
function checkMiniBossHit(b) {
    const result = G.MiniBossManager.checkHit(b);
    miniBoss = G.MiniBossManager.get();
    return result;
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

    // Graze meter decay: v5.15.1 — decay disabled (meter only goes up from proximity kills)
    // HYPER risk/reward is self-balancing: more enemies in C3 = faster meter BUT more bullets + INSTANT_DEATH
    const isHyperActive = player && player.isHyperActive && player.isHyperActive();
    if (false) { // decay disabled — kept for potential re-enable
        grazeMeter = Math.max(0, grazeMeter - Balance.GRAZE.DECAY_RATE * dt);
        grazeMultiplier = 1 + (grazeMeter / Balance.GRAZE.MULT_DIVISOR) * (Balance.GRAZE.MULT_MAX - 1);

        // Check if meter dropped below threshold, hide HYPER ready indicator
        if (grazeMeter < Balance.HYPER.METER_THRESHOLD && player.hyperAvailable) {
            player.hyperAvailable = false;
        }
        updateGrazeUI();
    }

    // Arcade combo timer decay
    if (G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode()) {
        const rs = G.RunState;
        if (rs.comboTimer > 0) {
            rs.comboTimer -= dt;
            if (rs.comboTimer <= 0) {
                rs.comboTimer = 0;
                if (rs.comboCount > 0) {
                    rs.comboDecayAnim = Balance.ARCADE.COMBO.DECAY_ANIM;
                    rs.comboCount = 0;
                    rs.comboMult = 1.0;
                }
            }
        }
        if (rs.comboDecayAnim > 0) {
            rs.comboDecayAnim -= dt;
        }
        // Nano Shield auto-trigger
        const ab = rs.arcadeBonuses;
        if (ab.nanoShieldCooldown > 0 && ab.nanoShieldTimer > 0) {
            ab.nanoShieldTimer -= dt;
            if (ab.nanoShieldTimer <= 0 && player && !player.shieldActive) {
                player.activateShield();
                ab.nanoShieldTimer = ab.nanoShieldCooldown;
            }
        }
    }

    // HYPER activation check (game loop fallback — catches meter reaching threshold between kills)
    if (player && player.hyperCooldown <= 0 && grazeMeter >= Balance.HYPER.METER_THRESHOLD && !isHyperActive) {
        if (Balance.HYPER.AUTO_ACTIVATE && player.canActivateHyper && player.canActivateHyper(grazeMeter)) {
            player.activateHyper();
            grazeMeter = 0;
            updateGrazeUI();
            triggerScreenFlash('HYPER_ACTIVATE');
        } else if (!player.hyperAvailable) {
            player.hyperAvailable = true;
            // v5.4.0: No text — slim bar in drawHyperUI handles visual
            audioSys.play('hyperReady');
        }
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
                    updateScore(score, bulletBonus);
                    addText(`+${bulletBonus} ${t('BULLET_BONUS')}`, gameWidth / 2, gameHeight / 2 + 50, '#0ff', 18);
                }
            }
            bullets.forEach(b => G.Bullet.Pool.release(b));
            enemyBullets.forEach(b => G.Bullet.Pool.release(b));
            bullets = []; enemyBullets = [];
            window.enemyBullets = enemyBullets;
            audioSys.play('waveComplete');
            if (G.Events) G.Events.emit('weather:wave_clear');
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
                // v4.57: Early drop boost — pre-fill pity counter so first power-up comes quickly
                const edl = Balance.DROP_SCALING?.EARLY_DROP_LEVEL;
                if (edl && level === edl && G.DropSystem) {
                    G.DropSystem.killsSinceLastDrop = Math.max(G.DropSystem.killsSinceLastDrop, Balance.DROP_SCALING.EARLY_DROP_PREFILL || 40);
                }
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
            if (G.MemeEngine) G.MemeEngine.setWaveStartTime();

            // Update global level BEFORE spawnWave so enemy HP scaling is correct
            window.currentLevel = level;

            // v4.42: Update ambient weather for new level
            if (G.WeatherController) {
                G.WeatherController.setLevel(level, isBearMarket, !!(boss && boss.active));
                G.WeatherController.triggerLevelTransition();
            }

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

    if (gameState === 'PLAY' || gameState === 'WARMUP') {
        const inWarmup = gameState === 'WARMUP';
        // Always update player for movement, but block firing during warmup or enemy entrance
        const enemiesEntering = !inWarmup && G.HarmonicConductor && G.HarmonicConductor.areEnemiesEntering();
        // Freeze HYPER timer during non-combat states (warmup, boss warning)
        player.hyperFrozen = gameState !== 'PLAY' || bossWarningTimer > 0;
        const newBullets = player.update(dt, inWarmup || enemiesEntering);
        if (!inWarmup && newBullets && newBullets.length > 0) {
            bullets.push(...newBullets);
            createMuzzleFlashParticles(player.x, player.y - 25, player.stats.color, {
                weaponLevel: player.weaponLevel ?? 1,
                isGodchain: player._godchainActive
            });
        }

      if (!inWarmup) {

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
                    bullet.isBossBullet = true; // v5.10.3: Tag for BOSS_PATTERN collision radius
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
      } // end !inWarmup
    }
    updateFloatingTexts(dt);
    updateTypedMessages(dt);
    updatePerkIcons(dt);
    // v5.14: Score pulse accumulator decay
    if (_scorePulseAccTimer > 0) _scorePulseAccTimer -= dt;
    // v5.11: Evolution item fly towards player
    updateEvolutionItem(dt);
    updateParticles(dt);
    if (G.TransitionManager) G.TransitionManager.update(dt);
}

function updateBullets(dt) {
    // Build spatial grids for collision optimization
    if (G.CollisionSystem.buildGrids) G.CollisionSystem.buildGrids();

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
}

// v5.4.0: Draw HYPER mode UI — compact bar ABOVE message strip (Row 1: HUD → HYPER → strip → enemies)
function drawHyperUI(ctx) {
    if (!player) return;

    const isHyperActive = player.isHyperActive && player.isHyperActive();
    const centerX = gameWidth / 2;
    // Position: 2px above message-strip, derived from cached DOM position
    const stripY = window._stripTopY || 67;
    const hyperUI = Balance.HUD_MESSAGES?.HYPER_UI;

    // HYPER ACTIVE: Compact bar with timer inside
    if (isHyperActive) {
        const timeLeft = player.getHyperTimeRemaining ? player.getHyperTimeRemaining() : 0;

        const barWidth = 200;
        const barHeight = 18;
        const barX = centerX - barWidth / 2;
        const barY = stripY - barHeight - 2; // 2px gap above strip

        ctx.save();

        // Bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

        // Time fill (golden, depleting)
        const fillRatio = timeLeft / Balance.HYPER.BASE_DURATION;
        const fillColor = fillRatio < 0.3 ? '#ff4444' : '#FFD700';
        ctx.fillStyle = fillColor;
        ctx.fillRect(barX, barY, barWidth * Math.min(1, fillRatio), barHeight);

        // Border
        ctx.strokeStyle = fillRatio < 0.3 ? '#ff6666' : '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Combined text: "HYPER x5  8.3s"
        ctx.font = G.ColorUtils.font('bold', 13, '"Courier New", monospace');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        const label = 'HYPER x5  ' + timeLeft.toFixed(1) + 's';
        ctx.strokeText(label, centerX, barY + barHeight / 2);
        ctx.fillText(label, centerX, barY + barHeight / 2);

        ctx.restore();
    }
    // HYPER READY: Slim golden pulsing bar
    else if (player.hyperAvailable && grazeMeter >= Balance.HYPER.METER_THRESHOLD) {
        if (hyperUI && !hyperUI.SHOW_TEXT_WHEN_IDLE) {
            const barW = hyperUI.IDLE_BAR_WIDTH || 160;
            const barH = hyperUI.IDLE_BAR_HEIGHT || 4;
            const barY = stripY - barH - 8; // Centered in gap above strip
            const pulse = Math.sin(totalTime * 6) * 0.3 + 0.7;
            ctx.save();
            ctx.globalAlpha = pulse;
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(centerX - barW / 2, barY, barW, barH);
            ctx.restore();
        } else {
            // Legacy text mode (kill-switch)
            const pulse = Math.sin(totalTime * 6) * 0.15 + 0.85;
            ctx.save();
            ctx.font = G.ColorUtils.font('bold', 20 * pulse, '"Courier New", monospace');
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#FFD700';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4;
            var hyperReadyLabel = '⚡ ' + t('HYPER_READY') + ' [H] ⚡';
            ctx.strokeText(hyperReadyLabel, centerX, stripY - 12);
            ctx.fillText(hyperReadyLabel, centerX, stripY - 12);
            ctx.restore();
        }
    }
    // HYPER COOLDOWN: Slim grey bar filling up
    else if (player.hyperCooldown > 0) {
        if (hyperUI && !hyperUI.SHOW_TEXT_WHEN_IDLE) {
            const barW = hyperUI.IDLE_BAR_WIDTH || 160;
            const barH = hyperUI.IDLE_BAR_HEIGHT || 4;
            const barY = stripY - barH - 8;
            const cooldownMax = Balance.HYPER.COOLDOWN || 10;
            const fillRatio = 1 - (player.hyperCooldown / cooldownMax);
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#666';
            ctx.fillRect(centerX - barW / 2, barY, barW * Math.min(1, fillRatio), barH);
            ctx.restore();
        } else {
            // Legacy text mode (kill-switch)
            ctx.save();
            ctx.font = '14px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(150, 150, 150, 0.7)';
            ctx.fillText(`HYPER: ${player.hyperCooldown.toFixed(1)}s`, centerX, stripY - 12);
            ctx.restore();
        }
    }
}

// v4.60: Draw GODCHAIN timer bar (same position as HYPER bar, shows when GODCHAIN active)
function drawGodchainUI(ctx) {
    if (!player || !player._godchainActive) return;
    const centerX = gameWidth / 2;
    const timeLeft = player.godchainTimer || 0;
    const duration = G.Balance?.GODCHAIN?.DURATION || 10;
    const pulse = Math.sin(totalTime * 8) * 0.08 + 0.92;

    ctx.save();

    // v5.4.0: Position below message strip (Row 3)
    const stripY = window._stripTopY || 67;
    const barWidth = 200;
    const barHeight = 18;
    const barX = centerX - barWidth / 2;
    const barY = stripY + 30; // Below message strip (~28px height + 2px gap)

    // Bar background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

    // Time fill (red-orange, depleting)
    const fillRatio = timeLeft / duration;
    const fillColor = fillRatio < 0.3 ? '#ff2222' : '#ff4400';
    ctx.fillStyle = fillColor;
    ctx.fillRect(barX, barY, barWidth * Math.min(1, fillRatio), barHeight);

    // Border
    ctx.strokeStyle = fillRatio < 0.3 ? '#ff6666' : '#ff8800';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // GODCHAIN text + timer inside bar
    ctx.font = G.ColorUtils.font('bold', 13, '"Courier New", monospace');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    const label = 'GODCHAIN  ' + timeLeft.toFixed(1) + 's';
    ctx.strokeText(label, centerX, barY + barHeight / 2);
    ctx.fillText(label, centerX, barY + barHeight / 2);

    ctx.restore();
}


function drawArcadeComboHUD(ctx) {
    if (!G.ArcadeModifiers || !G.ArcadeModifiers.isArcadeMode()) return;
    const rs = G.RunState;
    const combo = rs.comboCount;
    const decayAnim = rs.comboDecayAnim;
    if (combo <= 0 && decayAnim <= 0) return;

    ctx.save();
    const comboCfg = Balance.ARCADE.COMBO;
    const colors = comboCfg.COLORS;

    let alpha = 1;
    let displayCombo = combo;
    if (combo <= 0 && decayAnim > 0) {
        alpha = decayAnim / comboCfg.DECAY_ANIM;
        displayCombo = rs.bestCombo; // Show last combo during fade
    }

    // Color based on combo level
    let color;
    if (displayCombo >= colors.ORANGE) color = '#ff3333';
    else if (displayCombo >= colors.YELLOW) color = '#ff8800';
    else if (displayCombo >= colors.WHITE) color = '#ffcc00';
    else color = '#ffffff';

    // Position: right side, below score
    const x = gameWidth - 12;
    const y = 32;

    // Pulse effect
    const pulse = combo > 0 ? 1 + Math.sin(totalTime * 10) * 0.04 * Math.min(combo / 20, 1) : 1;
    const fontSize = Math.min(22, 14 + displayCombo * 0.1);

    ctx.globalAlpha = alpha;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.font = G.ColorUtils.font('bold', Math.round(fontSize * pulse), '"Courier New", monospace');
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    const text = '\u00D7' + displayCombo;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);

    // Small "COMBO" label
    if (displayCombo >= 5) {
        ctx.font = G.ColorUtils.font('bold', 9, '"Courier New", monospace');
        ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.6) + ')';
        ctx.fillText('COMBO', x, y + fontSize * pulse + 2);
    }

    ctx.restore();
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
    const hitR = (player.stats.hitboxSize || 42) + 15;
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
                applyHitStop('PLAYER_HIT', false); // Contact hit slowmo
                triggerScreenFlash('PLAYER_HIT');
                G.EffectsRenderer.triggerDamageVignette();
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
        // v4.40: clamp drop to per-cycle MAX_Y_RATIO (enemies can't descend past limit)
        const cycle = window.marketCycle || 1;
        const ratios = Balance.FORMATION?.MAX_Y_RATIO_BY_CYCLE;
        const maxYRatio = ratios ? (ratios[Math.min(cycle - 1, ratios.length - 1)] || 0.55) : (Balance.FORMATION?.MAX_Y_RATIO || 0.55);
        const maxBaseY = gameHeight * maxYRatio;
        for (let i = 0, len = enemies.length; i < len; i++) {
            enemies[i].baseY = Math.min(enemies[i].baseY + dropAmount, maxBaseY);
        }
    }
}

function startDeathSequence() {
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

function executeDeath() {
    // Arcade: Last Stand — survive lethal hit once per cycle
    const _abDeath = G.RunState && G.RunState.arcadeBonuses;
    if (_abDeath && _abDeath.lastStandAvailable && lives <= 1) {
        _abDeath.lastStandAvailable = false;
        player.hp = 1;
        player.invulnTimer = Balance.TIMING.INVULNERABILITY * 1.5;
        showGameInfo("LAST STAND!");
        G.MemeEngine.queueMeme('DEATH', 'LAST STAND ACTIVATED!', 'NGMI');
        audioSys.play('hyperReady');
        triggerScreenFlash('STREAK_50');
        // Reset combo on hit
        G.RunState.comboCount = 0;
        G.RunState.comboTimer = 0;
        G.RunState.comboMult = 1.0;
        G.RunState.comboDecayAnim = Balance.ARCADE.COMBO.DECAY_ANIM;
        return;
    }

    lives--;
    setUI('livesText', lives);

    // Arcade: reset combo on death
    if (G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode()) {
        G.RunState.comboCount = 0;
        G.RunState.comboTimer = 0;
        G.RunState.comboMult = 1.0;
        G.RunState.comboDecayAnim = Balance.ARCADE.COMBO.DECAY_ANIM;
    }

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
    if (G.WeatherController) {
        G.WeatherController.draw(ctx, { isBearMarket, level, bossActive: boss && boss.active });
    }

    // v4.43: Paper tear void (drawn on canvas, visible through transparent intro-screen DOM)
    if (gameState === 'INTRO' && G.PaperTear && G.PaperTear.isActive()) {
        G.PaperTear.draw(ctx);
    }

    // v4.35: Title animation particles (drawn on canvas through transparent intro-screen)
    if (gameState === 'INTRO' && G.TitleAnimator && G.TitleAnimator.isActive()) {
        G.TitleAnimator.draw(ctx);
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

    if (gameState === 'PLAY' || gameState === 'WARMUP' || gameState === 'PAUSE' || gameState === 'GAMEOVER' || gameState === 'INTERMISSION') {
        player.draw(ctx);

        // v4.56: Batched enemy glow pass (additive)
        const _glowCfg = G.Balance?.GLOW;
        if (_glowCfg?.ENABLED && _glowCfg?.ENEMY?.ENABLED) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < enemies.length; i++) {
                const e = enemies[i];
                if (!e || e.x < -80 || e.x > gameWidth + 80 || e.y < -80 || e.y > gameHeight + 80) continue;
                e.drawGlow(ctx);
            }
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
        if (_glowCfg?.ENABLED && _glowCfg?.BULLET?.ENABLED) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < bullets.length; i++) {
                const b = bullets[i];
                const gm = (b._elemLaser && !b.special) ? 130 : 20;
                if (b.x < -gm || b.x > gameWidth + gm || b.y < -gm || b.y > gameHeight + gm) continue;
                b.drawGlow(ctx);
            }
            ctx.restore();
        }

        // Bullet bodies with culling (for loop)
        for (let i = 0; i < bullets.length; i++) {
            const b = bullets[i];
            // Off-screen culling (X and Y)
            const margin = (b._elemLaser && !b.special) ? 130 : 20;
            if (b.x > -margin && b.x < gameWidth + margin && b.y > -margin && b.y < gameHeight + margin) b.draw(ctx);
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
        drawEvolutionItem(ctx);

        // Floating texts (delegated to FloatingTextManager)
        G.FloatingTextManager.draw(ctx, gameWidth);

        // Perk icons (delegated to PerkIconManager)
        G.PerkIconManager.draw(ctx, gameWidth);

        // Typed messages (GAME_INFO, DANGER, VICTORY) - distinct visual styles
        drawTypedMessages(ctx);

        // HYPER MODE UI (timer when active, "READY" when available)
        drawHyperUI(ctx);
        drawGodchainUI(ctx);

        // Arcade combo HUD
        drawArcadeComboHUD(ctx);

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
        G.EffectsRenderer.drawDamageVignette(ctx);
        // v4.4: Low-HP danger vignette
        G.EffectsRenderer.drawLowHPVignette(ctx, lives, totalTime);
        // v4.45: GODCHAIN screen border glow
        const gcActive = player && player._godchainActive;
        G.EffectsRenderer.drawGodchainVignette(ctx, gcActive, totalTime);
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
                weaponLevel: player.weaponLevel ?? 1,
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
        common: '#8899bb',
        uncommon: '#00ff66',
        rare: '#00aaff',
        epic: '#bb44ff'
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
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = rarityColor;
    ctx.fillText('PERK ACQUIRED', centerX, cardY + 22);

    // Icon + Name
    ctx.font = 'bold 30px "Courier New", monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${perkPauseData.icon} ${perkPauseData.name}`, centerX, cardY + 60);

    // Description
    ctx.font = '16px "Courier New", monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText(perkPauseData.desc, centerX, cardY + 90);

    // Rarity badge
    ctx.font = 'bold 14px "Courier New", monospace';
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
    ctx.fillStyle = '#ffaa00';
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

// --- FLOATING TEXT (delegated to FloatingTextManager) ---
function addText(text, x, y, c, size) { G.FloatingTextManager.addText(text, x, y, c, size); }
function createFloatingScore(scoreValue, x, y) { G.FloatingTextManager.createFloatingScore(scoreValue, x, y, killStreak); }
function updateFloatingTexts(dt) { G.FloatingTextManager.update(dt); }

// --- PERK ICONS (delegated to PerkIconManager) ---
function addPerkIcon(perk) { if (player) G.PerkIconManager.addIcon(perk, player.x, player.y); }
function updatePerkIcons(dt) { G.PerkIconManager.update(dt); }
function drawPerkIcons(ctx) { G.PerkIconManager.draw(ctx, gameWidth); }

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

function createEnemyDeathExplosion(x, y, color, symbol, shape, elemType) {
    if (G.ParticleSystem) G.ParticleSystem.createEnemyDeathExplosion(x, y, color, symbol, shape, elemType);
}

function createBossDeathExplosion(x, y) {
    if (G.ParticleSystem) G.ParticleSystem.createBossDeathExplosion(x, y);
}

function createScoreParticles(x, y, color) {
    if (G.ParticleSystem) G.ParticleSystem.createScoreParticles(x, y, color);
}

// v5.11: Evolution item — flies from boss death position to player with curved path
function updateEvolutionItem(dt) {
    const evo = window._evolutionItem;
    if (!evo || !evo.active) return;

    evo.timer += dt * 1000; // Convert to ms
    const t = Math.min(1, evo.timer / evo.duration);

    // Ease-in-out cubic for smooth flight
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // Update target to current player position
    if (player) {
        evo.targetX = player.x;
        evo.targetY = player.y;
    }

    // Curved path: slight arc above the straight line
    const arcHeight = -80; // Upward arc
    const arcT = Math.sin(t * Math.PI); // Peak at t=0.5
    evo.x = evo.startX + (evo.targetX - evo.startX) * ease;
    evo.y = evo.startY + (evo.targetY - evo.startY) * ease + arcHeight * arcT;

    // Trail particles
    if (G.ParticleSystem && t > 0.05) {
        G.ParticleSystem.createEvolutionItemTrail(evo.x, evo.y);
    }

    // Reached player
    if (t >= 1) {
        evo.active = false;
        window._evolutionItem = null;
        if (player && player.collectEvolution) {
            player.collectEvolution();
        }
    }
}

// v5.11: Draw evolution item (called from draw loop)
function drawEvolutionItem(ctx) {
    const evo = window._evolutionItem;
    if (!evo || !evo.active) return;

    const CU = G.ColorUtils;
    const t = evo.timer / evo.duration;
    const pulse = Math.sin(t * 20) * 0.2 + 0.8;
    const size = evo.size || 28;

    ctx.save();
    ctx.translate(evo.x, evo.y);

    // Outer glow (additive)
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = CU ? CU.rgba(0, 240, 255, 0.3 * pulse) : 'rgba(0,240,255,0.24)';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Core diamond shape
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = evo.glowColor || '#00f0ff';
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.5);
    ctx.lineTo(size * 0.35, 0);
    ctx.lineTo(0, size * 0.5);
    ctx.lineTo(-size * 0.35, 0);
    ctx.closePath();
    ctx.fill();

    // Inner bright core
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = pulse * 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Arrow symbol (⬆) inside
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = pulse * 0.7;
    ctx.font = `bold ${Math.floor(size * 0.4)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⬆', 0, 0);

    ctx.restore();
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

// Arcade: adjust lives from modifier choice
window.Game.adjustLives = function(delta) {
    lives = Math.max(1, lives + delta);
    setUI('livesText', lives);
    updateLivesUI();
};

// Expose proximity meter gain for boss phase transitions
window.Game.addProximityMeter = function(gain) {
    // v4.61: Skip accumulation during HYPER
    if (player && player.isHyperActive && player.isHyperActive()) return;
    lastGrazeTime = totalTime;
    grazeMeter = Math.min(100, grazeMeter + gain);
    const Balance = window.Game.Balance;
    if (grazeMeter >= Balance.HYPER.METER_THRESHOLD && player && player.hyperCooldown <= 0) {
        if (Balance.HYPER.AUTO_ACTIVATE && player.canActivateHyper && player.canActivateHyper(grazeMeter)) {
            player.activateHyper();
            grazeMeter = 0;
            updateGrazeUI();
            triggerScreenFlash('HYPER_ACTIVATE');
            return;
        }
    }
    updateGrazeUI();
};

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

    // Update effects via EffectsRenderer (hit stop, screen flash, score pulse)
    if (G.EffectsRenderer) {
        const effectResult = G.EffectsRenderer.update(realDt);
        dt = effectResult.dt; // May be modified by hit stop
    }

    // Remove old "delayed game over" check since executeDeath handles it
    // if (player && player.hp <= 0 && hitStopTimer <= 0 && gameState === 'PLAY') { ... }

    // v4.35: Update title animation timeline + cooldown
    if (_introActionCooldown > 0) _introActionCooldown -= dt;
    if (gameState === 'INTRO' && G.TitleAnimator && G.TitleAnimator.isActive()) {
        G.TitleAnimator.update(dt);
    }

    // v4.43: Paper tear animation + DOM title opacity sync
    if (gameState === 'INTRO' && G.PaperTear) {
        var tp = G.PaperTear.update(dt);
        if (G.PaperTear.isActive() || G.PaperTear.isAnimating()) {
            var titleEl = document.getElementById('intro-title');
            if (titleEl && introState === 'SPLASH') titleEl.style.opacity = tp;
        }
    }

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
        ws.weaponLevel = player.weaponLevel ?? 1;
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
    if (G.WeatherController) G.WeatherController.update(dt);

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

    // Save high score (mode-specific v4.50)
    if (score > highScore) {
        highScore = Math.floor(score);
        localStorage.setItem(highScoreKey(), highScore);
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
        localStorage.setItem(highScoreKey(), highScore);
        // Update badge score display (v4.8)
        const badgeScore = document.getElementById('badge-score-value');
        if (badgeScore) badgeScore.innerText = highScore.toLocaleString();
        submitToGameCenter(highScore); // Game Center hook
    }
    setGameState('GAMEOVER');
    setStyle('gameover-screen', 'display', 'flex');
    setUI('finalScore', Math.floor(score));
    if (ui.gameoverMeme) ui.gameoverMeme.innerText = getRandomMeme();

    // Arcade stats & records (v4.50)
    const isStory = G.CampaignState && G.CampaignState.isEnabled();
    const statsRow = document.getElementById('arcade-stats-row');
    const bestBadge = document.getElementById('new-best-badge');
    if (!isStory) {
        if (statsRow) {
            statsRow.style.display = 'flex';
            setUI('arcadeCycleVal', marketCycle);
            setUI('arcadeLevelVal', level);
            setUI('arcadeWaveVal', waveMgr.wave);
        }
        // Arcade combo + modifier stats
        const comboRow = document.getElementById('arcade-combo-row');
        if (comboRow) {
            comboRow.style.display = 'flex';
            setUI('arcadeBestCombo', G.RunState.bestCombo || 0);
            setUI('arcadeModCount', G.RunState.arcadeModifierPicks || 0);
        }
        const result = checkArcadeRecords();
        if (bestBadge) {
            bestBadge.style.display = result.newBest ? 'inline-block' : 'none';
            bestBadge.innerText = t('NEW_BEST');
        }
    } else {
        if (statsRow) statsRow.style.display = 'none';
        if (bestBadge) bestBadge.style.display = 'none';
        const comboRow2 = document.getElementById('arcade-combo-row');
        if (comboRow2) comboRow2.style.display = 'none';
    }

    // Story: Game over dialogue
    if (G.Story) {
        G.Story.onGameOver();
    }
    if (ui.kills) ui.kills.innerText = killCount;
    if (ui.streak) ui.streak.innerText = bestStreak;
    setStyle('pause-btn', 'display', 'none');
    audioSys.play('explosion');

    // v5.17: Leaderboard submit (async, non-blocking)
    const isStoryMode = G.CampaignState && G.CampaignState.isEnabled();
    if (isStoryMode && hasNickname()) {
        const shipKey = SHIP_KEYS[selectedShipIndex] || 'BTC';
        G.Leaderboard.renderGameoverRank(
            Math.floor(score), killCount, marketCycle,
            waveMgr.wave, shipKey, !!window.isBearMarket
        );
    }
}

// v5.0.8: Snapshot player power state for progression tracking
function _snapPlayerState() {
    const WE = G.Balance.WEAPON_EVOLUTION;
    const BP = G.Balance.BULLET_PIERCE;
    const rs = G.RunState;
    let effLv = player.weaponLevel;
    if (player.hyperActive) effLv = Math.min(5, effLv + (WE?.HYPER_LEVEL_BOOST || 2));
    const pierceHP = BP ? BP.BASE_HP + Math.floor(effLv * (BP.LEVEL_BONUS || 0.5)) : 0;
    return {
        weaponLevel: player.weaponLevel,
        special: player.special,
        perkLevel: rs ? (rs.perkLevel || 0) : 0,
        shieldActive: !!player.shieldActive,
        hyperActive: !!player.hyperActive,
        effectiveLevel: effLv,
        pierceHP: pierceHP
    };
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
                // v5.10.3: Don't collect PERK during cooldown — let it float
                if (p.type === 'PERK' && perkCooldown > 0) continue;

                // v5.0.8: Snapshot BEFORE pickup
                const before = G.Debug ? _snapPlayerState() : null;

                // v4.61: PERK drop — apply elemental perk via PerkManager
                if (p.type === 'PERK') {
                    // v5.13: Determine element type from current perkLevel (before increment)
                    const plBefore = G.RunState ? (G.RunState.perkLevel || 0) : 0;
                    const elemTypes = ['FIRE', 'LASER', 'ELECTRIC'];
                    const elemType = plBefore < 3 ? elemTypes[plBefore] : 'GODCHAIN';

                    // v5.13: Elemental pickup burst (replaces generic effect)
                    if (G.ParticleSystem?.createElementalPickupBurst) {
                        G.ParticleSystem.createElementalPickupBurst(p.x, p.y, elemType);
                    } else {
                        createPowerUpPickupEffect(p.x, p.y, p.config.color);
                    }

                    // v5.13: Screen flash with elemental color
                    const elemColor = G.Balance?.ELEMENTAL_VFX?.PICKUP_SURGE?.COLORS?.[elemType];
                    if (elemColor && G.Balance?.JUICE?.FLASH?.PERK_PICKUP) {
                        G.Balance.JUICE.FLASH.PERK_PICKUP.color = elemColor.hex;
                    }
                    if (G.triggerScreenFlash) G.triggerScreenFlash('PERK_PICKUP');

                    applyRandomPerk();

                    // v5.13: Ship pulse + GODCHAIN apotheosis check
                    if (player.triggerElementalPulse) player.triggerElementalPulse(elemType);
                    const plAfter = G.RunState ? (G.RunState.perkLevel || 0) : 0;
                    if (plAfter >= 3 && plBefore < 3) {
                        // GODCHAIN just triggered!
                        if (G.ParticleSystem?.createGodchainApotheosis) {
                            G.ParticleSystem.createGodchainApotheosis(player.x, player.y);
                        }
                        if (G.triggerScreenFlash) G.triggerScreenFlash('GODCHAIN_ACTIVATE');
                    }

                    const meme = POWERUP_MEMES[p.type] || 'PERK!';
                    showPickup(meme);
                    if (G.Debug) {
                        const after = _snapPlayerState();
                        G.Debug.trackProgression(p.type, before, after);
                        G.Debug.trackPowerUpCollected(p.type, p.isPityDrop || false);
                    }
                    powerUps.splice(i, 1);
                    emitEvent('powerup_pickup', { type: p.type, category: 'perk' });
                    continue;
                }

                // Pickup effect for non-PERK power-ups
                createPowerUpPickupEffect(p.x, p.y, p.config.color);

                // WEAPON EVOLUTION v3.0: Use applyPowerUp for new types
                const evolutionTypes = ['UPGRADE', 'HOMING', 'PIERCE', 'MISSILE', 'SHIELD', 'SPEED'];
                if (evolutionTypes.includes(p.type) && player.applyPowerUp) {
                    player.applyPowerUp(p.type);
                } else {
                    player.upgrade(p.type);
                }

                // Crypto-themed powerup feedback via pickup toast (v5.4.0)
                const meme = POWERUP_MEMES[p.type] || p.type;
                showPickup(meme);
                // Analytics: Track power-up + progression
                if (G.Debug) {
                    const after = _snapPlayerState();
                    G.Debug.trackProgression(p.type, before, after);
                    G.Debug.trackPowerUpCollected(p.type, p.isPityDrop || false);
                }
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
