// ==========================================
// FIAT INVADERS: FINAL POLISH
// Fixes: Level Counter (Brute Force), Autofire, Enemy Size
// ==========================================

// --- 1. SETUP ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
let gameWidth = 600;
let gameHeight = 800;

const GAME_VERSION = "v2.0 RC1 Deep Market";

// --- 1.1 LOCALIZATION ---
const userLang = navigator.language || navigator.userLanguage;
let currentLang = userLang.startsWith('it') ? 'IT' : 'EN';

const TEXTS = {
    EN: {
        SCORE: "SCORE", LEVEL: "LEVEL", NORMAL: "NORMAL",
        INSERT_COIN: "INSERT COIN",
        START_HINT: "⌨️ ARROWS/WASD to Move • SPACE to Fire • ENTER to Start",
        MOBILE_HINT: "📱 TOUCH SIDES to Move • ICON for Shield",
        PRO_TIP: "💎 PRO TIP: STOP MOVING TO HODL (2x SCORE)",
        WAVE1: "WAVE 1: ACCUMULATION", WAVE2: "WAVE 2: BULL RUN", WAVE3: "WAVE 3: VOLATILITY",
        BOSS_ENTER: "GOLD RESERVES", BOSS_DEATH: "RESERVES LIQUIDATED",
        GAME_OVER: "REKT", RESTART: "BUY THE DIP",
        COMBO_LOST: "COMBO LOST", COMBO_BREAK: "COMBO BREAK",
        UPGRADE: "UPGRADE LVL", MAX_POWER: "MAX POWER", HODL: "HODL!",
        SETTINGS: "SETTINGS", CLOSE: "CLOSE", LANG: "LANGUAGE",
        PAUSED: "PAUSED", RESUME: "RESUME", ABORT: "ABORT MISSION"
    },
    IT: {
        SCORE: "PUNTI", LEVEL: "LIVELLO", NORMAL: "NORMALE",
        INSERT_COIN: "INSERISCI GETTONE",
        START_HINT: "⌨️ FRECCE/WASD: Muovi • SPAZIO: Spara • INVIO: Avvia",
        MOBILE_HINT: "📱 TOCCA LATI: Muovi • ICONA: Scudo",
        PRO_TIP: "💎 PRO TIP: FERMATI PER HODL (Punti Doppi)",
        WAVE1: "ONDATA 1: ACCUMULO", WAVE2: "ONDATA 2: BULL RUN", WAVE3: "ONDATA 3: VOLATILITÀ",
        BOSS_ENTER: "RISERVE AUREE", BOSS_DEATH: "RISERVE LIQUIDATE",
        GAME_OVER: "REKT", RESTART: "COMPRA IL DIP",
        COMBO_LOST: "COMBO PERSA", COMBO_BREAK: "COMBO ROTTA",
        UPGRADE: "POTENZIAMENTO LV", MAX_POWER: "MASSIMA POTENZA", HODL: "HODL!",
        SETTINGS: "IMPOSTAZIONI", CLOSE: "CHIUDI", LANG: "LINGUA",
        PAUSED: "PAUSA", RESUME: "RIPRENDI", ABORT: "ABBANDONA"
    }
};

function t(key) { return TEXTS[currentLang][key] || key; }

// --- UI REFERENCES ---
const ui = {
    intro: document.getElementById('intro-screen'),
    hangar: document.getElementById('hangar-screen'),
    settings: document.getElementById('settings-modal'),
    pause: document.getElementById('pause-screen'),
    gameover: document.getElementById('gameover-screen'),

    score: document.getElementById('scoreVal'),
    lvl: document.getElementById('lvlVal'),
    wep: document.getElementById('weaponName'),
    shieldBar: document.getElementById('shieldBar'),
    lives: document.getElementById('livesVal'),

    finalScore: document.getElementById('finalScore'),
    highScore: document.getElementById('highScoreVal'),
    version: document.getElementById('version-tag'),

    pauseBtn: document.getElementById('pause-btn'),
    langBtn: document.getElementById('lang-btn')
};

function resize() {
    gameHeight = window.innerHeight;
    gameWidth = Math.min(600, window.innerWidth);
    canvas.width = gameWidth; canvas.height = gameHeight;
}
window.addEventListener('resize', resize);
resize();

