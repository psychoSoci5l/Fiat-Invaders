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
            EN: 'The Breaking Point',
            IT: 'Il Punto di Rottura'
        },
        paragraphs: {
            EN: [
                "For decades, every dollar in the world carried a promise: it could be exchanged for real gold. On August 15, 1971, President Nixon broke that promise forever.",
                "With that single act, money lost its anchor. For the first time in history, no currency on Earth was backed by anything real — only by the word of governments. This is what we call FIAT money.",
                "Free from any limit, governments began printing money at will. Over the next 50 years, the amount of money in the world exploded by over 3000% — silently stealing value from every paycheck and every saving.",
                "But somewhere, in the depths of the digital frontier, a new challenger is about to emerge..."
            ],
            IT: [
                "Per decenni, ogni dollaro al mondo portava una promessa: poteva essere scambiato con oro vero. Il 15 agosto 1971, il presidente Nixon infranse quella promessa per sempre.",
                "Con quel singolo atto, il denaro perse la sua àncora. Per la prima volta nella storia, nessuna valuta al mondo era garantita da qualcosa di reale — solo dalla parola dei governi. Questo è ciò che chiamiamo moneta FIAT.",
                "Liberi da ogni limite, i governi iniziarono a stampare denaro a volontà. Nei 50 anni successivi, la quantità di denaro nel mondo esplose di oltre il 3000% — rubando silenziosamente valore a ogni stipendio e ogni risparmio.",
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
                "In 2008, the global financial system teeters on the edge of collapse. Governments rescue the banks with freshly printed money, while ordinary people watch their savings vanish. Those responsible face no consequences.",
                "In the midst of this chaos, an anonymous figure known as Satoshi Nakamoto publishes a blueprint for something radical: digital money that needs no banks, no governments, no middlemen. Just mathematics.",
                "On January 3, 2009, Bitcoin comes to life. Its creator embeds a newspaper headline about bank bailouts into its very first transaction — a permanent reminder of why it was built.",
                "In its early days, Bitcoin is fragile, kept alive by a handful of pioneers who share one belief: that money can exist without authority — built on nothing but math, agreement, and transparency."
            ],
            IT: [
                "Nel 2008, il sistema finanziario globale vacilla sull'orlo del collasso. I governi salvano le banche con denaro appena stampato, mentre la gente comune vede i propri risparmi svanire. I responsabili non subiscono conseguenze.",
                "Nel mezzo di questo caos, una figura anonima nota come Satoshi Nakamoto pubblica il progetto di qualcosa di radicale: denaro digitale che non ha bisogno di banche, governi, intermediari. Solo matematica.",
                "Il 3 gennaio 2009, Bitcoin prende vita. Il suo creatore inserisce un titolo di giornale sui salvataggi bancari nella sua primissima transazione — un promemoria permanente del motivo per cui è stato creato.",
                "Nei suoi primi giorni, Bitcoin è fragile, tenuto in vita da una manciata di pionieri che condividono un'unica convinzione: che il denaro possa esistere senza autorità — costruito su nient'altro che matematica, accordo e trasparenza."
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
            EN: 'The War Within',
            IT: 'La Guerra Interna'
        },
        paragraphs: {
            EN: [
                "As Bitcoin grows, so do the conflicts around it. What started as a small experiment is now a global movement — and its community is tearing itself apart over how to handle millions of new users.",
                "Some want to make it faster at any cost. Others insist that Bitcoin must stay independent — owned by no one, controlled by no one — even if that means being slower. Debates turn into ideological wars.",
                "But through the turmoil, a powerful idea survives: no single person, company, or government gets to decide Bitcoin's future. Changes happen only when thousands of independent voices agree.",
                "Bitcoin emerges from its civil war changed but unbroken, proving something extraordinary: it cannot be controlled, not even by its own creators. It evolves only by the will of its people."
            ],
            IT: [
                "Man mano che Bitcoin cresce, crescono anche i conflitti. Quello che era un piccolo esperimento è ora un movimento globale — e la sua comunità si sta lacerando su come gestire milioni di nuovi utenti.",
                "Alcuni vogliono renderlo più veloce a ogni costo. Altri insistono che Bitcoin debba restare indipendente — di proprietà di nessuno, controllato da nessuno — anche a costo di essere più lento. I dibattiti diventano guerre ideologiche.",
                "Ma attraverso le turbolenze, un'idea potente sopravvive: nessuna persona, azienda o governo può decidere il futuro di Bitcoin. I cambiamenti avvengono solo quando migliaia di voci indipendenti concordano.",
                "Bitcoin emerge dalla sua guerra civile cambiato ma intatto, dimostrando qualcosa di straordinario: non può essere controllato, nemmeno dai suoi stessi creatori. Evolve solo per volontà della sua gente."
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
                "Bitcoin survives its internal wars and emerges stronger than ever. Governments try to ban it. Corporations try to replace it. Rivals try to split it. All fail against a network that simply refuses to die.",
                "New technologies make Bitcoin faster and easier to use than ever, bringing it within reach of anyone with a phone. It works everywhere, belongs to everyone, and answers to no one.",
                "Today, Bitcoin is more than a technology: it is a living network that grows stronger with every attack, every ban, every crisis. Its rule is simple and absolute. No one commands. Everyone verifies.",
                "VICTORY. The FIAT system has been defeated — but the fight for honest money is far from over..."
            ],
            IT: [
                "Bitcoin sopravvive alle sue guerre interne e ne esce più forte che mai. I governi provano a vietarlo. Le corporazioni provano a sostituirlo. I rivali provano a dividerlo. Tutti falliscono contro una rete che rifiuta di morire.",
                "Nuove tecnologie rendono Bitcoin più veloce e semplice da usare che mai, mettendolo alla portata di chiunque abbia un telefono. Funziona ovunque, appartiene a tutti, e non risponde a nessuno.",
                "Oggi, Bitcoin è più di una tecnologia: è una rete vivente che diventa più forte a ogni attacco, ogni divieto, ogni crisi. La sua regola è semplice e assoluta. Nessuno comanda. Tutti verificano.",
                "VITTORIA. Il sistema FIAT è stato sconfitto — ma la lotta per un denaro onesto è tutt'altro che finita..."
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
