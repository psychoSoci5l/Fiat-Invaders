// Game Constants & Configuration (Namespace Pattern)
window.Game = window.Game || {};

// ⚠️ VERSION SYNC: Must also update sw.js SW_VERSION when changing!
window.Game.VERSION = "v5.10.1 FIAT vs CRYPTO";

window.Game.TEXTS = {
    EN: {
        SCORE: "SCORE", LEVEL: "LEVEL", LIVES: "LIVES", NORMAL: "NORMAL",
        INSERT_COIN: "INSERT COIN",
        START_HINT: "📱 TAP TO START • TOUCH SIDES MOVES • ICON SHIELDS",
        MOBILE_HINT: "📱 TOUCH SIDES to Move • ICON for Shield",
        PRO_TIP: "💎 PRO TIP: KILL UP CLOSE TO FILL THE DIP METER",
        WAVE1: "WAVE 1: ACCUMULATION", WAVE2: "WAVE 2: BULL RUN", WAVE3: "WAVE 3: VOLATILITY",
        WAVE4: "WAVE 4: CORRECTION", WAVE5: "WAVE 5: CLIMAX",
        CYCLE: "CYCLE", WAVE_OF: "WAVE", BEGINS: "BEGINS",
        WAVE_FLAVOR_1: "Accumulation", WAVE_FLAVOR_2: "Bull Run", WAVE_FLAVOR_3: "Volatility",
        WAVE_FLAVOR_4: "Correction", WAVE_FLAVOR_5: "Climax",
        BOSS_ENTER: "GOLD RESERVES", BOSS_DEATH: "RESERVES LIQUIDATED",
        GAME_OVER: "REKT", RESTART: "BUY THE DIP",
        COMBO_LOST: "COMBO LOST", COMBO_BREAK: "COMBO BREAK",
        BULLET_BONUS: "BULLET BONUS", GRAZE_BONUS: "GRAZE BONUS!",
        HYPER_READY: "HYPER READY!", HYPER_FAILED: "HYPER FAILED!",
        SURVIVE_CRASH: "SURVIVE THE CRASH",
        APPEARS: "APPEARS!", REVENGE: "REVENGE!", DESTROYED: "DESTROYED!", DEFEATED: "DEFEATED!",
        GODCHAIN_ON: "GODCHAIN MODE", GODCHAIN_OFF: "GODCHAIN LOST",
        TIME_LEFT: "s LEFT!", PROFIT: "PROFIT!",
        WEAPON_UNLOCK: "NEW WEAPON UNLOCKED:", GRAZE_MASTER: "GRAZE MASTER",
        LAST_FIAT: "LAST FIAT!", RESPAWN: "RESPAWN!",
        UPGRADE: "UPGRADE LVL", MAX_POWER: "MAX POWER",
        SETTINGS: "SETTINGS", CLOSE: "CLOSE", LANG: "LANGUAGE", PRIVACY: "Privacy Policy",
        PAUSED: "PAUSED", RESUME: "RESUME", EXIT_TITLE: "EXIT TO TITLE", EXIT: "EXIT",
        RESTART_RUN: "RESTART RUN",
        // Mode descriptions
        MODE_STORY_DESC: "Follow Bitcoin's rise against central banks.",
        MODE_ARCADE_DESC: "Roguelike protocols. Infinite runs. Every choice matters.",
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
        // PU_LASER removed in v4.47
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
        TIP_HODL_TITLE: "DIP METER - Fill it for HYPER",
        TIP_HODL_1: "Kill enemies at close range to fill the DIP meter:",
        TIP_HODL_2: "Closer kills = more meter gain",
        TIP_HODL_3: "Full meter activates HYPER MODE (5x score!)",
        TIP_HODL_4: "Stay aggressive — meter decays if you stop killing!",
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
        CAMPAIGN: "STORY",
        LAUNCH: "LAUNCH",
        HORDE_2_INCOMING: "HORDE 2!",
        GET_READY: "GET READY",
        PWA_INSTALL_IOS: 'Install: tap <svg class="pwa-share-icon" viewBox="0 0 24 24" fill="none" stroke="#bb44ff" stroke-width="2"><path d="M12 3v12M5 10l7-7 7 7"/><path d="M5 21h14a1 1 0 001-1v-6H4v6a1 1 0 001 1z"/></svg> then "Add to Home Screen"',
        PWA_INSTALL_ANDROID: "Install the app for the best experience",
        PWA_INSTALL_BTN: "INSTALL",
        // Tutorial (v4.37 unified)
        TUT_TITLE: "HOW TO PLAY",
        TUT_CONTROLS_PC: "A/D or Arrows to move. Space to fire. S for Shield.",
        TUT_CONTROLS_UNIFIED: "SWIPE LEFT & RIGHT TO MOVE",
        TUT_OBJECTIVE_UNIFIED: "Destroy 5 waves, then defeat the Boss!",
        TUT_SHIELD_FIN: "Your fins glow cyan when Shield is ready \u2014 tap your ship to activate!",
        TUT_SURVIVAL_UNIFIED: "3 lives \u2022 1 hit = 1 life \u2022 Shield = your defense",
        // Manual v2 condensed (v4.12.0)
        MAN_OBJECTIVES: "OBJECTIVES",
        MAN_OBJ_TEXT: "Destroy waves of fiat enemies, collect power-ups, survive 5 waves per level, then defeat the Boss. Each cycle increases difficulty and rewards.",
        MAN_OBJ_DEATH: "1 hit = 1 life lost. 3 lives total. Shield is your only defense!",
        MAN_PU_UPGRADE: "Permanent shot level +1 (1\u21922\u21923)",
        MAN_PU_RATE: "Fire rate boost (stacks x3, 12s)",
        MAN_PU_POWER: "Damage boost (stacks x3, 12s)",
        MAN_PU_SPREAD: "Wider shot angle (stacks x2, 12s)",
        MAN_PU_HOMING: "Auto-tracking bullets (12s)",
        MAN_PU_PIERCE: "Penetrating bullets (12s)",
        // MAN_PU_LASER removed in v4.47
        MAN_PU_MISSILE: "AoE explosive shots (12s)",
        MAN_PU_SHIELD: "Instant shield activation",
        MAN_PU_SPEED: "Movement speed +50% (12s)",
        MAN_TIP_HODL: "\uD83D\uDC8E DIP METER \u2014 Kill close = fill meter = HYPER MODE!",
        MAN_TIP_GRAZE: "\uD83D\uDD25 GRAZE \u2014 Dodge close to bullets = score multiplier (up to 2.5x)",
        MAN_TIP_SHIELD: "\uD83D\uDEE1\uFE0F SHIELD \u2014 10s cooldown. Your only defense against hits!",
        MAN_TIP_BOSS: "\u26A1 BOSSES \u2014 3 phases each. Every 25 hits drops a power-up",
        MAN_TIP_BEAR: "\uD83D\uDC3B BEAR MARKET \u2014 Hard mode in Settings. Double points!",
        // Intro Redesign v4.8
        MODE_STORY: "STORY",
        MODE_ARCADE: "ARCADE",
        MODE_STORY_DESC: "Experience Bitcoin's story through 3 epic chapters",
        MODE_ARCADE_DESC: "Roguelike protocols. Infinite runs. Every choice matters.",
        ARCADE_CHOOSE: "CHOOSE YOUR PROTOCOL",
        CHANGE_MODE: "change mode",
        TITLE_SUBTITLE: "Currencies",
        GO: "GO!",
        // Arcade records (v4.50)
        NEW_BEST: "NEW BEST!",
        BEST_CYCLE: "BEST CYCLE",
        BEST_LEVEL: "BEST LEVEL",
        BEST_KILLS: "BEST KILLS",
        WHATS_NEW: "WHAT'S NEW",
        CLOSE: "CLOSE"
    },
    IT: {
        SCORE: "PUNTI", LEVEL: "LIVELLO", LIVES: "VITE", NORMAL: "NORMALE",
        INSERT_COIN: "INSERISCI GETTONE",
        START_HINT: "📱 TOCCA PER INIZIARE • LATI: MUOVI • ICONA: SCUDO",
        MOBILE_HINT: "📱 TOCCA LATI: Muovi • ICONA: Scudo",
        PRO_TIP: "💎 PRO TIP: UCCIDI DA VICINO PER RIEMPIRE IL METER DIP",
        WAVE1: "ONDATA 1: ACCUMULO", WAVE2: "ONDATA 2: BULL RUN", WAVE3: "ONDATA 3: VOLATILITÀ",
        WAVE4: "ONDATA 4: CORREZIONE", WAVE5: "ONDATA 5: CLIMAX",
        CYCLE: "CICLO", WAVE_OF: "ONDATA", BEGINS: "INIZIA",
        WAVE_FLAVOR_1: "Accumulo", WAVE_FLAVOR_2: "Bull Run", WAVE_FLAVOR_3: "Volatilita",
        WAVE_FLAVOR_4: "Correzione", WAVE_FLAVOR_5: "Climax",
        BOSS_ENTER: "RISERVE AUREE", BOSS_DEATH: "RISERVE LIQUIDATE",
        GAME_OVER: "REKT", RESTART: "COMPRA IL DIP",
        COMBO_LOST: "COMBO PERSA", COMBO_BREAK: "COMBO ROTTA",
        BULLET_BONUS: "BONUS PROIETTILI", GRAZE_BONUS: "BONUS GRAZE!",
        HYPER_READY: "HYPER PRONTO!", HYPER_FAILED: "HYPER FALLITO!",
        SURVIVE_CRASH: "SOPRAVVIVI AL CRASH",
        APPEARS: "APPARE!", REVENGE: "VENDETTA!", DESTROYED: "DISTRUTTO!", DEFEATED: "SCONFITTO!",
        GODCHAIN_ON: "GODCHAIN ATTIVA", GODCHAIN_OFF: "GODCHAIN PERSA",
        TIME_LEFT: "s RIMASTI!", PROFIT: "PROFITTO!",
        WEAPON_UNLOCK: "NUOVA ARMA SBLOCCATA:", GRAZE_MASTER: "MAESTRO GRAZE",
        LAST_FIAT: "ULTIMO FIAT!", RESPAWN: "RINASCITA!",
        UPGRADE: "POTENZIAMENTO LV", MAX_POWER: "MASSIMA POTENZA",
        SETTINGS: "IMPOSTAZIONI", CLOSE: "CHIUDI", LANG: "LINGUA", PRIVACY: "Privacy",
        PAUSED: "PAUSA", RESUME: "RIPRENDI", EXIT_TITLE: "ESCI AL TITOLO", EXIT: "ESCI",
        RESTART_RUN: "RICOMINCIA",
        // Mode descriptions
        MODE_STORY_DESC: "Segui l'ascesa di Bitcoin contro le banche centrali.",
        MODE_ARCADE_DESC: "Protocolli roguelike. Run infinite. Ogni scelta conta.",
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
        // PU_LASER rimosso in v4.47
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
        TIP_HODL_TITLE: "METER DIP - Riempilo per HYPER",
        TIP_HODL_1: "Uccidi i nemici da vicino per riempire il meter DIP:",
        TIP_HODL_2: "Uccisioni più ravvicinate = più meter",
        TIP_HODL_3: "Meter pieno attiva HYPER MODE (punteggio x5!)",
        TIP_HODL_4: "Resta aggressivo — il meter cala se smetti di uccidere!",
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
        CAMPAIGN: "STORIA",
        LAUNCH: "LANCIA",
        HORDE_2_INCOMING: "ORDA 2!",
        GET_READY: "PREPARATI",
        PWA_INSTALL_IOS: 'Installa: tap <svg class="pwa-share-icon" viewBox="0 0 24 24" fill="none" stroke="#bb44ff" stroke-width="2"><path d="M12 3v12M5 10l7-7 7 7"/><path d="M5 21h14a1 1 0 001-1v-6H4v6a1 1 0 001 1z"/></svg> poi "Aggiungi a Home"',
        PWA_INSTALL_ANDROID: "Installa l'app per la migliore esperienza",
        PWA_INSTALL_BTN: "INSTALLA",
        // Tutorial (v4.37 unified)
        TUT_TITLE: "COME SI GIOCA",
        TUT_CONTROLS_PC: "A/D o Frecce per muoverti. Spazio per sparare. S per lo Scudo.",
        TUT_CONTROLS_UNIFIED: "SCORRI A SINISTRA E DESTRA PER MUOVERTI",
        TUT_OBJECTIVE_UNIFIED: "Distruggi 5 ondate, poi sconfiggi il Boss!",
        TUT_SHIELD_FIN: "Le alette brillano cyan quando lo Scudo \u00E8 pronto \u2014 tocca la nave per attivarlo!",
        TUT_SURVIVAL_UNIFIED: "3 vite \u2022 1 colpo = 1 vita \u2022 Lo scudo \u00E8 la tua difesa",
        // Manual v2 condensed (v4.12.0)
        MAN_OBJECTIVES: "OBIETTIVI",
        MAN_OBJ_TEXT: "Distruggi ondate di nemici fiat, raccogli power-up, sopravvivi a 5 ondate per livello, poi sconfiggi il Boss. Ogni ciclo aumenta difficolt\u00E0 e ricompense.",
        MAN_OBJ_DEATH: "1 colpo = 1 vita persa. 3 vite totali. Lo scudo \u00E8 la tua unica difesa!",
        MAN_PU_UPGRADE: "Livello colpi permanente +1 (1\u21922\u21923)",
        MAN_PU_RATE: "Cadenza di fuoco (cumula x3, 12s)",
        MAN_PU_POWER: "Danno potenziato (cumula x3, 12s)",
        MAN_PU_SPREAD: "Angolo colpi pi\u00F9 ampio (cumula x2, 12s)",
        MAN_PU_HOMING: "Proiettili auto-guidati (12s)",
        MAN_PU_PIERCE: "Proiettili penetranti (12s)",
        // MAN_PU_LASER rimosso in v4.47
        MAN_PU_MISSILE: "Esplosioni ad area (12s)",
        MAN_PU_SHIELD: "Attivazione scudo istantanea",
        MAN_PU_SPEED: "Velocit\u00E0 +50% (12s)",
        MAN_TIP_HODL: "\uD83D\uDC8E METER DIP \u2014 Uccidi da vicino = riempi meter = HYPER MODE!",
        MAN_TIP_GRAZE: "\uD83D\uDD25 GRAZE \u2014 Sfiora i proiettili = moltiplicatore punti (fino a 2.5x)",
        MAN_TIP_SHIELD: "\uD83D\uDEE1\uFE0F SCUDO \u2014 Cooldown 10s. Unica difesa contro i colpi!",
        MAN_TIP_BOSS: "\u26A1 BOSS \u2014 3 fasi ciascuno. Ogni 25 colpi rilascia un power-up",
        MAN_TIP_BEAR: "\uD83D\uDC3B BEAR MARKET \u2014 Hard mode nelle Impostazioni. Punti doppi!",
        // Intro Redesign v4.8
        MODE_STORY: "STORIA",
        MODE_ARCADE: "ARCADE",
        MODE_STORY_DESC: "Vivi la storia di Bitcoin attraverso 3 capitoli epici",
        MODE_ARCADE_DESC: "Protocolli roguelike. Run infinite. Ogni scelta conta.",
        ARCADE_CHOOSE: "SCEGLI IL TUO PROTOCOLLO",
        CHANGE_MODE: "cambia modalita",
        TITLE_SUBTITLE: "Valute",
        GO: "VIA!",
        // Arcade records (v4.50)
        NEW_BEST: "NUOVO RECORD!",
        BEST_CYCLE: "MIGLIOR CICLO",
        BEST_LEVEL: "MIGLIOR LIVELLO",
        BEST_KILLS: "MIGLIORI UCCISIONI",
        WHATS_NEW: "NOVITÀ",
        CLOSE: "CHIUDI"
    }
};

