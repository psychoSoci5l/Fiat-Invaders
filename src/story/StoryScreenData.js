/**
 * StoryScreenData.js - Narrative content for Story Mode
 *
 * Full-screen narrative that tells the story of Bitcoin,
 * giving meaning to the FIAT vs CRYPTO conflict.
 */
window.Game = window.Game || {};

window.Game.STORY_CONTENT = {
    /**
     * PROLOGUE: Shown before the first game in Story Mode
     * Context: 1971 - The end of the gold standard
     */
    PROLOGUE: {
        id: 'PROLOGUE',
        period: '1971',
        title: {
            EN: 'The End of Sound Money',
            IT: 'La Fine del Denaro Solido'
        },
        paragraphs: {
            EN: [
                "On August 15, 1971, President Nixon makes a decision that will change the world: he closes the 'gold window', severing the last link between the dollar and gold.",
                "With that single act, the Bretton Woods system collapses, and for the first time in history all major currencies become pure FIAT money — backed by nothing but government trust and decree.",
                "Free from any constraint, the printing presses begin to run. Over the next 50 years, the global money supply will explode by over 3000%, quietly eroding the value of every paycheck and every saving.",
                "But somewhere, in the depths of the digital frontier, a new challenger is about to emerge..."
            ],
            IT: [
                "Il 15 agosto 1971, il presidente Nixon prende una decisione che cambierà il mondo: chiude la 'finestra dell'oro', recidendo l'ultimo legame tra il dollaro e l'oro.",
                "Con quel singolo atto, il sistema di Bretton Woods crolla, e per la prima volta nella storia tutte le principali valute diventano pura moneta FIAT — sostenute solo dalla fiducia e dai decreti governativi.",
                "Libere da ogni vincolo, le stampanti iniziano a girare. Nei 50 anni successivi, l'offerta globale di moneta esploderà di oltre il 3000%, erodendo silenziosamente il valore di ogni stipendio e di ogni risparmio.",
                "Ma da qualche parte, nelle profondità della frontiera digitale, un nuovo sfidante sta per emergere..."
            ]
        },
        nextChapter: 'CHAPTER_1'
    },

    /**
     * CHAPTER 1: After defeating the Federal Reserve (Boss 1)
     * Context: 2008-2010 - Birth of Bitcoin
     */
    CHAPTER_1: {
        id: 'CHAPTER_1',
        period: '2008-2010',
        title: {
            EN: 'The Birth of Bitcoin',
            IT: 'La Nascita di Bitcoin'
        },
        paragraphs: {
            EN: [
                "In 2008, the global financial system teeters on the edge of collapse. Banks are bailed out with freshly printed money, and ordinary people watch their savings vanish while those responsible face no consequences.",
                "In the midst of this chaos, an anonymous figure known as Satoshi Nakamoto quietly publishes a whitepaper describing something radical: a form of electronic cash that doesn't need banks, governments, or any middleman at all.",
                "On January 3, 2009, the first Bitcoin block is mined. Hidden inside it is a newspaper headline about bank bailouts — a permanent reminder of why this technology was created.",
                "In its early days, Bitcoin is fragile and experimental, sustained only by a handful of pioneers who share a radical conviction: that money can exist without authority, built on nothing but mathematics, consensus, and transparency."
            ],
            IT: [
                "Nel 2008, il sistema finanziario globale vacilla sull'orlo del collasso. Le banche vengono salvate con denaro appena stampato, e la gente comune vede i propri risparmi svanire mentre i responsabili non subiscono conseguenze.",
                "Nel mezzo di questo caos, una figura anonima nota come Satoshi Nakamoto pubblica in silenzio un documento che descrive qualcosa di radicale: una forma di denaro elettronico che non ha bisogno di banche, governi, né di alcun intermediario.",
                "Il 3 gennaio 2009 viene minato il primo blocco Bitcoin. Al suo interno è nascosto il titolo di un giornale sui salvataggi bancari — un promemoria permanente del motivo per cui questa tecnologia è stata creata.",
                "Nei suoi primi giorni, Bitcoin è fragile e sperimentale, sostenuto solo da una manciata di pionieri che condividono una convinzione radicale: che il denaro possa esistere senza autorità, costruito su nient'altro che matematica, consenso e trasparenza."
            ]
        },
        bossDefeated: 'FEDERAL_RESERVE',
        nextChapter: 'CHAPTER_2'
    },

    /**
     * CHAPTER 2: After defeating the ECB (Boss 2)
     * Context: 2011-2016 - Growth and conflicts
     */
    CHAPTER_2: {
        id: 'CHAPTER_2',
        period: '2011-2016',
        title: {
            EN: 'The Scaling Wars',
            IT: 'Le Guerre di Scala'
        },
        paragraphs: {
            EN: [
                "As Bitcoin grows, so do the conflicts around it. What started as a small experiment is now a movement, and the community finds itself divided over a fundamental question: how should the network scale?",
                "Some push for bigger blocks and faster transactions, while others insist that decentralization must come first, even at the cost of speed. Scaling conferences turn into ideological battlefields.",
                "But through the turmoil, a powerful idea takes shape: no single entity gets to decide Bitcoin's future. Changes happen only through consensus — the collective agreement of thousands of independent participants.",
                "Solutions like Segregated Witness emerge from this process, proving that Bitcoin doesn't evolve by command, but by the slow, deliberate will of its community."
            ],
            IT: [
                "Man mano che Bitcoin cresce, crescono anche i conflitti attorno ad esso. Quello che era iniziato come un piccolo esperimento è ora un movimento, e la comunità si trova divisa su una domanda fondamentale: come dovrebbe scalare la rete?",
                "Alcuni spingono per blocchi più grandi e transazioni più veloci, mentre altri insistono che la decentralizzazione debba venire prima di tutto, anche a costo della velocità. Le conferenze diventano veri e propri campi di battaglia ideologici.",
                "Ma attraverso le turbolenze, un'idea potente prende forma: nessuna singola entità può decidere il futuro di Bitcoin. I cambiamenti avvengono solo attraverso il consenso — l'accordo collettivo di migliaia di partecipanti indipendenti.",
                "Soluzioni come Segregated Witness emergono da questo processo, dimostrando che Bitcoin non evolve per comando, ma per la volontà lenta e deliberata della sua comunità."
            ]
        },
        bossDefeated: 'BCE',
        nextChapter: 'CHAPTER_3'
    },

    /**
     * CHAPTER 3: After defeating BOJ (Boss 3) - Final chapter + Victory
     * Context: 2017-Present - Global adoption
     */
    CHAPTER_3: {
        id: 'CHAPTER_3',
        period: '2017-',
        periodSuffix: {
            EN: 'Today',
            IT: 'Oggi'
        },
        title: {
            EN: 'The Unstoppable Network',
            IT: 'La Rete Inarrestabile'
        },
        paragraphs: {
            EN: [
                "Bitcoin survives its internal wars and emerges stronger than ever. Attempts at control, aggressive forks, and relentless economic pressure all fail against a network that simply refuses to accept imposed compromises.",
                "With Lightning Network and a new generation of tools, Bitcoin becomes usable on a truly global scale — fast, accessible, and still fundamentally decentralized.",
                "Today, Bitcoin is more than a technology: it is a living, resilient organism that continues to evolve while keeping its founding principle intact. No one commands. Everyone verifies.",
                "VICTORY. The FIAT system has been defeated — but the battle for sound money is far from over..."
            ],
            IT: [
                "Bitcoin sopravvive alle sue guerre interne e ne esce più forte che mai. Tentativi di controllo, fork aggressivi e pressioni economiche implacabili falliscono tutti di fronte a una rete che semplicemente rifiuta compromessi imposti.",
                "Con Lightning Network e una nuova generazione di strumenti, Bitcoin diventa utilizzabile su scala davvero globale — veloce, accessibile, e ancora fondamentalmente decentralizzato.",
                "Oggi, Bitcoin è più di una tecnologia: è un organismo vivo e resiliente, che continua a evolversi mantenendo intatto il suo principio fondante. Nessuno comanda. Tutti verificano.",
                "VITTORIA. Il sistema FIAT è stato sconfitto — ma la battaglia per il denaro solido è tutt'altro che finita..."
            ]
        },
        bossDefeated: 'BOJ',
        isVictory: true,
        nextChapter: null
    }
};

/**
 * Story progress tracking keys
 * Used by CampaignState to track which chapters have been shown
 */
window.Game.STORY_CHAPTERS = ['PROLOGUE', 'CHAPTER_1', 'CHAPTER_2', 'CHAPTER_3'];

/**
 * Map boss types to chapters shown after their defeat
 */
window.Game.BOSS_TO_CHAPTER = {
    'FEDERAL_RESERVE': 'CHAPTER_1',
    'BCE': 'CHAPTER_2',
    'BOJ': 'CHAPTER_3'
};
