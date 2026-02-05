window.Game = window.Game || {};

window.Game.UPGRADES = [
    {
        id: 'rapid_core',
        name: 'Rapid Core',
        rarity: 'common',
        weight: 100,
        icon: '⚡',
        desc: 'Fire rate +20%.',
        stackable: true,
        maxStacks: 3,
        apply(runState) {
            runState.modifiers.fireRateMult *= 0.8;
        }
    },
    {
        id: 'overclock_thrusters',
        name: 'Overclock Thrusters',
        rarity: 'common',
        weight: 100,
        icon: '🚀',
        desc: 'Move speed +15%.',
        stackable: true,
        maxStacks: 3,
        apply(runState) {
            runState.modifiers.speedMult *= 1.15;
        }
    },
    {
        id: 'second_wind',
        name: 'Second Wind',
        rarity: 'rare',
        weight: 40,
        icon: '💨',
        desc: '0.5s invuln when shield expires.',
        stackable: false,
        maxStacks: 1,
        apply(runState) {
            runState.flags.secondWind = true;
        }
    },
    {
        id: 'diamond_hands',
        name: 'Diamond Hands',
        rarity: 'rare',
        weight: 40,
        icon: '💎',
        desc: 'Score multiplier +25%.',
        stackable: true,
        maxStacks: 4,
        apply(runState) {
            runState.modifiers.scoreMult *= 1.25;
        }
    },
    {
        id: 'cooldown_vents',
        name: 'Cooldown Vents',
        rarity: 'uncommon',
        weight: 70,
        icon: '❄️',
        desc: 'Shield cooldown -20%.',
        stackable: true,
        maxStacks: 3,
        apply(runState) {
            runState.modifiers.shieldCooldownMult *= 0.8;
        }
    },
    {
        id: 'kinetic_rounds',
        name: 'Kinetic Rounds',
        rarity: 'uncommon',
        weight: 70,
        icon: '💥',
        desc: 'Bullet damage +25%.',
        stackable: true,
        maxStacks: 3,
        apply(runState) {
            runState.modifiers.damageMult *= 1.25;
        }
    },
    {
        id: 'hodl_protocol',
        name: 'HODL Protocol',
        rarity: 'rare',
        weight: 35,
        icon: '✋',
        desc: 'HODL shots deal +1 damage.',
        stackable: false,
        maxStacks: 1,
        apply(runState) {
            runState.flags.hodlBonus = true;
        }
    },
    {
        id: 'precision_calibration',
        name: 'Precision Calibration',
        rarity: 'epic',
        weight: 15,
        icon: '🎯',
        desc: 'All bullets pierce 1 target.',
        stackable: false,
        maxStacks: 1,
        apply(runState) {
            runState.flags.pierce = true;
        }
    },
    {
        id: 'volatility_rush',
        name: 'Volatility Rush',
        rarity: 'epic',
        weight: 15,
        icon: '📈',
        desc: 'Killing speed boosts fire rate briefly.',
        stackable: false,
        maxStacks: 1,
        apply(runState) {
            runState.flags.volatilityRush = true;
        }
    }
    ,
    {
        id: 'twin_cannons',
        name: 'Twin Cannons',
        rarity: 'uncommon',
        weight: 60,
        icon: '🧷',
        desc: 'Double shot on straight fire.',
        stackable: false,
        maxStacks: 1,
        apply(runState) {
            runState.flags.twinCannons = true;
        }
    },
    {
        id: 'wide_spread',
        name: 'Wide Spread',
        rarity: 'uncommon',
        weight: 60,
        icon: '📡',
        desc: 'Adds two wide-angle shots.',
        stackable: false,
        maxStacks: 1,
        apply(runState) {
            runState.flags.wideSpread = true;
        }
    },
    {
        id: 'laser_focus',
        name: 'Laser Focus',
        rarity: 'epic',
        weight: 12,
        icon: '🔴',
        desc: 'Fire piercing laser beams.',
        stackable: false,
        maxStacks: 1,
        apply(runState) {
            runState.flags.laserBeam = true;
        }
    }
];
