// Main Entry Point (Namespace Pattern)

// v5.24: Global error handler — catches silent crashes (especially useful on Android PWA)
window.onerror = function(msg, url, line, col, err) {
    const info = `[GAME ERROR] ${msg} at ${url}:${line}:${col}`;
    console.error(info, err);
    window._lastError = { msg, url, line, col, err, time: Date.now() };
    if (window.Game?.Debug?.flushSessionLog) window.Game.Debug.flushSessionLog();
};
window.onunhandledrejection = function(e) {
    console.error('[GAME] Unhandled promise rejection:', e.reason);
    window._lastError = { msg: String(e.reason), time: Date.now() };
    if (window.Game?.Debug?.flushSessionLog) window.Game.Debug.flushSessionLog();
};
window.addEventListener('beforeunload', function() {
    if (window.Game?.Debug?.flushSessionLog) window.Game.Debug.flushSessionLog();
});

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

// v5.22.1: One-time score reset (leaderboard fresh start)
(function() {
    if (!localStorage.getItem('fiat_scores_reset_v2')) {
        localStorage.removeItem('fiat_highscore_story');
        localStorage.removeItem('fiat_highscore_arcade');
        localStorage.removeItem('fiat_arcade_records');
        localStorage.setItem('fiat_scores_reset_v2', '1');
    }
})();

// --- GLOBAL STATE ---
let canvas, ctx, gameContainer, saSentinel;
let gameWidth = window.Game.Balance.GAME.BASE_WIDTH;
let gameHeight = window.Game.Balance.GAME.BASE_HEIGHT;
// v7.0: G.GameState is the SINGLE source of truth for game state.
// `gameState` is a local read-only alias kept in sync via onChange listener.
let gameState = 'VIDEO';
function setGameState(newState) {
    if (!G.GameState) { gameState = newState; return true; }
    const ok = G.GameState.transition(newState);
    if (ok) gameState = newState;
    return ok;
}
G._setGameState = setGameState; // debug access
if (G.GameState) {
    G.GameState.forceSet('VIDEO');
    G.GameState.onChange((state) => { gameState = state; });
}
let userLang = navigator.language || navigator.userLanguage;
let currentLang = userLang.startsWith('it') ? 'IT' : 'EN';

// v7.13.0: Rendering via DrawPipeline (layers registered in registerAll)
G._currentLang = currentLang; // v4.11.0: Expose for StoryScreen localization
let isBearMarket = false; // 🐻
window.isBearMarket = isBearMarket; // Expose globally for WaveManager
G._gameWidth = gameWidth; // v4.0.1: Expose for Bullet horizontal bounds check

// PWA install prompt handled by UIManager.js

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
G._playerBullets = bullets; // v5.32: Expose for Evader detection
// v5.32: Danger zone system for Bomber behavior
let dangerZones = [];
let bomberBombs = [];
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

// v7.0: Safe localStorage helpers (QuotaExceededError / SecurityError protection)
function safeGetItem(key, fallback) {
    try { return localStorage.getItem(key); }
    catch { return fallback !== undefined ? fallback : null; }
}
function safeSetItem(key, value) {
    try { localStorage.setItem(key, value); return true; }
    catch { return false; }
}
function safeGetJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
    catch { return fallback; }
}

// HIGH SCORE, ARCADE RECORDS, WEAPON PROGRESSION
// Extracted to src/managers/ScoreManager.js
let highScore = G.ScoreManager ? G.ScoreManager.loadHighScoreForMode() : 0;
// Note: High score UI update happens in updateModeIndicator() when intro screen is shown

// v7.0: Nickname, DeviceID, Nonce, Pending Score, Leaderboard API
// → Extracted to src/managers/LeaderboardClient.js
// Local aliases for backward compat within main.js
const getNickname = G.getNickname;
const hasNickname = G.hasNickname;
const showNicknamePrompt = G.showNicknamePrompt;
const flushPendingScore = G.flushPendingScore;
const savePendingScore = G.savePendingScore;

// v7.0: Leaderboard system extracted to src/managers/LeaderboardClient.js

// Pre-allocated to avoid per-call GC allocations
const _playerState = {
    weaponLevel: 1,
    hasSpecial: false,
    hasShield: false,
    hasSpeed: false,
    perkLevel: 0,
    isHyper: false,
    isGodchain: false,
    perkOnCooldown: false
};
function buildPlayerState() {
    if (!player) {
        _playerState.weaponLevel = 1;
        _playerState.hasSpecial = false;
        _playerState.hasShield = false;
        _playerState.hasSpeed = false;
        _playerState.isHyper = false;
        _playerState.isGodchain = false;
        _playerState.perkOnCooldown = false;
        return _playerState;
    }
    _playerState.weaponLevel = player.weaponLevel ?? 1;
    _playerState.hasSpecial = !!player.special;
    _playerState.hasShield = !!player.shieldActive;
    _playerState.hasSpeed = player.shipPowerUp === 'SPEED';
    _playerState.perkLevel = G.RunState ? G.RunState.perkLevel : 0;
    _playerState.isHyper = !!player.hyperActive;
    _playerState.isGodchain = !!player._godchainActive;
    _playerState.perkOnCooldown = perkCooldown > 0;
    return _playerState;
}

// v7.0: CollisionSystem callbacks extracted to src/core/GameplayCallbacks.js
// initCollisionSystem() now delegates to G.GameplayCallbacks.init(deps)
function initCollisionSystem() {
    if (!G.GameplayCallbacks) return;
    G.GameplayCallbacks.init({
        // Entity refs
        player: player,
        getBullets: () => bullets,
        getEnemyBullets: () => enemyBullets,
        getEnemies: () => enemies,
        getBoss: () => boss,
        getMiniBoss: () => miniBoss,
        // State getters
        getScore: () => score,
        getLives: () => lives,
        getShake: () => shake,
        getGrazeMeter: () => grazeMeter,
        getGrazeCount: () => grazeCount,
        getGrazeMultiplier: () => grazeMultiplier,
        getTotalTime: () => totalTime,
        getLastGrazeSoundTime: () => lastGrazeSoundTime,
        getBulletCancelStreak: () => bulletCancelStreak,
        getBulletCancelTimer: () => bulletCancelTimer,
        getKillStreak: () => killStreak,
        getKillStreakMult: () => killStreakMult,
        getLastKillTime: () => lastKillTime,
        getStreak: () => streak,
        getBestStreak: () => bestStreak,
        getMarketCycle: () => marketCycle,
        getLevel: () => level,
        getKillCount: () => killCount,
        getIsBearMarket: () => isBearMarket,
        getFrameKills: () => _frameKills,
        getLastGrazeTime: () => lastGrazeTime,
        getMiniBossThisWave: () => miniBossThisWave,
        getLastMiniBossSpawnTime: () => lastMiniBossSpawnTime,
        getFiatKillCounter: () => fiatKillCounter,
        getDeathAlreadyTracked: () => deathAlreadyTracked,
        getBossJustDefeated: () => bossJustDefeated,
        getBossWarningTimer: () => bossWarningTimer,
        // State setters
        setScore: (v) => { score = v; },
        setShake: (v) => { shake = v; },
        setGrazeMeter: (v) => { grazeMeter = v; },
        setGrazeCount: (v) => { grazeCount = v; },
        setGrazeMultiplier: (v) => { grazeMultiplier = v; },
        setBulletCancelStreak: (v) => { bulletCancelStreak = v; },
        setBulletCancelTimer: (v) => { bulletCancelTimer = v; },
        setKillStreak: (v) => { killStreak = v; },
        setKillStreakMult: (v) => { killStreakMult = v; },
        setLastKillTime: (v) => { lastKillTime = v; },
        setStreak: (v) => { streak = v; },
        setBestStreak: (v) => { bestStreak = v; },
        setMarketCycle: (v) => { marketCycle = v; runState.marketCycle = v; window.marketCycle = v; },
        setKillCount: (v) => { killCount = v; },
        setFrameKills: (v) => { _frameKills = v; },
        setLastGrazeTime: (v) => { lastGrazeTime = v; },
        setLastGrazeSoundTime: (v) => { lastGrazeSoundTime = v; },
        setMiniBossThisWave: (v) => { miniBossThisWave = v; },
        setLastMiniBossSpawnTime: (v) => { lastMiniBossSpawnTime = v; },
        setDeathAlreadyTracked: (v) => { deathAlreadyTracked = v; },
        setBossJustDefeated: (v) => { bossJustDefeated = v; },
        setMiniBoss: (v) => { miniBoss = v; },
        setBoss: (v) => { boss = v; window.boss = v; },
        setLives: (v) => { lives = v; },
        resetFiatKillCounter: () => { fiatKillCounter = { '¥': 0, '₽': 0, '₹': 0, '€': 0, '£': 0, '₣': 0, '₺': 0, '$': 0, '元': 0, 'Ⓒ': 0 }; },
        addPowerUp: (pu) => { powerUps.push(pu); },
        // Function refs
        t: t,
        updateScore: updateScore,
        updateLivesUI: updateLivesUI,
        startDeathSequence: startDeathSequence,
        applyHitStop: applyHitStop,
        triggerScreenFlash: triggerScreenFlash,
        emitEvent: emitEvent,
        createGrazeSpark: createGrazeSpark,
        updateGrazeUI: updateGrazeUI,
        showDanger: showDanger,
        showVictory: showVictory,
        showGameInfo: showGameInfo,
        createBulletSpark: createBulletSpark,
        createExplosion: createExplosion,
        createEnemyDeathExplosion: createEnemyDeathExplosion,
        createBossDeathExplosion: createBossDeathExplosion,
        triggerScoreStreakColor: triggerScoreStreakColor,
        updateKillCounter: updateKillCounter,
        checkStreakMeme: checkStreakMeme,
        clearBattlefield: clearBattlefield,
        spawnMiniBoss: spawnMiniBoss,
        startIntermission: startIntermission,
        showStoryScreen: showStoryScreen,
        showGameCompletion: showGameCompletion,
        showCampaignVictory: showCampaignVictory,
        restoreGameUI: restoreGameUI,
        buildPlayerState: buildPlayerState,
        getUnlockedWeapons: function () { return G.ScoreManager ? G.ScoreManager.getUnlockedWeapons() : ['WIDE', 'NARROW', 'FIRE']; },
        bossDeathTimeout: bossDeathTimeout,
        clearBossDeathTimeouts: clearBossDeathTimeouts,
        shouldShowStory: shouldShowStory,
    });
}

let boss = null;
let lives = window.Game.Balance.PLAYER.START_LIVES;
let shake = 0, gridDir = 1, gridSpeed = 25, intermissionTimer = 0;
// Screen transition moved to TransitionManager.js
let currentShipIdx = 0;
let lastWavePattern = 'RECT';
// warmupShown moved to TutorialManager
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

// --- v5.27: START COUNTDOWN SYSTEM ---
let startCountdownTimer = 0;
let startCountdownGoTimer = 0;
let startCountdownActive = false;
// v7.11: cinematic ship entry before countdown
const SHIP_ENTRY_DURATION = 1.1;
let shipEntryActive = false;
let shipEntryTimer = 0;

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

