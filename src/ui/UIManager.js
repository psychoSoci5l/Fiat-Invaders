// UIManager v1.0 — Extracted from main.js
// Manages DOM manipulation, resize, localization, settings, PWA, and UI state.
window.Game = window.Game || {};
(function () {
    'use strict';
    var G = window.Game;
    var d = {}; // deps

    var _isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // --- DOM Cache ---
    var _domCache = {};
    function cachedEl(id) { return _domCache[id] || (_domCache[id] = document.getElementById(id) || d.ui && d.ui[id]); }
    function setStyle(id, prop, val) { var el = cachedEl(id); if (el) el.style[prop] = val; }
    function setUI(id, val) { var el = cachedEl(id); if (el) el.innerText = val; }

    // --- PWA Detection ---
    function isPWAStandalone() {
        if (window.navigator.standalone === true) return true;
        if (window.matchMedia('(display-mode: standalone)').matches) return true;
        if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
        return false;
    }

    // --- Resize ---
    function resize() {
        var cs = getComputedStyle(d.getSentinel());
        var envTop = parseFloat(cs.paddingTop) || 0;
        var envBot = parseFloat(cs.paddingBottom) || 0;
        var safeTop = envTop;
        var safeBottom = envBot;
        var vpTop = 0, vpBot = 0;

        if (window.isPWA && _isIOS) {
            vpTop = envTop;
            vpBot = envBot;
            if (vpTop < 20 && screen.height >= 812) vpTop = 59;
            if (vpBot < 10 && screen.height >= 812) vpBot = 34;
            d.getContainer().style.top = '0px';
            d.getContainer().style.bottom = '0px';
            safeTop = vpTop;
            safeBottom = vpBot;
        }

        var diSafeTop = (_isIOS && safeTop < 10 && screen.height >= 812) ? 59 : safeTop;
        document.documentElement.style.setProperty('--di-safe-top', diSafeTop + 'px');
        document.documentElement.style.setProperty('--safe-top', safeTop + 'px');
        document.documentElement.style.setProperty('--safe-bottom', safeBottom + 'px');
        document.documentElement.style.setProperty('--vp-safe-top', vpTop + 'px');
        document.documentElement.style.setProperty('--vp-safe-bottom', vpBot + 'px');
        window.safeAreaInsets = { top: safeTop, bottom: safeBottom, left: 0, right: 0 };

        var gw = Math.min(600, d.getContainer().clientWidth);
        var gh = d.getContainer().clientHeight;
        d.getCanvas().width = gw;
        d.getCanvas().height = gh;
        d.setGameWidth(gw);
        d.setGameHeight(gh);
        G._gameWidth = gw;
        G._gameHeight = gh;
        G._safeTop = safeTop;
        G._safeBottom = safeBottom;
        var playableHeight = gh - safeBottom;

        var player = d.getPlayer();
        if (player) {
            player.gameWidth = gw;
            player.gameHeight = playableHeight;
        }
        if (G.ParticleSystem) G.ParticleSystem.setDimensions(gw, gh);
        if (G.EffectsRenderer) G.EffectsRenderer.setDimensions(gw, gh);
        if (G.MessageSystem) G.MessageSystem.setDimensions(gw, gh);
        var stripEl = document.getElementById('message-strip');
        if (stripEl) window._stripTopY = parseFloat(getComputedStyle(stripEl).top) || 47;
        if (G.SkyRenderer) {
            G.SkyRenderer.setDimensions(gw, gh);
            if (G.WeatherController) G.WeatherController.setDimensions(gw, gh);
        }
        if (G.TitleAnimator) G.TitleAnimator.setDimensions(gw, gh);
        if (G.StoryScreen && G.StoryScreen.isShowing()) G.StoryScreen.setDimensions(gw, gh);
    }

    // --- UI Text (i18n) ---
    function updateUIText() {
        var t = d.t;
        var verEl = document.getElementById('version-tag');
        if (verEl) verEl.innerText = G.VERSION;
        var joy = d.getJoystick();
        if (d.getUI().joyDeadzone && joy) d.getUI().joyDeadzone.value = Math.round(joy.deadzone * 100);
        if (d.getUI().joySensitivity && joy) d.getUI().joySensitivity.value = Math.round(joy.sensitivity * 100);
        if (d.getUI().introMeme) d.getUI().introMeme.innerText = d.getRandomMeme();
        var memeTicker = document.getElementById('meme-ticker');
        if (memeTicker && !memeTicker.innerText) memeTicker.innerText = d.getRandomMeme();

        var subtitleEl = document.getElementById('title-subtitle');
        if (subtitleEl) subtitleEl.textContent = t('TITLE_SUBTITLE');
        var selectionHeader = document.getElementById('selection-header');
        if (selectionHeader) selectionHeader.innerText = t('CHOOSE_SHIP');

        var labelStory = document.getElementById('label-story');
        if (labelStory) labelStory.innerText = t('MODE_STORY') || t('CAMPAIGN');
        var labelArcade = document.getElementById('label-arcade');
        if (labelArcade) labelArcade.innerText = t('MODE_ARCADE') || t('ARCADE');
        var storyDesc = document.getElementById('mode-story-desc');
        var arcadeDesc = document.getElementById('mode-arcade-desc');
        if (storyDesc) storyDesc.innerText = t('MODE_STORY_DESC') || "Follow Bitcoin's rise against central banks.";
        if (arcadeDesc) arcadeDesc.innerText = t('MODE_ARCADE_DESC') || "Endless waves. High scores. Pure action.";

        var btnPrimary = document.getElementById('btn-primary-action');
        if (btnPrimary) {
            if (G.IntroScreen && G.IntroScreen.getIntroState() === 'SELECTION') {
                btnPrimary.innerHTML = t('LAUNCH');
            } else {
                btnPrimary.innerHTML = t('TAP_START');
            }
        }

        var modeHint = document.getElementById('mode-indicator-hint');
        if (modeHint) modeHint.innerText = t('CHANGE_MODE');
        var scoreRowLabel = document.getElementById('score-row-label');
        if (scoreRowLabel) scoreRowLabel.innerText = t('HIGH_SCORE');
        if (G.IntroScreen) G.IntroScreen.updateModeIndicator();

        var scoreLabel = document.getElementById('score-label');
        if (scoreLabel) scoreLabel.innerText = t('ACCOUNT_BALANCE');
        var levelLabel = document.getElementById('level-label');
        if (levelLabel) levelLabel.innerText = t('LEVEL');
        var livesLabel = document.getElementById('lives-label');
        if (livesLabel) livesLabel.innerText = t('LIVES');
        var killLabel = document.getElementById('killLabel');
        if (killLabel) killLabel.innerText = t('KILLS');
        var grazeLabel = document.getElementById('graze-label');
        if (grazeLabel) grazeLabel.innerText = t('GRAZE');

        var pauseTitle = document.getElementById('pause-title');
        if (pauseTitle) pauseTitle.innerText = t('PAUSED');
        var resumeBtn = document.getElementById('btn-resume');
        if (resumeBtn) resumeBtn.innerText = '➡ ' + t('RESUME');
        var settingsBtn = document.getElementById('btn-settings');
        if (settingsBtn) settingsBtn.innerText = '➡ ' + t('SETTINGS');
        var restartBtn = document.getElementById('btn-restart');
        if (restartBtn) restartBtn.innerText = '➡ ' + t('RESTART_RUN');
        var exitBtn = document.getElementById('btn-exit-title');
        if (exitBtn) exitBtn.innerText = '➡ ' + t('EXIT');

        var goTitle = document.querySelector('#gameover-screen h1');
        if (goTitle) goTitle.innerText = "LIQUIDATION EVENT";
        var goBtn = document.getElementById('btn-retry');
        if (goBtn) goBtn.innerText = t('RESTART');

        var setHeader = document.querySelector('#settings-modal h2');
        if (setHeader) setHeader.innerText = t('SETTINGS');
        var closeBtn = document.getElementById('btn-settings-close');
        if (closeBtn) closeBtn.innerText = t('CLOSE');
        document.querySelectorAll('#settings-modal .settings-section-header').forEach(function (h) {
            var key = h.dataset.i18n;
            if (key) h.innerText = t(key);
        });
        var setManualBtn = document.getElementById('set-manual-btn');
        if (setManualBtn) setManualBtn.innerText = t('SET_MANUAL');
        var setFeedbackBtn = document.getElementById('set-feedback-btn');
        if (setFeedbackBtn) setFeedbackBtn.innerText = t('SET_FEEDBACK');
        var setCreditsBtn = document.getElementById('set-credits-btn');
        if (setCreditsBtn) setCreditsBtn.innerText = t('SET_CREDITS');
        var setPrivacyBtn = document.getElementById('set-privacy-btn');
        if (setPrivacyBtn) setPrivacyBtn.innerText = t('PRIVACY');
        var setMusicLabel = document.getElementById('set-music-label');
        if (setMusicLabel) setMusicLabel.innerText = t('SET_MUSIC');
        var setSfxLabel = document.getElementById('set-sfx-label');
        if (setSfxLabel) setSfxLabel.innerText = t('SET_SFX');

        var langBtn = document.getElementById('lang-btn');
        if (langBtn) {
            var langLabel = langBtn.parentElement.querySelector('.setting-label');
            if (langLabel) langLabel.innerText = t('LANG');
            var switchLabel = langBtn.querySelector('.switch-label');
            if (switchLabel) switchLabel.innerText = d.getCurrentLang();
            if (d.getCurrentLang() === 'IT') langBtn.classList.add('active');
            else langBtn.classList.remove('active');
        }
        var controlBtn = document.getElementById('control-btn');
        if (controlBtn) {
            var isJoystick = G.Input && G.Input.touch && G.Input.touch.useJoystick;
            var cSwitchLabel = controlBtn.querySelector('.switch-label');
            if (cSwitchLabel) cSwitchLabel.innerText = isJoystick ? 'JOY' : 'SWIPE';
            if (isJoystick) controlBtn.classList.add('active');
            else controlBtn.classList.remove('active');
        }
        updateTiltUI();

        var qualityLabel = document.getElementById('set-quality-label');
        if (qualityLabel) qualityLabel.innerText = t('SET_QUALITY');
        updateQualityUI();
        updateManualText();
    }

    // --- Audio Toggle UI ---
    function updateMusicUI(isMuted) {
        var btn = document.getElementById('set-music-btn');
        if (!btn) return;
        var icon = btn.querySelector('.toggle-icon');
        if (icon) icon.textContent = isMuted ? '🔇' : '🎵';
        btn.classList.toggle('active', !isMuted);
    }

    function updateSfxUI(isMuted) {
        var btn = document.getElementById('set-sfx-btn');
        if (!btn) return;
        var icon = btn.querySelector('.toggle-icon');
        if (icon) icon.textContent = isMuted ? '🔇' : '🔊';
        btn.classList.toggle('active', !isMuted);
    }

    // --- Level UI ---
    function updateLevelUI() {
        var el = document.getElementById('lvlVal');
        if (!el) return;
        el.textContent = d.getLevel();
        el.classList.remove('level-up');
        void el.offsetWidth;
        el.classList.add('level-up');
    }

    // --- Lives UI ---
    function updateLivesUI(wasHit) {
        var el = document.getElementById('livesText');
        if (!el) return;
        el.textContent = d.getLives();
        if (wasHit) {
            el.classList.remove('hit');
            void el.offsetWidth;
            el.classList.add('hit');
        }
        // Flash red on last life
        if (d.getLives() <= 1) el.classList.add('last-life');
        else el.classList.remove('last-life');
    }

    // --- Graze UI ---
    function updateGrazeUI(grazeMeter, grazeMultiplier) {
        var meterFill = document.getElementById('dip-meter-fill');
        var meterText = document.getElementById('dip-meter-text');
        var multEl = document.getElementById('graze-mult');
        if (meterFill) meterFill.style.width = Math.min(100, grazeMeter) + '%';
        if (meterText) meterText.textContent = Math.floor(grazeMeter);
        if (multEl) {
            multEl.textContent = 'x' + grazeMultiplier.toFixed(1);
            if (grazeMultiplier > 1) multEl.classList.add('active');
            else multEl.classList.remove('active');
        }
    }

    // --- Quality UI ---
    var _qualityTiers = ['performance', 'balanced', 'quality'];

    function updateQualityUI() {
        var el = document.getElementById('quality-tier-label');
        if (!el) return;
        var tier = G.QualityManager ? G.QualityManager.getTier() : 'balanced';
        var tierNames = { performance: d.t('Q_PERFORMANCE'), balanced: d.t('Q_BALANCED'), quality: d.t('Q_QUALITY') };
        el.textContent = tierNames[tier] || tier;
    }

    // --- Tilt UI ---
    function updateTiltUI() {
        var el = document.getElementById('tilt-indicator');
        if (!el) return;
        var isTilt = G.Input && G.Input.getControlMode && G.Input.getControlMode() === 'TILT';
        el.style.display = isTilt ? 'inline' : 'none';
    }

    // --- Control Toast ---
    function showControlToast(mode) {
        var el = document.getElementById('control-toast');
        if (!el) return;
        var names = { SWIPE: 'Swipe', JOY: 'Joystick', TILT: 'Tilt' };
        el.textContent = (names[mode] || mode) + ' mode';
        el.classList.remove('show');
        void el.offsetWidth;
        el.classList.add('show');
        clearTimeout(window._controlToastTimer);
        window._controlToastTimer = setTimeout(function () {
            el.classList.remove('show');
        }, 2000);
    }

    // --- Manual Text ---
    function updateManualText() {
        var container = document.getElementById('manual-content');
        if (!container) return;
        // Build manual content from manual-sections data
        var sections = window.Game && window.Game._manualSections;
        if (!sections) return;
        var lang = d.getCurrentLang();
        container.innerHTML = sections.map(function (s) {
            var title = s.title[lang] || s.title.EN || '';
            var body = s.body[lang] || s.body.EN || '';
            return '<h3>' + title + '</h3><p>' + body + '</p>';
        }).join('');
    }

    // --- Settings Modals ---
    function toggleModal(modalId) {
        var modal = document.getElementById(modalId);
        if (!modal) return;
        var isVisible = modal.classList.contains('visible');
        if (isVisible) {
            modal.classList.remove('visible');
        } else {
            // Hide all modals first
            document.querySelectorAll('.modal-overlay.visible').forEach(function (m) { m.classList.remove('visible'); });
            modal.classList.add('visible');
        }
    }

    function toggleSettings() {
        var modal = document.getElementById('settings-modal');
        if (!modal) return;
        var isVisible = modal.classList.contains('visible');
        if (isVisible) {
            modal.classList.remove('visible');
        } else {
            updateUIText();
            modal.classList.add('visible');
        }
    }

    function toggleCreditsPanel() { toggleModal('credits-panel'); }
    function togglePrivacyPanel() { toggleModal('privacy-panel'); }
    function toggleManual() { toggleModal('manual-panel'); if (d.getUI().manualPanel) updateManualText(); }

    function selectManualTab(tab) {
        var tabs = document.querySelectorAll('.manual-tab');
        tabs.forEach(function (t) { t.classList.remove('active'); });
        var activeTab = document.querySelector('.manual-tab[data-tab="' + tab + '"]');
        if (activeTab) activeTab.classList.add('active');
        var contents = document.querySelectorAll('.manual-content');
        contents.forEach(function (c) { c.style.display = 'none'; });
        var activeContent = document.getElementById('manual-content');
        if (activeContent) activeContent.style.display = 'block';
    }

    // --- Language Toggle ---
    function toggleLang() {
        var newLang = d.getCurrentLang() === 'IT' ? 'EN' : 'IT';
        d.setCurrentLang(newLang);
        G._currentLang = newLang;
        localStorage.setItem('fiat_lang', newLang);
        updateUIText();
    }

    // --- Bear Mode ---
    function toggleBearMode() {
        if (d.getIsBearMarket()) {
            d.setIsBearMarket(false);
        } else {
            if (confirm(d.t('BEAR_MODE_WARN') || 'Enable Bear Market? Enemies are stronger but rewards are higher. Are you sure?')) {
                d.setIsBearMarket(true);
            } else {
                return;
            }
        }
        // Restart to apply changes
        d.restartGame();
    }

    // --- PWA Install Banner ---
    function dismissPWABanner() {
        var banner = document.getElementById('pwa-install-banner');
        if (banner) banner.style.display = 'none';
        try { localStorage.setItem('fiat_pwa_dismissed', '1'); } catch (e) {}
    }

    var _deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        _deferredPrompt = e;
        var banner = document.getElementById('pwa-install-banner');
        if (banner && !localStorage.getItem('fiat_pwa_dismissed')) {
            var text = document.getElementById('pwa-banner-text');
            var action = document.getElementById('pwa-banner-action');
            var close = document.getElementById('pwa-banner-close');
            if (text) text.textContent = d.t('PWA_INSTALL_ANDROID');
            if (action) {
                action.textContent = d.t('PWA_INSTALL_BTN');
                action.onclick = function () {
                    if (_deferredPrompt) {
                        _deferredPrompt.prompt();
                        _deferredPrompt.userChoice.then(function (result) {
                            if (result.outcome === 'accepted') console.log('PWA installed');
                            _deferredPrompt = null;
                        });
                    }
                    dismissPWABanner();
                };
            }
            if (close) close.onclick = dismissPWABanner;
            banner.style.display = 'flex';
        }
    });

    function checkPWAInstallPrompt() {
        var banner = document.getElementById('pwa-install-banner');
        if (banner && !localStorage.getItem('fiat_pwa_dismissed') && _deferredPrompt) {
            var text = document.getElementById('pwa-banner-text');
            var action = document.getElementById('pwa-banner-action');
            var close = document.getElementById('pwa-banner-close');
            if (text) text.textContent = d.t('PWA_INSTALL_ANDROID');
            if (action) {
                action.textContent = d.t('PWA_INSTALL_BTN');
                action.onclick = function () {
                    if (_deferredPrompt) { _deferredPrompt.prompt(); _deferredPrompt = null; }
                    dismissPWABanner();
                };
            }
            if (close) close.onclick = dismissPWABanner;
            banner.style.display = 'flex';
        }
    }

    // --- Pause ---
    function togglePause() {
        if (d.getGameState() === 'PAUSE') {
            d.setGameState(d.getPausedFromState() || 'PLAY');
            var pauseScreen = document.getElementById('pause-screen');
            if (pauseScreen) pauseScreen.style.display = 'none';
            if (d.getUI().uiLayer) d.getUI().uiLayer.style.display = 'flex';
            if (G.Audio) G.Audio.resumeMusic();
        } else if (d.getGameState() === 'PLAY') {
            d.setPausedFromState('PLAY');
            d.setGameState('PAUSE');
            var ps = document.getElementById('pause-screen');
            if (ps) ps.style.display = 'flex';
            if (d.getUI().uiLayer) d.getUI().uiLayer.style.display = 'none';
            updateUIText();
            if (G.Audio) G.Audio.pauseMusic();
        }
    }

    // --- Reactive HUD ---
    var _reactiveStreakClass = '';
    var _reactiveStreakTimer = 0;

    function updateReactiveHUD() {
        var reactive = G.Balance && G.Balance.REACTIVE_HUD;
        if (!reactive || !reactive.ENABLED) return;
        var scoreEl = document.querySelector('.hud-score-compact');
        if (!scoreEl) return;
        // Score streak timer decay
        if (_reactiveStreakTimer > 0) {
            _reactiveStreakTimer -= (1 / 60);
            if (_reactiveStreakTimer <= 0 && _reactiveStreakClass) {
                scoreEl.classList.remove(_reactiveStreakClass);
                _reactiveStreakClass = '';
            }
        }
        // Low-life warning
        if (d.getLives && d.getLives() <= 1) {
            if (!scoreEl.classList.contains('hud-low-life')) scoreEl.classList.add('hud-low-life');
        } else {
            scoreEl.classList.remove('hud-low-life');
        }
    }

    function triggerScoreStreakColor(streakLevel) {
        var reactive = G.Balance && G.Balance.REACTIVE_HUD;
        if (!reactive || !reactive.ENABLED) return;
        var scoreEl = document.querySelector('.hud-score-compact');
        if (!scoreEl) return;
        if (_reactiveStreakClass) scoreEl.classList.remove(_reactiveStreakClass);
        var className = 'score-streak-' + streakLevel;
        scoreEl.classList.add(className);
        _reactiveStreakClass = className;
        _reactiveStreakTimer = reactive.SCORE_STREAK_DURATION || 0.5;
    }

    // --- Quality Cycle ---
    function cycleQuality() {
        if (!G.QualityManager) return;
        var tiers = _qualityTiers;
        var current = G.QualityManager.getTier();
        var idx = tiers.indexOf(current);
        var next = tiers[(idx + 1) % tiers.length];
        G.QualityManager.setTier(next);
        updateQualityUI();
    }

    // --- Tilt Controls ---
    function calibrateTilt() {
        if (G.Input && G.Input.tilt && G.Input.tilt.calibrate) {
            G.Input.tilt.calibrate();
        }
    }

    function toggleTilt() {
        if (!G.Input) return;
        var isTilt = G.Input.getControlMode && G.Input.getControlMode() === 'TILT';
        if (isTilt) {
            G.Input.setControlMode('SWIPE');
            localStorage.setItem('fiat_tilt_on', '0');
        } else {
            G.Input.requestTiltPermission().then(function (granted) {
                if (granted) {
                    G.Input.setControlMode('TILT');
                    localStorage.setItem('fiat_tilt_on', '1');
                }
                updateTiltUI();
            });
        }
    }

    // --- Init ---
    function init(deps) {
        d = deps;

        // Expose window functions for onclick handlers
        window.toggleSettings = toggleSettings;
        window.toggleCreditsPanel = toggleCreditsPanel;
        window.togglePrivacyPanel = togglePrivacyPanel;
        window.toggleManual = toggleManual;
        window.selectManualTab = selectManualTab;
        window.toggleLang = toggleLang;
        window.toggleBearMode = toggleBearMode;
        window.togglePause = togglePause;
        window.cycleQuality = cycleQuality;
        window.calibrateTilt = calibrateTilt;
        window.toggleTilt = toggleTilt;
        window.dismissPWABanner = dismissPWABanner;
        window.checkPWAInstallPrompt = checkPWAInstallPrompt;

        // Expose on window for backward compat
        window.setStyle = setStyle;
        window.setUI = setUI;
    }

    // --- Public API ---
    G.UIManager = {
        init: init,
        isPWAStandalone: isPWAStandalone,
        resize: resize,
        updateUIText: updateUIText,
        updateMusicUI: updateMusicUI,
        updateSfxUI: updateSfxUI,
        updateLevelUI: updateLevelUI,
        updateLivesUI: updateLivesUI,
        updateGrazeUI: updateGrazeUI,
        updateQualityUI: updateQualityUI,
        updateTiltUI: updateTiltUI,
        showControlToast: showControlToast,
        updateManualText: updateManualText,
        toggleSettings: toggleSettings,
        togglePause: togglePause,
        updateReactiveHUD: updateReactiveHUD,
        triggerScoreStreakColor: triggerScoreStreakColor,
        cycleQuality: cycleQuality,
        dismissPWABanner: dismissPWABanner,
        checkPWAInstallPrompt: checkPWAInstallPrompt,
        toggleBearMode: toggleBearMode,
        calibrateTilt: calibrateTilt,
        toggleTilt: toggleTilt,

        // DOM helpers
        cachedEl: cachedEl,
        setStyle: setStyle,
        setUI: setUI,

        // Exposed for backward compat
        _reactiveStreakClass: function () { return _reactiveStreakClass; },
        _reactiveStreakTimer: function () { return _reactiveStreakTimer; },
    };

})();
