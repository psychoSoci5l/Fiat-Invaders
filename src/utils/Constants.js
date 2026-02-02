// Game Constants & Configuration (Namespace Pattern)
window.Game = window.Game || {};

window.Game.VERSION = "v2.9.1 FIAT vs CRYPTO";

window.Game.TEXTS = {
    EN: {
        SCORE: "SCORE", LEVEL: "LEVEL", LIVES: "LIVES", NORMAL: "NORMAL",
        INSERT_COIN: "INSERT COIN",
        START_HINT: "📱 TAP TO START • TOUCH SIDES MOVES • ICON SHIELDS",
        MOBILE_HINT: "📱 TOUCH SIDES to Move • ICON for Shield",
        PRO_TIP: "💎 PRO TIP: STOP MOVING TO HODL (2x SCORE)",
        WAVE1: "WAVE 1: ACCUMULATION", WAVE2: "WAVE 2: BULL RUN", WAVE3: "WAVE 3: VOLATILITY",
        WAVE4: "WAVE 4: CORRECTION", WAVE5: "WAVE 5: CLIMAX",
        BOSS_ENTER: "GOLD RESERVES", BOSS_DEATH: "RESERVES LIQUIDATED",
        GAME_OVER: "REKT", RESTART: "BUY THE DIP",
        COMBO_LOST: "COMBO LOST", COMBO_BREAK: "COMBO BREAK",
        UPGRADE: "UPGRADE LVL", MAX_POWER: "MAX POWER", HODL: "HODL!",
        SETTINGS: "SETTINGS", CLOSE: "CLOSE", LANG: "LANGUAGE",
        PAUSED: "PAUSED", RESUME: "RESUME", EXIT_TITLE: "EXIT TO TITLE"
    },
    IT: {
        SCORE: "PUNTI", LEVEL: "LIVELLO", LIVES: "VITE", NORMAL: "NORMALE",
        INSERT_COIN: "INSERISCI GETTONE",
        START_HINT: "📱 TOCCA PER INIZIARE • LATI: MUOVI • ICONA: SCUDO",
        MOBILE_HINT: "📱 TOCCA LATI: Muovi • ICONA: Scudo",
        PRO_TIP: "💎 PRO TIP: FERMATI PER HODL (Punti Doppi)",
        WAVE1: "ONDATA 1: ACCUMULO", WAVE2: "ONDATA 2: BULL RUN", WAVE3: "ONDATA 3: VOLATILITÀ",
        WAVE4: "ONDATA 4: CORREZIONE", WAVE5: "ONDATA 5: CLIMAX",
        BOSS_ENTER: "RISERVE AUREE", BOSS_DEATH: "RISERVE LIQUIDATE",
        GAME_OVER: "REKT", RESTART: "COMPRA IL DIP",
        COMBO_LOST: "COMBO PERSA", COMBO_BREAK: "COMBO ROTTA",
        UPGRADE: "POTENZIAMENTO LV", MAX_POWER: "MASSIMA POTENZA", HODL: "HODL!",
        SETTINGS: "IMPOSTAZIONI", CLOSE: "CHIUDI", LANG: "LINGUA",
        PAUSED: "PAUSA", RESUME: "RIPRENDI", EXIT_TITLE: "ESCI AL TITOLO"
    }
};

