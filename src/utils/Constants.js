// Game Constants & Configuration (Namespace Pattern)
window.Game = window.Game || {};

// ⚠️ VERSION SYNC: Must also update sw.js SW_VERSION when changing!
window.Game.VERSION = "v3.0.6 FIAT vs CRYPTO";

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
        PAUSED: "PAUSED", RESUME: "RESUME", EXIT_TITLE: "EXIT TO TITLE",
        // Manual
        MANUAL: "MANUAL", MANUAL_TITLE: "PLAYER MANUAL",
        TAB_WELCOME: "WELCOME", TAB_CONTROLS: "CONTROLS", TAB_POWERUPS: "POWER-UPS",
        TAB_ENEMIES: "ENEMIES", TAB_BOSSES: "BOSSES", TAB_TIPS: "PRO TIPS",
        // Welcome tab
        WELCOME_TITLE: "Welcome, Crypto Warrior!",
        WELCOME_INTRO: "FIAT money is attacking! Centralized currencies have declared war on financial freedom. Your mission: pilot your crypto ship and defend the decentralized future.",
        WELCOME_LOOP_TITLE: "The Game Loop",
        WELCOME_LOOP_1: "Destroy enemies - Waves of fiat currencies descend",
        WELCOME_LOOP_2: "Collect power-ups - Upgrade weapons and ship",
        WELCOME_LOOP_3: "Survive 5 waves - Each level has 5 waves",
        WELCOME_LOOP_4: "Defeat the Boss - The Central Bank awaits!",
        WELCOME_LOOP_5: "New cycle - Difficulty increases, better rewards",
        WELCOME_WIN: "Achieve the highest score possible! Each completed cycle increases the multiplier.",
        WELCOME_LOSE: "One hit = one life lost! You have 3 lives total. When hit, all bullets explode and time slows down. BUY THE DIP and try again!",
        WELCOME_BEAR: "Want a challenge? Activate Bear Market for increased difficulty and double scores!",
        // Controls tab
        CONTROLS_PC: "Keyboard (PC)",
        CONTROLS_MOBILE: "Touch (Mobile)",
        CTRL_MOVE: "Move", CTRL_FIRE: "Fire", CTRL_SHIELD: "Shield", CTRL_PAUSE: "Pause",
        CTRL_ARROWS: "A/D or Arrow Keys", CTRL_SPACE: "Space or Up Arrow", CTRL_DOWN: "S or Down Arrow", CTRL_ESC: "ESC",
        CTRL_TAP_SIDES: "Tap screen sides or joystick", CTRL_AUTO: "Automatic while touching", CTRL_TAP_ICON: "Tap shield icon",
        // Power-ups tab - Weapon Evolution System v3.0
        POWERUPS_UPGRADE: "Weapon Upgrade",
        POWERUPS_UPGRADE_NOTE: "Permanent! Evolves shots: 1→2→3 bullets. Death: -1 level",
        POWERUPS_MODIFIERS: "Modifiers",
        POWERUPS_MODIFIERS_NOTE: "Stackable + temporary (12s). Same pickup = +1 level & refresh timer",
        POWERUPS_SPECIALS: "Specials",
        POWERUPS_SPECIALS_NOTE: "Exclusive + temporary (12s). New special replaces current",
        // Upgrade
        PU_UPGRADE: "⬆️ UPGRADE - Permanent shot level +1",
        // Modifiers
        PU_RATE: "⚡ RATE - Fire rate -15%/-30%/-45%",
        PU_POWER: "💥 POWER - Damage +25%/+50%/+75%",
        PU_SPREAD: "🔱 SPREAD - Shot angle +12°/+24°",
        // Specials
        PU_HOMING: "🎯 HOMING - Bullets track enemies",
        PU_PIERCE: "🔥 PIERCE - Bullets penetrate",
        PU_LASER: "⚡ LASER - Continuous beam",
        PU_MISSILE: "🚀 MISSILE - AoE explosions",
        PU_SHIELD: "🛡️ SHIELD - Instant activation",
        PU_SPEED: "💨 SPEED - Movement +50%",
        // Death penalty
        POWERUPS_DEATH: "On Death: -1 level per category (min 0), specials lost",
        // Enemies tab
        ENEMIES_WEAK: "Weak Tier",
        ENEMIES_MEDIUM: "Medium Tier",
        ENEMIES_STRONG: "Strong Tier (Dangerous!)",
        ENEMY_YEN: "Yen", ENEMY_RUBLE: "Ruble", ENEMY_RUPEE: "Rupee",
        ENEMY_EURO: "Euro", ENEMY_POUND: "Pound", ENEMY_FRANC: "Franc", ENEMY_LIRA: "Turkish Lira",
        ENEMY_DOLLAR: "Dollar", ENEMY_YUAN: "Yuan", ENEMY_CBDC: "CBDC",
        SHAPE_COIN: "Coin", SHAPE_BILL: "Bill", SHAPE_BAR: "Gold Bar", SHAPE_CARD: "Credit Card",
        // Bosses tab
        BOSSES_INTRO: "Every 5 levels you face a boss. Rotation: FED > ECB > BOJ",
        BOSS_FED: "THE FED", BOSS_BCE: "ECB", BOSS_BOJ: "BOJ",
        BOSS_FED_STYLE: "Aggressive, rapid attacks",
        BOSS_BCE_STYLE: "Bureaucratic, bullet walls",
        BOSS_BOJ_STYLE: "Zen, lethal precision",
        BOSS_PHASES: "3 Phases per Boss:",
        BOSS_PHASE1: "Phase 1 (100%-66% HP): Slow, simple patterns",
        BOSS_PHASE2: "Phase 2 (66%-33% HP): Fast, complex patterns",
        BOSS_PHASE3: "Phase 3 (33%-0% HP): Erratic, spawns minions!",
        // Tips tab
        TIP_HODL_TITLE: "HODL MODE - The Champion's Secret",
        TIP_HODL_1: "Stop moving and your ship enters HODL mode:",
        TIP_HODL_2: "2x damage against all enemies",
        TIP_HODL_3: "Golden aura visible around ship",
        TIP_HODL_4: "Use HODL when enemies are lined up above you!",
        TIP_GRAZE_TITLE: "GRAZE - Dance with Danger",
        TIP_GRAZE_1: "Pass close to enemy bullets without getting hit:",
        TIP_GRAZE_2: "Build up the Graze Meter (bottom bar)",
        TIP_GRAZE_3: "Higher meter = higher score multiplier",
        TIP_GRAZE_4: "Full meter = up to 2.5x points!",
        TIP_SHIELD_TITLE: "Tactical Shield (CRITICAL!)",
        TIP_SHIELD_1: "One hit = one life! Shield has 10s cooldown. Use it to:",
        TIP_SHIELD_2: "Block a fatal hit (your only defense!)",
        TIP_SHIELD_3: "Survive Boss Phase 3 attacks",
        TIP_SHIELD_4: "Emergency escape when grazing goes wrong",
        TIP_BOSS_TITLE: "Boss Power-Ups",
        TIP_BOSS_1: "During boss fights, every 25 hits drops a power-up. Keep shooting!",
        // UI Elements (intro/HUD)
        ACCOUNT_BALANCE: "ACCOUNT BALANCE",
        KILLS: "KILLS",
        GRAZE: "GRAZE",
        CHOOSE_SHIP: "CHOOSE YOUR SHIP",
        TAP_START: "TAP TO START",
        HIGH_SCORE: "HIGH SCORE",
        ARCADE: "ARCADE",
        CAMPAIGN: "CAMPAIGN",
        LAUNCH: "LAUNCH",
        HORDE_2_INCOMING: "HORDE 2!",
        GET_READY: "GET READY"
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
        PAUSED: "PAUSA", RESUME: "RIPRENDI", EXIT_TITLE: "ESCI AL TITOLO",
        // Manual
        MANUAL: "MANUALE", MANUAL_TITLE: "MANUALE GIOCATORE",
        TAB_WELCOME: "BENVENUTO", TAB_CONTROLS: "CONTROLLI", TAB_POWERUPS: "POWER-UP",
        TAB_ENEMIES: "NEMICI", TAB_BOSSES: "BOSS", TAB_TIPS: "CONSIGLI",
        // Welcome tab
        WELCOME_TITLE: "Benvenuto, Guerriero Crypto!",
        WELCOME_INTRO: "Il denaro FIAT sta attaccando! Le valute centralizzate hanno dichiarato guerra alla libertà finanziaria. La tua missione: pilota la tua nave crypto e difendi il futuro decentralizzato.",
        WELCOME_LOOP_TITLE: "Il Ciclo di Gioco",
        WELCOME_LOOP_1: "Distruggi i nemici - Ondate di valute fiat scendono",
        WELCOME_LOOP_2: "Raccogli i power-up - Potenzia armi e nave",
        WELCOME_LOOP_3: "Sopravvivi a 5 ondate - Ogni livello ha 5 ondate",
        WELCOME_LOOP_4: "Sconfiggi il Boss - La Banca Centrale ti aspetta!",
        WELCOME_LOOP_5: "Nuovo ciclo - Difficoltà aumenta, ricompense migliori",
        WELCOME_WIN: "Ottieni il punteggio più alto possibile! Ogni ciclo completato aumenta il moltiplicatore.",
        WELCOME_LOSE: "Un colpo = una vita persa! Hai 3 vite totali. Quando vieni colpito, tutti i proiettili esplodono e il tempo rallenta. COMPRA IL DIP e riprova!",
        WELCOME_BEAR: "Vuoi una sfida? Attiva Bear Market per difficoltà aumentata e punteggi doppi!",
        // Controls tab
        CONTROLS_PC: "Tastiera (PC)",
        CONTROLS_MOBILE: "Touch (Mobile)",
        CTRL_MOVE: "Muovi", CTRL_FIRE: "Spara", CTRL_SHIELD: "Scudo", CTRL_PAUSE: "Pausa",
        CTRL_ARROWS: "A/D o Frecce", CTRL_SPACE: "Spazio o Freccia Su", CTRL_DOWN: "S o Freccia Giù", CTRL_ESC: "ESC",
        CTRL_TAP_SIDES: "Tocca i lati o joystick", CTRL_AUTO: "Automatico mentre tocchi", CTRL_TAP_ICON: "Tocca icona scudo",
        // Power-ups tab - Weapon Evolution System v3.0
        POWERUPS_UPGRADE: "Potenziamento Arma",
        POWERUPS_UPGRADE_NOTE: "Permanente! Evolve colpi: 1→2→3 proiettili. Morte: -1 livello",
        POWERUPS_MODIFIERS: "Modificatori",
        POWERUPS_MODIFIERS_NOTE: "Cumulabili + temporanei (12s). Stesso pickup = +1 livello & refresh timer",
        POWERUPS_SPECIALS: "Speciali",
        POWERUPS_SPECIALS_NOTE: "Esclusivi + temporanei (12s). Nuovo speciale sostituisce attuale",
        // Upgrade
        PU_UPGRADE: "⬆️ UPGRADE - Livello colpi permanente +1",
        // Modifiers
        PU_RATE: "⚡ RATE - Cadenza -15%/-30%/-45%",
        PU_POWER: "💥 POWER - Danno +25%/+50%/+75%",
        PU_SPREAD: "🔱 SPREAD - Angolo colpi +12°/+24°",
        // Specials
        PU_HOMING: "🎯 HOMING - Proiettili auto-guidati",
        PU_PIERCE: "🔥 PIERCE - Proiettili penetranti",
        PU_LASER: "⚡ LASER - Raggio continuo",
        PU_MISSILE: "🚀 MISSILE - Esplosioni ad area",
        PU_SHIELD: "🛡️ SHIELD - Attivazione istantanea",
        PU_SPEED: "💨 SPEED - Movimento +50%",
        // Death penalty
        POWERUPS_DEATH: "Alla Morte: -1 livello per categoria (min 0), speciali persi",
        // Enemies tab
        ENEMIES_WEAK: "Tier Debole",
        ENEMIES_MEDIUM: "Tier Medio",
        ENEMIES_STRONG: "Tier Forte (Pericoloso!)",
        ENEMY_YEN: "Yen", ENEMY_RUBLE: "Rublo", ENEMY_RUPEE: "Rupia",
        ENEMY_EURO: "Euro", ENEMY_POUND: "Sterlina", ENEMY_FRANC: "Franco", ENEMY_LIRA: "Lira Turca",
        ENEMY_DOLLAR: "Dollaro", ENEMY_YUAN: "Yuan", ENEMY_CBDC: "CBDC",
        SHAPE_COIN: "Moneta", SHAPE_BILL: "Banconota", SHAPE_BAR: "Lingotto", SHAPE_CARD: "Carta",
        // Bosses tab
        BOSSES_INTRO: "Ogni 5 livelli affronti un boss. Rotazione: FED > BCE > BOJ",
        BOSS_FED: "LA FED", BOSS_BCE: "BCE", BOSS_BOJ: "BOJ",
        BOSS_FED_STYLE: "Aggressivo, attacchi rapidi",
        BOSS_BCE_STYLE: "Burocratico, muri di proiettili",
        BOSS_BOJ_STYLE: "Zen, precisione letale",
        BOSS_PHASES: "3 Fasi per Boss:",
        BOSS_PHASE1: "Fase 1 (100%-66% HP): Lento, pattern semplici",
        BOSS_PHASE2: "Fase 2 (66%-33% HP): Veloce, pattern complessi",
        BOSS_PHASE3: "Fase 3 (33%-0% HP): Erratico, genera minion!",
        // Tips tab
        TIP_HODL_TITLE: "HODL MODE - Il Segreto dei Campioni",
        TIP_HODL_1: "Fermati e la nave entra in modalità HODL:",
        TIP_HODL_2: "Danno 2x contro tutti i nemici",
        TIP_HODL_3: "Aura dorata visibile intorno alla nave",
        TIP_HODL_4: "Usa HODL quando i nemici sono allineati sopra di te!",
        TIP_GRAZE_TITLE: "GRAZE - Danza col Pericolo",
        TIP_GRAZE_1: "Passa vicino ai proiettili nemici senza farti colpire:",
        TIP_GRAZE_2: "Riempi il Graze Meter (barra in basso)",
        TIP_GRAZE_3: "Meter più alto = moltiplicatore punti più alto",
        TIP_GRAZE_4: "Meter pieno = fino a 2.5x punti!",
        TIP_SHIELD_TITLE: "Scudo Tattico (CRITICO!)",
        TIP_SHIELD_1: "Un colpo = una vita! Scudo ha cooldown 10s. Usalo per:",
        TIP_SHIELD_2: "Bloccare un colpo fatale (unica difesa!)",
        TIP_SHIELD_3: "Sopravvivere agli attacchi Boss Fase 3",
        TIP_SHIELD_4: "Fuga d'emergenza quando il grazing va male",
        TIP_BOSS_TITLE: "Power-Up Boss",
        TIP_BOSS_1: "Durante i boss fight, ogni 25 colpi rilascia un power-up. Continua a sparare!",
        // UI Elements (intro/HUD)
        ACCOUNT_BALANCE: "SALDO CONTO",
        KILLS: "UCCISIONI",
        GRAZE: "GRAZE",
        CHOOSE_SHIP: "SCEGLI LA NAVE",
        TAP_START: "TOCCA PER INIZIARE",
        HIGH_SCORE: "RECORD",
        ARCADE: "ARCADE",
        CAMPAIGN: "CAMPAGNA",
        LAUNCH: "LANCIA",
        HORDE_2_INCOMING: "ORDA 2!",
        GET_READY: "PREPARATI"
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