// --- 2. AUDIO SYSTEM ---
const AudioSys = {
    ctx: null,
    init() {
        if (this.ctx) return;
        try { const AC = window.AudioContext || window.webkitAudioContext; this.ctx = new AC(); }
        catch (e) { console.warn("Audio Context init failed:", e); }
    },
    play(type) {
        if (!this.ctx) return; const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain); gain.connect(this.ctx.destination);

        if (type === 'shoot') {
            // PITCH VARIANCE: +/- 50Hz for organic feel
            let varP = (Math.random() - 0.5) * 100;
            osc.frequency.setValueAtTime(800 + varP, t);
            osc.frequency.exponentialRampToValueAtTime(150, t + 0.1);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc.start(t); osc.stop(t + 0.1);
        }
        else if (type === 'enemyShoot') {
            osc.type = 'square';
            let varP = (Math.random() - 0.5) * 50;
            osc.frequency.setValueAtTime(150 + varP, t);
            osc.frequency.linearRampToValueAtTime(50, t + 0.2);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
            osc.start(t); osc.stop(t + 0.2);
        }
        else if (type === 'hit') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200 + Math.random() * 50, t);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc.start(t); osc.stop(t + 0.1);
        }
        else if (type === 'explosion') {
            // RICH EXPLOSION
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
            gain.gain.setValueAtTime(0.8, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
            osc.start(t); osc.stop(t + 0.5);

            // Sub-Bass Kick
            const sub = this.ctx.createOscillator();
            const subG = this.ctx.createGain();
            sub.connect(subG); subG.connect(this.ctx.destination);
            sub.frequency.setValueAtTime(60, t);
            sub.frequency.exponentialRampToValueAtTime(10, t + 0.5);
            subG.gain.setValueAtTime(0.5, t);
            subG.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
            sub.start(t); sub.stop(t + 0.5);
        }
        else if (type === 'coin') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, t);
            osc.frequency.exponentialRampToValueAtTime(1800, t + 0.1);
            gain.gain.setValueAtTime(0.1, t);
            osc.start(t); osc.stop(t + 0.1);
        }
        else if (type === 'bossSpawn') { osc.type = 'square'; osc.frequency.setValueAtTime(100, t); osc.frequency.linearRampToValueAtTime(50, t + 1); gain.gain.setValueAtTime(0.5, t); gain.gain.linearRampToValueAtTime(0, t + 1); osc.start(t); osc.stop(t + 1); }
        else if (type === 'shield') { osc.frequency.setValueAtTime(200, t); osc.frequency.linearRampToValueAtTime(600, t + 0.5); gain.gain.setValueAtTime(0.1, t); osc.start(t); osc.stop(t + 0.5); }
        else if (type === 'hodl') { osc.type = 'square'; osc.frequency.setValueAtTime(1000, t); osc.frequency.exponentialRampToValueAtTime(300, t + 0.2); gain.gain.setValueAtTime(0.1, t); osc.start(t); osc.stop(t + 0.2); }
    }
};

// --- 3. MENU & INPUT ---
function updateUIText() {
    if (ui.version) ui.version.innerText = GAME_VERSION;
    if (ui.langBtn) ui.langBtn.innerText = currentLang;
    const btnInsert = document.querySelector('#intro-screen .btn-coin');
    if (btnInsert) btnInsert.innerText = t('INSERT_COIN');
    // REMOVED TEXT INJECTION FOR SETTINGS BUTTON (Icon Only via CSS/HTML or fixed icon)
    // const btnSettings = document.getElementById('btn-settings');
    // if (btnSettings) btnSettings.innerText = "⚙️ " + t('SETTINGS'); 

    const pauseTitle = document.querySelector('#pause-screen .neon-title');
    if (pauseTitle) pauseTitle.innerText = t('PAUSED');

    // In-game labels check
    if (document.querySelector('.left-module .label')) document.querySelector('.left-module .label').innerText = t('SCORE');
    if (document.querySelector('.right-module .label')) document.querySelector('.right-module .label').innerText = t('LEVEL');
}

window.toggleLang = function () { currentLang = (currentLang === 'EN') ? 'IT' : 'EN'; updateUIText(); };
window.toggleSettings = function () { setStyle('settings-modal', 'display', (ui.settings.style.display === 'flex') ? 'none' : 'flex'); updateUIText(); };
window.goToHangar = function () { setStyle('intro-screen', 'display', 'none'); setStyle('hangar-screen', 'display', 'flex'); gameState = 'HANGAR'; };
window.selectShip = function (type) { player.setShip(type); setStyle('hangar-screen', 'display', 'none'); startGame(); };
window.togglePause = function () {
    if (gameState === 'PLAY' || gameState === 'INTERMISSION') { gameState = 'PAUSE'; setStyle('pause-screen', 'display', 'flex'); setStyle('pause-btn', 'display', 'none'); }
    else if (gameState === 'PAUSE') { gameState = 'PLAY'; setStyle('pause-screen', 'display', 'none'); setStyle('pause-btn', 'display', 'block'); }
};
window.backToIntro = function () {
    setStyle('pause-screen', 'display', 'none'); setStyle('gameover-screen', 'display', 'none'); setStyle('hangar-screen', 'display', 'none');
    setStyle('intro-screen', 'display', 'flex'); gameState = 'INTRO'; AudioSys.init();
};

