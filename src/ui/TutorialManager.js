// TutorialManager v1.0 — Extracted from main.js
// Manages tutorial overlay, step progression, and warmup state.
window.Game = window.Game || {};
(function () {
    'use strict';
    var G = window.Game;
    var d = {}; // deps

    // --- Internal State ---
    var _warmupShown = false;
    var _tutorialStep = 0;

    function init(deps) {
        d = deps || {};
    }

    function isTutorialSeen(mode) {
        if (_warmupShown) return true;
        return !!localStorage.getItem('fiat_tutorial_' + mode + '_seen');
    }

    function showTutorial() {
        var overlay = document.getElementById('tutorial-overlay');
        if (!overlay) { _completeFlow(); return; }

        // Localize texts
        var T = G.TEXTS[G._currentLang || 'EN'] || G.TEXTS.EN;
        overlay.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            if (T[key]) el.textContent = T[key];
        });

        // Reset to step 0
        _tutorialStep = 0;
        for (var i = 0; i < 4; i++) {
            var step = document.getElementById('tut-step-' + i);
            if (step) {
                step.className = 'tut-step' + (i === 0 ? ' tut-step--active' : '');
            }
        }

        _updateDots(0);

        // NEXT button
        var btn = document.getElementById('tut-go-btn');
        if (btn) {
            btn.textContent = T.TUT_NEXT || 'NEXT';
            btn.onclick = _handleButton;
        }

        // SKIP button
        var skipBtn = document.getElementById('tut-skip-btn');
        if (skipBtn) skipBtn.onclick = completeTutorial;

        overlay.style.display = 'flex';

        if (d.setGameState) d.setGameState('WARMUP');
        _warmupShown = true;
    }

    function _updateDots(activeIdx) {
        var dots = document.querySelectorAll('.tut-dot');
        dots.forEach(function (dot, i) {
            dot.classList.toggle('active', i === activeIdx);
        });
    }

    function _advance() {
        var curStep = document.getElementById('tut-step-' + _tutorialStep);
        _tutorialStep++;
        var nextStep = document.getElementById('tut-step-' + _tutorialStep);
        if (!curStep || !nextStep) return;

        curStep.className = 'tut-step tut-step--out';

        setTimeout(function () {
            curStep.className = 'tut-step';
            nextStep.className = 'tut-step tut-step--active';
            _updateDots(_tutorialStep);

            if (_tutorialStep === 3) {
                var T = G.TEXTS[G._currentLang || 'EN'] || G.TEXTS.EN;
                var btn = document.getElementById('tut-go-btn');
                if (btn) btn.textContent = T.GO || 'GO!';
            }
        }, 250);
    }

    function _handleButton() {
        if (_tutorialStep < 3) {
            _advance();
        } else {
            completeTutorial();
        }
    }

    function completeTutorial() {
        var tutMode = (G.CampaignState && G.CampaignState.isEnabled()) ? 'story' : 'arcade';
        localStorage.setItem('fiat_tutorial_' + tutMode + '_seen', '1');

        var overlay = document.getElementById('tutorial-overlay');
        if (overlay) {
            overlay.style.transition = 'opacity 0.2s ease-out';
            overlay.style.opacity = '0';
            setTimeout(function () {
                overlay.style.display = 'none';
                overlay.style.transition = '';
                overlay.style.opacity = '';
            }, 200);
        }

        _completeFlow();
    }

    function _completeFlow() {
        // Legacy warmup overlay cleanup
        var legacyWarmup = document.getElementById('warmup-overlay');
        if (legacyWarmup) legacyWarmup.remove();

        if (d.onTutorialComplete) d.onTutorialComplete();
    }

    function resetTutorial() {
        // Clear all tutorial keys (current + legacy)
        localStorage.removeItem('fiat_tutorial_story_seen');
        localStorage.removeItem('fiat_tutorial_arcade_seen');
        localStorage.removeItem('fiat_warmup_shown');
        if (d.showToast) d.showToast('Tutorial reset on next run');
    }

    // --- Window exports for backward compat ---
    window.completeTutorial = completeTutorial;
    window.resetTutorial = resetTutorial;

    // --- Public API ---
    G.TutorialManager = {
        init: init,
        isTutorialSeen: isTutorialSeen,
        showTutorial: showTutorial,
        completeTutorial: completeTutorial,
        resetTutorial: resetTutorial
    };
})();
