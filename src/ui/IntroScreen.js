// IntroScreen.js — Intro screen state machine, ship selection, launch animation
// Extracted from main.js v7.0
window.Game = window.Game || {};
(function() {
    const G = window.Game;

    // --- Dependencies (injected via init) ---
    let d = null;

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
        BTC: { name: 'BTC STRIKER', accent: '#bb44ff', symbol: '\u20bf',
            bodyDark: '#2a2040', bodyLight: '#6644aa', noseDark: '#4d3366', noseLight: '#9966cc',
            finDark: '#1a4455', finLight: '#2a6677', spd: 6, pwr: 7, hit: 5 },
        ETH: { name: 'ETH HEAVY', accent: '#8c7ae6', symbol: '\u039e',
            bodyDark: '#1a2040', bodyLight: '#4a5a8e', noseDark: '#2a3366', noseLight: '#7a8ecc',
            finDark: '#1a3455', finLight: '#2a5077', spd: 4, pwr: 8, hit: 3 },
        SOL: { name: 'SOL SPEEDSTER', accent: '#00d2d3', symbol: '\u25ce',
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
        G.Audio.play('coinUI');
        // v4.35: Hide title animator and clean up anim classes
        if (G.TitleAnimator) G.TitleAnimator.hide();
        _cleanupAnimClasses();

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
        d.setStyle('pwa-install-banner', 'display', 'none');

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
        _doEnterSelection();
    }

    // Go back to mode selection from ship selection
    window.goBackToModeSelect = function() {
        if (introState === 'SPLASH') return;
        introState = 'SPLASH';
        G.Audio.play('coinUI');
        // v4.35: Restore title animator in loop state (no replay)
        if (G.TitleAnimator && !G.TitleAnimator.isActive()) {
            G.TitleAnimator.start(true);
        }

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
            btn.innerHTML = d.t('LAUNCH');
        } else {
            btn.classList.remove('launch-state');
            btn.innerHTML = d.t('TAP_START');
        }
    }

    // Update the mode indicator in selection screen
    function updateModeIndicator() {
        const campaignState = G.CampaignState;
        const isStory = campaignState && campaignState.isEnabled();

        // Reload highScore for current mode (v4.50)
        d.setHighScore(d.loadHighScoreForMode());

        const modeText = document.getElementById('mode-indicator-text');
        const hint = document.getElementById('mode-indicator-hint');
        const scoreLabel = document.getElementById('score-row-label');
        const scoreValue = document.getElementById('badge-score-value');

        if (modeText) {
            modeText.innerText = isStory ? (d.t('MODE_STORY') || d.t('CAMPAIGN')) + ' MODE' : d.t('MODE_ARCADE') + ' MODE';
        }
        if (hint) {
            hint.innerText = d.t('CHANGE_MODE');
        }
        if (scoreLabel) {
            scoreLabel.innerText = d.t('HIGH_SCORE');
        }
        if (scoreValue) {
            scoreValue.innerText = d.getHighScore().toLocaleString();
        }

        // Arcade records row (v4.50)
        const recordsRow = document.getElementById('arcade-records-row');
        if (recordsRow) {
            if (!isStory) {
                const rec = d.loadArcadeRecords();
                recordsRow.style.display = (rec.bestCycle || rec.bestLevel || rec.bestKills) ? 'flex' : 'none';
                const cl = document.getElementById('rec-cycle-label');
                const ll = document.getElementById('rec-level-label');
                const kl = document.getElementById('rec-kills-label');
                if (cl) cl.innerText = d.t('BEST_CYCLE');
                if (ll) ll.innerText = d.t('BEST_LEVEL');
                if (kl) kl.innerText = d.t('BEST_KILLS');
                d.setUI('rec-cycle-val', rec.bestCycle);
                d.setUI('rec-level-val', rec.bestLevel);
                d.setUI('rec-kills-val', rec.bestKills);
            } else {
                recordsRow.style.display = 'none';
            }
        }
    }

    window.cycleShip = function(dir) {
        selectedShipIndex = (selectedShipIndex + dir + SHIP_KEYS.length) % SHIP_KEYS.length;
        updateShipUI();
    }

    // --- GAME MODE SELECTION (Story / Arcade / Daily) ---
    window.setGameMode = function(mode) {
        const campaignState = G.CampaignState;
        const isStory = mode === 'campaign';
        const isDaily = mode === 'daily';
        // Daily runs on arcade rules under the hood — campaign stays disabled.
        const campaignOn = isStory;

        // Reset story progress when switching TO Story mode (fixes intermittent start bug)
        if (campaignOn && !campaignState.isEnabled()) {
            campaignState.storyProgress = {
                PROLOGUE: false,
                CHAPTER_1: false,
                CHAPTER_2: false,
                CHAPTER_3: false
            };
        }

        campaignState.setEnabled(campaignOn);

        // Always reset boss defeats when starting Story Mode (v4.11.0)
        if (campaignOn) {
            campaignState.resetCampaign();
        }

        if (G.DailyMode) G.DailyMode.setActive(isDaily);

        // Update mode selector pills (SPLASH state)
        const storyPill = document.getElementById('mode-pill-story');
        const arcadePill = document.getElementById('mode-pill-arcade');
        const dailyPill = document.getElementById('mode-pill-daily');

        if (storyPill) storyPill.classList.toggle('active', isStory);
        if (arcadePill) arcadePill.classList.toggle('active', mode === 'arcade');
        if (dailyPill) dailyPill.classList.toggle('active', isDaily);

        // Update mode explanation (SPLASH state)
        const storyDesc = document.getElementById('mode-story-desc');
        const arcadeDesc = document.getElementById('mode-arcade-desc');
        const dailyDesc = document.getElementById('mode-daily-desc');
        if (storyDesc) storyDesc.style.display = isStory ? 'block' : 'none';
        if (arcadeDesc) arcadeDesc.style.display = mode === 'arcade' ? 'block' : 'none';
        if (dailyDesc) dailyDesc.style.display = isDaily ? 'block' : 'none';

        // Update mode indicator if in selection state
        if (introState === 'SELECTION') {
            updateModeIndicator();
        }

        // Update UI text for mode change
        d.updateUIText();
        d.updateTiltUI();

        G.Audio.play('coinUI');
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
            const spdBar = '\u2588'.repeat(spdScaled) + '\u2591'.repeat(8 - spdScaled);
            const pwrBar = '\u2588'.repeat(pwrScaled) + '\u2591'.repeat(8 - pwrScaled);
            const hitBar = '\u2588'.repeat(hitScaled) + '\u2591'.repeat(8 - hitScaled);
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
        const scale = 1.05; // v5.28: 1.35->1.05 (ship is +30% larger now)

        // Hover animation
        const hover = Math.sin(introShipTime * 2) * 6;

        ctx.save();
        ctx.translate(cx, cy + hover);
        ctx.scale(scale, scale);

        // v5.28: Swept-back delta -- narrower, more aggressive
        const outline = '#1a1028';
        // LV1 geom
        const ws = 40;   // wingSpan (half-width at tips)
        const sw = 13;   // shoulderW (half-width at shoulders)
        // Fixed Y
        const tipY = -36;
        const shoulderY = -10;
        const wingTipY = 36;     // REARMOST! (more swept back)
        const innerTailY = 13;
        const tailY = 5;
        // X positions
        const shoulderX = sw;
        const wingTipX = ws;
        const innerTailX = 7;

        // === TWIN EXHAUST FLAMES at inner tail (+/-5, 10) ===
        const flameHeight = 18 + Math.sin(introShipTime * 12) * 7;
        const flameWidth = 5 + Math.sin(introShipTime * 10) * 2;
        const pulse = 1 + Math.sin(introShipTime * 8) * 0.15;

        for (const side of [-1, 1]) {
            const nx = side * innerTailX;
            ctx.fillStyle = '#cc3300'; ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.moveTo(nx - flameWidth * 1.4 * pulse, innerTailY);
            ctx.lineTo(nx, innerTailY + flameHeight * 1.2);
            ctx.lineTo(nx + flameWidth * 1.4 * pulse, innerTailY);
            ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.moveTo(nx - flameWidth, innerTailY);
            ctx.lineTo(nx, innerTailY + flameHeight);
            ctx.lineTo(nx + flameWidth, innerTailY);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.moveTo(nx - flameWidth * 0.5, innerTailY);
            ctx.lineTo(nx, innerTailY + flameHeight * 0.65);
            ctx.lineTo(nx + flameWidth * 0.5, innerTailY);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(nx - flameWidth * 0.2, innerTailY);
            ctx.lineTo(nx, innerTailY + flameHeight * 0.35);
            ctx.lineTo(nx + flameWidth * 0.2, innerTailY);
            ctx.closePath(); ctx.fill();
        }

        // === BODY -- 8-vertex inverted V ===
        ctx.lineWidth = 3;
        ctx.strokeStyle = outline;

        // Left half (dark)
        ctx.fillStyle = ship.bodyDark;
        ctx.beginPath();
        ctx.moveTo(0, tipY);
        ctx.lineTo(-shoulderX, shoulderY);
        ctx.lineTo(-wingTipX, wingTipY);
        ctx.lineTo(-innerTailX, innerTailY);
        ctx.lineTo(0, tailY);
        ctx.closePath(); ctx.fill();

        // Right half (light)
        ctx.fillStyle = ship.bodyLight;
        ctx.beginPath();
        ctx.moveTo(0, tipY);
        ctx.lineTo(shoulderX, shoulderY);
        ctx.lineTo(wingTipX, wingTipY);
        ctx.lineTo(innerTailX, innerTailY);
        ctx.lineTo(0, tailY);
        ctx.closePath(); ctx.fill();

        // Full outline
        ctx.beginPath();
        ctx.moveTo(0, tipY);
        ctx.lineTo(-shoulderX, shoulderY);
        ctx.lineTo(-wingTipX, wingTipY);
        ctx.lineTo(-innerTailX, innerTailY);
        ctx.lineTo(0, tailY);
        ctx.lineTo(innerTailX, innerTailY);
        ctx.lineTo(wingTipX, wingTipY);
        ctx.lineTo(shoulderX, shoulderY);
        ctx.closePath(); ctx.stroke();

        // === DORSAL SPINE ===
        ctx.save();
        ctx.strokeStyle = ship.accent;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(0, tipY + 6);
        ctx.lineTo(0, tailY - 1);
        ctx.stroke();
        ctx.restore();

        // === NOSE ACCENT ===
        ctx.lineWidth = 2;
        ctx.strokeStyle = outline;
        ctx.fillStyle = ship.noseDark;
        ctx.beginPath();
        ctx.moveTo(0, tipY);
        ctx.lineTo(-shoulderX - 1, shoulderY + 2);
        ctx.lineTo(0, shoulderY + 2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = ship.noseLight;
        ctx.beginPath();
        ctx.moveTo(0, tipY);
        ctx.lineTo(0, shoulderY + 2);
        ctx.lineTo(shoulderX + 1, shoulderY + 2);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, tipY);
        ctx.lineTo(-shoulderX - 1, shoulderY + 2);
        ctx.lineTo(shoulderX + 1, shoulderY + 2);
        ctx.closePath(); ctx.stroke();

        // === NOSE CANNON (v5.28: cannonLen=10) ===
        {
            const cLen = 10;
            const cTop = tipY - cLen;
            const nbPulse = Math.sin(introShipTime * 6) * 0.3 + 0.7;
            ctx.fillStyle = ship.noseLight; ctx.strokeStyle = outline; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.rect(-4, cTop, 2.5, cLen); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.rect(1.5, cTop, 2.5, cLen); ctx.fill(); ctx.stroke();
            ctx.fillStyle = ship.noseDark;
            ctx.beginPath(); ctx.rect(-5, cTop - 1.5, 10, 3); ctx.fill(); ctx.stroke();
            ctx.fillStyle = ship.accent;
            ctx.globalAlpha = nbPulse * 0.7;
            ctx.beginPath(); ctx.arc(0, cTop, 2.2, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }

        // === WING TIP ACCENTS ===
        {
            const wtPulse = Math.sin(introShipTime * 5) * 0.3 + 0.7;
            ctx.fillStyle = ship.accent;
            ctx.globalAlpha = wtPulse * 0.5;
            ctx.beginPath(); ctx.arc(-wingTipX, wingTipY, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(wingTipX, wingTipY, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }

        // === RIM LIGHTING ===
        ctx.strokeStyle = '#9977cc';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(3, tipY + 4);
        ctx.lineTo(shoulderX + 1, shoulderY);
        ctx.lineTo(wingTipX - 4, wingTipY - 2);
        ctx.stroke();
        ctx.strokeStyle = ship.noseLight; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(2, tipY + 2);
        ctx.lineTo(shoulderX, shoulderY + 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // === COCKPIT (symbol, no canopy) ===
        if (key === 'BTC') {
            const s = 0.85;
            const cockpitColor = '#00f0ff';
            ctx.save();
            ctx.translate(0, -12);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            const drawBPath = () => {
                ctx.beginPath();
                ctx.moveTo(-3 * s, -7 * s); ctx.lineTo(-3 * s, 7 * s);
                ctx.moveTo(-3 * s, -7 * s); ctx.lineTo(1 * s, -7 * s);
                ctx.quadraticCurveTo(6 * s, -7 * s, 6 * s, -3.5 * s);
                ctx.quadraticCurveTo(6 * s, 0, 1 * s, 0);
                ctx.lineTo(-3 * s, 0);
                ctx.moveTo(1 * s, 0);
                ctx.quadraticCurveTo(7 * s, 0, 7 * s, 3.5 * s);
                ctx.quadraticCurveTo(7 * s, 7 * s, 1 * s, 7 * s);
                ctx.lineTo(-3 * s, 7 * s);
                ctx.moveTo(-1 * s, -9 * s); ctx.lineTo(-1 * s, -6 * s);
                ctx.moveTo(2 * s, -9 * s); ctx.lineTo(2 * s, -6 * s);
                ctx.moveTo(-1 * s, 6 * s); ctx.lineTo(-1 * s, 9 * s);
                ctx.moveTo(2 * s, 6 * s); ctx.lineTo(2 * s, 9 * s);
                ctx.stroke();
            };
            ctx.lineWidth = 5 * s;
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
            drawBPath();
            ctx.lineWidth = 1.8 * s;
            ctx.strokeStyle = cockpitColor;
            drawBPath();
            ctx.lineWidth = 0.8 * s;
            ctx.strokeStyle = '#ffffff';
            ctx.globalAlpha = 0.8;
            drawBPath();
            ctx.restore();
        } else {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = ship.accent;
            ctx.shadowBlur = 8;
            ctx.fillText(ship.symbol, 0, -10);
            ctx.shadowBlur = 0;
        }

        ctx.restore();

        introShipAnimId = requestAnimationFrame(animateIntroShip);
    }

    // What's New panel (v4.50, i18n v5.18)
    const WHATS_NEW = [
        {
            version: 'v6.9', date: '2026-04-14',
            title: { EN: '"Major Release" — Architecture + Balance', IT: '"Major Release" — Architettura + Bilanciamento' },
            items: {
                EN: [
                    'HYPER manual activation — fill the DIP meter, tap HYPER button to unleash (strategic choice)',
                    'Smoother difficulty curve — C2 enemies less tanky, weapon upgrades more impactful',
                    'Arcade rebalance — Nano Shield 22s, Jackpot reworked, Speed Demon buffed, guaranteed OFFENSE+DEFENSE cards',
                    'Score multiplier cap at 12x — fairer leaderboard competition',
                    'Specials last 10s instead of 8s — more time to enjoy HOMING/PIERCE/MISSILE',
                    'Multi-touch fix — shield tap no longer interferes with movement',
                    'Security hardened — server-side score validation, anti-replay protection'
                ],
                IT: [
                    'HYPER attivazione manuale — riempi il meter DIP, tocca il pulsante HYPER per attivarlo (scelta strategica)',
                    'Curva difficoltà più graduale — nemici C2 meno resistenti, upgrade armi più percepiti',
                    'Ribilanciamento Arcade — Nano Shield 22s, Jackpot rivisitato, Speed Demon potenziato, carte OFFENSE+DEFENSE garantite',
                    'Cap moltiplicatore punteggio a 12x — classifica più equa',
                    'Speciali durano 10s invece di 8s — più tempo per godersi HOMING/PIERCE/MISSILE',
                    'Fix multi-touch — tap scudo non interferisce più col movimento',
                    'Sicurezza rafforzata — validazione punteggio server-side, protezione anti-replay'
                ]
            }
        },
        {
            version: 'v6.5', date: '2026-02-18',
            title: { EN: '"Adaptive Quality" Release', IT: 'Release "Qualit\u00e0 Adattiva"' },
            items: {
                EN: [
                    'Adaptive Quality System \u2014 auto-detects device performance, adjusts effects in real-time',
                    'ULTRA tier for high-end devices \u2014 boosted particles, glow, and cinematic effects',
                    'Smoother wave streaming \u2014 fixed phase transitions, boss timing, and formation flow',
                    'Story texts rewritten for clarity \u2014 accessible language, no technical jargon',
                    'Hidden debug overlay for testers \u2014 triple-tap at game over for diagnostics',
                    'Browser compatibility check \u2014 graceful fallback for older browsers'
                ],
                IT: [
                    'Sistema Qualit\u00e0 Adattiva \u2014 rileva le prestazioni del dispositivo, regola gli effetti in tempo reale',
                    'Tier ULTRA per dispositivi di fascia alta \u2014 particelle, glow ed effetti cinematici potenziati',
                    'Streaming wave pi\u00f9 fluido \u2014 transizioni di fase, timing boss e flusso formazioni corretti',
                    'Testi narrativi riscritti per chiarezza \u2014 linguaggio accessibile, niente gergo tecnico',
                    'Overlay debug nascosto per tester \u2014 triplo tap al game over per diagnostica',
                    'Controllo compatibilit\u00e0 browser \u2014 fallback per browser datati'
                ]
            }
        },
        {
            version: 'v6.0', date: '2026-02-18',
            title: { EN: '"RafaX Release" \u2014 Phase Streaming + Elite Variants', IT: '"RafaX Release" \u2014 Streaming a Fasi + Varianti Elite' },
            items: {
                EN: [
                    'Phase-based streaming: waves have 2-3 independent phases, each with own formation',
                    'Next phase triggers when most enemies are defeated \u2014 no screen flooding',
                    'Elite Variants: Armored (C1), Evader (C2), Reflector (C3) \u2014 one per cycle',
                    '4 enemy behaviors: Flanker, Bomber, Healer, Charger',
                    'Per-phase escalation: fire rate and behavior chance increase each phase'
                ],
                IT: [
                    'Streaming a fasi: le wave hanno 2-3 fasi indipendenti, ognuna con propria formazione',
                    'La fase successiva parte quando la maggior parte dei nemici \u00e8 sconfitta \u2014 niente sovraffollamento',
                    'Varianti Elite: Corazzato (C1), Evasore (C2), Riflettore (C3) \u2014 una per ciclo',
                    '4 comportamenti nemici: Flanker, Bombardiere, Guaritore, Caricatore',
                    'Escalation per fase: rateo di fuoco e probabilit\u00e0 comportamenti aumentano ogni fase'
                ]
            }
        },
        {
            version: 'v5.31', date: '2026-02-18',
            title: { EN: 'Shield Energy Skin + HYPER Rework', IT: 'Scudo Energy Skin + Rework HYPER' },
            items: {
                EN: [
                    'Shield redesigned as body-conforming energy skin with 4-layer glow',
                    'HYPER aura reworked: golden speed lines + horizontal timer bar replace circles',
                    'Bullet Banking: bullets follow ship movement slightly',
                    'Mobile hardening: blocked overscroll, contextmenu, gesture events'
                ],
                IT: [
                    'Scudo ridisegnato come skin energetica aderente al corpo con glow a 4 livelli',
                    'Aura HYPER rielaborata: speed lines dorate + barra timer orizzontale al posto dei cerchi',
                    'Bullet Banking: i proiettili seguono leggermente il movimento della nave',
                    'Hardening mobile: bloccati overscroll, contextmenu, eventi gesture'
                ]
            }
        },
        {
            version: 'v5.30', date: '2026-02-18',
            title: { EN: 'Ship Flight Dynamics', IT: 'Dinamica di Volo Nave' },
            items: {
                EN: [
                    '5 visual flight effects: Banking Tilt, Hover Bob, Asymmetric Thrust, Wing Vapor Trails, Squash & Stretch',
                    'Ship tilts smoothly when moving sideways with asymmetric recovery',
                    'Wing vapor trails appear at high speed, color-reactive for HYPER/GODCHAIN',
                    'All effects are visual-only with individual kill-switches'
                ],
                IT: [
                    '5 effetti visivi di volo: Inclinazione, Oscillazione, Spinta Asimmetrica, Scie Alari, Squash & Stretch',
                    'La nave si inclina fluidamente nei movimenti laterali con recupero asimmetrico',
                    'Scie di vapore alari ad alta velocit\u00e0, colore reattivo per HYPER/GODCHAIN',
                    'Tutti gli effetti sono solo visivi con kill-switch individuali'
                ]
            }
        },
        {
            version: 'v5.29', date: '2026-02-18',
            title: { EN: 'Game Over Redesign + OLED Deep Black', IT: 'Redesign Game Over + Nero OLED' },
            items: {
                EN: [
                    'Game Over screen redesigned \u2014 hero score with violet glow, inline stats row',
                    'All panels and overlays now use pure OLED black for deeper contrast',
                    'Inner containers (cards, modals, sections) upgraded to true black',
                    'PWA icon regenerated to match the new v5.28 ship design'
                ],
                IT: [
                    'Schermata Game Over ridisegnata \u2014 punteggio hero con glow viola, stats in riga',
                    'Tutti i pannelli e overlay ora usano nero OLED puro per contrasto pi\u00f9 profondo',
                    'Container interni (card, modali, sezioni) aggiornati a nero puro',
                    'Icona PWA rigenerata per la nuova nave v5.28'
                ]
            }
        },
        {
            version: 'v5.28', date: '2026-02-18',
            title: { EN: 'Ship Redesign "Premium Arsenal"', IT: 'Redesign Nave "Arsenal Premium"' },
            items: {
                EN: [
                    'Ship 30% larger with swept-back delta silhouette',
                    'Glass cockpit canopy with reactive \u20bf symbol \u2014 changes color by element',
                    'Heavy central barrel at LV3 with triple-layer neon rails',
                    'Energy circuit lines connecting reactor to all cannons at max level',
                    'Energy Surge slow-motion effect on weapon transitions'
                ],
                IT: [
                    'Nave 30% pi\u00f9 grande con silhouette delta a freccia',
                    'Canopy cockpit vetrato con simbolo \u20bf reattivo \u2014 cambia colore per elemento',
                    'Canna centrale pesante a LV3 con triplo strato di binari neon',
                    'Linee circuito energetico dal reattore a tutti i cannoni al livello massimo',
                    'Effetto slow-motion Energy Surge sulle transizioni arma'
                ]
            }
        },
        {
            version: 'v5.27', date: '2026-02-17',
            title: { EN: 'Polish & Feel', IT: 'Rifinitura & Sensazioni' },
            items: {
                EN: [
                    'Boss HP bar simplified \u2014 diamond notch markers on phase thresholds',
                    'Cannon tint now reflects your active element (fire/laser/electric/GODCHAIN)',
                    'Game start countdown 3\u21922\u21921\u2192GO! with tick sound effects',
                    'Tutorial text revamped with arcade-style messages'
                ],
                IT: [
                    'Barra HP boss semplificata \u2014 tacche diamante sulle soglie di fase',
                    'Tinta cannone ora riflette l\'elemento attivo (fuoco/laser/elettrico/GODCHAIN)',
                    'Countdown di inizio partita 3\u21922\u21921\u2192GO! con effetti sonori tick',
                    'Testo tutorial rinnovato con messaggi stile arcade'
                ]
            }
        },
        {
            version: 'v5.26', date: '2026-02-17',
            title: { EN: 'Unified Combat HUD + HYPERGOD', IT: 'HUD Combattimento Unificato + HYPERGOD' },
            items: {
                EN: [
                    'NEW: HYPERGOD state \u2014 activate HYPER during GODCHAIN for 5\u00d7 score multiplier',
                    'HYPER, GODCHAIN and HYPERGOD unified in a single top combat bar with fill animation',
                    'Prismatic gradient effect for HYPERGOD display',
                    'Combat bar persists through wave transitions and pickups'
                ],
                IT: [
                    'NUOVO: Stato HYPERGOD \u2014 attiva HYPER durante GODCHAIN per moltiplicatore punteggio 5\u00d7',
                    'HYPER, GODCHAIN e HYPERGOD unificati in una singola barra combattimento con animazione fill',
                    'Effetto gradiente prismatico per il display HYPERGOD',
                    'La barra combattimento persiste tra transizioni wave e pickup'
                ]
            }
        },
        {
            version: 'v5.25', date: '2026-02-16',
            title: { EN: 'Power-Up Redesign + Status HUD', IT: 'Redesign Power-Up + HUD Stato' },
            items: {
                EN: [
                    'All power-ups redesigned as uniform circles with white icons and pulsing blink',
                    'HOMING bullet is now an orange orb tracker (opposite to blue MISSILE)',
                    'NEW: Status HUD shows active power-up countdown with live timer',
                    'Elemental CSS effects on status display \u2014 fire flicker, electric flash, laser glow',
                    'Shield blinks faster in the last 1.5 seconds as a warning'
                ],
                IT: [
                    'Tutti i power-up ridisegnati come cerchi uniformi con icone bianche e lampeggio pulsante',
                    'Il proiettile HOMING \u00e8 ora un orb tracker arancione (opposto al MISSILE blu)',
                    'NUOVO: HUD stato mostra il countdown del power-up attivo con timer live',
                    'Effetti CSS elementali sul display stato \u2014 fiamma, flash elettrico, glow laser',
                    'Lo scudo lampeggia pi\u00f9 veloce negli ultimi 1.5 secondi come avvertimento'
                ]
            }
        },
        {
            version: 'v5.24', date: '2026-02-16',
            title: { EN: 'Android Compatibility + Stability', IT: 'Compatibilit\u00e0 Android + Stabilit\u00e0' },
            items: {
                EN: [
                    'Tutorial now remembered per mode \u2014 won\'t show again after first completion',
                    'Fixed enemy entry animation timeout \u2014 prevents firing blockade on slow devices',
                    'Global error handler for better crash diagnostics',
                    'Android PWA: resolved enemy glitching and firing issues'
                ],
                IT: [
                    'Tutorial ora ricordato per modalit\u00e0 \u2014 non si ripresenta dopo il primo completamento',
                    'Corretto timeout animazione entrata nemici \u2014 previene blocco sparo su dispositivi lenti',
                    'Gestore errori globale per migliore diagnostica crash',
                    'PWA Android: risolti problemi glitch nemici e sparo'
                ]
            }
        },
        {
            version: 'v5.23', date: '2026-02-16',
            title: { EN: 'Leaderboard Upgrade + Polish', IT: 'Classifica Potenziata + Pulizia' },
            items: {
                EN: [
                    'Leaderboard: 1 entry per nickname (best score only), 1 nickname per device',
                    'Boss HP bar and name now displayed below the boss \u2014 cleaner battlefield',
                    'Game over properly hides HUD elements (graze meter, DIP bar)',
                    'Swipe controls: relative drag mode + sensitivity slider affects all modes',
                    'PWA safe area: reliable layout on iOS standalone mode'
                ],
                IT: [
                    'Classifica: 1 entry per nickname (solo miglior punteggio), 1 nickname per dispositivo',
                    'Barra HP e nome boss ora mostrati sotto il boss \u2014 campo di battaglia pi\u00f9 pulito',
                    'Il game over nasconde correttamente gli elementi HUD (graze meter, barra DIP)',
                    'Controlli swipe: modalit\u00e0 drag relativo + slider sensibilit\u00e0 per tutte le modalit\u00e0',
                    'PWA safe area: layout affidabile su iOS in modalit\u00e0 standalone'
                ]
            }
        },
    ];
    const WHATS_NEW_PLANNED = [
        { EN: 'Achievement system', IT: 'Sistema achievement' },
        { EN: 'New bosses', IT: 'Nuovi boss' }
    ];
    function renderWhatsNew() {
        const container = document.getElementById('whatsnew-content');
        if (!container) return;
        const lang = d.getCurrentLang() || 'EN';
        let html = '';
        for (const entry of WHATS_NEW) {
            const title = entry.title[lang] || entry.title.EN;
            const items = entry.items[lang] || entry.items.EN;
            html += `<div class="whatsnew-version"><h3>${entry.version} \u2014 ${title}</h3><span class="wn-date">${entry.date}</span><ul>`;
            for (const item of items) html += `<li>${item}</li>`;
            html += '</ul></div>';
        }
        if (WHATS_NEW_PLANNED.length) {
            html += `<div class="whatsnew-planned"><h3>${d.t('COMING_SOON') || 'COMING SOON'}</h3><ul>`;
            for (const item of WHATS_NEW_PLANNED) html += `<li>${item[lang] || item.EN}</li>`;
            html += '</ul></div>';
        }
        container.innerHTML = html;
    }
    // v7.0 Phase 5.1: Achievement toast notification
    function showAchievementToasts(defs) {
        const stack = document.getElementById('achievement-toast-stack');
        if (!stack || !defs || !defs.length) return;
        const tag = d.t('ACHIEVEMENT_UNLOCKED') || 'ACHIEVEMENT UNLOCKED';
        defs.forEach((def, i) => {
            const name = d.t('ACH_' + def.id + '_NAME') || def.id;
            const desc = d.t('ACH_' + def.id + '_DESC') || '';
            const el = document.createElement('div');
            el.className = 'achievement-toast';
            el.innerHTML = `<span class="ach-icon">${def.icon}</span><div class="ach-body"><div class="ach-tag">${tag}</div><div class="ach-name">${name}</div><div class="ach-desc">${desc}</div></div>`;
            // Stagger reveal so multi-unlocks don't slam in at once
            setTimeout(() => {
                stack.appendChild(el);
                if (G.Audio) G.Audio.play('coinPerk');
                setTimeout(() => {
                    el.classList.add('fade-out');
                    setTimeout(() => el.remove(), 400);
                }, 4200);
            }, i * 600);
        });
    }
    if (G.Events) G.Events.on('ACHIEVEMENTS_UNLOCKED', showAchievementToasts);

    // v7.0 Phase 5.1: Profile / Stats panel
    function _stat(label, value) {
        return `<div class="profile-stat"><span class="profile-stat-label">${label}</span><span class="profile-stat-value">${value}</span></div>`;
    }
    function renderProfile() {
        const container = document.getElementById('profile-content');
        if (!container || !G.StatsTracker) return;
        const s = G.StatsTracker.get();
        const fmt = (n) => (n | 0).toLocaleString();
        if (!s.totalRuns) {
            container.innerHTML = `<div class="profile-empty">${d.t('PROFILE_NO_DATA') || 'No runs yet.'}</div>`;
            return;
        }
        const lifetime = [
            _stat(d.t('PROFILE_RUNS') || 'RUNS', fmt(s.totalRuns)),
            _stat(d.t('PROFILE_KILLS') || 'KILLS', fmt(s.totalKills)),
            _stat(d.t('PROFILE_BOSSES') || 'BOSSES', fmt(s.bossesDefeated)),
            _stat(d.t('PROFILE_MINIBOSSES') || 'MINI-BOSSES', fmt(s.miniBossesDefeated)),
            _stat(d.t('PROFILE_PLAYTIME') || 'PLAY TIME', G.StatsTracker.formatTime(s.totalPlayTime)),
            _stat(d.t('PROFILE_TOTAL_SCORE') || 'TOTAL SCORE', fmt(s.totalScore))
        ].join('');
        const bests = [
            _stat(d.t('PROFILE_HIGHEST_SCORE') || 'BEST SCORE', fmt(s.highestScoreRun)),
            _stat(d.t('PROFILE_LONGEST_RUN') || 'LONGEST RUN', G.StatsTracker.formatTime(s.longestRunSec)),
            _stat(d.t('PROFILE_BEST_COMBO') || 'BEST COMBO', (s.highestCombo || 0).toFixed(2) + 'x'),
            _stat(d.t('PROFILE_BEST_STREAK') || 'BEST STREAK', fmt(s.bestStreakEver)),
            _stat(d.t('PROFILE_HYPERS') || 'HYPERS', fmt(s.hyperActivations)),
            _stat(d.t('PROFILE_GODCHAINS') || 'GODCHAINS', fmt(s.godchainActivations))
        ].join('');
        const modeRow = (key, m) => `<div class="profile-mode-row"><span class="profile-mode-name">${d.t(key) || key}</span><span>${fmt(m.runs)} runs · ${fmt(m.kills)} kills · ${fmt(m.bossesDefeated)} bosses</span></div>`;
        const byMode = modeRow('PROFILE_MODE_STORY', s.byMode.story) + modeRow('PROFILE_MODE_ARCADE', s.byMode.arcade);

        // Achievements section
        let achHtml = '';
        if (G.AchievementSystem) {
            const defs = G.AchievementSystem.getDefinitions();
            const unlockedCount = G.AchievementSystem.getUnlockedCount();
            const total = G.AchievementSystem.getTotalCount();
            const rows = defs.map(def => {
                const on = G.AchievementSystem.isUnlocked(def.id);
                const name = d.t('ACH_' + def.id + '_NAME') || def.id;
                const desc = d.t('ACH_' + def.id + '_DESC') || '';
                return `<div class="ach-row ${on ? 'ach-on' : 'ach-off'}"><span class="ach-row-icon">${on ? def.icon : '🔒'}</span><div class="ach-row-body"><div class="ach-row-name">${name}</div><div class="ach-row-desc">${desc}</div></div></div>`;
            }).join('');
            achHtml = `<div class="profile-section"><h3>${d.t('PROFILE_ACHIEVEMENTS') || 'ACHIEVEMENTS'} <span class="ach-counter">${unlockedCount}/${total}</span></h3>${rows}</div>`;
        }

        container.innerHTML =
            `<div class="profile-section"><h3>${d.t('PROFILE_LIFETIME') || 'LIFETIME'}</h3><div class="profile-grid">${lifetime}</div></div>` +
            `<div class="profile-section"><h3>${d.t('PROFILE_BESTS') || 'RECORDS'}</h3><div class="profile-grid">${bests}</div></div>` +
            `<div class="profile-section"><h3>${d.t('PROFILE_BY_MODE') || 'BY MODE'}</h3>${byMode}</div>` +
            achHtml;
    }
    window.toggleProfile = function () {
        const panel = document.getElementById('profile-panel');
        if (!panel) return;
        const isVisible = panel.style.display === 'flex';
        panel.style.display = isVisible ? 'none' : 'flex';
        if (!isVisible) {
            renderProfile();
            const title = document.getElementById('profile-title');
            const closeBtn = document.getElementById('btn-profile-close');
            const resetBtn = document.getElementById('btn-profile-reset');
            if (title) title.innerText = d.t('PROFILE_TITLE') || 'PILOT PROFILE';
            if (closeBtn) closeBtn.innerText = d.t('CLOSE') || 'CLOSE';
            if (resetBtn) resetBtn.innerText = d.t('PROFILE_RESET') || 'RESET STATS';
            G.Audio.play('coinUI');
        }
    };
    window.resetProfileStats = function () {
        if (!G.StatsTracker) return;
        const msg = d.t('PROFILE_RESET_CONFIRM') || 'Reset all stats?';
        if (window.confirm(msg)) {
            G.StatsTracker.reset();
            if (G.AchievementSystem) G.AchievementSystem.reset();
            renderProfile();
        }
    };

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
            if (title) title.innerText = d.t('WHATS_NEW') || "WHAT'S NEW";
            if (closeBtn) closeBtn.innerText = d.t('CLOSE') || 'CLOSE';
            G.Audio.play('coinUI');
            // Mark version as seen -- remove glow
            try { localStorage.setItem('fiat_whatsnew_seen', G.VERSION); } catch(e) {}
            const wnBtn = document.getElementById('intro-whatsnew');
            if (wnBtn) wnBtn.classList.remove('btn-glow-notify');
        }
    };

    window.goToHangar = function () {
        G.Audio.init();
        G.Audio.startMusic(); // Resumes context + starts music
        window.scrollTo(0, 0);
        d.setStyle('intro-screen', 'display', 'none');
        d.setStyle('hangar-screen', 'display', 'flex');
        d.setGameState('HANGAR');
        if (G.SkyRenderer) G.SkyRenderer.init(d.getGameWidth(), d.getGameHeight());
        if (G.WeatherController) G.WeatherController.init(d.getGameWidth(), d.getGameHeight()); // Start BG effect early
        if (G.MessageSystem) G.MessageSystem.init(d.getGameWidth(), d.getGameHeight(), {
            onShake: (intensity) => { d.setShake(Math.max(d.getShake ? d.getShake() : 0, intensity)); },
            onPlaySound: (sound) => { G.Audio.play(sound); }
        });
        if (G.MemeEngine) G.MemeEngine.initDOM();
        if (G.MessageSystem) G.MessageSystem.initDOM();
    }

    // Ship launch animation - goes directly to game (skips hangar)
    let isLaunching = false;
    window.launchShipAndStart = async function () {
        if (isLaunching) return;
        isLaunching = true;

        // v6.10.0: Daily Seed Run gating — block second attempt and seed RNG
        if (G.DailyMode && G.DailyMode.isActive()) {
            if (G.DailyMode.isLockedToday()) {
                isLaunching = false;
                if (G.MemeEngine) {
                    G.MemeEngine.queueMeme('CRITICAL',
                        `${d.t('DAILY_LOCKED') || 'Daily already played'} — ${G.DailyMode.formatCountdown()}`,
                        '⏳');
                }
                return;
            }
            try {
                await G.RNG.setDailySeed();
            } catch (e) {
                console.warn('[Daily] seed failed', e);
                G.DailyMode.setActive(false);
            }
        } else if (G.RNG) {
            G.RNG.clear();
        }

        // v5.23: Prompt nickname once per session; skip allowed
        if (!G.hasNickname() && !window._nickPromptShown) {
            window._nickPromptShown = true;
            isLaunching = false;
            G.showNicknamePrompt(() => launchShipAndStart());
            return;
        }

        // Init audio context and resume immediately (must be synchronous with user gesture)
        if (!G.Audio.ctx) G.Audio.init();
        if (G.Audio.ctx && G.Audio.ctx.state === 'suspended') {
            G.Audio.unlockWebAudio();
            G.Audio.ctx.resume().catch(e => console.warn('[Audio] resume failed:', e));
        }

        const shipCanvas = document.getElementById('intro-ship-canvas');
        const introScreen = document.getElementById('intro-screen');
        const curtain = document.getElementById('curtain-overlay');

        // v5.0: ship canvas removed from HTML -- skip launch animation if missing
        if (!shipCanvas) {
            if (introScreen) { introScreen.style.display = 'none'; }
            selectedShipIndex = 0;
            d.getPlayer().configure(SHIP_KEYS[selectedShipIndex]);
            G.Audio.startMusic();
            if (G.SkyRenderer) G.SkyRenderer.init(d.getGameWidth(), d.getGameHeight());
            if (G.WeatherController) G.WeatherController.init(d.getGameWidth(), d.getGameHeight());
            const campaignState = G.CampaignState;
            if (campaignState && campaignState.isEnabled() && d.shouldShowStory('PROLOGUE')) {
                setTimeout(() => { if (curtain) curtain.classList.add('open'); }, 100);
                d.showStoryScreen('PROLOGUE', () => { d.startGame(); });
            } else {
                d.startGame();
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
        function destroyElement(el, delay) {
            if (delay === undefined) delay = 0;
            setTimeout(() => {
                G.Audio.play('shoot');

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
                const shakeVal = Math.sin(launchTime * 60) * (2 + intensity * 5);
                const glow = 20 + intensity * 40;
                launchShip.style.transform = `translateX(${shakeVal}px) scale(${1 + intensity * 0.1})`;
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
            const scaleVal = 1.1 + Math.min(0.25, (shipStartY - currentY) * 0.0004);
            const glowSize = 40 + (shipStartY - currentY) * 0.06;
            const trailLength = Math.min(80, (shipStartY - currentY) * 0.15);

            launchShip.style.top = currentY + 'px';
            launchShip.style.transform = `scale(${scaleVal})`;
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
            d.setStyle('intro-screen', 'display', 'none');

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
            d.getPlayer().configure(selectedShipKey);

            G.Audio.startMusic();
            if (G.SkyRenderer) G.SkyRenderer.init(d.getGameWidth(), d.getGameHeight());
            if (G.WeatherController) G.WeatherController.init(d.getGameWidth(), d.getGameHeight());

            // Show prologue if needed, then start game (WARMUP + tutorial on first play)
            const campaignState = G.CampaignState;
            if (campaignState && campaignState.isEnabled() && d.shouldShowStory('PROLOGUE')) {
                setTimeout(() => {
                    if (curtain) curtain.classList.add('open');
                }, 100);
                d.showStoryScreen('PROLOGUE', () => {
                    d.startGame();
                });
            } else {
                d.startGame();
                setTimeout(() => {
                    if (curtain) curtain.classList.add('open');
                }, 100);
            }
        }

        // Start animation
        requestAnimationFrame(animateLaunch);
    }

    function selectShip(type) {
        d.getPlayer().configure(type);
        d.setStyle('hangar-screen', 'display', 'none');
        d.startGame();
    }
    window.selectShip = selectShip;

    window.backToIntro = function () {
        if (G.DebugOverlay) G.DebugOverlay.hide();
        d.clearBossDeathTimeouts(); // v5.13.1: Cancel orphan boss death timeouts

        // Immediately hide touch controls (before curtain animation)
        const ui = d.getUI();
        if (ui.touchControls) {
            ui.touchControls.classList.remove('visible');
            ui.touchControls.style.display = 'none';
        }
        d.setStyle('control-zone-hint', 'display', 'none');

        // Close curtain first
        const curtain = document.getElementById('curtain-overlay');
        if (curtain) curtain.classList.remove('open');

        setTimeout(() => {
            // v4.21: Comprehensive cleanup of ALL game overlays
            d.setStyle('pause-screen', 'display', 'none');
            d.setStyle('gameover-screen', 'display', 'none');
            d.setStyle('hangar-screen', 'display', 'none');
            d.setStyle('perk-modal', 'display', 'none');
            // v4.37: Hide tutorial overlay
            d.setStyle('tutorial-overlay', 'display', 'none');
            const uiRef = d.getUI();
            if (uiRef.uiLayer) uiRef.uiLayer.style.display = 'none'; // HIDE HUD
            if (uiRef.touchControls) {
                uiRef.touchControls.classList.remove('visible');
                uiRef.touchControls.style.display = 'none';
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
            // Hide game completion screen/video if exists
            const gcScreen = document.getElementById('game-completion-screen');
            if (gcScreen) gcScreen.style.display = 'none';
            const compVid = document.getElementById('completion-video');
            if (compVid) { compVid.pause(); compVid.style.display = 'none'; }
            d.closePerkChoice();

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

            d.setGameState('INTRO');
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
            const bullets = d.getBullets();
            const enemyBullets = d.getEnemyBullets();
            if (bullets && bullets.length) { bullets.forEach(b => G.Bullet.Pool.release(b)); bullets.length = 0; }
            if (enemyBullets && enemyBullets.length) { enemyBullets.forEach(b => G.Bullet.Pool.release(b)); enemyBullets.length = 0; }

            G.Audio.resetState();
            G.Audio.init();
            if (G.HarmonicConductor) G.HarmonicConductor.reset();
            initIntroShip();

            // v4.35: Restart TitleAnimator in skip mode (no replay on return)
            if (G.TitleAnimator) {
                _cleanupAnimClasses();
                const subtitleEl = document.getElementById('title-subtitle');
                if (subtitleEl) subtitleEl.textContent = d.t('TITLE_SUBTITLE');
                G.TitleAnimator.init(d.getGameWidth(), d.getGameHeight(), {});
                G.TitleAnimator.start(true);
            }

            // Reopen curtain
            setTimeout(() => {
                if (curtain) curtain.classList.add('open');
            }, 100);
        }, 800);
    };

    // --- Public API ---
    G.IntroScreen = {
        init: function(deps) {
            d = deps;
            initSplashShip();
        },
        SHIP_KEYS: SHIP_KEYS,
        SHIP_DISPLAY: SHIP_DISPLAY,
        getSelectedShipIndex: function() { return selectedShipIndex; },
        getSelectedShipKey: function() { return SHIP_KEYS[selectedShipIndex]; },
        getIntroState: function() { return introState; },
        resetToSplash: function() { introState = 'SPLASH'; },
        tick: function(dt) { if (_introActionCooldown > 0) _introActionCooldown -= dt; },
        updateCampaignProgressUI: updateCampaignProgressUI,
        updateModeIndicator: updateModeIndicator,
        updatePrimaryButton: updatePrimaryButton,
        initIntroShip: initIntroShip,
        // For backToIntro cleanup
        _cleanupAnimClasses: _cleanupAnimClasses
    };
})();
