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
let canvas, ctx;
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
let clouds = []; // ☁️
let lightningTimer = 0; // ⚡ Bear Market lightning
let lightningFlash = 0;
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
let currentShipIdx = 0;
let lastWavePattern = 'RECT';
let perkChoiceActive = false;
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
let enemyFirePhase = 0;
let enemyFireTimer = 0;
let enemyFireStride = 4; // Increased: fewer enemies per group
let enemyShotsThisTick = 0; // Rate limiter
const MAX_ENEMY_SHOTS_PER_TICK = 2; // Max bullets spawned per frame

// Fiat Kill Counter System - Mini Boss every 100 kills of same type
let fiatKillCounter = { '¥': 0, '₽': 0, '₹': 0, '€': 0, '£': 0, '₣': 0, '₺': 0, '$': 0, '元': 0, 'Ⓒ': 0 };
const MINI_BOSS_THRESHOLD = 100;
let miniBoss = null; // Special boss spawned from kill counter
let weaponDropCount = 0; // Track weapon drops per level
let shipDropCount = 0; // Track ship power-up drops per level

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

const STREAK_MEMES = [
    { at: 5, text: "NICE ENTRY!" },
    { at: 10, text: "WHALE ALERT!" },
    { at: 15, text: "LIQUIDATION SPREE!" },
    { at: 20, text: "MARKET MAKER!" },
    { at: 25, text: "ABSOLUTE UNIT!" },
    { at: 30, text: "GOD MODE!" },
    { at: 40, text: "SATOSHI REBORN!" },
    { at: 50, text: "UNSTOPPABLE!" }
];

function checkStreakMeme() {
    // Streak milestones only (reduced 70% - removed random memes)
    const meme = STREAK_MEMES.find(m => m.at === streak);
    if (meme) {
        showMemePopup(meme.text);
    }
    // Random meme only every 30 kills (was 10)
    else if (killCount > 0 && killCount % 30 === 0) {
        showMemePopup(getRandomMeme());
    }
}

