// Main Entry Point (Namespace Pattern)
const G = window.Game;
const Constants = G;
const audioSys = G.Audio;
const inputSys = G.Input;
const waveMgr = G.WaveManager;

// --- GLOBAL STATE ---
let canvas, ctx;
let gameWidth = 600;
let gameHeight = 800;
let gameState = 'VIDEO';
let userLang = navigator.language || navigator.userLanguage;
let currentLang = userLang.startsWith('it') ? 'IT' : 'EN';

// Game Entities
let player;
let bullets = [], enemyBullets = [], enemies = [], powerUps = [], particles = [], floatingTexts = [], muzzleFlashes = [];
let matrixChars = [];
let highScore = parseInt(localStorage.getItem('fiat_highscore')) || 0; // PERSISTENCE
setUI('highScoreVal', highScore); // UI Update
let boss = null;
let score = 0, displayScore = 0, level = 1;
let shake = 0, gridDir = 1, gridSpeed = 25, timeScale = 1.0, totalTime = 0, intermissionTimer = 0, currentMeme = "";
let currentShipIdx = 0;
let lastWavePattern = 'RECT';

const ui = {};

// --- HELPER FUNCTIONS ---
function t(key) { return Constants.TEXTS[currentLang][key] || key; }
function setStyle(id, prop, val) { const el = document.getElementById(id) || ui[id]; if (el) el.style[prop] = val; }
function setUI(id, val) { const el = document.getElementById(id) || ui[id]; if (el) el.innerText = val; }

// --- INITIALIZATION ---
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d', { alpha: false });

    ['intro-screen', 'hangar-screen', 'settings-modal', 'pause-screen', 'gameover-screen',
        'scoreVal', 'lvlVal', 'weaponName', 'shieldBar', 'livesVal', 'finalScore',
        'highScoreVal', 'version-tag', 'pause-btn', 'lang-btn'].forEach(id => {
            const key = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase()).replace('screen', '').replace('Val', '');
            ui[key] = document.getElementById(id);
        });

    const startBtn = document.querySelector('.btn-coin');
    if (startBtn) {
        startBtn.addEventListener('click', (e) => { e.stopPropagation(); inputSys.trigger('start'); });
        startBtn.addEventListener('touchstart', (e) => { e.stopPropagation(); e.preventDefault(); inputSys.trigger('start'); });
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
    const btnInsert = document.querySelector('#intro-screen .btn-coin');
    if (btnInsert) btnInsert.innerText = t('INSERT_COIN');
    const pauseTitle = document.querySelector('#pause-screen .neon-title');
    if (pauseTitle) pauseTitle.innerText = t('PAUSED');
    if (document.querySelector('.left-module .label')) document.querySelector('.left-module .label').innerText = t('SCORE');
    if (document.querySelector('.right-module .label')) document.querySelector('.right-module .label').innerText = t('LEVEL');
}

window.toggleLang = function () { currentLang = (currentLang === 'EN') ? 'IT' : 'EN'; updateUIText(); };
window.toggleSettings = function () { setStyle('settings-modal', 'display', (document.getElementById('settings-modal').style.display === 'flex') ? 'none' : 'flex'); updateUIText(); };
window.goToHangar = function () {
    audioSys.init(); // Ensure Context is ready
    audioSys.startMusic(); // START THE BEAT
    audioSys.play('coin');
    window.scrollTo(0, 0);
    setStyle('intro-screen', 'display', 'none');
    setStyle('hangar-screen', 'display', 'flex');
    gameState = 'HANGAR';
    initMatrix(); // Start BG effect early
}
window.togglePause = function () {
    if (gameState === 'PLAY' || gameState === 'INTERMISSION') { gameState = 'PAUSE'; setStyle('pause-screen', 'display', 'flex'); setStyle('pause-btn', 'display', 'none'); }
    else if (gameState === 'PAUSE') { gameState = 'PLAY'; setStyle('pause-screen', 'display', 'none'); setStyle('pause-btn', 'display', 'block'); }
};
window.backToIntro = function () {
    setStyle('pause-screen', 'display', 'none'); setStyle('gameover-screen', 'display', 'none'); setStyle('hangar-screen', 'display', 'none');
    setStyle('intro-screen', 'display', 'flex'); gameState = 'INTRO'; audioSys.init();
};

function selectShip(type) {
    player.configure(type);
    setStyle('hangar-screen', 'display', 'none');
    startGame();
}
window.selectShip = selectShip;

function updateLivesUI() {
    let hearts = ""; for (let h = 0; h < player.hp; h++) hearts += "❤️";
    setUI('livesVal', hearts);
}

