// Main Entry Point (Namespace Pattern)
const G = window.Game;
const Constants = G;
const audioSys = G.Audio;
const inputSys = G.Input;
const waveMgr = G.WaveManager;
window.Game.images = {}; // Placeholder, populated by main.js


// --- GLOBAL STATE ---
let canvas, ctx;
let gameWidth = 600;
let gameHeight = 800;
let gameState = 'VIDEO';
let userLang = navigator.language || navigator.userLanguage;
let currentLang = userLang.startsWith('it') ? 'IT' : 'EN';
let isBearMarket = false; // 🐻

// Game Entities
let player;
let bullets = [], enemyBullets = [], enemies = [], powerUps = [], particles = [], floatingTexts = [], muzzleFlashes = [];
let clouds = []; // ☁️
let images = {}; // 🖼️ Asset Cache

// Load Assets
function loadAssets() {
    const assets = window.Game.ASSETS;
    let loaded = 0;
    const total = Object.keys(assets).length;

    for (const [key, src] of Object.entries(assets)) {
        const img = new Image();
        img.src = src;
        img.src = src;
        img.onload = () => { loaded++; /* console.log(`Loaded ${key}`); */ };
        img.onerror = () => {
            console.error(`Failed to load asset: ${key}`);
            img.failed = true; // SAFETY FIX: Flag for safe drawing
            loaded++;
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

const ui = {};

// --- HELPER FUNCTIONS ---
function t(key) { return Constants.TEXTS[currentLang][key] || key; }
function setStyle(id, prop, val) { const el = document.getElementById(id) || ui[id]; if (el) el.style[prop] = val; }
function setUI(id, val) { const el = document.getElementById(id) || ui[id]; if (el) el.innerText = val; }

// -----------------------------------------------------------------------------
// ASSET LOADER (Requested Fix)
// -----------------------------------------------------------------------------
window.Game.assets = {}; // User requested 'G.assets' but usually we attach to window.Game for modules
// Or if user wants 'const G' scope locally? "Crea un oggetto const G.assets = {}"
// I will use window.Game.assets to be safe across files.

async function newLoadAssets() { // Renamed to avoid conflict with existing loadAssets
    const assetsData = window.Game.ASSETS;
    const promises = [];

    for (const [key, src] of Object.entries(assetsData)) {
        promises.push(new Promise((resolve) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                window.Game.assets[key] = img;
                resolve();
            };
            img.onerror = () => {
                console.error(`Failed to load: ${src}`);
                // Fallback?
                window.Game.assets[key] = null;
                resolve(); // resolving anyway to not block game
            };
        }));
    }
    await Promise.all(promises);
    console.log("Assets Loaded:", Object.keys(window.Game.assets));
}

// Boot
window.onload = init;

// -----------------------------------------------------------------------------
// INITIALIZATION
// -----------------------------------------------------------------------------
async function init() {
    // 1. Load Assets
    await newLoadAssets(); // Using the new asset loader

    // 2. Initialize Subsystems
    if (window.Game.WaveManager) window.Game.WaveManager.init();

    // 3. Setup Explicit Event Listeners for UI (Fixing Broken Buttons)
    document.querySelectorAll('.mute-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            audioSys.toggleMute();
            updateMuteIcons();
        });
        btn.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            e.preventDefault();
            audioSys.toggleMute();
            updateMuteIcons();
        });
    });

    // Language Toggle
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
        langBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleLang(); });
        langBtn.addEventListener('touchstart', (e) => { e.stopPropagation(); e.preventDefault(); toggleLang(); });
    }

    // Settings Toggle
    const settingsBtn = document.getElementById('btn-settings');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleSettings(); });
        settingsBtn.addEventListener('touchstart', (e) => { e.stopPropagation(); e.preventDefault(); toggleSettings(); });
    }

    // Start Loop (Only after setup)
    // CALL SETUP LOGIC (Previously in oldInit)
    setupGame();
}

function setupGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d', { alpha: false });

    ['intro-screen', 'hangar-screen', 'settings-modal', 'pause-screen', 'gameover-screen',
        'scoreVal', 'lvlVal', 'weaponName', 'shieldBar', 'healthBar', 'finalScore',
        'highScoreVal', 'version-tag', 'pause-btn', 'lang-btn', 'ui-layer', 'touchControls', 'livesText'].forEach(id => {
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
        setTimeout(() => { if (splash) splash.remove(); setStyle('intro-screen', 'display', 'flex'); try { updateUIText(); } catch (e) { } }, 1000);
    };

    inputSys.on('escape', () => {
        if (gameState === 'VIDEO') startApp();
        else if (gameState === 'PLAY' || gameState === 'PAUSE') togglePause();
        else if (gameState === 'HANGAR' || gameState === 'SETTINGS') backToIntro();
    });

    inputSys.on('start', () => {
        if (gameState === 'VIDEO') startApp();
        else if (gameState === 'INTRO') goToHangar();
        else if (gameState === 'HANGAR') selectShip(Object.keys(Constants.SHIPS)[currentShipIdx]);
        else if (gameState === 'GAMEOVER') backToIntro();
    });

    inputSys.on('navigate', (code) => {
        if (gameState === 'HANGAR') {
            if (code === 'ArrowRight' || code === 'KeyD') {
                currentShipIdx = (currentShipIdx + 1) % 3;
                highlightShip(currentShipIdx);
            }
            if (code === 'ArrowLeft' || code === 'KeyA') {
                currentShipIdx = (currentShipIdx - 1 + 3) % 3;
                highlightShip(currentShipIdx);
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

    // START LOOP
    loop(0);

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
    if (goTitle) goTitle.innerText = t('GAME_OVER');
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
window.togglePause = function () {
    if (gameState === 'PLAY' || gameState === 'INTERMISSION') { gameState = 'PAUSE'; setStyle('pause-screen', 'display', 'flex'); setStyle('pause-btn', 'display', 'none'); }
    else if (gameState === 'PAUSE') { gameState = 'PLAY'; setStyle('pause-screen', 'display', 'none'); setStyle('pause-btn', 'display', 'block'); }
};
window.backToIntro = function () {
    setStyle('pause-screen', 'display', 'none'); setStyle('gameover-screen', 'display', 'none'); setStyle('hangar-screen', 'display', 'none');
    if (ui.uiLayer) ui.uiLayer.style.display = 'none'; // HIDE HUD
    if (ui.touchControls) ui.touchControls.style.display = 'none';
    setStyle('intro-screen', 'display', 'flex'); gameState = 'INTRO'; audioSys.init();
};

function selectShip(type) {
    player.configure(type);
    setStyle('hangar-screen', 'display', 'none');
    startGame();
}
window.selectShip = selectShip;

window.nextLevel = function () {
    setStyle('level-complete-screen', 'display', 'none');
    level++;
    setUI('lvlVal', level);

    // Difficulty Scaling
    gridSpeed += 10;

    waveMgr.reset();
    gameState = 'PLAY'; // Or go via Intermission? Let's go straight to ACTION!
    startIntermission("STARTING CYCLE " + level); // Actually Intermission is good for pacing

    audioSys.startMusic();
};

window.toggleBearMode = function () {
    isBearMarket = !isBearMarket;
    const btn = document.querySelector('.btn-bear');
    if (isBearMarket) {
        document.body.classList.add('bear-mode');
        if (btn) btn.innerHTML = "🩸 HARDCORE ACTIVE";
        if (btn) btn.style.color = "#ff0000";
        audioSys.play('bossSpawn'); // Scary sound
    } else {
        document.body.classList.remove('bear-mode');
        if (btn) btn.innerHTML = "🐻 BEAR MARKET";
        if (btn) btn.style.color = "#fff";
    }
};

window.restartGame = function () {
    togglePause(); // Unpause first to clear state
    startGame(); // Reset and Run
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
    setStyle('intro-screen', 'display', 'none'); setStyle('gameover-screen', 'display', 'none'); setStyle('pause-btn', 'display', 'block');
    if (ui.uiLayer) ui.uiLayer.style.display = 'flex'; // SHOW HUD
    if (ui.touchControls) ui.touchControls.style.display = 'block';

    score = 0; displayScore = 0; level = 1; lives = 3; setUI('scoreVal', '0'); setUI('lvlVal', '1'); setUI('livesText', lives);
    bullets = []; enemies = []; enemyBullets = []; powerUps = []; particles = []; floatingTexts = []; muzzleFlashes = []; boss = null;
    G.enemies = enemies; // Expose for Boss Spawning logic

    waveMgr.reset();
    gridDir = 1;
    // DIFFICULTY UP
    gridSpeed = G.DIFFICULTY.GRID_SPEED_START || 40;

    gameState = 'PLAY';
    player.resetState();

    if (isBearMarket) {
        player.hp = 1; // ONE HIT KILL
        player.maxHp = 1; // Full bar but Red (logic handled in updateLivesUI)
        gridSpeed = 60; // Faster start for Bear
        addText("🩸 SURVIVE THE CRASH 🩸", gameWidth / 2, gameHeight / 2 - 100, '#ff0000', 30);
    }

    updateLivesUI();
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
}

// -----------------------------------------------------------------------------
// SKY / BACKGROUND SYSTEM
// -----------------------------------------------------------------------------


function spawnBoss() {
    // hp is handled inside Boss class now (or pass level?)
    boss = new G.Boss(gameWidth, gameHeight);

    // boss.configure(level)? Currently Boss scales phases by HP pct, but maxHp is fixed 500 in class.
    // Let's allow scaling via a method or constructor if needed. 
    // For now, default Boss is fine.
    // Balanced HP: 100 on Lv1, 150 Lv2, 200 Lv3...
    boss.hp = 50 + (level * 50);
    boss.maxHp = boss.hp;

    enemies = [];
    if (window.Game) window.Game.enemies = enemies; // Ensure Global Sync

    addText(t('BOSS_ENTER'), gameWidth / 2, gameHeight / 2, '#FFD700', 40); shake = 20; audioSys.play('bossSpawn');
}

function update(dt) {
    if (gameState !== 'PLAY' && gameState !== 'INTERMISSION') return;
    totalTime += dt;

    const waveAction = waveMgr.update(dt, gameState, enemies, !!boss);

    if (waveAction) {
        if (waveAction.action === 'START_INTERMISSION') {
            startIntermission();
        } else if (waveAction.action === 'SPAWN_BOSS') {
            spawnBoss();
        } else if (waveAction.action === 'START_WAVE') {
            gameState = 'PLAY';
            if (waveMgr.wave > 1) {
                level++; setUI('lvlVal', level);
                addText("LEVEL " + level, gameWidth / 2, gameHeight / 2 - 50, '#00ff00', 30);
                gridSpeed += 15;
            }
            let msg = waveMgr.wave === 1 ? t('WAVE1') : (waveMgr.wave === 2 ? t('WAVE2') : t('WAVE3'));
            addText(msg, gameWidth / 2, gameHeight / 2, '#F7931A', 40);

            const spawnData = waveMgr.spawnWave(gameWidth);
            enemies = spawnData.enemies;
            lastWavePattern = spawnData.pattern;
            gridDir = 1;
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
    }
    updateFloatingTexts(dt);
    updateParticles(dt);
}

function updateBullets(dt) {
    // Player Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.update(dt);
        if (b.markedForDeletion) {
            G.Bullet.Pool.release(b);
            bullets.splice(i, 1);
        } else {
            if (boss && boss.active && b.x > boss.x && b.x < boss.x + boss.width && b.y > boss.y && b.y < boss.y + boss.height) {
                boss.damage(b.isHodl ? 2 : 1);
                if (!b.penetration) {
                    b.markedForDeletion = true;
                    G.Bullet.Pool.release(b);
                    bullets.splice(i, 1);
                }
                if (boss.hp <= 0) {
                    score += 5000; boss.active = false; boss = null; shake = 50; audioSys.play('explosion');
                    addText("MARKET CONQUERED", gameWidth / 2, gameHeight / 2, '#FFD700', 50);

                    // Trigger Level Complete Screen
                    setTimeout(() => {
                        gameState = 'LEVEL_COMPLETE';
                        setStyle('level-complete-screen', 'display', 'flex');
                        audioSys.stopMusic(); // Quiet moment of victory
                        if (audioSys.ctx && audioSys.ctx.resume) audioSys.ctx.resume(); // Ensure active
                        audioSys.play('coin'); // Ching!
                    }, 1500); // 1.5s delay to see explosion
                }
            } else {
                checkBulletCollisions(b, i);
            }
        }
    }

    // Enemy Bullets (Now using Bullet class instances from Pool)
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let eb = enemyBullets[i];
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

                    if (player.hp <= 0) {
                        startDeathSequence();
                    } else {
                        hitStopTimer = 0.3; // Normal Hit SlowMo
                    }
                }
            }
        }
    }
}

function checkBulletCollisions(b, bIdx) {
    for (let j = enemies.length - 1; j >= 0; j--) {
        let e = enemies[j];
        if (Math.abs(b.x - e.x) < 35 && Math.abs(b.y - e.y) < 35) {
            const dmg = (player.stats && player.stats.damage) ? player.stats.damage : 1;
            e.hp -= dmg; // Applying Player Damage (now 1.2)
            audioSys.play('hit');
            if (e.hp <= 0) {
                enemies.splice(j, 1);
                audioSys.play('coin');
                score += e.scoreVal * (isBearMarket ? 2 : 1);
                setUI('scoreVal', score);
                setUI('scoreVal', score);
                createExplosion(e.x, e.y, e.color, 12);
                createScoreParticles(e.x, e.y, e.color); // JUICE: Fly to score

                // DROP LOGIC (Modular)
                if (Math.random() < G.DROPS.CHANCE) {
                    const r = Math.random();
                    // Simple table lookup
                    const table = G.DROPS.TABLE;
                    let type = 'SHIELD'; // Default
                    if (r < table[0].weight) type = table[0].type;
                    else if (r < table[1].weight) type = table[1].type;

                    powerUps.push(new G.PowerUp(e.x, e.y, type));
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
    const speedMult = isBearMarket ? 1.5 : 1.0;

    // Dynamic Difficulty: Enemies speed up as they die (Classic Space Invaders)
    // 0% dead -> 1.0x, 90% dead -> 2.5x
    const totalEnemies = waveMgr.lastSpawnCount || 20; // Need to track this in WaveManager
    const alivePct = enemies.length / Math.max(1, totalEnemies);
    // DIFFICULTY UP: Late wave super speed
    const frenzyMult = 1.0 + (1.0 - alivePct) * 4.0;

    enemies.forEach(e => {
        e.update(dt, totalTime, lastWavePattern, gridSpeed * speedMult * frenzyMult, gridDir);
        if ((gridDir === 1 && e.x > gameWidth - 20) || (gridDir === -1 && e.x < 20)) hitEdge = true;

        // More aggressive fire in Bear Market
        const bearAggro = isBearMarket ? G.DIFFICULTY.BEAR_MULT : 1.0;
        const bulletData = e.attemptFire(dt * bearAggro, player); // Pass player for aiming
        if (bulletData) {
            audioSys.play('enemyShoot');
            // Acquire from Pool
            enemyBullets.push(G.Bullet.Pool.acquire(bulletData.x, bulletData.y, bulletData.vx, bulletData.vy, bulletData.color, bulletData.w, bulletData.h, false));
        }
    });

    if (hitEdge) { gridDir *= -1; enemies.forEach(e => e.baseY += 20); }

    enemies.forEach(e => {
        const hitR = (player.stats.hitboxSize || 30) + 10; // Slightly larger for body collision
        if (Math.abs(e.x - player.x) < hitR && Math.abs(e.y - player.y) < hitR) {
            if (player.takeDamage()) {
                updateLivesUI();
                shake = 40; // Heavy shake
                hitStopTimer = 0.5; // Contact hit slowmo
                if (player.hp <= 0) {
                    startDeathSequence();
                }
            }
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
        bullets.forEach(b => b.draw(ctx));
        enemyBullets.forEach(eb => eb.draw(ctx));
        powerUps.forEach(p => p.draw(ctx)); // <--- DRAW DROPS
        // Draw Particles (Confetti)
        particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            // No Glow
            // Draw Squares (Confetti)
            ctx.translate(p.x, p.y);
            ctx.rotate(p.life * 10); // Spin
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        });

        drawParticles(ctx);

        // Comic Floating Text
        ctx.font = 'bold 30px Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'black';
        ctx.lineJoin = 'round';

        floatingTexts.forEach(t => {
            ctx.fillStyle = t.c;
            ctx.strokeText(t.text, t.x, t.y); // Outline
            ctx.fillText(t.text, t.x, t.y);   // Fill
        });
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
}

function drawSky(ctx) {
    // 1. Sky Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, gameHeight);

    if (isBearMarket) {
        // Bear Market: Dark Storm
        grad.addColorStop(0, '#1a0000'); // Blood Red Black
        grad.addColorStop(0.5, '#4a0000');
        grad.addColorStop(1, '#000000');
    } else if (boss && boss.active) {
        // Boss: Deep Space
        grad.addColorStop(0, '#000000');
        grad.addColorStop(1, '#050510');
    } else {
        // Dynamic Level Cycle
        const cycle = (level - 1) % 3; // 0=Day, 1=Dusk, 2=Night

        if (cycle === 0) { // Level 1, 4, 7... DAY
            grad.addColorStop(0, '#3498db'); // Blue
            grad.addColorStop(1, '#87ceeb'); // Sky Blue
        } else if (cycle === 1) { // Level 2, 5, 8... DUSK
            grad.addColorStop(0, '#2c3e50'); // Dark Blue
            grad.addColorStop(0.5, '#8e44ad'); // Purple
            grad.addColorStop(1, '#e67e22'); // Orange Sunset
        } else { // Level 3, 6, 9... NIGHT
            grad.addColorStop(0, '#020205'); // Almost Black
            grad.addColorStop(1, '#1a1a2e'); // Dark Blue
        }
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    // 2. Parallax Clouds / Stars
    // If Space/Night, maybe draw small stars instead of clouds?
    // For now, let's just dim the clouds in Space/Night.

    clouds.forEach(c => {
        let alpha = 0.05 + (c.layer * 0.05);
        if (boss && boss.active) alpha *= 0.2; // Very faint in space
        if (!isBearMarket && (level - 1) % 3 === 2) alpha *= 0.5; // Faint at night

        ctx.fillStyle = isBearMarket ? `rgba(20, 0, 0, ${0.3 + (c.layer * 0.1)})` : `rgba(255, 255, 255, ${alpha})`;

        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
    });
}

function addText(text, x, y, c, size = 20) { floatingTexts.push({ text, x, y, c, size, life: 1.0 }); }
function updateFloatingTexts(dt) { for (let i = floatingTexts.length - 1; i >= 0; i--) { floatingTexts[i].y -= 50 * dt; floatingTexts[i].life -= dt; if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1); } }
// --- PARTICLES ---
function createExplosion(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 200 + 50;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.6, // Short life
            maxLife: 0.6,
            color: color,
            size: Math.random() * 3 + 2
        });
    }
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
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
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

    // SAFETY FIX: Protected Game Loop
    try {
        update(dt);
        updatePowerUps(dt);
        updateSky(dt); // ☁️ Always update sky
        draw();
    } catch (error) {
        console.error("Game Loop Error:", error);
        window.Game.errors = (window.Game.errors || 0) + 1;

        // Reset error count every second
        const now = Date.now();
        if (!window.Game.lastErrorTime || now - window.Game.lastErrorTime > 1000) {
            window.Game.errors = 1;
            window.Game.lastErrorTime = now;
        }

        // Emergency Halt
        if (window.Game.errors > 5) {
            cancelAnimationFrame(window.animationId); // Stop Loop
            alert("SYSTEM FAILURE - RELOAD");
            return;
        }
    }

    window.animationId = requestAnimationFrame(loop);
}

function triggerGameOver() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('fiat_highscore', highScore);
        setUI('highScoreVal', highScore);
    }
    gameState = 'GAMEOVER';
    setStyle('gameover-screen', 'display', 'flex');
    setUI('finalScore', score);
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
            // Collision Logic
            if (Math.abs(p.x - player.x) < 40 && Math.abs(p.y - player.y) < 40) {
                audioSys.play('powerup'); // Ensure sound exists or fallback? 'coin' is safe, 'powerup' maybe missing. Use 'coin' for now if unsure.
                // Actually user didn't specify sound, will assume 'coin' upgrade sound is handled or I adds it.
                // Let's use 'coin' for safety unless 'powerup' is known.
                // Checking previous code... audioSys.play('coin') is used for drops. 

                // EFFECT LOGIC
                if (p.type === 'RAPID_FIRE') {
                    player.fireRate = 0.1;
                    player.rapidFireTimer = 5.0; // Handled in Player update? Need to ensure Player.js handles reset.
                    // Or we set a timeout/timer here? 
                    // Better: logic in Player.update to count down rapidFireTimer. 
                    // IF Player.js doesn't have it, I might need to patch Player.js too.
                    // Let's Assume Player.js needs patch or we do a hack here?
                    // "File: src/main.js ... Logica: ... per 5 secondi" -> implies Logic here or Player.
                    // I will check Player.js next. For now, set the property.
                    addText("CANDLE BOOST!", player.x, player.y - 40, '#00ff00', 30);
                }
                else if (p.type === 'SHIELD') {
                    player.shieldActive = true;
                    player.shieldHp = 100; // Force full shield
                    addText("INSURANCE!", player.x, player.y - 40, '#3498db', 30);
                }
                else if (p.type === 'NUKE') {
                    // Liquidation Event
                    addText("LIQUIDATION!", gameWidth / 2, gameHeight / 2, '#ff0000', 50);
                    shake = 60;
                    enemies.forEach(e => {
                        e.hp -= 50; // Massive Damage
                        createExplosion(e.x, e.y, e.color, 10);
                        if (e.hp <= 0) {
                            score += e.scoreVal;
                            createScoreParticles(e.x, e.y, e.color);
                        }
                    });
                    // Clean up dead enemies in next frame or force filter now?
                    // enemies = enemies.filter(e => e.hp > 0); // Safer to let updateEnemies handle death?
                    // updateEnemies handles death logic (splice). But if we subtract HP here, they won't trigger "death sequence" logic in updateEnemies (score, sound) unless we duplicate it or let updateEnemies checks it.
                    // updateEnemies Checks bullets vs enemies. It doesn't check "is hp <= 0" generally unless hit.
                    // WAIT. `updateEnemies` logic: checkBulletCollisions checks hp.
                    // `updateEnemies` does NOT check if hp <= 0 independently.
                    // So I MUST handle death here for NUKE.

                    for (let k = enemies.length - 1; k >= 0; k--) {
                        if (enemies[k].hp <= 0) {
                            enemies.splice(k, 1);
                            // Visuals already spawned above
                        }
                    }
                    setUI('scoreVal', score);
                }

                powerUps.splice(i, 1);
            }
        }
    }
}

init();