window.Game.MEMES = {
    // General Crypto Culture
    LOW: [
        "HODL", "BUY THE DIP", "SHITCOIN", "PAPER HANDS", "NGMI", "HFSP",
        "FUD DETECTED", "REKT", "WAGMI", "LFG", "APE IN", "DEGEN MODE",
        "PUMP IT", "DUMP IT", "SEND IT", "NFA", "DYOR", "FOMO ENGAGED",
        "COPE HARDER", "HAVE FUN STAYING POOR", "FEW UNDERSTAND",
        "THIS IS THE WAY", "PROBABLY NOTHING", "BULLISH AF",
        "FLOOR IS LAVA", "UP ONLY", "NUMBER GO UP", "STACK SATS",
        "NOT YOUR KEYS", "NOT YOUR COINS", "TRUST THE PROCESS",
        "ZOOM OUT", "TIME IN MARKET", "DCA IS THE WAY"
    ],
    HIGH: [
        "TO THE MOON 🚀", "LAMBO SOON", "WHALE ALERT 🐋", "DIAMOND HANDS 💎",
        "WE'RE ALL GONNA MAKE IT", "GENERATIONAL WEALTH", "EARLY ADOPTER",
        "MICHAEL SAYLOR MODE", "LASER EYES ACTIVATED", "STILL EARLY",
        "FUTURE MILLIONAIRE", "GIGACHAD MOVE", "ABSOLUTE UNIT",
        "CONVICTION LEVEL: MAX", "NEVER SELLING", "INFINITY HODL",
        "APEX PREDATOR", "MONETARY MAXIMALIST", "FREEDOM TECHNOLOGY"
    ],
    // Michael Saylor Quotes
    SAYLOR: [
        "BITCOIN IS HOPE",
        "BITCOIN IS DIGITAL GOLD",
        "BITCOIN IS A SWARM OF CYBER HORNETS",
        "THERE IS NO SECOND BEST",
        "BITCOIN IS THE APEX PREDATOR",
        "INFINITY DIVIDED BY 21 MILLION",
        "BTC IS DIGITAL ENERGY",
        "BITCOIN IS ECONOMIC IMMORTALITY",
        "BITCOIN IS THERMODYNAMICALLY SOUND",
        "BITCOIN FIXES THIS",
        "EVERY COMPANY WILL HOLD BITCOIN",
        "BITCOIN IS A MONETARY NETWORK",
        "BUY BITCOIN AND WAIT",
        "BITCOIN IS DIGITAL PROPERTY",
        "BITCOIN IS THE HARDEST ASSET",
        "BITCOIN IS INCORRUPTIBLE",
        "BITCOIN IS THE EXIT",
        "HYPERBITCOINIZATION INCOMING",
        "BITCOIN IS PURE ENERGY",
        "THE GREAT REPRICING",
        "BITCOIN IS TRUTH",
        "BITCOIN NEVER SLEEPS",
        "BITCOIN IS STRONGER THAN GOVERNMENTS",
        "SELLING BTC IS SELLING THE FUTURE",
        "BITCOIN IS MONETARY INTEGRITY",
        "BITCOIN IS ENGINEERED MONEY",
        "BITCOIN IS THE RATIONAL CHOICE",
        "BITCOIN IS CIVILIZATION'S BATTERY",
        "BITCOIN ABSORBS VALUE",
        "BITCOIN IS PERFECT MONEY",
        "BITCOIN IS FREEDOM",
        "BITCOIN IS YOUR LIFEBOAT",
        "BITCOIN IS DIGITAL SCARCITY",
        "BITCOIN IS A FORCE OF NATURE",
        "BITCOIN TRANSCENDS NATIONS",
        "SAYLOR'S STACKING",
        "MICROSTRATEGY APPROVED",
        "21M OR BUST",
        "VOLATILITY IS VITALITY",
        "BITCOIN IS A CERTAINTY IN CHAOS",
        "BITCOIN IS ETHICAL MONEY",
        "BITCOIN HUMBLES YOU",
        "BITCOIN IS PURE MATHEMATICS",
        "BITCOIN IS A LIVING ORGANISM",
        "BITCOIN ABSORBS ALL",
        "BITCOIN IS INCORRUPTIBLE MATH",
        "BITCOIN IS THE ANTIDOTE",
        "BITCOIN: THE FINAL BOSS",
        "BITCOIN DOESN'T CARE",
        "STACK SATS OR DIE TRYING"
    ],
    // Fiat/Enemy Death Taunts
    FIAT_DEATH: [
        "INFLATION CANCELLED", "FIAT DESTROYED", "MONEY PRINTER JAMMED",
        "CENTRAL BANK REKT", "FED IS DED", "EURO ZEROED", "YEN YEETED",
        "POUND POUNDED", "DOLLAR DEMOLISHED", "CURRENCY CRUSHED",
        "DEBASEMENT DENIED", "PRINTER GO BRRR... ERROR", "FIAT FATAL ERROR",
        "PURCHASING POWER PRESERVED", "HARD MONEY WINS"
    ],
    // Boss Taunts
    BOSS: [
        "INFLATION BOSS FIGHT", "THE FED AWAKENS", "MONEY PRINTER: FINAL FORM",
        "CENTRAL BANK SHOWDOWN", "RESERVE STATUS: THREATENED",
        "QUANTITATIVE EASING: MAXIMUM", "DEBT CEILING: BREACHED",
        "PONZI SCHEME DETECTED", "FIAT ENDGAME", "THE GREAT RESET"
    ],
    // Powell / Fed Memes (during boss fight)
    POWELL: [
        "POWELL: INFLATION IS TRANSITORY",
        "POWELL: WE HAVE THE TOOLS",
        "POWELL: SOFT LANDING INCOMING",
        "FED: TRUST US BRO",
        "POWELL: NOT PRINTING, JUST QE",
        "60% OF THE TIME, IT WORKS EVERY TIME",
        "POWELL: HOLD MY BEER",
        "FED: THIS IS FINE 🔥",
        "POWELL: RATES STAY LOW FOREVER",
        "FED: WE DIDN'T SEE IT COMING",
        "POWELL: BITCOIN? NEVER HEARD OF IT",
        "FED: EVERYTHING IS UNDER CONTROL",
        "POWELL: WHAT INFLATION?",
        "BRRRRRRRRRRRRRR",
        "POWELL: JUST 2% GUYS, TRUST ME",
        "FED: TEMPORARY MEANS 10 YEARS",
        "JPOW ACTIVATED PRINTER MODE",
        "POWELL: RECESSION? WHAT RECESSION?",
        "FED: MORE DEBT = MORE GROWTH",
        "POWELL: I AM THE ECONOMY",
        "INFINITE MONEY GLITCH ENGAGED",
        "CTRL+P INTENSIFIES",
        "POWELL: MY PRINTER GOES BRRR",
        "FED: AUDIT US? LOL NO",
        "POWELL'S FINAL FORM",
        "THE FED WILL REMEMBER THIS"
    ],
    // Streak Multiplier
    STREAK: [
        "NICE ENTRY", "WHALE ALERT", "LIQUIDATION SPREE", "MARKET MAKER",
        "ABSOLUTE UNIT", "GOD MODE", "SATOSHI REBORN", "UNSTOPPABLE",
        "ON FIRE", "MEGA KILL", "ULTRA KILL", "LEGENDARY", "GODLIKE"
    ]
};

