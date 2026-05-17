# ADR-0016: Story System Architecture

## Status
Accepted

## Date
2026-05-17

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Vanilla JavaScript (Canvas 2D, no framework) |
| **Domain** | Core / UI / Narrative |
| **Knowledge Risk** | LOW — pattern is already shipped and active in v7.12.14 |
| **References Consulted** | `src/story/StoryScreen.js`, `src/story/StoryScreenData.js`, `src/story/StoryBackgrounds.js`, `src/story/StoryManager.js`, `src/story/DialogueUI.js`, `src/story/DialogueData.js`, `src/main.js`, `src/core/GameplayCallbacks.js`, `src/core/GameStateMachine.js`, `src/managers/CampaignState.js` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | None — pattern is already shipped and active |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0001 (GameStateMachine), ADR-0003 (EventBus), ADR-0002 (Canvas 2D Rendering), ADR-0007 (V8 LevelScript) |
| **Enables** | All V8 campaign narrative flows, PROLOGUE onboarding, chapter transitions, dialogue system |
| **Blocks** | None |
| **Ordering Note** | Story layer sits on top of Foundation ADRs + LevelScript; it consumes game state but never drives it |

## Context

### Problem Statement

Il layer Story (6 moduli in `src/story/`, layer order 9 in `index.html`) gestisce l'intero sistema narrativo della campagna V8: cinematiche tra livelli, dialoghi in-game ironici crypto-themed, e sfondi animati per capitolo. Questo sistema è l'unico layer senza ADR dedicato — la sua architettura è "tribal knowledge" distribuita tra codice e un GDD marginale (v8-scroller.md sezione C.7). La documentazione formale è necessaria per:

1. Rendere esplicite le decisioni architetturali implicite nel codice
2. Fornire un contratto chiaro per future espansioni (Visual Novel phase 2)
3. Tracciare la copertura TR-ID del sistema narrativo

### Current State

Il sistema funziona ed è stabile dalla v7.5.0. È composto da 6 moduli caricati nell'ordine:
1. `StoryScreenData.js` — dati narrativi bilingue (4 capitoli)
2. `StoryBackgrounds.js` — sfondi animati canvas per capitolo
3. `StoryScreen.js` — renderer full-screen crawl stile Star Wars
4. `DialogueData.js` — dialoghi ironici crypto-themed
5. `StoryManager.js` — trigger dialoghi event-driven
6. `DialogueUI.js` — UI DOM per dialoghi (typewriter effect)

Il flusso è orchestrato da `main.js` tramite `GameStateMachine.STORY_SCREEN` e `CAMPAIGN_VICTORY`, con `GameplayCallbacks.js` che decide quando mostrare story chapter, intermission, o vittoria campagna.

### Constraints

- Rendering deve usare Canvas 2D (no DOM per cinematiche) — fonte: ADR-0002
- Nessuna dipendenza runtime esterna — fonte: control manifest
- I dati narrativi devono essere bilingue EN/IT come tutto il gioco
- Deve coesistere con il flusso Tutorial (PROLOGUE gate via `_maybeShowPrologueThenCountdown`)
- Le cinematiche non devono bloccare il game loop (update + draw continuano durante STORY_SCREEN)
- Tap/click per speed-up e skip — fonte: mobile-first UX

## Decision

### Decision 1: StoryScreen come renderer Canvas full-screen (Star Wars crawl)

`StoryScreen` (`src/story/StoryScreen.js`) è un modulo IIFE che esporta un oggetto API su `window.Game.StoryScreen`. NON usa DOM per il rendering del testo narrativo — tutto è disegnato su Canvas 2D.

**Meccanica crawl:**
- Il testo viene pre-misurato in `buildLayout(ctx, width)` — ogni linea è un oggetto `{kind, font, segments, relY}` con posizione relativa
- `scrollY` parte da `canvasHeight` (testo sotto lo schermo) e scala verso `scrollRestY`
- `scrollRestY` è calcolato perché l'ultima linea si fermi al 60% dell'altezza (`REST_RATIO: 0.60`)
- Velocità scroll: 38 px/s normale, 114 px/s (3x) al tap
- Edge fade mask top/bottom (80px) per effetto cinematografico

**Keyword highlighting:**
- Array `HIGHLIGHT_KEYWORDS` (case-insensitive, word-boundary): bitcoin, fiat, satoshi nakamoto, nixon, peer-to-peer, honest money, vittoria, victory, etc.
- Percentuali (`\d[\d,.]*%`) e anni (`\b(19|20)\d{2}\b`) in viola chiaro
- Sistema `getHighlightSegments(line)` produce array di `{text, color}` ordinati per offset

