// Main Entry Point (Namespace Pattern)
const G = window.Game;
const Constants = G;
const audioSys = G.Audio;
const inputSys = G.Input;
const waveMgr = G.WaveManager;
const events = G.Events;
const runState = G.RunState;
window.Game.images = {}; // Placeholder, populated by main.js


// --- GLOBAL STATE ---
let canvas, ctx, gameContainer;
let gameWidth = 600;
let gameHeight = 800;
let gameState = 'VIDEO';
let userLang = navigator.language || navigator.userLanguage;
let currentLang = userLang.startsWith('it') ? 'IT' : 'EN';
let isBearMarket = false; // 🐻
window.isBearMarket = isBearMarket; // Expose globally for WaveManager

// Game Entities
let player;
let bullets = [], enemyBullets = [], enemies = [], powerUps = [], particles = [], floatingTexts = [], muzzleFlashes = [];
window.enemyBullets = enemyBullets; // Expose for Player core hitbox indicator
let clouds = []; // ☁️
let hills = []; // 🏔️ Paper Mario parallax hills
let floatingSymbols = []; // ₿ Floating crypto symbols in background
let lightningTimer = 0; // ⚡ Bear Market lightning
let lightningFlash = 0;
let skyTime = 0; // ✨ Animation timer for sky effects
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
setUI('highScoreVal', highScore); // UI Update
let boss = null;
let score = 0, displayScore = 0, level = 1, lives = 3;
let shake = 0, gridDir = 1, gridSpeed = 25, timeScale = 1.0, totalTime = 0, intermissionTimer = 0, currentMeme = "";
// Screen transition system
let transitionAlpha = 0;
let transitionDir = 0; // 0 = none, 1 = fading in (to black), -1 = fading out
let transitionCallback = null;
let transitionColor = '#000';
let currentShipIdx = 0;
let lastWavePattern = 'RECT';
let perkChoiceActive = false;
let intermissionMeme = ""; // Meme shown during countdown
let debugMode = false; // F3 toggle for performance stats
let fpsHistory = []; // For smooth FPS display
let perkOffers = [];
let volatilityTimer = 0;
let memeSwapTimer = 0;
let killCount = 0;
let streak = 0;
let bestStreak = 0;
let marketCycle = 1; // Track completed boss cycles for difficulty scaling
window.marketCycle = marketCycle; // Expose for WaveManager
window.currentLevel = level; // Expose for WaveManager difficulty calculation
let bulletCancelStreak = 0;
let bulletCancelTimer = 0;

// --- GRAZING SYSTEM (Ikeda Rule 3) ---
let grazeCount = 0;           // Total graze count this run
let grazeMeter = 0;           // 0-100 meter fill
let grazeMultiplier = 1.0;    // Score multiplier from grazing (up to 1.5x)
const GRAZE_RADIUS = 25;      // Pixels outside core hitbox for graze detection
const GRAZE_PERK_THRESHOLD = 50; // Graze count to trigger bonus perk
let lastGrazeSoundTime = 0;   // Throttle graze sound

let enemyFirePhase = 0;
let enemyFireTimer = 0;
let enemyFireStride = 8; // Increased: fewer enemies per group (was 6) - 20% reduction
let enemyShotsThisTick = 0; // Rate limiter
const MAX_ENEMY_SHOTS_PER_TICK = 1; // Reduced: max bullets spawned per frame (was 2)

// Fibonacci firing ramp-up at wave start
let waveStartTime = 0;
let fibonacciIndex = 0;
let fibonacciTimer = 0;
let enemiesAllowedToFire = 1; // Starts at 1, increases via Fibonacci
const FIBONACCI_INTERVAL = 0.40; // Seconds between Fibonacci steps
const FIBONACCI_SEQ = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55]; // Pre-computed

// Fiat Kill Counter System - Mini Boss every 100 kills of same type
let fiatKillCounter = { '¥': 0, '₽': 0, '₹': 0, '€': 0, '£': 0, '₣': 0, '₺': 0, '$': 0, '元': 0, 'Ⓒ': 0 };
const MINI_BOSS_THRESHOLD = 100;
let miniBoss = null; // Special boss spawned from kill counter

// Drop system: time-based (every 5 seconds guarantees a drop opportunity)
let lastDropTime = 0;
const DROP_INTERVAL = 5.0; // Seconds between guaranteed drop opportunities

// Boss fight drops: power-ups every N hits to help player survive
let bossHitCount = 0;
const BOSS_DROP_INTERVAL = 25; // Drop power-up every 25 hits on boss
let bossDropCooldown = 0; // Prevent multiple drops in quick succession

// --- DIFFICULTY SYSTEM ---
// Single unified difficulty multiplier (0.0 = Level 1, capped at 0.85)
function getDifficulty() {
    const base = (level - 1) * 0.08;  // +8% per level (0-4 = 0-0.32)
    const cycleBonus = (marketCycle - 1) * 0.20; // +20% per cycle
    return Math.min(0.85, base + cycleBonus); // Cap at 0.85 = "hard but fair"
}

// Dynamic grid speed based on difficulty
function getGridSpeed() {
    const diff = getDifficulty();
    const base = 12 + diff * 20; // 12 → 32
    return isBearMarket ? base * 1.3 : base;
}

const ui = {};

// --- HELPER FUNCTIONS ---
function t(key) { return Constants.TEXTS[currentLang][key] || key; }

// Juicy score update with bump effect
function updateScore(newScore) {
    score = newScore;
    const el = document.getElementById('scoreVal');
    if (el) {
        el.textContent = Math.floor(score);
        el.classList.remove('score-bump');
        void el.offsetWidth; // Force reflow
        el.classList.add('score-bump');
    }
}
function setStyle(id, prop, val) { const el = document.getElementById(id) || ui[id]; if (el) el.style[prop] = val; }
function setUI(id, val) { const el = document.getElementById(id) || ui[id]; if (el) el.innerText = val; }
function emitEvent(name, payload) { if (events && events.emit) events.emit(name, payload); }
function getRandomMeme() {
    // 40% chance for Saylor quote, 60% for general memes
    const useSaylor = Math.random() < 0.4 && Constants.MEMES.SAYLOR && Constants.MEMES.SAYLOR.length > 0;
    if (useSaylor) {
        return Constants.MEMES.SAYLOR[Math.floor(Math.random() * Constants.MEMES.SAYLOR.length)];
    }
    const pool = (Constants.MEMES.LOW || []).concat(Constants.MEMES.HIGH || []);
    return pool[Math.floor(Math.random() * pool.length)] || "HODL";
}

function getFiatDeathMeme() {
    const pool = Constants.MEMES.FIAT_DEATH || Constants.MEMES.LOW;
    return pool[Math.floor(Math.random() * pool.length)] || "FIAT DESTROYED";
}

function getPowellMeme() {
    const pool = Constants.MEMES.POWELL || Constants.MEMES.BOSS || [];
    return pool[Math.floor(Math.random() * pool.length)] || "PRINTER GO BRRR";
}

function getBossMeme(bossType) {
    let pool;
    if (bossType === 'BCE') {
        pool = Constants.MEMES.BCE || Constants.MEMES.BOSS || [];
    } else if (bossType === 'BOJ') {
        pool = Constants.MEMES.BOJ || Constants.MEMES.BOSS || [];
    } else {
        pool = Constants.MEMES.POWELL || Constants.MEMES.BOSS || [];
    }
    return pool[Math.floor(Math.random() * pool.length)] || "CENTRAL BANK ALERT";
}

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
        showMemePopup(meme.text);
    }
}

// PowerUp memes - crypto-themed feedback
const POWERUP_MEMES = {
    WIDE: "🔱 SPREAD THE FUD",
    NARROW: "🎯 LASER EYES",
    FIRE: "🔥 BURN THE FIAT",
    SPEED: "⚡ ZOOM OUT",
    RAPID: "🚀 TO THE MOON",
    SHIELD: "🛡️ HODL MODE"
};

// ============================================
// MESSAGE SYSTEM - Visual Categories
// ============================================

// Meme colors pool (fun, vibrant)
const MEME_COLORS = ['#00FFFF', '#FF00FF', '#00FF00', '#FFD700', '#FF6B6B', '#4ECDC4'];

// Anti-overlap system
let memePopupTimer = null;
let lastPopupTime = 0;
let popupQueue = [];
const POPUP_COOLDOWN = 600; // ms between popups
const MSG_PRIORITY = { DANGER: 4, VICTORY: 3, POWERUP: 2, MEME: 1 };
let currentPopupPriority = 0;

function canShowPopup(priority) {
    const now = Date.now();
    // Always allow higher priority to interrupt
    if (priority > currentPopupPriority) return true;
    // Check cooldown for same/lower priority
    return (now - lastPopupTime) >= POPUP_COOLDOWN;
}

function showPopupInternal(text, duration, color, fontSize, top, left, rotation, priority) {
    const el = document.getElementById('meme-popup');
    if (!el) return;

    if (!canShowPopup(priority)) {
        // Queue lower priority messages (max 2 in queue)
        if (popupQueue.length < 2 && priority >= MSG_PRIORITY.POWERUP) {
            popupQueue.push({ text, duration, color, fontSize, top, left, rotation, priority });
        }
        return;
    }

    lastPopupTime = Date.now();
    currentPopupPriority = priority;

    el.textContent = text;
    el.style.color = color;
    el.style.fontSize = fontSize;
    el.style.transform = rotation;
    el.style.top = top;
    el.style.left = left;
    el.classList.add('show');

    clearTimeout(memePopupTimer);
    memePopupTimer = setTimeout(() => {
        el.classList.remove('show');
        el.style.transform = 'translate(-50%, -50%)';
        el.style.top = '50%';
        el.style.left = '50%';
        currentPopupPriority = 0;

        // Process queue
        if (popupQueue.length > 0) {
            const next = popupQueue.shift();
            setTimeout(() => {
                showPopupInternal(next.text, next.duration, next.color, next.fontSize, next.top, next.left, next.rotation, next.priority);
            }, 100);
        }
    }, duration);

    audioSys.play('coin');
}

// 🎭 MEME - Fun crypto messages (random color, position, size)
function showMemeFun(text, duration = 1500) {
    const color = MEME_COLORS[Math.floor(Math.random() * MEME_COLORS.length)];
    const fontSize = (24 + Math.random() * 12) + 'px';
    const rotation = `translate(-50%, -50%) rotate(${(Math.random() - 0.5) * 10}deg)`;
    const top = (30 + Math.random() * 40) + '%';
    const left = (30 + Math.random() * 40) + '%';
    showPopupInternal(text, duration, color, fontSize, top, left, rotation, MSG_PRIORITY.MEME);
}

// ⚡ POWER-UP - Pickup feedback (gold, below player, quick)
function showPowerUp(text) {
    showPopupInternal(text, 800, '#FFD700', '24px', '75%', '50%', 'translate(-50%, -50%)', MSG_PRIORITY.POWERUP);
}

// 📊 GAME INFO - Progression messages (green, center)
function showGameInfo(text) {
    addText(text, gameWidth / 2, gameHeight / 2, '#00FF00', 40);
}

// ⚠️ DANGER - Boss/threat messages (red, center, large)
function showDanger(text) {
    addText(text, gameWidth / 2, gameHeight / 2, '#FF4444', 50);
    shake = Math.max(shake, 20);
}

// 🏆 VICTORY - Celebration messages (gold, center, large)
function showVictory(text) {
    addText(text, gameWidth / 2, gameHeight / 2, '#FFD700', 50);
}

// Legacy wrapper for compatibility
function showMemePopup(text, duration = 1500) {
    showMemeFun(text, duration);
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
        pool.splice(pool.indexOf(picked), 1);
    }
    return picks;
}

let recentPerks = []; // Track last 3 perks acquired

