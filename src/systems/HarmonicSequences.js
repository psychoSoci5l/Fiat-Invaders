// Harmonic Sequences - Pre-composed attack choreographies
// Each sequence is a 16-beat (or 32-beat) pattern of attacks
window.Game = window.Game || {};

window.Game.HarmonicSequences = {
    // Attack types for reference
    ATTACK_TYPES: {
        SYNC_FIRE: 'SYNC_FIRE',       // All enemies of a tier fire together
        SWEEP_LEFT: 'SWEEP_LEFT',     // Sequential left-to-right
        SWEEP_RIGHT: 'SWEEP_RIGHT',   // Sequential right-to-left
        CASCADE_DOWN: 'CASCADE_DOWN', // Row by row top-to-bottom
        CASCADE_UP: 'CASCADE_UP',     // Row by row bottom-to-top
        PATTERN: 'PATTERN',           // Use BulletPatterns.js
        RANDOM_SINGLE: 'RANDOM_SINGLE' // Sparse random fire
    },

    // Fallback sequence - guaranteed to always work
    // Used when no specific sequence is set (ensures enemies always fire)
    DEFAULT_BASIC: [
        { beat: 0, type: 'RANDOM_SINGLE', tier: 'STRONG', chance: 0.5 },
        { beat: 4, type: 'RANDOM_SINGLE', tier: 'MEDIUM', chance: 0.4 },
        { beat: 8, type: 'RANDOM_SINGLE', tier: 'STRONG', chance: 0.5 },
        { beat: 12, type: 'RANDOM_SINGLE', tier: 'WEAK', chance: 0.3 }
    ],

    // Tier definitions for enemy targeting
    TIERS: {
        STRONG: [7, 8, 9],  // Dollar, Yuan, CBDC
        MEDIUM: [3, 4, 5, 6], // Euro, Pound, Franc, Lira
        WEAK: [0, 1, 2]     // Yen, Ruble, Rupee
    },

    // Telegraph styles
    TELEGRAPH: {
        INDIVIDUAL: { duration: 0.15, style: 'ring' },
        ROW_SWEEP: { duration: 0.25, style: 'bar' },
        CASCADE_BAR: { duration: 0.3, style: 'fullbar' },
        BEAT_PULSE: { duration: 0.1, style: 'flash' }
    },

    // Pattern colors for visual language
    COLORS: {
        CURTAIN: '#ff69b4',   // Pink - walls
        SPIRAL: '#ffff00',    // Yellow - rotations
        FLOWER: '#ff00ff',    // Magenta - bursts
        RING: '#00ffff',      // Cyan - expansions
        AIMED: '#ff4444',     // Red - targeted danger
        SWEEP: '#4ecdc4',     // Teal - sequential
        CASCADE: '#ff8c00'    // Orange - cascades
    },

    // ===========================================
    // VERSE SEQUENCES (Standard wave patterns)
    // ===========================================

    // RECT formation - Basic, steady rhythm
    VERSE_RECT: [
        { beat: 0, type: 'SYNC_FIRE', tier: 'STRONG', pattern: 'DOUBLE' },
        { beat: 4, type: 'SWEEP_LEFT', tier: 'MEDIUM' },
        { beat: 8, type: 'SYNC_FIRE', tier: 'STRONG', pattern: 'BURST' },
        { beat: 12, type: 'SWEEP_RIGHT', tier: 'MEDIUM' },
        // Filler - weak tier fires on even beats (30% chance each)
        { beat: 2, type: 'RANDOM_SINGLE', tier: 'WEAK', chance: 0.3 },
        { beat: 6, type: 'RANDOM_SINGLE', tier: 'WEAK', chance: 0.3 },
        { beat: 10, type: 'RANDOM_SINGLE', tier: 'WEAK', chance: 0.3 },
        { beat: 14, type: 'RANDOM_SINGLE', tier: 'WEAK', chance: 0.3 }
    ],

    // V_SHAPE formation - Cascading (cascading)
    VERSE_V_SHAPE: [
        { beat: 0, type: 'CASCADE_DOWN', delay: 0.15 },
        { beat: 4, type: 'SYNC_FIRE', tier: 'STRONG', target: 'tip' },
        { beat: 8, type: 'SWEEP_LEFT', tier: 'MEDIUM' },
        { beat: 12, type: 'SYNC_FIRE', tier: 'STRONG', target: 'tip' },
        { beat: 6, type: 'RANDOM_SINGLE', tier: 'MEDIUM', chance: 0.4 },
        { beat: 14, type: 'RANDOM_SINGLE', tier: 'MEDIUM', chance: 0.4 }
    ],

    // COLUMNS formation - Alternating sweeps
    VERSE_COLUMNS: [
        { beat: 0, type: 'SWEEP_LEFT', tier: 'ALL', delay: 0.08 },
        { beat: 4, type: 'SYNC_FIRE', tier: 'STRONG' },
        { beat: 8, type: 'SWEEP_RIGHT', tier: 'ALL', delay: 0.08 },
        { beat: 12, type: 'SYNC_FIRE', tier: 'MEDIUM' },
        { beat: 2, type: 'RANDOM_SINGLE', tier: 'WEAK', chance: 0.25 },
        { beat: 10, type: 'RANDOM_SINGLE', tier: 'WEAK', chance: 0.25 }
    ],

    // SINE_WAVE formation - Intense but enemy-based (enemy-based)
    VERSE_SINE_WAVE: [
        { beat: 0, type: 'SWEEP_LEFT', tier: 'ALL', delay: 0.1 },
        { beat: 4, type: 'SYNC_FIRE', tier: 'STRONG' },
        { beat: 8, type: 'SWEEP_RIGHT', tier: 'ALL', delay: 0.1 },
        { beat: 12, type: 'AIMED_VOLLEY', tier: 'STRONG' },
        { beat: 2, type: 'RANDOM_SINGLE', tier: 'MEDIUM', chance: 0.35 },
        { beat: 6, type: 'RANDOM_SINGLE', tier: 'WEAK', chance: 0.35 },
        { beat: 10, type: 'RANDOM_SINGLE', tier: 'MEDIUM', chance: 0.35 },
        { beat: 14, type: 'RANDOM_SINGLE', tier: 'WEAK', chance: 0.35 }
    ],

    // ===========================================
    // CHORUS SEQUENCES (High intensity > 80%)
    // ===========================================

    // 32-beat intense assault (enemy-based)
    CHORUS_ASSAULT: [
        { beat: 0, type: 'CASCADE_DOWN', delay: 0.12 },
        { beat: 4, type: 'SYNC_FIRE', tier: 'ALL' },
        { beat: 8, type: 'CASCADE_UP', delay: 0.12 },
        { beat: 12, type: 'AIMED_VOLLEY', tier: 'STRONG' },
        { beat: 16, type: 'SWEEP_LEFT', tier: 'ALL', delay: 0.08 },
        { beat: 20, type: 'SYNC_FIRE', tier: 'ALL' },
        { beat: 24, type: 'SWEEP_RIGHT', tier: 'ALL', delay: 0.08 },
        { beat: 28, type: 'AIMED_VOLLEY', tier: 'ALL' },
        // Filler throughout
        { beat: 2, type: 'SYNC_FIRE', tier: 'STRONG' },
        { beat: 6, type: 'SWEEP_LEFT', tier: 'MEDIUM' },
        { beat: 10, type: 'SYNC_FIRE', tier: 'STRONG' },
        { beat: 14, type: 'SWEEP_RIGHT', tier: 'MEDIUM' },
        { beat: 18, type: 'SYNC_FIRE', tier: 'MEDIUM' },
        { beat: 22, type: 'SWEEP_LEFT', tier: 'STRONG' },
        { beat: 26, type: 'SYNC_FIRE', tier: 'MEDIUM' },
        { beat: 30, type: 'SWEEP_RIGHT', tier: 'STRONG' }
    ],

    // ===========================================
    // BEAR MARKET CHAOS (Hard mode)
    // ===========================================

    // Bear Market - Fast and intense but enemy-based (enemy-based)
    BEAR_MARKET_CHAOS: [
        { beat: 0, type: 'SYNC_FIRE', tier: 'ALL' },
        { beat: 2, type: 'SWEEP_LEFT', tier: 'ALL', delay: 0.05 },
        { beat: 4, type: 'RANDOM_VOLLEY', count: 8 },
        { beat: 6, type: 'AIMED_VOLLEY', tier: 'STRONG', spread: 0.5 },
        { beat: 8, type: 'SWEEP_RIGHT', tier: 'ALL', delay: 0.05 },
        { beat: 10, type: 'AIMED_VOLLEY', tier: 'STRONG', spread: 0.6 },
        { beat: 12, type: 'CASCADE_DOWN', delay: 0.06 },
        { beat: 14, type: 'SYNC_FIRE', tier: 'ALL' },
        // Second loop (beats 16-31)
        { beat: 16, type: 'CASCADE_UP', delay: 0.06 },
        { beat: 18, type: 'SWEEP_LEFT', tier: 'ALL', delay: 0.05 },
        { beat: 20, type: 'SYNC_FIRE', tier: 'ALL' },
        { beat: 22, type: 'AIMED_VOLLEY', tier: 'ALL', spread: 0.4 },
        { beat: 24, type: 'SWEEP_RIGHT', tier: 'ALL', delay: 0.05 },
        { beat: 26, type: 'AIMED_VOLLEY', tier: 'ALL', spread: 0.4 },
        { beat: 28, type: 'CASCADE_DOWN', delay: 0.06 },
        { beat: 30, type: 'SYNC_FIRE', tier: 'ALL' }
    ],

    // ===========================================
    // BOSS SEQUENCES
    // ===========================================

    BOSS_PHASE_1: [
        { beat: 0, type: 'BOSS_SPREAD', config: { count: 5, color: '#00ff00' } },
        { beat: 4, type: 'PATTERN', name: 'curtain', config: { gapSize: 90, color: '#00ff00' } },
        { beat: 8, type: 'BOSS_SPREAD', config: { count: 5, color: '#00ff00' } },
        { beat: 12, type: 'PATTERN', name: 'expandingRing', config: { count: 10, color: '#00ff00' } }
    ],

    BOSS_PHASE_2: [
        { beat: 0, type: 'PATTERN', name: 'spiral', config: { arms: 4, color: '#ff8c00' } },
        { beat: 2, type: 'AIMED_VOLLEY', tier: 'BOSS', spread: 0.3 },
        { beat: 4, type: 'PATTERN', name: 'spiral', config: { arms: 4, color: '#ff8c00' } },
        { beat: 6, type: 'BOSS_SIDE_CANNONS', config: {} },
        { beat: 8, type: 'PATTERN', name: 'doubleHelix', config: { color1: '#ff8c00', color2: '#ffff00' } },
        { beat: 10, type: 'AIMED_VOLLEY', tier: 'BOSS', spread: 0.4 },
        { beat: 12, type: 'PATTERN', name: 'curtain', config: { gapSize: 70, count: 16 } },
        { beat: 14, type: 'BOSS_SIDE_CANNONS', config: {} }
    ],

    BOSS_PHASE_3: [
        { beat: 0, type: 'PATTERN', name: 'spiral', config: { arms: 6, color: '#ff4444' } },
        { beat: 1, type: 'BOSS_SIDE_CANNONS', config: {} },
        { beat: 2, type: 'PATTERN', name: 'spiral', config: { arms: 6, color: '#ff4444' } },
        { beat: 3, type: 'AIMED_VOLLEY', tier: 'BOSS', spread: 0.5 },
        { beat: 4, type: 'PATTERN', name: 'flower', config: { petals: 8, color: '#ff4444' } },
        { beat: 5, type: 'BOSS_SIDE_CANNONS', config: {} },
        { beat: 6, type: 'PATTERN', name: 'expandingRing', config: { count: 20, color: '#ff4444' } },
        { beat: 7, type: 'AIMED_VOLLEY', tier: 'BOSS', spread: 0.3 },
        { beat: 8, type: 'PATTERN', name: 'curtain', config: { gapSize: 55, count: 20, color: '#ff4444' } },
        { beat: 9, type: 'BOSS_SIDE_CANNONS', config: {} },
        { beat: 10, type: 'PATTERN', name: 'spiral', config: { arms: 8, color: '#ff4444' } },
        { beat: 11, type: 'AIMED_VOLLEY', tier: 'BOSS', spread: 0.6 },
        { beat: 12, type: 'PATTERN', name: 'doubleHelix', config: {} },
        { beat: 13, type: 'BOSS_SIDE_CANNONS', config: {} },
        { beat: 14, type: 'PATTERN', name: 'flower', config: { petals: 10, color: '#ff4444' } },
        { beat: 15, type: 'BOSS_MINION_SPAWN', config: {} }
    ],

    // ===========================================
    // HELPER: Get sequence for wave pattern
    // ===========================================

    getSequenceForPattern(wavePattern, intensity, isBearMarket) {
        // Bear Market override
        if (isBearMarket) {
            return this.BEAR_MARKET_CHAOS;
        }

        // High intensity = chorus
        if (intensity >= 80) {
            return this.CHORUS_ASSAULT;
        }

        // Standard verse based on formation
        switch (wavePattern) {
            case 'V_SHAPE':
                return this.VERSE_V_SHAPE;
            case 'COLUMNS':
                return this.VERSE_COLUMNS;
            case 'SINE_WAVE':
                return this.VERSE_SINE_WAVE;
            case 'RECT':
            default:
                return this.VERSE_RECT;
        }
    },

    getBossSequence(phase) {
        switch (phase) {
            case 1: return this.BOSS_PHASE_1;
            case 2: return this.BOSS_PHASE_2;
            case 3: return this.BOSS_PHASE_3;
            default: return this.BOSS_PHASE_1;
        }
    }
};
