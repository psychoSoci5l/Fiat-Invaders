// LessonModal.js — First-encounter lesson modal (v7.7.0)
// Big centered card, pauses game, shown ONCE per device (gated via HintTracker).
// Replaces v7.6.0 status-strip hints which were too small/passeggeri.

window.Game = window.Game || {};

(function () {
    'use strict';
    const G = window.Game;

    let _isVisible = false;
    let _queue = [];
    let _resumeState = null;

    // 8 lesson definitions: key → i18n prefix + icon
    const LESSONS = {
        lesson_fire:     { i18n: 'LESSON_FIRE',     icon: '\uD83D\uDD25' }, // 🔥
        lesson_laser:    { i18n: 'LESSON_LASER',    icon: '\u2728' },        // ✨
        lesson_electric: { i18n: 'LESSON_ELECTRIC', icon: '\u26A1' },        // ⚡
        lesson_godchain: { i18n: 'LESSON_GODCHAIN', icon: '\uD83D\uDFE3' }, // 🟣
        lesson_dip:      { i18n: 'LESSON_DIP',      icon: '\uD83D\uDC8E' }, // 💎
        lesson_hyper:    { i18n: 'LESSON_HYPER',    icon: '\u26A1' },        // ⚡
        lesson_special:  { i18n: 'LESSON_SPECIAL',  icon: '\uD83C\uDFAF' }, // 🎯
        lesson_utility:  { i18n: 'LESSON_UTILITY',  icon: '\uD83D\uDEE1' }  // 🛡
    };

    function t(key) {
        const lang = G._currentLang || 'EN';
        const dict = G.TEXTS && G.TEXTS[lang];
        return (dict && dict[key]) || key;
    }

    function show(key) {
        const def = LESSONS[key];
        if (!def) return false;

        // Lifetime gate
        if (!G.HintTracker || G.HintTracker.isShown(key)) return false;

        // Suppress in WARMUP — tutorial owns prompts there
        if (G.GameState && G.GameState.is && G.GameState.is('WARMUP')) return false;

        // If a modal is already up, queue this one
        if (_isVisible) {
            if (!_queue.includes(key)) _queue.push(key);
            return true;
        }

        // Mark immediately to prevent re-trigger from rapid events
        G.HintTracker.markShown(key);

        const overlay = document.getElementById('lesson-modal');
        const iconEl  = document.getElementById('lesson-icon');
        const titleEl = document.getElementById('lesson-title');
        const bodyEl  = document.getElementById('lesson-body');
        const okBtn   = document.getElementById('lesson-ok');
        if (!overlay || !iconEl || !titleEl || !bodyEl || !okBtn) return false;

        iconEl.textContent  = def.icon;
        titleEl.textContent = t(def.i18n + '_TITLE');
        bodyEl.textContent  = t(def.i18n + '_BODY');
        okBtn.textContent   = t('LESSON_OK');

        // Pause game (skip if already paused — e.g. after a boss intermission edge-case)
        const curState = (G.GameState && G.GameState.current) || (window.gameState);
        if (curState && curState !== 'PAUSE') {
            _resumeState = curState;
            window._pausedFromState = curState;
            if (typeof window.setGameState === 'function') window.setGameState('PAUSE');
        } else {
            _resumeState = window._pausedFromState || 'PLAY';
        }

        overlay.style.display = 'flex';
        // Force reflow so the entrance animation runs
        // eslint-disable-next-line no-unused-expressions
        overlay.offsetHeight;
        overlay.classList.add('lesson-modal-enter');

        _isVisible = true;

        if (G.Audio) { try { G.Audio.play('coinUI'); } catch {} }
        return true;
    }

    function hide() {
        if (!_isVisible) return;
        _isVisible = false;

        const overlay = document.getElementById('lesson-modal');
        if (overlay) {
            overlay.classList.remove('lesson-modal-enter');
            overlay.style.display = 'none';
        }

        // Resume previous state
        const resumeTo = _resumeState || 'PLAY';
        _resumeState = null;
        window._pausedFromState = null;
        if (typeof window.setGameState === 'function') {
            try { window.setGameState(resumeTo); } catch { window.setGameState('PLAY'); }
        }

        // Process queue (next tick so resume settles first)
        if (_queue.length > 0) {
            const next = _queue.shift();
            setTimeout(() => show(next), 250);
        }
    }

    function isVisible() { return _isVisible; }

    // Backdrop click is intentionally ignored — only the OK button dismisses.
    function _bindOnce() {
        const okBtn = document.getElementById('lesson-ok');
        if (okBtn && !okBtn._lessonBound) {
            okBtn._lessonBound = true;
            okBtn.addEventListener('click', hide);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _bindOnce);
    } else {
        _bindOnce();
    }

    G.LessonModal = { show, hide, isVisible };
})();