function renderPerkBar(highlightId) {
    // Perk bar disabled - cleaner UI
    if (ui.perkBar) ui.perkBar.style.display = 'none';
    return;

    if (recentPerks.length === 0) return;

    const upgradesById = {};
    (G.UPGRADES || []).forEach(p => upgradesById[p.id] = p);

    // Create inner container for scrolling
    const inner = document.createElement('div');
    inner.id = 'perk-bar-inner';

    // Show all perks in a horizontal ticker
    recentPerks.forEach((entry) => {
        const perk = upgradesById[entry.id];
        if (!perk) return;
        const chip = document.createElement('div');
        chip.className = 'perk-chip';
        if (highlightId && entry.id === highlightId) {
            chip.classList.add('new');
        }
        const stackText = entry.stacks > 1 ? ` x${entry.stacks}` : '';
        chip.innerHTML = `<span>${perk.icon || '•'}</span><span>${perk.name}${stackText}</span>`;
        inner.appendChild(chip);
    });

    ui.perkBar.appendChild(inner);
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

    const newMax = (player.stats.hp || 3) + (runState && runState.getMod ? runState.getMod('maxHpBonus', 0) : 0);
    if (newMax !== prevMax) {
        const delta = newMax - prevMax;
        player.maxHp = newMax;
        if (delta > 0) player.hp = Math.min(player.maxHp, player.hp + delta);
    }
    audioSys.play('perk');
    // Perk name shown in perk bar, no floating text needed
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
    const offers = pickPerkOffers(1);
    if (!offers || offers.length === 0) return;
    applyPerk(offers[0]);
}

// --- INTRO SHIP ANIMATION & SELECTION ---
let introShipCanvas = null;
let introShipCtx = null;
let introShipTime = 0;
let selectedShipIndex = 0;
const SHIP_KEYS = ['BTC', 'ETH', 'SOL'];
const SHIP_DISPLAY = {
    BTC: { name: 'BTC STRIKER', color: '#F7931A', symbol: 'B', spd: 6, pwr: 7, hp: 3 },
    ETH: { name: 'ETH HEAVY', color: '#8c7ae6', symbol: 'E', spd: 4, pwr: 8, hp: 4 },
    SOL: { name: 'SOL SPEEDSTER', color: '#00d2d3', symbol: 'S', spd: 9, pwr: 5, hp: 2 }
};

function initIntroShip() {
    introShipCanvas = document.getElementById('intro-ship-canvas');
    if (!introShipCanvas) return;
    introShipCtx = introShipCanvas.getContext('2d');
    updateShipUI();
    animateIntroShip();
}

window.cycleShip = function(dir) {
    selectedShipIndex = (selectedShipIndex + dir + SHIP_KEYS.length) % SHIP_KEYS.length;
    updateShipUI();
    audioSys.play('coin');

    // Swap animation
    if (introShipCanvas) {
        introShipCanvas.classList.remove('ship-swap');
        void introShipCanvas.offsetWidth; // Force reflow
        introShipCanvas.classList.add('ship-swap');
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
        // Scale stats to 8-bar display (original values: spd 4-9, pwr 5-8, hp 2-4)
        const spdScaled = Math.round(ship.spd * 0.8);
        const pwrScaled = Math.round(ship.pwr * 0.8);
        const spdBar = '█'.repeat(spdScaled) + '░'.repeat(8 - spdScaled);
        const pwrBar = '█'.repeat(pwrScaled) + '░'.repeat(8 - pwrScaled);
        const hpHearts = '❤️'.repeat(ship.hp);
        statsEl.innerHTML = `
            <span class="stat-item">SPD ${spdBar}</span>
            <span class="stat-item">PWR ${pwrBar}</span>
            <span class="stat-item">HP ${hpHearts}</span>
        `;
    }
}

