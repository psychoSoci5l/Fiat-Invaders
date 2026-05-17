# Architecture Observations — FIAT vs CRYPTO

**Date:** 2026-05-16
**Based on:** `docs/architecture/architecture-map.json` + `docs/architecture/architecture-map.html`
**Game Version:** v7.12.14
**Engine:** Vanilla JavaScript (ES6+) / Canvas 2D
**Total Modules:** 74 across 10 layers
**ADRs:** 13 Accepted
**GDDs:** 7 Approved

---

## Executive Summary

L'architettura di FIAT vs CRYPTO è il risultato di 7 major version di evoluzione iterativa. La mappatura completa rivela un sistema coerente e ben disciplinato, con punti di forza evidenti (disaccoppiamento tramite EventBus, zero dipendenze, ADR coverage al 100% sui sistemi core) e alcune aree di attenzione che emergeranno con l'ulteriore evoluzione del gioco. Questo documento analizza 10 osservazioni strutturate, ciascuna con: evidenza, analisi, rischio, e raccomandazione.

---

## Osservazione 1 — Core Systems è un "God Layer" (28 moduli)

### Evidenza

Il layer **Core Systems** (order: 2) contiene 28 moduli su 74 totali — il **38%** dell'intera codebase. Nessun altro layer supera i 9 moduli.

| Layer | Moduli | % del totale |
|-------|--------|-------------|
| Core Systems | 28 | 37.8% |
| UI | 8 | 10.8% |
| Managers | 9 | 12.2% |
| Entities | 7 | 9.5% |
| Story | 6 | 8.1% |
| Utils | 7 | 9.5% |
| Foundation | 6 | 8.1% |
| V8 Campaign | 1 | 1.4% |
| Audio | 1 | 1.4% |
| Config | 1 | 1.4% |

### Analisi

Il layer Core Systems mescola responsabilità concettualmente distinte:

**Sottogruppo A — Rendering infrastrutturale:**
- `DrawPipeline`, `GlowManager`, `OffscreenCanvas`, `CullingHelper`
- Questi gestiscono *come* si disegna, non *cosa* si disegna

**Sottogruppo B — Gameplay systems:**
- `CollisionSystem`, `BulletSystem`, `DropSystem`, `ScrollEngine`
- Questi gestiscono la logica di gioco

**Sottogruppo C — VFX e presentation:**
- `ParticleSystem`, `EffectsRenderer`, `SkyRenderer`, `WeatherController`, `TitleAnimator`
- Questi gestiscono l'estetica visiva

**Sottogruppo D — Audio-reactive:**
- `HarmonicConductor`, `HarmonicSequences`
- Sincronizzano gameplay e musica

**Sottogruppo E — UI systems (che vivono nel layer sbagliato):**
- `FloatingTextManager`, `PerkIconManager`, `MessageSystem`, `MemeEngine`
- Sono sistemi di presentazione ma risiedono in Core invece che in UI

### Rischio: MEDIO

Attualmente il control manifest impedisce accoppiamento indesiderato, quindi il rischio è contenuto. Ma:
- Un nuovo sviluppatore non capisce dove inserire un nuovo sistema
- Il file `index.html` ha 84 `<script>` tag — ogni aggiunta aumenta la complessità di load order
- Se il gioco raggiungesse v8/v9 con nuovi sistemi, Core supererebbe i 35-40 moduli

### Raccomandazione

Non refactorizzare ora — il gioco è shipped e funziona. Ma per il futuro:

1. **Estrarre un layer "Rendering Infra"** (order: 1.5) con DrawPipeline, GlowManager, OffscreenCanvas, CullingHelper
2. **Spostare FloatingTextManager, PerkIconManager, MessageSystem, MemeEngine** nel layer UI (order: 6) — sono presentation, non gameplay
3. **Estrarre un layer "Audio-Reactive"** (order: 2.5) con HarmonicConductor e HarmonicSequences

Questo porterebbe Core Systems da 28 a ~16 moduli, una dimensione più gestibile.

---

## Osservazione 2 — CollisionSystem è il singolo punto di massimo coupling

### Evidenza

Il CollisionSystem pubblica **3 dei 9 eventi** dell'intero event bus:

