/**
 * DialogueData.js - All game dialogues (data-driven)
 *
 * Ironic, crypto-themed dialogues to make the player smile.
 * Easy to edit and expand.
 */
window.Game = window.Game || {};

window.Game.DIALOGUES = {

    // === SHIP SELECTION / GAME START ===
    SHIP_INTRO: {
        BTC: [
            "21 milioni. Non uno di più. Siete avvisati.",
            "Sono sopravvissuto a Mt.Gox. Voi non mi fate paura.",
            "Digital Gold? No. Digital JUSTICE.",
            "Store of value? Store of DESTRUCTION.",
            "Ogni 4 anni divento più forte. Voi solo più poveri."
        ],
        ETH: [
            "Smart contracts loaded. Dumb enemies detected.",
            "Gas fees? Per voi sarà GAS FATALE.",
            "Decentralized. Unstoppable. Unimpressed.",
            "The Merge è stato solo l'inizio.",
            "World Computer vs World Central Banks. Easy."
        ],
        SOL: [
            "400ms di latenza. Per la vostra FINE.",
            "Veloce, economico, e pronto a distruggervi.",
            "La blockchain più veloce vs la burocrazia più lenta.",
            "Almeno non crasherò... probabilmente.",
            "Speed run? Più come speed DESTROY."
        ]
    },

    // === LEVEL COMPLETE (by level number) ===
    LEVEL_COMPLETE: {
        1: [
            "Yen distrutti! Il carry trade non vi salverà.",
            "Sayonara, Yen! Torniamo quando stampate meno.",
            "Bank of Japan disapproves. Non me ne frega niente.",
            "¥¥¥? Più come BYE BYE BYE."
        ],
        2: [
            "Euro a zero! Lagarde non risponde al telefono.",
            "Whatever it takes? Non è bastato.",
            "L'Euro è forte, dicevano. DICEVANO.",
            "BCE: Banca Centrale ELIMINATA."
        ],
        3: [
            "Sterline polverizzate! La Regina approverebbe.",
            "Brexit dal mio schermo, per favore.",
            "Keep calm and get REKT.",
            "£? Più come L (as in LOSS)."
        ],
        4: [
            "Dollari eliminati! In God We Trust, in BTC We Verify.",
            "Il petrodollaro è così... anni '70.",
            "Federal Reserve Note? Federal DEFEAT Note.",
            "Make Dollars Worthless Again. Done."
        ],
        5: [
            "Resistenza fiat annientata! Ma qualcosa si avvicina...",
            "Troppo facile? Aspetta di vedere chi arriva.",
            "Sento una stampante in lontananza...",
            "BRRRR... sentite anche voi?"
        ]
    },

    // === GENERIC LEVEL COMPLETE (for levels > 5) ===
    LEVEL_COMPLETE_GENERIC: [
        "Altro giro, altra inflazione distrutta.",
        "Continuano a stampare, continuo a sparare.",
        "Fiat delenda est!",
        "Quanti ne dovete mandare ancora?",
        "I'm in this for the technology. E per DISTRUGGERVI.",
        "Non è molto, ma è lavoro onesto.",
        "Tick tock, next block.",
        "La stampante fa BRRRR. Io faccio BOOM."
    ],

    // === BOSS INTRO ===
    BOSS_INTRO: {
        FEDERAL_RESERVE: [
            { speaker: "POWELL", text: "L'inflazione è transitoria. VOI siete transitori." },
            { speaker: "POWELL", text: "Ho stampato 9 trilioni per questo momento." },
            { speaker: "POWELL", text: "Soft landing? Per voi sarà HARD LANDING." },
            { speaker: "POWELL", text: "I have the tools. THE TOOLS!" },
            { speaker: "POWELL", text: "Audit the Fed? Audit THIS!" },
            { speaker: "POWELL", text: "Tassi su, voi GIÙ." },
            { speaker: "FED", text: "Brrrrrrr... preparatevi." }
        ],
        BCE: [
            { speaker: "LAGARDE", text: "Whatever it takes. Anche distruggerti." },
            { speaker: "LAGARDE", text: "La frammentazione? L'unica frammentazione sarai TU." },
            { speaker: "BCE", text: "Benvenuto nella burocrazia europea. Non ne uscirai." },
            { speaker: "LAGARDE", text: "I tassi negativi erano solo l'antipasto." },
            { speaker: "LAGARDE", text: "Crypto? Non vale niente. Come te tra poco." },
            { speaker: "BCE", text: "12 stelle. 12 modi per distruggerti." },
            { speaker: "LAGARDE", text: "L'Euro è irreversibile. La tua fine anche." }
        ],
        BOJ: [
            { speaker: "KURODA", text: "Yield curve... sotto controllo. Come la tua fine." },
            { speaker: "BOJ", text: "Lo Yen è debole? La mia furia no." },
            { speaker: "UEDA", text: "L'intervento sarà... inaspettato." },
            { speaker: "KURODA", text: "Stampare è un'arte. Io sono il maestro." },
            { speaker: "BOJ", text: "Abenomics never dies. Tu invece sì." },
            { speaker: "KURODA", text: "Zen... poi distruzione." },
            { speaker: "BOJ", text: "¥160? ¥180? Chi conta quando stampi infinito?" }
        ]
    },

    // === BOSS PHASE CHANGE ===
    BOSS_PHASE: {
        FEDERAL_RESERVE: {
            2: [
                { speaker: "POWELL", text: "Credevi fosse finita? Accendo la stampante!" },
                { speaker: "POWELL", text: "Quantitative Easing: ENGAGED!" },
                { speaker: "FED", text: "UNLIMITED POWER!" }
            ],
            3: [
                { speaker: "POWELL", text: "MODALITÀ PANICO! STAMPATE TUTTO!" },
                { speaker: "POWELL", text: "Non posso perdere! Sono TOO BIG TO FAIL!" },
                { speaker: "FED", text: "BRRRRRRRRRRRRR!!!" }
            ]
        },
        BCE: {
            2: [
                { speaker: "LAGARDE", text: "Riunione d'emergenza! Tutti i documenti!" },
                { speaker: "BCE", text: "PROCEDURE ATTIVATE. BUROCRAZIA INTENSIFICATA." },
                { speaker: "LAGARDE", text: "Pensavi che la burocrazia fosse lenta? SBAGLIATO." }
            ],
            3: [
                { speaker: "LAGARDE", text: "FRAMMENTAZIONE TOTALE! 27 paesi ti attaccano!" },
                { speaker: "BCE", text: "STELLE EUROPEE: FUOCO A VOLONTÀ!" },
                { speaker: "LAGARDE", text: "WHATEVER IT TAKES! WHATEVER IT TAKES!" }
            ]
        },
        BOJ: {
            2: [
                { speaker: "KURODA", text: "Intervento valutario ATTIVATO!" },
                { speaker: "BOJ", text: "Lo yen cade... TU cadi più veloce." },
                { speaker: "UEDA", text: "La pazienza zen è finita." }
            ],
            3: [
                { speaker: "KURODA", text: "INTERVENTO TOTALE! VENDIAMO TUTTO!" },
                { speaker: "BOJ", text: "YIELD CURVE CONTROL ESTREMO!" },
                { speaker: "KURODA", text: "NON C'È FUGA DAL SOL LEVANTE!" }
            ]
        }
    },

    // === BOSS DEFEAT ===
    BOSS_DEFEAT: {
        FEDERAL_RESERVE: [
            { speaker: "POWELL", text: "Impossibile! Chi auditerà la Fed adesso?!" },
            { speaker: "PLAYER", text: "La stampante si è inceppata. F." },
            { speaker: "PLAYER", text: "Quantitative Easing? Quantitative LEAVING." },
            { speaker: "PLAYER", text: "The Fed is dead. Long live the blockchain." },
            { speaker: "POWELL", text: "Noooo! I miei strumenti!" },
            { speaker: "PLAYER", text: "Inflation DEFEATED. Literally." }
        ],
        BCE: [
            { speaker: "LAGARDE", text: "Non può finire così! Ho i documenti!" },
            { speaker: "PLAYER", text: "La burocrazia non ti salverà stavolta." },
            { speaker: "PLAYER", text: "Whatever it takes? Non abbastanza." },
            { speaker: "LAGARDE", text: "Le stelle... si spengono..." },
            { speaker: "PLAYER", text: "L'Euro è irreversibile, dicevi. Irreversibilmente SCONFITTO." },
            { speaker: "PLAYER", text: "Frammentazione completata. Ma non quella che pensavi." }
        ],
        BOJ: [
            { speaker: "KURODA", text: "Lo... yen... impossibile..." },
            { speaker: "PLAYER", text: "Il Sol Levante tramonta. Finalmente." },
            { speaker: "PLAYER", text: "Yield curve? Più come yield DESTROYED." },
            { speaker: "UEDA", text: "L'intervento... ha fallito..." },
            { speaker: "PLAYER", text: "La pazienza zen non basta contro la blockchain." },
            { speaker: "PLAYER", text: "Abenomics? Più come ENDONOMICS." }
        ]
    },

    // === GAME OVER (by ship) ===
    GAME_OVER: {
        BTC: [
            "HODL failed. Paper hands detected.",
            "Anche Satoshi è deluso.",
            "Hai venduto il bottom, vero?",
            "Not your keys, not your... life.",
            "Buy the dip? TU sei il dip."
        ],
        ETH: [
            "Transaction reverted. Reason: skill issue.",
            "Gas sprecato. Proprio come questa run.",
            "Vitalik scuote la testa tristemente.",
            "Error: Insufficient SKILL.",
            "This is why we can't have nice things."
        ],
        SOL: [
            "Network halted. Come al solito.",
            "Troppo veloce per il tuo bene.",
            "Almeno le fee erano basse...",
            "Validator down. Come te.",
            "Speed run fallita. In tutti i sensi."
        ]
    },

    // === CONTINUE? (after game over, before restart) ===
    CONTINUE: [
        "Fiat non dorme mai. E tu?",
        "La blockchain ha bisogno di te!",
        "WAGMI... se riprovi.",
        "La stampante è ancora accesa...",
        "Non puoi arrenderti. Satoshi crede in te.",
        "Buy the dip. E per dip intendo RIPROVA."
    ],

    // === TIPS (loading, pause, random) ===
    TIPS: [
        "💎 HODL = stai fermo per bonus danni!",
        "🌀 Sfiora i proiettili per riempire il Graze meter!",
        "⚡ I power-up sono utility, non necessità. Git gud.",
        "🐻 Bear Market mode: per veri degenerati.",
        "🖨️ Fun fact: Powell stampa soldi mentre leggi questo.",
        "🎯 La hitbox è PICCOLA. Usa questo a tuo vantaggio.",
        "🛡️ Lo scudo ha cooldown. Usalo con saggezza.",
        "📈 Il graze meter pieno = 1.5x score multiplier!",
        "🔥 FIRE weapon penetra i nemici. Molto soddisfacente.",
        "⏸️ Pausa il gioco. La Fed non può pausare l'inflazione."
    ],

    // === NEW MARKET CYCLE (after boss, harder difficulty) ===
    NEW_CYCLE: [
        { speaker: "SYSTEM", text: "MARKET CYCLE COMPLETE. Difficoltà aumentata!" },
        { speaker: "PLAYER", text: "Un altro halving, un altro giro." },
        { speaker: "PLAYER", text: "Bear market? Io sono il bear market." },
        { speaker: "SYSTEM", text: "Hanno mandato rinforzi. Che carini." }
    ],

    // === BEAR MARKET MODE START ===
    BEAR_MARKET_START: [
        { speaker: "SYSTEM", text: "🐻 BEAR MARKET ATTIVATO. Buona fortuna." },
        { speaker: "PLAYER", text: "Ah sh*t, here we go again." },
        { speaker: "SYSTEM", text: "Un colpo e sei fuori. No pressure." },
        { speaker: "PLAYER", text: "-80%? Hold my private keys." }
    ]
};
