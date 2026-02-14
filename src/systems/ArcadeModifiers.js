/**
 * ArcadeModifiers.js — Roguelike modifier definitions, pool, selection, application
 * Part of Arcade "Rogue Protocol" mode
 */
(function () {
    'use strict';
    const G = window.Game = window.Game || {};

    const CATEGORIES = { OFFENSE: 'OFFENSE', DEFENSE: 'DEFENSE', WILD: 'WILD' };

    // Modifier definitions
    const MODIFIER_POOL = [
        // --- OFFENSE ---
        {
            id: 'OVERCLOCK', name: 'Overclock', category: CATEGORIES.OFFENSE,
            desc: { EN: 'Fire rate +20%', IT: 'Cadenza +20%' },
            icon: '\u26A1', stackable: true, maxStacks: 2,
            apply(bonuses) { bonuses.fireRateMult *= 0.80; } // Lower cooldown = faster
        },
        {
            id: 'ARMOR_PIERCING', name: 'Armor Piercing', category: CATEGORIES.OFFENSE,
            desc: { EN: 'All bullets +1 pierce', IT: 'Tutti i proiettili +1 penetrazione' },
            icon: '\uD83D\uDD2B', stackable: true, maxStacks: 2,
            apply(bonuses) { bonuses.piercePlus += 1; }
        },
        {
            id: 'VOLATILE_ROUNDS', name: 'Volatile Rounds', category: CATEGORIES.OFFENSE,
            desc: { EN: 'Kill = AoE 30px, 50% dmg', IT: 'Uccisione = AoE 30px, 50% danno' },
            icon: '\uD83D\uDCA5', stackable: false,
            apply(bonuses) { bonuses.volatileRounds = true; }
        },
        {
            id: 'CRITICAL_HIT', name: 'Critical Hit', category: CATEGORIES.OFFENSE,
            desc: { EN: '15% chance 3x damage', IT: '15% chance danno 3x' },
            icon: '\uD83C\uDFAF', stackable: true, maxStacks: 2,
            apply(bonuses) { bonuses.critChance = Math.min(0.30, bonuses.critChance + 0.15); }
        },
        {
            id: 'CHAIN_LIGHTNING', name: 'Chain Lightning', category: CATEGORIES.OFFENSE,
            desc: { EN: 'Kill chains to 1 nearby enemy (30%)', IT: 'Uccisione: catena a 1 nemico (30%)' },
            icon: '\u26A1', stackable: false,
            apply(bonuses) { bonuses.chainLightning = true; }
        },

        // --- DEFENSE ---
        {
            id: 'NANO_SHIELD', name: 'Nano Shield', category: CATEGORIES.DEFENSE,
            desc: { EN: 'Auto-shield every 45s', IT: 'Auto-scudo ogni 45s' },
            icon: '\uD83D\uDEE1\uFE0F', stackable: false,
            apply(bonuses) { bonuses.nanoShieldCooldown = 45; bonuses.nanoShieldTimer = 45; }
        },
        {
            id: 'EXTRA_LIFE', name: 'Extra Life', category: CATEGORIES.DEFENSE,
            desc: { EN: '+1 life', IT: '+1 vita' },
            icon: '\u2764\uFE0F', stackable: true, maxStacks: 99,
            apply(bonuses) { bonuses.extraLives += 1; }
        },
        {
            id: 'BULLET_TIME', name: 'Bullet Time', category: CATEGORIES.DEFENSE,
            desc: { EN: 'Enemy bullets -20% speed', IT: 'Proiettili nemici -20% velocita' },
            icon: '\u23F3', stackable: true, maxStacks: 2,
            apply(bonuses) { bonuses.enemyBulletSpeedMult *= 0.80; }
        },
        {
            id: 'WIDER_GRAZE', name: 'Wider Graze', category: CATEGORIES.DEFENSE,
            desc: { EN: 'Graze radius +40%', IT: 'Raggio graze +40%' },
            icon: '\uD83D\uDCAB', stackable: false,
            apply(bonuses) { bonuses.grazeRadiusMult = 1.40; }
        },
        {
            id: 'EMERGENCY_HEAL', name: 'Last Stand', category: CATEGORIES.DEFENSE,
            desc: { EN: 'Survive lethal hit 1x/cycle', IT: 'Sopravvivi colpo letale 1x/ciclo' },
            icon: '\uD83D\uDC94', stackable: false,
            apply(bonuses) { bonuses.lastStandAvailable = true; }
        },

        // --- WILD ---
        {
            id: 'DOUBLE_SCORE', name: 'Double Score', category: CATEGORIES.WILD,
            desc: { EN: 'Score 2x but enemies +25% HP', IT: 'Punti 2x ma nemici +25% HP' },
            icon: '\uD83D\uDCB0', stackable: false,
            apply(bonuses) { bonuses.scoreMult *= 2.0; bonuses.enemyHpMult *= 1.25; }
        },
        {
            id: 'BULLET_HELL', name: 'Bullet Hell', category: CATEGORIES.WILD,
            desc: { EN: 'Enemies fire +40% but drops +60%', IT: 'Nemici +40% fuoco ma drop +60%' },
            icon: '\uD83D\uDD25', stackable: false,
            apply(bonuses) { bonuses.enemyBulletSpeedMult *= 1.40; bonuses.dropRateMult *= 1.60; }
        },
        {
            id: 'SPEED_DEMON', name: 'Speed Demon', category: CATEGORIES.WILD,
            desc: { EN: 'Everything +25% speed', IT: 'Tutto +25% velocita' },
            icon: '\uD83D\uDCA8', stackable: false,
            apply(bonuses) { bonuses.speedMult *= 1.25; bonuses.enemyBulletSpeedMult *= 1.25; }
        },
        {
            id: 'JACKPOT', name: 'Jackpot', category: CATEGORIES.WILD,
            desc: { EN: 'Pity timers halved but -1 life', IT: 'Pity dimezzati ma -1 vita' },
            icon: '\uD83C\uDFB0', stackable: false,
            apply(bonuses) { bonuses.pityMult *= 0.50; bonuses.extraLives -= 1; }
        },
        {
            id: 'BERSERKER', name: 'Berserker', category: CATEGORIES.WILD,
            desc: { EN: 'Damage +50% but no shield drops', IT: 'Danno +50% ma niente drop scudo' },
            icon: '\uD83E\uDDB9', stackable: false,
            apply(bonuses) { bonuses.damageMult *= 1.50; bonuses.noShieldDrops = true; }
        }
    ];

    // Category colors (for UI)
    const CATEGORY_COLORS = {
        OFFENSE: '#ff6b35',
        DEFENSE: '#00f0ff',
        WILD: '#ff2d95'
    };

    /**
     * Pick N random modifiers from the pool, respecting stack limits
     */
    function getRandomModifiers(count, currentModifiers) {
        const stackCounts = {};
        currentModifiers.forEach(id => {
            stackCounts[id] = (stackCounts[id] || 0) + 1;
        });

        const available = MODIFIER_POOL.filter(mod => {
            if (!mod.stackable && currentModifiers.includes(mod.id)) return false;
            if (mod.stackable && (stackCounts[mod.id] || 0) >= mod.maxStacks) return false;
            return true;
        });

        // Shuffle and pick
        const shuffled = available.slice().sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    /**
     * Apply a modifier: add to list + recalculate all bonuses
     */
    function applyModifier(modId) {
        const rs = G.RunState;
        const mod = MODIFIER_POOL.find(m => m.id === modId);
        if (!mod) return;

        rs.arcadeModifiers.push(modId);
        rs.arcadeModifierPicks++;

        // Recalculate all bonuses from scratch
        recalculateBonuses();
    }

    /**
     * Recalculate all bonuses from the current modifier list
     */
    function recalculateBonuses() {
        const rs = G.RunState;
        // Reset bonuses
        const b = rs.arcadeBonuses;
        b.fireRateMult = 1.0;
        b.damageMult = 1.0;
        b.piercePlus = 0;
        b.speedMult = 1.0;
        b.enemyHpMult = 1.0;
        b.enemyBulletSpeedMult = 1.0;
        b.dropRateMult = 1.0;
        b.scoreMult = 1.0;
        b.grazeRadiusMult = 1.0;
        b.pityMult = 1.0;
        b.extraLives = 0;
        b.nanoShieldTimer = 0;
        b.nanoShieldCooldown = 0;
        b.lastStandAvailable = false;
        b.noShieldDrops = false;
        b.volatileRounds = false;
        b.chainLightning = false;
        b.critChance = 0;
        b.critMult = 3.0;

        // Apply each modifier in order
        rs.arcadeModifiers.forEach(id => {
            const mod = MODIFIER_POOL.find(m => m.id === id);
            if (mod) mod.apply(b);
        });
    }

    function getModifierById(id) {
        return MODIFIER_POOL.find(m => m.id === id) || null;
    }

    function getCategoryColor(category) {
        return CATEGORY_COLORS[category] || '#ffffff';
    }

    function isArcadeMode() {
        return !(G.CampaignState && G.CampaignState.isEnabled());
    }

    G.ArcadeModifiers = {
        CATEGORIES,
        CATEGORY_COLORS,
        MODIFIER_POOL,
        getRandomModifiers,
        applyModifier,
        recalculateBonuses,
        getModifierById,
        getCategoryColor,
        isArcadeMode
    };
})();