function animateIntroShip() {
    if (!introShipCtx) return;
    introShipTime += 0.05;

    const ctx = introShipCtx;
    const w = 200, h = 200;
    const cx = w / 2, cy = h / 2 + 10;

    ctx.clearRect(0, 0, w, h);

    // Get current ship data
    const key = SHIP_KEYS[selectedShipIndex];
    const ship = SHIP_DISPLAY[key];

    // Hover animation
    const hover = Math.sin(introShipTime) * 8;

    ctx.save();
    ctx.translate(cx, cy + hover);

    // Reactor flame (animated)
    const flameHeight = 25 + Math.sin(introShipTime * 8) * 8;
    const flameWidth = 12 + Math.sin(introShipTime * 6) * 4;
    const gradient = ctx.createLinearGradient(0, 20, 0, 20 + flameHeight);
    gradient.addColorStop(0, '#fff');
    gradient.addColorStop(0.3, '#ffaa00');
    gradient.addColorStop(0.7, '#ff4400');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-flameWidth, 20);
    ctx.quadraticCurveTo(0, 20 + flameHeight * 1.2, flameWidth, 20);
    ctx.closePath();
    ctx.fill();

    // Ship body - use selected ship color
    ctx.fillStyle = ship.color;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.lineTo(-30, 20);
    ctx.lineTo(30, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Nose cone
    ctx.fillStyle = lightenColor(ship.color, 30);
    ctx.beginPath();
    ctx.moveTo(0, -42);
    ctx.lineTo(-14, -5);
    ctx.lineTo(14, -5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Fins
    ctx.fillStyle = '#4bc0c8';
    ctx.beginPath();
    ctx.moveTo(-30, 15);
    ctx.lineTo(-48, 28);
    ctx.lineTo(-22, 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(30, 15);
    ctx.lineTo(48, 28);
    ctx.lineTo(22, 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Window
    ctx.fillStyle = '#9fe8ff';
    ctx.beginPath();
    ctx.arc(0, -12, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ship symbol
    ctx.fillStyle = '#111';
    ctx.font = 'bold 18px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ship.symbol, 0, 6);

    ctx.restore();

    requestAnimationFrame(animateIntroShip);
}

// Helper to lighten a hex color
function lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// --- INITIALIZATION ---
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d', { alpha: false });
    gameContainer = document.getElementById('game-container');

    ['intro-screen', 'hangar-screen', 'settings-modal', 'pause-screen', 'gameover-screen',
        'scoreVal', 'score-ticker', 'meme-ticker', 'lvlVal', 'weaponName', 'shieldBar', 'healthBar', 'finalScore',
        'highScoreVal', 'version-tag', 'pause-btn', 'lang-btn', 'control-btn', 'joy-deadzone', 'joy-sensitivity',
        'ui-layer', 'touchControls', 'livesText', 'perk-modal', 'perk-options', 'perk-skip', 'perk-bar', 'control-toast',
        'intro-meme', 'gameover-meme', 'killsVal', 'streakVal', 'kill-counter', 'killNum', 'meme-popup'].forEach(id => {
            const key = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase()).replace('screen', '').replace('Val', '').replace('Bar', 'Bar').replace('layer', 'Layer').replace('Text', 'Text');
            ui[key] = document.getElementById(id);
        });

    // Hide HUD initially
    if (ui.uiLayer) ui.uiLayer.style.display = 'none';
    if (ui.touchControls) ui.touchControls.style.display = 'none';

    const startBtn = document.querySelector('.btn-coin');
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
        // Harmonic Conductor bullet spawning
        events.on('harmonic_bullets', (data) => {
            if (!data || !data.bullets) return;
            data.bullets.forEach(bd => {
                const bullet = G.Bullet.Pool.acquire(bd.x, bd.y, bd.vx, bd.vy, bd.color, bd.w || 8, bd.h || 8, false);
                // Enhanced trail for beat-synced bullets
                bullet.beatSynced = true;
                enemyBullets.push(bullet);
            });
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
    inputSys.init();

    player = new G.Player(gameWidth, gameHeight);
    waveMgr.init();

    const startApp = () => {
        const splash = document.getElementById('splash-layer');
        if (!splash || splash.style.opacity === '0') return;
        console.log("Starting App...");
        gameState = 'INTRO';
        splash.style.opacity = '0';
        audioSys.init();
        setTimeout(() => {
            if (splash) splash.remove();
            setStyle('intro-screen', 'display', 'flex');
            try { updateUIText(); } catch (e) { }
            initIntroShip(); // Start animated ship on intro screen

            // Open curtain after intro screen is ready
            const curtain = document.getElementById('curtain-overlay');
            if (curtain) {
                setTimeout(() => curtain.classList.add('open'), 100);
            }
        }, 1000);
    };

    inputSys.on('escape', () => {
        if (gameState === 'VIDEO') startApp();
        else if (gameState === 'PLAY' || gameState === 'PAUSE') togglePause();
        else if (gameState === 'SETTINGS') backToIntro();
    });

    inputSys.on('start', () => {
        if (gameState === 'VIDEO') startApp();
        else if (gameState === 'INTRO') launchShipAndStart();
        else if (gameState === 'GAMEOVER') backToIntro();
    });

    inputSys.on('navigate', (code) => {
        if (gameState === 'INTRO') {
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
        console.log('Debug mode:', debugMode ? 'ON' : 'OFF');
    });

    const vid = document.getElementById('intro-video');
    const splash = document.getElementById('splash-layer');
    if (vid && splash) {
        vid.play().then(() => { vid.onended = startApp; }).catch(() => { });
        setTimeout(startApp, 4000); splash.addEventListener('click', startApp); splash.addEventListener('touchstart', startApp);
    } else {
        if (splash) splash.style.display = 'none'; setStyle('intro-screen', 'display', 'flex'); updateUIText(); gameState = 'INTRO';
    }

    if (ui.highScore) ui.highScore.innerText = highScore;
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

    if (player) {
        player.gameWidth = gameWidth;
        player.gameHeight = gameHeight;
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

    // Intro
    const btnInsert = document.querySelector('#intro-screen .btn-coin');
    if (btnInsert) btnInsert.innerText = t('INSERT_COIN');
    const startHint = document.querySelector('#intro-screen .subtitle');
    // if (startHint) startHint.innerText = t('START_HINT'); // Or keep "PANIC SELLING UPDATE"? Let's keep specific title.

    // HUD
    if (document.querySelector('.hud-score .label')) document.querySelector('.hud-score .label').innerText = t('SCORE');
    if (document.querySelector('.hud-stat.right .label')) document.querySelector('.hud-stat.right .label').innerText = t('LEVEL');
    if (document.querySelector('.hud-stat.left .label')) document.querySelector('.hud-stat.left .label').innerText = t('LIVES');

    // Pause
    const pauseTitle = document.querySelector('#pause-screen .neon-title');
    if (pauseTitle) pauseTitle.innerText = t('PAUSED');
    const resumeBtn = document.querySelector('#pause-screen .btn-coin:first-of-type');
    if (resumeBtn) resumeBtn.innerText = t('RESUME');
    const exitBtn = document.querySelector('#pause-screen .btn-coin:last-of-type');
    if (exitBtn) exitBtn.innerText = t('EXIT_TITLE');

    // Game Over
    const goTitle = document.querySelector('#gameover-screen h1');
    if (goTitle) goTitle.innerText = "LIQUIDATION EVENT";
    const goBtn = document.querySelector('#gameover-screen .btn-coin');
    if (goBtn) goBtn.innerText = t('RESTART');

    // Settings
    const setHeader = document.querySelector('#settings-modal h2');
    if (setHeader) setHeader.innerText = t('SETTINGS');
    const closeBtn = document.querySelector('#settings-modal .btn-coin.mini');
    if (closeBtn) closeBtn.innerText = t('CLOSE');
    // Select the lang row specifically (parent of #lang-btn)
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
        const langLabel = langBtn.parentElement.querySelector('.setting-label');
        if (langLabel) langLabel.innerText = t('LANG');
    }
}

window.toggleLang = function () { currentLang = (currentLang === 'EN') ? 'IT' : 'EN'; updateUIText(); };
window.toggleSettings = function () { setStyle('settings-modal', 'display', (document.getElementById('settings-modal').style.display === 'flex') ? 'none' : 'flex'); updateUIText(); };
window.toggleHelpPanel = function () {
    const panel = document.getElementById('help-panel');
    if (panel) panel.style.display = (panel.style.display === 'flex') ? 'none' : 'flex';
};
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
    gameState = 'HANGAR';
    initSky(); // Start BG effect early
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

    // Elements to destroy (in order from bottom to top)
    const destroyTargets = [
        { el: document.querySelector('.start-actions'), y: null },
        { el: document.querySelector('.start-score'), y: null },
        { el: document.querySelector('.start-ship'), y: null },
        { el: document.querySelector('.quick-settings-row'), y: null },
        { el: document.querySelector('.title-tagline'), y: null },
        { el: document.querySelector('.title-crypto'), y: null },
        { el: document.querySelector('.title-vs'), y: null },
        { el: document.querySelector('.title-fiat'), y: null }
    ].filter(t => t.el);

    // Get Y positions of targets
    destroyTargets.forEach(t => {
        const rect = t.el.getBoundingClientRect();
        t.y = rect.top + rect.height / 2;
        t.destroyed = false;
    });

    // Animation variables - SLOW rocket launch
    let currentY = shipStartY;
    let velocity = 0;
    const maxVelocity = 500;
    const acceleration = 350;
    let lastTime = performance.now();
    let launchTime = 0;
    const shipCenterY = shipStartY + shipRect.height / 2;

    // Destroy element with explosion effect
    function destroyElement(el) {
        audioSys.play('shoot');

        // Create explosion particles from text
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

            // Random velocity - slower for visibility
            const vx = (Math.random() - 0.5) * 400;
            const vy = (Math.random() - 0.6) * 300;
            const rotation = (Math.random() - 0.5) * 540;

            particle.style.setProperty('--vx', vx + 'px');
            particle.style.setProperty('--vy', vy + 'px');
            particle.style.setProperty('--rot', rotation + 'deg');

            document.body.appendChild(particle);

            // Remove after animation completes
            setTimeout(() => particle.remove(), 1500);
        });

        // Hide original element with flash
        el.style.opacity = '0';
        el.style.transform = 'scale(1.2)';
        el.style.transition = 'all 0.1s';
    }

    // Animation loop
    function animateLaunch(currentTime) {
        const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
        lastTime = currentTime;
        launchTime += dt;

        // Phase 1: Charge up (shake and glow) for 0.6s
        if (launchTime < 0.6) {
            const intensity = launchTime / 0.6;
            const shake = Math.sin(launchTime * 50) * (2 + intensity * 4);
            const glow = 15 + intensity * 35;
            launchShip.style.transform = `translateX(${shake}px) scale(${1 + intensity * 0.15})`;
            launchShip.style.filter = `drop-shadow(0 0 ${glow}px rgba(247, 147, 26, 0.9))`;

            // Play rumble sounds
            if (launchTime > 0.2 && launchTime < 0.25) audioSys.play('shoot');
            if (launchTime > 0.4 && launchTime < 0.45) audioSys.play('shoot');

            requestAnimationFrame(animateLaunch);
            return;
        }

        // Phase 2: LIFTOFF!
        const flightTime = launchTime - 0.6;

        // Gradually increase velocity (rocket launch feel)
        const accelMult = Math.min(1, flightTime * 1.5);
        velocity += acceleration * accelMult * dt;
        if (velocity > maxVelocity) velocity = maxVelocity;

        // Move ship UP
        currentY -= velocity * dt;

        // Apply position directly via top - ship flies UP visibly!
        const scale = 1.15 + Math.min(0.2, (shipStartY - currentY) * 0.0003);
        const glowSize = 50 + (shipStartY - currentY) * 0.05;
        const trailLength = Math.min(60, (shipStartY - currentY) * 0.1);

        launchShip.style.top = currentY + 'px';
        launchShip.style.transform = `scale(${scale})`;
        launchShip.style.filter = `drop-shadow(0 ${trailLength}px ${glowSize}px rgba(255, 150, 0, 0.9))`;

        // Check collisions with text elements
        const shipCurrentCenter = currentY + shipRect.height / 2;
        destroyTargets.forEach(target => {
            if (!target.destroyed && shipCurrentCenter < target.y + 40) {
                target.destroyed = true;
                destroyElement(target.el);
            }
        });

        // Continue until well off screen
        if (currentY > -shipRect.height - 100) {
            requestAnimationFrame(animateLaunch);
        } else {
            finishLaunch();
        }

        // Close curtain when ship passes halfway up
        if (currentY < window.innerHeight * 0.3 && curtain && curtain.classList.contains('open')) {
            curtain.classList.remove('open');
        }
    }

    function finishLaunch() {
        isLaunching = false;

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
        setStyle('intro-screen', 'display', 'none');
        initSky();
        startGame();

        setTimeout(() => {
            if (curtain) curtain.classList.add('open');
        }, 100);
    }

    // Start animation
    requestAnimationFrame(animateLaunch);
}
window.togglePause = function () {
    if (gameState === 'PLAY' || gameState === 'INTERMISSION') { gameState = 'PAUSE'; setStyle('pause-screen', 'display', 'flex'); setStyle('pause-btn', 'display', 'none'); }
    else if (gameState === 'PAUSE') { gameState = 'PLAY'; setStyle('pause-screen', 'display', 'none'); setStyle('pause-btn', 'display', 'block'); }
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
        setStyle('pause-screen', 'display', 'none');
        setStyle('gameover-screen', 'display', 'none');
        setStyle('hangar-screen', 'display', 'none');
        if (ui.uiLayer) ui.uiLayer.style.display = 'none'; // HIDE HUD
        if (ui.touchControls) ui.touchControls.style.display = 'none';
        closePerkChoice();
        setStyle('intro-screen', 'display', 'flex');
        gameState = 'INTRO';
        audioSys.resetState(); // Reset audio state
        audioSys.init();
        // Reset Harmonic Conductor
        if (G.HarmonicConductor) G.HarmonicConductor.reset();
        initIntroShip(); // Restart animated ship

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
        audioSys.play('bossSpawn'); // Scary sound
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
        if (btn.classList.contains('icon-btn-cell')) {
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

function updateLivesUI(wasHit = false) {
    if (!ui.healthBar) return;
    const pct = Math.max(0, (player.hp / player.maxHp) * 100);
    ui.healthBar.style.width = pct + "%";

    // Color Logic
    if (player.hp <= 1 || pct <= 34) {
        ui.healthBar.style.backgroundColor = '#ff0000'; // RED (Critical)
        ui.healthBar.style.boxShadow = '0 0 15px #ff0000';
        // Add critical pulse
        ui.healthBar.classList.add('health-critical');
    } else if (pct <= 67) {
        ui.healthBar.style.backgroundColor = '#F7931A'; // ORANGE (Warn)
        ui.healthBar.style.boxShadow = '0 0 10px #F7931A';
        ui.healthBar.classList.remove('health-critical');
    } else {
        ui.healthBar.style.backgroundColor = '#2ecc71'; // GREEN (Safe)
        ui.healthBar.style.boxShadow = '0 0 10px #2ecc71';
        ui.healthBar.classList.remove('health-critical');
    }

    // Shake animation when hit
    if (wasHit && ui.livesText) {
        ui.livesText.classList.remove('lives-shake');
        void ui.livesText.offsetWidth; // Force reflow
        ui.livesText.classList.add('lives-shake');
    }
}

function startGame() {
    audioSys.init();
    setStyle('intro-screen', 'display', 'none'); setStyle('gameover-screen', 'display', 'none'); setStyle('pause-screen', 'display', 'none'); setStyle('pause-btn', 'display', 'block');
    if (ui.uiLayer) ui.uiLayer.style.display = 'flex'; // SHOW HUD
    if (ui.touchControls) ui.touchControls.style.display = 'block';

    if (runState && runState.reset) runState.reset();
    if (runState && runState.getMod) {
        player.maxHp = (player.stats.hp || 3) + runState.getMod('maxHpBonus', 0);
        player.hp = player.maxHp;
    }
    volatilityTimer = 0;
    bulletCancelStreak = 0;
    bulletCancelTimer = 0;
    enemyFirePhase = 0;
    enemyFireTimer = 0;
    memeSwapTimer = 2.0;
    closePerkChoice();
    recentPerks = []; // Reset perk display
    renderPerkBar();

    score = 0; displayScore = 0; level = 1; lives = 3; setUI('scoreVal', '0'); setUI('lvlVal', '1'); setUI('livesText', lives);
    audioSys.setLevel(1, true); // Set music theme for level 1 (instant, no crossfade)
    bullets = []; enemies = []; enemyBullets = []; powerUps = []; particles = []; floatingTexts = []; muzzleFlashes = []; boss = null;
    G.enemies = enemies; // Expose for Boss Spawning logic
    window.enemyBullets = enemyBullets; // Update for Player core hitbox indicator
    grazeCount = 0; grazeMeter = 0; grazeMultiplier = 1.0; updateGrazeUI(); // Reset grazing

    waveMgr.reset();
    gridDir = 1;
    // gridSpeed now computed dynamically via getGridSpeed()

    gameState = 'PLAY';
    player.resetState();

    if (isBearMarket) {
        player.hp = 1; // ONE HIT KILL
        player.maxHp = 1; // Full bar but Red (logic handled in updateLivesUI)
        // Bear Market speed handled in getGridSpeed() via 1.3x multiplier
        showDanger("🩸 SURVIVE THE CRASH 🩸");
    }

    killCount = 0;
    streak = 0;
    bestStreak = 0;
    marketCycle = 1; // Reset cycle
    window.marketCycle = marketCycle;
    window.currentLevel = level; // Reset for WaveManager
    updateKillCounter(); // Reset display

    // Reset fiat kill counter and mini-boss
    fiatKillCounter = { '¥': 0, '€': 0, '£': 0, '$': 0 };
    miniBoss = null;
    lastDropTime = 0; // Reset time-based drop timer

    updateLivesUI();

    // Initialize Harmonic Conductor
    if (G.HarmonicConductor) {
        G.HarmonicConductor.init(enemies, player, gameWidth, gameHeight);
        G.HarmonicConductor.setDifficulty(level, marketCycle, isBearMarket);
        G.HarmonicConductor.enabled = true;
    }

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
    gameState = 'INTERMISSION';
    waveMgr.intermissionTimer = 1.9; // 25% shorter pause (was 2.5)
    waveMgr.waveInProgress = false; // Safety reset

    // Convert all remaining enemy bullets to bonus points with explosion effect
    const bulletBonus = enemyBullets.length * 10;
    if (enemyBullets.length > 0) {
        enemyBullets.forEach(eb => {
            createExplosion(eb.x, eb.y, eb.color || '#ff0', 6);
        });
        if (bulletBonus > 0) {
            score += bulletBonus;
            updateScore(score);
            addText(`+${bulletBonus} BULLET BONUS`, gameWidth / 2, gameHeight / 2 + 50, '#0ff', 18);
        }
    }

    bullets = []; enemyBullets = [];
    window.enemyBullets = enemyBullets; // Update for Player core hitbox indicator

    // Play wave complete jingle (unless boss defeat which has its own sound)
    if (!msgOverride) {
        audioSys.play('waveComplete');
    }

    // Pick a random meme for the countdown
    const memePool = [...(Constants.MEMES.LOW || []), ...(Constants.MEMES.SAYLOR || [])];
    intermissionMeme = memePool[Math.floor(Math.random() * memePool.length)] || "HODL";

    // Only show text if explicitly provided (boss defeat, etc.)
    if (msgOverride) {
        addText(msgOverride, gameWidth / 2, gameHeight / 2 - 80, '#00ff00', 30);
    }
    emitEvent('intermission_start', { level: level, wave: waveMgr.wave });

    // Story: Level complete dialogue
    if (G.Story) {
        G.Story.onLevelComplete(level);
    }
}

function spawnBoss() {
    // Determine boss type based on market cycle (rotation: FED → BCE → BOJ → repeat)
    const bossRotation = G.BOSS_ROTATION || ['FEDERAL_RESERVE', 'BCE', 'BOJ'];
    const bossType = bossRotation[(marketCycle - 1) % bossRotation.length];
    const bossConfig = G.BOSSES[bossType] || G.BOSSES.FEDERAL_RESERVE;

    // Flash color based on boss
    transitionAlpha = 0.6;
    transitionDir = -1;
    transitionColor = bossType === 'BCE' ? '#000033' : (bossType === 'BOJ' ? '#330000' : '#400000');

    boss = new G.Boss(gameWidth, gameHeight, bossType);

    // Scale boss HP using boss config
    const baseHp = bossConfig.baseHp || 4500;
    const hpPerLevel = bossConfig.hpPerLevel || 600;
    const hpPerCycle = bossConfig.hpPerCycle || 800;
    boss.hp = baseHp + (level * hpPerLevel) + ((marketCycle - 1) * hpPerCycle);
    boss.maxHp = boss.hp;

    // Reset boss hit counter and cooldown for power-up drops
    bossHitCount = 0;
    bossDropCooldown = 0;

    enemies = [];
    if (window.Game) window.Game.enemies = enemies;

    // Boss-specific danger message
    const dangerMsg = bossConfig.country + ' ' + bossConfig.name + ' ' + bossConfig.country;
    showDanger("⚠️ " + dangerMsg + " ⚠️");
    showMemeFun(getBossMeme(bossType), 2000);
    audioSys.play('bossSpawn');
    audioSys.setBossPhase(1); // Start boss music phase 1

    // Set Harmonic Conductor to boss sequence
    if (G.HarmonicConductor) {
        G.HarmonicConductor.enemies = [];
        G.HarmonicConductor.setBossSequence(1);
    }

    // Start with boss-specific meme in the ticker
    if (ui.memeTicker) ui.memeTicker.innerText = getBossMeme(bossType);
    memeSwapTimer = 2.0;

    // Story: Boss intro dialogue
    if (G.Story) {
        G.Story.onBossIntro(bossType);
    }
}

// Mini-Boss System - Giant fiat currency after 100 kills of same type
function spawnMiniBoss(symbol, color) {
    // Slow down time for dramatic effect
    hitStopTimer = 1.0;

    // Clear regular enemies and bullets for 1v1 fight
    enemyBullets.forEach(b => { b.markedForDeletion = true; G.Bullet.Pool.release(b); });
    enemyBullets = [];
    window.enemyBullets = enemyBullets; // Update for Player core hitbox indicator

    // Store current enemies to restore later
    const savedEnemies = [...enemies];
    enemies = [];

    // Create mini-boss object
    const fiatNames = { '¥': 'YEN', '€': 'EURO', '£': 'POUND', '$': 'DOLLAR' };
    miniBoss = {
        x: gameWidth / 2,
        y: 150,
        targetY: 180,
        width: 120,
        height: 120,
        hp: 200 + (level * 30) + (marketCycle * 50),
        maxHp: 200 + (level * 30) + (marketCycle * 50),
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

    showDanger(`${miniBoss.name} REVENGE!`);
    showMemeFun(getFiatDeathMeme(), 1500);
    audioSys.play('bossSpawn');
}

function updateMiniBoss(dt) {
    if (!miniBoss || !miniBoss.active) return;

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
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return parseInt(result[1], 16) + ',' + parseInt(result[2], 16) + ',' + parseInt(result[3], 16);
    }
    return '255,255,255';
}

function checkMiniBossHit(b) {
    if (!miniBoss || !miniBoss.active) return false;

    if (Math.abs(b.x - miniBoss.x) < 60 && Math.abs(b.y - miniBoss.y) < 60) {
        const baseDmg = player.stats.baseDamage || 14;
        const dmgMult = (runState && runState.getMod) ? runState.getMod('damageMult', 1) : 1;
        let dmg = baseDmg * dmgMult;
        if (b.isHodl) dmg *= 1.25; // HODL: +25% damage
        miniBoss.hp -= dmg;
        audioSys.play('hit');

        if (miniBoss.hp <= 0) {
            // Mini-boss defeated!
            score += 2000 * marketCycle;
            updateScore(score);
            // Epic mini-boss death
            createEnemyDeathExplosion(miniBoss.x, miniBoss.y, miniBoss.color, miniBoss.symbol);
            createExplosion(miniBoss.x - 40, miniBoss.y - 30, miniBoss.color, 15);
            createExplosion(miniBoss.x + 40, miniBoss.y + 30, miniBoss.color, 15);
            createExplosion(miniBoss.x, miniBoss.y, '#fff', 20);

            showVictory(miniBoss.name + " DESTROYED!");
            showMemeFun("💀 FIAT IS DEAD!", 1500);
            shake = 40;
            audioSys.play('explosion');

            // Restore enemies if any were saved
            if (miniBoss.savedEnemies && miniBoss.savedEnemies.length > 0) {
                enemies = miniBoss.savedEnemies;
            }

            miniBoss = null;
        }
        return true;
    }
    return false;
}

function update(dt) {
    if (gameState !== 'PLAY' && gameState !== 'INTERMISSION') return;
    totalTime += dt;

    if (bulletCancelTimer > 0) {
        bulletCancelTimer -= dt;
        if (bulletCancelTimer <= 0) bulletCancelStreak = 0;
    }
    if (volatilityTimer > 0) {
        volatilityTimer -= dt;
        if (volatilityTimer <= 0 && runState && runState.modifiers) {
            runState.modifiers.tempFireRateMult = 1;
        }
    }

    // Meme ticker: only visible during boss fight
    if (ui.memeTicker) {
        if (boss && boss.active) {
            ui.memeTicker.style.display = 'block';
            memeSwapTimer -= dt;
            if (memeSwapTimer <= 0) {
                ui.memeTicker.innerText = getPowellMeme();
                memeSwapTimer = 4.0; // Powell memes every 4s during boss
            }
        } else {
            ui.memeTicker.style.display = 'none';
        }
    }

    const waveAction = waveMgr.update(dt, gameState, enemies.length, !!boss);

    if (waveAction) {
        if (waveAction.action === 'START_INTERMISSION') {
            startIntermission();
        } else if (waveAction.action === 'SPAWN_BOSS') {
            spawnBoss();
        } else if (waveAction.action === 'START_WAVE') {
            gameState = 'PLAY';
            if (waveMgr.wave > 1) {
                level++;
                audioSys.setLevel(level); // Change music theme for new level
                updateLevelUI(); // With animation
                lastDropTime = totalTime; // Reset time-based drop timer for new level
                showGameInfo("📈 LEVEL " + level);
                // gridSpeed now computed dynamically via getGridSpeed()
            }
            const waveNumber = waveMgr.wave;
            let msg = waveNumber === 1 ? t('WAVE1') : (waveNumber === 2 ? t('WAVE2') : t('WAVE3'));
            showGameInfo(msg);

            const spawnData = waveMgr.spawnWave(gameWidth);
            enemies = spawnData.enemies;
            lastWavePattern = spawnData.pattern;
            gridDir = 1;

            // Reset Fibonacci firing ramp-up for new wave
            waveStartTime = totalTime;
            fibonacciIndex = 0;
            fibonacciTimer = 0;
            enemiesAllowedToFire = 1; // Start with 1 enemy allowed

            // Update Harmonic Conductor for new wave
            if (G.HarmonicConductor) {
                G.HarmonicConductor.enemies = enemies;
                G.HarmonicConductor.setDifficulty(level, marketCycle, isBearMarket);
                G.HarmonicConductor.setSequence(lastWavePattern, audioSys.intensity, isBearMarket);
            }

            emitEvent('wave_start', { wave: waveNumber, level: level, pattern: lastWavePattern });
        }
    }

    if (gameState === 'PLAY') {
        const newBullets = player.update(dt);
        if (newBullets && newBullets.length > 0) {
            bullets.push(...newBullets);
            createMuzzleFlashParticles(player.x, player.y - 25, player.stats.color);
        }

        let sPct = player.shieldActive ? 100 : Math.max(0, 100 - (player.shieldCooldown / 8 * 100));
        setStyle('shieldBar', 'width', sPct + "%");
        setStyle('shieldBar', 'backgroundColor', player.shieldActive ? '#fff' : (player.shieldCooldown <= 0 ? player.stats.color : '#555'));

        updateBullets(dt);
        updateEnemies(dt);

        if (boss && boss.active) {
            const bossBullets = boss.update(dt, player);
            if (bossBullets && bossBullets.length > 0) {
                bossBullets.forEach(bd => {
                    enemyBullets.push(G.Bullet.Pool.acquire(bd.x, bd.y, bd.vx, bd.vy, bd.color, bd.w, bd.h, false));
                });
            }
            // Decrement boss drop cooldown
            if (bossDropCooldown > 0) bossDropCooldown -= dt;
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
        intensity += player.hp === 1 ? 20 : 0;       // Near death
        intensity += enemies.length;                 // More enemies = more intense
        audioSys.setIntensity(intensity);

        // Near-death heartbeat (HP = 1)
        if (player.hp === 1) {
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
    updateParticles(dt);
    updateTransition(dt);
}

function updateBullets(dt) {
    // Player Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        if (!b) { bullets.splice(i, 1); continue; } // Safety check
        b.update(dt);
        if (b.markedForDeletion) {
            G.Bullet.Pool.release(b);
            bullets.splice(i, 1);
        } else {
            if (boss && boss.active && b.x > boss.x && b.x < boss.x + boss.width && b.y > boss.y && b.y < boss.y + boss.height) {
                const baseBossDmg = Math.ceil((player.stats.baseDamage || 14) / 4);
                const dmgMult = (runState && runState.getMod) ? runState.getMod('damageMult', 1) : 1;
                let dmg = baseBossDmg * dmgMult;
                if (b.isHodl) dmg = Math.ceil(dmg * 1.5); // HODL: +50% vs boss
                if (runState && runState.flags && runState.flags.hodlBonus && b.isHodl) dmg = Math.ceil(dmg * 1.15);
                boss.damage(dmg);
                audioSys.play('hit');

                // Boss drops power-ups every N hits to help player (with cooldown to prevent clustering)
                bossHitCount++;
                if (bossHitCount >= BOSS_DROP_INTERVAL && bossDropCooldown <= 0) {
                    bossHitCount = 0;
                    bossDropCooldown = 1.5; // 1.5 second cooldown between drops
                    const weaponTypes = ['WIDE', 'NARROW', 'FIRE'];
                    const shipTypes = ['SPEED', 'RAPID', 'SHIELD'];
                    const dropWeapon = Math.random() < 0.5;
                    const dropX = boss.x + boss.width / 2 + (Math.random() - 0.5) * 80;
                    const dropY = boss.y + boss.height + 20;
                    if (dropWeapon) {
                        const type = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
                        powerUps.push(new G.PowerUp(dropX, dropY, type));
                    } else {
                        const type = shipTypes[Math.floor(Math.random() * shipTypes.length)];
                        powerUps.push(new G.PowerUp(dropX, dropY, type));
                    }
                    audioSys.play('coin');
                }

                if (!b.penetration) {
                    b.markedForDeletion = true;
                    G.Bullet.Pool.release(b);
                    bullets.splice(i, 1);
                }
                if (boss.hp <= 0) {
                    // Save boss info before clearing
                    const defeatedBossType = boss.bossType || 'FEDERAL_RESERVE';
                    const defeatedBossName = boss.name || 'THE FED';

                    // Epic boss death explosion!
                    const bossX = boss.x + boss.width / 2;
                    const bossY = boss.y + boss.height / 2;
                    createBossDeathExplosion(bossX, bossY);

                    // Victory flash!
                    transitionAlpha = 0.8;
                    transitionDir = -1;
                    transitionColor = '#ffffff';

                    score += 5000; boss.active = false; boss = null; shake = 60; audioSys.play('explosion');
                    audioSys.setBossPhase(0); // Reset boss music
                    updateScore(score);
                    showVictory("🏆 " + defeatedBossName + " DEFEATED!");

                    // Boss-specific victory meme
                    const victoryMemes = {
                        'FEDERAL_RESERVE': "💥 INFLATION CANCELLED!",
                        'BCE': "💥 FRAGMENTATION COMPLETE!",
                        'BOJ': "💥 YEN LIBERATED!"
                    };
                    showMemeFun(victoryMemes[defeatedBossType] || "💥 CENTRAL BANK DESTROYED!", 2000);

                    level++;
                    audioSys.setLevel(level); // Change music theme for new level
                    updateLevelUI(); // With animation

                    // New cycle - increase difficulty
                    marketCycle++;
                    window.marketCycle = marketCycle; // Update global
                    waveMgr.reset();

                    // Reset Harmonic Conductor for new wave cycle
                    if (G.HarmonicConductor) {
                        G.HarmonicConductor.setDifficulty(level, marketCycle, isBearMarket);
                        G.HarmonicConductor.currentSequence = null; // Will be set when wave spawns
                    }

                    startIntermission("CYCLE " + marketCycle + " BEGINS");
                    emitEvent('boss_killed', { level: level, cycle: marketCycle, bossType: defeatedBossType });

                    // Story: Boss defeated dialogue
                    if (G.Story) {
                        G.Story.onBossDefeat(defeatedBossType);
                    }
                }
            } else if (miniBoss && miniBoss.active && checkMiniBossHit(b)) {
                // Mini-boss was hit
                if (!b.penetration) {
                    b.markedForDeletion = true;
                    G.Bullet.Pool.release(b);
                    bullets.splice(i, 1);
                }
            } else {
                checkBulletCollisions(b, i);
            }
        }
    }

    // Enemy Bullets (Now using Bullet class instances from Pool)
    // Ikeda Rule 1: Core Hitbox - tiny hitbox for damage, larger graze zone
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let eb = enemyBullets[i];
        if (!eb) { enemyBullets.splice(i, 1); continue; } // Safety check
        eb.update(dt);
        if (eb.markedForDeletion) {
            G.Bullet.Pool.release(eb);
            enemyBullets.splice(i, 1);
        } else {
            // Core hitbox for actual damage (tiny - Ikeda Rule 1)
            const coreR = player.stats.coreHitboxSize || 6;
            // Graze radius - outer zone for grazing points (Ikeda Rule 3)
            const grazeR = coreR + GRAZE_RADIUS;

            const dx = Math.abs(eb.x - player.x);
            const dy = Math.abs(eb.y - player.y);

            // Check if within core hitbox (take damage)
            if (dx < coreR && dy < coreR) {
                if (player.takeDamage()) {
                    updateLivesUI(true); // Hit animation
                    G.Bullet.Pool.release(eb);
                    enemyBullets.splice(i, 1);
                    shake = 20;
                    bulletCancelStreak = 0;
                    bulletCancelTimer = 0;
                    grazeCount = 0; // Reset graze on hit
                    grazeMeter = Math.max(0, grazeMeter - 30); // Lose graze meter
                    emitEvent('player_hit', { hp: player.hp, maxHp: player.maxHp });

                    if (player.hp <= 0) {
                        startDeathSequence();
                    } else {
                        hitStopTimer = 0.3; // Normal Hit SlowMo
                    }
                    streak = 0;
                }
            }
            // Check if within graze zone (but not core) - award graze points
            else if (dx < grazeR && dy < grazeR && !eb.grazed) {
                eb.grazed = true; // Mark as grazed to prevent double-counting
                grazeCount++;
                grazeMeter = Math.min(100, grazeMeter + 8); // Increased from 2 to 8 for faster meter fill
                grazeMultiplier = 1 + (grazeMeter / 200); // Up to 1.5x at full meter

                // Award graze points
                const grazePoints = Math.floor(5 * grazeMultiplier);
                score += grazePoints;
                updateScore(score);

                // Graze visual effect
                createGrazeSpark(eb.x, eb.y, player.x, player.y);

                // Play graze sound (throttled to avoid spam)
                const now = totalTime;
                if (now - lastGrazeSoundTime > 0.1) {
                    audioSys.play('graze'); // Crystalline shimmer with pitch scaling
                    lastGrazeSoundTime = now;
                }

                // Graze streak every 10
                if (grazeCount > 0 && grazeCount % 10 === 0) {
                    audioSys.play('grazeStreak');
                }

                // Perk bonus every 50 graze
                if (grazeCount > 0 && grazeCount % GRAZE_PERK_THRESHOLD === 0) {
                    applyRandomPerk();
                    audioSys.play('grazePerk'); // Triumphant fanfare
                    showMemePopup("GRAZE BONUS!", 1200);
                }

                // Update graze HUD
                updateGrazeUI();
            }
        }
    }
}

// Graze spark effect - particles flying toward player
function createGrazeSpark(bx, by, px, py) {
    const dx = px - bx;
    const dy = py - by;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const dirX = dx / dist;
    const dirY = dy / dist;

    // 2-3 white particles moving toward player
    for (let i = 0; i < 3; i++) {
        particles.push({
            x: bx + (Math.random() - 0.5) * 6,
            y: by + (Math.random() - 0.5) * 6,
            vx: dirX * (150 + Math.random() * 100) + (Math.random() - 0.5) * 50,
            vy: dirY * (150 + Math.random() * 100) + (Math.random() - 0.5) * 50,
            life: 0.25 + Math.random() * 0.15,
            maxLife: 0.4,
            size: 2 + Math.random() * 2,
            color: '#ffffff',
            type: 'graze'
        });
    }
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

function checkBulletCollisions(b, bIdx) {
    for (let j = enemies.length - 1; j >= 0; j--) {
        let e = enemies[j];
        if (Math.abs(b.x - e.x) < 40 && Math.abs(b.y - e.y) < 40) { // Adjusted for larger enemies
            const baseDmg = player.stats.baseDamage || 14;
            const dmgMult = (runState && runState.getMod) ? runState.getMod('damageMult', 1) : 1;
            let dmg = baseDmg * dmgMult;
            if (b.isHodl) dmg *= 1.25; // HODL: +25% damage
            if (runState && runState.flags && runState.flags.hodlBonus && b.isHodl) dmg *= 1.15; // Stacks with perk
            e.hp -= dmg; audioSys.play('hit');
            e.hitFlash = 0.6; // Trigger hit flash effect
            if (e.hp <= 0) {
                enemies.splice(j, 1);
                audioSys.play('coin');
                const mult = (runState && runState.getMod) ? runState.getMod('scoreMult', 1) : 1;
                score += e.scoreVal * (isBearMarket ? 2 : 1) * mult;
                updateScore(score);
                createEnemyDeathExplosion(e.x, e.y, e.color, e.symbol || '$');
                createScoreParticles(e.x, e.y, e.color); // JUICE: Fly to score
                // Score ticker removed - particles provide enough feedback
                killCount++;
                streak++;
                if (streak > bestStreak) bestStreak = streak;
                updateKillCounter();
                checkStreakMeme();
                emitEvent('enemy_killed', { score: e.scoreVal, x: e.x, y: e.y });

                // Track kills per fiat type for mini-boss trigger
                if (e.symbol && fiatKillCounter[e.symbol] !== undefined && !miniBoss) {
                    fiatKillCounter[e.symbol]++;
                    if (fiatKillCounter[e.symbol] >= MINI_BOSS_THRESHOLD) {
                        spawnMiniBoss(e.symbol, e.color);
                        fiatKillCounter[e.symbol] = 0;
                    }
                }

                // DROP LOGIC - Time-based: guaranteed drop every 5 seconds + 2% bonus chance
                const weaponTypes = ['WIDE', 'NARROW', 'FIRE'];
                const shipTypes = ['SPEED', 'RAPID', 'SHIELD'];
                const timeSinceLastDrop = totalTime - lastDropTime;
                const guaranteedDrop = timeSinceLastDrop >= DROP_INTERVAL;
                const bonusChance = 0.02; // 2% bonus chance

                // Guaranteed drop if enough time passed, or small bonus chance
                if (guaranteedDrop || Math.random() < bonusChance) {
                    // Alternate between weapon and ship drops
                    const dropWeapon = Math.random() < 0.5;
                    if (dropWeapon) {
                        const type = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
                        powerUps.push(new G.PowerUp(e.x, e.y, type));
                    } else {
                        const type = shipTypes[Math.floor(Math.random() * shipTypes.length)];
                        powerUps.push(new G.PowerUp(e.x, e.y, type));
                    }
                    lastDropTime = totalTime; // Reset drop timer
                }
            }
            if (!b.penetration) {
                b.markedForDeletion = true;
                G.Bullet.Pool.release(b);
                bullets.splice(bIdx, 1);
                return; // Non-penetrating bullets stop after first hit
            }
            // Penetrating bullets continue checking other enemies (no return)
        }
    }
}

function updateEnemies(dt) {
    let hitEdge = false;
    const currentGridSpeed = getGridSpeed(); // Dynamic grid speed

    // Update Harmonic Conductor (handles beat-synced telegraph visuals)
    if (G.HarmonicConductor) {
        G.HarmonicConductor.update(dt);
    }

    // Check if Harmonic Conductor is handling firing (uses self-managed beat timing)
    const conductorEnabled = G.HarmonicConductor && G.HarmonicConductor.enabled && G.HarmonicConductor.currentSequence;

    // Reset rate limiter each frame (only used for legacy firing)
    enemyShotsThisTick = 0;

    // Fibonacci ramp-up: increase enemies allowed to fire every 0.33s (legacy system)
    if (!conductorEnabled) {
        fibonacciTimer += dt;
        if (fibonacciTimer >= FIBONACCI_INTERVAL && fibonacciIndex < FIBONACCI_SEQ.length - 1) {
            fibonacciTimer = 0;
            fibonacciIndex++;
            enemiesAllowedToFire = FIBONACCI_SEQ[fibonacciIndex];
        }

        enemyFireTimer -= dt;
        if (enemyFireTimer <= 0) {
            enemyFireTimer = 0.5; // Slower phase rotation (was 0.35)
            enemyFirePhase = (enemyFirePhase + 1) % enemyFireStride;
        }
    }

    let enemiesFiredThisFrame = 0; // Track for Fibonacci limit

    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        e.update(dt, totalTime, lastWavePattern, currentGridSpeed, gridDir);
        if ((gridDir === 1 && e.x > gameWidth - 20) || (gridDir === -1 && e.x < 20)) hitEdge = true;

        // Skip legacy firing if Harmonic Conductor is active
        if (conductorEnabled) continue;

        // Rate limit check - skip if we've hit max shots this tick
        if (enemyShotsThisTick >= MAX_ENEMY_SHOTS_PER_TICK) continue;

        // Fibonacci limit: only allow N enemies to fire per frame (based on ramp-up)
        if (enemiesFiredThisFrame >= enemiesAllowedToFire) continue;

        // Unified difficulty scaling
        const diff = getDifficulty();
        const bearMult = isBearMarket ? 1.3 : 1.0;
        const rateMult = (0.5 + diff * 0.5) * bearMult; // 0.5 → 1.0 based on difficulty
        const bulletSpeed = 128 + diff * 68; // Reduced 15% (was 150 + diff * 80)
        const aimSpreadMult = isBearMarket ? 0.85 : (1.2 - diff * 0.3); // Tighter aim with difficulty
        const allowFire = (i % enemyFireStride) === enemyFirePhase;
        const bulletData = e.attemptFire(dt, player, rateMult, bulletSpeed, aimSpreadMult, allowFire);
        if (bulletData) {
            enemiesFiredThisFrame++;
            const bulletsToSpawn = Array.isArray(bulletData) ? bulletData : [bulletData];
            audioSys.play('enemyShoot');
            bulletsToSpawn.forEach(bd => {
                if (enemyShotsThisTick < MAX_ENEMY_SHOTS_PER_TICK) {
                    enemyBullets.push(G.Bullet.Pool.acquire(bd.x, bd.y, bd.vx, bd.vy, bd.color, bd.w, bd.h, false));
                    enemyShotsThisTick++;
                }
            });
        }
    }

    // Bear Market: enemies drop faster (Panic Selling)
    const dropAmount = isBearMarket ? 35 : 20;
    if (hitEdge) { gridDir *= -1; enemies.forEach(e => e.baseY += dropAmount); }

    enemies.forEach(e => {
        const hitR = (player.stats.hitboxSize || 30) + 15; // Adjusted for larger enemies
        if (Math.abs(e.x - player.x) < hitR && Math.abs(e.y - player.y) < hitR) {
            if (player.takeDamage()) {
                updateLivesUI(true); // Hit animation
                shake = 40; // Heavy shake
                hitStopTimer = 0.5; // Contact hit slowmo
                emitEvent('player_hit', { hp: player.hp, maxHp: player.maxHp });
                if (player.hp <= 0) {
                    startDeathSequence();
                }
            }
            if (player.hp > 0) streak = 0;
        }
    });
}

function startDeathSequence() {
    // 1. Trigger Bullet Time (Visuals)
    hitStopTimer = 2.0;
    deathTimer = 2.0; // Wait 2s before logic
    flashRed = 0.8;

    // 2. Play Sound
    audioSys.play('explosion');
    shake = 50;

    // 3. Clear Bullets (Fairness)
    // 3. Clear Bullets (Fairness) - Mark for deletion to avoid loop crashes
    enemyBullets.forEach(b => {
        b.markedForDeletion = true;
        window.Game.Bullet.Pool.release(b); // Release immediately or let loop handle it? 
        // Better: just mark them. But we need to ensure they don't hit player again this frame.
        // Actually, loop handles deletion. Just marking is safe.
        // But wait, if I release them here, and loop continues, loop will access released object?
        // Safe bet: Just clear the array safely? No, loop index issue.
        // Safest: enemyBullets.forEach(b => b.markedForDeletion = true);
    });
    // To be absolutely safe and instant:
    // We can't clear the array if we are iterating it.
    // So we just mark them. The update loop checks markedForDeletion at start of iteration.
    enemyBullets.forEach(b => b.markedForDeletion = true);
}

function executeDeath() {
    lives--;
    setUI('livesText', lives);

    if (lives > 0) {
        // RESPAWN
        player.hp = player.maxHp;
        player.invulnTimer = 2.1; // Reduced 30% (was 3.0)
        updateLivesUI();
        showGameInfo("💚 RESPAWN!");
        // Maybe move player to center?
        player.x = gameWidth / 2;
    } else {
        // GAME OVER
        triggerGameOver();
    }
}

function draw() {
    if (gameState === 'VIDEO') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, gameWidth, gameHeight); return; }

    // Decrease shake
    if (shake > 0) shake -= 1;

    ctx.save();
    if (shake > 0) {
        const dx = (Math.random() - 0.5) * shake;
        const dy = (Math.random() - 0.5) * shake;
        ctx.translate(dx, dy);
    }

    drawSky(ctx);

    // Impact Flash (Behind entities or on top? On top feels more intense)
    if (flashRed > 0) {
        flashRed -= 0.02; // Fade out
        ctx.fillStyle = `rgba(255, 0, 0, ${flashRed})`;
        ctx.fillRect(-20, -20, gameWidth + 40, gameHeight + 40); // Cover shaken area
    }
    if (gameState === 'PLAY' || gameState === 'PAUSE' || gameState === 'GAMEOVER' || gameState === 'INTERMISSION') {
        player.draw(ctx);

        // Enemies (for loop instead of forEach)
        for (let i = 0; i < enemies.length; i++) {
            enemies[i].draw(ctx);
        }

        if (boss && boss.active) {
            boss.draw(ctx);
        }
        if (miniBoss && miniBoss.active) {
            drawMiniBoss(ctx);
        }

        // Bullets with culling (for loop)
        for (let i = 0; i < bullets.length; i++) {
            const b = bullets[i];
            if (b.y > -20 && b.y < gameHeight + 20) b.draw(ctx);
        }

        // Screen dimming when many enemy bullets (Ikeda Rule 4 - Climax Visual)
        if (enemyBullets.length > 15) {
            const dimAlpha = Math.min(0.35, (enemyBullets.length - 15) * 0.015);
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
            if (eb.y > -20 && eb.y < gameHeight + 20) eb.draw(ctx);
        }

        // PowerUps (fewer items, forEach is fine)
        for (let i = 0; i < powerUps.length; i++) {
            powerUps[i].draw(ctx);
        }

        drawParticles(ctx);

        // Floating texts
        ctx.font = '20px Courier New';
        for (let i = 0; i < floatingTexts.length; i++) {
            const t = floatingTexts[i];
            ctx.fillStyle = t.c;
            ctx.fillText(t.text, t.x, t.y);
        }

        // Intermission countdown overlay
        if (gameState === 'INTERMISSION' && waveMgr.intermissionTimer > 0) {
            const countdown = Math.ceil(waveMgr.intermissionTimer);
            const centerX = gameWidth / 2;
            const centerY = gameHeight / 2;

            // Pulse effect based on timer
            const pulse = 1 + Math.sin(waveMgr.intermissionTimer * 8) * 0.1;

            // Countdown number (big, bold, cell-shaded)
            ctx.save();
            ctx.font = `bold ${Math.floor(80 * pulse)}px "Courier New", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Black outline
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 6;
            ctx.strokeText(countdown, centerX, centerY - 20);
            // Gold fill
            ctx.fillStyle = '#F7931A';
            ctx.fillText(countdown, centerX, centerY - 20);

            // Meme text below (smaller, white with outline)
            ctx.font = 'bold 22px "Courier New", monospace';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4;
            ctx.strokeText(intermissionMeme, centerX, centerY + 50);
            ctx.fillStyle = '#fff';
            ctx.fillText(intermissionMeme, centerX, centerY + 50);
            ctx.restore();
        }
    }
    // Bear Market danger vignette overlay
    if (isBearMarket && gameState === 'PLAY') {
        drawBearMarketOverlay(ctx);
    }

    ctx.restore(); // Restore shake

    // Screen transition overlay (on top of everything)
    drawTransition(ctx);

    // Debug overlay (F3 toggle)
    if (debugMode) drawDebug(ctx);
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
    ctx.fillText(`Particles: ${particles.length}/${MAX_PARTICLES}`, 10, gameHeight - 55);
    ctx.fillText(`Bullets: ${bullets.length}`, 10, gameHeight - 40);
    ctx.fillText(`Enemy Bullets: ${enemyBullets.length}`, 10, gameHeight - 25);
    ctx.fillText(`Enemies: ${enemies.length}`, 10, gameHeight - 10);
    ctx.restore();
}

function initSky() {
    clouds = [];
    const count = 12; // Reduced from 20 for performance
    for (let i = 0; i < count; i++) {
        clouds.push({
            x: Math.random() * gameWidth,
            y: Math.random() * gameHeight * 0.5,
            w: Math.random() * 100 + 50,
            h: Math.random() * 40 + 20,
            speed: Math.random() * 20 + 10,
            layer: Math.floor(Math.random() * 3)
        });
    }

    // Paper Mario style parallax hills (3 layers)
    hills = [
        { layer: 0, y: gameHeight * 0.75, height: 120, speed: 5, offset: 0 },
        { layer: 1, y: gameHeight * 0.80, height: 100, speed: 12, offset: 50 },
        { layer: 2, y: gameHeight * 0.85, height: 80, speed: 20, offset: 100 }
    ];

    // Floating crypto symbols (background decoration)
    const symbols = ['₿', 'Ξ', '◎', '₮', '∞'];
    floatingSymbols = [];
    for (let i = 0; i < 8; i++) {
        floatingSymbols.push({
            symbol: symbols[i % symbols.length],
            x: Math.random() * gameWidth,
            y: Math.random() * gameHeight * 0.6 + gameHeight * 0.15,
            speed: Math.random() * 15 + 8,
            size: Math.random() * 12 + 14,
            alpha: Math.random() * 0.15 + 0.08,
            wobble: Math.random() * Math.PI * 2
        });
    }
}

function updateSky(dt) {
    if (clouds.length === 0) initSky();
    const speedMult = isBearMarket ? 5.0 : 1.0;
    skyTime += dt; // Increment sky animation timer

    // Update clouds (for loop)
    for (let i = 0; i < clouds.length; i++) {
        const c = clouds[i];
        c.x -= c.speed * (c.layer + 1) * 0.5 * speedMult * dt;
        if (c.x + c.w < 0) {
            c.x = gameWidth + 50;
            c.y = Math.random() * gameHeight * 0.5;
        }
    }

    // Update parallax hills offset (for loop)
    // Use 628 (≈ 2π/0.01) to avoid discontinuity in sine wave
    for (let i = 0; i < hills.length; i++) {
        const h = hills[i];
        h.offset += h.speed * speedMult * dt;
        if (h.offset > 628) h.offset -= 628;
    }

    // Update floating crypto symbols
    for (let i = 0; i < floatingSymbols.length; i++) {
        const s = floatingSymbols[i];
        s.x -= s.speed * speedMult * dt;
        s.wobble += dt * 2; // Gentle oscillation
        if (s.x < -30) {
            s.x = gameWidth + 30;
            s.y = Math.random() * gameHeight * 0.5 + gameHeight * 0.15;
        }
    }

    // ⚡ Bear Market Lightning
    if (isBearMarket && gameState === 'PLAY') {
        lightningTimer -= dt;
        if (lightningTimer <= 0) {
            lightningFlash = 0.4; // Flash intensity (increased)
            lightningTimer = 1.5 + Math.random() * 3; // More frequent: 1.5-4.5 seconds
            shake = Math.max(shake, 8); // Screen shake on lightning
            audioSys.play('hit'); // Thunder sound
        }
    }
    if (lightningFlash > 0) lightningFlash -= dt * 1.5; // Slightly slower fade
}

// Screen transition functions
function startTransition(callback, color = '#000') {
    transitionDir = 1; // Fade to black
    transitionCallback = callback;
    transitionColor = color;
}

function updateTransition(dt) {
    if (transitionDir === 0) return;

    const speed = 3; // Transition speed
    transitionAlpha += transitionDir * speed * dt;

    if (transitionDir === 1 && transitionAlpha >= 1) {
        // Fully black - execute callback and start fade out
        transitionAlpha = 1;
        if (transitionCallback) {
            transitionCallback();
            transitionCallback = null;
        }
        transitionDir = -1; // Start fading out
    } else if (transitionDir === -1 && transitionAlpha <= 0) {
        // Fully transparent - done
        transitionAlpha = 0;
        transitionDir = 0;
    }
}

function drawTransition(ctx) {
    if (transitionAlpha <= 0) return;

    ctx.fillStyle = transitionColor;
    ctx.globalAlpha = transitionAlpha;
    ctx.fillRect(0, 0, gameWidth, gameHeight);
    ctx.globalAlpha = 1;

    // Add some flair during transition
    if (transitionAlpha > 0.3 && transitionAlpha < 0.95) {
        // Wipe line effect
        const wipePos = transitionDir === 1 ?
            transitionAlpha * gameHeight :
            (1 - transitionAlpha) * gameHeight;

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, wipePos);
        ctx.lineTo(gameWidth, wipePos);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
}

// Bear Market danger overlay - red vignette + blood rain
function drawBearMarketOverlay(ctx) {
    // Pulsing red vignette
    const pulse = Math.sin(totalTime * 2) * 0.1 + 0.25;
    const gradient = ctx.createRadialGradient(
        gameWidth / 2, gameHeight / 2, gameHeight * 0.3,
        gameWidth / 2, gameHeight / 2, gameHeight * 0.8
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.7, `rgba(80, 0, 0, ${pulse * 0.3})`);
    gradient.addColorStop(1, `rgba(100, 0, 0, ${pulse * 0.6})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    // Blood rain effect (falling red streaks)
    ctx.strokeStyle = 'rgba(150, 20, 20, 0.4)';
    ctx.lineWidth = 2;
    const rainCount = 15;
    for (let i = 0; i < rainCount; i++) {
        const seed = i * 137.5 + totalTime * 100;
        const x = ((seed * 7) % gameWidth);
        const y = ((seed * 3 + totalTime * 300) % (gameHeight + 50)) - 25;
        const len = 15 + (i % 3) * 8;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 2, y + len);
        ctx.stroke();
    }

    // Edge danger indicators (flashing corners)
    const dangerPulse = Math.sin(totalTime * 8) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255, 0, 0, ${dangerPulse * 0.15})`;

    // Top edge
    ctx.fillRect(0, 0, gameWidth, 8);
    // Bottom edge
    ctx.fillRect(0, gameHeight - 8, gameWidth, 8);
}

function drawSky(ctx) {
    // PAPER MARIO STYLE - Flat color bands, no gradients!
    let bands = [];

    if (isBearMarket) {
        // Bear Market: Dark Storm - flat red bands
        bands = [
            { color: '#1a0000', height: 0.2 },
            { color: '#2a0505', height: 0.25 },
            { color: '#3a0a0a', height: 0.25 },
            { color: '#2a0000', height: 0.3 }
        ];
    } else if (boss && boss.active) {
        // Boss: Deep Space - flat dark bands
        bands = [
            { color: '#000008', height: 0.25 },
            { color: '#05051a', height: 0.25 },
            { color: '#0a0a20', height: 0.25 },
            { color: '#0f0f28', height: 0.25 }
        ];
    } else {
        // 5-Level progression with FLAT bands
        const skyLevel = Math.min(5, level);

        if (skyLevel === 1) { // Morning - bright blue bands
            bands = [
                { color: '#3a80c9', height: 0.2 },
                { color: '#5a9fd9', height: 0.25 },
                { color: '#7bbfeb', height: 0.25 },
                { color: '#9dd5f5', height: 0.3 }
            ];
        } else if (skyLevel === 2) { // Afternoon - warm blue to yellow
            bands = [
                { color: '#2a6bb8', height: 0.2 },
                { color: '#4a8bc8', height: 0.25 },
                { color: '#7ab5d8', height: 0.25 },
                { color: '#d4c87c', height: 0.3 }
            ];
        } else if (skyLevel === 3) { // Sunset - purple/orange bands
            bands = [
                { color: '#3a4558', height: 0.2 },
                { color: '#8b49a6', height: 0.2 },
                { color: '#d74c3c', height: 0.25 },
                { color: '#e38c22', height: 0.35 }
            ];
        } else if (skyLevel === 4) { // Dusk - purple bands
            bands = [
                { color: '#15152e', height: 0.25 },
                { color: '#2a2a4e', height: 0.25 },
                { color: '#3a2f5b', height: 0.25 },
                { color: '#2d1b4e', height: 0.25 }
            ];
        } else { // Night - dark blue bands
            bands = [
                { color: '#080812', height: 0.25 },
                { color: '#101025', height: 0.25 },
                { color: '#151535', height: 0.25 },
                { color: '#1a1a40', height: 0.25 }
            ];
        }
    }

    // Draw flat color bands (Paper Mario style - NO gradients!)
    let yPos = 0;
    for (const band of bands) {
        const bandHeight = gameHeight * band.height;
        ctx.fillStyle = band.color;
        ctx.fillRect(0, yPos, gameWidth, bandHeight + 1); // +1 to avoid gaps
        yPos += bandHeight;
    }

    // Floating crypto symbols (subtle background layer)
    if (!isBearMarket && !(boss && boss.active)) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < floatingSymbols.length; i++) {
            const s = floatingSymbols[i];
            const wobbleY = Math.sin(s.wobble) * 5;
            ctx.globalAlpha = s.alpha;
            ctx.font = `bold ${s.size}px Arial`;
            ctx.fillStyle = level >= 4 ? '#8888aa' : '#aabbcc';
            ctx.fillText(s.symbol, s.x, s.y + wobbleY);
        }
        ctx.globalAlpha = 1;
    }

    // 2. Stars for night/boss - Paper Mario style with twinkle
    const isNight = level >= 5 || (boss && boss.active);

    if (isNight && !isBearMarket) {
        ctx.fillStyle = '#ffffcc';
        ctx.lineWidth = 1;
        for (let i = 0; i < 40; i++) {
            const sx = (i * 137 + level * 50) % gameWidth;
            const sy = (i * 89 + level * 30) % (gameHeight * 0.6);
            const baseSize = (i % 3) + 2;
            // Twinkle effect: each star has unique phase offset
            const twinkle = Math.sin(skyTime * (2 + i * 0.3) + i * 1.7);
            const alpha = 0.4 + (i % 4) * 0.1 + twinkle * 0.25;
            const size = baseSize * (1 + twinkle * 0.15);
            ctx.globalAlpha = Math.max(0.15, alpha);

            // 4-point star shape (Paper Mario style)
            if (i % 3 === 0) {
                ctx.beginPath();
                ctx.moveTo(sx, sy - size);
                ctx.lineTo(sx + size * 0.3, sy);
                ctx.lineTo(sx + size, sy);
                ctx.lineTo(sx + size * 0.3, sy);
                ctx.lineTo(sx, sy + size);
                ctx.lineTo(sx - size * 0.3, sy);
                ctx.lineTo(sx - size, sy);
                ctx.lineTo(sx - size * 0.3, sy);
                ctx.closePath();
                ctx.fill();
            } else {
                // Simple dot
                ctx.beginPath();
                ctx.arc(sx, sy, size * 0.6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }

    // 2.5 Paper Mario PARALLAX HILLS - flat silhouettes with outlines
    if (!boss || !boss.active) { // No hills during boss (space)
        const hillColors = isBearMarket
            ? ['#1a0808', '#250c0c', '#301010'] // Dark red layers
            : level >= 4
                ? ['#151530', '#1a1a40', '#202050'] // Night purple
                : level >= 3
                    ? ['#4a3040', '#5a3848', '#6a4050'] // Sunset pink
                    : ['#3a6080', '#4a7090', '#5a80a0']; // Day blue

        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;

        for (let idx = 0; idx < hills.length; idx++) {
            const h = hills[idx];
            const color = hillColors[idx] || hillColors[0];
            const y = h.y;

            ctx.fillStyle = color;

            // Draw wavy hill silhouette + outline in single pass
            ctx.beginPath();
            ctx.moveTo(-10, gameHeight + 10);

            // Create rolling hills with sine wave (larger step = fewer calculations)
            for (let x = -10; x <= gameWidth + 10; x += 30) {
                const waveY = y + Math.sin((x + h.offset) * 0.02) * 25
                            + Math.sin((x + h.offset) * 0.01 + idx) * 15;
                ctx.lineTo(x, waveY);
            }

            ctx.lineTo(gameWidth + 10, gameHeight + 10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke(); // Stroke the entire shape (simpler than separate outline)
        }
    }

    // 3. Clouds - Paper Mario style FLAT with bold outlines
    const showClouds = !(boss && boss.active) && level < 5;
    if (showClouds) {
        const cloudAlpha = level >= 4 ? 0.4 : 0.85;
        ctx.globalAlpha = cloudAlpha;

        const shadowColor = isBearMarket ? '#200808' : '#c8d8e8';
        const mainColor = isBearMarket ? '#301010' : '#f0f8ff';
        const strokeColor = isBearMarket ? '#401515' : '#8090a0';

        for (let i = 0; i < clouds.length; i++) {
            const c = clouds[i];

            // Cloud shadow
            ctx.fillStyle = shadowColor;
            ctx.beginPath();
            ctx.ellipse(c.x, c.y + 3, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Main cloud
            ctx.fillStyle = mainColor;
            ctx.beginPath();
            ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2.2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Outline
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.stroke(); // Reuse last path
        }
        ctx.globalAlpha = 1;
    }

    // ⚡ Lightning Flash Overlay
    if (lightningFlash > 0) {
        // Screen flash
        ctx.fillStyle = `rgba(200, 150, 255, ${lightningFlash * 0.6})`;
        ctx.fillRect(0, 0, gameWidth, gameHeight);

        // Draw actual lightning bolts
        if (lightningFlash > 0.15) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${lightningFlash * 2})`;
            ctx.lineWidth = 3;
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 15;

            // Draw 2-3 lightning bolts
            for (let bolt = 0; bolt < 2; bolt++) {
                const startX = gameWidth * 0.2 + bolt * gameWidth * 0.5 + Math.random() * 50;
                let x = startX;
                let y = 0;

                ctx.beginPath();
                ctx.moveTo(x, y);

                while (y < gameHeight * 0.4) {
                    x += (Math.random() - 0.5) * 40;
                    y += 20 + Math.random() * 30;
                    ctx.lineTo(x, y);

                    // Branch occasionally
                    if (Math.random() < 0.3) {
                        const branchX = x + (Math.random() - 0.5) * 60;
                        const branchY = y + 30 + Math.random() * 20;
                        ctx.moveTo(x, y);
                        ctx.lineTo(branchX, branchY);
                        ctx.moveTo(x, y);
                    }
                }
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }
    }
}

const MAX_FLOATING_TEXTS = 3; // Limit simultaneous floating texts
function addText(text, x, y, c, size = 20) {
    // Remove oldest if at limit
    if (floatingTexts.length >= MAX_FLOATING_TEXTS) {
        floatingTexts.shift();
    }
    floatingTexts.push({ text, x, y, c, size, life: 1.0 });
}
function updateFloatingTexts(dt) {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].y -= 50 * dt;
        floatingTexts[i].life -= dt;
        if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
    }
}
// --- PARTICLES (Optimized) ---
const MAX_PARTICLES = 80;