// === WEAPON EVOLUTION SYSTEM v3.0 ===
// New progressive power-up system:
// - UPGRADE: permanent shot level (1→2→3), death = -1 level
// - Modifiers: stackable temp buffs (RATE/POWER/SPREAD), death = -1 level
// - Specials: exclusive temp effects (HOMING/PIERCE/LASER/MISSILE/SHIELD/SPEED), death = lost

window.Game.POWERUP_TYPES = {
    // Upgrade (permanent shot level)
    UPGRADE: { icon: '⬆️', color: '#FFD700', category: 'upgrade', name: 'UPGRADE', symbol: '↑' },

    // Modifiers (stackable, temporary with timer)
    RATE:   { icon: '⚡', color: '#00FFFF', category: 'modifier', name: 'RATE', symbol: 'R' },
    POWER:  { icon: '💥', color: '#FF4444', category: 'modifier', name: 'POWER', symbol: 'P' },
    SPREAD: { icon: '🔱', color: '#9B59B6', category: 'modifier', name: 'SPREAD', symbol: 'S' },

    // Specials (exclusive, temporary - replace each other)
    HOMING:  { icon: '🎯', color: '#E67E22', category: 'special', name: 'HOMING', symbol: 'H' },
    PIERCE:  { icon: '🔥', color: '#E74C3C', category: 'special', name: 'PIERCE', symbol: 'X' },
    LASER:   { icon: '⚡', color: '#00FFFF', category: 'special', name: 'LASER', symbol: 'L' },
    MISSILE: { icon: '🚀', color: '#3498DB', category: 'special', name: 'MISSILE', symbol: 'M' },
    SHIELD:  { icon: '🛡️', color: '#2ECC71', category: 'special', name: 'SHIELD', symbol: '🛡' },
    SPEED:   { icon: '💨', color: '#F1C40F', category: 'special', name: 'SPEED', symbol: '>' }
};

