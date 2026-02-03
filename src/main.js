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
setUI('highScoreVal', highScore); // UI Update

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

function checkWeaponUnlocks(cycle) {
    if (cycle > maxCycleReached) {
        maxCycleReached = cycle;
        localStorage.setItem('fiat_maxcycle', maxCycleReached);
        // Check for new unlocks
        for (const [weapon, reqCycle] of Object.entries(WEAPON_UNLOCK_CYCLE)) {
            if (reqCycle === cycle) {
                showGameInfo(`NEW WEAPON UNLOCKED: ${weapon}!`);
                if (G.Audio) G.Audio.play('levelUp');
            }
        }
    }
}

let boss = null;
let score = 0, level = 1, lives = 3;
let lastScoreMilestone = 0; // Track score milestones for pulse effect
let shake = 0, gridDir = 1, gridSpeed = 25, totalTime = 0, intermissionTimer = 0;
// Screen transition moved to TransitionManager.js
let currentShipIdx = 0;
let lastWavePattern = 'RECT';
let perkChoiceActive = false;
let intermissionMeme = ""; // Meme shown during countdown
let debugMode = false; // F3 toggle for performance stats
let fpsHistory = []; // For smooth FPS display
let perkOffers = [];
let volatilityTimer = 0;

// Satoshi's Sacrifice system
let sacrificeState = 'NONE'; // NONE, DECISION, ACTIVE
let sacrificeDecisionTimer = 0;
let sacrificeActiveTimer = 0;
let sacrificeScoreAtStart = 0; // Score when sacrifice activated
let sacrificeScoreEarned = 0; // Score earned during sacrifice
let sacrificeGhostTrail = []; // Ghost position history for trail effect
let memeSwapTimer = 0;
let killCount = 0;
let streak = 0;
let bestStreak = 0;
let marketCycle = 1; // Track completed boss cycles for difficulty scaling
window.marketCycle = marketCycle; // Expose for WaveManager
window.currentLevel = level; // Expose for WaveManager difficulty calculation
// --- BALANCE CONFIG ALIASES (for cleaner code) ---
const Balance = window.Game.Balance;

let bulletCancelStreak = 0;
let bulletCancelTimer = 0;

// --- PERK COOLDOWN ---
let perkCooldown = 0;         // Cooldown timer between perks

// --- PERK PAUSE SYSTEM ---
let perkPauseTimer = 0;       // When > 0, game is paused for perk display
let perkPauseData = null;     // Data about the perk being displayed

// --- BOSS WARNING SYSTEM ---
let bossWarningTimer = 0;     // When > 0, showing boss warning
let bossWarningType = null;   // Boss type to spawn after warning

// --- GRAZING SYSTEM ---
let grazeCount = 0;           // Total graze count this run
let grazeMeter = 0;           // 0-100 meter fill
let grazeMultiplier = 1.0;    // Score multiplier from grazing
let grazePerksThisLevel = 0;  // Track graze perks awarded this level
let lastGrazeSoundTime = 0;   // Throttle graze sound
let lastGrazeTime = 0;        // For decay calculation

// --- KILL STREAK SYSTEM ---
let killStreak = 0;           // Consecutive kills
let killStreakMult = 1.0;     // Current streak multiplier
let lastKillTime = 0;         // Time of last kill (for timeout)

// Wave timing (waveStartTime kept for potential future use)
let waveStartTime = 0;

// Fiat Kill Counter System - Mini Boss every N kills of same type
let fiatKillCounter = { '¥': 0, '₽': 0, '₹': 0, '€': 0, '£': 0, '₣': 0, '₺': 0, '$': 0, '元': 0, 'Ⓒ': 0 };
let miniBoss = null; // Special boss spawned from kill counter