const input = {
    keys: {}, touch: { active: false, x: 0, shield: false },
    init() {
        const vid = document.getElementById('intro-video');
        const splash = document.getElementById('splash-layer');
        const startApp = () => {
            if (!splash || splash.style.opacity === '0') return;
            gameState = 'INTRO'; splash.style.opacity = '0';
            setTimeout(() => { if (splash) splash.remove(); setStyle('intro-screen', 'display', 'flex'); updateUIText(); }, 1000);
        };
        if (vid && splash) {
            vid.play().then(() => { vid.onended = startApp; }).catch(() => { });
            setTimeout(startApp, 4000); splash.addEventListener('click', startApp); splash.addEventListener('touchstart', startApp);
        } else {
            if (splash) splash.style.display = 'none'; setStyle('intro-screen', 'display', 'flex'); updateUIText(); gameState = 'INTRO';
        }

        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (e.code === 'Escape') {
                if (gameState === 'VIDEO') startApp(); // SKIP VIDEO
                else if (gameState === 'PLAY' || gameState === 'PAUSE') togglePause();
                else if (gameState === 'HANGAR' || gameState === 'SETTINGS') backToIntro();
            }
            if (e.code === 'Enter' || e.code === 'Space') { // ADDED SPACE TO START
                if (gameState === 'VIDEO') startApp(); // SKIP VIDEO
                else if (gameState === 'INTRO') goToHangar();
                else if (gameState === 'HANGAR') selectShip(Object.keys(SHIPS)[currentShipIdx]);
                else if (gameState === 'GAMEOVER') backToIntro();
            }
            // HANGAR NAV
            if (gameState === 'HANGAR') {
                if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                    currentShipIdx = (currentShipIdx + 1) % 3;
                    highlightShip(currentShipIdx);
                }
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                    currentShipIdx = (currentShipIdx - 1 + 3) % 3;
                    highlightShip(currentShipIdx);
                }
            }
        });
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        const handleTouch = (e) => {
            if (gameState === 'PLAY') e.preventDefault();
            this.touch.active = true;
            if (e.touches.length > 0) this.touch.x = e.touches[0].clientX;
        };
        const tShield = document.getElementById('t-shield');
        if (tShield) {
            tShield.addEventListener('touchstart', (e) => { e.preventDefault(); this.touch.shield = true; });
            tShield.addEventListener('touchend', (e) => { e.preventDefault(); this.touch.shield = false; });
        }
        if (ui.pauseBtn) ui.pauseBtn.addEventListener('click', togglePause);

        window.addEventListener('touchstart', handleTouch, { passive: false });
        window.addEventListener('touchmove', handleTouch, { passive: false });
        window.addEventListener('touchend', () => { this.touch.active = false; });
    }
};
// HELPER FOR HANGAR
let currentShipIdx = 0;
function highlightShip(idx) {
    // Visual feedback would be ideally mapped to DOM elements classes 
    // assuming visual selection logic exists or adding simple scale effect
    document.querySelectorAll('.ship-card').forEach((el, i) => {
        el.style.transform = (i === idx) ? "scale(1.1)" : "scale(1)";
        el.style.border = (i === idx) ? "2px solid #00ff00" : "1px solid #333";
    });
}
input.init();

// --- 4. GAME VARIABLES ---
const MEMES = { LOW: ["HODL", "BUY DIP", "SHITCOIN", "PAPER HANDS"], HIGH: ["TO THE MOON 🚀", "LAMBO", "WHALE 🐋", "DIAMOND HANDS 💎"], BOSS: ["INFLATION", "PRINTING 🖨️", "PONZI SCHEME"] };
const WEAPONS = { NORMAL: { color: '#F7931A', rate: 0.18 }, RAPID: { color: '#3498db', rate: 0.08, icon: '🚀' }, SPREAD: { color: '#9b59b6', rate: 0.25, icon: '🔱' }, LASER: { color: '#e74c3c', rate: 0.35, icon: '⚡' } };
const FIAT_TYPES = [{ s: '¥', c: '#bdc3c7', val: 30, hp: 1 }, { s: '€', c: '#3498db', val: 50, hp: 1 }, { s: '£', c: '#9b59b6', val: 50, hp: 1 }, { s: '$', c: '#2ecc71', val: 100, hp: 1 }];
const SHIPS = { BTC: { speed: 400, hp: 3, fireRate: 0.18, color: '#F7931A' }, ETH: { speed: 300, hp: 4, fireRate: 0.30, color: '#8c7ae6' }, SOL: { speed: 550, hp: 2, fireRate: 0.12, color: '#00d2d3' } };

let gameState = 'VIDEO';
let score = 0, displayScore = 0, level = 1, wave = 1;
let highScore = localStorage.getItem('fiat_highscore') || 0;
if (ui.highScore) ui.highScore.innerText = highScore;

let bullets = [], enemyBullets = [], enemies = [], powerups = [], particles = [], floatingTexts = [], muzzleFlashes = [], boss = null, clouds = [];
let shake = 0, gridDir = 1, gridSpeed = 25, timeScale = 1.0, totalTime = 0, intermissionTimer = 0, currentMeme = "";