// Legacy weapon types (kept for backward compatibility during transition)
// TODO: Remove after full migration to WEAPON_EVOLUTION system
window.Game.WEAPONS = {
    NORMAL: { color: '#F7931A', rate: 0.18, bullets: 2 },                           // Twin shot base
    WIDE:   { color: '#9b59b6', rate: 0.40, bullets: 3, spread: 0.18, icon: '🔱' },
    NARROW: { color: '#3498db', rate: 0.38, bullets: 3, spread: 0.08, icon: '🎯' },
    FIRE:   { color: '#e74c3c', rate: 0.44, bullets: 3, spread: 0, icon: '🔥' },    // Penetration utility
    SPREAD: { color: '#2ecc71', rate: 0.55, bullets: 5, spread: 0.35, icon: '🌟' }, // 5-shot wide fan
    HOMING: { color: '#e67e22', rate: 0.50, bullets: 2, icon: '🎯' },               // Tracking missiles
    LASER:  { color: '#00ffff', rate: 0.06, bullets: 1, icon: '⚡' }                 // Rapid beam (penetrating)
};

// Legacy ship power-ups (kept for backward compatibility during transition)
// TODO: Remove after full migration to WEAPON_EVOLUTION system
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

// Boss signature memes - displayed during entrance with typewriter effect
window.Game.BOSS_SIGNATURE_MEMES = {
    FEDERAL_RESERVE: "MONEY PRINTER GO BRRRRR",
    BCE: "WHATEVER IT TAKES... AGAIN",
    BOJ: "YIELD CURVE: CONTROLLED"
};

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