window.Game.MEMES = {
    // Intermission spotlight memes (curated best-of, shown during countdown)
    INTERMISSION: [
        "HAVE FUN STAYING POOR",
        "WE'RE ALL GONNA MAKE IT",
        "GENERATIONAL WEALTH",
        "INFINITY DIVIDED BY 21 MILLION",
        "THERE IS NO SECOND BEST",
        "TO THE MOON 🚀",
        "DIAMOND HANDS 💎",
        "BITCOIN IS HOPE",
        "LASER EYES ACTIVATED",
        "CONVICTION LEVEL: MAX",
        "GIGACHAD MOVE",
        "BITCOIN FIXES THIS",
        "HYPERBITCOINIZATION INCOMING",
        "THE GREAT REPRICING",
        "NOT YOUR KEYS, NOT YOUR COINS",
        "STACK SATS OR DIE TRYING",
        "INFINITE MONEY GLITCH ENGAGED",
        "CTRL+P INTENSIFIES",
        "BITCOIN IS THE APEX PREDATOR",
        "FREEDOM TECHNOLOGY"
    ],
    // General Crypto Culture (whispers, ambient flavor)
    LOW: [
        "HODL", "BUY THE DIP", "SHITCOIN", "PAPER HANDS", "NGMI", "HFSP",
        "FUD DETECTED", "REKT", "WAGMI", "LFG", "APE IN", "DEGEN MODE",
        "PUMP IT", "DUMP IT", "SEND IT", "NFA", "DYOR", "FOMO ENGAGED",
        "COPE HARDER", "FEW UNDERSTAND",
        "THIS IS THE WAY", "PROBABLY NOTHING", "BULLISH AF",
        "FLOOR IS LAVA", "UP ONLY", "NUMBER GO UP", "STACK SATS",
        "TRUST THE PROCESS",
        "ZOOM OUT", "TIME IN MARKET", "DCA IS THE WAY"
    ],
    // Power-up / streak celebration memes
    HIGH: [
        "LAMBO SOON", "WHALE ALERT 🐋",
        "EARLY ADOPTER",
        "MICHAEL SAYLOR MODE", "STILL EARLY",
        "FUTURE MILLIONAIRE", "ABSOLUTE UNIT",
        "NEVER SELLING", "INFINITY HODL",
        "APEX PREDATOR", "MONETARY MAXIMALIST"
    ],
    // Michael Saylor Quotes (no overlap with INTERMISSION pool)
    SAYLOR: [
        "BITCOIN IS DIGITAL GOLD",
        "BITCOIN IS A SWARM OF CYBER HORNETS",
        "BTC IS DIGITAL ENERGY",
        "BITCOIN IS ECONOMIC IMMORTALITY",
        "BITCOIN IS THERMODYNAMICALLY SOUND",
        "EVERY COMPANY WILL HOLD BITCOIN",
        "BITCOIN IS A MONETARY NETWORK",
        "BUY BITCOIN AND WAIT",
        "BITCOIN IS DIGITAL PROPERTY",
        "BITCOIN IS THE HARDEST ASSET",
        "BITCOIN IS INCORRUPTIBLE",
        "BITCOIN IS THE EXIT",
        "BITCOIN IS PURE ENERGY",
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
        "BITCOIN DOESN'T CARE"
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

// === WEAPON EVOLUTION v4.47 ===
// Linear 5-level weapon progression:
// - UPGRADE: permanent weapon level (1→5), death = -1 level
// - Specials: exclusive weapon effects (HOMING/PIERCE/MISSILE), death = lost
// - Utilities: non-weapon drops (SHIELD/SPEED), distinct visual

window.Game.POWERUP_TYPES = {
    // Upgrade (permanent weapon level)
    UPGRADE: { icon: '⬆️', color: '#FFD700', category: 'upgrade', name: 'UPGRADE', symbol: '↑' },

    // Specials (exclusive weapon effects, temporary 12s)
    HOMING:  { icon: '🎯', color: '#E67E22', category: 'special', name: 'HOMING', symbol: 'H' },
    PIERCE:  { icon: '🔥', color: '#E74C3C', category: 'special', name: 'PIERCE', symbol: 'X' },
    MISSILE: { icon: '🚀', color: '#3498DB', category: 'special', name: 'MISSILE', symbol: 'M' },

    // Utilities (non-weapon, distinct capsule shape)
    SHIELD:  { icon: '🛡️', color: '#2ECC71', category: 'utility', name: 'SHIELD', symbol: '🛡' },
    SPEED:   { icon: '💨', color: '#F1C40F', category: 'utility', name: 'SPEED', symbol: '>' }
};

// 10 Fiat currencies with unique stats and visual styles
// shape: 'coin' | 'bill' | 'card' | 'bar' determines draw style
window.Game.FIAT_TYPES = [
    // Tier 1 - Weak (rows 4-5)
    { s: '¥', name: 'YEN', c: '#ff3355', val: 20, hp: 0.8, fireMin: 4.5, fireMax: 6.5, aimSpread: 0.35, pattern: 'SINGLE', shape: 'coin' },
    { s: '₽', name: 'RUBLE', c: '#6699dd', val: 25, hp: 0.8, fireMin: 4.5, fireMax: 6.5, aimSpread: 0.30, pattern: 'SINGLE', shape: 'bill' },
    { s: '₹', name: 'RUPEE', c: '#ffaa00', val: 25, hp: 0.9, fireMin: 4.5, fireMax: 6.5, aimSpread: 0.28, pattern: 'SINGLE', shape: 'coin' },

    // Tier 2 - Medium (rows 2-3) — v4.37: slower cooldowns
    { s: '€', name: 'EURO', c: '#2288ff', val: 40, hp: 1.0, fireMin: 3.2, fireMax: 5.0, aimSpread: 0.22, pattern: 'BURST', shape: 'bill' },
    { s: '£', name: 'POUND', c: '#bb44ff', val: 45, hp: 1.0, fireMin: 3.0, fireMax: 4.5, aimSpread: 0.20, pattern: 'SINGLE', shape: 'coin' },
    { s: '₣', name: 'FRANC', c: '#00ddbb', val: 50, hp: 1.1, fireMin: 2.8, fireMax: 4.0, aimSpread: 0.18, pattern: 'DOUBLE', shape: 'bar' },
    { s: '₺', name: 'LIRA', c: '#ff8800', val: 55, hp: 1.2, fireMin: 2.8, fireMax: 4.0, aimSpread: 0.16, pattern: 'BURST', shape: 'bill' },

    // Tier 3 - Strong (row 1)
    { s: '$', name: 'DOLLAR', c: '#00ff66', val: 80, hp: 1.3, fireMin: 1.8, fireMax: 2.8, aimSpread: 0.14, pattern: 'DOUBLE', shape: 'bill' },
    { s: '元', name: 'YUAN', c: '#ff2244', val: 90, hp: 1.4, fireMin: 1.6, fireMax: 2.5, aimSpread: 0.12, pattern: 'BURST', shape: 'bar' },
    { s: 'Ⓒ', name: 'CBDC', c: '#aa33ff', val: 100, hp: 1.5, fireMin: 1.4, fireMax: 2.2, aimSpread: 0.10, pattern: 'DOUBLE', shape: 'card' }
];

// Boss minion type - spawned during boss fights
window.Game.MINION_TYPE = {
    s: '💵', name: 'MINION', c: '#ff3355', val: 15, hp: 0.5,
    fireMin: 2.0, fireMax: 3.0, aimSpread: 0.25, pattern: 'SINGLE', shape: 'coin',
    isMinion: true
};

window.Game.SHIPS = {
    BTC: { speed: 420, hp: 3, fireRate: 0.22, baseDamage: 14, color: '#bb44ff', hitboxSize: 42, coreHitboxSize: 8 }, // v5.9: 30→42 chevron redesign
    ETH: { speed: 320, hp: 4, fireRate: 0.33, baseDamage: 28, color: '#8c7ae6', hitboxSize: 50, coreHitboxSize: 9 }, // v5.9: 38→50 proportional
    SOL: { speed: 560, hp: 2, fireRate: 0.17, baseDamage: 10, color: '#00d2d3', hitboxSize: 24, coreHitboxSize: 5 } // v5.9: 18→24 proportional
};

// High-contrast projectile color palette
window.Game.PROJECTILE_COLORS = {
    PINK: '#ff2d95',
    CYAN: '#00f0ff',
    MAGENTA: '#ff00ff',
    YELLOW: '#ffff00',
    WHITE: '#ffffff',
    ORANGE: '#ffaa00'
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
        color: '#00ff66',           // Dollar green neon
        accentColor: '#00cc55',
        darkColor: '#004422',
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