// --- 5. ENTITIES ---
const player = {
    x: 0, y: 0, w: 30, h: 30, vx: 0, type: 'BTC', stats: SHIPS['BTC'], weapon: 'NORMAL', weaponTimer: 0, weaponLevel: 1, cooldown: 0, shieldActive: false, shieldTimer: 0, shieldCooldown: 0, beastMode: 0, hp: 3, invulnTimer: 0,
    setShip(type) { this.type = type; this.stats = SHIPS[type]; this.reset(); },
    reset() { this.x = gameWidth / 2; this.y = gameHeight - 80; this.weapon = 'NORMAL'; this.weaponLevel = 1; this.shieldActive = false; this.shieldCooldown = 0; this.beastMode = 0; this.hp = this.stats.hp; this.invulnTimer = 0; this.updateLivesUI(); },
    updateLivesUI() { let hearts = ""; for (let h = 0; h < this.hp; h++) hearts += "❤️"; setUI('lives', hearts); },

    update(dt) {
        if (this.invulnTimer > 0) this.invulnTimer -= dt;
        let speed = this.stats.speed;
        if (input.keys['ArrowRight'] || input.keys['KeyD'] || (input.touch.active && input.touch.x > gameWidth / 2)) { this.x += speed * dt; this.vx = speed; }
        else if (input.keys['ArrowLeft'] || input.keys['KeyA'] || (input.touch.active && input.touch.x < gameWidth / 2)) { this.x -= speed * dt; this.vx = -speed; }
        else { this.vx = 0; }
        this.x = Math.max(20, Math.min(gameWidth - 20, this.x));

        if ((input.keys['ArrowDown'] || input.keys['KeyS'] || input.touch.shield) && this.shieldCooldown <= 0 && !this.shieldActive) { this.shieldActive = true; this.shieldTimer = 2.0; this.shieldCooldown = 10.0; AudioSys.play('shield'); }
        if (this.shieldActive) { this.shieldTimer -= dt; if (this.shieldTimer <= 0) this.shieldActive = false; }
        if (this.shieldCooldown > 0) this.shieldCooldown -= dt;
        if (this.weapon !== 'NORMAL') { this.weaponTimer -= dt; if (this.weaponTimer <= 0) { this.weapon = 'NORMAL'; this.weaponLevel = 1; setUI('wep', t('NORMAL')); } }

        // AUTOFIRE LOGIC (Guaranteed)
        this.cooldown -= dt;
        let isShooting = input.keys['Space'] || input.touch.active || input.keys['ArrowUp']; // Hold space/touch to fire
        if (isShooting && this.cooldown <= 0) {
            this.fire(Math.abs(this.vx) < 10);
            let baseRate = this.stats.fireRate;
            let rate = (this.weapon === 'NORMAL') ? baseRate : WEAPONS[this.weapon].rate;
            if (this.weapon === 'RAPID' && this.weaponLevel > 1) rate *= 0.7;
            this.cooldown = this.beastMode > 0 ? rate / 2 : rate;
        }

        let sPct = this.shieldActive ? 100 : Math.max(0, 100 - (this.shieldCooldown / 8 * 100));
        setStyle('shieldBar', 'width', sPct + "%");
        setStyle('shieldBar', 'backgroundColor', this.shieldActive ? '#fff' : (this.shieldCooldown <= 0 ? this.stats.color : '#555'));
    },
    fire(isHodl) {
        let conf = WEAPONS[this.weapon]; let y = this.y - 25; let c = this.beastMode > 0 ? '#ff0000' : conf.color; let hodlBonus = isHodl && this.weapon !== 'LASER';
        if (hodlBonus) { c = '#00ff00'; AudioSys.play('hodl'); } else { AudioSys.play('shoot'); }
        muzzleFlashes.push({ x: this.x, y: this.y - 20, life: 0.1, maxLife: 0.1 }); createParticles(this.x, this.y - 15, '#fff', 3);
        if (this.weapon === 'SPREAD') { let count = this.weaponLevel === 3 ? 7 : (this.weaponLevel === 2 ? 5 : 3); let startAngle = -30, step = 60 / (count - 1); for (let i = 0; i < count; i++) { let ang = (startAngle + (step * i)) * (Math.PI / 180); bullets.push({ x: this.x, y: y, vx: Math.sin(ang) * 600, vy: -Math.cos(ang) * 600, c: c, w: 4, h: 20, hodl: hodlBonus }); } }
        else if (this.weapon === 'LASER') { bullets.push({ x: this.x, y: y, vx: 0, vy: -1200, c: c, w: this.weaponLevel * 10, h: 60, pen: true, hodl: false }); }
        else { let w = hodlBonus ? 10 : 5; if (this.weapon === 'RAPID' && this.weaponLevel === 3) { bullets.push({ x: this.x - 10, y: y, vx: 0, vy: -900, c: c, w: w, h: 20, hodl: hodlBonus }); bullets.push({ x: this.x + 10, y: y, vx: 0, vy: -900, c: c, w: w, h: 20, hodl: hodlBonus }); } else { bullets.push({ x: this.x, y: y, vx: 0, vy: -800, c: c, w: w, h: 20, hodl: hodlBonus }); } }
    },
    draw(ctx) {
        if (this.invulnTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;
        ctx.save(); ctx.translate(this.x, this.y);
        if (this.shieldActive) { ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI * 2); ctx.strokeStyle = `rgba(0, 255, 255, ${Math.random() * 0.5 + 0.5})`; ctx.lineWidth = 3; ctx.stroke(); }
        ctx.fillStyle = this.stats.color; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-15, 15); ctx.lineTo(0, 10); ctx.lineTo(15, 15); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(this.type[0], 0, 5); ctx.restore();
    },
    takeDamage() {
        if (this.invulnTimer > 0 || this.shieldActive) return;
        this.hp--; this.invulnTimer = 2.0; timeScale = 0.2; setTimeout(() => { timeScale = 1.0; }, 1000);
        document.body.classList.add('hit-effect'); setTimeout(() => document.body.classList.remove('hit-effect'), 200); AudioSys.play('hit');
        this.updateLivesUI();
        if (this.hp <= 0) { gameState = 'GAMEOVER'; ui.gameover.style.display = 'flex'; ui.finalScore.innerText = score; ui.pauseBtn.style.display = 'none'; AudioSys.play('explosion'); }
    }
};