// Score pulse state moved to ScoreManager.js

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
    // v5.14: Reset score pulse state (delegated to ScoreManager)
    if (G.ScoreManager) G.ScoreManager.resetPulseState();
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
G.t = t; // v7.0: Expose for extracted modules (LeaderboardClient, etc.)

// v2.24.6: Global bullet cap check (prevents runaway patterns like BOJ mini-boss)
function canSpawnEnemyBullet() {
    const cap = Balance.PATTERNS?.GLOBAL_BULLET_CAP || 150;
    return enemyBullets.length < cap;
}

// Score functions extracted to ScoreManager.js
function updateScore(newScore, scoreGain) {
    if (G.ScoreManager) G.ScoreManager.updateScore(newScore, scoreGain);
}
function triggerScorePulse() {
    if (G.EffectsRenderer) G.EffectsRenderer.triggerScorePulse();
}
function pushScoreTicker(text) {
    if (G.ScoreManager) G.ScoreManager.pushScoreTicker(text);
}
function updateKillCounter() {
    if (G.ScoreManager) G.ScoreManager.updateKillCounter();
}
function checkStreakMeme() {
    if (G.ScoreManager) G.ScoreManager.checkStreakMeme();
}
function checkWeaponUnlocks(cycle) {
    if (G.ScoreManager) G.ScoreManager.checkWeaponUnlocks(cycle);
}
function triggerScoreStreakColor(streakLevel) {
    if (G.ScoreManager) G.ScoreManager.triggerScoreStreakColor(streakLevel);
}
// POWERUP_MEMES moved to MemeEngine.js (duplicate removed)

// Meme functions delegate to MemeEngine singleton
function getRandomMeme() { return G.MemeEngine ? G.MemeEngine.getRandomMeme() : ''; }
function getFiatDeathMeme() { return G.MemeEngine ? G.MemeEngine.getEnemyDeathMeme() : ''; }
function getPowellMeme() { return G.MemeEngine ? G.MemeEngine.getPowellMeme() : ''; }
function getBossMeme(bossType) { return G.MemeEngine ? G.MemeEngine.getBossMeme(bossType) : ''; }

// DOM cache helper functions
var _domCache = {};
function _cachedEl(id) { return _domCache[id] || (_domCache[id] = document.getElementById(id) || ui[id]); }
function setStyle(id, prop, val) { var el = _cachedEl(id); if (el) el.style[prop] = val; }
function setUI(id, val) { var el = _cachedEl(id); if (el) el.innerText = val; }
function emitEvent(name, payload) { if (events && events.emit) events.emit(name, payload); }
function _countActive(arr) { var c = 0; for (var i = 0, len = arr.length; i < len; i++) { if (arr[i] && arr[i].life > 0) c++; } return c; }

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

// v7.0: Intro screen extracted to src/ui/IntroScreen.js
// Local aliases for backward compatibility within main.js
const SHIP_KEYS = G.IntroScreen ? G.IntroScreen.SHIP_KEYS : ['BTC', 'ETH', 'SOL'];
const SHIP_DISPLAY = G.IntroScreen ? G.IntroScreen.SHIP_DISPLAY : {};

// initIntroShip, initSplashShip → G.IntroScreen

// _cleanupAnimClasses, state transitions, ship UI, animateIntroShip → G.IntroScreen


// Helper to lighten a hex color (uses ColorUtils)
function lightenColor(hex, percent) {
    return window.Game.ColorUtils.lightenPercent(hex, percent);
}