**Stati interni (closure variables, non esposti):**
- `isActive`, `fadeAlpha`, `fadeDir` (-1/0/1), `scrollY`, `scrollRestY`, `scrollSpeed`
- `readyForInput` — true quando lo scroll ha raggiunto `scrollRestY` (mostra "[ TAP TO CONTINUE ]")
- `exitRequested` — true dopo tap su ready, attiva fade-out → `forceHide()` → `onCompleteCallback()`

**API pubblica:** `show(storyId, onComplete)`, `hide()`, `forceHide()`, `handleTap()`, `update(dt)`, `draw(ctx, w, h)`, `isShowing()`, `setLanguage(lang)`, `setDimensions(w, h)`

### Decision 2: StoryScreenData bilingue EN/IT con struttura a capitoli

`StoryScreenData` (`src/story/StoryScreenData.js`) assegna `window.Game.STORY_CONTENT`, un dizionario di 4 capitoli chiave:

```
PROLOGUE  → dopo tutorial, prima di level 1 (periodo: 1971, Nixon shock)
CHAPTER_1 → dopo boss FEDERAL_RESERVE (periodo: 2008-2010, nascita Bitcoin)
CHAPTER_2 → dopo boss ECB (periodo: 2011-2016, guerra interna / blocksize)
CHAPTER_3 → dopo boss BOJ (periodo: 2017-2024, adozione globale)
```