// Drop system now managed by G.DropSystem singleton
// Boss fight drops also managed by G.DropSystem

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
function setStyle(id, prop, val) { const el = document.getElementById(id) || ui[id]; if (el) el.style[prop] = val; }
function setUI(id, val) { const el = document.getElementById(id) || ui[id]; if (el) el.innerText = val; }
function emitEvent(name, payload) { if (events && events.emit) events.emit(name, payload); }
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
    if (G.MessageSystem) G.MessageSystem.draw(ctx, totalTime);
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

    const newMax = (player.stats.hp || 3) + (runState && runState.getMod ? runState.getMod('maxHpBonus', 0) : 0);
    if (newMax !== prevMax) {
        const delta = newMax - prevMax;
        player.maxHp = newMax;
        if (delta > 0) player.hp = Math.min(player.maxHp, player.hp + delta);
    }
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
    const tapBtn = document.getElementById('btn-tap-start');
    if (title) title.classList.add('hidden');
    if (tapBtn) tapBtn.classList.add('hidden');

    // Show selection elements
    const header = document.getElementById('selection-header');
    const info = document.getElementById('selection-info');
    const controls = document.getElementById('selection-controls');
    const arrowLeft = document.getElementById('arrow-left');
    const arrowRight = document.getElementById('arrow-right');

    if (header) header.style.display = 'block';
    if (info) info.style.display = 'block';
    if (controls) controls.style.display = 'flex';
    if (arrowLeft) arrowLeft.classList.add('visible');
    if (arrowRight) arrowRight.classList.add('visible');

    // Update ship display
    updateShipUI();
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
    campaignState.setEnabled(isEnabled);

    // Reset campaign if already complete (fresh start after victory)
    if (isEnabled && campaignState.isCampaignComplete()) {
        campaignState.resetCampaign();
    }

    // Update buttons
    const arcadeBtn = document.getElementById('mode-arcade');
    const campaignBtn = document.getElementById('mode-campaign');
    if (arcadeBtn) arcadeBtn.classList.toggle('active', !isEnabled);
    if (campaignBtn) campaignBtn.classList.toggle('active', isEnabled);

    // Toggle score/progress display (same row, no layout shift)
    const arcadeScoreEl = document.getElementById('arcade-score-display');
    const progressEl = document.getElementById('campaign-progress');
    if (arcadeScoreEl) arcadeScoreEl.style.display = isEnabled ? 'none' : 'block';
    if (progressEl) progressEl.style.display = isEnabled ? 'block' : 'none';

    if (isEnabled) {
        updateCampaignProgressUI();
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
        'scoreVal', 'score-ticker', 'meme-ticker', 'lvlVal', 'weaponName', 'shieldBar', 'healthBar', 'finalScore',
        'highScoreVal', 'version-tag', 'pause-btn', 'lang-btn', 'control-btn', 'joy-deadzone', 'joy-sensitivity',
        'ui-layer', 'touchControls', 'livesText', 'perk-modal', 'perk-options', 'perk-skip', 'perk-bar', 'control-toast',
        'intro-meme', 'gameover-meme', 'killsVal', 'streakVal', 'kill-counter', 'killNum', 'meme-popup'].forEach(id => {
            const key = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase()).replace('screen', '').replace('Val', '').replace('Bar', 'Bar').replace('layer', 'Layer').replace('Text', 'Text');
            ui[key] = document.getElementById(id);
        });

    // Hide HUD initially
    if (ui.uiLayer) ui.uiLayer.style.display = 'none';
    if (ui.touchControls) {
        ui.touchControls.classList.remove('visible');
        ui.touchControls.style.display = 'none';
    }

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
        console.log("Starting App...");
        gameState = 'INTRO';
        introState = 'SPLASH';
        splash.style.opacity = '0';
        audioSys.init();
        setTimeout(() => {
            if (splash) splash.remove();
            setStyle('intro-screen', 'display', 'flex');

            // Init unified intro - show splash elements, hide selection elements
            const title = document.getElementById('intro-title');
            const tapBtn = document.getElementById('btn-tap-start');
            const header = document.getElementById('selection-header');
            const info = document.getElementById('selection-info');
            const controls = document.getElementById('selection-controls');

            if (title) title.classList.remove('hidden');
            if (tapBtn) tapBtn.classList.remove('hidden');
            if (header) header.style.display = 'none';
            if (info) info.style.display = 'none';
            if (controls) controls.style.display = 'none';

            try { updateUIText(); } catch (e) { }
            initIntroShip();

            // Initialize sky background for INTRO state
            if (G.SkyRenderer) G.SkyRenderer.init(gameWidth, gameHeight);

            // Restore campaign mode UI state
            if (G.CampaignState && G.CampaignState.isEnabled()) {
                setGameMode('campaign');
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
        else if (gameState === 'PLAY' || gameState === 'PAUSE') togglePause();
        else if (gameState === 'SETTINGS') backToIntro();
    });

    inputSys.on('start', () => {
        if (gameState === 'VIDEO') startApp();
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
        console.log('Debug mode:', debugMode ? 'ON' : 'OFF');
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

        // Init unified intro
        const title = document.getElementById('intro-title');
        const tapBtn = document.getElementById('btn-tap-start');
        const header = document.getElementById('selection-header');
        const info = document.getElementById('selection-info');
        const controls = document.getElementById('selection-controls');

        if (title) title.classList.remove('hidden');
        if (tapBtn) tapBtn.classList.remove('hidden');
        if (header) header.style.display = 'none';
        if (info) info.style.display = 'none';
        if (controls) controls.style.display = 'none';

        updateUIText();
        gameState = 'INTRO';
        introState = 'SPLASH';
        initIntroShip();
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

    // Update ParticleSystem dimensions
    if (G.ParticleSystem) {
        G.ParticleSystem.setDimensions(gameWidth, gameHeight);
    }
    // Update EffectsRenderer dimensions
    if (G.EffectsRenderer) {
        G.EffectsRenderer.setDimensions(gameWidth, gameHeight);
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

    // Manual (if open, update text)
    updateManualText();
}

window.toggleLang = function () { currentLang = (currentLang === 'EN') ? 'IT' : 'EN'; updateUIText(); };
window.toggleSettings = function () { setStyle('settings-modal', 'display', (document.getElementById('settings-modal').style.display === 'flex') ? 'none' : 'flex'); updateUIText(); };
window.toggleHelpPanel = function () {
    const panel = document.getElementById('help-panel');
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
    gameState = 'HANGAR';
    if (G.SkyRenderer) G.SkyRenderer.init(gameWidth, gameHeight); // Start BG effect early
    if (G.MessageSystem) G.MessageSystem.init(gameWidth, gameHeight, {
        onShake: (intensity) => { shake = Math.max(shake, intensity); },
        onPlaySound: (sound) => { if (audioSys) audioSys.play(sound); }
    });
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
        '.selection-controls',
        '.selection-info',
        '.selection-header',
        '.intro-title',
        '.btn-tap-start'
    ];

    let explodeDelay = 0;
    elementsToExplode.forEach(selector => {
        const el = document.querySelector(selector);
        if (el && isVisible(el)) {
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
        if (ui.touchControls) {
            ui.touchControls.classList.remove('visible');
            ui.touchControls.style.display = 'none';
        }
        closePerkChoice();
        setStyle('intro-screen', 'display', 'flex');
        gameState = 'INTRO';
        introState = 'SPLASH';

        // Reset to splash state (unified intro)
        const title = document.getElementById('intro-title');
        const tapBtn = document.getElementById('btn-tap-start');
        const header = document.getElementById('selection-header');
        const info = document.getElementById('selection-info');
        const controls = document.getElementById('selection-controls');
        const arrowLeft = document.getElementById('arrow-left');
        const arrowRight = document.getElementById('arrow-right');

        // Show splash elements
        if (title) title.classList.remove('hidden');
        if (tapBtn) tapBtn.classList.remove('hidden');

        // Hide selection elements
        if (header) header.style.display = 'none';
        if (info) info.style.display = 'none';
        if (controls) controls.style.display = 'none';
        if (arrowLeft) arrowLeft.classList.remove('visible');
        if (arrowRight) arrowRight.classList.remove('visible');

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

    if (runState && runState.reset) runState.reset();
    if (runState && runState.getMod) {
        player.maxHp = (player.stats.hp || 3) + runState.getMod('maxHpBonus', 0);
        player.hp = player.maxHp;
    }
    volatilityTimer = 0;
    bulletCancelStreak = 0;
    bulletCancelTimer = 0;
    perkCooldown = 0;
    memeSwapTimer = Balance.MEMES.TICKER_SWAP_INTERVAL;
    closePerkChoice();
    recentPerks = []; // Reset perk display
    renderPerkBar();

    score = 0; level = 1; lives = 3; setUI('scoreVal', '0'); setUI('lvlVal', '1'); setUI('livesText', lives);
    updateDifficultyCache(); // Initialize difficulty cache for level 1
    audioSys.setLevel(1, true); // Set music theme for level 1 (instant, no crossfade)
    // Clear particles via ParticleSystem
    if (G.ParticleSystem) G.ParticleSystem.clear();
    bullets = []; enemies = []; enemyBullets = []; powerUps = []; particles = []; floatingTexts = []; muzzleFlashes = []; perkIcons = []; boss = null;
    if (G.MessageSystem) G.MessageSystem.reset(); // Reset typed messages
    G.enemies = enemies; // Expose for Boss Spawning logic
    window.enemyBullets = enemyBullets; // Update for Player core hitbox indicator
    grazeCount = 0; grazeMeter = 0; grazeMultiplier = 1.0; updateGrazeUI(); // Reset grazing

    waveMgr.reset();
    gridDir = 1;
    // gridSpeed now computed dynamically via getGridSpeed()

    gameState = 'PLAY';
    player.resetState();

    // Reset campaign if already complete (allow fresh start after victory)
    const campaignState = G.CampaignState;
    if (campaignState && campaignState.isEnabled() && campaignState.isCampaignComplete()) {
        campaignState.resetCampaign();
        updateCampaignProgressUI();
    }

    if (isBearMarket) {
        player.hp = 1; // ONE HIT KILL
        player.maxHp = 1; // Full bar but Red (logic handled in updateLivesUI)
        // Bear Market speed handled in getGridSpeed() via 1.3x multiplier
        showDanger("🩸 SURVIVE THE CRASH 🩸");
    }

    killCount = 0;
    streak = 0;
    bestStreak = 0;
    killStreak = 0;
    killStreakMult = 1.0;
    lastKillTime = 0;
    marketCycle = 1; // Reset cycle
    window.marketCycle = marketCycle;
    window.currentLevel = level; // Reset for WaveManager
    updateKillCounter(); // Reset display

    // Reset fiat kill counter and mini-boss
    fiatKillCounter = { '¥': 0, '₽': 0, '₹': 0, '€': 0, '£': 0, '₣': 0, '₺': 0, '$': 0, '元': 0, 'Ⓒ': 0 };
    miniBoss = null;
    G.DropSystem.reset(); // Reset drop system (pity timer, weapon cooldown, boss drops)
    G.MemeEngine.reset(); // Reset meme engine (ticker timer, popup cooldown)
    grazePerksThisLevel = 0; // Reset graze perk cap
    lastGrazeTime = totalTime; // Reset graze decay to current time
    perkPauseTimer = 0; // Reset perk pause
    perkPauseData = null;
    bossWarningTimer = 0; // Reset boss warning
    bossWarningType = null;

    // Reset wave timing
    waveStartTime = 0;

    // Reset visual effects
    shake = 0;
    totalTime = 0;
    if (G.SkyRenderer) G.SkyRenderer.reset(); // Reset sky state (lightning, etc.)
    if (G.TransitionManager) G.TransitionManager.reset();

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
    waveMgr.intermissionTimer = Balance.TIMING.INTERMISSION_DURATION;
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

function startBossWarning() {
    // Determine boss type for warning display
    const campaignState = G.CampaignState;
    if (campaignState && campaignState.isEnabled()) {
        // Campaign mode: use next unlocked boss
        bossWarningType = campaignState.getNextBoss() || 'FEDERAL_RESERVE';
    } else {
        // Arcade mode: cycle through bosses
        const bossRotation = G.BOSS_ROTATION || ['FEDERAL_RESERVE', 'BCE', 'BOJ'];
        bossWarningType = bossRotation[(marketCycle - 1) % bossRotation.length];
    }

    // Start warning timer
    bossWarningTimer = Balance.BOSS.WARNING_DURATION;

    // Clear remaining enemies and bullets for clean boss entrance
    enemies = [];
    bullets = [];
    enemyBullets.forEach(b => { b.markedForDeletion = true; G.Bullet.Pool.release(b); });
    enemyBullets = [];
    window.enemyBullets = enemyBullets;

    // Play warning sound (use explosion for dramatic effect)
    audioSys.play('explosion');

    // Dramatic screen shake
    shake = 10;
}

function spawnBoss() {
    // Determine boss type based on game mode
    const campaignState = G.CampaignState;
    let bossType;

    if (campaignState && campaignState.isEnabled()) {
        // Campaign mode: fight next unlocked boss
        bossType = campaignState.getNextBoss() || 'FEDERAL_RESERVE';
    } else {
        // Arcade mode: cycle through bosses
        const bossRotation = G.BOSS_ROTATION || ['FEDERAL_RESERVE', 'BCE', 'BOJ'];
        bossType = bossRotation[(marketCycle - 1) % bossRotation.length];
    }

    const bossConfig = G.BOSSES[bossType] || G.BOSSES.FEDERAL_RESERVE;

    // Flash color based on boss via TransitionManager
    const bossFlashColor = bossType === 'BCE' ? '#000033' : (bossType === 'BOJ' ? '#330000' : '#400000');
    if (G.TransitionManager) G.TransitionManager.startFadeOut(0.6, bossFlashColor);

    boss = new G.Boss(gameWidth, gameHeight, bossType);

    // Scale boss HP using Balance config
    const Balance = G.Balance;
    const hpConfig = Balance.BOSS.HP;
    const baseHp = hpConfig.BASE;
    const hpPerLevel = hpConfig.PER_LEVEL;
    const hpPerCycle = hpConfig.PER_CYCLE;

    // Perk-aware scaling: boss gets stronger based on player's accumulated power
    const perkCount = (runState && runState.perks) ? runState.perks.length : 0;
    const perkScaling = 1 + (perkCount * hpConfig.PERK_SCALE);

    // Also scale based on player's damage multiplier (if player hits harder, boss has more HP)
    const playerDmgMult = (runState && runState.getMod) ? runState.getMod('damageMult', 1) : 1;
    const dmgCompensation = Math.sqrt(playerDmgMult); // Square root for softer scaling

    // NG+ scaling (campaign mode)
    const ngPlusMult = (campaignState && campaignState.isEnabled()) ? campaignState.getNGPlusMultiplier() : 1;

    const rawHp = baseHp + (level * hpPerLevel) + ((marketCycle - 1) * hpPerCycle);
    boss.hp = Math.max(hpConfig.MIN_FLOOR, Math.floor(rawHp * perkScaling * dmgCompensation * ngPlusMult));
    boss.maxHp = boss.hp;

    // Reset boss drop tracking for new boss fight
    G.DropSystem.resetBossDrops();

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
    memeSwapTimer = Balance.MEMES.BOSS_TICKER_INTERVAL;

    // Story: Boss intro dialogue
    if (G.Story) {
        G.Story.onBossIntro(bossType);
    }
}

// Mini-Boss System - Giant fiat currency after 100 kills of same type
function spawnMiniBoss(symbol, color) {
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

    // Create mini-boss object with perk-aware scaling
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
    return window.Game.ColorUtils.hexToRgb(hex);
}

function checkMiniBossHit(b) {
    if (!miniBoss || !miniBoss.active) return false;

    if (Math.abs(b.x - miniBoss.x) < 60 && Math.abs(b.y - miniBoss.y) < 60) {
        const baseDmg = player.stats.baseDamage || 14;
        const dmgMult = (runState && runState.getMod) ? runState.getMod('damageMult', 1) : 1;
        let dmg = baseDmg * dmgMult;
        if (b.isHodl) dmg *= Balance.SCORE.HODL_MULT_ENEMY; // HODL bonus vs enemies
        miniBoss.hp -= dmg;
        audioSys.play('hitEnemy');

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
                waveStartTime = totalTime;
            }
            // Update global references
            G.enemies = enemies;
            if (window.Game) window.Game.enemies = enemies;

            // Resume wave spawning
            if (waveMgr) waveMgr.miniBossActive = false;

            miniBoss = null;
        }
        return true;
    }
    return false;
}

function update(dt) {
    if (gameState !== 'PLAY' && gameState !== 'INTERMISSION') return;

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
        showGameInfo("HYPER READY! [H]");
        audioSys.play('hyperReady');
    }

    // Meme ticker: only visible during boss fight (if enabled)
    if (ui.memeTicker) {
        if (boss && boss.active && Balance.HUD_MESSAGES.MEME_TICKER) {
            ui.memeTicker.style.display = 'block';
            memeSwapTimer -= dt;
            if (memeSwapTimer <= 0) {
                ui.memeTicker.innerText = getPowellMeme();
                memeSwapTimer = 4.0;
            }
        } else {
            ui.memeTicker.style.display = 'none';
        }
    }

    const waveAction = waveMgr.update(dt, gameState, enemies.length, !!boss);

    // Boss warning timer countdown
    if (bossWarningTimer > 0) {
        bossWarningTimer -= dt;
        if (bossWarningTimer <= 0) {
            spawnBoss(); // Actually spawn boss after warning
        }
    }

    if (waveAction) {
        if (waveAction.action === 'START_INTERMISSION') {
            startIntermission();
        } else if (waveAction.action === 'SPAWN_BOSS') {
            startBossWarning(); // Start warning instead of immediate spawn
        } else if (waveAction.action === 'START_WAVE') {
            gameState = 'PLAY';
            // Increment level for every wave EXCEPT the very first one (level=1, wave=1)
            const isFirstWaveEver = (level === 1 && waveMgr.wave === 1);
            if (!isFirstWaveEver) {
                level++;
                audioSys.setLevel(level); // Change music theme for new level
                audioSys.play('levelUp'); // Triumphant jingle
                updateLevelUI(); // With animation
                grazePerksThisLevel = 0; // Reset graze perk cap for new level
                showGameInfo("📈 LEVEL " + level);
            }
            const waveNumber = waveMgr.wave;
            const waveMessages = ['WAVE1', 'WAVE2', 'WAVE3', 'WAVE4', 'WAVE5'];
            const msgKey = waveMessages[Math.min(waveNumber - 1, waveMessages.length - 1)];
            showGameInfo(t(msgKey));

            // Update global level BEFORE spawnWave so enemy HP scaling is correct
            window.currentLevel = level;

            const spawnData = waveMgr.spawnWave(gameWidth);
            enemies = spawnData.enemies;
            lastWavePattern = spawnData.pattern;
            gridDir = 1;

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

    if (gameState === 'PLAY') {
        const newBullets = player.update(dt);
        if (newBullets && newBullets.length > 0) {
            bullets.push(...newBullets);
            createMuzzleFlashParticles(player.x, player.y - 25, player.stats.color);
        }

        // HYPER MODE activation (H key or touch button)
        if (inputSys.isDown('KeyH') && player.canActivateHyper && player.canActivateHyper(grazeMeter)) {
            player.activateHyper();
            grazeMeter = 0; // Reset meter on activation
            updateGrazeUI();
            // HYPER activation juice
            triggerScreenFlash('HYPER_ACTIVATE');
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
    updateTypedMessages(dt);
    updatePerkIcons(dt);
    updateParticles(dt);
    if (G.TransitionManager) G.TransitionManager.update(dt);
}

function updateBullets(dt) {
    // Player Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        if (!b) { bullets.splice(i, 1); continue; } // Safety check
        b.update(dt, enemies, boss); // Pass enemies and boss for homing tracking
        if (b.markedForDeletion) {
            G.Bullet.Pool.release(b);
            bullets.splice(i, 1);
        } else {
            if (boss && boss.active && b.x > boss.x && b.x < boss.x + boss.width && b.y > boss.y && b.y < boss.y + boss.height) {
                const baseBossDmg = Math.ceil((player.stats.baseDamage || 14) / 4);
                const dmgMult = (runState && runState.getMod) ? runState.getMod('damageMult', 1) : 1;
                let dmg = baseBossDmg * dmgMult;
                if (b.isHodl) dmg = Math.ceil(dmg * Balance.SCORE.HODL_MULT_BOSS); // HODL bonus vs boss
                if (runState && runState.flags && runState.flags.hodlBonus && b.isHodl) dmg = Math.ceil(dmg * 1.15);
                boss.damage(dmg);
                audioSys.play('hitEnemy');

                // Boss drops power-ups every N hits - delegated to DropSystem
                const bossDropInfo = G.DropSystem.tryBossDrop(boss.x + boss.width / 2, boss.y + boss.height, totalTime, getUnlockedWeapons);
                if (bossDropInfo) {
                    powerUps.push(new G.PowerUp(bossDropInfo.x, bossDropInfo.y, bossDropInfo.type));
                    audioSys.play('coinPerk');
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

                    // Boss defeat juice (Ikeda philosophy - maximum impact)
                    applyHitStop('BOSS_DEFEAT', false); // Long slowmo for epic death
                    triggerScreenFlash('BOSS_DEFEAT');

                    // Victory flash via TransitionManager
                    if (G.TransitionManager) G.TransitionManager.startFadeOut(0.8, '#ffffff');

                    const bossBonus = Balance.SCORE.BOSS_DEFEAT_BASE + (marketCycle * Balance.SCORE.BOSS_DEFEAT_PER_CYCLE);
                    score += bossBonus;
                    createFloatingScore(bossBonus, bossX, bossY - 50); // Boss bonus floating score
                    boss.active = false; boss = null; shake = 60; audioSys.play('explosion');
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

                    // New cycle - increase difficulty (level will increment on next wave start)
                    marketCycle++;
                    window.marketCycle = marketCycle; // Update global
                    checkWeaponUnlocks(marketCycle); // Check for new weapon unlocks
                    waveMgr.reset();

                    // Reset Harmonic Conductor for new wave cycle
                    if (G.HarmonicConductor) {
                        G.HarmonicConductor.setDifficulty(level, marketCycle, isBearMarket);
                        G.HarmonicConductor.currentSequence = null; // Will be set when wave spawns
                    }

                    // Campaign mode: track boss defeat and check for completion
                    const campaignState = G.CampaignState;
                    let campaignComplete = false;
                    if (campaignState && campaignState.isEnabled()) {
                        campaignComplete = campaignState.defeatBoss(defeatedBossType);
                        updateCampaignProgressUI();
                    }

                    if (campaignComplete) {
                        // Campaign complete! Show special victory screen
                        showCampaignVictory();
                    } else {
                        startIntermission("CYCLE " + marketCycle + " BEGINS");
                    }

                    emitEvent('boss_killed', { level: level, cycle: marketCycle, bossType: defeatedBossType, campaignComplete: campaignComplete });

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

    // Enemy Bullets - dual hitbox system: tiny core for damage, larger zone for grazing
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let eb = enemyBullets[i];
        if (!eb) { enemyBullets.splice(i, 1); continue; }
        eb.update(dt);
        if (eb.markedForDeletion) {
            G.Bullet.Pool.release(eb);
            enemyBullets.splice(i, 1);
        } else {
            // Core hitbox for actual damage (tiny)
            // Use dynamic hitbox (larger during HYPER)
            const coreR = player.getCoreHitboxSize ? player.getCoreHitboxSize() : (player.stats.coreHitboxSize || 6);
            // Graze radius - outer zone for grazing points
            const grazeR = coreR + Balance.GRAZE.RADIUS;

            const dx = Math.abs(eb.x - player.x);
            const dy = Math.abs(eb.y - player.y);

            // SACRIFICE MODE: Bullets pass through (total invincibility)
            if (sacrificeState === 'ACTIVE') {
                // No collision, no graze - just walk through bullets
                continue;
            }

            // Check if within core hitbox (take damage)
            if (dx < coreR && dy < coreR) {
                // HYPER MODE: Instant death if hit (bypass lives/shield)
                if (player.isHyperActive && player.isHyperActive()) {
                    player.deactivateHyper();
                    player.hp = 0;
                    G.Bullet.Pool.release(eb);
                    enemyBullets.splice(i, 1);
                    shake = 60;
                    showDanger("HYPER FAILED!");
                    startDeathSequence();
                    return; // Exit collision check
                }

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
                        applyHitStop('PLAYER_HIT', false); // Slowmo on hit
                        triggerScreenFlash('PLAYER_HIT');
                    }
                    streak = 0;
                    killStreak = 0;
                    killStreakMult = 1.0;
                }
            }
            // Check if within graze zone (but not core) - award graze points
            else if (dx < grazeR && dy < grazeR && !eb.grazed) {
                eb.grazed = true; // Mark as grazed to prevent double-counting
                lastGrazeTime = totalTime; // Reset decay timer

                // Close graze: tighter zone, higher reward
                const closeGrazeR = coreR + Balance.GRAZE.CLOSE_RADIUS;
                const isCloseGraze = dx < closeGrazeR && dy < closeGrazeR;
                const grazeBonus = isCloseGraze ? Balance.GRAZE.CLOSE_BONUS : 1;

                // Check if HYPER is active
                const isHyperActive = player.isHyperActive && player.isHyperActive();

                if (isHyperActive) {
                    // HYPER MODE: Extend timer instead of building meter
                    player.extendHyper();

                    // HYPER score multiplier (stacks with graze bonus)
                    const hyperMult = Balance.HYPER.SCORE_MULT;
                    const grazePoints = Math.floor(Balance.GRAZE.POINTS_BASE * hyperMult * grazeBonus);
                    score += grazePoints;
                    updateScore(score);

                    // Intense visual effect during HYPER graze
                    createGrazeSpark(eb.x, eb.y, player.x, player.y, true); // Always golden
                    createGrazeSpark(eb.x, eb.y, player.x, player.y, true); // Double particles

                    // HYPER graze sound (higher pitch)
                    if (totalTime - lastGrazeSoundTime > Balance.GRAZE.SOUND_THROTTLE) {
                        audioSys.play('hyperGraze');
                        lastGrazeSoundTime = totalTime;
                    }
                } else {
                    // Normal graze mode
                    grazeCount += grazeBonus;
                    const meterGain = isCloseGraze ? Balance.GRAZE.METER_GAIN_CLOSE : Balance.GRAZE.METER_GAIN;
                    grazeMeter = Math.min(100, grazeMeter + meterGain);
                    grazeMultiplier = 1 + (grazeMeter / Balance.GRAZE.MULT_DIVISOR) * (Balance.GRAZE.MULT_MAX - 1);

                    // Award graze points (primary score source)
                    const grazePoints = Math.floor(Balance.GRAZE.POINTS_BASE * grazeMultiplier * grazeBonus);
                    score += grazePoints;
                    updateScore(score);

                    // Graze visual effect (bigger for close graze)
                    createGrazeSpark(eb.x, eb.y, player.x, player.y, isCloseGraze);

                    // Close graze hit stop (Ikeda juice - micro-freeze on near miss)
                    if (isCloseGraze) {
                        applyHitStop('CLOSE_GRAZE', true);
                    }

                    // Play graze sound (throttled - using new config value)
                    const soundThrottle = Balance.GRAZE.SOUND_THROTTLE || 0.1;
                    if (totalTime - lastGrazeSoundTime > soundThrottle) {
                        if (isCloseGraze) {
                            audioSys.play('grazeNearMiss'); // Whoosh for close calls
                        } else {
                            audioSys.play('graze'); // Crystalline shimmer with pitch scaling
                        }
                        lastGrazeSoundTime = totalTime;
                    }

                    // Graze streak every 10
                    if (grazeCount > 0 && grazeCount % 10 === 0) {
                        audioSys.play('grazeStreak');
                    }

                    // Perk bonus every Balance.GRAZE.PERK_THRESHOLD (capped per level)
                    if (grazeCount > 0 && grazeCount % Balance.GRAZE.PERK_THRESHOLD === 0) {
                        if (grazePerksThisLevel < Balance.GRAZE.MAX_PERKS_PER_LEVEL) {
                            applyRandomPerk();
                            audioSys.play('grazePerk'); // Triumphant fanfare
                            showMemePopup("GRAZE BONUS!", 1200);
                            grazePerksThisLevel++;
                        } else {
                            // Max graze perks reached, give score instead
                            score += 500;
                            updateScore(score);
                            showGameInfo("+500 GRAZE MASTER");
                        }
                    }

                    // Check if meter is now full (can activate HYPER)
                    if (grazeMeter >= Balance.HYPER.METER_THRESHOLD && player.hyperCooldown <= 0) {
                        if (!player.hyperAvailable) {
                            player.hyperAvailable = true;
                            showGameInfo("HYPER READY! [H]");
                            audioSys.play('hyperReady');
                        }
                    }
                }

                // Update graze HUD
                updateGrazeUI();
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
        ctx.font = `bold ${Math.floor(18 * pulse)}px "Courier New", monospace`;
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
        ctx.font = `bold ${Math.floor(20 * pulse)}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Glow effect
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 15;

        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText('⚡ HYPER READY [H] ⚡', centerX, 70);
        ctx.fillText('⚡ HYPER READY [H] ⚡', centerX, 70);

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
        ctx.font = `bold ${Math.floor(btnSize * 0.5)}px Arial`;
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
        ctx.font = `bold ${Math.floor(config.COUNTDOWN_FONT_SIZE * pulse)}px "Courier New", monospace`;
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

function checkBulletCollisions(b, bIdx) {
    for (let j = enemies.length - 1; j >= 0; j--) {
        let e = enemies[j];
        if (!e) continue; // Safety check: enemy may have been removed during iteration
        if (Math.abs(b.x - e.x) < 40 && Math.abs(b.y - e.y) < 40) { // Adjusted for larger enemies
            const baseDmg = player.stats.baseDamage || 14;
            const dmgMult = (runState && runState.getMod) ? runState.getMod('damageMult', 1) : 1;
            let dmg = baseDmg * dmgMult;
            if (b.isHodl) dmg *= Balance.SCORE.HODL_MULT_ENEMY; // HODL bonus vs enemies
            if (runState && runState.flags && runState.flags.hodlBonus && b.isHodl) dmg *= 1.15; // Stacks with perk

            // Use takeDamage which handles shields
            const shouldDie = e.takeDamage(dmg);
            audioSys.play('hitEnemy');

            if (shouldDie) {
                enemies.splice(j, 1);
                audioSys.play('coinScore');
                applyHitStop('ENEMY_KILL', true); // Micro-freeze on kill

                // Update kill streak
                const now = totalTime;
                if (now - lastKillTime < Balance.SCORE.STREAK_TIMEOUT) {
                    killStreak++;
                    killStreakMult = Math.min(
                        Balance.SCORE.STREAK_MULT_MAX,
                        1 + killStreak * Balance.SCORE.STREAK_MULT_PER_KILL
                    );

                    // Streak milestone effects (Ikeda juice)
                    if (killStreak === 10) {
                        applyHitStop('STREAK_10', false); // Slowmo for milestone
                        triggerScreenFlash('STREAK_10');
                    } else if (killStreak === 25) {
                        applyHitStop('STREAK_25', false);
                        triggerScreenFlash('STREAK_25');
                    } else if (killStreak === 50) {
                        applyHitStop('STREAK_50', false);
                        triggerScreenFlash('STREAK_50');
                    }
                } else {
                    killStreak = 1;
                    killStreakMult = 1.0;
                }
                lastKillTime = now;

                // Calculate score with all multipliers
                const perkMult = (runState && runState.getMod) ? runState.getMod('scoreMult', 1) : 1;
                const bearMult = isBearMarket ? Balance.SCORE.BEAR_MARKET_MULT : 1;
                const grazeKillBonus = grazeMeter >= Balance.SCORE.GRAZE_KILL_THRESHOLD
                    ? Balance.SCORE.GRAZE_KILL_BONUS : 1;
                const hyperMult = (player.isHyperActive && player.isHyperActive()) ? Balance.HYPER.SCORE_MULT : 1;

                // Last enemy bonus (Ikeda choreography - dramatic finale)
                const isLastEnemy = enemies.length === 1; // This enemy is being removed, so if length is 1, it's the last
                const lastEnemyMult = isLastEnemy && G.HarmonicConductor
                    ? G.HarmonicConductor.getLastEnemyBonus() : 1;

                // Satoshi's Sacrifice multiplier (10x during sacrifice mode)
                const sacrificeMult = sacrificeState === 'ACTIVE' ? Balance.SACRIFICE.SCORE_MULT : 1;

                const killScore = Math.floor(e.scoreVal * bearMult * perkMult * killStreakMult * grazeKillBonus * hyperMult * lastEnemyMult * sacrificeMult);
                score += killScore;
                updateScore(score);

                // Track sacrifice earnings
                if (sacrificeState === 'ACTIVE') {
                    sacrificeScoreEarned += killScore;
                }

                createFloatingScore(killScore, e.x, e.y - 20);

                // Last enemy special effects (Ikeda choreography finale)
                if (isLastEnemy && lastEnemyMult > 1) {
                    applyHitStop('STREAK_25', false); // Dramatic slowmo
                    triggerScreenFlash('STREAK_25'); // Gold flash
                    showGameInfo("💀 LAST FIAT! x" + lastEnemyMult.toFixed(0));
                }

                createEnemyDeathExplosion(e.x, e.y, e.color, e.symbol || '$');
                createScoreParticles(e.x, e.y, e.color);
                killCount++;
                streak++;
                if (streak > bestStreak) bestStreak = streak;
                updateKillCounter();
                checkStreakMeme();
                emitEvent('enemy_killed', { score: killScore, x: e.x, y: e.y });

                // Track kills per fiat type for mini-boss trigger
                if (e.symbol && fiatKillCounter[e.symbol] !== undefined && !miniBoss) {
                    fiatKillCounter[e.symbol]++;
                    if (fiatKillCounter[e.symbol] >= Balance.MINI_BOSS.KILL_THRESHOLD) {
                        spawnMiniBoss(e.symbol, e.color);
                        fiatKillCounter[e.symbol] = 0;
                    }
                }

                // DROP LOGIC - Delegated to DropSystem
                const dropInfo = G.DropSystem.tryEnemyDrop(e.symbol, e.x, e.y, totalTime, getUnlockedWeapons);
                if (dropInfo) {
                    powerUps.push(new G.PowerUp(dropInfo.x, dropInfo.y, dropInfo.type));
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

    // HarmonicConductor is now the SOLE firing authority (Fibonacci removed in v2.13.0)

    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e) continue; // Safety check
        e.update(dt, totalTime, lastWavePattern, currentGridSpeed, gridDir, player.x, player.y);
        if ((gridDir === 1 && e.x > gameWidth - 20) || (gridDir === -1 && e.x < 20)) hitEdge = true;

        // Kamikaze trigger - weak tier enemies occasionally dive at player
        if (e.isKamikaze && !e.kamikazeDiving && e.y > 250 && Math.random() < 0.0005) {
            e.triggerKamikaze();
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
                applyHitStop('PLAYER_HIT', false); // Contact hit slowmo
                triggerScreenFlash('PLAYER_HIT');
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
    // Check if Satoshi's Sacrifice should be offered
    const sacrificeConfig = Balance.SACRIFICE;
    const canSacrifice = sacrificeConfig && sacrificeConfig.ENABLED &&
                         lives === 1 && // Last life
                         score > 0 && // Has score to sacrifice
                         sacrificeState === 'NONE'; // Not already in sacrifice

    if (canSacrifice) {
        // Enter sacrifice decision state instead of death
        enterSacrificeDecision();
        return;
    }

    // Normal death sequence
    // 1. Trigger Bullet Time (Visuals)
    if (G.EffectsRenderer) {
        G.EffectsRenderer.setHitStop(Balance.TIMING.HIT_STOP_DEATH, true);
        G.EffectsRenderer.applyImpactFlash(Balance.EFFECTS.FLASH.DEATH_OPACITY);
        G.EffectsRenderer.applyShake(Balance.EFFECTS.SHAKE.PLAYER_DEATH);
    }
    deathTimer = Balance.TIMING.DEATH_DURATION;

    // 2. Play Sound
    audioSys.play('explosion');

    // 3. Clear Bullets (Fairness) - Mark for deletion, let update loop release
    enemyBullets.forEach(b => {
        b.markedForDeletion = true;
    });
}

// Enter Satoshi's Sacrifice decision window
function enterSacrificeDecision() {
    sacrificeState = 'DECISION';
    sacrificeDecisionTimer = Balance.SACRIFICE.DECISION_WINDOW;
    sacrificeScoreAtStart = score;

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
            showGameInfo("+" + Math.floor(profit) + " PROFIT!");
        }
    } else {
        // FAILURE - NGMI but survive
        showDanger("📉 NGMI 📉");
        audioSys.play('sacrificeFail');
        applyHitStop('PLAYER_HIT', false);
        triggerScreenFlash('PLAYER_HIT');

        // Still survive (that's the point of sacrifice)
        player.hp = player.maxHp;
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

    if (lives > 0) {
        // RESPAWN
        player.hp = player.maxHp;
        player.invulnTimer = Balance.TIMING.INVULNERABILITY;
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
            // Skip draw if completely off-screen (65px is enemy size)
            if (e.x > -65 && e.x < gameWidth + 65 && e.y > -65 && e.y < gameHeight + 65) {
                e.draw(ctx);
            }
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
            // Off-screen culling (X and Y)
            if (b.x > -20 && b.x < gameWidth + 20 && b.y > -20 && b.y < gameHeight + 20) b.draw(ctx);
        }

        // Screen dimming when many enemy bullets for dramatic effect
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

        // Floating texts (with fade and custom size)
        for (let i = 0; i < floatingTexts.length; i++) {
            const t = floatingTexts[i];
            if (!t || t.life <= 0) continue; // Skip empty/expired slots
            // Calculate alpha based on life (fade out at end)
            const maxLife = t.maxLife || 1.0;
            const fadeStart = maxLife * 0.3; // Start fading in last 30%
            const alpha = t.life < fadeStart ? t.life / fadeStart : 1;

            ctx.font = `bold ${t.size || 20}px Courier New`;
            ctx.globalAlpha = alpha;
            // Black outline for readability
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(t.text, t.x, t.y);
            ctx.fillStyle = t.c;
            ctx.fillText(t.text, t.x, t.y);
        }
        ctx.globalAlpha = 1;

        // Perk icons (glow above player)
        drawPerkIcons(ctx);

        // Typed messages (GAME_INFO, DANGER, VICTORY) - distinct visual styles
        drawTypedMessages(ctx);

        // HYPER MODE UI (timer when active, "READY" when available)
        drawHyperUI(ctx);

        // SACRIFICE UI (decision button or active countdown)
        drawSacrificeUI(ctx);

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
    }

    ctx.restore(); // Restore shake

    // Screen transition overlay via TransitionManager
    if (G.TransitionManager) G.TransitionManager.draw(ctx);

    // Debug overlay (F3 toggle)
    if (debugMode) drawDebug(ctx);
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
    ctx.font = `bold ${60 + pulse * 10}px "Courier New", monospace`;
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

        // Outer glow (large, soft)
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 1.8);
        gradient.addColorStop(0, hexToRgba(p.color, glowIntensity * 0.5));
        gradient.addColorStop(0.5, hexToRgba(p.color, 0.25));
        gradient.addColorStop(1, hexToRgba(p.color, 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Inner glow (brighter)
        const innerGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 0.9);
        innerGlow.addColorStop(0, '#fff');
        innerGlow.addColorStop(0.3, p.color);
        innerGlow.addColorStop(1, hexToRgba(p.color, 0));
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 0.9, 0, Math.PI * 2);
        ctx.fill();

        // Icon
        ctx.font = `bold ${Math.floor(size)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Shadow/outline for visibility
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#fff';
        ctx.fillText(p.icon, p.x, p.y);
        ctx.shadowBlur = 0;

        // Perk name below icon (smaller, fades in)
        if (p.scale > 0.5) {
            const nameAlpha = (p.scale - 0.5) * 2 * alpha;
            ctx.globalAlpha = nameAlpha;
            ctx.font = 'bold 14px "Courier New", monospace';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(p.name, p.x, p.y + size * 0.8);
            ctx.fillStyle = p.color;
            ctx.fillText(p.name, p.x, p.y + size * 0.8);
        }

        ctx.restore();
    }
}

// --- PARTICLES (Delegated to ParticleSystem) ---
// All particle functions delegate to G.ParticleSystem for centralized management

function addParticle(props) {
    return G.ParticleSystem ? G.ParticleSystem.addParticle(props) : false;
}

function createBulletSpark(x, y) {
    if (G.ParticleSystem) G.ParticleSystem.createBulletSpark(x, y);
}

function createPowerUpPickupEffect(x, y, color) {
    if (G.ParticleSystem) G.ParticleSystem.createPowerUpPickupEffect(x, y, color);
}

function createMuzzleFlashParticles(x, y, color) {
    if (G.ParticleSystem) G.ParticleSystem.createMuzzleFlashParticles(x, y, color);
}

function createExplosion(x, y, color, count = 12) {
    if (G.ParticleSystem) G.ParticleSystem.createExplosion(x, y, color, count);
}

function createEnemyDeathExplosion(x, y, color, symbol) {
    if (G.ParticleSystem) G.ParticleSystem.createEnemyDeathExplosion(x, y, color, symbol);
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
            showDanger("⚠️ " + Math.ceil(sacrificeActiveTimer) + "s LEFT!");
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

    update(dt);
    updatePowerUps(dt);
    // Sky update via SkyRenderer
    if (G.SkyRenderer) {
        const skyEffects = G.SkyRenderer.update(dt, { isBearMarket, gameState });
        if (skyEffects.shake > 0) shake = Math.max(shake, skyEffects.shake);
        if (skyEffects.playSound) audioSys.play(skyEffects.playSound);
    }
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

// Campaign Victory - All 3 central banks defeated!
function showCampaignVictory() {
    const campaignState = G.CampaignState;

    // Dramatic screen effects
    shake = 30;
    if (G.TransitionManager) G.TransitionManager.startFadeOut(1.0, '#ffd700'); // Gold!

    // Show campaign complete screen
    gameState = 'CAMPAIGN_VICTORY';

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
                    <button class="btn-play" onclick="startNewGamePlus()">NEW GAME+ 🔄</button>
                    <button class="btn-secondary" onclick="backToIntroFromVictory()">MAIN MENU</button>
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
        setUI('highScoreVal', highScore);
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
        if (!p) { powerUps.splice(i, 1); continue; } // Safety check
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
                    bulletCancelTimer = Balance.PERK.CANCEL_WINDOW;
                    if (bulletCancelStreak >= Balance.PERK.BULLET_CANCEL_COUNT) {
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