function addParticle(p) {
    if (particles.length >= MAX_PARTICLES) return false;
    particles.push(p);
    return true;
}

function createBulletSpark(x, y) {
    // Simplified spark effect - fewer particles, simpler shapes
    const count = Math.min(4, MAX_PARTICLES - particles.length);
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 150 + 80;
        addParticle({
            x: x, y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.2, maxLife: 0.2,
            color: '#fff',
            size: Math.random() * 3 + 2
        });
    }
}

// Muzzle flash particles when player fires
// Power-up pickup burst effect
function createPowerUpPickupEffect(x, y, color) {
    const available = MAX_PARTICLES - particles.length;
    if (available <= 0) return;

    // Expanding ring
    addParticle({
        x: x, y: y, vx: 0, vy: 0,
        life: 0.3, maxLife: 0.3,
        color: color, size: 20,
        isRing: true
    });

    // Star burst pattern
    const count = Math.min(8, available - 1);
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i;
        const speed = Math.random() * 150 + 100;
        addParticle({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.4,
            maxLife: 0.4,
            color: i % 2 === 0 ? color : '#fff',
            size: Math.random() * 5 + 3
        });
    }

    // Center flash
    addParticle({
        x: x, y: y, vx: 0, vy: 0,
        life: 0.15, maxLife: 0.15,
        color: '#fff', size: 15,
        isRing: true
    });
}