function startGame() {
    audioSys.init();
    setStyle('intro-screen', 'display', 'none'); setStyle('gameover-screen', 'display', 'none'); setStyle('pause-btn', 'display', 'block');
    score = 0; displayScore = 0; level = 1; setUI('scoreVal', '0'); setUI('lvlVal', '1');
    bullets = []; enemies = []; enemyBullets = []; powerUps = []; particles = []; floatingTexts = []; muzzleFlashes = []; boss = null;

    waveMgr.reset();
    gridDir = 1;
    gridSpeed = 24;

    gameState = 'PLAY';
    player.resetState();
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

function spawnBoss() {
    let hp = 300 * level;
    boss = { x: gameWidth / 2 - 110, y: -150, w: 220, h: 100, hp: hp, maxHp: hp, active: true, dir: 1 };
    enemies = [];
    addText(t('BOSS_ENTER'), gameWidth / 2, gameHeight / 2, '#FFD700', 40); shake = 20; audioSys.play('bossSpawn');
}

function update(dt) {
    if (gameState !== 'PLAY' && gameState !== 'INTERMISSION') return;
    totalTime += dt;

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
    updateMatrix(dt);
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
                boss.hp -= (b.isHodl ? 2 : 1);
                if (!b.penetration) {
                    b.markedForDeletion = true;
                    G.Bullet.Pool.release(b);
                    bullets.splice(i, 1);
                }
                if (boss.hp <= 0) {
                    score += 5000; boss.active = false; boss = null; shake = 50; audioSys.play('explosion');
                    addText("MARKET CONQUERED", gameWidth / 2, gameHeight / 2, '#FFD700', 50);
                    level++; setUI('lvlVal', level); addText("LEVEL " + level + " REACHED!", gameWidth / 2, gameHeight / 2, '#00ff00', 40);
                    waveMgr.reset(); gridSpeed += 15;
                    startIntermission("MARKET CYCLE " + Math.ceil(level / 3));
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
            if (Math.abs(eb.x - player.x) < 30 && Math.abs(eb.y - player.y) < 30) {
                if (player.takeDamage()) {
                    updateLivesUI();
                    G.Bullet.Pool.release(eb);
                    enemyBullets.splice(i, 1);
                    shake = 20;
                    hitStopTimer = 0.3; // SLOW MO triggering
                    if (player.hp <= 0) {
                        gameState = 'GAMEOVER'; setStyle('gameover-screen', 'display', 'flex'); setUI('finalScore', score); setStyle('pause-btn', 'display', 'none'); audioSys.play('explosion');
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
            e.hp -= 10; audioSys.play('hit');
            if (e.hp <= 0) {
                enemies.splice(j, 1);
                audioSys.play('coin');
                score += e.scoreVal;
                setUI('scoreVal', score);
                createExplosion(e.x, e.y, e.color, 12);

                // DROP LOGIC
                if (Math.random() < 0.15) { // 15% Chance
                    const r = Math.random();
                    const type = r < 0.4 ? 'RAPID' : (r < 0.7 ? 'SPREAD' : 'SHIELD');
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
    enemies.forEach(e => {
        e.update(dt, totalTime, lastWavePattern, gridSpeed, gridDir);
        if ((gridDir === 1 && e.x > gameWidth - 20) || (gridDir === -1 && e.x < 20)) hitEdge = true;

        const bulletData = e.attemptFire(dt, player); // Pass player for aiming
        if (bulletData) {
            audioSys.play('enemyShoot');
            // Acquire from Pool
            enemyBullets.push(G.Bullet.Pool.acquire(bulletData.x, bulletData.y, bulletData.vx, bulletData.vy, bulletData.color, bulletData.w, bulletData.h, false));
        }
    });

    if (hitEdge) { gridDir *= -1; enemies.forEach(e => e.baseY += 20); }

    enemies.forEach(e => {
        if (Math.abs(e.x - player.x) < 40 && Math.abs(e.y - player.y) < 40) {
            if (player.takeDamage()) {
                updateLivesUI();
                shake = 40; // Heavy shake
                hitStopTimer = 2.0; // 2 Seconds of SlowMo
                flashRed = 0.8; // Red screen overlay opacity
                if (player.hp <= 0) {
                    // Update High Score
                    if (score > highScore) {
                        highScore = score;
                        localStorage.setItem('fiat_highscore', highScore);
                        setUI('highScoreVal', highScore);
                    }
                    gameState = 'GAMEOVER'; setStyle('gameover-screen', 'display', 'flex'); setUI('finalScore', score); setStyle('pause-btn', 'display', 'none'); audioSys.play('explosion');
                }
            }
        }
    });
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

    drawMatrix(ctx);

    // Impact Flash (Behind entities or on top? On top feels more intense)
    if (flashRed > 0) {
        flashRed -= 0.02; // Fade out
        ctx.fillStyle = `rgba(255, 0, 0, ${flashRed})`;
        ctx.fillRect(-20, -20, gameWidth + 40, gameHeight + 40); // Cover shaken area
    }
    if (gameState === 'PLAY') {
        player.draw(ctx);
        enemies.forEach(e => e.draw(ctx));
        if (boss && boss.active) {
            boss.draw(ctx); // Use new Class draw
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

function initMatrix() {
    matrixChars = [];
    const cols = Math.floor(gameWidth / 20);
    for (let i = 0; i < cols; i++) {
        matrixChars.push({ x: i * 20, y: Math.random() * gameHeight, speed: Math.random() * 2 + 1 });
    }
}
function updateMatrix(dt) {
    if (matrixChars.length === 0) initMatrix();
    matrixChars.forEach(c => {
        c.y += c.speed * 60 * dt;
        if (c.y > gameHeight) { c.y = -20; c.speed = Math.random() * 2 + 1; }
    });
}
function drawMatrix(ctx) {
    ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, gameWidth, gameHeight);
    ctx.font = '14px Courier New'; ctx.fillStyle = '#003300';
    matrixChars.forEach(c => { ctx.fillText(Constants.M_CHARS[Math.floor(Math.random() * Constants.M_CHARS.length)], c.x, c.y); });
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

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        p.size *= 0.90; // Shrink fast

        if (p.life <= 0) particles.splice(i, 1);
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
let flashRed = 0;

function loop(timestamp) {
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    if (dt > 0.1) dt = 0.1;
    update(dt);
    updatePowerUps(dt); // <--- NEW CALL
    draw();
    requestAnimationFrame(loop);
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
            }
        }
    }
}

init();