// Weapon types (mutually exclusive - picking one replaces previous)
// Rebalanced: Base twin-shot is strong, power-ups are utility (spread/penetration) not DPS multipliers
window.Game.WEAPONS = {
    NORMAL: { color: '#F7931A', rate: 0.18, bullets: 2 },                           // Twin shot base
    WIDE:   { color: '#9b59b6', rate: 0.40, bullets: 3, spread: 0.18, icon: '🔱' },
    NARROW: { color: '#3498db', rate: 0.38, bullets: 3, spread: 0.08, icon: '🎯' },
    FIRE:   { color: '#e74c3c', rate: 0.44, bullets: 3, spread: 0, icon: '🔥' },    // Penetration utility
    SPREAD: { color: '#2ecc71', rate: 0.55, bullets: 5, spread: 0.35, icon: '🌟' }, // 5-shot wide fan
    HOMING: { color: '#e67e22', rate: 0.50, bullets: 2, icon: '🎯' },               // Tracking missiles
    LASER:  { color: '#00ffff', rate: 0.06, bullets: 1, icon: '⚡' }                 // Rapid beam (penetrating)
};

// Ship power-ups (mutually exclusive - picking one replaces previous)
// Nerfed: smaller bonuses
window.Game.SHIP_POWERUPS = {
    SPEED:  { speedMult: 1.25, icon: '⚡', color: '#f1c40f' },
    RAPID:  { rateMult: 0.80, icon: '🚀', color: '#3498db' },
    SHIELD: { instant: true, icon: '🛡️', color: '#2ecc71' }
};

