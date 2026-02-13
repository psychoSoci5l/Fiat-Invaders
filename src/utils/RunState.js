window.Game = window.Game || {};

class RunState {
    constructor() {
        this.reset();
    }

    reset() {
        // --- Original modifiers/perks ---
        this.coins = 0;
        this.perks = [];
        this.perkStacks = {};   // kept for compat, unused by elemental system
        this.flags = {};
        this.pityCounter = 0;
        this.modifiers = {
            scoreMult: 1,
            speedMult: 1,
            damageMult: 1,
            pierceBonusHP: 0,
            maxHpBonus: 0
        };

        // --- Elemental Perk System (v4.60) ---
        this.perkLevel = 0;         // 0-3+, counts elements collected
        this.hasFirePerk = false;
        this.hasLaserPerk = false;
        this.hasElectricPerk = false;

        // --- Score & progression (v4.28.0: moved from main.js) ---
        this.score = 0;
        this.level = 1;
        this.marketCycle = 1;
        this.totalTime = 0;
        this.killCount = 0;

        // --- Streak ---
        this.streak = 0;
        this.bestStreak = 0;
        this.killStreak = 0;
        this.killStreakMult = 1.0;
        this.lastKillTime = 0;
        this.lastScoreMilestone = 0;

        // --- Graze ---
        this.grazeCount = 0;
        this.grazeMeter = 0;
        this.grazeMultiplier = 1.0;
        this.grazePerksThisLevel = 0;
        this.lastGrazeSoundTime = 0;
        this.lastGrazeTime = 0;

        // --- Bullet cancel & perks ---
        this.bulletCancelStreak = 0;
        this.bulletCancelTimer = 0;
        this.perkCooldown = 0;

        // --- Sacrifice ---
        this.sacrificeState = 'NONE';
        this.sacrificeDecisionTimer = 0;
        this.sacrificeActiveTimer = 0;
        this.sacrificeScoreAtStart = 0;
        this.sacrificesUsedThisRun = 0;
        this.sacrificeScoreEarned = 0;
        this.sacrificeGhostTrail = [];

        // --- Mini-boss ---
        this.fiatKillCounter = { '¥': 0, '₽': 0, '₹': 0, '€': 0, '£': 0, '₣': 0, '₺': 0, '$': 0, '元': 0, 'Ⓒ': 0 };
        this.lastMiniBossSpawnTime = 0;
        this.miniBossThisWave = 0;

        // --- Wave timing ---
        this.waveStartTime = 0;

        // --- Adaptive Power Calibration (v4.59) ---
        this.cyclePower = {
            score: 0,      // Power score snapshot (0.0–1.0)
            hpMult: 1.0,   // Enemy HP multiplier for this cycle
            pityAdj: 0     // Pity timer kill adjustment
        };

        // --- Per-frame counters ---
        this._frameKills = 0;
        this._hyperAmbientTimer = 0;
    }

    getMod(key, fallback = 1) {
        if (!this.modifiers) return fallback;
        const val = this.modifiers[key];
        return (val === undefined || val === null) ? fallback : val;
    }
}

window.Game.RunState = new RunState();
