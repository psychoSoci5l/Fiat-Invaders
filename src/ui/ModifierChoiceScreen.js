/**
 * ModifierChoiceScreen.js — DOM-based modal for Arcade modifier selection
 * Shows 2 or 3 cards, player picks one, game resumes
 */
(function () {
    'use strict';
    const G = window.Game = window.Game || {};

    let _onComplete = null;
    let _isVisible = false;
    let _cards = [];

    // Hex (#rrggbb or #rgb) → "r, g, b" string for CSS var consumption
    function hexToRgbStr(hex) {
        if (!hex || hex[0] !== '#') return '255, 255, 255';
        let h = hex.slice(1);
        if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
        const n = parseInt(h, 16);
        return ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);
    }

    function show(cardCount, onComplete) {
        const rs = G.RunState;
        const mods = G.ArcadeModifiers.getRandomModifiers(cardCount, rs.arcadeModifiers);
        if (mods.length === 0) {
            if (onComplete) onComplete();
            return;
        }

        _onComplete = onComplete;
        _isVisible = true;
        _cards = [];

        const overlay = document.getElementById('modifier-overlay');
        const container = document.getElementById('modifier-cards');
        const header = overlay && overlay.querySelector('.modifier-header');
        if (!overlay || !container) {
            if (onComplete) onComplete();
            return;
        }

        const lang = G._currentLang || 'EN';
        const t = G.TEXTS && G.TEXTS[lang];
        if (header) header.textContent = (t && t.ARCADE_CHOOSE) || 'CHOOSE YOUR PROTOCOL';

        container.innerHTML = '';
        container.className = 'modifier-cards' + (cardCount <= 2 ? ' modifier-cards-2' : '');

        mods.forEach((mod, i) => {
            const card = document.createElement('div');
            card.className = 'modifier-card';
            card.style.animationDelay = (i * 0.1) + 's';

            const catColor = G.ArcadeModifiers.getCategoryColor(mod.category);
            card.style.setProperty('--cat-color', catColor);
            card.style.setProperty('--cat-color-rgb', hexToRgbStr(catColor));

            const stacks = rs.arcadeModifiers.filter(id => id === mod.id).length;
            const stackLabel = stacks > 0 ? ` <span class="mod-stack">x${stacks + 1}</span>` : '';

            card.innerHTML =
                '<div class="mod-icon">' + mod.icon + '</div>' +
                '<div class="mod-name">' + mod.name + stackLabel + '</div>' +
                '<div class="mod-desc">' + (mod.desc[lang] || mod.desc.EN) + '</div>' +
                '<div class="mod-category" style="color:' + catColor + '">' + mod.category + '</div>';

            // Accessibility: keyboard + screen reader
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            const descText = (mod.desc[lang] || mod.desc.EN || '').replace(/<[^>]+>/g, '');
            card.setAttribute('aria-label',
                (i + 1) + '. ' + mod.name + ' — ' + mod.category + '. ' + descText
            );

            card.addEventListener('click', function () {
                selectCard(card, container, mod.id);
            });

            container.appendChild(card);
            _cards.push({ el: card, modId: mod.id });
        });

        overlay.style.display = 'flex';

        // Focus first card for keyboard nav
        if (_cards[0]) {
            try { _cards[0].el.focus({ preventScroll: true }); } catch(e) {}
        }

        document.addEventListener('keydown', _onKeyDown);

        // Play SFX
        if (G.Audio) G.Audio.play('coinUI');
    }

    function _onKeyDown(e) {
        if (!_isVisible) return;
        // v7.20.3: PAUSE guard — don't process card selection while game is paused
        const gs = window.Game && window.Game.gameState;
        if (gs === 'PAUSE' || gs === 'INTERMISSION') return;
        // Digits 1-3 select card by index
        if (e.key >= '1' && e.key <= '9') {
            const idx = parseInt(e.key, 10) - 1;
            if (_cards[idx]) {
                e.preventDefault();
                const container = document.getElementById('modifier-cards');
                selectCard(_cards[idx].el, container, _cards[idx].modId);
            }
            return;
        }
        // Enter / Space on focused card
        if (e.key === 'Enter' || e.key === ' ') {
            const focused = document.activeElement;
            const hit = _cards.find(c => c.el === focused);
            if (hit) {
                e.preventDefault();
                const container = document.getElementById('modifier-cards');
                selectCard(hit.el, container, hit.modId);
            }
            return;
        }
        // Arrow keys move focus between cards
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            const focused = document.activeElement;
            let idx = _cards.findIndex(c => c.el === focused);
            if (idx < 0) idx = 0;
            else idx = (e.key === 'ArrowRight')
                ? (idx + 1) % _cards.length
                : (idx - 1 + _cards.length) % _cards.length;
            try { _cards[idx].el.focus({ preventScroll: true }); } catch(err) {}
        }
    }

    function selectCard(selectedEl, container, modId) {
        if (!_isVisible) return;
        _isVisible = false;

        // Animate selection
        selectedEl.classList.add('modifier-card-selected');
        Array.from(container.children).forEach(card => {
            if (card !== selectedEl) card.classList.add('modifier-card-rejected');
        });

        // Apply modifier
        G.ArcadeModifiers.applyModifier(modId);

        // Play SFX
        if (G.Audio) G.Audio.play('coinScore');

        // Close after animation
        setTimeout(() => {
            hide();
            if (_onComplete) _onComplete();
        }, 600);
    }

    function hide() {
        _isVisible = false;
        _cards = [];
        document.removeEventListener('keydown', _onKeyDown);
        const overlay = document.getElementById('modifier-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    function isVisible() {
        return _isVisible;
    }

    G.ModifierChoiceScreen = {
        show,
        hide,
        isVisible
    };
})();