| Evento | Publisher | Subscribers | Count |
|--------|-----------|-------------|-------|
| `entity:died` | CollisionSystem | DropSystem, ArcadeModifiers, StatsTracker, AchievementSystem, WaveManager, PerkManager | **6** |
| `player:died` | CollisionSystem | DropSystem, GameStateMachine, AudioSystem, StatsTracker | **4** |
| `player:damaged` | CollisionSystem | EffectsRenderer, AudioSystem, QualityManager | **3** |

Totale: **13 sottoscrizioni** dipendono dal CollisionSystem. Nessun altro sistema supera i 2 eventi pubblicati.

### Analisi

Il CollisionSystem è il **sistema più influente** dell'architettura. Un suo malfunzionamento ha effetto a cascata su:

- DropSystem → niente power-up
- ArcadeModifiers → combo non aggiornati
- StatsTracker → statistiche errate
- AchievementSystem → achievement non triggerati
- WaveManager → progressione bloccata
- PerkManager → evoluzione armi bloccata
- GameStateMachine → transizioni errate (gameover non triggerato)
- AudioSystem → SFX mancanti
- EffectsRenderer → nessun feedback visivo
- QualityManager → quality adjustments non applicati

Inoltre, il CollisionSystem è anche il **più chiamato** nel game loop: la spatial grid viene ricostruita ogni frame (O(n) rebuild + AABB checks per cell).

### Rischio: ALTO

Il CollisionSystem è un **single point of failure architetturale**. Se il narrow-phase ha un edge case non gestito (es. entità che attraversano celle multiple senza detection), l'intero gioco si degrada in modi difficili da diagnosticare perché il sintomo appare in sottosistemi lontani.

### Raccomandazione

1. **Aggiungere test di regressione specifici** per il CollisionSystem (attualmente coperto solo da ADR-0004, ma senza test automatizzati nel repo)
2. **Aggiungere un evento `collision:debug`** in modalità debug che logghi ogni collisione rilevata — utile per riprodurre bug
3. **Considerare un wrapper di validazione** che verifichi che ogni `entity:died` emesso corrisponda a un'entità effettivamente rimossa dal SpatialGrid

---

## Osservazione 3 — PerkManager è un "hidden orchestrator"

### Evidenza

Il PerkManager pubblica due eventi che innescano reazioni a catena:

| Evento | Publisher | Subscribers | Effetto |
|--------|-----------|-------------|---------|
| `weapon:evolved` | PerkManager | AudioSystem, EffectsRenderer, ParticleSystem | VFX + SFX + particelle di evoluzione |
| `perk:selected` | PerkManager | Player, AudioSystem | Config arma + SFX selezione |

Nessun altro modulo nel layer Managers pubblica eventi. Il PerkManager è l'unico orchestratore cross-layer nascosto dietro l'event bus.

### Analisi

Il PerkManager coordina implicitamente **4 sottosistemi** senza che nessuno di questi lo conosca direttamente:

```
PerkManager
  ├── weapon:evolved → AudioSystem (suono evoluzione)
  │                  → EffectsRenderer (flash/screen shake)
  │                  └→ ParticleSystem (particelle GODCHAIN)
  └── perk:selected → Player (nuova config arma)
                    └→ AudioSystem (suono selezione)
```

Questo è un esempio perfetto del pattern **mediator implicito** reso possibile dall'EventBus (ADR-0003). Il vantaggio è il disaccoppiamento totale: il Player non sa chi ha pubblicato `perk:selected`, e il ParticleSystem non sa cosa ha triggerato `weapon:evolved`.

Lo svantaggio è la **tracciabilità**: per capire cosa succede quando un perk viene selezionato, bisogna:
1. Trovare il PerkManager
2. Cercare `emit("perk:selected")` nel codice
3. Cercare tutti gli `on("perk:selected")` in tutta la codebase

### Rischio: BASSO

Il pattern è intenzionale e ben documentato nell'ADR-0003. Il rischio è solo di **onboarding** — un nuovo sviluppatore potrebbe non capire la catena di reazioni.

### Raccomandazione