// --- 6. MANAGERS ---
const WaveManager = {
    wave: 1, waveInProgress: false,
    reset() { this.wave = 1; this.waveInProgress = false; },
    update(dt) {
        if (gameState === 'INTERMISSION') { intermissionTimer -= dt; if (intermissionTimer <= 0) { gameState = 'PLAY'; this.executeNextWave(); } return; }
        if (!boss && enemies.length === 0 && !this.waveInProgress && gameState === 'PLAY') this.startSequence();
    },
    startSequence() { this.waveInProgress = true; if (this.wave <= 3) this.startIntermission(); else spawnBoss(); },
    startIntermission(msgOverride = null, dur = 3.0) { gameState = 'INTERMISSION'; intermissionTimer = dur; bullets = []; enemyBullets = []; let pool = MEMES.LOW.concat(MEMES.HIGH); currentMeme = pool[Math.floor(Math.random() * pool.length)]; let msg = msgOverride || "PREPARING NEXT WAVE..."; addText(msg, gameWidth / 2, gameHeight / 2 - 80, '#00ff00', 30); },
    executeNextWave() {
        let pattern = 'RECT'; if (this.wave === 2) pattern = 'V_SHAPE'; if (this.wave === 3) pattern = 'COLUMNS';

        // INCREMENT LEVEL ON WAVE CHANGE (1 -> 2 -> 3)
        if (this.wave > 1) {
            level++;
            setUI('lvl', level);
            addText("LEVEL " + level, gameWidth / 2, gameHeight / 2 - 50, '#00ff00', 30);
        }

        let msg = this.wave === 1 ? t('WAVE1') : (this.wave === 2 ? t('WAVE2') : t('WAVE3'));
        addText(msg, gameWidth / 2, gameHeight / 2, '#F7931A', 40);
        spawnWave(pattern); this.wave++; this.waveInProgress = false;
    },
    completeLevel() {
        level++; // Boss Defeated -> Next Level (e.g. 3 -> 4)
        setUI('lvl', level);
        addText("LEVEL " + level + " REACHED!", gameWidth / 2, gameHeight / 2, '#00ff00', 40);
        WaveManager.wave = 1; WaveManager.waveInProgress = false; gridSpeed += 15;
        this.startIntermission("MARKET CYCLE " + Math.ceil(level / 3), 4.0);
    }
};

const ComboManager = {
    multiplier: 1, timer: 0,
    addKill() { this.multiplier = Math.min(10, this.multiplier + 1); this.timer = 2.0; },
    reset() { this.multiplier = 1; this.timer = 0; },
    update(dt) { if (this.timer > 0) { this.timer -= dt; if (this.timer <= 0) { if (this.multiplier > 1) { addText(t('COMBO_BREAK'), player.x, player.y - 50, '#ff0000', 24); AudioSys.play('comboLost'); } this.multiplier = 1; } } }
};

function spawnWave(pattern) {
    enemies = []; let rows = pattern === 'COLUMNS' ? 7 : (pattern === 'V_SHAPE' ? 6 : 5);
    // LARGER ENEMIES (w: 50)
    // LARGER ENEMIES (w: 50)
    const spacing = 60; // Wider spacing for bigger enemies
    const cols = Math.floor((gameWidth - 20) / spacing);
    const startX = (gameWidth - (cols * spacing)) / 2 + (spacing / 2);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let spawn = false; if (pattern === 'RECT') spawn = true; else if (pattern === 'V_SHAPE' && Math.abs(c - cols / 2) < (rows - r) + 1) spawn = true; else if (pattern === 'COLUMNS' && c % 5 < 2) spawn = true; if (spawn) {
                let typeIdx = Math.max(0, 3 - Math.floor(r / 2)); let p = FIAT_TYPES[typeIdx];
                // ENEMY WIDTH 50
                enemies.push({ x: startX + c * spacing, y: 180 + r * spacing, baseY: 180 + r * spacing, s: p.s, c: p.c, hp: p.hp, score: p.val, w: 50, h: 50 });
            }
        }
    }
    // BALANCE TWEAK: Slower Initial Speed, Smoother Curve
    gridDir = 1;
    gridSpeed = 20 + (Math.min(level, 20) * 4); // Capped growth
}
function spawnBoss() { let hp = 300 * level; boss = { x: gameWidth / 2 - 110, y: -150, w: 220, h: 100, hp: hp, maxHp: hp, active: true, dir: 1 }; enemies = []; addText(t('BOSS_ENTER'), gameWidth / 2, gameHeight / 2, '#FFD700', 40); shake = 20; AudioSys.play('bossSpawn'); }
function spawnPowerUp(x, y) { let r = Math.random(); let t = null; if (r < 0.08) t = 'RAPID'; else if (r < 0.12) t = 'SPREAD'; else if (r < 0.15) t = 'LASER'; if (t) powerups.push({ x, y, type: t }); }