let memePopupTimer = null;
function showMemePopup(text) {
    const el = document.getElementById('meme-popup');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(memePopupTimer);
    memePopupTimer = setTimeout(() => el.classList.remove('show'), 1500);
    audioSys.play('coin'); // Satisfying sound
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
    if (!ui.perkBar) return;
    ui.perkBar.innerHTML = '';

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
    addText(perk.name.toUpperCase(), gameWidth / 2, gameHeight / 2 - 80, '#6aa9ff', 28);
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
            audioSys.init(); // Force Init on first user gesture
            if (audioSys.ctx && audioSys.ctx.state === 'suspended') audioSys.ctx.resume();
            inputSys.trigger('start');
        });
        startBtn.addEventListener('touchstart', (e) => {
            e.stopPropagation(); e.preventDefault();
            audioSys.init();
            if (audioSys.ctx && audioSys.ctx.state === 'suspended') audioSys.ctx.resume();
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

    // GLOBAL AUDIO UNLOCKER: Catch-all for any interaction
    const unlockAudio = () => {
        if (!audioSys.ctx) audioSys.init(); // Force Create
        if (audioSys.ctx && audioSys.ctx.state === 'suspended') {
            audioSys.unlockWebAudio(); // Apply iOS Hack
            audioSys.ctx.resume().then(() => {
                // Audio Unlocked Globally
                updateMuteUI(false);
            });
        }
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('touchend', unlockAudio);

    resize();
    window.addEventListener('resize', resize);
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

function resize() {
    gameHeight = window.innerHeight;
    gameWidth = Math.min(600, window.innerWidth);
    canvas.width = gameWidth; canvas.height = gameHeight;
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
    const LangLabel = document.querySelector('.setting-row span');
    if (LangLabel) LangLabel.innerText = t('LANG') + ":";
}

window.toggleLang = function () { currentLang = (currentLang === 'EN') ? 'IT' : 'EN'; updateUIText(); };
window.toggleSettings = function () { setStyle('settings-modal', 'display', (document.getElementById('settings-modal').style.display === 'flex') ? 'none' : 'flex'); updateUIText(); };
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
    audioSys.init(); // Ensure Context is ready
    audioSys.startMusic(); // START THE BEAT
    audioSys.play('coin');
    window.scrollTo(0, 0);
    setStyle('intro-screen', 'display', 'none');

    // Update Mute Icon since startMusic resumes context
    const muteBtn = document.getElementById('mute-btn');
    if (muteBtn && audioSys.ctx && audioSys.ctx.state === 'running') muteBtn.innerText = '🔊';

    setStyle('hangar-screen', 'display', 'flex');
    gameState = 'HANGAR';
    initSky(); // Start BG effect early
}

// Ship launch animation - goes directly to game (skips hangar)
let isLaunching = false;
window.launchShipAndStart = function () {
    if (isLaunching) return; // Prevent double-click
    isLaunching = true;

    audioSys.init();
    audioSys.play('coin');

    // Trigger ship launch animation
    const shipCanvas = document.getElementById('intro-ship-canvas');
    if (shipCanvas) {
        shipCanvas.classList.add('launching');
    }

    // Play launch sound
    setTimeout(() => audioSys.play('shoot'), 100);
    setTimeout(() => audioSys.play('shoot'), 200);
    setTimeout(() => audioSys.play('shoot'), 300);

    // Close curtain after ship starts moving
    const curtain = document.getElementById('curtain-overlay');
    setTimeout(() => {
        if (curtain) curtain.classList.remove('open');
    }, 400);

    // Wait for curtain to close, then start game directly
    setTimeout(() => {
        isLaunching = false;
        if (shipCanvas) shipCanvas.classList.remove('launching');

        // Configure player with selected ship and start game
        const selectedShipKey = SHIP_KEYS[selectedShipIndex];
        player.configure(selectedShipKey);

        audioSys.startMusic();
        setStyle('intro-screen', 'display', 'none');
        initSky(); // Initialize sky background
        startGame();

        // Reopen curtain after game starts
        setTimeout(() => {
            if (curtain) curtain.classList.add('open');
        }, 100);
    }, 1200);
}
window.togglePause = function () {
    if (gameState === 'PLAY' || gameState === 'INTERMISSION') { gameState = 'PAUSE'; setStyle('pause-screen', 'display', 'flex'); setStyle('pause-btn', 'display', 'none'); }
    else if (gameState === 'PAUSE') { gameState = 'PLAY'; setStyle('pause-screen', 'display', 'none'); setStyle('pause-btn', 'display', 'block'); }
};
window.restartRun = function () {
    setStyle('pause-screen', 'display', 'none');
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
        audioSys.init();
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
    const btn = document.querySelector('.btn-bear');
    if (isBearMarket) {
        document.body.classList.add('bear-mode');
        if (btn) btn.textContent = "HARDCORE";
        audioSys.play('bossSpawn'); // Scary sound
    } else {
        document.body.classList.remove('bear-mode');
        if (btn) btn.textContent = "BEAR MARKET";
    }
};

function updateMuteUI(isMuted) {
    document.querySelectorAll('.mute-toggle').forEach(btn => {
        btn.innerText = isMuted ? '🔇' : '🔊';
        // Optional: Change color or opacity if desired
    });
}

function updateLivesUI() {
    if (!ui.healthBar) return;
    const pct = Math.max(0, (player.hp / player.maxHp) * 100);
    ui.healthBar.style.width = pct + "%";

    // Color Logic
    if (player.hp <= 1 || pct <= 34) {
        ui.healthBar.style.backgroundColor = '#ff0000'; // RED (Critical)
        ui.healthBar.style.boxShadow = '0 0 15px #ff0000';
    } else if (pct <= 67) {
        ui.healthBar.style.backgroundColor = '#F7931A'; // ORANGE (Warn)
        ui.healthBar.style.boxShadow = '0 0 10px #F7931A';
    } else {
        ui.healthBar.style.backgroundColor = '#2ecc71'; // GREEN (Safe)
        ui.healthBar.style.boxShadow = '0 0 10px #2ecc71';
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
    bullets = []; enemies = []; enemyBullets = []; powerUps = []; particles = []; floatingTexts = []; muzzleFlashes = []; boss = null;
    G.enemies = enemies; // Expose for Boss Spawning logic

    waveMgr.reset();
    gridDir = 1;
    // gridSpeed now computed dynamically via getGridSpeed()

    gameState = 'PLAY';
    player.resetState();

    if (isBearMarket) {
        player.hp = 1; // ONE HIT KILL
        player.maxHp = 1; // Full bar but Red (logic handled in updateLivesUI)
        // Bear Market speed handled in getGridSpeed() via 1.3x multiplier
        addText("🩸 SURVIVE THE CRASH 🩸", gameWidth / 2, gameHeight / 2 - 100, '#ff0000', 30);
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
    weaponDropCount = 0; shipDropCount = 0; // Reset drop counters

    updateLivesUI();
    emitEvent('run_start', { bear: isBearMarket });
}

function highlightShip(idx) {
    document.querySelectorAll('.ship-card').forEach((el, i) => {
        el.style.transform = (i === idx) ? "scale(1.1)" : "scale(1)";
        el.style.border = (i === idx) ? "2px solid #00ff00" : "1px solid #333";
    });
}

function startIntermission(msgOverride) {
    gameState = 'INTERMISSION';
    waveMgr.intermissionTimer = 3.0;
    bullets = []; enemyBullets = []; // We can clear immediately or fade out. Simple clear for now.
    // TODO: Release bullets back to pool if clearing? Yes, ideally.
    // For now we just reset array, GC will eat them if we don't recycle, but since pool reserve exists, it's okay for Intermission reset.
    // Ideally loop and release.
    let pool = Constants.MEMES.LOW.concat(Constants.MEMES.HIGH);
    currentMeme = pool[Math.floor(Math.random() * pool.length)];
    let msg = msgOverride || "PREPARING NEXT WAVE...";
    addText(msg, gameWidth / 2, gameHeight / 2 - 80, '#00ff00', 30);
    emitEvent('intermission_start', { level: level, wave: waveMgr.wave });
}

function spawnBoss() {
    boss = new G.Boss(gameWidth, gameHeight);

    // Scale boss HP: bigger boss needs more HP
    boss.hp = 500 + (level * 200) + (marketCycle * 300);
    boss.maxHp = boss.hp;

    enemies = [];
    if (window.Game) window.Game.enemies = enemies;

    addText("FEDERAL RESERVE", gameWidth / 2, gameHeight / 2 - 40, '#FFD700', 40);
    addText("FINAL BOSS", gameWidth / 2, gameHeight / 2, '#ff0000', 30);
    showMemePopup(getPowellMeme());
    shake = 30;
    audioSys.play('bossSpawn');

    // Start with a Powell meme in the ticker
    if (ui.memeTicker) ui.memeTicker.innerText = getPowellMeme();
    memeSwapTimer = 2.0;
}

// Mini-Boss System - Giant fiat currency after 100 kills of same type
function spawnMiniBoss(symbol, color) {
    // Slow down time for dramatic effect
    hitStopTimer = 1.0;

    // Clear regular enemies and bullets for 1v1 fight
    enemyBullets.forEach(b => { b.markedForDeletion = true; G.Bullet.Pool.release(b); });
    enemyBullets = [];

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

    showMemePopup(getFiatDeathMeme());
    addText(`${miniBoss.name} REVENGE!`, gameWidth / 2, gameHeight / 2 - 50, color, 40);
    addText("100 KILLS TRIGGERED!", gameWidth / 2, gameHeight / 2, '#fff', 20);
    shake = 30;
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
    const bulletSpeed = 200 + (miniBoss.phase * 50);

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
        const dmgMult = (runState && runState.getMod) ? runState.getMod('damageMult', 1) : 1;
        let dmg = b.isHodl ? 20 : 10;
        miniBoss.hp -= dmg * dmgMult;
        audioSys.play('hit');

        if (miniBoss.hp <= 0) {
            // Mini-boss defeated!
            score += 2000 * marketCycle;
            updateScore(score);
            createExplosion(miniBoss.x, miniBoss.y, miniBoss.color, 30);
            createExplosion(miniBoss.x - 30, miniBoss.y - 20, '#fff', 15);
            createExplosion(miniBoss.x + 30, miniBoss.y + 20, '#fff', 15);

            addText(miniBoss.name + " DESTROYED!", gameWidth / 2, gameHeight / 2, '#FFD700', 40);
            showMemePopup("FIAT IS DEAD!");
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

    if (ui.memeTicker) {
        memeSwapTimer -= dt;
        if (memeSwapTimer <= 0) {
            // Powell memes during boss fight!
            ui.memeTicker.innerText = (boss && boss.active) ? getPowellMeme() : getRandomMeme();
            memeSwapTimer = (boss && boss.active) ? 2.5 : 5.0; // Faster during boss
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
                level++; setUI('lvlVal', level);
                window.currentLevel = level; // Update global for WaveManager
                weaponDropCount = 0; shipDropCount = 0; // Reset drop counters for new level
                addText("LEVEL " + level, gameWidth / 2, gameHeight / 2 - 50, '#00ff00', 30);
                // gridSpeed now computed dynamically via getGridSpeed()
            }
            const waveNumber = waveMgr.wave;
            let msg = waveNumber === 1 ? t('WAVE1') : (waveNumber === 2 ? t('WAVE2') : t('WAVE3'));
            addText(msg, gameWidth / 2, gameHeight / 2, '#F7931A', 40);

            const spawnData = waveMgr.spawnWave(gameWidth);
            enemies = spawnData.enemies;
            lastWavePattern = spawnData.pattern;
            gridDir = 1;
            emitEvent('wave_start', { wave: waveNumber, level: level, pattern: lastWavePattern });
            if (ui.memeTicker) ui.memeTicker.innerText = getRandomMeme();
        }
    }

    if (gameState === 'PLAY') {
        const newBullets = player.update(dt);
        if (newBullets && newBullets.length > 0) bullets.push(...newBullets);

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
        }

        // Mini-boss update (fiat revenge boss)
        if (miniBoss && miniBoss.active) {
            updateMiniBoss(dt);
        }
    }
    updateFloatingTexts(dt);
    updateParticles(dt);
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
                const dmgMult = (runState && runState.getMod) ? runState.getMod('damageMult', 1) : 1;
                let dmg = b.isHodl ? 2 : 1;
                if (runState && runState.flags && runState.flags.hodlBonus && b.isHodl) dmg += 1;
                boss.damage(dmg * dmgMult);
                if (!b.penetration) {
                    b.markedForDeletion = true;
                    G.Bullet.Pool.release(b);
                    bullets.splice(i, 1);
                }
                if (boss.hp <= 0) {
                    score += 5000; boss.active = false; boss = null; shake = 50; audioSys.play('explosion');
                    updateScore(score);
                    addText("MARKET CONQUERED", gameWidth / 2, gameHeight / 2, '#FFD700', 50);
                    level++; setUI('lvlVal', level);
                    window.currentLevel = level; // Update global for WaveManager

                    // New cycle - increase difficulty
                    marketCycle++;
                    window.marketCycle = marketCycle; // Update global
                    waveMgr.reset();
                    // gridSpeed now computed dynamically via getGridSpeed()

                    // Warn player about increased difficulty
                    setTimeout(() => {
                        showMemePopup("CYCLE " + marketCycle + " - HARDER!");
                    }, 1500);

                    startIntermission("MARKET CYCLE " + marketCycle);
                    emitEvent('boss_killed', { level: level, cycle: marketCycle });
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
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let eb = enemyBullets[i];
        if (!eb) { enemyBullets.splice(i, 1); continue; } // Safety check
        eb.update(dt);
        if (eb.markedForDeletion) {
            G.Bullet.Pool.release(eb);
            enemyBullets.splice(i, 1);
        } else {
            const hitR = player.stats.hitboxSize || 30;
            if (Math.abs(eb.x - player.x) < hitR && Math.abs(eb.y - player.y) < hitR) {
                if (player.takeDamage()) {
                    updateLivesUI();
                    G.Bullet.Pool.release(eb);
                    enemyBullets.splice(i, 1);
                    shake = 20;
                    bulletCancelStreak = 0;
                    bulletCancelTimer = 0;
                    emitEvent('player_hit', { hp: player.hp, maxHp: player.maxHp });

                    if (player.hp <= 0) {
                        startDeathSequence();
                    } else {
                        hitStopTimer = 0.3; // Normal Hit SlowMo
                    }
                    streak = 0;
                }
            }
        }
    }
}

function checkBulletCollisions(b, bIdx) {
    for (let j = enemies.length - 1; j >= 0; j--) {
        let e = enemies[j];
        if (Math.abs(b.x - e.x) < 35 && Math.abs(b.y - e.y) < 35) {
            const dmgMult = (runState && runState.getMod) ? runState.getMod('damageMult', 1) : 1;
            let dmg = 10 * dmgMult;
            if (runState && runState.flags && runState.flags.hodlBonus && b.isHodl) dmg += 10;
            e.hp -= dmg; audioSys.play('hit');
            if (e.hp <= 0) {
                enemies.splice(j, 1);
                audioSys.play('coin');
                const mult = (runState && runState.getMod) ? runState.getMod('scoreMult', 1) : 1;
                score += e.scoreVal * (isBearMarket ? 2 : 1) * mult;
                updateScore(score);
                createExplosion(e.x, e.y, e.color, 12);
                createScoreParticles(e.x, e.y, e.color); // JUICE: Fly to score
                pushScoreTicker(`${e.symbol} +${e.scoreVal}`);
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

                // DROP LOGIC - Two categories: Weapons (WIDE/NARROW/FIRE) and Ship (SPEED/RAPID/SHIELD)
                // Limited drops per level: Level 1 = 1 each, Level 2+ = 2 each max
                const weaponTypes = ['WIDE', 'NARROW', 'FIRE'];
                const shipTypes = ['SPEED', 'RAPID', 'SHIELD'];
                const maxPerLevel = level === 1 ? 1 : 2;
                const dropChance = 0.04; // 4% flat chance

                // Try weapon drop (only if under limit)
                if (weaponDropCount < maxPerLevel && Math.random() < dropChance) {
                    const type = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
                    powerUps.push(new G.PowerUp(e.x, e.y, type));
                    weaponDropCount++;
                }
                // Try ship power-up drop (only if under limit, separate roll)
                if (shipDropCount < maxPerLevel && Math.random() < dropChance) {
                    const type = shipTypes[Math.floor(Math.random() * shipTypes.length)];
                    powerUps.push(new G.PowerUp(e.x + 20, e.y, type));
                    shipDropCount++;
                }
            }
            if (!b.penetration) {
                b.markedForDeletion = true; // Let the loop handle release on next frame (safer) or do manual release here if careful
                // Since we return, the calling loop won't see this bullet again for this frame logic.
                // Correct logic:
                G.Bullet.Pool.release(b);
                bullets.splice(bIdx, 1);
            }
            return;
        }
    }
}

function updateEnemies(dt) {
    let hitEdge = false;
    const currentGridSpeed = getGridSpeed(); // Dynamic grid speed

    // Reset rate limiter each frame
    enemyShotsThisTick = 0;

    enemyFireTimer -= dt;
    if (enemyFireTimer <= 0) {
        enemyFireTimer = 0.35; // Slower phase rotation (was 0.25)
        enemyFirePhase = (enemyFirePhase + 1) % enemyFireStride;
    }

    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        e.update(dt, totalTime, lastWavePattern, currentGridSpeed, gridDir);
        if ((gridDir === 1 && e.x > gameWidth - 20) || (gridDir === -1 && e.x < 20)) hitEdge = true;

        // Rate limit check - skip if we've hit max shots this tick
        if (enemyShotsThisTick >= MAX_ENEMY_SHOTS_PER_TICK) continue;

        // Unified difficulty scaling
        const diff = getDifficulty();
        const bearMult = isBearMarket ? 1.3 : 1.0;
        const rateMult = (0.5 + diff * 0.5) * bearMult; // 0.5 → 1.0 based on difficulty
        const bulletSpeed = 150 + diff * 80; // 150 → 230
        const aimSpreadMult = isBearMarket ? 0.85 : (1.2 - diff * 0.3); // Tighter aim with difficulty
        const allowFire = (i % enemyFireStride) === enemyFirePhase;
        const bulletData = e.attemptFire(dt, player, rateMult, bulletSpeed, aimSpreadMult, allowFire);
        if (bulletData) {
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
        const hitR = (player.stats.hitboxSize || 30) + 10; // Slightly larger for body collision
        if (Math.abs(e.x - player.x) < hitR && Math.abs(e.y - player.y) < hitR) {
            if (player.takeDamage()) {
                updateLivesUI();
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
        player.invulnTimer = 3.0;
        updateLivesUI();
        addText("RESPAWN!", gameWidth / 2, gameHeight / 2, '#00ff00', 40);
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
        enemies.forEach(e => e.draw(ctx));
        if (boss && boss.active) {
            boss.draw(ctx); // Use new Class draw
        }
        if (miniBoss && miniBoss.active) {
            drawMiniBoss(ctx); // Fiat revenge boss
        }
        bullets.forEach(b => b.draw(ctx));
        enemyBullets.forEach(eb => eb.draw(ctx));
        powerUps.forEach(p => p.draw(ctx)); // <--- DRAW DROPS
        drawParticles(ctx);
        ctx.font = '20px Courier New';
        floatingTexts.forEach(t => { ctx.fillStyle = t.c; ctx.fillText(t.text, t.x, t.y); });
    }
    ctx.restore(); // Restore shake
}

function initSky() {
    clouds = [];
    const count = 20;
    for (let i = 0; i < count; i++) {
        clouds.push({
            x: Math.random() * gameWidth,
            y: Math.random() * gameHeight,
            w: Math.random() * 100 + 50,
            h: Math.random() * 40 + 20,
            speed: Math.random() * 20 + 10,
            layer: Math.floor(Math.random() * 3) // 0, 1, 2 (Depth)
        });
    }
}

function updateSky(dt) {
    if (clouds.length === 0) initSky();
    const speedMult = isBearMarket ? 5.0 : 1.0; // Storm is fast!

    clouds.forEach(c => {
        c.x -= c.speed * (c.layer + 1) * 0.5 * speedMult * dt;
        if (c.x + c.w < 0) {
            c.x = gameWidth + 50;
            c.y = Math.random() * gameHeight;
        }
    });

    // ⚡ Bear Market Lightning
    if (isBearMarket && gameState === 'PLAY') {
        lightningTimer -= dt;
        if (lightningTimer <= 0) {
            lightningFlash = 0.3; // Flash intensity
            lightningTimer = 2 + Math.random() * 4; // Next lightning in 2-6 seconds
            audioSys.play('hit'); // Thunder sound
        }
    }
    if (lightningFlash > 0) lightningFlash -= dt * 2; // Fade out quickly
}

function drawSky(ctx) {
    // 1. Sky Gradient - 5 levels from bright day to night, boss = space
    const grad = ctx.createLinearGradient(0, 0, 0, gameHeight);

    if (isBearMarket) {
        // Bear Market: Dark Storm
        grad.addColorStop(0, '#1a0000');
        grad.addColorStop(0.5, '#4a0000');
        grad.addColorStop(1, '#000000');
    } else if (boss && boss.active) {
        // Boss: Deep Space with stars
        grad.addColorStop(0, '#000005');
        grad.addColorStop(1, '#0a0a15');
    } else {
        // 5-Level progression: Day → Afternoon → Sunset → Dusk → Night
        const skyLevel = Math.min(5, level); // Cap at 5 for cycle

        if (skyLevel === 1) { // Bright blue sky (morning)
            grad.addColorStop(0, '#4a90d9');
            grad.addColorStop(0.5, '#87ceeb');
            grad.addColorStop(1, '#b0e0e6');
        } else if (skyLevel === 2) { // Afternoon (warmer blue)
            grad.addColorStop(0, '#3a7bc8');
            grad.addColorStop(0.5, '#6bb3d9');
            grad.addColorStop(1, '#f0e68c');
        } else if (skyLevel === 3) { // Sunset (orange/pink)
            grad.addColorStop(0, '#4a5568');
            grad.addColorStop(0.3, '#9b59b6');
            grad.addColorStop(0.6, '#e74c3c');
            grad.addColorStop(1, '#f39c12');
        } else if (skyLevel === 4) { // Dusk (purple/dark blue)
            grad.addColorStop(0, '#1a1a3e');
            grad.addColorStop(0.5, '#4a3f6b');
            grad.addColorStop(1, '#2d1b4e');
        } else { // Level 5+: Night
            grad.addColorStop(0, '#0a0a15');
            grad.addColorStop(0.5, '#151530');
            grad.addColorStop(1, '#1a1a2e');
        }
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    // 2. Clouds (fade out as it gets darker) or stars for night/boss
    const isNight = level >= 5 || (boss && boss.active);

    if (isNight && !isBearMarket) {
        // Draw stars instead of clouds
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 50; i++) {
            const sx = (i * 137 + level * 50) % gameWidth;
            const sy = (i * 89 + level * 30) % (gameHeight * 0.6);
            const size = (i % 3) + 1;
            ctx.globalAlpha = 0.3 + (i % 5) * 0.1;
            ctx.beginPath();
            ctx.arc(sx, sy, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    clouds.forEach(c => {
        let alpha = 0.08 + (c.layer * 0.04);
        if (boss && boss.active) alpha = 0; // No clouds in space
        if (level >= 4) alpha *= 0.3; // Very faint at dusk/night

        if (alpha > 0) {
            ctx.fillStyle = isBearMarket
                ? `rgba(20, 0, 0, ${0.3 + (c.layer * 0.1)})`
                : `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // ⚡ Lightning Flash Overlay
    if (lightningFlash > 0) {
        ctx.fillStyle = `rgba(200, 150, 255, ${lightningFlash})`;
        ctx.fillRect(0, 0, gameWidth, gameHeight);
    }
}

function addText(text, x, y, c, size = 20) { floatingTexts.push({ text, x, y, c, size, life: 1.0 }); }
function updateFloatingTexts(dt) { for (let i = floatingTexts.length - 1; i >= 0; i--) { floatingTexts[i].y -= 50 * dt; floatingTexts[i].life -= dt; if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1); } }
// --- PARTICLES ---
function createBulletSpark(x, y) {
    // Small spark effect for bullet-on-bullet collision
    for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 150 + 80;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.2,
            maxLife: 0.2,
            color: '#fff',
            size: Math.random() * 3 + 1
        });
    }
    // Central flash
    particles.push({
        x: x, y: y, vx: 0, vy: 0,
        life: 0.1, maxLife: 0.1,
        color: '#ffff00', size: 8, isRing: false
    });
}

function createExplosion(x, y, color, count = 15) {
    // Core explosion - big fast particles
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 300 + 100;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.5,
            maxLife: 0.5,
            color: color,
            size: Math.random() * 5 + 3
        });
    }
    // Sparkles - small slow particles
    for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 80 + 30;
        particles.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y + (Math.random() - 0.5) * 20,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.8,
            maxLife: 0.8,
            color: '#fff',
            size: Math.random() * 2 + 1
        });
    }
    // Flash ring
    particles.push({
        x: x,
        y: y,
        vx: 0,
        vy: 0,
        life: 0.15,
        maxLife: 0.15,
        color: '#fff',
        size: 25,
        isRing: true
    });
}

function createScoreParticles(x, y, color) {
    const count = 5; // Bursts of "Score Energy"
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 100 + 50;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.5,
            maxLife: 1.5,
            color: color || '#FFD700', // Gold by default
            size: Math.random() * 4 + 2,
            target: { x: gameWidth / 2, y: 30 } // Target Score UI (Approx)
        });
    }
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];

        if (p.target) {
            // Homing Logic (Score Particles)
            const dx = p.target.x - p.x;
            const dy = p.target.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 30) {
                // Arrived!
                particles.splice(i, 1);
                // Optional: Flash UI?
                const scoreUI = document.getElementById('scoreVal');
                if (scoreUI) {
                    scoreUI.style.color = '#fff';
                    setTimeout(() => scoreUI.style.color = '#F7931A', 50);
                }
                continue;
            }

            // Steer towards target (Accelerate)
            p.vx += (dx / dist) * 1500 * dt;
            p.vy += (dy / dist) * 1500 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.size = Math.max(1, p.size * 0.95); // Dont vanish completely until hit

            // Limit Speed? No, let them zoom!
        } else {
            // Standard Physics
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            p.size *= 0.90; // Shrink fast
            if (p.life <= 0) particles.splice(i, 1);
        }
    }
}

function drawParticles(ctx) {
    // Optimized: single save/restore, no shadowBlur
    if (particles.length === 0) return;
    ctx.save();
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.globalAlpha = p.life / p.maxLife;
        if (p.isRing) {
            // Expanding ring effect
            const expand = (1 - p.life / p.maxLife) * 40;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size + expand, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
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
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    if (dt > 0.1) dt = 0.1;

    // Bullet Time Logic
    if (hitStopTimer > 0) {
        hitStopTimer -= dt; // Decrement by real time
        dt *= 0.1; // Slow down game physics
        if (hitStopTimer < 0) hitStopTimer = 0;
    }

    // Death Sequence
    if (deathTimer > 0) {
        deathTimer -= (timestamp - lastTime) / 1000; // Use REAL time, not scaled dt
        if (deathTimer <= 0) {
            executeDeath(); // Trigger actual death logic after slow-mo
        }
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
                player.upgrade(p.type);
                addText(p.type + "!", player.x, player.y - 40, '#FFD700', 30);
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