// --- INITIALIZATION ---
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d', { alpha: false });
    gameContainer = document.getElementById('game-container');
    saSentinel = document.getElementById('sa-sentinel');

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
            window.selectShip(type);
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
    // v7.10.1: music ON by default (new Kondo soundtrack replaces the old aggressive one)
    const musicMuted = musicPref === null ? false : musicPref === '1';
    const sfxMuted = localStorage.getItem('fiat_sfx_muted') === '1';
    audioSys.applyMuteStates(musicMuted, sfxMuted);
    updateMusicUI(musicMuted);
    updateSfxUI(sfxMuted);

    if (ui.perkSkip) {
        ui.perkSkip.addEventListener('click', () => closePerkChoice());
    }
    if (events && events.on) {
        events.on('game:intermission-start', () => closePerkChoice());
        events.on('enemy:killed', (data) => {
            // v7.13.0: Subtle kill feedback — micro shake + flash
            if (G.EffectsRenderer && !isBearMarket) {
                // v7.13.0: Tier-dependent shake (stronger enemies shake more)
                const symbol = data && data.symbol;
                const isStrong = symbol && G.Balance && G.Balance.isStrongTier && G.Balance.isStrongTier(symbol);
                const isMedium = symbol && G.Balance && G.Balance.isMediumTier && G.Balance.isMediumTier(symbol);
                const shakeIntensity = isStrong ? 5 : isMedium ? 3 : 2;
                G.EffectsRenderer.applyShake(shakeIntensity);
                G.EffectsRenderer.triggerScreenFlash('ENEMY_KILL');
            }
        });
        // v4.6: GODCHAIN events
        events.on('player:godchain-activated', () => {
            // v5.26: GODCHAIN now displayed in Combat HUD Bar (MessageSystem), keep screen flash
            if (G.triggerScreenFlash) G.triggerScreenFlash('HYPER_ACTIVATE');
        });
        events.on('player:godchain-deactivated', () => {
            // v5.26: Combat HUD Bar handles deactivation via _updateCombatHUD()
        });
        // v7.7.0: First-encounter lesson modals (replaces v7.6.0 status-strip hints)
        // Game pauses when a lesson modal opens. Each lesson shows once per device.
        // GODCHAIN_ACTIVATED fires AFTER the perk pickup that triggered it; the small
        // delay lets the perk lesson queue first so GODCHAIN comes second.
        events.on('player:godchain-activated', () => {
            if (G.LessonModal) setTimeout(() => G.LessonModal.show('lesson_godchain'), 400);
        });
        events.on('player:hyper-activated', () => {
            if (G.LessonModal) G.LessonModal.show('lesson_hyper');
        });
        events.on('player:powerup-pickup', (data) => {
            if (!G.LessonModal || !data) return;
            if (data.category === 'perk') {
                const key = data.elemType === 'LASER'    ? 'lesson_laser'
                          : data.elemType === 'ELECTRIC' ? 'lesson_electric'
                          : data.elemType === 'FIRE'     ? 'lesson_fire'
                          : null;
                if (key) G.LessonModal.show(key);
            } else if (data.category === 'special') {
                G.LessonModal.show('lesson_special');
            } else if (data.category === 'utility') {
                G.LessonModal.show('lesson_utility');
            }
        });
        // Harmonic Conductor bullet spawning
        events.on('system:harmonic-bullets', (data) => {
            if (!data || !data.bullets) return;
            var bds = data.bullets;
            for (var i = 0, len = bds.length; i < len; i++) {
                if (!canSpawnEnemyBullet()) break; // v2.24.6: Global cap
                var bd = bds[i];
                var bullet = G.Bullet.Pool.acquire(bd.x, bd.y, bd.vx, bd.vy, bd.color, bd.w || 8, bd.h || 8, false);
                bullet.beatSynced = true;
                bullet.shape = bd.shape || null;
                bullet.symbol = bd.symbol || null; // v7.9.5: currency glyph for symbol-bullet renderer
                // v4.56: enemy color for core tint. v7.2.2: forced null in V8 mode for legibility
                // (red ¥ bullets blended with red ¥ enemies — pure white reads better on Gradius scroll).
                // v7.11.1: V8 legibility rule (null ownerColor) is campaign-only; Arcade keeps colored bullets.
                const _isArcadeBul = G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode();
                bullet.ownerColor = (G.Balance?.V8_MODE?.ENABLED && !_isArcadeBul) ? null : (bd.ownerColor || null);
                if (bd.isBomb) bullet.isBomb = true; // v5.32: Bomber bomb flag
                if (bd.isWrit) {                    // v7.19: Auditor writ — debuff projectile
                    bullet.isWrit = true;
                    bullet.debuff = bd.debuff || null;
                }
                enemyBullets.push(bullet);
            }
        });
        // v5.32: Bomber drop — spawn slow bomb bullet
        events.on('enemy:bomber-drop', (data) => {
            if (!canSpawnEnemyBullet()) return;
            const bd = {
                x: data.x, y: data.y,
                vx: 0, vy: data.speed || 80,
                color: '#ff4400', w: 8, h: 8,
                shape: null, isBomb: true,
                _zoneDuration: data.zoneDuration || 2,
                _zoneRadius: data.zoneRadius || 40
            };
            const bomb = G.Bullet.Pool.acquire(bd.x, bd.y, bd.vx, bd.vy, bd.color, bd.w, bd.h, false);
            bomb.isBomb = true;
            bomb._zoneDuration = bd._zoneDuration;
            bomb._zoneRadius = bd._zoneRadius;
            enemyBullets.push(bomb);
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

        // v5.31: Throttle resize during gameplay to prevent layout thrashing
    let _resizeThrottle = null;
    window.addEventListener('resize', () => {
        if (G.GameState && (G.GameState.is('PLAY') || G.GameState.is('PAUSE'))) {
            if (!_resizeThrottle) {
                _resizeThrottle = setTimeout(() => { _resizeThrottle = null; resize(); }, 1000);
            }
        } else { resize(); }
    });
    // iOS needs orientationchange + delay for safe area recalculation
    window.addEventListener('orientationchange', () => {
        setTimeout(resize, 100);
        setTimeout(resize, 350);
    });

    // Initialize ParticleSystem with canvas dimensions
    if (G.ParticleSystem) G.ParticleSystem.init(gameWidth, gameHeight);

    // Initialize EffectsRenderer
    if (G.EffectsRenderer) G.EffectsRenderer.init(gameWidth, gameHeight);

    // v6.1: Initialize QualityManager (adaptive quality tiers)
    if (G.QualityManager) G.QualityManager.init();

    inputSys.init();

    // v7.14: Initialize ScoreManager
    if (G.ScoreManager) {
        G.ScoreManager.init({
            getScore: function () { return score; },
            setScore: function (v) { score = v; window.score = v; if (G.RunState) G.RunState.score = v; },
            getHighScore: function () { return highScore; },
            setHighScore: function (v) { highScore = v; },
            getKillCount: function () { return killCount; },
            getLevel: function () { return level; },
            getMarketCycle: function () { return marketCycle; },
            getStreak: function () { return streak; },
            getLastScoreMilestone: function () { return lastScoreMilestone; },
            setLastScoreMilestone: function (v) { lastScoreMilestone = v; },
            getReactiveStreakClass: function () { return _reactiveStreakClass; },
            setReactiveStreakClass: function (v) { _reactiveStreakClass = v; },
            setReactiveStreakTimer: function (v) { _reactiveStreakTimer = v; },
            t: t,
            safeSetItem: safeSetItem
        });
    }

    // v7.14: Initialize UIManager
    if (G.UIManager) {
        G.UIManager.init({
            getCurrentLang: function () { return currentLang; },
            setCurrentLang: function (v) { currentLang = v; },
            getGameState: function () { return gameState; },
            setGameState: function (s) { setGameState(s); },
            getPausedFromState: function () { return window._pausedFromState; },
            setPausedFromState: function (s) { window._pausedFromState = s; },
            getPlayer: function () { return player; },
            getContainer: function () { return gameContainer; },
            getCanvas: function () { return canvas; },
            getSentinel: function () { return saSentinel; },
            getUI: function () { return ui; },
            getJoystick: function () { return G.Input && G.Input.touch; },
            getLives: function () { return lives; },
            getLevel: function () { return level; },
            getIsBearMarket: function () { return isBearMarket; },
            setIsBearMarket: function (v) { isBearMarket = v; window.isBearMarket = v; },
            setGameWidth: function (v) { gameWidth = v; },
            setGameHeight: function (v) { gameHeight = v; },
            restartGame: function () { startGame(); },
            showToast: function (msg) { showGameInfo(msg); },
            getRandomMeme: function () { return getRandomMeme(); },
            t: t
        });
    }

    resize(); // First resize AFTER UIManager.init() so d.getSentinel is available

    // v7.14: Initialize TutorialManager
    if (G.TutorialManager) {
        G.TutorialManager.init({
            setGameState: setGameState,
            onTutorialComplete: function () {
                _startPlayCountdown();
                showShipIntroMeme();
            }
        });
    }

    // v6.8: Restore TILT mode if saved — verify permission, fallback
    if (localStorage.getItem('fiat_tilt_on') === '1' && inputSys.tilt.available) {
        // Attempt permission silently (Android auto-grants, iOS needs user gesture — will fallback)
        inputSys.requestTiltPermission().then(granted => {
            if (granted) {
                inputSys.setControlMode('TILT');
            } else {
                localStorage.setItem('fiat_tilt_on', '0');
            }
            updateTiltUI();
            updateUIText();
        });
    }

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

    player = new G.Player(gameWidth, gameHeight - (G._safeBottom || 0));
    window.player = player; // Expose for debug commands
    waveMgr.init();

    // Initialize Campaign State
    if (G.CampaignState) G.CampaignState.init();

    // v7.0 Phase 5.1: Initialize StatsTracker + subscribe to hyper/godchain events
    if (G.StatsTracker) {
        G.StatsTracker.init();
        if (G.Events) {
            G.Events.on('player:hyper-activated', () => G.StatsTracker.recordHyper());
            G.Events.on('player:godchain-activated', () => G.StatsTracker.recordGodchain());
            // v7.17.0: Phase-aware UI theming — update CSS vars on phase change
            G.Events.on('phase-change', function(data) {
                var phaseVars = {
                    1: { '--terminal-border': 'rgba(74, 144, 217, 0.35)', '--neon-accent': '#4a90d9', '--accent-secondary': '#ffb347', '--hud-glow-rgb': '74, 144, 217', '--hud-glow-multiplier': '0.85' },
                    2: { '--terminal-border': 'rgba(136, 102, 170, 0.40)', '--neon-accent': '#8866aa', '--accent-secondary': '#bb44ff', '--hud-glow-rgb': '136, 102, 170', '--hud-glow-multiplier': '1.0' },
                    3: { '--terminal-border': 'rgba(0, 240, 255, 0.50)', '--neon-accent': '#00f0ff', '--accent-secondary': '#ff2d95', '--hud-glow-rgb': '0, 240, 255', '--hud-glow-multiplier': '1.2' }
                }[data.phase] || {};
                var root = document.documentElement;
                for (var key in phaseVars) {
                    if (phaseVars.hasOwnProperty(key)) root.style.setProperty(key, phaseVars[key]);
                }
            });
        }
    }
    if (G.AchievementSystem) G.AchievementSystem.init();

    const startApp = () => {
        const splash = document.getElementById('splash-layer');
        if (!splash || splash.style.opacity === '0') return;
        // App startup (log removed for production)
        setGameState('INTRO');
        if (G.IntroScreen) G.IntroScreen.resetToSplash();
        splash.style.opacity = '0';
        audioSys.init();
        setTimeout(() => {
            if (splash) splash.remove();
            setStyle('intro-screen', 'display', 'flex');
            const introScreen = document.getElementById('intro-screen');
            if (introScreen) {
                introScreen.classList.remove('anim-fade-in');
                void introScreen.offsetHeight;
                introScreen.classList.add('anim-fade-in');
            }

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
            if (G.IntroScreen) G.IntroScreen.updatePrimaryButton('SPLASH');

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
            if (G.IntroScreen) G.IntroScreen.initIntroShip();

            // Initialize sky background for INTRO state
            if (G.SkyRenderer) G.SkyRenderer.init(gameWidth, gameHeight);
    if (G.WeatherController) G.WeatherController.init(gameWidth, gameHeight);
    if (G.WeatherController) G.WeatherController.setIntroMode();

            // Restore campaign mode UI state (v4.8: sync UI with stored preference)
            if (G.CampaignState) {
                window.setGameMode(G.CampaignState.isEnabled() ? 'campaign' : 'arcade');
            }

            // Open curtain after intro screen is ready
            const curtain = document.getElementById('curtain-overlay');
            if (curtain) {
                setTimeout(() => curtain.classList.add('open'), 100);
            }

        }, 1000);
    };

    inputSys.on('escape', () => {
        if (gameState === 'VIDEO') startApp();
        else if (gameState === 'STORY_SCREEN' && G.StoryScreen) G.StoryScreen.handleTap();
        else if (gameState === 'PLAY' || gameState === 'WARMUP' || gameState === 'PAUSE') togglePause();
        else if (gameState === 'SETTINGS') window.backToIntro();
        // Close settings if visible from INTRO (no state transition)
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal && settingsModal.style.display === 'flex') window.toggleSettings();
    });

    inputSys.on('start', () => {
        if (gameState === 'VIDEO') startApp();
        else if (gameState === 'STORY_SCREEN' && G.StoryScreen) G.StoryScreen.handleTap();
        else if (gameState === 'INTERMISSION' && waveMgr && waveMgr.intermissionTimer > 0) {
            waveMgr.intermissionTimer = 0; // Skip boss-defeat intermission
        }
        else if (gameState === 'INTRO') {
            // v4.35: Cooldown prevents rapid-fire state transitions (key repeat)
            // v7.0: Intro action handling delegated to IntroScreen
            window.handlePrimaryAction();
        }
        else if (gameState === 'GAMEOVER') window.backToIntro();
    });

    inputSys.on('navigate', (code) => {
        // Ship selection only available in SELECTION state
        if (gameState === 'INTRO' && G.IntroScreen && G.IntroScreen.getIntroState() === 'SELECTION') {
            if (code === 'ArrowRight' || code === 'KeyD') {
                window.cycleShip(1);
            }
            if (code === 'ArrowLeft' || code === 'KeyA') {
                window.cycleShip(-1);
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
        setTimeout(startApp, 3000);
        splash.addEventListener('click', startApp);
        splash.addEventListener('touchstart', startApp);
        window.skipSplashVideo = startApp;
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
        if (G.IntroScreen) G.IntroScreen.resetToSplash();
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

    // P7: Keyboard skip — Space/Enter skips splash video or title animation
    document.addEventListener('keydown', function _skipOnKey(e) {
        if (e.code === 'Space' || e.code === 'Enter') {
            const splashLayer = document.getElementById('splash-layer');
            if (splashLayer && splashLayer.style.opacity !== '0' && splashLayer.style.display !== 'none') {
                e.preventDefault();
                if (window.skipSplashVideo) window.skipSplashVideo();
                return;
            }
            if (G.TitleAnimator && G.TitleAnimator.isAnimating()) {
                e.preventDefault();
                if (window.skipTitleAnim) window.skipTitleAnim();
            }
        }
    });

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

    // v7.0: Initialize extracted modules
    if (G.DebugOverlay) G.DebugOverlay.init();
    if (G.IntroScreen) G.IntroScreen.init({
        getPlayer: () => player,
        getHighScore: () => highScore,
        setHighScore: (v) => { highScore = v; },
        getGameWidth: () => gameWidth,
        getGameHeight: () => gameHeight,
        getCurrentLang: () => currentLang,
        getUI: () => ui,
        getBullets: () => bullets,
        getEnemyBullets: () => enemyBullets,
        setShake: (v) => { shake = v; },
        t: t,
        setStyle: setStyle,
        setUI: setUI,
        setGameState: setGameState,
        startGame: startGame,
        showStoryScreen: showStoryScreen,
        shouldShowStory: shouldShowStory,
        clearBossDeathTimeouts: clearBossDeathTimeouts,
        closePerkChoice: closePerkChoice,
        loadHighScoreForMode: function () { return G.ScoreManager ? G.ScoreManager.loadHighScoreForMode() : 0; },
        loadArcadeRecords: function () { return G.ScoreManager ? G.ScoreManager.loadArcadeRecords() : { bestCycle: 0, bestLevel: 0, bestKills: 0 }; },
        updateUIText: updateUIText,
        updateTiltUI: updateTiltUI,
        showControlToast: showControlToast,
    });

    if (G.GameCompletion) G.GameCompletion.init({
        getScore: () => score,
        getHighScore: () => highScore,
        setHighScore: (v) => { highScore = v; },
        getIsBearMarket: () => isBearMarket,
        setIsBearMarket: (v) => { isBearMarket = v; window.isBearMarket = v; },
        getTotalTime: () => totalTime,
        getMarketCycle: () => marketCycle,
        getLevel: () => level,
        getKillCount: () => killCount,
        getBestStreak: () => bestStreak,
        getUI: () => ui,
        setShake: (v) => { shake = v; },
        t: t,
        setStyle: setStyle,
        setUI: setUI,
        setGameState: setGameState,
        emitEvent: emitEvent,
        safeSetItem: safeSetItem,
        highScoreKey: function () { return G.ScoreManager ? G.ScoreManager.highScoreKey() : 'fiat_highscore_arcade'; },
        startGame: startGame,
        checkArcadeRecords: function () { return G.ScoreManager ? G.ScoreManager.checkArcadeRecords() : { newBest: false, records: null }; },
        getRandomMeme: getRandomMeme,
    });

    // v7.13.0: Initialize rendering pipeline
    G.DrawPipeline.init(ctx);
    // v7.20: Bulk layer registration via DrawPipeline.registerAll() (extracted per ADR-0014)
    G.DrawPipeline.registerAll({
        drawMiniBoss: drawMiniBoss,
        drawEnergyLinks: drawEnergyLinks,
        drawParticles: drawParticles,
        drawEvolutionItem: drawEvolutionItem,
        drawTypedMessages: drawTypedMessages,
        drawArcadeComboHUD: drawArcadeComboHUD,
        drawDebug: drawDebug,
        countActive: _countActive
    });
    // Intermission guard: resets countdown tracking when not in intermission
    G.DrawPipeline.register(G.DrawPipeline.LAYER.ARCADE_HUD, function(ctx, fc) {
        if (fc.gameState !== 'INTERMISSION') lastCountdownNumber = 0;
    }, -1);

    requestAnimationFrame(loop);
}

// Safe area detection: env() sentinel first, heuristic fallback for iOS PWA
// PWA detection moved to UIManager.js
window.safeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 };
window.isPWA = G.UIManager ? G.UIManager.isPWAStandalone() : false;

function resize() {
    if (G.UIManager) G.UIManager.resize();
}

function updateUIText() {
    if (G.UIManager) G.UIManager.updateUIText();
}

window.toggleLang = function () { currentLang = (currentLang === 'EN') ? 'IT' : 'EN'; G._currentLang = currentLang; localStorage.setItem('fiat_lang', currentLang); updateUIText(); };
// v7.6.0 — Reset tutorial + lifetime hints (Settings button)
window.resetTutorial = function () {
    if (G.HintTracker) G.HintTracker.reset();
    try {
        localStorage.removeItem('fiat_tutorial_story_seen');
        localStorage.removeItem('fiat_tutorial_arcade_seen');
    } catch {}
    if (G.MemeEngine) G.MemeEngine.queueMeme('NORMAL', t('RESET_TUTORIAL_DONE'), '\u21BB');
};
window.toggleSettings = function () {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    const isVisible = modal.style.display === 'flex';
    if (!isVisible) {
        modal.style.display = 'flex';
        modal.classList.remove('anim-modal-in');
        void modal.offsetHeight;
        modal.classList.add('anim-modal-in');
        updateUIText();
    } else {
        modal.style.display = 'none';
        modal.classList.remove('anim-modal-in');
    }
};
window.toggleCreditsPanel = function () {
    const panel = document.getElementById('credits-panel');
    if (!panel) return;
    const isVisible = panel.style.display === 'flex';
    if (!isVisible) {
        panel.style.display = 'flex';
        panel.classList.remove('anim-panel-in');
        void panel.offsetHeight;
        panel.classList.add('anim-panel-in');
    } else {
        panel.style.display = 'none';
        panel.classList.remove('anim-panel-in');
    }
};
window.togglePrivacyPanel = function () {
    const panel = document.getElementById('privacy-panel');
    if (!panel) return;
    const isVisible = panel.style.display === 'flex';
    if (!isVisible) {
        panel.style.display = 'flex';
        panel.classList.remove('anim-panel-in');
        void panel.offsetHeight;
        panel.classList.add('anim-panel-in');
    } else {
        panel.style.display = 'none';
        panel.classList.remove('anim-panel-in');
    }
};

// v6.1: Quality tier cycling
window.cycleQuality = function() {
    const tiers = ['AUTO', 'ULTRA', 'HIGH', 'MEDIUM', 'LOW'];
    const qm = G.QualityManager;
    if (!qm) return;
    const current = qm.isAuto() ? 'AUTO' : qm.getTier();
    const idx = (tiers.indexOf(current) + 1) % tiers.length;
    const next = tiers[idx];
    if (next === 'AUTO') {
        qm.setAuto(true);
    } else {
        qm.setAuto(false);
        qm.setTier(next, true);
    }
    updateQualityUI();
};
function updateQualityUI() {
    const btn = document.getElementById('quality-btn');
    if (!btn || !G.QualityManager) return;
    const qm = G.QualityManager;
    const label = qm.isAuto() ? 'AUTO' : qm.getTier();
    btn.querySelector('.switch-label').textContent = label;
    btn.classList.toggle('active', qm.isAuto());
}

// v5.20: Feedback form (mailto-based)
G.toggleFeedback = function () {
    const overlay = document.getElementById('feedback-overlay');
    if (!overlay) return;
    const isVisible = overlay.style.display === 'flex';
    if (isVisible) {
        overlay.style.display = 'none';
        overlay.classList.remove('anim-modal-in');
        return;
    }
    overlay.style.display = 'flex';
    overlay.classList.remove('anim-modal-in');
    void overlay.offsetHeight;
    overlay.classList.add('anim-modal-in');
    // Update i18n texts
    const title = document.getElementById('feedback-title');
    const subject = document.getElementById('feedback-subject');
    const text = document.getElementById('feedback-text');
    const sendBtn = document.getElementById('feedback-send');
    const cancelBtn = document.getElementById('feedback-cancel');
    const error = document.getElementById('feedback-error');
    if (title) title.textContent = t('FB_TITLE');
    if (subject) subject.placeholder = t('FB_SUBJECT_PH');
    if (text) text.placeholder = t('FB_TEXT_PH');
    if (sendBtn) sendBtn.textContent = t('FB_SEND');
    if (cancelBtn) cancelBtn.textContent = t('FB_CANCEL');
    if (error) error.style.display = 'none';
    // Clear fields
    if (subject) subject.value = '';
    if (text) text.value = '';
};
G.sendFeedback = function () {
    const subject = (document.getElementById('feedback-subject')?.value || '').trim();
    const message = (document.getElementById('feedback-text')?.value || '').trim();
    const error = document.getElementById('feedback-error');
    if (!message || message.length < 5) {
        if (error) { error.textContent = t('FB_ERROR_SHORT'); error.style.display = 'block'; }
        return;
    }
    const nick = localStorage.getItem('fiat_nickname') || 'Anonymous';
    const body = `From: ${nick}\n\n${message}`;
    const mailto = `mailto:psychoSocial_01@proton.me?subject=${encodeURIComponent(subject || 'FIAT vs CRYPTO Feedback')}&body=${encodeURIComponent(body)}`;
    window.open(mailto);
    G.toggleFeedback();
};

// v7.0: Debug overlay extracted to src/ui/DebugOverlay.js
// Expose score/killCount for debug overlay reads
G._debugCtx = { get score() { return score; }, get killCount() { return killCount; } };

// v7.0: WHATS_NEW, renderWhatsNew, toggleWhatsNew → G.IntroScreen

// Manual modal functions
window.toggleManual = function () {
    const modal = document.getElementById('manual-modal');
    if (!modal) return;
    const isVisible = modal.style.display === 'flex';
    if (isVisible) {
        modal.style.display = 'none';
        modal.classList.remove('anim-modal-in');
        return;
    }
    modal.style.display = 'flex';
    modal.classList.remove('anim-modal-in');
    void modal.offsetHeight;
    modal.classList.add('anim-modal-in');
    updateManualText();
    audioSys.play('coinUI');
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
    if (!G.Input) return;
    const savedBase = localStorage.getItem('fiat_control_mode') || 'SWIPE';
    const next = (savedBase === 'SWIPE') ? 'JOYSTICK' : 'SWIPE';
    G.Input.setControlMode(next);
    showControlToast(next);
    updateTiltUI();
    updateUIText();
};

// v6.8: TILT toggle (separate from SWIPE/JOY)
window.toggleTilt = function () {
    if (!G.Input) return;
    const wasActive = G.Input.tilt.active;
    if (wasActive) {
        // Turn off tilt — revert to saved SWIPE/JOY base mode
        const base = localStorage.getItem('fiat_control_mode') || 'SWIPE';
        G.Input.setControlMode(base);
        showControlToast(base);
        updateTiltUI();
        updateUIText();
    } else {
        // Turn on tilt — request permission
        G.Input.requestTiltPermission().then(function(granted) {
            if (granted) {
                G.Input.setControlMode('TILT');
                showControlToast('TILT');
            } else {
                showControlToast(t('TILT_DENIED'));
            }
            updateTiltUI();
            updateUIText();
        }).catch(function() {
            showControlToast(t('TILT_DENIED'));
            updateTiltUI();
            updateUIText();
        });
    }
};

window.calibrateTilt = function () {
    if (G.Input && G.Input.calibrateTilt) G.Input.calibrateTilt();
};

function updateTiltUI() {
    const isMobile = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const tiltAvail = isMobile && G.Input?.tilt?.available && G.Balance?.PLAYER?.TILT?.ENABLED !== false;
    const tiltRow = document.getElementById('tilt-toggle-row');
    const calibRow = document.getElementById('tilt-calibrate-row');
    const tiltActive = G.Input?.tilt?.active;
    // Show tilt toggle only on mobile with gyroscope
    if (tiltRow) tiltRow.style.display = tiltAvail ? '' : 'none';
    // Show calibrate only when tilt is active
    if (calibRow) calibRow.style.display = tiltActive ? '' : 'none';
    // Update tilt toggle button state
    const tiltBtn = document.getElementById('tilt-btn');
    if (tiltBtn) {
        const label = tiltBtn.querySelector('.switch-label');
        if (label) label.innerText = tiltActive ? 'ON' : 'OFF';
        if (tiltActive) { tiltBtn.classList.add('active'); } else { tiltBtn.classList.remove('active'); }
    }
}

function showControlToast(mode) {
    if (!ui.controlToast) return;
    ui.controlToast.innerText = `CONTROLS: ${mode}`;
    ui.controlToast.style.display = 'block';
    clearTimeout(ui.controlToast._hideTimer);
    ui.controlToast._hideTimer = setTimeout(() => {
        ui.controlToast.style.display = 'none';
    }, 1200);
}
// v7.0: goToHangar, launchShipAndStart → G.IntroScreen

// Tutorial system extracted to src/ui/TutorialManager.js

window.togglePause = function () {
    const pauseScreen = document.getElementById('pause-screen');
    if (!pauseScreen) return;
    if (gameState === 'PLAY' || gameState === 'WARMUP' || gameState === 'INTERMISSION') {
        console.log('[AUDIO-TRACE] togglePause: ENTER PAUSE (from ' + gameState + ', godchainTimer=' + (player?.godchainTimer?.toFixed?.(2) ?? 'N/A') + ', hyperActive=' + player?.hyperActive + ')');
        window._pausedFromState = gameState;
        setGameState('PAUSE');
        pauseScreen.style.display = 'flex';
        pauseScreen.classList.remove('anim-screen-in');
        void pauseScreen.offsetHeight;
        pauseScreen.classList.add('anim-screen-in');
        setStyle('pause-btn', 'display', 'none');
        // v7.10: stop music on pause (silence, not low-volume ghost loop)
        if (G.Audio && G.Audio.pauseMusic) G.Audio.pauseMusic();
        // v7.19.1: HYPER/GODCHAIN drone layers (continuous oscillators) keep
        // playing through PAUSE because Player.update() — which detects timer
        // expiry and calls stopXxxLayer() — does NOT tick in PAUSE state.
        // Stop them explicitly here; they'll be restarted on resume if the
        // player is still in HYPER/GODCHAIN. Without this, the GODCHAIN drone
        // ("sibilo") leaked indefinitely whenever the user paused.
        if (G.Audio) {
            if (G.Audio.stopGodchainLayer) G.Audio.stopGodchainLayer();
            if (G.Audio.stopHyperLayer) G.Audio.stopHyperLayer();
        }
    }
    else if (gameState === 'PAUSE') {
        console.log('[AUDIO-TRACE] togglePause: EXIT PAUSE → ' + (window._pausedFromState || 'PLAY') + ' (godchainTimer=' + (player?.godchainTimer?.toFixed?.(2) ?? 'N/A') + ', hyperActive=' + player?.hyperActive + ')');
        const resumeTo = window._pausedFromState || 'PLAY';
        setGameState(resumeTo);
        window._pausedFromState = null;
        pauseScreen.style.display = 'none';
        pauseScreen.classList.remove('anim-screen-in');
        setStyle('pause-btn', 'display', 'block');
        // v7.12: always resume the music loop; musicMuted only controls gain, not loop state.
        // Fixes regression where toggling mute during pause left playback dead on resume.
        if (G.Audio && G.Audio.resumeMusic) G.Audio.resumeMusic();
        // v7.19.1: restart continuous drone layers if the player is still in
        // HYPER/GODCHAIN (timers were frozen during PAUSE so they're still > 0).
        if (G.Audio && player) {
            if (player.hyperActive && G.Audio.startHyperLayer) {
                G.Audio.startHyperLayer();
            }
            if (player.godchainTimer > 0 && G.Audio.startGodchainLayer) {
                G.Audio.startGodchainLayer();
            }
        }
    }
};

// v7.0: Auto-pause on tab/app switch via Page Visibility API
document.addEventListener('visibilitychange', function () {
    if (document.hidden && (gameState === 'PLAY' || gameState === 'WARMUP' || gameState === 'INTERMISSION')) {
        window.togglePause();
    }
});
// v6.10.0: Daily Seed Run gating — REPLAY/RESTART consumes the daily attempt.
function _blockIfDailyConsumed() {
    if (!G.DailyMode || !G.DailyMode.isActive() || !G.DailyMode.isLockedToday()) return false;
    if (G.MemeEngine) {
        const t = (G.t || ((k) => k));
        G.MemeEngine.queueMeme('CRITICAL',
            `${t('DAILY_LOCKED') || 'Daily already played'} — ${G.DailyMode.formatCountdown()}`,
            '⏳');
    }
    if (typeof window.backToIntro === 'function') window.backToIntro();
    return true;
}

window.restartRun = function () {
    setStyle('pause-screen', 'display', 'none');
    if (_blockIfDailyConsumed()) return;
    audioSys.resetState(); // Reset audio state for new run
    // v7.7.0: forceSet HANGAR (not INTRO) — INTRO → PLAY is blocked, HANGAR → PLAY is valid.
    if (G.GameState) G.GameState.forceSet('HANGAR');
    startGame();
};
window.restartFromGameOver = function () {
    if (G.DebugOverlay) G.DebugOverlay.hide();
    setStyle('gameover-screen', 'display', 'none');
    if (_blockIfDailyConsumed()) return;
    audioSys.resetState(); // Reset audio state for new run
    // v7.7.0: forceSet HANGAR — only state that directly allows PLAY/WARMUP.
    if (G.GameState) G.GameState.forceSet('HANGAR');
    startGame();
};

// v7.2.0: V8 inter-level intermission screen
function showV8Intermission() {
    if (!G.LevelScript) return;
    const completedNum = G.LevelScript.currentLevelNum();
    const nextIdx = completedNum; // 0-indexed next = current 1-indexed
    const nextLevel = G.LevelScript.LEVELS[nextIdx];
    const titleEl = document.getElementById('v8-int-title');
    const subEl = document.getElementById('v8-int-subtitle');
    const scoreEl = document.getElementById('v8-int-score');
    const killsEl = document.getElementById('v8-int-kills');
    const streakEl = document.getElementById('v8-int-streak');
    const nextNameEl = document.getElementById('v8-int-nextname');
    if (titleEl) titleEl.textContent = `LEVEL ${completedNum} COMPLETE`;
    if (subEl) subEl.textContent = `${G.LevelScript.currentLevelName()} DOWN`;
    if (scoreEl) scoreEl.textContent = Math.floor(score).toLocaleString();
    if (killsEl) killsEl.textContent = killCount | 0;
    if (streakEl) streakEl.textContent = bestStreak | 0;
    if (nextNameEl && nextLevel) nextNameEl.textContent = nextLevel.name;

    // v7.19: clear transient canvas-rendered HUD elements that would otherwise
    // remain frozen on the last frame underneath the intermission overlay.
    // Targets: floating texts, ship status messages above the player, message
    // strip queue (perk pickup toasts), and recent perks display.
    if (G.MessageSystem && G.MessageSystem.reset) G.MessageSystem.reset();
    if (G.FloatingTextManager && G.FloatingTextManager.reset) G.FloatingTextManager.reset();
    if (G.PerkIconManager && G.PerkIconManager.reset) G.PerkIconManager.reset();
    if (G.PerkManager && G.PerkManager.reset) G.PerkManager.reset();

    // v7.19: snap the player ship back to its canonical resting position before
    // freezing the game loop. Fixes the visible "ship in random spot" issue when
    // the level ends — the player is no longer updated in PAUSE state, so its
    // last position before freeze is whatever it was during the boss fight.
    if (player) {
        const restY = (player.gameHeight || gameHeight) - (G.Balance?.PLAYER?.RESET_Y_OFFSET || 80);
        player.x = gameWidth / 2;
        player.y = restY;
        // Also clear any in-flight bullets so the canvas doesn't show frozen tracer trails.
        bullets.forEach(b => G.Bullet.Pool.release(b));
        enemyBullets.forEach(b => G.Bullet.Pool.release(b));
        bullets.length = 0;
        enemyBullets.length = 0;
        window.enemyBullets = enemyBullets;
    }

    setStyle('v8-intermission-screen', 'display', 'flex');
    const v8Screen = document.getElementById('v8-intermission-screen');
    if (v8Screen) {
        v8Screen.classList.remove('anim-screen-in');
        void v8Screen.offsetHeight;
        v8Screen.classList.add('anim-screen-in');
    }
    setStyle('pause-btn', 'display', 'none');
    if (ui.uiLayer) ui.uiLayer.style.display = 'none';
    // v7.19.8: #message-strip vive FUORI da #ui-layer nel DOM e quindi non viene
    // nascosto da ui.uiLayer.style.display='none'. Era questo che faceva
    // "permanere a schermo perk raccolti / combo" sopra la schermata di
    // intermission. Nascondiamolo esplicitamente; advanceToNextV8Level lo
    // ripristina al resume.
    setStyle('message-strip', 'display', 'none');
    setGameState('PAUSE');
}

function advanceToNextV8Level() {
    if (!G.LevelScript) return;
    const nextIdx = G.LevelScript.currentLevelNum(); // 1-indexed current → 0-indexed next
    if (nextIdx >= G.LevelScript.LEVELS.length) {
        // Defensive: no more levels, fall through to gameover
        setStyle('v8-intermission-screen', 'display', 'none');
        triggerGameOver();
        return;
    }
    setStyle('v8-intermission-screen', 'display', 'none');

    // Clear any lingering entities (enemies array shared with G.enemies)
    enemies.length = 0;
    bullets.forEach(b => G.Bullet.Pool.release(b));
    enemyBullets.forEach(b => G.Bullet.Pool.release(b));
    bullets.length = 0;
    enemyBullets.length = 0;

    // Reset scroll (camera + mult + speedOverride) and load next level
    if (G.ScrollEngine && G.ScrollEngine.reset) G.ScrollEngine.reset();
    G.LevelScript.loadLevel(nextIdx);

    // v7.12: sync HUD level indicator with the new V8 level
    const newLvl = G.LevelScript.currentLevelNum();
    level = newLvl;
    runState.level = newLvl;
    window.currentLevel = newLvl;
    updateLevelUI();

    // v7.15: Trigger phase transition based on campaign level
    const phaseMap = { 1: 1, 2: 2, 3: 3 };
    const newPhase = phaseMap[newLvl] || 3;
    if (G.PhaseTransitionController) {
        const curPhase = G.PhaseTransitionController.getCurrentPhase();
        if (newPhase !== curPhase) {
            G.PhaseTransitionController.startTransition(curPhase, newPhase);
        }
    }
    if (G.SkyRenderer) G.SkyRenderer.setPhase(newPhase);
    if (G.WeatherController) G.WeatherController.setPhase(newPhase);

    // Show the gameplay UI again + resume, with cinematic ship entry + 3-2-1
    if (ui.uiLayer) ui.uiLayer.style.display = 'block';
    setStyle('pause-btn', 'display', 'block');
    // v7.19.8: ripristina la message-strip nascosta in showV8Intermission.
    // Default vuoto (lasciamo che il CSS .show / .hide la regoli normalmente).
    setStyle('message-strip', 'display', '');
    _startPlayCountdown();
}
window.advanceToNextV8Level = advanceToNextV8Level;

// v7.2.0: V8 intermission buttons
document.addEventListener('DOMContentLoaded', () => {
    const cont = document.getElementById('v8-int-continue');
    if (cont) cont.addEventListener('click', advanceToNextV8Level);
    const menu = document.getElementById('v8-int-menu');
    if (menu) menu.addEventListener('click', () => {
        setStyle('v8-intermission-screen', 'display', 'none');
        if (window.backToIntro) window.backToIntro();
    });
});
// v7.0: backToIntro, selectShip → G.IntroScreen

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
    if (G.UIManager) G.UIManager.updateMusicUI(isMuted);
}

function updateSfxUI(isMuted) {
    if (G.UIManager) G.UIManager.updateSfxUI(isMuted);
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

    // Swap music to intermission theme
    if (audioSys && audioSys.setIntermissionMode) audioSys.setIntermissionMode(true);

    G.StoryScreen.show(storyId, () => {
        // Restore combat music before handing control back
        if (audioSys && audioSys.setIntermissionMode) audioSys.setIntermissionMode(false);
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

function startGame() {
    if (G.DebugOverlay) G.DebugOverlay.hide();
    if (G.DailyMode && G.DailyMode.isActive()) G.DailyMode.markAttempt();
    if (G.ScrollEngine) G.ScrollEngine.reset();
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

    if (G.IntroScreen) G.IntroScreen.stopAnimation();
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
    G._playerBullets = bullets; dangerZones = []; bomberBombs = []; // v5.32
    if (G.FloatingTextManager) G.FloatingTextManager.reset();
    if (G.PerkIconManager) G.PerkIconManager.reset();
    if (G.MessageSystem) G.MessageSystem.reset(); // Reset typed messages
    _wasHyper = false; _wasGodchain = false; // v5.26: Reset combat HUD tracking
    // Sync all array references after reset
    G.enemies = enemies;
    window.enemyBullets = enemyBullets;
    window.boss = null; window.miniBoss = null; // v2.22.5: Sync for debug overlay
    window._evolutionItem = null; // v5.11: Clear any pending evolution item
    if (G.HarmonicConductor) G.HarmonicConductor.enemies = enemies;
    updateGrazeUI(); // Reset grazing UI

    waveMgr.reset();
    if (G.LevelScript) G.LevelScript.reset();
    gridDir = 1;
    // gridSpeed now computed dynamically via getGridSpeed()

    // v4.37: First game → WARMUP + tutorial overlay. Retry → straight to PLAY.
    // Tutorial state managed by TutorialManager
    const tutMode = (G.CampaignState && G.CampaignState.isEnabled()) ? 'story' : 'arcade';
    if (!G.TutorialManager.isTutorialSeen(tutMode)) {
        G.TutorialManager.showTutorial();
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
    startCountdownTimer = 0; startCountdownGoTimer = 0; startCountdownActive = false; // v5.27
    shipEntryActive = false; shipEntryTimer = 0; // v7.11 cinematic entry

    // Reset visual effects
    shake = 0;
    deathAlreadyTracked = false; // Reset death tracking flag
    if (G.SkyRenderer) G.SkyRenderer.reset();
    if (G.WeatherController) { G.WeatherController.reset(); G.WeatherController.setLevel(1, false, false); }
    // v7.15: Init PhaseTransitionController — start at Phase 1 (Earth/LEO)
    if (G.PhaseTransitionController) {
        G.PhaseTransitionController.init();
        G.PhaseTransitionController.setCurrentPhase(1);
    }
    if (G.SkyRenderer) G.SkyRenderer.setPhase(1);
    if (G.WeatherController) G.WeatherController.setPhase(1);
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
        setLevel: (l) => { level = l; runState.level = l; window.currentLevel = l; },
        setCycle: (c) => { marketCycle = c; runState.marketCycle = c; window.marketCycle = c; },
        getLevel: () => level,
        getCycle: () => marketCycle,
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
        bossDeathTimeout,
        t
    });

    // v6.5: Debug API for skipTo and other test helpers
    G._debugAPI = {
        setLevel: (l) => { level = l; runState.level = l; window.currentLevel = l; },
        setCycle: (c) => { marketCycle = c; runState.marketCycle = c; window.marketCycle = c; },
        setEnemies: (e) => { enemies = e; G.enemies = enemies; },
        setEnemyBullets: (eb) => { enemyBullets = eb; window.enemyBullets = enemyBullets; },
        waveMgr
    };

    emitEvent('run_start', { bear: isBearMarket });

    // v5.27b: Countdown AFTER all resets (skipped if tutorial is shown)
    if (G.TutorialManager.isTutorialSeen(tutMode)) {
        _startPlayCountdown();
        showShipIntroMeme();
    }
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
// endWarmup moved to TutorialManager (onTutorialComplete callback)

// v5.27 / v7.11: Cinematic entry — ship flies in from below, then 3→2→1 countdown.
// shipEntry runs first (waves/firing/input blocked); when it completes, the
// classic countdown takes over.
function _startPlayCountdown() {
    // v7.12.12: coming from INTRO (Arcade launch, tutorial already seen) the
    // direct INTRO → PLAY is blocked by the state machine. HANGAR is the only
    // predecessor that legally transitions to PLAY without WARMUP. Mirror the
    // restart-flow fix (v7.5.2) here for the initial launch.
    if (G.GameState && G.GameState.is('INTRO')) {
        G.GameState.forceSet('HANGAR');
    }
    setGameState('PLAY');
    startCountdownTimer = 0;
    startCountdownGoTimer = 0;
    startCountdownActive = false;

    if (player) {
        player.x = gameWidth / 2;
        player.y = gameHeight + 80; // start below the bottom edge
    }
    shipEntryActive = true;
    shipEntryTimer = SHIP_ENTRY_DURATION;
}

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
        if (G.Events) G.Events.emit('weather:wave-clear');
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
    emitEvent('game:intermission-start', { level: level, wave: waveMgr.wave });
}

/**
 * clearBattlefield() — Unified bullet clearing at combat transitions
 * Player bullets: spark VFX + pool release
 * Enemy bullets: explosion VFX + score award (as bullet cancel bonus) + pool release
 * @param {Object} [options]
 * @param {boolean} [options.enemyBullets=true] - Also clear enemy bullets
 */
function clearBattlefield(options) {
    const clearEnemy = !options || options.enemyBullets !== false;

    // Player bullets → spark VFX + release
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        if (b) {
            createBulletSpark(b.x, b.y, '#00f0ff');
            b.markedForDeletion = true;
            G.Bullet.Pool.release(b);
        }
    }
    bullets.length = 0;

    if (!clearEnemy) return;

    // Enemy bullets → explosion VFX + score bonus + release
    let bulletBonus = 0;
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const eb = enemyBullets[i];
        if (eb) {
            createExplosion(eb.x, eb.y, eb.color || '#ff0', 4);
            bulletBonus += 10;
            eb.markedForDeletion = true;
            G.Bullet.Pool.release(eb);
        }
    }
    enemyBullets.length = 0;
    window.enemyBullets = enemyBullets;

    if (bulletBonus > 0) {
        score += bulletBonus;
        updateScore(score, bulletBonus);
        addText(`+${bulletBonus} ${t('BULLET_BONUS')}`, gameWidth / 2, gameHeight / 2 + 50, '#0ff', 18);
    }

    // v5.33: Clear danger zones and streaming phase state
    dangerZones.length = 0;
    bomberBombs.length = 0;
    if (waveMgr) {
        waveMgr._streamingPhases = [];
        waveMgr._phasesSpawned = 0;
        waveMgr.isStreaming = false;
    }
}
G.clearBattlefield = clearBattlefield;

function startBossWarning() {
    var result = G.BossSpawner.startWarning({ marketCycle: marketCycle });
    if (!result) return;
    bossWarningType = result.bossWarningType;
    bossWarningTimer = result.bossWarningTimer;
    enemies = result.enemies;
    G.enemies = enemies;
    if (G.HarmonicConductor) G.HarmonicConductor.enemies = enemies;
    shake = result.shake;
}

function spawnBoss() {
    var result = G.BossSpawner.spawn({
        marketCycle: marketCycle,
        gameWidth: gameWidth,
        gameHeight: gameHeight,
        level: level,
        isBearMarket: isBearMarket,
        miniBoss: miniBoss,
        memeSwapTimer: memeSwapTimer
    });
    if (!result) return;
    boss = result.boss;
    window.boss = result.boss;
    enemies = result.enemies;
    G.enemies = enemies;
    if (G.HarmonicConductor) G.HarmonicConductor.enemies = enemies;
    miniBoss = result.miniBoss;
    memeSwapTimer = result.memeSwapTimer;
    if (ui.memeTicker) ui.memeTicker.innerText = result.memeTickerText;
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

    // v7.11: Cinematic ship entry — decrement timer here, position override happens
    // after player.update() below so flight dynamics can't drag the ship around.
    if (shipEntryActive) {
        shipEntryTimer -= dt;
        if (shipEntryTimer <= 0) {
            shipEntryActive = false;
            if (player) {
                player.x = gameWidth / 2;
                player.y = (player.gameHeight || gameHeight) - Balance.PLAYER.RESET_Y_OFFSET;
            }
            startCountdownTimer = Balance.TIMING.START_COUNTDOWN ?? 3.0;
            startCountdownGoTimer = 0;
            startCountdownActive = true;
        }
    }

    // v5.27: Countdown timer decrement
    if (startCountdownActive) {
        if (startCountdownTimer > 0) {
            const prevNum = Math.ceil(startCountdownTimer);
            startCountdownTimer -= dt;
            const curNum = Math.ceil(startCountdownTimer);
            // SFX tick when number changes
            if (curNum < prevNum && curNum >= 1 && audioSys) {
                audioSys.play('countdownTick');
            }
            if (startCountdownTimer <= 0) {
                startCountdownGoTimer = Balance.TIMING.START_COUNTDOWN_GO ?? 0.5;
                if (audioSys) audioSys.play('countdownTick', { pitch: 1.5 });
            }
        } else if (startCountdownGoTimer > 0) {
            startCountdownGoTimer -= dt;
            if (startCountdownGoTimer <= 0) {
                startCountdownActive = false;
            }
        }
    }

    // v2.22.1: Include boss warning state to prevent duplicate boss spawn actions
    const isBossActive = !!boss || bossWarningTimer > 0;
    let waveAction = (startCountdownActive || shipEntryActive) ? null : waveMgr.update(dt, gameState, enemies.length, isBossActive);
    // v8: LevelScript drives spawns + boss trigger. waveMgr.update() returns null in V8 mode.
    // v7.11.1: V8 is campaign-only — skip LevelScript tick in Arcade.
    const _isArcadeV8Tick = G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode();
    if (!startCountdownActive && !shipEntryActive && gameState === 'PLAY' && !isBossActive &&
        G.Balance.V8_MODE && G.Balance.V8_MODE.ENABLED && !_isArcadeV8Tick && G.LevelScript) {
        const v8Action = G.LevelScript.tick(dt);
        if (v8Action) waveAction = v8Action;
    }

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
        if (waveAction.action === 'START_INTERMISSION') {
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
            if (G.Events) G.Events.emit('weather:wave-clear');
            // Queue meme via popup (non-blocking)
            const waveMeme = G.MemeEngine.getIntermissionMeme();
            if (waveMeme) G.MemeEngine.queueMeme('STREAK', '\u201C' + waveMeme + '\u201D', '');
            emitEvent('game:intermission-start', { level: level, wave: waveMgr.wave });
            // Immediately start next wave (fall through to START_WAVE)
            waveAction.action = 'START_WAVE';
        }
        // v5.33: SPAWN_PHASE — phase-based streaming adds enemies to existing array
        if (waveAction.action === 'SPAWN_PHASE') {
            const phaseData = waveMgr._spawnPhase(waveAction.phaseIndex, gameWidth);
            if (phaseData && phaseData.enemies.length > 0) {
                for (let pi = 0; pi < phaseData.enemies.length; pi++) {
                    enemies.push(phaseData.enemies[pi]);
                }
                G.enemies = enemies;
                if (G.HarmonicConductor) G.HarmonicConductor.enemies = enemies;
                G.Debug.log('WAVE', `[WAVE] Phase ${waveAction.phaseIndex} appended: +${phaseData.enemies.length} → ${enemies.length} total`);
                // v6.5: Brief fire grace after new phase spawns
                const streamCfg = G.Balance.STREAMING;
                if (streamCfg?.FIRE_GRACE_AFTER_PHASE && G.HarmonicConductor) {
                    G.HarmonicConductor.setPhaseGrace(streamCfg.FIRE_GRACE_AFTER_PHASE);
                }
            }
        }

        if (waveAction.action === 'SPAWN_BOSS') {
            startBossWarning(); // Start warning instead of immediate spawn
        } else if (waveAction.action === 'LEVEL_END') {
            // v8 S05: scripted level end after boss breathing window.
            // v7.2.0: if another level exists, show intermission; else victory.
            // v7.4.0: campaign completion (no next level) now routes to
            // showCampaignVictory() instead of plain gameover so we reuse the
            // existing v6 "all banks defeated" celebration flow.
            if (G.LevelScript && G.LevelScript.hasNextLevel && G.LevelScript.hasNextLevel()) {
                showV8Intermission();
            } else {
                if (typeof showCampaignVictory === 'function') {
                    showCampaignVictory();
                } else {
                    triggerGameOver();
                }
            }
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

            miniBossThisWave = 0;

            let spawnData = waveMgr.prepareStreamingWave(gameWidth);
            if (!spawnData) spawnData = waveMgr.spawnWave(gameWidth);
            enemies = spawnData.enemies;
            lastWavePattern = spawnData.pattern;
            gridDir = 1;

            G.Debug.trackWaveStart(waveMgr.wave, level, spawnData.pattern, enemies.length);

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

            emitEvent('wave_start', { wave: waveNumber, level: level, pattern: lastWavePattern });
        }
    }

    if (gameState === 'PLAY' || gameState === 'WARMUP') {
        const inWarmup = gameState === 'WARMUP';
        // Block firing: warmup, enemy entrance, boss warning/entrance, mini-boss entrance, countdown
        const enemiesEntering = !inWarmup && (
            startCountdownActive ||
            shipEntryActive ||
            (G.HarmonicConductor && G.HarmonicConductor.areEnemiesEntering()) ||
            bossWarningTimer > 0 ||
            (boss && boss.isEntering) ||
            (miniBoss && miniBoss.isEntering)
        );
        // Freeze HYPER timer during non-combat states (warmup, boss warning, countdown, entry)
        player.hyperFrozen = gameState !== 'PLAY' || bossWarningTimer > 0 || startCountdownActive || shipEntryActive;
        const newBullets = player.update(dt, inWarmup || enemiesEntering);
        // Cinematic ship entry: override position after player.update so input can't fight it
        if (shipEntryActive) {
            const raw = 1 - Math.max(0, shipEntryTimer / SHIP_ENTRY_DURATION);
            const eased = 1 - Math.pow(1 - raw, 3);
            const fromY = gameHeight + 80;
            const toY = (player.gameHeight || gameHeight) - Balance.PLAYER.RESET_Y_OFFSET;
            player.x = gameWidth / 2;
            player.y = fromY + (toY - fromY) * eased;
        }
        if (!inWarmup && newBullets && newBullets.length > 0) {
            bullets.push(...newBullets);
            createMuzzleFlashParticles(player.x, player.y - 25, player.stats.color, {
                weaponLevel: player.weaponLevel ?? 1,
                isGodchain: player._godchainActive
            });
        }

        // v7.13.0: Engine exhaust trail particles
        if (player.y > 50 && (gameState === 'PLAY' || gameState === 'WARMUP')) {
            const _exhColor = player.hyperActive ? '#ffcc00' : player.stats.color;
            const _exhCount = player.hyperActive ? 2 : 1;
            for (let ei = 0; ei < _exhCount; ei++) {
                addParticle({
                    x: player.x + (Math.random() - 0.5) * 10,
                    y: player.y + 16 + Math.random() * 4,
                    vx: (Math.random() - 0.5) * 12,
                    vy: 30 + Math.random() * 40,
                    life: 0.3 + Math.random() * 0.2,
                    maxLife: 0.5,
                    color: _exhColor,
                    size: 1.5 + Math.random() * 2,
                    isGlow: true
                });
            }
        }

      if (!inWarmup) {

        // HYPER MODE: manual trigger via keyboard (H) or touch — works alongside auto-activate
        if ((inputSys.isDown('KeyH') || inputSys.touch.hyper) && player.canActivateHyper && player.canActivateHyper(grazeMeter)) {
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

        // v7.10.1: Dynamic music — phase-aware intensity + BPM ramp + modulation + reactive events.
        // (extracted to AudioSystem.updateMusicIntensity per ADR-0014)
        audioSys.updateMusicIntensity({
            boss: boss,
            player: player,
            lives: lives,
            dt: dt,
            levelScript: G.LevelScript,
            scrollEngine: G.ScrollEngine,
            balance: G.Balance
        });
      } // end !inWarmup
    }
    updateFloatingTexts(dt);
    updateTypedMessages(dt);
    updatePerkIcons(dt);
    // v5.25: Status HUD countdown in meme-popup area
    if (G.MemeEngine) G.MemeEngine.update(dt);
    // v5.26: Combat HUD Bar update (HYPER/GODCHAIN/HYPERGOD)
    _updateCombatHUD();
    // v5.14: Score pulse accumulator decay (delegated to ScoreManager)
    if (G.ScoreManager && G.ScoreManager.update) G.ScoreManager.update(dt);
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

    // v5.32: Bomber bombs → convert to danger zones on ground hit
    const bombThreshold = gameHeight * 0.85;
    for (let bi = enemyBullets.length - 1; bi >= 0; bi--) {
        const eb = enemyBullets[bi];
        if (eb && eb.isBomb && eb.y >= bombThreshold) {
            dangerZones.push({
                x: eb.x, y: eb.y,
                radius: eb._zoneRadius || 40,
                duration: eb._zoneDuration || 2,
                timer: eb._zoneDuration || 2,
                color: Balance.ENEMY_BEHAVIORS?.BOMBER?.ZONE_COLOR || '#ff4400',
                alpha: Balance.ENEMY_BEHAVIORS?.BOMBER?.ZONE_ALPHA || 0.25
            });
            eb.markedForDeletion = true;
            G.Bullet.Pool.release(eb);
            enemyBullets.splice(bi, 1);
            createExplosion(eb.x, eb.y, '#ff4400', 8);
        }
    }

    // v5.32: Update danger zones + player collision
    for (let dzi = dangerZones.length - 1; dzi >= 0; dzi--) {
        const dz = dangerZones[dzi];
        dz.timer -= dt;
        if (dz.timer <= 0) {
            dangerZones.splice(dzi, 1);
            continue;
        }
        // Player collision with danger zone
        const pdx = player.x - dz.x;
        const pdy = player.y - dz.y;
        const coreR = player.getCoreHitboxSize ? player.getCoreHitboxSize() : 6;
        if (pdx * pdx + pdy * pdy <= (dz.radius + coreR) * (dz.radius + coreR)) {
            if (player.takeDamage()) {
                updateLivesUI(true);
                applyHitStop('PLAYER_HIT', false);
                triggerScreenFlash('PLAYER_HIT');
                G.EffectsRenderer.triggerDamageVignette();
                if (player.hp <= 0) startDeathSequence();
            }
        }
    }
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

function updateShieldButton(player) {
    const wrapper = document.getElementById('t-shield');
    if (!wrapper) return;
    wrapper.classList.remove('ready', 'active', 'cooldown');

    if (player.shieldActive) {
        wrapper.classList.add('active');
        _setRadialProgress('shield-radial-progress', 1);
    } else if (player.shieldCooldown <= 0) {
        wrapper.classList.add('ready');
        _setRadialProgress('shield-radial-progress', 1);
    } else {
        wrapper.classList.add('cooldown');
        const pct = 1 - (player.shieldCooldown / (G.Balance.PLAYER.SHIELD_COOLDOWN || 10));
        _setRadialProgress('shield-radial-progress', pct);
    }
}

function updateHyperButton(player, grazeMeter) {
    const wrapper = document.getElementById('t-hyper');
    if (!wrapper) return;
    wrapper.classList.remove('ready', 'visible');

    const threshold = G.Balance.HYPER.METER_THRESHOLD || 100;
    const canHyper = grazeMeter >= threshold && player.canActivateHyper && player.canActivateHyper(grazeMeter);

    if (canHyper) {
        wrapper.classList.add('ready', 'visible');
        _setRadialProgress('hyper-radial-progress', 1);
    } else if (grazeMeter > 0) {
        wrapper.classList.add('visible');
        _setRadialProgress('hyper-radial-progress', grazeMeter / threshold);
    }
}

function _setRadialProgress(id, pct) {
    const circ = document.getElementById(id);
    if (!circ) return;
    const r = circ.getAttribute('r') || 30;
    const circumference = 2 * Math.PI * parseFloat(r);
    circ.style.strokeDashoffset = circumference * (1 - Math.max(0, Math.min(1, pct)));
}

// Combat HUD tracking state
var _wasHyper = false;
var _wasGodchain = false;

function _updateCombatHUD() {
    if (!player) return;
    const isHyper = player.isHyperActive ? player.isHyperActive() : false;
    const isGodchain = !!player._godchainActive;
    const hyperDur = Balance.HYPER.BASE_DURATION;
    const gcDur = Balance.GODCHAIN?.DURATION ?? 10;

    // Detect state transitions
    const hyperChanged = isHyper !== _wasHyper;
    const gcChanged = isGodchain !== _wasGodchain;
    _wasHyper = isHyper;
    _wasGodchain = isGodchain;

    if (isHyper && isGodchain) {
        // HYPERGOD: both active
        const minTime = Math.min(
            player.getHyperTimeRemaining ? player.getHyperTimeRemaining() : 0,
            player.godchainTimer || 0
        );
        const maxDur = Math.max(hyperDur, gcDur);
        const label = '\u26A1\u26D3 HYPERGOD ' + minTime.toFixed(1) + 's';
        if (hyperChanged || gcChanged) {
            G.MessageSystem.setCombatState('hypergod', minTime / maxDur, label);
        } else {
            G.MessageSystem.updateCombatDisplay('hypergod', minTime / maxDur, label);
        }
    } else if (isGodchain) {
        const timeLeft = player.godchainTimer || 0;
        const label = '\u26D3 GODCHAIN ' + timeLeft.toFixed(1) + 's';
        if (gcChanged || hyperChanged) {
            G.MessageSystem.setCombatState('godchain', timeLeft / gcDur, label);
        } else {
            G.MessageSystem.updateCombatDisplay('godchain', timeLeft / gcDur, label);
        }
    } else if (isHyper) {
        const timeLeft = player.getHyperTimeRemaining ? player.getHyperTimeRemaining() : 0;
        const label = '\u26A1 HYPER ' + timeLeft.toFixed(1) + 's'; // v5.31: removed ×3 multiplier display
        if (hyperChanged || gcChanged) {
            G.MessageSystem.setCombatState('hyper', timeLeft / hyperDur, label);
        } else {
            G.MessageSystem.updateCombatDisplay('hyper', timeLeft / hyperDur, label);
        }
    } else if (hyperChanged || gcChanged) {
        // Both just deactivated
        G.MessageSystem.clearCombatState();
    }
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

    // Position: right side, below score (v7.12.1: respect iOS safe-area top)
    const x = gameWidth - 12;
    const y = (G._safeTop || 0) + 12;

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

function updateEnemies(dt) {
    let hitEdge = false;
    const currentGridSpeed = getGridSpeed(); // Dynamic grid speed

    // Update Harmonic Conductor (handles beat-synced telegraph visuals)
    if (G.HarmonicConductor) {
        G.HarmonicConductor.update(dt);
    }

    // Block grid movement until enemies have completed entry animation
    // v5.32: In streaming mode, use threshold (>50% settled = grid moves)
    const streamCfg = Balance.STREAMING;
    const isStreamingMode = streamCfg?.ENABLED && waveMgr?.isStreaming;
    let allSettled;
    if (isStreamingMode) {
        let settledCount = 0, totalCount = 0;
        for (let si = 0; si < enemies.length; si++) {
            if (enemies[si]) { totalCount++; if (enemies[si].hasSettled) settledCount++; }
        }
        const threshold = streamCfg.GRID_SETTLE_THRESHOLD ?? 0.5;
        allSettled = totalCount > 0 && (settledCount / totalCount) >= threshold;
    } else {
        allSettled = enemies.length > 0 && !enemies.some(e => e && !e.hasSettled);
    }
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
            // v5.20: Destroy enemy on contact (prevents kamikaze multi-hit)
            e.markedForDeletion = true;
            if (player.hp > 0) streak = 0;
        }
    }

    // v7.15.1: Off-screen cull — remove enemies that flew far above screen (HOVER_GATE LEAVING)
    for (let oi = enemies.length - 1; oi >= 0; oi--) {
        if (enemies[oi] && enemies[oi].markedForDeletion) {
            enemies.splice(oi, 1);
        }
    }

    // v7.14: Burn DoT death cleanup — enemies killed by fire DoT need callback + splice
    for (let bi = enemies.length - 1; bi >= 0; bi--) {
        const be = enemies[bi];
        if (be && be._burnKilled) {
            be._burnKilled = false;
            const stubBullet = { _elemFire: true, _elemLaser: false, _elemElectric: false, damageMult: 1 };
            const gc = G.GameplayCallbacks;
            if (gc && gc.onEnemyKilled) gc.onEnemyKilled(be, stubBullet, bi, enemies);
            enemies.splice(bi, 1);
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
    }
    // v5.25: Clear status HUD on death (specials/perks lost)
    if (G.MemeEngine) G.MemeEngine.hideStatus();

    // v5.19: Notify drop balancer of death for grace period
    if (G.DropSystem && G.DropSystem.notifyDeath) {
        G.DropSystem.notifyDeath(totalTime);
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

/**
 * v7.13.0: Draw Pipeline initialization.
 * Registers all rendering steps as layer callbacks.
 * Called once during startup from init().
 */
/**
 * Build frame context for the rendering pipeline.

/**
 * Build frame context for the rendering pipeline.
 * Collects module references needed by DrawPipeline internals.
 */
/**
 * Build frame context for the rendering pipeline.
 * Collects module references and current game state for DrawPipeline.
 */
function buildFrameContext() {
    return {
        gameWidth: gameWidth,
        gameHeight: gameHeight,
        gameState: gameState,
        totalTime: totalTime,
        level: level,
        isBearMarket: isBearMarket,
        boss: boss,
        bossActive: boss && boss.active,
        miniBoss: miniBoss,
        player: player,
        enemies: enemies,
        bullets: bullets,
        enemyBullets: enemyBullets,
        powerUps: powerUps,
        lives: lives,
        score: score,
        dangerZones: dangerZones,
        bossWarningTimer: bossWarningTimer,
        bossWarningType: bossWarningType,
        startCountdownActive: startCountdownActive,
        startCountdownTimer: startCountdownTimer,
        startCountdownGoTimer: startCountdownGoTimer,
        lastCountdownNumber: lastCountdownNumber,
        debugMode: debugMode,
        grazeMeter: grazeMeter,
        grazeCount: grazeCount,
        grazeMultiplier: grazeMultiplier,
        killStreak: killStreak,
        killStreakMult: killStreakMult,
        bestStreak: bestStreak,
        floatingTexts: floatingTexts,
        perkIcons: perkIcons,
        intermissionMeme: intermissionMeme,
        perkCooldown: perkCooldown,
        bulletCancelStreak: bulletCancelStreak,
        storyScreen: G.StoryScreen,
        effectsRenderer: G.EffectsRenderer,
        skyRenderer: G.SkyRenderer,
        weatherController: G.WeatherController,
        transitionManager: G.TransitionManager,
        particleSystem: G.ParticleSystem,
        floatingTextManager: G.FloatingTextManager,
        perkIconManager: G.PerkIconManager,
        messageSystem: G.MessageSystem,
        harmonicConductor: G.HarmonicConductor,
        miniBossManager: G.MiniBossManager,
        levelScript: G.LevelScript,
        arcadeModifiers: G.ArcadeModifiers,
        debug: G.Debug,
        bulletSystem: G.BulletSystem,
        balance: G.Balance,
        colorUtils: G.ColorUtils
    };
}

/**
 * Main draw function — dispatches to DrawPipeline
 */
function draw() {
    G.DrawPipeline.draw(ctx, buildFrameContext());
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

// v5.31: Energy Link Beam — draw additive line between LV2 paired bullets
function drawEnergyLinks(ctx, bulletArr, linkCfg) {
    const CU = G.ColorUtils;
    const alpha = linkCfg?.ALPHA ?? 0.3;
    const width = linkCfg?.WIDTH ?? 2;

    // Build pairs: volleyId → [b1, b2]
    const pairs = new Map();
    for (let i = 0; i < bulletArr.length; i++) {
        const b = bulletArr[i];
        if (!b._isLinkPair || b.markedForDeletion) continue;
        // Skip laser beam bullets (they have their own visual)
        if (b._elemLaser && !b.special) continue;
        const vid = b._volleyId;
        if (!pairs.has(vid)) {
            pairs.set(vid, [b]);
        } else {
            pairs.get(vid).push(b);
        }
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const pair of pairs.values()) {
        if (pair.length !== 2) continue;
        const b1 = pair[0], b2 = pair[1];

        // Outer glow
        ctx.beginPath();
        ctx.moveTo(b1.x, b1.y);
        ctx.lineTo(b2.x, b2.y);
        ctx.strokeStyle = CU.rgba(0, 200, 255, alpha * 0.4);
        ctx.lineWidth = width + 3;
        ctx.stroke();

        // Core line
        ctx.beginPath();
        ctx.moveTo(b1.x, b1.y);
        ctx.lineTo(b2.x, b2.y);
        ctx.strokeStyle = CU.rgba(0, 240, 255, alpha);
        ctx.lineWidth = width;
        ctx.stroke();
    }

    ctx.restore();
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
    // v7.12.6: Arcade JACKPOT modifier halves boss-hit meter gain too
    if (G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode()) {
        gain *= (G.RunState.arcadeBonuses?.grazeGainMult ?? 1);
    }
    lastGrazeTime = totalTime;
    const _prevMeter = grazeMeter;
    grazeMeter = Math.min(100, grazeMeter + gain);
    // v7.7.0: Lesson modal — explain DIP meter the first time it crosses 50%
    if (_prevMeter < 50 && grazeMeter >= 50 && G.LessonModal) {
        G.LessonModal.show('lesson_dip');
    }
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
    // v7.7.1: freeze the death countdown during PAUSE (incl. lesson modals) so a
    // pickup taken on the last frame of a lethal hit cannot "steal a life" while
    // the player is reading a lesson.
    if (deathTimer > 0 && gameState !== 'PAUSE') {
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

    // v7.0: Intro cooldown tick delegated to IntroScreen
    if (G.IntroScreen) G.IntroScreen.tick(dt);
    if (gameState === 'INTRO' && G.TitleAnimator && G.TitleAnimator.isActive()) {
        G.TitleAnimator.update(dt);
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
    // v8 S01: advance world scroll (only during PLAY, only if opted in)
    if (G.ScrollEngine && gameState === 'PLAY') {
        G.ScrollEngine.update(realDt);
    }
    // Sky update via SkyRenderer
    if (G.SkyRenderer) {
        const skyEffects = G.SkyRenderer.update(dt, { isBearMarket, gameState });
        if (skyEffects.shake > 0) shake = Math.max(shake, skyEffects.shake);
        if (skyEffects.playSound) audioSys.play(skyEffects.playSound);
    }
    if (G.WeatherController) G.WeatherController.update(dt);
    // v7.15: Advance phase transition crossfade
    if (G.PhaseTransitionController) G.PhaseTransitionController.update(dt);

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

    // v6.1: Quality tier auto-detection
    if (G.QualityManager) G.QualityManager.update(timestamp);

    requestAnimationFrame(loop);
}

// v7.0: Game completion/victory/game over extracted to src/ui/GameCompletion.js
// Local aliases for backward compatibility
function showGameCompletion(onComplete) { if (G.GameCompletion) G.GameCompletion.showGameCompletion(onComplete); }
function showCampaignVictory() { if (G.GameCompletion) G.GameCompletion.showCampaignVictory(); }
function triggerGameOver() {
    // v7.13.0: Fade to black before game over screen (smoother transition)
    if (G.TransitionManager && !G.TransitionManager.isActive()) {
        G.TransitionManager.start(function() {
            if (G.GameCompletion) G.GameCompletion.triggerGameOver();
        });
    } else {
        if (G.GameCompletion) G.GameCompletion.triggerGameOver();
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
                // v5.19: PERK cooldown check moved to DropSystem (prevent drop, not collection)

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

                    // v5.25: Status HUD — show perk activation with elemental effect
                    const _perkIcons = { FIRE: '🔥', LASER: '⚡', ELECTRIC: '⛓', GODCHAIN: '🔗' };
                    const _perkNames = { FIRE: 'FIRE PERK', LASER: 'LASER PERK', ELECTRIC: 'ELECTRIC PERK', GODCHAIN: 'GODCHAIN' };
                    const _statusType = elemType === 'GODCHAIN' ? 'godchain' : elemType.toLowerCase();
                    G.MemeEngine.showStatus(_perkNames[elemType] || 'PERK', _perkIcons[elemType] || '✦', _statusType, 3, false);
                    if (G.Debug) {
                        const after = _snapPlayerState();
                        G.Debug.trackProgression(p.type, before, after);
                        G.Debug.trackPowerUpCollected(p.type, p.isPityDrop || false);
                    }
                    powerUps.splice(i, 1);
                    emitEvent('player:powerup-pickup', { type: p.type, category: 'perk', elemType: elemType });
                    continue;
                }

                // Pickup effect for non-PERK power-ups
                createPowerUpPickupEffect(p.x, p.y, p.config.color);
                // v7.13.0: Audio feedback for power-up pickup
                if (audioSys) audioSys.play('coinScore');

                // WEAPON EVOLUTION v3.0: Use applyPowerUp for new types
                const evolutionTypes = ['UPGRADE', 'HOMING', 'PIERCE', 'MISSILE', 'SHIELD', 'SPEED'];
                if (evolutionTypes.includes(p.type) && player.applyPowerUp) {
                    player.applyPowerUp(p.type);
                } else {
                    player.upgrade(p.type);
                }

                // v5.25: Status HUD — show pickup with type-specific effect + countdown
                const WE = Balance.WEAPON_EVOLUTION;
                const _puIcons = { UPGRADE: '⬆', HOMING: '🎯', PIERCE: '🔥', MISSILE: '🚀', SHIELD: '🛡', SPEED: '💨' };
                const _puType = p.type.toLowerCase();
                if (p.type === 'UPGRADE') {
                    const wl = player.weaponLevel ?? 1;
                    G.MemeEngine.showStatus('WEAPON LV' + wl, _puIcons[p.type], _puType, 3, false);
                } else if (p.config?.category === 'special') {
                    const dur = WE?.SPECIAL_DURATION ?? 8;
                    G.MemeEngine.showStatus(p.type, _puIcons[p.type] || '✦', _puType, dur, true);
                } else if (p.type === 'SHIELD') {
                    const dur = Balance.PLAYER?.SHIELD_DURATION ?? 5;
                    G.MemeEngine.showStatus('SHIELD', _puIcons[p.type], _puType, dur, true);
                } else if (p.type === 'SPEED') {
                    const dur = WE?.UTILITY_DURATION ?? 8;
                    G.MemeEngine.showStatus('SPEED', _puIcons[p.type], _puType, dur, true);
                } else {
                    G.MemeEngine.showStatus(p.type, _puIcons[p.type] || '✦', _puType || 'perk', 3, false);
                }
                // Analytics: Track power-up + progression
                if (G.Debug) {
                    const after = _snapPlayerState();
                    G.Debug.trackProgression(p.type, before, after);
                    G.Debug.trackPowerUpCollected(p.type, p.isPityDrop || false);
                }
                powerUps.splice(i, 1);
                emitEvent('player:powerup-pickup', { type: p.type, category: p.config?.category });
            }
        }
    }

    // v4.28.0: Bullet cancellation delegated to CollisionSystem
    G.CollisionSystem.processBulletCancellation();
    // v5.31: Link beam cancellation (LV2 paired bullets)
    G.CollisionSystem.processLinkBeamCancellation();
}

init();

// v5.23: Flush any pending offline score on app start
flushPendingScore();

// URL parameter: ?perf=1 auto-enables FPS overlay (for mobile testing)
if (new URLSearchParams(window.location.search).has('perf')) {
    if (window.dbg && window.dbg.perf) window.dbg.perf();
}
