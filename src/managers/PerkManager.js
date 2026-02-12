/**
 * PerkManager.js — Perk choice, rolling, application logic
 * Extracted from main.js (v4.49 refactor)
 */
(function () {
    'use strict';
    const G = window.Game;
    const Balance = G.Balance;

    let perkChoiceActive = false;
    let perkOffers = [];
    let recentPerks = [];

    // Callbacks set via init()
    let _deps = {};

    function init(deps) {
        _deps = deps || {};
    }

    function isActive() {
        return perkChoiceActive;
    }

    function canOfferPerk(perk) {
        const runState = _deps.getRunState ? _deps.getRunState() : null;
        if (!runState || !runState.perkStacks) return true;
        const stacks = runState.perkStacks[perk.id] || 0;
        const maxStacks = perk.maxStacks || 1;
        if (perk.stackable) return stacks < maxStacks;
        return stacks === 0;
    }

    function rollWeighted(pool) {
        if (!pool || pool.length === 0) return null;
        let totalWeight = 0;
        pool.forEach(p => { totalWeight += (p.weight || 1); });
        let r = Math.random() * totalWeight;
        for (let i = 0; i < pool.length; i++) {
            r -= (pool[i].weight || 1);
            if (r <= 0) return pool[i];
        }
        return pool[pool.length - 1];
    }

    function pickOffers(count) {
        const basePool = (G.UPGRADES || []).filter(canOfferPerk);
        if (basePool.length === 0) return [];
        const picks = [];

        const runState = _deps.getRunState ? _deps.getRunState() : null;
        const rarePool = basePool.filter(p => p.rarity === 'rare' || p.rarity === 'epic');
        const includeRare = runState && runState.pityCounter >= 2 && rarePool.length > 0;
        if (includeRare) {
            const picked = rollWeighted(rarePool);
            if (picked) picks.push(picked);
        }

        const pool = basePool.filter(p => !picks.includes(p));
        for (let i = picks.length; i < count && pool.length > 0; i++) {
            const picked = rollWeighted(pool);
            if (!picked) break;
            picks.push(picked);
            const idx = pool.indexOf(picked);
            if (idx !== -1) pool.splice(idx, 1);
        }
        return picks;
    }

    function renderBar(highlightId) {
        const perkBar = document.getElementById('perk-bar');
        if (perkBar) perkBar.style.display = 'none';
    }

    function open() {
        const perkModal = document.getElementById('perk-modal');
        const perkOptions = document.getElementById('perk-options');
        if (!perkModal || !perkOptions) return;
        if (!G.UPGRADES || G.UPGRADES.length === 0) return;
        perkChoiceActive = true;
        if (_deps.setStyle) _deps.setStyle('perk-modal', 'display', 'flex');

        perkOffers = pickOffers(3);
        if (perkOffers.length === 0) {
            close();
            return;
        }
        perkOptions.innerHTML = '';
        perkOffers.forEach(perk => {
            const btn = document.createElement('button');
            const rarityClass = perk.rarity ? `rarity-${perk.rarity}` : '';
            btn.className = `perk-card ${rarityClass}`.trim();
            btn.innerHTML = `<div class="perk-name">${perk.icon || ''} ${perk.name}</div>
            <div class="perk-desc">${perk.desc}</div>
            <div class="perk-rarity">${perk.rarity || 'common'}</div>`;
            btn.addEventListener('click', () => apply(perk));
            perkOptions.appendChild(btn);
        });
    }

    function close() {
        perkChoiceActive = false;
        if (_deps.setStyle) _deps.setStyle('perk-modal', 'display', 'none');
        const runState = _deps.getRunState ? _deps.getRunState() : null;
        if (runState && runState.pityCounter === undefined) runState.pityCounter = 0;
    }

    function apply(perk) {
        if (!perk) return;
        const runState = _deps.getRunState ? _deps.getRunState() : null;
        const player = _deps.getPlayer ? _deps.getPlayer() : null;
        if (perk.apply && runState) perk.apply(runState);
        if (runState) {
            runState.perks.push(perk.id);
            runState.perkStacks[perk.id] = (runState.perkStacks[perk.id] || 0) + 1;
        }

        // Track for display (last 3)
        const stacks = runState ? (runState.perkStacks[perk.id] || 1) : 1;
        const existing = recentPerks.find(p => p.id === perk.id);
        if (existing) {
            existing.stacks = stacks;
            recentPerks = recentPerks.filter(p => p.id !== perk.id);
            recentPerks.push(existing);
        } else {
            recentPerks.push({ id: perk.id, stacks: stacks });
        }

        if (G.Audio) G.Audio.play('perk');
        if (player && G.PerkIconManager) G.PerkIconManager.addIcon(perk, player.x, player.y);
        if (_deps.updateLivesUI) _deps.updateLivesUI();
        renderBar(perk.id);
        if (_deps.emitEvent) _deps.emitEvent('perk_selected', { id: perk.id });
        if (runState) {
            if (perk.rarity === 'rare' || perk.rarity === 'epic') runState.pityCounter = 0;
            else runState.pityCounter += 1;
        }
        close();
    }

    function applyRandom(perkCooldownRef) {
        if (!G.UPGRADES || G.UPGRADES.length === 0) return 0;
        if (perkCooldownRef > 0) return 0;
        const offers = pickOffers(1);
        if (!offers || offers.length === 0) return 0;

        apply(offers[0]);
        if (G.Audio) G.Audio.play('perk');
        return Balance.PERK.COOLDOWN_TIME;
    }

    function reset() {
        perkChoiceActive = false;
        perkOffers = [];
        recentPerks = [];
    }

    function getRecentPerks() {
        return recentPerks;
    }

    G.PerkManager = {
        init,
        isActive,
        canOfferPerk,
        rollWeighted,
        pickOffers,
        renderBar,
        open,
        close,
        apply,
        applyRandom,
        reset,
        getRecentPerks
    };
})();