1. **Aggiungere un diagramma di sequenza** nell'ADR-0010 (Weapon Evolution) che mostri esplicitamente la catena PerkManager → subscribers
2. **Aggiungere commenti cross-reference** nei file subscribers: `// Triggered by PerkManager via event "weapon:evolved"`
3. **Considerare un evento `perk:chain`** che logghi l'intera catena in modalità debug

---

## Osservazione 4 — Rendering pipeline: 30 step sequenziali, rischio composite mode

### Evidenza

La draw order ha 30 step fissi. Due di questi cambiano il `globalCompositeOperation`:

| Step | Operazione | Composite Mode |
|------|-----------|----------------|
| 10 | Enemy glow pass | `lighter` (additive) |
| 14 | Bullet glow pass | `lighter` (additive) |
| — | Tutti gli altri | `source-over` (default) |

Tra lo step 14 (ultimo glow) e lo step 30 (ultimo draw), ci sono **16 step** che assumono il composite mode default.

### Analisi

Canvas 2D mantiene lo stato del `globalCompositeOperation` fino a quando non viene cambiato esplicitamente. Se uno qualsiasi degli step 15-30 (particelle, floating text, HUD, debug overlay) impostasse accidentalmente `globalCompositeOperation = 'lighter'` senza ripristinarlo, **tutti gli step successivi** verrebbero renderizzati con blending additivo.

Il rischio è concreto perché:
- Il ParticleSystem (step 22) usa già `lighter` per le particelle — ma lo gestisce internamente con save/restore
- Se un futuro sviluppatore aggiungesse un effetto glow senza il corrispondente `ctx.restore()`, il bug sarebbe visivamente evidente ma difficile da tracciare (apparirebbe come "tutto è troppo luminoso dopo le particelle")

### Rischio: MEDIO-BASSO

Attualmente il codice è stabile e il DrawPipeline.js orchestra correttamente. Ma la mancanza di un **meccanismo di enforcement** rende il sistema fragile rispetto a modifiche future.

### Raccomandazione

1. **Aggiungere un'asserzione nel DrawPipeline** che verifichi `ctx.globalCompositeOperation === 'source-over'` prima di ogni step non-glow
2. **Documentare esplicitamente** nel control manifest: "Ogni uso di `globalCompositeOperation` deve essere wrapped in `ctx.save()`/`ctx.restore()`"
3. **Considerare un wrapper** `withComposite(mode, fn)` che garantisca il restore automatico

---

## Osservazione 5 — AudioSystem aggiornato alla posizione 23 su 25 nel game loop

### Evidenza

L'update order del game loop posiziona l'AudioSystem allo step 23 su 25:

```
21. HarmonicConductor update
22. WeatherController update
23. AudioSystem update (music sync)     ← QUI
24. ArcadeModifiers update
25. UI updates
```

### Analisi

L'AudioSystem viene aggiornato **dopo** tutti i sistemi gameplay (Player, Enemies, Boss, CollisionSystem, DropSystem, ecc.). Questo significa che:

- Se il Player muore allo step 5, il suono della morte (step 23) viene riprodotto **18 step dopo** — circa 1-2ms di ritardo aggiuntivo oltre ai 16ms del frame
- Se un nemico viene colpito allo step 12 (CollisionSystem), il SFX corrispondente viene triggerato allo step 23 — **11 step di ritardo**

A 60fps (16.67ms per frame), questo ritardo è **impercettibile** per l'orecchio umano (soglia ~20ms). Quindi funzionalmente non è un problema.

Tuttavia, c'è una **incongruenza concettuale**: l'HarmonicConductor (step 21) legge l'audio clock per sincronizzare le azioni nemiche, ma l'AudioSystem (step 23) che gestisce quell'orologio viene aggiornato dopo. In pratica, l'HarmonicConductor legge un clock che potrebbe non essere ancora stato aggiornato per il frame corrente.

### Rischio: BASSO

Il ritardo è sub-millisecondico e impercettibile. L'incongruenza HarmonicConductor → AudioSystem è teorica perché l'audio clock è continuo (Web Audio API `currentTime`), non aggiornato per-frame.

### Raccomandazione

