window.Game = window.Game || {};

class RunState {
    constructor() {
        this.reset();
    }

    reset() {
        this.coins = 0;
        this.perks = [];
        this.perkStacks = {};
        this.flags = {};
        this.pityCounter = 0;
        this.modifiers = {
            scoreMult: 1,
            fireRateMult: 1,
            tempFireRateMult: 1,
            speedMult: 1,
            shieldCooldownMult: 1,
            damageMult: 1,
            maxHpBonus: 0
        };
    }

    getMod(key, fallback = 1) {
        if (!this.modifiers) return fallback;
        const val = this.modifiers[key];
        return (val === undefined || val === null) ? fallback : val;
    }
}

window.Game.RunState = new RunState();
