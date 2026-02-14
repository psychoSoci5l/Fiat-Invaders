window.Game = window.Game || {};

class RunState {
    constructor() {
        this.reset();
    }

    reset() {
        // --- Original modifiers/perks ---
        this.coins = 0;
        this.perks = [];
        this.flags = {};
        this.pityCounter = 0;

        // --- Elemental Perk System (v4.60) ---
        this.perkLevel = 0;         // 0-3+, counts elements collected
        this.perkStacks = {};       // perk id → stack count (used by PerkManager)
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

        // --- Arcade: Combo system ---
        this.comboCount = 0;
        this.comboTimer = 0;          // Seconds remaining before combo resets
        this.comboMult = 1.0;
        this.bestCombo = 0;
        this.comboDecayAnim = 0;      // Fade-out animation timer

        // --- Arcade: Roguelike modifiers ---
        this.arcadeModifiers = [];    // Array of modifier IDs
        this.arcadeBonuses = {
            fireRateMult: 1.0,
            damageMult: 1.0,
            piercePlus: 0,
            speedMult: 1.0,
            enemyHpMult: 1.0,
            enemyBulletSpeedMult: 1.0,
            dropRateMult: 1.0,
            scoreMult: 1.0,
            grazeRadiusMult: 1.0,
            pityMult: 1.0,
            extraLives: 0,
            nanoShieldTimer: 0,
            nanoShieldCooldown: 0,
            lastStandAvailable: false,
            noShieldDrops: false,
            volatileRounds: false,
            chainLightning: false,
            critChance: 0,
            critMult: 3.0
        };
        this.arcadeModifierPicks = 0; // Total picks made
    }

}

window.Game.RunState = new RunState();