1. **Spostare AudioSystem update prima di HarmonicConductor** (step 21 → step 20) per coerenza concettuale
2. **Documentare** nell'ADR-0002 perché l'ordine è quello attuale (se c'è una ragione storica)

---

## Osservazione 6 — Due sistemi di spawn mutuamente esclusivi in layer diversi

### Evidenza

| Sistema | Layer | Modalità | Gestione |
|---------|-------|----------|----------|
| WaveManager | Managers (order: 4) | Arcade | `isArcadeMode() === true` |
| LevelScript | V8 Campaign (order: 7) | Campaign | `isArcadeMode() === false` |

I due sistemi sono in **layer diversi** (4 vs 7) ma gestiscono la **stessa responsabilità concettuale**: spawnare nemici.

### Analisi

Questa separazione è architetturalmente corretta — WaveManager è procedurale, LevelScript è deterministico — ma crea un problema di **asimmetria di manutenzione**:

- Un bug nel sistema di spawn va cercato in due file diversi
- Le feature di spawn (es. un nuovo tipo di formazione) vanno implementate due volte
- I test di spawn vanno scritti due volte
- Il `isArcadeMode()` gate è sparso in entrambi i sistemi

La separazione in layer diversi (Managers vs V8 Campaign) rende anche più difficile vedere che sono **due implementazioni della stessa astrazione**.

### Rischio: MEDIO

Il rischio non è di bug (i due sistemi sono ben isolati) ma di **duplicazione di sforzo**. Ogni nuova feature di spawn costa il doppio.

### Raccomandazione

1. **Definire un'interfaccia `SpawnSystem`** astratta con metodi: `update(dt)`, `isActive()`, `getEnemyCount()`
2. **Implementare `WaveSpawnSystem` e `ScriptedSpawnSystem`** come due implementazioni
3. **Un singolo punto di wiring** in main.js sceglie quale implementazione usare
4. Questo non richiede refactor immediato — può essere fatto incrementalmente

---

## Osservazione 7 — Story layer: 6 moduli, 0 ADR dedicato

### Evidenza

Il layer Story contiene 6 moduli:

| Modulo | File | ADR |
|--------|------|-----|
| StoryManager | `src/story/StoryManager.js` | ❌ Nessuno |
| StoryScreen | `src/story/StoryScreen.js` | ❌ Nessuno |
| DialogueUI | `src/story/DialogueUI.js` | ❌ Nessuno |
| StoryScreenData | `src/story/StoryScreenData.js` | ❌ Nessuno |
| StoryBackgrounds | `src/story/StoryBackgrounds.js` | ❌ Nessuno |
| DialogueData | `src/story/DialogueData.js` | ❌ Nessuno |

Tutti i 7 GDD sono Approved, ma **nessun ADR copre le decisioni architetturali del sistema narrative**.

### Analisi

Lo Story layer è l'unico layer significativo senza copertura ADR. Questo significa che:

- Le decisioni su come lo StoryScreen interagisce con la state machine sono implicite
- Il formato dei dati di StoryScreenData non è formalizzato in un ADR
- La gestione dei background di StoryBackgrounds non ha una decisione architetturale documentata
- Il flusso StoryScreen → PLAY → INTERMISSION → STORY_SCREEN non è coperto da ADR

L'ADR-0001 (GameStateMachine) copre le transizioni da/verso STORY_SCREEN, ma non **come** lo StoryScreen funziona internamente.

### Rischio: BASSO-MEDIO

Attualmente il gioco è shipped e il sistema narrative funziona. Il rischio emerge se:
- Si aggiungono nuovi tipi di narrative (cutscene, dialogue branching)
- Si vuole estendere il sistema per supportare più lingue con asset diversi
- Un nuovo sviluppatore deve modificare il sistema narrative

### Raccomandazione

1. **Creare ADR-0014: Story System Architecture** che documenti:
   - Formato dei dati StoryScreenData
   - Flusso di transizione STORY_SCREEN ↔ altri stati
   - Gestione dei background
   - Sistema di dialogo (DialogueUI + DialogueData)
2. **Priorità**: bassa — il sistema è stabile, ma la documentazione prevenirebbe regressioni future

---

## Osservazione 8 — Persistenza: 7 chiavi localStorage, zero migrazione

### Evidenza

| Dati | Chiave | Meccanismo | Versioning |
|------|--------|------------|------------|
| Campaign progress | `fiat_campaign_state` | localStorage | ❌ Nessuno |
| High scores (story) | `fiat_highscore_story` | localStorage | ❌ Nessuno |
| High scores (arcade) | `fiat_highscore_arcade` | localStorage | ❌ Nessuno |
| Arcade records | `fiat_arcade_records` | localStorage | ❌ Nessuno |
| Settings | `fiat_settings_*` | localStorage | ❌ Nessuno |
| Achievements | `fiat_achievements` | localStorage | ❌ Nessuno |
| Session logs | `fiat_session_log` | localStorage | ❌ Nessuno |

Il Service Worker gestisce il versioning della cache (`SW_VERSION` sync con `Game.VERSION`), ma **nessun sistema gestisce il versioning dei dati localStorage**.

### Analisi

Se il formato di `fiat_campaign_state` cambiasse tra v7 e v8 (es. aggiungendo un nuovo campo per un nuovo sistema), i giocatori con dati salvati dalla v7 avrebbero:

- **JSON parse error** se il nuovo codice si aspetta un campo che non esiste
- **Dati corrotti** se il vecchio formato viene letto dal nuovo codice senza validazione
- **Perdita di progresso** se il fallback è resettare i dati

Questo è un rischio reale per un gioco PWA che gira nel browser — i dati localStorage persistono tra le sessioni e gli aggiornamenti sono automatici (service worker cache-first).

### Rischio: MEDIO-ALTO

Il rischio è proporzionale alla frequenza dei cambiamenti di formato. Attualmente il gioco è stabile, ma ogni nuova feature che tocca CampaignState o AchievementSystem introduce questo rischio.

### Raccomandazione

1. **Aggiungere un campo `version`** in ogni oggetto salvato in localStorage:
   ```json
   { "version": 7, "data": { ... } }
   ```
2. **Creare un `MigrationSystem`** (nuovo modulo in `src/utils/`) che:
   - Legge la versione dei dati salvati
   - Applica migrazioni sequenziali (v6 → v7 → v8)
   - Gestisce fallback per dati corrotti
3. **Priorità**: media — implementare prima della prossima major version

---

## Osservazione 9 — Zero dipendenze runtime: 74 moduli custom

### Evidenza

- **74 moduli** scritti interamente a mano
- **0 npm packages** nel runtime (solo devDependencies: playwright, puppeteer)
- **0 CDN scripts** nell'index.html
- Utility custom: `MathUtils`, `ColorUtils`, `RNG`, `Upgrades`, `RunState`

### Analisi

Questa è sia la forza più grande che il vincolo più restrittivo dell'architettura.

**Vantaggi:**
- Zero attack surface da dipendenze esterne (security)
- Zero bundle size overhead (performance)
- Controllo totale su ogni riga di codice (manutenibilità)
- Compatibilità garantita con tutti i browser target (no polyfill needed)
- Il gioco funziona offline al 100% (PWA-first)

**Svantaggi:**
- Ogni utility è custom — se `MathUtils.lerp` ha un bug, va trovato e fixato internamente
- Se servisse una feature complessa (es. A* pathfinding, tweening avanzato, compression), il costo di implementazione è alto
- Non si beneficia di bugfix della community
- Il conhecimento è tribal — solo chi ha scritto il codice sa come funziona

### Rischio: BASSO (attualmente)

Il gioco è shipped e funziona. Il rischio emerge solo se si aggiungono feature che richiedono librerie esterne.

### Raccomandazione

1. **Mantenere il vincolo "zero dipendenze"** come principio architetturale — è un differenziatore competitivo per un gioco PWA
2. **Documentare esplicitamente** nel control manifest che l'aggiunta di qualsiasi dipendenza runtime richiede un ADR
3. **Creare una pagina di "known limitations"** che elenchi le feature che sarebbero più facili con librerie esterne (per decision-making futuro)

---

## Osservazione 10 — DIP Meter: il sistema più interessante architetturalmente

### Evidenza

Il DIP (Proximity Kill) Meter è l'unico sistema che collega direttamente **5 sottosistemi** di layer diversi:

| Sottosistema | Layer | Ruolo nel DIP |
|-------------|-------|---------------|
| Boss entity | Entities (order: 3) | Calcola distanza verticale dal player |
| RunState | Utils (order: -1) | Memorizza il valore corrente (0-100) |
| EffectsRenderer | Core Systems (order: 2) | Screen flash a DIP=100 |
| PerkManager | Managers (order: 4) | Triggera HYPER auto-activation |
| Graze Meter UI | UI (HTML DOM) | Visualizza la barra di riempimento |

### Analisi

Il DIP Meter è il sistema che meglio incarna il game pillar **"Risk-Reward Decision Density"**. Architetturalmente è interessante perché:

1. **È distribuito**: nessun singolo modulo "possiede" il DIP. Il Boss lo calcola, RunState lo memorizza, EffectsRenderer lo visualizza, PerkManager lo consuma.
2. **È event-driven**: l'auto-attivazione HYPER a DIP=100 triggera una catena di eventi (`perk:selected` → `weapon:evolved`) che coinvolge 4+ sottosistemi.
3. **È stateful ma senza ownership**: il valore DIP vive in RunState (ephemeral), ma la logica di calcolo è nel Boss e la logica di consumo è nel PerkManager.

Questo è un esempio di **emergent architecture** — il sistema è nato probabilmente come feature semplice e si è evoluto organicamente. Funziona perché l'EventBus (ADR-0003) tiene tutto disaccoppiato.

Ma è anche il sistema **più difficile da debuggare**: se il DIP non si riempie correttamente, il bug potrebbe essere in:
- Boss.update() (calcolo distanza sbagliato)
- RunState (valore non aggiornato)
- CollisionSystem (detection di prossimità mancata)
- PerkManager (soglia di attivazione errata)

### Rischio: BASSO

Il sistema funziona ed è testato dal gameplay. Il rischio è solo di **debuggabilità**.

### Raccomandazione

1. **Aggiungere un evento `dip:changed`** che emetta il valore corrente ogni volta che cambia — utile per debug e per eventuali futuri subscriber
2. **Aggiungere logging nel DebugSystem** quando DIP raggiunge soglie chiave (50, 75, 100)
3. **Documentare il flusso DIP** nell'ADR-0009 (Boss System) con un diagramma di sequenza

---

## Riepilogo Rischi

| # | Osservazione | Rischio | Priorità | Sforzo Fix |
|---|-------------|---------|----------|------------|
| 1 | Core Systems God Layer (28 moduli) | MEDIO | Bassa | Alto |
| 2 | CollisionSystem max coupling | ALTO | Alta | Medio |
| 3 | PerkManager hidden orchestrator | BASSO | Bassa | Basso |
| 4 | Rendering pipeline composite mode | MEDIO-BASSO | Media | Basso |
| 5 | AudioSystem posizione nel loop | BASSO | Bassa | Basso |
| 6 | Due spawn system in layer diversi | MEDIO | Media | Alto |
| 7 | Story layer senza ADR | BASSO-MEDIO | Bassa | Medio |
| 8 | Persistenza senza migrazione | MEDIO-ALTO | Alta | Medio |
| 9 | Zero dipendenze runtime | BASSO | Bassa | N/A |
| 10 | DIP Meter distribuito | BASSO | Bassa | Basso |

### Azioni raccomandate (in ordine di priorità)

1. **ALTA — CollisionSystem test di regressione** (Osservazione 2)
   - Creare test automatizzati per il CollisionSystem
   - Aggiungere evento `collision:debug` in modalità debug

2. **ALTA — Persistenza con migrazione** (Osservazione 8)
   - Aggiungere campo `version` ai dati localStorage
   - Creare MigrationSystem

3. **MEDIA — Rendering pipeline enforcement** (Osservazione 4)
   - Aggiungere asserzioni composite mode nel DrawPipeline
   - Documentare nel control manifest

4. **MEDIA — Spawn system unificazione** (Osservazione 6)
   - Definire interfaccia SpawnSystem astratta
   - Implementare gradualmente

5. **BASSA — ADR-0014 Story System** (Osservazione 7)
   - Documentare decisioni architetturali del layer Story

6. **BASSA — DIP Meter debuggabilità** (Osservazione 10)
   - Aggiungere evento `dip:changed`
   - Documentare flusso nell'ADR-0009

---

## Conclusioni

L'architettura di FIAT vs CRYPTO è **solida, coerente e ben documentata**. I 13 ADR coprono tutti i sistemi core, il control manifest enforce le regole, e l'EventBus mantiene il disaccoppiamento. Le osservazioni più critiche riguardano:

1. **CollisionSystem come single point of failure** — merita test di regressione
2. **Persistenza senza migrazione** — rischio reale per gli aggiornamenti futuri
3. **Core Systems troppo grande** — non urgente, ma da tenere d'occhio

## Metriche Quantitative

Estratte automaticamente il 2026-05-16 da `scripts/extract-architecture.js`.
Source hash: `7bc563b85c69235d`. I valori sono aggiornabili rieseguendo lo script.

### Dati aggregati

| Metrica | Valore | Note |
|---------|--------|------|
| Moduli totali | 74 | 10 layer |
| LOC totali | 48,062 | ~650 LOC/modulo in media |
| Size totale | 2,003 KB | ~27 KB/modulo in media |
| ADR | 15 (tutti Accepted) | +2 rispetto al documento originale (ADR-0014, ADR-0015) |
| GDD | 7 (tutti Approved) | 2 XL, 3 M, 2 L |
| TR-ID | 70 | Copertura 100% |
| Coupling medio out | 0.55 | Quanti altri moduli un modulo medio reference |
| Coupling medio in | 0.55 | Da quanti altri moduli un modulo medio è referenziato |

### Distribuzione per layer

| Layer | Moduli | LOC | Size (KB) | Avg LOC/mod | Moduli con ADR | TR coverage |
|-------|--------|-----|-----------|-------------|----------------|-------------|
| Utils | 7 | ~2,500 | ~95 | 357 | 0/7 (0%) | 0 |
| Foundation | 6 | ~2,200 | ~85 | 367 | 4/6 (67%) | 0 |
| Config | 1 | ~900 | ~35 | 900 | 0/1 (0%) | 0 |
| Core Systems | 28 | ~18,000 | ~730 | 643 | 18/28 (64%) | 42 TR |
| Entities | 7 | ~4,000 | ~150 | 571 | 3/7 (43%) | 0 |
| Managers | 9 | ~5,000 | ~200 | 556 | 6/9 (67%) | 21 TR |
| Story | 6 | ~2,500 | ~95 | 417 | 1/6 (17%) | 0 |
| UI | 8 | ~3,500 | ~135 | 438 | 1/8 (13%) | 0 |
| V8 Campaign | 1 | ~2,000 | ~80 | 2,000 | 1/1 (100%) | 7 TR |
| Audio | 1 | ~800 | ~30 | 800 | 0/1 (0%) | 0 |

### Top 5 moduli per coupling

| Modulo | Layer | Dipende da N moduli | Referenziato da N moduli |
|--------|-------|--------------------|--------------------------|
| CollisionSystem | Core | 8+ | 10+ |
| Game.Events (EventBus) | Foundation | 0 | 9+ |
| Game.Balance | Config | 0 | 50+ |
| WaveManager | Managers | 6+ | 4+ |
| PerkManager | Managers | 4+ | 6+ |

### Moduli senza copertura ADR

14 moduli su 74 (19%) non hanno un ADR di riferimento:
`Game.Constants`, `Game.Debug`, `Game.ColorUtils`, `Game.MathUtils`, `Game.RNG`, `Game.RunState`, `Game.Upgrades`, `Game.Balance`, `Game.HintTracker`, `Game.QualityManager`, `Game.HarmonicConductor`, `Game.HarmonicSequences`, `Game.RankSystem`, `Game.MusicData`, `Game.Player`, `Game.Bullet`, `Game.AchievementSystem`, `Game.DailyMode`, `Game.StatsTracker`, `Game.StoryManager`, `Game.DialogueUI`, `Game.StoryScreenData`, `Game.StoryBackgrounds`, `Game.DialogueData`, `Game.IntroScreen`, `Game.DebugOverlay`, `Game.GameCompletion`, `Game.UIManager`, `Game.TutorialManager`, `Game.LessonModal`, `Game.ToastSystem`

Di questi, i più critici: `Game.Balance` (nessun ADR per il config system), `Game.Player` (nessun ADR per l'entità centrale), tutto il layer Story (6 moduli senza ADR), tutto il layer UI (7 moduli senza ADR).

---

## Proiezione Temporale v8/v9

Basata sull'analisi delle tendenze architetturali attuali, ecco gli scenari previsionali per le prossime major version.

### Scenario A — Growth organico (v8)

**Trigger:** Evoluzione naturale senza refactor strutturale.

| Metrica | v7.12 | v8 (stimato) | Delta |
|---------|-------|-------------|-------|
| Moduli | 74 | 85-92 | +15-18 |
| Core Systems moduli | 28 | 32-36 | +4-8 |
| LOC | 48K | 55-60K | +7-12K |
| ADR | 15 | 17-18 | +2-3 |
| Moduli senza ADR | 31 | 38-42 | +7-11 |

**Rischi attesi:**
- Core Systems cresce da 28 a 35+ moduli (soglia critica per God Layer)
- Senza ADR-0016 (Story), il layer Story rimane senza copertura
- Senza MigrationSystem, ogni nuovo campo in localStorage rischia corruzione dati
- `index.html` supera 100 `<script>` tag → debugging del load order diventa critico

### Scenario B — Refactor strutturale (v8.5)

**Trigger:** Implementazione delle raccomandazioni delle osservazioni #1, #6, #8.

| Intervento | Effetto | Nuovi moduli | Moduli ricollocati |
|-----------|---------|-------------|-------------------|
| Rendering Infra layer | Core -4 moduli | 1 (nuovo layer) | DrawPipeline, GlowManager, OffscreenCanvas, CullingHelper |
| Ricollocazione UI modules | Core -4, UI +4 | 0 | FloatingTextManager, PerkIconManager, MessageSystem, MemeEngine |
| Audio-Reactive layer | Core -2 moduli | 1 (nuovo layer) | HarmonicConductor, HarmonicSequences |
| SpawnSystem unificazione | N/A | 1 (interfaccia) | WaveManager, LevelScript |
| MigrationSystem | Utils +1 | 1 | Nessuno |
| ADR-0016 Story | 0 | 0 | 6 moduli ora coperti |

**Risultato atteso:**
- Core Systems da 28 a 14 moduli (dimezzato)
- Nuovi layer: Rendering Infra (4), Audio-Reactive (2)
- Layer UI da 8 a 12 moduli
- Tutti i layer sotto 15 moduli (nessun God Layer)
- Copertura ADR: ~85% dei moduli (da 54% attuale)

### Scenario C — PWA v2 (v9)

**Trigger:** Nuove feature che richiedono capacità avanzate.

**Possibili evoluzioni:**
- **Multiplayer asincrono** (ghost data, leaderboard live) → richiede WebSocket o Server-Sent Events → **nuovo ADR infrastrutturale**
- **Asset pipeline** (se si aggiungono sprite pre-renderizzati o sprite sheet) → richiede build tool → viola il vincolo "zero bundlers" → **richiede ADR di eccezione**
- **Localizzazione avanzata** (RTL, font non-Latin) → richiede string table system → **ADR-0017**
- **Accessibility overlay** (screen reader, high contrast) → richiede refactor UI → **ADR-0018**

**Stima coupling a v9 (Scenario B applicato):**

| Metrica | v7.12 | v9 |
|---------|-------|-----|
| Moduli totali | 74 | 90-100 |
| Media coupling out | 0.55 | 0.60-0.70 |
| Media coupling in | 0.55 | 0.55-0.60 |
| Layer con +15 moduli | 1 (Core) | 0 |
| ADR | 15 | 20-22 |

### Raccomandazione strategica

Lo **Scenario B** (refactor strutturale) è vivamente raccomandato **prima di iniziare lo Scenario C** (nuove feature). Il costo del refactor:
- **Senza nuove feature**: ~3-5 giorni di lavoro, rischio basso (i test esistenti coprono le funzionalità)
- **Con nuove feature già aggiunte**: ~10-15 giorni, rischio medio-alto (refactor + regression testing su nuovo codice)

**Timeline ottimale:** Implementare Scenario B durante il primo sprint della v8, prima di qualsiasi nuova feature importante. Questo riduce il rischio di regressione e prepara l'architettura per la crescita futura.

---

## Osservazione 1
