// Game Constants & Configuration (Namespace Pattern)
window.Game = window.Game || {};

window.Game.VERSION = "v2.1.0 Refactored (No-Server)";

window.Game.TEXTS = {
    EN: {
        SCORE: "SCORE", LEVEL: "LEVEL", NORMAL: "NORMAL",
        INSERT_COIN: "INSERT COIN",
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
        PAUSED: "PAUSED", RESUME: "RESUME", ABORT: "ABORT MISSION"
    },
    IT: {
        SCORE: "PUNTI", LEVEL: "LIVELLO", NORMAL: "NORMALE",
        INSERT_COIN: "INSERISCI GETTONE",
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
        PAUSED: "PAUSA", RESUME: "RIPRENDI", ABORT: "ABBANDONA"
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
    { s: '¥', c: '#bdc3c7', val: 30, hp: 1 },
    { s: '€', c: '#3498db', val: 50, hp: 1 },
    { s: '£', c: '#9b59b6', val: 50, hp: 1 },
    { s: '$', c: '#2ecc71', val: 100, hp: 1 }
];

window.Game.SHIPS = {
    BTC: { speed: 400, hp: 3, fireRate: 0.18, color: '#F7931A' },
    ETH: { speed: 300, hp: 4, fireRate: 0.30, color: '#8c7ae6' },
    SOL: { speed: 550, hp: 2, fireRate: 0.12, color: '#00d2d3' }
};

window.Game.M_CHARS = "01BTCETH$$£€¥HODL";
