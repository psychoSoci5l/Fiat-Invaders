/**
 * ModifierChoiceScreen.js — DOM-based modal for Arcade modifier selection
 * Shows 2 or 3 cards, player picks one, game resumes
 */
(function () {
    'use strict';
    const G = window.Game = window.Game || {};

    let _onComplete = null;
    let _isVisible = false;

    function show(cardCount, onComplete) {
        const rs = G.RunState;
        const mods = G.ArcadeModifiers.getRandomModifiers(cardCount, rs.arcadeModifiers);
        if (mods.length === 0) {
            if (onComplete) onComplete();
            return;
        }

        _onComplete = onComplete;
        _isVisible = true;

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

            const stacks = rs.arcadeModifiers.filter(id => id === mod.id).length;
            const stackLabel = stacks > 0 ? ` <span class="mod-stack">x${stacks + 1}</span>` : '';

            card.innerHTML =
                '<div class="mod-icon">' + mod.icon + '</div>' +
                '<div class="mod-name">' + mod.name + stackLabel + '</div>' +
                '<div class="mod-desc">' + (mod.desc[lang] || mod.desc.EN) + '</div>' +
                '<div class="mod-category" style="color:' + catColor + '">' + mod.category + '</div>';

            card.addEventListener('click', function () {
                selectCard(card, container, mod.id);
            });

            container.appendChild(card);
        });

        overlay.style.display = 'flex';
        overlay.classList.add('mod-overlay-enter');

        // Play SFX
        if (G.Audio) G.Audio.play('coinUI');
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
        const overlay = document.getElementById('modifier-overlay');
        if (overlay) {
            overlay.classList.remove('mod-overlay-enter');
            overlay.style.display = 'none';
        }
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