function createMuzzleFlashParticles(x, y, color) {
    const available = MAX_PARTICLES - particles.length;
    if (available <= 0) return;

    const count = Math.min(5, available);

    // Upward sparks (following bullet direction)
    for (let i = 0; i < count; i++) {
        const spread = (Math.random() - 0.5) * 0.8; // Slight horizontal spread
        const speed = Math.random() * 200 + 150;
        addParticle({
            x: x + (Math.random() - 0.5) * 8,
            y: y,
            vx: spread * speed,
            vy: -speed * 0.6, // Upward bias
            life: 0.15,
            maxLife: 0.15,
            color: i < 2 ? '#fff' : color, // Mix white and colored
            size: Math.random() * 4 + 2
        });
    }

    // Quick flash ring
    if (available > count) {
        addParticle({
            x: x, y: y, vx: 0, vy: 0,
            life: 0.08, maxLife: 0.08,
            color: color, size: 8,
            isRing: true
        });
    }
}

function createExplosion(x, y, color, count = 12) {
    // Enhanced explosion with rings and varied particles
    const available = MAX_PARTICLES - particles.length;
    if (available <= 0) return;

    const actualCount = Math.min(count, Math.floor(available * 0.6));

    // Core explosion particles (varied sizes for depth)
    for (let i = 0; i < actualCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 280 + 80;
        const sizeVariant = i < actualCount / 3 ? 7 : (i < actualCount * 2/3 ? 5 : 3);
        addParticle({
            x: x + (Math.random() - 0.5) * 10,
            y: y + (Math.random() - 0.5) * 10,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.45, maxLife: 0.45,
            color: color,
            size: sizeVariant + Math.random() * 2
        });
    }

    // White spark highlights
    const highlightCount = Math.min(4, available - actualCount);
    for (let i = 0; i < highlightCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 120 + 60;
        addParticle({
            x: x, y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.25, maxLife: 0.25,
            color: '#fff',
            size: Math.random() * 4 + 2
        });
    }

    // Outer flash ring (colored, large)
    addParticle({
        x: x, y: y, vx: 0, vy: 0,
        life: 0.15, maxLife: 0.15,
        color: color, size: 25,
        isRing: true
    });

    // Inner flash ring (white, smaller, faster)
    addParticle({
        x: x, y: y, vx: 0, vy: 0,
        life: 0.1, maxLife: 0.1,
        color: '#fff', size: 12,
        isRing: true
    });
}

