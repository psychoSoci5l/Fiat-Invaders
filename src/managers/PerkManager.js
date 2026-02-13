/**
 * PerkManager.js — Elemental perk sequential assignment (v4.60)
 * Fire → Laser → Electric. No modal, no choice — auto-applied.
 * After perk 3: triggers GODCHAIN. Perk 4+: re-triggers GODCHAIN.
 */
(function () {
    'use strict';
    const G = window.Game;
    const Balance = G.Balance;

    let recentPerks = [];

    // Callbacks set via init()
    let _deps = {};

    function init(deps) {
        _deps = deps || {};
    }

    function isActive() {
        return false; // No modal pause in v4.60
    }

    /**
     * Get the next elemental perk in sequence, or null if all 3 collected.
     */
    function getNextPerk() {
        const runState = _deps.getRunState ? _deps.getRunState() : null;
        if (!runState) return null;
        const upgrades = G.UPGRADES || [];
        const level = runState.perkLevel || 0;
        if (level >= (Balance.PERK.MAX_ELEMENTS || 3)) return null;
        // Find perk with order = level + 1
        return upgrades.find(p => p.order === level + 1) || null;
    }

    function canOfferPerk() {
        return true; // Always possible — beyond perk 3 we re-trigger GODCHAIN
    }

    /**
     * Apply the next elemental perk (or re-trigger GODCHAIN if all 3 collected).
     * Returns cooldown time if applied, 0 otherwise.
     */
    function applyNext(perkCooldownRef) {
        if (!G.UPGRADES || G.UPGRADES.length === 0) return 0;
        if (perkCooldownRef > 0) return 0;

        const runState = _deps.getRunState ? _deps.getRunState() : null;
        const player = _deps.getPlayer ? _deps.getPlayer() : null;
        if (!runState) return 0;

        const nextPerk = getNextPerk();

        if (nextPerk) {
            // Apply elemental perk
            if (nextPerk.apply) nextPerk.apply(runState);
            runState.perks.push(nextPerk.id);
            runState.perkStacks[nextPerk.id] = 1;

            // Track for display
            recentPerks.push({ id: nextPerk.id, stacks: 1 });

            if (G.Audio) G.Audio.play('perk');
            // v5.4.0: PerkIconManager replaced by showPickup toast in main.js
            if (_deps.emitEvent) _deps.emitEvent('perk_selected', { id: nextPerk.id });

            // After perk 3: trigger GODCHAIN
            if (runState.perkLevel >= (Balance.PERK.MAX_ELEMENTS || 3)) {
                if (player && player.activateGodchain) player.activateGodchain();
            }
        } else {
            // All 3 collected — re-trigger GODCHAIN on further bullet cancels
            runState.perkLevel++;
            if (player && player.activateGodchain) player.activateGodchain();
            if (G.Audio) G.Audio.play('perk');
            // v5.4.0: GODCHAIN feedback via showPickup toast in main.js
        }

        return Balance.PERK.COOLDOWN_TIME;
    }

    // Legacy compat — pickOffers/open/close/apply/renderBar are no-ops in v4.60
    function pickOffers() { return []; }
    function renderBar() {}
    function open() {}
    function close() {}
    function apply() {}

    function reset() {
        recentPerks = [];
    }

    function getRecentPerks() {
        return recentPerks;
    }

    // v4.61: Color for next elemental perk (used by PowerUp draw)
    const PERK_COLORS = {
        0: '#ff4400',  // Fire (next perk when perkLevel=0)
        1: '#00f0ff',  // Laser
        2: '#8844ff',  // Electric
    };
    const GODCHAIN_COLOR = '#FFD700';

    function getNextPerkColor() {
        const runState = _deps.getRunState ? _deps.getRunState() : null;
        const level = runState ? (runState.perkLevel || 0) : 0;
        const maxElements = (Balance.PERK && Balance.PERK.MAX_ELEMENTS) || 3;
        if (level >= maxElements) return GODCHAIN_COLOR;
        return PERK_COLORS[level] || '#bb44ff';
    }

    G.PerkManager = {
        init,
        isActive,
        canOfferPerk,
        getNextPerk,
        getNextPerkColor,
        pickOffers,
        renderBar,
        open,
        close,
        apply,
        applyNext,
        applyRandom: applyNext, // Legacy alias
        reset,
        getRecentPerks
    };
})();
