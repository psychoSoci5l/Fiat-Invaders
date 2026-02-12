window.Game = window.Game || {};

// v4.59: Reduced perk system — 6 → 3 perks (1 DPS, 1 speed, 1 score)
window.Game.UPGRADES = [
    {
        id: 'kinetic_rounds',
        name: 'Kinetic Rounds',
        rarity: 'common',
        weight: 100,
        icon: '\uD83D\uDCA5',
        desc: 'Damage +20%. Bullets pierce +1 hit.',
        stackable: true,
        maxStacks: 2,
        apply(runState) {
            runState.modifiers.damageMult *= 1.20;
            runState.modifiers.pierceBonusHP = (runState.modifiers.pierceBonusHP || 0) + 1;
        }
    },
    {
        id: 'overclock_thrusters',
        name: 'Overclock Thrusters',
        rarity: 'uncommon',
        weight: 70,
        icon: '\uD83D\uDE80',
        desc: 'Move speed +15%.',
        stackable: true,
        maxStacks: 2,
        apply(runState) {
            runState.modifiers.speedMult *= 1.15;
        }
    },
    {
        id: 'diamond_hands',
        name: 'Diamond Hands',
        rarity: 'rare',
        weight: 40,
        icon: '\uD83D\uDC8E',
        desc: 'Score multiplier +25%.',
        stackable: true,
        maxStacks: 2,
        apply(runState) {
            runState.modifiers.scoreMult *= 1.25;
        }
    }
];