// Enhanced explosion for enemy deaths with flying currency symbols
function createEnemyDeathExplosion(x, y, color, symbol) {
    // Base explosion (smaller, since we're adding more effects)
    createExplosion(x, y, color, 8);

    const available = MAX_PARTICLES - particles.length;
    if (available <= 2) return;

    // Flying currency symbols (3 symbols spinning outward)
    const symbolCount = Math.min(3, available - 2);
    for (let i = 0; i < symbolCount; i++) {
        const angle = (Math.PI * 2 / symbolCount) * i + Math.random() * 0.5;
        const speed = Math.random() * 150 + 100;
        addParticle({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 50, // Slight upward bias
            life: 0.7,
            maxLife: 0.7,
            color: color,
            size: 18 + Math.random() * 6, // Font size
            symbol: symbol,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 15 // Random spin direction
        });
    }

    // Debris chunks (colored fragments)
    const debrisCount = Math.min(4, available - symbolCount);
    for (let i = 0; i < debrisCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 200 + 120;
        addParticle({
            x: x + (Math.random() - 0.5) * 15,
            y: y + (Math.random() - 0.5) * 15,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.35,
            maxLife: 0.35,
            color: color,
            size: Math.random() * 6 + 4
        });
    }
}

// EPIC Boss death explosion - massive with flying $ symbols
function createBossDeathExplosion(x, y) {
    // Multiple explosion waves
    createExplosion(x, y, '#ff0000', 20);
    createExplosion(x - 40, y - 30, '#f39c12', 12);
    createExplosion(x + 40, y - 30, '#f39c12', 12);
    createExplosion(x, y + 40, '#2ecc71', 10);

    const available = MAX_PARTICLES - particles.length;
    if (available <= 5) return;

    // Flying $ symbols in all directions
    const symbolCount = Math.min(8, Math.floor(available * 0.4));
    const symbols = ['$', '€', '¥', '£', '₣'];
    for (let i = 0; i < symbolCount; i++) {
        const angle = (Math.PI * 2 / symbolCount) * i + Math.random() * 0.3;
        const speed = Math.random() * 200 + 150;
        addParticle({
            x: x + (Math.random() - 0.5) * 40,
            y: y + (Math.random() - 0.5) * 40,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 80,
            life: 1.2,
            maxLife: 1.2,
            color: ['#2ecc71', '#f39c12', '#e74c3c', '#fff'][i % 4],
            size: 24 + Math.random() * 12,
            symbol: symbols[i % symbols.length],
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 20
        });
    }

    // Big flash rings
    addParticle({
        x: x, y: y, vx: 0, vy: 0,
        life: 0.4, maxLife: 0.4,
        color: '#fff', size: 60,
        isRing: true
    });
    addParticle({
        x: x, y: y, vx: 0, vy: 0,
        life: 0.3, maxLife: 0.3,
        color: '#ff0000', size: 80,
        isRing: true
    });
    addParticle({
        x: x, y: y, vx: 0, vy: 0,
        life: 0.5, maxLife: 0.5,
        color: '#f39c12', size: 100,
        isRing: true
    });

    // Extra debris
    const debrisCount = Math.min(10, available - symbolCount - 3);
    for (let i = 0; i < debrisCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 350 + 100;
        addParticle({
            x: x + (Math.random() - 0.5) * 60,
            y: y + (Math.random() - 0.5) * 60,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.6,
            maxLife: 0.6,
            color: ['#ff0000', '#f39c12', '#2ecc71', '#fff'][i % 4],
            size: Math.random() * 8 + 4
        });
    }
}