// --- 7. CORE LOOP & COLLISION ---
function update(dt) {
    if (gameState !== 'PLAY' && gameState !== 'INTERMISSION') return;
    totalTime += dt;
    if (ComboManager.multiplier > 3) shake += (ComboManager.multiplier * 0.1); if (shake > 0) shake *= 0.9; if (shake < 0.5) shake = 0;
    player.update(dt); ComboManager.update(dt); WaveManager.update(dt);
    if (displayScore < score) { displayScore += (score - displayScore) * 10 * dt; setUI('score', Math.floor(displayScore)); }

    if (!boss && enemies.length > 0 && gameState === 'PLAY') {
        let hitEdge = false;
        // SMART SHOOTING LOGIC (Frontline Only)
        // 1. Identify frontline enemies (lowest y per column)
        let cols = {};
        enemies.forEach(e => {
            let colKey = Math.round(e.x / 10) * 10; // Group by approx X
            if (!cols[colKey] || e.y > cols[colKey].y) {
                cols[colKey] = e;
            }
        });

        enemies.forEach(e => {
            e.x += gridSpeed * gridDir * dt;
            let wIdx = WaveManager.wave - 1;

            // PATTERNS
            if (wIdx === 2) {
                // BULL RUN (Sine)
                e.y = e.baseY + Math.sin(totalTime * 3) * 20;
            } else if (wIdx === 3) {
                // VOLATILITY (Aggressive Drop)
                // Randomly drop specific enemies
                if (Math.random() < 0.001) e.baseY += 50;
                e.baseY += gridSpeed * dt * 0.8; // Faster base drop
                e.y = e.baseY;
            } else {
                e.y = e.baseY;
            }

            if ((gridDir === 1 && e.x > gameWidth - 20) || (gridDir === -1 && e.x < 20)) hitEdge = true;

            // SHOOT (Only if is frontline)
            let isFrontline = false;
            let colKey = Math.round(e.x / 10) * 10;
            if (cols[colKey] === e) isFrontline = true;

            // BALANCE TWEAK: Cap fire rate growth
            let fireChance = 0.002 + (Math.min(level, 10) * 0.001);

            if (isFrontline && Math.random() < fireChance) {
                // BALANCE TWEAK: Cap bullet speed
                let bSpeed = 200 + (Math.min(level, 10) * 20);
                enemyBullets.push({ x: e.x, y: e.y + 20, vx: 0, vy: bSpeed });
                AudioSys.play('enemyShoot');
            }
        });
        if (hitEdge) { gridDir *= -1; enemies.forEach(e => { e.baseY += 20; if (WaveManager.wave - 1 === 2) e.y = e.baseY + Math.sin(totalTime * 3) * 20; else e.y = e.baseY; }); gridSpeed += 5; }

        enemies.forEach(e => { if (Math.abs(e.x - player.x) < 40 && Math.abs(e.y - player.y) < 40) { player.takeDamage(); enemies.splice(enemies.indexOf(e), 1); } });
    }

    if (boss && boss.active) {
        if (boss.y < 100) boss.y += 30 * dt; boss.x += 100 * boss.dir * dt; if (boss.x < 10 || boss.x + boss.w > gameWidth - 10) boss.dir *= -1;
        if (Math.random() < 0.03 * level) { enemyBullets.push({ x: boss.x + boss.w / 2 + (Math.random() - 0.5) * 100, y: boss.y + 80, vx: (Math.random() - 0.5) * 100, vy: 300 }); }
    }

    // ENEMY BULLETS
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let b = enemyBullets[i]; b.x += b.vx * dt; b.y += b.vy * dt;
        if (Math.abs(b.x - player.x) < 20 && Math.abs(b.y - player.y) < 20) { player.takeDamage(); enemyBullets.splice(i, 1); continue; }
        if (b.y > gameHeight) enemyBullets.splice(i, 1);
    }

    // PLAYER BULLETS
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i]; b.y += b.vy * dt; b.x += b.vx * dt; let hit = false;
        if (!boss) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                let e = enemies[j];
                // LARGER HITBOX FOR ENEMIES (w: 50 -> check 35)
                // ENEMY HIT (Non-Boss)
                if (Math.abs(b.x - e.x) < 35 && Math.abs(b.y - e.y) < 35) {
                    e.hp -= 10;
                    // HIT SPARKS
                    createParticles(e.x, e.y, e.c, 3, 'normal');
                    AudioSys.play('hit');

                    // DAMAGE NUMBER
                    let dmgColor = b.hodl ? '#00ff00' : '#fff';
                    let dmgText = b.hodl ? "HODL!" : "-10";
                    if (Math.random() < 0.3 || b.hodl) addText(dmgText, e.x, e.y - 20, dmgColor, b.hodl ? 18 : 14);

                    if (e.hp <= 0) {
                        ComboManager.addKill();
                        AudioSys.play('coin');
                        enemies.splice(j, 1);

                        // JUICE LOAD: Gold particles if HODL kill, else normal
                        let pType = b.hodl ? 'gold' : 'normal';
                        createParticles(e.x, e.y, e.c, 30, pType);
                        shake += 5;
                        if (Math.random() < 0.1) spawnPowerUp(e.x, e.y);
                    }
                    if (!b.pen) hit = true; break;
                }
            }
        } else if (boss && boss.active) {
            // BOSS HIT
            if (b.x > boss.x && b.x < boss.x + boss.w && b.y > boss.y && b.y < boss.y + boss.h) {
                boss.hp -= (b.hodl ? 2 : 1);
                createParticles(b.x, b.y, '#FFD700', 5, 'gold'); // Gold sparks on boss hit
                if (!b.pen) hit = true;
                if (boss.hp <= 0) {
                    score += 5000;
                    boss.active = false;
                    boss = null;
                    shake = 50; // MASSIVE SHAKE
                    AudioSys.play('explosion');
                    // BOSS DEATH EVENT
                    createParticles(gameWidth / 2, 200, '#FFD700', 300, 'gold');
                    createParticles(gameWidth / 2, 200, '#fff', 50, 'wave'); // Shockwave
                    addText("MARKET CONQUERED", gameWidth / 2, gameHeight / 2, '#FFD700', 50);
                    WaveManager.completeLevel();
                }
            }
        }
        if (hit || b.y < -50) bullets.splice(i, 1);
    }

    for (let i = muzzleFlashes.length - 1; i >= 0; i--) { muzzleFlashes[i].life -= dt; if (muzzleFlashes[i].life <= 0) muzzleFlashes.splice(i, 1); }
    for (let i = powerups.length - 1; i >= 0; i--) { let p = powerups[i]; p.y += 150 * dt; if (Math.hypot(p.x - player.x, p.y - player.y) < 30) { if (player.weapon === p.type) { if (player.weaponLevel < 3) { player.weaponLevel++; addText(t('UPGRADE') + " " + player.weaponLevel, player.x, player.y - 50, '#00ff00', 24); } else { score += 500; addText(t('MAX_POWER'), player.x, player.y - 50, '#ff0000', 24); } } else { player.weapon = p.type; player.weaponLevel = 1; } player.weaponTimer = 10.0; setUI('wep', WEAPONS[p.type].icon + " " + p.type + " " + "I".repeat(player.weaponLevel)); AudioSys.play('powerup'); powerups.splice(i, 1); } else if (p.y > gameHeight) powerups.splice(i, 1); }
    updateParticles(dt); updateTexts(dt);
    updateMatrix(dt); // MATRIX UPDATE
}

