// Game Constants & Configuration (Namespace Pattern)
window.Game = window.Game || {};

window.Game.VERSION = "v2.1.0 Refactored (No-Server)";

window.Game.TEXTS = {
    EN: {
        SCORE: "SCORE", LEVEL: "LEVEL", LIVES: "LIVES", NORMAL: "NORMAL",
        INSERT_COIN: "INSERT COIN",
        START_HINT: "📱 TAP TO START • TOUCH SIDES MOVES • ICON SHIELDS",
        MOBILE_HINT: "📱 TOUCH SIDES to Move • ICON for Shield",
        PRO_TIP: "💎 PRO TIP: STOP MOVING TO HODL (2x SCORE)",
        WAVE1: "WAVE 1: ACCUMULATION", WAVE2: "WAVE 2: BULL RUN", WAVE3: "WAVE 3: VOLATILITY",
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
        BOSS_ENTER: "RISERVE AUREE", BOSS_DEATH: "RISERVE LIQUIDATE",
        GAME_OVER: "REKT", RESTART: "COMPRA IL DIP",
        COMBO_LOST: "COMBO PERSA", COMBO_BREAK: "COMBO ROTTA",
        UPGRADE: "POTENZIAMENTO LV", MAX_POWER: "MASSIMA POTENZA", HODL: "HODL!",
        SETTINGS: "IMPOSTAZIONI", CLOSE: "CHIUDI", LANG: "LINGUA",
        PAUSED: "PAUSA", RESUME: "RIPRENDI", EXIT_TITLE: "ESCI AL TITOLO"
    }
};

window.Game.MEMES = {
    LOW: ["HODL", "BUY DIP", "SHITCOIN", "PAPER HANDS"],
    HIGH: ["TO THE MOON 🚀", "LAMBO", "WHALE 🐋", "DIAMOND HANDS 💎"],
    BOSS: ["INFLATION", "PRINTING 🖨️", "PONZI SCHEME"]
};

window.Game.WEAPONS = {
    NORMAL: { color: '#F7931A', rate: 0.18 },
    RAPID: { color: '#3498db', rate: 0.08, icon: '🚀' },
    SPREAD: { color: '#9b59b6', rate: 0.25, icon: '🔱' },
    LASER: { color: '#e74c3c', rate: 0.35, icon: '⚡' }
};

window.Game.FIAT_TYPES = [
    { s: '¥', c: '#bdc3c7', val: 30, hp: 2 }, // BALANCE FIX: 2 Hits
    { s: '€', c: '#3498db', val: 50, hp: 4 }, // BALANCE FIX: 4 Hits
    { s: '£', c: '#9b59b6', val: 50, hp: 2 }, // BALANCE FIX: 2 Hits
    { s: '$', c: '#2ecc71', val: 100, hp: 4 }, // BALANCE FIX: 4 Hits
    { s: '₿', c: '#F7931A', val: 500, hp: 12 }, // BALANCE FIX: Tank (12 Hits)
    { s: 'Ξ', c: '#8c7ae6', val: 500, hp: 12 }  // BALANCE FIX: Tank (12 Hits)
];

window.Game.SHIPS = {
    BTC: { speed: 400, hp: 3, fireRate: 0.18, color: '#F7931A', hitboxSize: 30 },
    ETH: { speed: 300, hp: 4, fireRate: 0.45, color: '#8c7ae6', hitboxSize: 40 }, // Nerfed FireRate (0.30 -> 0.45)
    SOL: { speed: 550, hp: 2, fireRate: 0.12, color: '#00d2d3', hitboxSize: 15 }  // Buffed Hitbox (Tiny)
};

window.Game.DROPS = {
    CHANCE: 0.10, // Reduced from 0.15 (15% -> 10%)
    TABLE: [
        { type: 'RAPID', weight: 0.4 },
        { type: 'SPREAD', weight: 0.7 },
        { type: 'SHIELD', weight: 1.0 }
    ]
};

window.Game.WAVES = {
    SPACING: 60,
    PATTERNS: {
        1: 'RECT',
        2: 'V_SHAPE',
        3: 'SINE_WAVE',
        4: 'COLUMNS',
        PANIC: 'PANIC'
    }
};

window.Game.DIFFICULTY = {
    FIRE_RATE_BASE: 2.0, // AI FIX: Relaxed
    FIRE_RATE_VAR: 4.0,  // AI FIX: Wider window
    PROJ_SPEED: 500,     // DIFFICULTY UP (Faster bullets)
    GRID_SPEED_START: 40, // DIFFICULTY UP (Faster start)
    BEAR_MULT: 1.5,
    HIT_R_OFFSET: 10
};

window.Game.ASSETS = {
    PLAYER_SHIP: 'assets/ship_bitcoin.png',
    ENEMY_DOLLAR: 'assets/enemy_dollar.png',
    ENEMY_EURO: 'assets/enemy_euro.png',
    ENEMY_POUND: 'assets/enemy_pound.png',
    ENEMY_YEN: 'assets/enemy_yen.png',
    BOSS_BANK: 'assets/boss_bank.png'
};

window.Game.M_CHARS = "01BTCETH$$£€¥HODL";