Ogni capitolo ha struttura:
- `id` — chiave identificativa
- `period` — anno/periodo storico
- `title` — `{EN: "...", IT: "..."}`
- `paragraphs` — `{EN: [...], IT: [...]}`, ogni elemento è una stringa (wrappata in `getWrappedLines`)
- `nextChapter` — ID del capitolo successivo (o assente per l'ultimo)
- `bossDefeated` — boss type che sblocca il capitolo

La mappa `BOSS_TO_CHAPTER` (non ancora esposta formalmente) è mantenuta in `GameplayCallbacks._maybeShowStoryChapter()` che mappa `bossType → storyId`:
```
FEDERAL_RESERVE → CHAPTER_1
ECB             → CHAPTER_2
BOJ             → CHAPTER_3
```

### Decision 3: StoryBackgrounds come renderer animati per capitolo

`StoryBackgrounds` (`src/story/StoryBackgrounds.js`) è un modulo IIFE che gestisce 4 sfondi cinematici distinti, ciascuno con `init*()` e `update*()` dedicati:

| Capitolo | Tema | Effetto |
|----------|------|---------|
| PROLOGUE | Monete d'oro che cadono | Le monete cadono, a `DISSOLVE_START` (70% altezza) iniziano a ingrigire/dissolversi in polvere. Spark particles al dissolvimento. |
| CHAPTER_1 | Matrix hex rain | Caratteri hex verdi (`0-9a-f`) che cadono con glow. Al centro, simbolo ₿ pulsante con glow viola. |
| CHAPTER_2 | Nodi rete connessi | 12 nodi (`NETWORK_NODES`) connessi da archi pulse. Due colori: viola (`#bb44ff`) e cyan (`#00f0ff`). Connessioni che pulsano con `sin(elapsed * PULSE_SPEED)`. |
| CHAPTER_3 | Globo lightning network | Globo wireframe rotante con fulmini lightning network a zigzag. Fulmini generati probabilisticamente tra nodi adiacenti. |

Ogni background risponde a:
- `init(w, h)` — inizializza particelle/nodi/stato
- `update(dt)` — aggiorna posizioni, animazioni, dissolvenze
- `draw(ctx, w, h, alpha)` — renderizza con alpha globale per fade compatibile
- `resize(w, h)` — reinventario su ridimensionamento viewport

Configurazioni in `cfg` (BalanceConfig `STORY_BACKGROUNDS`).

### Decision 4: DialogueUI + DialogueData come sistema dialoghi DOM-based

**DialogueUI** (`src/story/DialogueUI.js`) è una classe con singleton `window.Game.DialogueUI`:

- Crea elementi DOM (`#dialogue-container`, `.dialogue-box`, `#dialogue-speaker`, `#dialogue-text`, `.dialogue-tap-hint`)
- Typewriter effect: `typewriterSpeed: 30ms` per carattere (0 = istantaneo)
- Auto-dismiss dopo `displayTime: 4000ms`
- Click/tap per dismiss immediato
- Colori speaker basati su mappa `_getSpeakerColor()`: BTC=viola, ETH=lavanda, SOL=cyan, banchieri centrali=rosso/blu
- Eventi: emette `dialogue:show` e `dialogue:shown`, `dialogue:hidden`
- Metodo `destroy()` per cleanup completo (listener + DOM)

**DialogueData** (`src/story/DialogueData.js`) assegna `window.Game.DIALOGUES`, organizzato per categoria:
- `SHIP_INTRO` — per tipo nave (BTC/ETH/SOL), array di one-liner ironici
- `LEVEL_COMPLETE` — per numero livello (1-4), distruzione valuta fiat theme
- `LEVEL_COMPLETE_GENERIC` — fallback senza numero specifico
- `BOSS_INTRO` — per boss type all'entrata
- `BOSS_PHASE` — per boss type → fase (1-3), cambio fase con trash talk
- `BOSS_DEFEAT` — per boss type alla sconfitta
- `GAME_OVER` — per tipo nave alla morte
- `CONTINUE`, `NEW_CYCLE`, `BEAR_MARKET_START` — eventi speciali
- `TIPS` — tips casuali per loading/pausa

### Decision 5: StoryManager come singleton consumer di eventi

`StoryManager` (`src/story/StoryManager.js`) è una classe con singleton `window.Game.Story`:

È un **consumer puro** — non pubblica mai eventi, solo reagisce a chiamate di metodo dai sistemi core:
- `onShipSelect(shipType)` — chiamato da `main.js` a inizio partita
- `onLevelComplete(level)` — chiamato da `GameplayCallbacks` dopo level advance
- `onBossIntro(bossType)` — chiamato da `GameplayCallbacks` all'entrata boss
- `onBossPhaseChange(phase, bossType)` — chiamato da `Boss.js` al cambio fase
- `onBossDefeat(bossType)` — chiamato da `GameplayCallbacks` dopo boss defeat
- `onGameOver()` — chiamato da `main.js` alla morte player
- `onContinue()` — chiamato da `main.js` al continue
- `onNewCycle()`, `onBearMarketStart()` — eventi economici

Flusso di chiamata:
```
GameplayCallbacks / Boss / main.js
  → Game.Story.onEventName(...)
    → this._randomPick(dialogues)
    → this._formatDialogue(dialogue)
    → Game.DialogueUI.show(formatted)
    → Game.Events.emit('dialogue:show', formatted)
```

La formattazione supporta sia stringhe semplici che oggetti `{speaker, text, portrait, mood}` (pronto per Visual Novel Phase 2 con ritratti).

### Decision 6: Flusso STORY_SCREEN integrato nel GameStateMachine

Il flusso narrativo della campagna è:

```
PROLOGUE → STORY_SCREEN (PROLOGUE crawl)
  → onComplete: countdown(3) → PLAY (level 1)
  → boss defeat → GameplayCallbacks._maybeShowStoryChapter()
    → se c'è chapter: STORY_SCREEN (CHAPTER_N)
      → onComplete: INTERMISSION (continue prompt)
        → PLAY (next level)
    → se ultimo boss: CAMPAIGN_VICTORY
```

**Gate in `main.js`:**
- `showStoryScreen(storyId)` — chiama `Game.StoryScreen.show(storyId, onComplete)`, transizione a `STORY_SCREEN`
- `_maybeShowPrologueThenCountdown()` — se `CampaignState.getStoryProgress() === 0` e tutorial completato, mostra PROLOGUE; altrimenti countdown diretto
- `advanceToNextV8Level()` — in `CAMPAIGN_VICTORY` o dopo intermission, resetta e avanza

**Integrazione DrawPipeline:**
- Step 2 (`_execLayer(2)`) della pipeline: se `GameStateMachine.currentState === 'STORY_SCREEN'`, chiama `StoryScreen.update(dt)` e `StoryScreen.draw(ctx)` invece del normale rendering gameplay
- Step 4: come sopra per `CAMPAIGN_VICTORY`

**Persistenza (CampaignState):**
- `storyProgress`: intero che traccia quanti capitoli story sono stati visti (0 = nessuno, 1 = dopo boss 1, etc.)
- Salvato in `fiat_campaign` localStorage via MigrationSystem

## Consequences

### Positive

- Separazione netta: dati (StoryScreenData, DialogueData) separati da rendering (StoryScreen, DialogueUI) e logica (StoryManager)
- Tutti e 6 i moduli sono indipendenti — StoryScreen non conosce DialogueUI, DialogueData non conosce StoryManager
- Pronto per espansione Visual Novel: DialogueUI supporta già `portrait` e `mood` nel formato dati
- Localizzazione centralizzata: ogni testo è `{EN, IT}` con fallback a EN

### Negative

- StoryScreen è un modulo IIFE con stato in closure — non istanziabile, non testabile in isolamento (trade-off accettato per performance e semplicità)
- La mappa `BOSS_TO_CHAPTER` è implicita in `GameplayCallbacks._maybeShowStoryChapter()` invece che in `StoryScreenData` — rende l'aggiunta di capitoli un cambiamento in due file
- DialogueUI usa DOM, StoryScreen usa Canvas — due paradigmi di rendering nello stesso layer (giustificato: performance Canvas per crawl lungo, accessibilità DOM per dialoghi brevi)
- Nessuna coda formale dialoghi — se due trigger chiamano StoryManager nello stesso frame, il secondo sovrascrive il primo (non ancora accaduto in pratica)

### Neutral

- 6 moduli con ~1,500 LOC totali, ~80KB — layer leggero
- Pubblicazione eventi `dialogue:show`, `story:show` permette ad altri sistemi di reagire (es. AudioSystem potrebbe cambiare traccia)

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Desync lingua tra StoryScreen e DialogueUI | LOW | Bassa | Entrambi leggono `Game._currentLang`; `setLanguage()` su StoryScreen forza rebuild layout |
| PROLOGUE saltato per bug tutorial gate | LOW | Media | `_maybeShowPrologueThenCountdown` ha fallback diretto a countdown |
| Crawl performance degradata su mobile lento | LOW | Media | `buildLayout()` pre-misura TUTTO; `update()` e `draw()` sono O(linee visibili) con culling |

## Performance Implications

| Metric | Value |
|--------|-------|
| StoryScreen.update | O(1) — aggiorna solo scrollY, fadeAlpha, timer blink + background particles |
| StoryScreen.draw | O(linee visibili) ~20-30 drawText calls; culling scarta linee fuori viewport |
| StoryBackgrounds.draw | O(particelle) ~80 coins o ~200 hex chars o ~12 nodi + archi |
| DialogueUI.show | O(n) in length text (typewriter interval) |
| Memory | Layout lines: ~100-200 oggetti da ~6 campi ciascuno = ~10KB |

## Validation Criteria

- [x] PROLOGUE mostrato prima del primo livello in V8 mode
- [x] CHAPTER_1 mostrato dopo sconfitta FEDERAL_RESERVE
- [x] Crawl scrolla automaticamente e si ferma all'ultima linea
- [x] Tap accelera scroll a 3x
- [x] Tap su "[ TOCCA PER CONTINUARE ]" → fade out → callback
- [x] Keyword highlighting viola su "bitcoin", "satoshi nakamoto", "vittoria", etc.
- [x] Sfondi animati: monete (PROLOGUE), matrix (CH1), rete (CH2), lightning (CH3)
- [x] Dialoghi mostrati a ship select, boss intro/phase/defeat, level complete, game over
- [x] Typewriter effect nei dialoghi, dismiss via tap o timeout 4s
- [x] Lingua switch (EN/IT) ricarica testi in entrambi i sistemi

## GDD Requirements Addressed

| GDD Document | System | Requirement | How This ADR Satisfies It |
|-------------|--------|-------------|--------------------------|
| `design/gdd/v8-scroller.md` | V8 Scroller | C.7 — "Cinematic inter-level storytelling with scroll-text narrative" | StoryScreen + StoryScreenData forniscono crawl cinematico tra livelli |
| `design/gdd/v8-scroller.md` | V8 Scroller | Boss defeat triggers story progression | StoryManager.onBossDefeat + _maybeShowStoryChapter mappano boss→capitolo |
| `design/gdd/game-concept.md` | Game Concept | Two distinct modes: V8 Campaign + Arcade | STORY_SCREEN state è esclusivo della campagna V8; arcade non lo tocca |
| `design/gdd/game-pillars.md` | Game Pillars | "Curated, scripted shoot-em-up experience" | Il sistema story aggiunge contesto narrativo alla progressione scriptata della campagna |

## Related

- ADR-0007 (V8 Scroller LevelScript) — la campagna che il sistema story narra
- ADR-0001 (GameStateMachine) — fornisce gli stati STORY_SCREEN e CAMPAIGN_VICTORY
- ADR-0002 (Canvas 2D) — il rendering canvas che StoryScreen usa
- `src/main.js` — orchestratore del flusso story (showStoryScreen, advanceToNextV8Level)
- `src/core/GameplayCallbacks.js` — decisione se mostrare chapter, intermission, o vittoria
