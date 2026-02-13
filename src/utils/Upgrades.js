window.Game = window.Game || {};

// v4.60: Elemental perk system — fixed progression Fire → Laser → Electric
// No stacking, no weights, no rarity. Order is always 1→2→3.
window.Game.UPGRADES = [
    {
        id: 'fire_element',
        name: 'Fire',
        order: 1,
        elementType: 'fire',
        icon: '\uD83D\uDD25',
        desc: 'Splash damage 30% on kill.',
        apply(runState) {
            runState.hasFirePerk = true;
            runState.perkLevel = Math.max(runState.perkLevel, 1);
        }
    },
    {
        id: 'laser_element',
        name: 'Laser',
        order: 2,
        elementType: 'laser',
        icon: '\u26A1',
        desc: 'Bullets +25% speed, pierce +1.',
        apply(runState) {
            runState.hasLaserPerk = true;
            runState.perkLevel = Math.max(runState.perkLevel, 2);
        }
    },
    {
        id: 'electric_element',
        name: 'Electric',
        order: 3,
        elementType: 'electric',
        icon: '\uD83C\uDF00',
        desc: 'Chain 20% damage to nearby enemies.',
        apply(runState) {
            runState.hasElectricPerk = true;
            runState.perkLevel = Math.max(runState.perkLevel, 3);
        }
    }
];
