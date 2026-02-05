/**
 * CampaignState.js - Campaign progression tracker
 *
 * Tracks boss defeats and unlocks for Story Campaign Mode.
 * Persists to localStorage.
 */
window.Game = window.Game || {};

window.Game.CampaignState = {
    // Campaign mode flag
    enabled: false,

    // Boss progression state
    bosses: {
        FEDERAL_RESERVE: { defeated: false, unlocked: true },  // Always unlocked
        BCE: { defeated: false, unlocked: false },
        BOJ: { defeated: false, unlocked: false }
    },

    // Boss order for campaign
    BOSS_ORDER: ['FEDERAL_RESERVE', 'BCE', 'BOJ'],

    // New Game+ tracking
    ngPlusLevel: 0,  // 0 = normal, 1+ = NG+ cycles
    perksCarryover: [],  // Perks to carry into NG+

    // Story Mode: track which chapters have been shown
    storyProgress: {
        PROLOGUE: false,
        CHAPTER_1: false,
        CHAPTER_2: false,
        CHAPTER_3: false
    },

    // Campaign stats
    stats: {
        totalDefeats: 0,
        fastestFED: null,
        fastestBCE: null,
        fastestBOJ: null,
        campaignCompleteTime: null
    },

    /**
     * Initialize campaign state from localStorage
     */
    init() {
        this.load();
        return this;
    },

    /**
     * Enable/disable campaign mode
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.save();
    },

    /**
     * Check if campaign mode is active
     */
    isEnabled() {
        return this.enabled;
    },

    /**
     * Get the next boss to fight in campaign
     * Returns null if campaign complete
     */
    getNextBoss() {
        for (const bossType of this.BOSS_ORDER) {
            if (!this.bosses[bossType].defeated) {
                return bossType;
            }
        }
        return null; // Campaign complete
    },

    /**
     * Get current campaign progress (1-3)
     */
    getProgress() {
        let defeated = 0;
        for (const bossType of this.BOSS_ORDER) {
            if (this.bosses[bossType].defeated) defeated++;
        }
        return {
            current: defeated + 1,
            total: this.BOSS_ORDER.length,
            defeated: defeated,
            complete: defeated >= this.BOSS_ORDER.length
        };
    },

    /**
     * Check if a boss is unlocked
     */
    isBossUnlocked(bossType) {
        return this.bosses[bossType]?.unlocked || false;
    },

    /**
     * Check if a boss has been defeated
     */
    isBossDefeated(bossType) {
        return this.bosses[bossType]?.defeated || false;
    },

    /**
     * Mark a boss as defeated and unlock next
     */
    defeatBoss(bossType, timeMs = null) {
        if (!this.bosses[bossType]) return false;

        this.bosses[bossType].defeated = true;
        this.stats.totalDefeats++;

        // Track fastest time
        if (timeMs) {
            const statKey = `fastest${bossType.replace('FEDERAL_RESERVE', 'FED').replace('_', '')}`;
            if (!this.stats[statKey] || timeMs < this.stats[statKey]) {
                this.stats[statKey] = timeMs;
            }
        }

        // Unlock next boss
        const idx = this.BOSS_ORDER.indexOf(bossType);
        if (idx >= 0 && idx < this.BOSS_ORDER.length - 1) {
            const nextBoss = this.BOSS_ORDER[idx + 1];
            this.bosses[nextBoss].unlocked = true;
        }

        // Check for campaign completion
        const progress = this.getProgress();
        if (progress.complete) {
            this.stats.campaignCompleteTime = Date.now();
            // Emit event for campaign complete
            if (window.Game.Events) {
                window.Game.Events.emit('campaign:complete', {
                    ngPlusLevel: this.ngPlusLevel,
                    stats: this.stats
                });
            }
        }

        this.save();

        // Emit event
        if (window.Game.Events) {
            window.Game.Events.emit('campaign:boss_defeated', {
                bossType: bossType,
                progress: progress
            });
        }

        return progress.complete;
    },

    /**
     * Check if campaign is complete
     */
    isCampaignComplete() {
        return this.getProgress().complete;
    },

    /**
     * Start New Game+ with perk carryover
     */
    startNewGamePlus(perks = []) {
        this.ngPlusLevel++;
        this.perksCarryover = perks.slice(); // Copy perks

        // Reset boss defeats but keep unlocks
        for (const bossType of this.BOSS_ORDER) {
            this.bosses[bossType].defeated = false;
        }

        this.save();

        // Emit event
        if (window.Game.Events) {
            window.Game.Events.emit('campaign:ng_plus_start', {
                level: this.ngPlusLevel,
                perks: this.perksCarryover
            });
        }

        return this.ngPlusLevel;
    },

    /**
     * Get NG+ difficulty multiplier
     */
    getNGPlusMultiplier() {
        // Each NG+ adds 25% difficulty
        return 1 + (this.ngPlusLevel * 0.25);
    },

    /**
     * Get perks to carry over for NG+
     */
    getCarryoverPerks() {
        return this.perksCarryover.slice();
    },

    /**
     * Reset campaign progress (keep stats)
     */
    resetCampaign() {
        this.bosses = {
            FEDERAL_RESERVE: { defeated: false, unlocked: true },
            BCE: { defeated: false, unlocked: false },
            BOJ: { defeated: false, unlocked: false }
        };
        this.ngPlusLevel = 0;
        this.perksCarryover = [];
        // Reset story progress too
        this.storyProgress = {
            PROLOGUE: false,
            CHAPTER_1: false,
            CHAPTER_2: false,
            CHAPTER_3: false
        };
        this.save();
    },

    /**
     * Full reset including stats
     */
    fullReset() {
        this.resetCampaign();
        this.stats = {
            totalDefeats: 0,
            fastestFED: null,
            fastestBCE: null,
            fastestBOJ: null,
            campaignCompleteTime: null
        };
        this.enabled = false;
        this.save();
    },

    /**
     * Save campaign state to localStorage
     */
    save() {
        try {
            const data = {
                enabled: this.enabled,
                bosses: this.bosses,
                ngPlusLevel: this.ngPlusLevel,
                perksCarryover: this.perksCarryover,
                stats: this.stats,
                storyProgress: this.storyProgress,
                version: 2,  // Bumped for storyProgress
                timestamp: Date.now()
            };
            localStorage.setItem('fiat_campaign', JSON.stringify(data));
        } catch (e) {
            console.warn('[CampaignState] Failed to save:', e);
        }
    },

    /**
     * Load campaign state from localStorage
     */
    load() {
        try {
            const raw = localStorage.getItem('fiat_campaign');
            if (!raw) return;

            const data = JSON.parse(raw);

            // Validate and apply (support both v1 and v2)
            if (data.version === 1 || data.version === 2) {
                this.enabled = data.enabled || false;
                this.ngPlusLevel = data.ngPlusLevel || 0;
                this.perksCarryover = data.perksCarryover || [];

                // Merge boss states (preserve structure)
                if (data.bosses) {
                    for (const bossType of this.BOSS_ORDER) {
                        if (data.bosses[bossType]) {
                            this.bosses[bossType] = data.bosses[bossType];
                        }
                    }
                }

                // Merge stats
                if (data.stats) {
                    Object.assign(this.stats, data.stats);
                }

                // Merge story progress (v2+)
                if (data.storyProgress) {
                    Object.assign(this.storyProgress, data.storyProgress);
                }
            }
        } catch (e) {
            console.warn('[CampaignState] Failed to load:', e);
        }
    },

    /**
     * Get display name for boss
     */
    getBossDisplayName(bossType) {
        const names = {
            FEDERAL_RESERVE: 'Federal Reserve',
            BCE: 'European Central Bank',
            BOJ: 'Bank of Japan'
        };
        return names[bossType] || bossType;
    },

    /**
     * Get short name for boss
     */
    getBossShortName(bossType) {
        const names = {
            FEDERAL_RESERVE: 'FED',
            BCE: 'BCE',
            BOJ: 'BOJ'
        };
        return names[bossType] || bossType;
    }
};