function createScoreParticles(x, y, color) {
    const count = Math.min(3, MAX_PARTICLES - particles.length); // Reduced from 5
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 100 + 50;
        addParticle({
            x: x, y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.2, maxLife: 1.2, // Slightly shorter
            color: color || '#FFD700',
            size: Math.random() * 4 + 2,
            target: { x: gameWidth / 2, y: 30 }
        });
    }
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        if (p.target) {
            // Homing Logic (Score Particles)
            const dx = p.target.x - p.x;
            const dy = p.target.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 30) {
                particles.splice(i, 1);
                continue;
            }

            // Steer towards target
            const accel = 1500 * dt / dist;
            p.vx += dx * accel;
            p.vy += dy * accel;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.size = Math.max(1, p.size * 0.95);
        } else {
            // Standard Physics
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            // Rotate symbols, shrink regular particles
            if (p.symbol) {
                p.rotation = (p.rotation || 0) + (p.rotSpeed || 5) * dt;
            } else {
                p.size *= 0.92; // Slightly slower shrink
            }

            // Remove dead or offscreen particles
            if (p.life <= 0 || p.x < -50 || p.x > gameWidth + 50 || p.y > gameHeight + 50) {
                particles.splice(i, 1);
            }
        }
    }
}

function drawParticles(ctx) {
    // Optimized particle drawing - simplified shapes
    const len = particles.length;
    if (len === 0) return;

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#111';

    for (let i = 0; i < len; i++) {
        const p = particles[i];

        // Skip offscreen particles (culling)
        if (p.x < -20 || p.x > gameWidth + 20 || p.y < -20 || p.y > gameHeight + 20) continue;

        ctx.globalAlpha = p.life / p.maxLife;

        if (p.isRing) {
            // Expanding ring - simplified (single ring)
            const expand = (1 - p.life / p.maxLife) * 35;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size + expand, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = '#111'; // Reset
            ctx.lineWidth = 2;
        } else if (p.symbol) {
            // Symbol particle (flying currency symbols)
            ctx.fillStyle = p.color;
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 2;
            ctx.font = `bold ${Math.floor(p.size)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation || 0);
            ctx.strokeText(p.symbol, 0, 0);
            ctx.fillText(p.symbol, 0, 0);
            ctx.restore();
        } else {
            // All particles are now simple circles with outline
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            if (p.size > 2) ctx.stroke();
        }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}

let lastTime = 0;
let hitStopTimer = 0;
let deathTimer = 0; // 💀 Sequence Timer
let flashRed = 0;
let gameOverPending = false;

function loop(timestamp) {
    const realDt = (timestamp - lastTime) / 1000; // Save real delta before modifying lastTime
    let dt = realDt;
    lastTime = timestamp;
    if (dt > 0.1) dt = 0.1;

    // Death Sequence (uses real time, not slowed time)
    if (deathTimer > 0) {
        deathTimer -= realDt;
        if (deathTimer <= 0) {
            deathTimer = 0;
            executeDeath(); // Trigger actual death logic after slow-mo
        }
    }

    // Bullet Time Logic
    if (hitStopTimer > 0) {
        hitStopTimer -= realDt; // Decrement by real time
        dt *= 0.1; // Slow down game physics
        if (hitStopTimer < 0) hitStopTimer = 0;
    }

    // Remove old "delayed game over" check since executeDeath handles it
    // if (player && player.hp <= 0 && hitStopTimer <= 0 && gameState === 'PLAY') { ... }

    update(dt);
    updatePowerUps(dt);
    updateSky(dt); // ☁️ Always update sky
    draw();
    requestAnimationFrame(loop);
}

// Game Center Mock (replace with Capacitor plugin for iOS)
function submitToGameCenter(scoreValue) {
    // Mock: In production, use Capacitor GameCenter plugin
    // e.g., GameCenter.submitScore({ leaderboardId: 'fiat_invaders_highscore', score: scoreValue });
    console.log('[GameCenter] Score submitted:', scoreValue);
    emitEvent('gamecenter_submit', { score: scoreValue });
}

function triggerGameOver() {
    if (score > highScore) {
        highScore = Math.floor(score);
        localStorage.setItem('fiat_highscore', highScore);
        setUI('highScoreVal', highScore);
        submitToGameCenter(highScore); // Game Center hook
    }
    gameState = 'GAMEOVER';
    setStyle('gameover-screen', 'display', 'flex');
    setUI('finalScore', Math.floor(score));
    if (ui.gameoverMeme) ui.gameoverMeme.innerText = getRandomMeme();

    // Story: Game over dialogue
    if (G.Story) {
        G.Story.onGameOver();
    }
    if (ui.killsVal) ui.killsVal.innerText = killCount;
    if (ui.streakVal) ui.streakVal.innerText = bestStreak;
    setStyle('pause-btn', 'display', 'none');
    audioSys.play('explosion');
}

function updatePowerUps(dt) {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        let p = powerUps[i];
        p.update(dt);
        if (p.markedForDeletion) {
            powerUps.splice(i, 1);
        } else {
            if (Math.abs(p.x - player.x) < 40 && Math.abs(p.y - player.y) < 40) {
                // Pickup effect!
                createPowerUpPickupEffect(p.x, p.y, p.config.color);
                player.upgrade(p.type);
                // Crypto-themed powerup feedback (gold, fixed position)
                const meme = POWERUP_MEMES[p.type] || p.type;
                showPowerUp(meme);
                powerUps.splice(i, 1);
                emitEvent('powerup_pickup', { type: p.type });
            }
        }
    }

    // Player bullets cancel enemy bullets
    if (bullets.length > 0 && enemyBullets.length > 0) {
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            if (!b || b.markedForDeletion) continue;
            const bx = b.x, by = b.y;
            const bHalfW = (b.width || 4) * 0.5;
            const bHalfH = (b.height || 8) * 0.5;

            for (let j = enemyBullets.length - 1; j >= 0; j--) {
                const eb = enemyBullets[j];
                if (!eb || eb.markedForDeletion) continue;
                const hitX = Math.abs(bx - eb.x) < (bHalfW + (eb.width || 4) * 0.5);
                const hitY = Math.abs(by - eb.y) < (bHalfH + (eb.height || 8) * 0.5);
                if (hitX && hitY) {
                    // Collision spark effect
                    createBulletSpark(eb.x, eb.y);

                    eb.markedForDeletion = true;
                    G.Bullet.Pool.release(eb);
                    enemyBullets.splice(j, 1);

                    bulletCancelStreak += 1;
                    bulletCancelTimer = 1.5; // Wider window for aggressive play
                    if (bulletCancelStreak >= 3) { // Easier perk acquisition
                        bulletCancelStreak = 0;
                        applyRandomPerk();
                    }

                    if (!b.penetration) {
                        b.markedForDeletion = true;
                        G.Bullet.Pool.release(b);
                        bullets.splice(i, 1);
                    }
                    break;
                }
            }
        }
    }
}

init();