function draw() {
    ctx.save();
    if (gameState === 'VIDEO') { ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, gameWidth, gameHeight); ctx.restore(); return; }

    if (gameState === 'INTERMISSION') {
        let grd = ctx.createLinearGradient(0, 0, 0, gameHeight); grd.addColorStop(0, '#002200'); grd.addColorStop(1, '#004400');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, gameWidth, gameHeight);
        ctx.fillStyle = '#00ff00'; ctx.font = 'bold 30px Courier New'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(currentMeme, gameWidth / 2, gameHeight / 2);
        ctx.font = '20px Courier New'; ctx.fillStyle = '#fff'; ctx.fillText("MARKET RECALIBRATING...", gameWidth / 2, gameHeight / 2 + 50);
        drawTexts(ctx); ctx.restore(); return;
    }

    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    // MATRIX RENDER
    drawMatrix(ctx);

    if (gameState === 'PLAY') {
        player.draw(ctx);
        // ENEMIES
        enemies.forEach(e => {
            ctx.shadowBlur = 10; ctx.shadowColor = e.c; ctx.fillStyle = e.c;
            ctx.font = 'bold 36px Courier New'; // BIGGER FONT FOR BIGGER ENEMIES
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e.s, e.x, e.y);
        });
        ctx.shadowBlur = 0;

        if (boss && boss.active) { let g = ctx.createLinearGradient(0, boss.y, 0, boss.y + boss.h); g.addColorStop(0, '#B8860B'); g.addColorStop(1, '#FFD700'); ctx.fillStyle = g; ctx.fillRect(boss.x, boss.y, boss.w, boss.h); ctx.fillStyle = '#000'; ctx.font = 'bold 24px Courier New'; ctx.fillText(t('BOSS_ENTER'), boss.x + boss.w / 2, boss.y + boss.h / 2); ctx.fillStyle = 'red'; ctx.fillRect(boss.x, boss.y - 10, boss.w, 6); ctx.fillStyle = '#0f0'; ctx.fillRect(boss.x, boss.y - 10, boss.w * (boss.hp / boss.maxHp), 6); }

        bullets.forEach(b => { let grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h); grad.addColorStop(0, '#fff'); grad.addColorStop(1, b.c); ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(b.x - b.w / 2, b.y + b.h); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x + b.w / 2, b.y + b.h); ctx.fill(); });

        // BETTER ENEMY BULLETS
        enemyBullets.forEach(b => {
            ctx.shadowBlur = 5; ctx.shadowColor = '#ff0055'; ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.moveTo(b.x, b.y + 10); ctx.lineTo(b.x - 4, b.y - 4); ctx.lineTo(b.x + 4, b.y - 4); ctx.fill();
            ctx.shadowBlur = 0;
        });

        muzzleFlashes.forEach(m => { ctx.globalAlpha = m.life / m.maxLife; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(m.x, m.y, 15, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; });
        powerups.forEach(p => { ctx.fillStyle = WEAPONS[p.type].color; ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '16px Arial'; ctx.fillText(WEAPONS[p.type].icon, p.x, p.y); });

        drawParticles(ctx); drawTexts(ctx);

        // --- LEVEL COUNTER BRUTE FORCE FIX ---
        // This ensures the DOM always matches the internal variable in real-time
        if (ui.lvl) ui.lvl.innerText = level;
    }
    ctx.restore();
}

