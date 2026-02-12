window.Game = window.Game || {};

// v4.57: Rationalized perk system — 12 → 6 perks, zero dead code
window.Game.UPGRADES = [
    {
        id: 'rapid_core',
        name: 'Rapid Core',
        rarity: 'common',
        weight: 100,
        icon: '\u26A1',
        desc: 'Fire rate +15%. Kill streaks boost fire rate.',
        stackable: true,
        maxStacks: 2,
        apply(runState) {
            runState.modifiers.fireRateMult *= 0.85;
            runState.flags.rapidCoreKillBoost = true;
        }
    },
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
        id: 'fortress_protocol',
        name: 'Fortress Protocol',
        rarity: 'uncommon',
        weight: 70,
        icon: '\u2744\uFE0F',
        desc: 'Shield cooldown -25%. At x2: invuln on shield expire.',
        stackable: true,
        maxStacks: 2,
        apply(runState) {
            runState.modifiers.shieldCooldownMult *= 0.75;
            const stacks = (runState.perkStacks['fortress_protocol'] || 0) + 1;
            if (stacks >= 2) {
                runState.flags.secondWind = true;
            }
        }
    },
    {
        id: 'wide_arsenal',
        name: 'Wide Arsenal',
        rarity: 'rare',
        weight: 40,
        icon: '\uD83D\uDCE1',
        desc: 'Adds 2 wide-angle shots.',
        stackable: false,
        maxStacks: 1,
        apply(runState) {
            runState.flags.wideArsenal = true;
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
        maxStacks: 3,
        apply(runState) {
            runState.modifiers.scoreMult *= 1.25;
        }
    }
];
