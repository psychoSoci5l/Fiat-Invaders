// GameCompletion.js — Game over, campaign victory, completion screens
// Extracted from main.js v7.0

window.Game = window.Game || {};

(function () {
    const G = window.Game;
    let d = null; // deps

    // Game Center Mock (replace with Capacitor plugin for iOS)
    function submitToGameCenter(scoreValue) {
        d.emitEvent('gamecenter_submit', { score: scoreValue });
    }

    // Game Completion — cinematic video + credits overlay (first completion only)
    function showGameCompletion(onComplete) {
        const vid = document.getElementById('completion-video');
        if (!vid) { if (onComplete) onComplete(); return; }

        const lang = (G._currentLang || 'EN').toLowerCase();
        vid.src = 'completion-' + lang + '.mp4';
        vid.style.display = 'block';
        vid.currentTime = 0;

        const finish = () => {
            vid.style.display = 'none';
            vid.onended = null;
            showCompletionOverlay(onComplete);
        };

        vid.play().then(() => {
            vid.onended = finish;
        }).catch(() => finish());

        const skipHandler = () => {
            vid.removeEventListener('click', skipHandler);
            vid.removeEventListener('touchstart', skipHandler);
            vid.onended = null;
            vid.pause();
            finish();
        };
        vid.addEventListener('click', skipHandler);
        vid.addEventListener('touchstart', skipHandler);

        setTimeout(() => { if (vid.style.display === 'block') finish(); }, 20000);
    }

    // Completion Overlay — credits, links, continue button
    function showCompletionOverlay(onComplete) {
        let overlay = document.getElementById('game-completion-screen');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'game-completion-screen';
            overlay.className = 'gc-screen';
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div class="gc-container">
                <div class="gc-section gc-s1">
                    <h1 class="gc-title">${d.t('GC_TITLE')}</h1>
                </div>
                <div class="gc-section gc-s2">
                    <p class="gc-text">${d.t('GC_THANKS_1')}</p>
                    <p class="gc-text">${d.t('GC_THANKS_2')}</p>
                    <p class="gc-text gc-accent">${d.t('GC_THANKS_3')}</p>
                </div>
                <div class="gc-section gc-s3">
                    <p class="gc-label">${d.t('GC_CREDIT')}</p>
                    <p class="gc-author">psychoSocial</p>
                    <a href="https://www.psychosoci5l.com/" target="_blank"
                       rel="noopener noreferrer" class="gc-link">psychosoci5l.com</a>
                </div>
                <div class="gc-section gc-s4">
                    <p class="gc-label gc-label-cyan">${d.t('GC_OPENSOURCE_TITLE')}</p>
                    <p class="gc-text-sm">${d.t('GC_OPENSOURCE_1')}</p>
                    <p class="gc-text-sm">${d.t('GC_OPENSOURCE_2')}</p>
                    <a href="https://github.com/psychoSoci5l/Fiat-Invaders" target="_blank"
                       rel="noopener noreferrer" class="gc-link gc-link-gh">GitHub</a>
                </div>
                <div class="gc-section gc-s5">
                    <p class="gc-privacy">${d.t('GC_PRIVACY')}</p>
                </div>
                <div class="gc-section gc-s6">
                    <p class="gc-text-sm">${d.t('GC_BTC_HISTORY')}</p>
                    <a href="https://psychosoci5l.com/resources/bitcoin/storia-bitcoin.html"
                       target="_blank" rel="noopener noreferrer"
                       class="gc-link gc-link-btc">${d.t('GC_BTC_LINK')}</a>
                </div>
                <div class="gc-section gc-s7">
                    <button class="btn btn-primary btn-lg" id="gc-continue-btn">
                        ${d.t('GC_CONTINUE')}</button>
                </div>
            </div>
        `;

        overlay.style.display = 'flex';

        // v5.23: iOS PWA standalone fix
        overlay.querySelectorAll('a[target="_blank"]').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                window.open(a.href, '_blank', 'noopener,noreferrer');
            });
        });

        document.getElementById('gc-continue-btn').addEventListener('click', () => {
            try { localStorage.setItem('fiat_completion_seen', '1'); } catch(e) {}
            overlay.classList.add('gc-fadeout');
            setTimeout(() => {
                overlay.style.display = 'none';
                overlay.classList.remove('gc-fadeout');
                if (onComplete) onComplete();
            }, 500);
        }, { once: true });
    }

    // Campaign Victory - All 3 central banks defeated!
    function showCampaignVictory() {
        const campaignState = G.CampaignState;
        const audioSys = G.Audio;

        if (G.Debug) G.Debug.endAnalyticsRun(Math.floor(d.getScore()));

        d.setShake(30);
        if (G.TransitionManager) G.TransitionManager.startFadeOut(1.0, '#ffd700');

        d.setGameState('CAMPAIGN_VICTORY');

        let victoryOverlay = document.getElementById('campaign-victory-screen');
        if (!victoryOverlay) {
            victoryOverlay = document.createElement('div');
            victoryOverlay.id = 'campaign-victory-screen';
            victoryOverlay.className = 'campaign-victory-screen';
            document.body.appendChild(victoryOverlay);
        }

        const showBearSuggestion = !d.getIsBearMarket();
        victoryOverlay.innerHTML = `
            <div class="victory-content">
                <h1 class="victory-title">${d.t('CV_TITLE')}</h1>
                <div class="victory-subtitle">${d.t('CV_SUBTITLE')}</div>
                <div class="boss-trophies">
                    <div class="trophy">\ud83d\udcb5 FED</div>
                    <div class="trophy">\ud83d\udcb6 BCE</div>
                    <div class="trophy">\ud83d\udcb4 BOJ</div>
                </div>
                <div class="final-score">${d.t('CV_SCORE')}: <span id="campaign-final-score">0</span></div>
                ${showBearSuggestion ? `
                <div class="cv-bear-suggestion">
                    <p class="cv-bear-text">${d.t('CV_BEAR_HINT')}</p>
                </div>` : ''}
                <div class="victory-actions">
                    ${showBearSuggestion ? `<button class="btn btn-danger btn-lg btn-block" onclick="activateBearFromVictory()">${d.t('CV_BEAR_BTN')}</button>` : ''}
                    <button class="btn btn-primary btn-lg btn-block" onclick="replayStoryFromVictory()">${d.t('CV_REPLAY')}</button>
                    <button class="btn btn-secondary btn-block" onclick="backToIntroFromVictory()">${d.t('CV_MENU')}</button>
                </div>
            </div>
        `;

        const scoreEl = document.getElementById('campaign-final-score');
        if (scoreEl) scoreEl.textContent = Math.floor(d.getScore());

        victoryOverlay.style.display = 'flex';

        audioSys.play('levelUp');
        setTimeout(() => audioSys.play('levelUp'), 300);
        setTimeout(() => audioSys.play('levelUp'), 600);

        if (d.getScore() > d.getHighScore()) {
            d.setHighScore(Math.floor(d.getScore()));
            d.safeSetItem(d.highScoreKey(), d.getHighScore());
            const badgeScore = document.getElementById('badge-score-value');
            if (badgeScore) badgeScore.innerText = d.getHighScore().toLocaleString();
            submitToGameCenter(d.getHighScore());
        }

        d.emitEvent('campaign_complete', { score: d.getScore(), ngPlusLevel: campaignState?.ngPlusLevel || 0 });
    }

    // Activate Bear Market from campaign victory and replay
    window.activateBearFromVictory = function() {
        if (!d.getIsBearMarket()) {
            d.setIsBearMarket(true);
            document.body.classList.add('bear-mode');
            const toggle = document.getElementById('bear-toggle');
            if (toggle) {
                toggle.classList.add('active');
                const label = toggle.querySelector('.switch-label');
                if (label) label.textContent = 'ON';
            }
        }

        const campaignState = G.CampaignState;
        if (campaignState) campaignState.resetCampaign();

        const victoryOverlay = document.getElementById('campaign-victory-screen');
        if (victoryOverlay) victoryOverlay.style.display = 'none';

        d.startGame();
        if (G.IntroScreen) G.IntroScreen.updateCampaignProgressUI();
        G.Audio.play('bearMarketToggle');
    };

    // Replay Story mode from campaign victory
    window.replayStoryFromVictory = function() {
        const campaignState = G.CampaignState;
        if (campaignState) campaignState.resetCampaign();

        const victoryOverlay = document.getElementById('campaign-victory-screen');
        if (victoryOverlay) victoryOverlay.style.display = 'none';

        d.startGame();
        if (G.IntroScreen) G.IntroScreen.updateCampaignProgressUI();
        G.Audio.play('coinUI');
    };

    // Return to intro from campaign victory
    window.backToIntroFromVictory = function() {
        const victoryOverlay = document.getElementById('campaign-victory-screen');
        if (victoryOverlay) victoryOverlay.style.display = 'none';
        window.backToIntro();
    };

    // triggerGameOver
    function triggerGameOver() {
        const audioSys = G.Audio;

        if (G.Debug) G.Debug.endAnalyticsRun(Math.floor(d.getScore()));

        const wasNewHighScore = d.getScore() > d.getHighScore();
        if (wasNewHighScore) {
            d.setHighScore(Math.floor(d.getScore()));
            d.safeSetItem(d.highScoreKey(), d.getHighScore());
            const badgeScore = document.getElementById('badge-score-value');
            if (badgeScore) badgeScore.innerText = d.getHighScore().toLocaleString();
            submitToGameCenter(d.getHighScore());
        }
        window._gamePlayDuration = d.getTotalTime();
        d.setGameState('GAMEOVER');
        d.setStyle('gameover-screen', 'display', 'flex');
        d.setUI('finalScore', Math.floor(d.getScore()));
        const ui = d.getUI();
        if (ui.gameoverMeme) ui.gameoverMeme.innerText = d.getRandomMeme();

        const isStory = G.CampaignState && G.CampaignState.isEnabled();
        const statsRow = document.getElementById('arcade-stats-row');
        const bestBadge = document.getElementById('new-best-badge');
        if (!isStory) {
            if (statsRow) {
                statsRow.style.display = 'flex';
                d.setUI('arcadeCycleVal', d.getMarketCycle());
                d.setUI('arcadeLevelVal', d.getLevel());
                d.setUI('arcadeWaveVal', G.WaveManager.wave);
            }
            const comboRow = document.getElementById('arcade-combo-row');
            if (comboRow) {
                comboRow.style.display = 'flex';
                d.setUI('arcadeBestCombo', G.RunState.bestCombo || 0);
                d.setUI('arcadeModCount', G.RunState.arcadeModifierPicks || 0);
            }
            const result = d.checkArcadeRecords();
            if (bestBadge) {
                bestBadge.style.display = result.newBest ? 'inline-block' : 'none';
                bestBadge.innerText = d.t('NEW_BEST');
            }
        } else {
            if (statsRow) statsRow.style.display = 'none';
            if (bestBadge) bestBadge.style.display = 'none';
            const comboRow2 = document.getElementById('arcade-combo-row');
            if (comboRow2) comboRow2.style.display = 'none';
        }

        if (G.Story) G.Story.onGameOver();
        if (ui.kills) ui.kills.innerText = d.getKillCount();
        if (ui.streak) ui.streak.innerText = d.getBestStreak();
        d.setStyle('pause-btn', 'display', 'none');
        if (ui.uiLayer) ui.uiLayer.style.display = 'none';
        audioSys.play('explosion');

        // v5.23: Leaderboard submit
        const isStoryMode = G.CampaignState && G.CampaignState.isEnabled();
        if (isStoryMode) {
            const shipKey = (G.IntroScreen ? G.IntroScreen.getSelectedShipKey() : 'BTC');
            const _doRank = () => G.Leaderboard.renderGameoverRank(
                Math.floor(d.getScore()), d.getKillCount(), d.getMarketCycle(),
                G.WaveManager.wave, shipKey, !!window.isBearMarket
            );
            if (G.hasNickname()) {
                _doRank();
            } else if (wasNewHighScore) {
                G.showNicknamePrompt((entered) => { if (entered) _doRank(); },
                    { title: d.t('NICK_RECORD_TITLE'), hideSkip: false });
            }
        }
    }

    G.GameCompletion = {
        init: function(deps) { d = deps; },
        showGameCompletion: showGameCompletion,
        showCampaignVictory: showCampaignVictory,
        triggerGameOver: triggerGameOver
    };
})();