// 10 Fiat currencies with unique stats and visual styles
// shape: 'coin' | 'bill' | 'card' | 'bar' determines draw style
window.Game.FIAT_TYPES = [
    // Tier 1 - Weak (rows 4-5)
    { s: '¥', name: 'YEN', c: '#e74c3c', val: 20, hp: 0.8, fireMin: 3.5, fireMax: 5.0, aimSpread: 0.35, pattern: 'SINGLE', shape: 'coin' },
    { s: '₽', name: 'RUBLE', c: '#95a5a6', val: 25, hp: 0.8, fireMin: 3.2, fireMax: 4.5, aimSpread: 0.30, pattern: 'SINGLE', shape: 'bill' },
    { s: '₹', name: 'RUPEE', c: '#f39c12', val: 25, hp: 0.9, fireMin: 3.0, fireMax: 4.2, aimSpread: 0.28, pattern: 'SINGLE', shape: 'coin' },

    // Tier 2 - Medium (rows 2-3)
    { s: '€', name: 'EURO', c: '#3498db', val: 40, hp: 1.0, fireMin: 2.6, fireMax: 3.8, aimSpread: 0.22, pattern: 'BURST', shape: 'bill' },
    { s: '£', name: 'POUND', c: '#9b59b6', val: 45, hp: 1.0, fireMin: 2.4, fireMax: 3.5, aimSpread: 0.20, pattern: 'SINGLE', shape: 'coin' },
    { s: '₣', name: 'FRANC', c: '#1abc9c', val: 50, hp: 1.1, fireMin: 2.2, fireMax: 3.2, aimSpread: 0.18, pattern: 'DOUBLE', shape: 'bar' },
    { s: '₺', name: 'LIRA', c: '#e67e22', val: 55, hp: 1.2, fireMin: 2.0, fireMax: 3.0, aimSpread: 0.16, pattern: 'BURST', shape: 'bill' },

    // Tier 3 - Strong (row 1)
    { s: '$', name: 'DOLLAR', c: '#2ecc71', val: 80, hp: 1.3, fireMin: 1.8, fireMax: 2.8, aimSpread: 0.14, pattern: 'DOUBLE', shape: 'bill' },
    { s: '元', name: 'YUAN', c: '#c0392b', val: 90, hp: 1.4, fireMin: 1.6, fireMax: 2.5, aimSpread: 0.12, pattern: 'BURST', shape: 'bar' },
    { s: 'Ⓒ', name: 'CBDC', c: '#8e44ad', val: 100, hp: 1.5, fireMin: 1.4, fireMax: 2.2, aimSpread: 0.10, pattern: 'DOUBLE', shape: 'card' }
];

// Boss minion type - spawned during boss fights
window.Game.MINION_TYPE = {
    s: '💵', name: 'MINION', c: '#e74c3c', val: 15, hp: 0.5,
    fireMin: 2.0, fireMax: 3.0, aimSpread: 0.25, pattern: 'SINGLE', shape: 'coin',
    isMinion: true
};

window.Game.SHIPS = {
    BTC: { speed: 420, hp: 3, fireRate: 0.26, baseDamage: 14, color: '#F7931A', hitboxSize: 30, coreHitboxSize: 6 },
    ETH: { speed: 320, hp: 4, fireRate: 0.57, baseDamage: 22, color: '#8c7ae6', hitboxSize: 38, coreHitboxSize: 8 },
    SOL: { speed: 560, hp: 2, fireRate: 0.20, baseDamage: 10, color: '#00d2d3', hitboxSize: 18, coreHitboxSize: 4 }
};