function createParticles(x, y, c, n) { for (let i = 0; i < n; i++) particles.push({ x, y, vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, c, life: 1.0 }); }
function updateParticles(dt) { for (let i = particles.length - 1; i >= 0; i--) { let p = particles[i]; p.x += p.vx * 60 * dt; p.y += p.vy * 60 * dt; p.life -= 2 * dt; if (p.life <= 0) particles.splice(i, 1); } }
function drawParticles(ctx) { particles.forEach(p => { ctx.globalAlpha = p.life; ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 3, 3); }); ctx.globalAlpha = 1; }
function addText(text, x, y, c, size = 20) { floatingTexts.push({ text, x, y, c, size, life: 1.0 }); }
function updateTexts(dt) { for (let i = floatingTexts.length - 1; i >= 0; i--) { floatingTexts[i].y -= 50 * dt; floatingTexts[i].life -= dt; if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1); } }
function drawTexts(ctx) { floatingTexts.forEach(t => { ctx.globalAlpha = t.life; ctx.fillStyle = t.c; ctx.font = `bold ${t.size}px Courier New`; ctx.fillText(t.text, t.x, t.y); }); ctx.globalAlpha = 1; }
// --- MATRIX BACKGROUND ---
let matrixChars = [];
const M_CHARS = "01BTCETH$$£€¥HODL";
function initMatrix() {
    matrixChars = [];
    const cols = Math.floor(gameWidth / 20);
    for (let i = 0; i < cols; i++) {
        matrixChars.push({
            x: i * 20,
            y: Math.random() * gameHeight,
            speed: Math.random() * 2 + 1,
            head: Math.random() < 0.1 // Bright head of the stream
        });
    }
}

function updateMatrix(dt) {
    matrixChars.forEach(c => {
        c.y += c.speed * 60 * dt;
        if (c.y > gameHeight) {
            c.y = -20;
            c.speed = Math.random() * 2 + 1;
        }
    });
}

function drawMatrix(ctx) {
    ctx.fillStyle = '#050505'; // Deep black background
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    ctx.font = '14px Courier New';
    matrixChars.forEach(c => {
        // Trail effect
        let char = M_CHARS[Math.floor(Math.random() * M_CHARS.length)];

        // Bright head
        ctx.fillStyle = '#00ff00';
        ctx.fillText(char, c.x, c.y);

        // Fading tail (simplified for performance)
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.fillText(char, c.x, c.y - 15);
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.fillText(char, c.x, c.y - 30);
    });

    // Grid Overlay
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < gameWidth; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, gameHeight); }
    for (let y = 0; y < gameHeight; y += 40) { ctx.moveTo(0, y); ctx.lineTo(gameWidth, y); }
    ctx.stroke();
}

// Replaces initClouds
function initClouds() { initMatrix(); }

// DRAW FUNCTION OVERHAUL FOR MATRIX
// (Partial override or call inside draw)

window.startGame = function () {
    AudioSys.init();
    ui.intro.style.display = 'none'; ui.gameover.style.display = 'none'; ui.pauseBtn.style.display = 'block';

    // RESET LOGIC
    score = 0; displayScore = 0;
    level = 1; // Start level 1
    wave = 1;

    ui.score.innerText = '0';
    ui.lvl.innerText = '1'; // Visual Reset

    bullets = []; enemies = []; enemyBullets = []; powerups = []; particles = []; floatingTexts = []; muzzleFlashes = []; boss = null;
    initClouds(); WaveManager.reset(); ComboManager.reset(); gameState = 'PLAY';
};

// --- SAFE UI HELPER ---
function setUI(id, val) {
    const el = document.getElementById(id) || ui[id];
    if (el) el.innerText = val;
}
function setStyle(id, prop, val) {
    const el = document.getElementById(id) || ui[id];
    if (el) el.style[prop] = val;
}

// WRAPPED LOOP FOR STABILITY
let lastTime = 0;
function loop(timestamp) {
    try {
        if (gameState === 'PAUSE') { lastTime = timestamp; requestAnimationFrame(loop); return; }

        let rawDt = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        // PREVENTION: Spiral of death / Tab switching lag
        if (rawDt > 0.1) rawDt = 0.1;

        let dt = rawDt * timeScale;

        update(dt);
        draw();
    } catch (err) {
        console.error("CRITICAL LOOP ERROR:", err);
        // Fallback: Try to resume next frame, or pause if persistent
        if (gameState === 'PLAY') {
            console.warn("Attempting auto-recovery...");
        }
    }
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);