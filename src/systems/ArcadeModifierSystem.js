/**
 * ArcadeModifierSystem — Isolato da ArcadeModifiers.js v7.39.4
 * Gestione pool, pick, stacking, recalculate dei modifier Arcade.
 * Depende da G.RunState.
 */
(function() {
    'use strict';

    const G = window.Game;
    if (!G) return;

    const CATEGORIES = { OFFENSE: 'OFFENSE', DEFENSE: 'DEFENSE', WILD: 'WILD' };

    const MODIFIER_POOL = [
        // --- OFFENSE ---
        {
            id: 'OVERCLOCK', name: 'Overclock', category: CATEGORIES.OFFENSE,
            desc: { EN: 'Fire rate +20%', IT: 'Cadenza +20%' },
            icon: '⚡', stackable: true, maxStacks: 2,
            apply(bonuses) { bonuses.fireRateMult *= 0.80; }
        },
        {
            id: 'ARMOR_PIERCING', name: 'Armor Piercing', category: CATEGORIES.OFFENSE,
            desc: { EN: 'All bullets +1 pierce', IT: 'Tutti i proiettili +1 penetrazione' },
            icon: '🔫', stackable: true, maxStacks: 2,
            apply(bonuses) { bonuses.piercePlus += 1; }
        },
        {
            id: 'VOLATILE_ROUNDS', name: 'Volatile Rounds', category: CATEGORIES.OFFENSE,
            desc: { EN: 'Kill = AoE 30px, 50% dmg', IT: 'Uccisione = AoE 30px, 50% danno' },
            icon: '💥', stackable: false,
            apply(bonuses) { bonuses.volatileRounds = true; }
        },
        {
            id: 'CRITICAL_HIT', name: 'Critical Hit', category: CATEGORIES.OFFENSE,
            desc: { EN: '15% chance 3x damage', IT: '15% chance danno 3x' },
            icon: '🎯', stackable: true, maxStacks: 2,
            apply(bonuses) { bonuses.critChance = Math.min(0.30, bonuses.critChance + 0.15); }
        },
        {
            id: 'CHAIN_LIGHTNING', name: 'Chain Lightning', category: CATEGORIES.OFFENSE,
            desc: { EN: 'Kill chains to 1 nearby enemy (30%)', IT: 'Uccisione: catena a 1 nemico (30%)' },
            icon: '⚡', stackable: false,
            apply(bonuses) { bonuses.chainLightning = true; }
        },

        // --- DEFENSE ---
        {
            id: 'NANO_SHIELD', name: 'Nano Shield', category: CATEGORIES.DEFENSE,
            desc: { EN: 'Auto-shield every 22s', IT: 'Auto-scudo ogni 22s' },
            icon: '🛡️', stackable: false,
            apply(bonuses) { bonuses.nanoShieldCooldown = 22; bonuses.nanoShieldTimer = 22; }
        },
        {
            id: 'EXTRA_LIFE', name: 'Extra Life', category: CATEGORIES.DEFENSE,
            desc: { EN: '+1 life', IT: '+1 vita' },
            icon: '❤️', stackable: true, maxStacks: 99,
            apply(bonuses) { bonuses.extraLives += 1; }
        },
        {
            id: 'BULLET_TIME', name: 'Bullet Time', category: CATEGORIES.DEFENSE,
            desc: { EN: 'Enemy bullets -20% speed', IT: 'Proiettili nemici -20% velocita' },
            icon: '⏳', stackable: true, maxStacks: 2,
            apply(bonuses) { bonuses.enemyBulletSpeedMult *= 0.80; }
        },
        {
            id: 'WIDER_GRAZE', name: 'Wider Graze', category: CATEGORIES.DEFENSE,
            desc: { EN: 'Graze radius +40%', IT: 'Raggio graze +40%' },
            icon: '💫', stackable: false,
            apply(bonuses) { bonuses.grazeRadiusMult = 1.40; }
        },
        {
            id: 'EMERGENCY_HEAL', name: 'Last Stand', category: CATEGORIES.DEFENSE,
            desc: { EN: 'Survive lethal hit 1x/cycle', IT: 'Sopravvivi colpo letale 1x/ciclo' },
            icon: '💔', stackable: false,
            apply(bonuses) { bonuses.lastStandAvailable = true; }
        },

        // --- WILD ---
        {
            id: 'DOUBLE_SCORE', name: 'Double Score', category: CATEGORIES.WILD,
            desc: { EN: 'Score 2x but enemies +25% HP', IT: 'Punti 2x ma nemici +25% HP' },
            icon: '💰', stackable: false,
            apply(bonuses) { bonuses.scoreMult *= 2.0; bonuses.enemyHpMult *= 1.25; }
        },
        {
            id: 'BULLET_HELL', name: 'Bullet Hell', category: CATEGORIES.WILD,
            desc: { EN: 'Enemies fire +40% but drops +60%', IT: 'Nemici +40% fuoco ma drop +60%' },
            icon: '🔥', stackable: false,
            apply(bonuses) { bonuses.enemyBulletSpeedMult *= 1.40; bonuses.dropRateMult *= 1.60; }
        },
        {
            id: 'SPEED_DEMON', name: 'Speed Demon', category: CATEGORIES.WILD,
            desc: { EN: 'Player +25% speed', IT: 'Giocatore +25% velocita' },
            icon: '💨', stackable: false,
            apply(bonuses) { bonuses.speedMult *= 1.25; }
        },
        {
            id: 'JACKPOT', name: 'Jackpot', category: CATEGORIES.WILD,
            desc: { EN: 'Pity timers halved but graze -50%', IT: 'Pity dimezzati ma graze -50%' },
            icon: '🎰', stackable: false,
            apply(bonuses) { bonuses.pityMult *= 0.50; bonuses.grazeGainMult = (bonuses.grazeGainMult || 1) * 0.50; }
        },
        {
            id: 'BERSERKER', name: 'Berserker', category: CATEGORIES.WILD,
            desc: { EN: 'Damage +50% but no shield drops', IT: 'Danno +50% ma niente drop scudo' },
            icon: '🧙', stackable: false,
            apply(bonuses) { bonuses.damageMult *= 1.50; bonuses.noShieldDrops = true; }
        }
    ];

    const CATEGORY_COLORS = {
        OFFENSE: '#ff6b35',
        DEFENSE: '#00f0ff',
        WILD: '#ff2d95'
    };

    function getRandomModifiers(count, currentModifiers) {
        const rs = G.RunState;
        const mods = currentModifiers !== undefined ? currentModifiers : (rs ? rs.arcadeModifiers : []);
        const stackCounts = {};
        mods.forEach(id => {
            stackCounts[id] = (stackCounts[id] || 0) + 1;
        });

        const available = MODIFIER_POOL.filter(mod => {
            if (!mod.stackable && mods.includes(mod.id)) return false;
            if (mod.stackable && (stackCounts[mod.id] || 0) >= mod.maxStacks) return false;
            return true;
        });

        if (count >= 3) {
            const offense = available.filter(m => m.category === CATEGORIES.OFFENSE);
            const defense = available.filter(m => m.category === CATEGORIES.DEFENSE);
            const wild = available.filter(m => m.category === CATEGORIES.WILD);

            if (offense.length > 0 && defense.length > 0) {
                const picked = [];
                picked.push(offense[Math.floor(Math.random() * offense.length)]);
                picked.push(defense[Math.floor(Math.random() * defense.length)]);
                const remaining = available.filter(m => !picked.includes(m));
                const shuffledRem = remaining.sort(() => Math.random() - 0.5);
                for (let i = 0; i < count - 2 && i < shuffledRem.length; i++) {
                    picked.push(shuffledRem[i]);
                }
                return picked.sort(() => Math.random() - 0.5);
            }
        }

        const shuffled = available.slice().sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    function applyModifier(modId) {
        const rs = G.RunState;
        const mod = MODIFIER_POOL.find(m => m.id === modId);
        if (!mod) return;
        rs.arcadeModifiers.push(modId);
        rs.arcadeModifierPicks++;
        recalculateBonuses();
    }

    function recalculateBonuses() {
        const rs = G.RunState;
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
        b.grazeGainMult = 1.0;

        rs.arcadeModifiers.forEach(id => {
            const mod = MODIFIER_POOL.find(m => m.id === id);
            if (mod) mod.apply(b);
        });
    }

    function getBonuses() {
        const rs = G.RunState;
        return Object.assign({}, rs.arcadeBonuses);
    }

    function getModifierCount() {
        const rs = G.RunState;
        return rs ? rs.arcadeModifiers.length : 0;
    }

    function hasModifier(id) {
        const rs = G.RunState;
        return rs ? rs.arcadeModifiers.includes(id) : false;
    }

    function reset() {
        const rs = G.RunState;
        rs.arcadeModifiers = [];
        rs.arcadeModifierPicks = 0;
        recalculateBonuses();
    }

    G.ArcadeModifierSystem = {
        CATEGORIES,
        CATEGORY_COLORS,
        MODIFIER_POOL,
        getRandomModifiers,
        applyModifier,
        recalculateBonuses,
        getBonuses,
        getModifierCount,
        hasModifier,
        reset
    };
})();