// High-contrast projectile color palette
window.Game.PROJECTILE_COLORS = {
    PINK: '#ff69b4',
    CYAN: '#00ffff',
    MAGENTA: '#ff00ff',
    YELLOW: '#ffff00',
    WHITE: '#ffffff',
    ORANGE: '#ff8c00'
};
// Alias for backwards compatibility
window.Game.BULLET_HELL_COLORS = window.Game.PROJECTILE_COLORS;

window.Game.ASSETS = {};

window.Game.M_CHARS = "01BTCETH$$£€¥HODL";

// Boss Definitions - Rotation: FED → BCE → BOJ → repeat
// Uniform difficulty: balanced HP for ~5-8 second fights
window.Game.BOSSES = {
    FEDERAL_RESERVE: {
        name: 'THE FED',
        fullName: 'FEDERAL RESERVE',
        color: '#2ecc71',           // Dollar green
        accentColor: '#27ae60',
        darkColor: '#1a5a3a',
        symbol: '$',
        country: '🇺🇸',
        personality: 'arrogant',
        baseHp: 2000,
        hpPerLevel: 150,
        hpPerCycle: 250
    },
    BCE: {
        name: 'BCE',
        fullName: 'BANCA CENTRALE EUROPEA',
        color: '#003399',           // EU blue
        accentColor: '#ffcc00',     // EU gold stars
        darkColor: '#001a4d',
        symbol: '€',
        country: '🇪🇺',
        personality: 'bureaucratic',
        baseHp: 2000,
        hpPerLevel: 150,
        hpPerCycle: 250
    },
    BOJ: {
        name: 'BOJ',
        fullName: 'BANK OF JAPAN',
        color: '#bc002d',           // Japan red
        accentColor: '#ffffff',     // White
        darkColor: '#6b0019',
        symbol: '¥',
        country: '🇯🇵',
        personality: 'zen',
        baseHp: 2000,
        hpPerLevel: 150,
        hpPerCycle: 250
    }
};

// Boss rotation order
window.Game.BOSS_ROTATION = ['FEDERAL_RESERVE', 'BCE', 'BOJ'];

// Boss-specific memes
window.Game.MEMES.BCE = [
    "LAGARDE: WHATEVER IT TAKES",
    "BCE: FRAGMENTATION RISK",
    "LAGARDE: INFLATION? TRANSITORIA",
    "BCE: NEGATIVE RATES FOREVER",
    "LAGARDE: WE ARE NOT HERE TO CLOSE SPREADS",
    "BCE: TRANSMISSION MECHANISM BROKEN",
    "LAGARDE: HOLD MY WINE",
    "BCE: EURO IS IRREVERSIBLE... LOL",
    "LAGARDE: CRYPTO IS WORTH NOTHING",
    "BCE: DIGITAL EURO INCOMING",
    "DRAGHI GHOST: DO YOU MISS ME?",
    "BCE: EMERGENCY MEETING CALLED",
    "LAGARDE: WE HAVE NO TOOLS LEFT",
    "BCE: BRRR BUT IN EUROPEAN"
];

window.Game.MEMES.BOJ = [
    "KURODA: YIELD CURVE CONTROLLED",
    "BOJ: YEN INTERVENTION ACTIVATED",
    "KURODA: INFLATION? NANI?",
    "BOJ: UNLIMITED QE FOREVER",
    "KURODA: PRINTER? WHICH PRINTER?",
    "BOJ: NEGATIVE RATES? HAI!",
    "UEDA: WE WILL NORMALIZE... SOMEDAY",
    "BOJ: BUYING ALL THE BONDS",
    "KURODA: THIS IS FINE 🔥",
    "BOJ: ¥150? ¥160? WHO'S COUNTING?",
    "UEDA: WE SEE NOTHING",
    "BOJ: ABENOMICS NEVER DIES",
    "KURODA: ZEN AND THE ART OF MONEY PRINTING",
    "BOJ: INTERVENTION SURPRISE!"
];

