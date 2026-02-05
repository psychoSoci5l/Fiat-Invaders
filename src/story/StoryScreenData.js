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
                "August 15, 1971. President Nixon closes the 'gold window'.",
                "The dollar is no longer backed by gold. The Bretton Woods system collapses.",
                "For the first time in history, all major currencies become pure FIAT money — backed by nothing but government decree.",
                "The printing presses start running. In 50 years, the money supply explodes by 3000%.",
                "But in the depths of the digital frontier, a new challenger is about to emerge..."
            ],
            IT: [
                "15 agosto 1971. Il presidente Nixon chiude la 'finestra dell'oro'.",
                "Il dollaro non è più ancorato all'oro. Il sistema di Bretton Woods crolla.",
                "Per la prima volta nella storia, tutte le principali valute diventano pura moneta FIAT — sostenute solo da decreti governativi.",
                "Le stampanti iniziano a girare. In 50 anni, l'offerta di moneta esplode del 3000%.",
                "Ma nelle profondità della frontiera digitale, un nuovo sfidante sta per emergere..."
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
                "2008. The global financial system teeters on the edge of collapse.",
                "As banks are bailed out with freshly printed money, an anonymous figure known as Satoshi Nakamoto publishes a whitepaper describing peer-to-peer electronic cash.",
                "January 3, 2009. The first Bitcoin block is mined, inscribed with a message denouncing bank bailouts.",
                "Bitcoin emerges as a response to broken trust: a system without intermediaries, based on mathematics, consensus, and transparency.",
                "In its early days it is fragile, experimental — sustained by a few pioneers who believe in a radical idea: money can exist without authority."
            ],
            IT: [
                "2008. Il sistema finanziario globale vacilla sull'orlo del collasso.",
                "Mentre le banche vengono salvate con denaro appena stampato, una figura anonima nota come Satoshi Nakamoto pubblica un documento che descrive denaro elettronico peer-to-peer.",
                "3 gennaio 2009. Viene minato il primo blocco Bitcoin, inciso con un messaggio che denuncia i salvataggi bancari.",
                "Bitcoin emerge come risposta alla fiducia tradita: un sistema senza intermediari, basato su matematica, consenso e trasparenza.",
                "Nei suoi primi giorni è fragile, sperimentale — sostenuto da pochi pionieri che credono in un'idea radicale: il denaro può esistere senza autorità."
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
                "With growth come conflicts. Bitcoin becomes more than an experiment.",
                "The debate over its future divides the community: big blocks or small, speed or decentralization.",
                "Scaling Bitcoin conferences become ideological battlefields.",
                "A key concept emerges with force: decisions are not made by power, but by consensus.",
                "Solutions like Segregated Witness seek a balance between opposing visions, proving that Bitcoin evolves not by command, but by collective agreement."
            ],
            IT: [
                "Con la crescita arrivano i conflitti. Bitcoin diventa più di un esperimento.",
                "Il dibattito sul suo futuro divide la comunità: blocchi grandi o piccoli, velocità o decentralizzazione.",
                "Le conferenze di Scaling Bitcoin diventano campi di battaglia ideologici.",
                "Un concetto chiave emerge con forza: le decisioni non sono prese dal potere, ma dal consenso.",
                "Soluzioni come Segregated Witness cercano un equilibrio tra visioni opposte, dimostrando che Bitcoin evolve non per comando, ma per accordo collettivo."
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
                "Bitcoin survives the internal wars and consolidates as global infrastructure.",
                "Attempts at control, aggressive forks, and economic pressures fail against a network that refuses imposed compromises.",
                "Lightning Network and new tools emerge, making Bitcoin usable on a global scale.",
                "Today Bitcoin is not just a technology: it is a living organism, resistant, that continues to evolve while maintaining its founding principle intact.",
                "No one commands. Everyone verifies.",
                "VICTORY. The FIAT system has been defeated. But the battle for sound money continues..."
            ],
            IT: [
                "Bitcoin sopravvive alle guerre interne e si consolida come infrastruttura globale.",
                "Tentativi di controllo, fork aggressivi e pressioni economiche falliscono di fronte a una rete che rifiuta compromessi imposti.",
                "Lightning Network e nuovi strumenti emergono, rendendo Bitcoin utilizzabile su scala globale.",
                "Oggi Bitcoin non è solo una tecnologia: è un organismo vivo, resistente, che continua a evolversi mantenendo intatto il suo principio fondante.",
                "Nessuno comanda. Tutti verificano.",
                "VITTORIA. Il sistema FIAT è stato sconfitto. Ma la battaglia per il denaro solido continua..."
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
