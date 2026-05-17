# Architecture Observations — FIAT vs CRYPTO

**Date:** 2026-05-17
**Based on:** `docs/architecture/architecture-map.json` (auto-generated) + `scripts/extract-architecture.js`
**Game Version:** v7.32.0
**Engine:** Vanilla JavaScript (ES6+) / Canvas 2D
**Total Modules:** 76 across 11 layers
**ADRs:** 16 Accepted (0001-0016)
**GDDs:** 7 Approved

---

## Executive Summary

L'architettura di FIAT vs CRYPTO è il risultato di 7 major version di evoluzione iterativa. La mappatura completa rivela un sistema coerente e ben disciplinato, con punti di forza evidenti (disaccoppiamento tramite EventBus, zero dipendenze, ADR coverage al 100% sui sistemi core) e alcune aree di attenzione che emergeranno con l'ulteriore evoluzione del gioco. Questo documento analizza 10 osservazioni strutturate, ciascuna con: evidenza, analisi, rischio, e raccomandazione.

---

## Osservazione 1 — Core Systems è un "God Layer" (28 moduli)

### Evidenza

Il layer **Core Systems** (order: 2) contiene 28 moduli su 76 totali — il **37%** dell'intera codebase. Nessun altro layer supera i 9 moduli.

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

## Osservazione 7 — Story layer: 6 moduli, ora coperto da ADR-0016

### Evidenza

Il layer Story contiene 6 moduli:

| Modulo | File | ADR |
|--------|------|-----|
| StoryManager | `src/story/StoryManager.js` | ADR-0016 |
| StoryScreen | `src/story/StoryScreen.js` | ADR-0016 |
| DialogueUI | `src/story/DialogueUI.js` | ADR-0016 |
| StoryScreenData | `src/story/StoryScreenData.js` | ADR-0016 |
| StoryBackgrounds | `src/story/StoryBackgrounds.js` | ADR-0016 |
| DialogueData | `src/story/DialogueData.js` | ADR-0016 |

Tutti i 7 GDD sono Approved. **ADR-0016 (creato 2026-05-17) copre ora tutte le 6 decisioni architetturali del sistema narrativo.**

### Analisi

Prima della creazione di ADR-0016, lo Story layer era l'unico layer significativo senza copertura ADR. L'ADR-0016 documenta ora formalmente:

- Come lo StoryScreen interagisce con la state machine (GameStateMachine.STORY_SCREEN)
- Il formato dei dati di StoryScreenData (capitoli PROLOGUE + CH1-3, bilingue EN/IT)
- La gestione dei background di StoryBackgrounds (4 temi animati per capitolo)
- Il flusso StoryScreen → PLAY → INTERMISSION → STORY_SCREEN
- Il sistema di dialogo (DialogueUI DOM-based + DialogueData categorizzato)
- Lo StoryManager come singleton consumer di eventi (nessuna pubblicazione)

### Rischio: BASSO

L'ADR-0016 ha documentato tutte e 6 le decisioni architetturali del sistema narrativo. Il rischio è mitigato. Rimane un rischio basso legato a:
- Espansioni future (Visual Novel Phase 2) che richiederanno un aggiornamento dell'ADR
- La mappa `BOSS_TO_CHAPTER` ancora implicita in GameplayCallbacks

### Raccomandazione

1. **Completato** — ADR-0016 copre 6 moduli, 6 decisioni, TR-V8-007. Rivedere in occasione di Visual Novel Phase 2.
2. **Futuro** — Spostare la mappa `BOSS_TO_CHAPTER` da GameplayCallbacks a StoryScreenData per centralizzare la configurazione narrativa.

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

## Osservazione 9 — Zero dipendenze runtime: 76 moduli custom

### Evidenza

- **76 moduli** scritti interamente a mano
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
| 7 | Story layer ora coperto da ADR-0016 | BASSO | Completata | Completato |
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

5. **COMPLETATA — ADR-0016 Story System** (Osservazione 7)
   - Creato `docs/architecture/adr-0016-story-system.md` con 6 decisioni architetturali

6. **BASSA — DIP Meter debuggabilità** (Osservazione 10)
   - Aggiungere evento `dip:changed`
   - Documentare flusso nell'ADR-0009

---

## Conclusioni

L'architettura di FIAT vs CRYPTO è **solida, coerente e ben documentata**. I 16 ADR coprono tutti i sistemi core, il control manifest enforce le regole, e l'EventBus mantiene il disaccoppiamento. Le osservazioni più critiche riguardano:

1. **CollisionSystem come single point of failure** — merita test di regressione
2. **Persistenza senza migrazione** — rischio reale per gli aggiornamenti futuri
3. **Core Systems troppo grande** — non urgente, ma da tenere d'occhio

## Metriche Quantitative

Estratte automaticamente il 2026-05-17 da `scripts/extract-architecture.js`.
Source hash: `f524c2efaf994afc`. I valori sono aggiornabili rieseguendo lo script.

### Dati aggregati

| Metrica | Valore | Note |
|---------|--------|------|
| Moduli totali | 76 | 11 layer |
| LOC totali | 52,275 | ~688 LOC/modulo in media |
| Size totale | 2,173.6 KB | ~28.6 KB/modulo in media |
| ADR | 16 (tutti Accepted) | ADR-0001..0016 |
| GDD | 7 (tutti Approved) | 2 XL, 3 M, 2 L |
| TR-ID | 70 | Copertura 100% |
| Coupling medio out | 1.01 | Quanti altri moduli un modulo medio reference |
| Coupling medio in | 1.01 | Da quanti altri moduli un modulo medio è referenziato |

### Distribuzione per layer (da architecture-map.json)

| Layer | Moduli | LOC | Size (KB) | Avg LOC | ADR coverage | TR coperti |
|-------|--------|-----|-----------|---------|--------------|------------|
| Utils | 8 | 5,252 | 226.1 | 657 | 0/8 (0%) | 0 |
| Foundation | 6 | 5,038 | 228.3 | 840 | 4/6 (67%) | 0 |
| Config | 1 | 3,339 | 142.3 | 3,339 | 0/1 (0%) | 0 |
| Core Systems | 28 | 12,687 | 511.8 | 453 | 23/28 (82%) | 70 |
| Entities | 7 | 9,979 | 410.9 | 1,426 | 3/7 (43%) | 11 |
| Managers | 9 | 4,426 | 179.9 | 492 | 6/9 (67%) | 39 |
| Story | 6 | 1,986 | 80.6 | 331 | 1/6 (17%) | 0 |
| UI | 8 | 3,965 | 152.0 | 496 | 1/8 (13%) | 0 |
| V8 Campaign | 1 | 800 | 23.7 | 800 | 1/1 (100%) | 11 |
| Audio | 1 | 976 | 40.6 | 976 | 0/1 (0%) | 0 |
| Entry Point | 1 | 3,827 | 177.5 | 3,827 | 0/1 (0%) | 0 |

### Coupling density per layer

Rapporto tra dipendenze totali (out) e numero di moduli nel layer. Valori >1 indicano layer con forte interconnessione interna/esterna.

| Layer | Moduli | Totale dep_out | Density out | Totale dep_in | Density in | Note |
|-------|--------|---------------|-------------|---------------|------------|------|
| Entities | 7 | 36 | **5.14** | 10 | 1.43 | Massimo coupling out — entità dipendono da molti sistemi |
| Entry Point | 1 | 3 | **3.00** | 0 | 0.00 | main.js coordina 3+ sistemi |
| Config | 1 | 1 | **1.00** | 13 | 13.00 | BalanceConfig referenziato da 13 moduli |
| Utils | 8 | 8 | **1.00** | 19 | 2.38 | Utility molto referenziate, poche dipendenze |
| Foundation | 6 | 5 | **0.83** | 15 | 2.50 | Layer infrastrutturale, molti consumer |
| Core Systems | 28 | 16 | **0.57** | 15 | 0.54 | Bilanciato — molti moduli ma poche dipendenze ciascuno |
| Managers | 9 | 5 | **0.56** | 2 | 0.22 | Basso coupling — buon design |
| Story | 6 | 3 | **0.50** | 1 | 0.17 | Molto isolato — comunica principalmente con EventBus |
| UI | 8 | 0 | **0.00** | 0 | 0.00 | Nessuna dipendenza registrata — comunica solo via DOM/eventi |
| V8 Campaign | 1 | 0 | **0.00** | 1 | 1.00 | LevelScript orchestrator, consumer di EventBus |
| Audio | 1 | 0 | **0.00** | 1 | 1.00 | AudioSystem consuma eventi, non pubblica |

### Cohesion score per layer

Rapporto moduli con ADR / moduli totali. Indica quanto ogni layer è coperto da decisioni architetturali documentate.

| Layer | Moduli | Con ADR | Cohesion | Giudizio |
|-------|--------|---------|----------|----------|
| V8 Campaign | 1 | 1 | **100%** | Eccellente |
| Core Systems | 28 | 23 | **82%** | Buono — mancano HintTracker, HarmonicSequences, HarmonicConductor, RankSystem, QualityManager |
| Foundation | 6 | 4 | **67%** | Buono — GameplayCallbacks e AudioSystem senza ADR |
| Managers | 9 | 6 | **67%** | Buono — DailyMode, StatsTracker, AchievementSystem senza ADR |
| Entities | 7 | 3 | **43%** | Insufficiente — Entity, Bullet, Player, PowerUp senza ADR |
| Story | 6 | 6 | **100%** | Eccellente — tutti i 6 moduli coperti da ADR-0016 (2026-05-17) |
| UI | 8 | 1 | **13%** | Debole — solo ArcadeModifiers coperto da ADR-0011 |
| Utils | 8 | 0 | **0%** | Critico — layer con 5,252 LOC senza ADR |
| Config | 1 | 0 | **0%** | Critico — BalanceConfig (3,339 LOC) senza ADR |
| Audio | 1 | 0 | **0%** | Critico — MusicData (976 LOC) senza ADR |
| Entry Point | 1 | 0 | **0%** | Accettabile — main.js coperto da ADR-0014 |

### Bus factor

Calcolato via `git shortlog -sn -- src/`. Su 330 commit totali:

| Autore | Commit | % |
|--------|--------|---|
| psychoSocial | 330 | 99.7% |
| Donchitos | 1 | 0.3% |

**Bus factor effettivo: 1.** Ogni modulo del progetto ha un solo autore. Questo è atteso per un gioco indie sviluppato in solitaria, ma rappresenta un rischio di continuità per la knowledge qualche anno dopo l'ultimo commit. L'alta copertura ADR (16 documenti) e il control manifest mitigano parzialmente questo rischio fornendo documentazione architetturale anche in assenza dell'autore originale.

### Top 10 moduli per coupling combinato (out + in)

| Modulo | Layer | dep_out | dep_in | Combined | LOC |
|--------|-------|---------|--------|----------|-----|
| Game.Balance | Config | 1 | 13 | **14** | 3,339 |
| Game.Debug | Utils | 8 | 5 | **13** | 3,180 |
| Game.HarmonicConductor | Core Systems | 12 | 1 | **13** | 1,170 |
| Game.Player | Entities | 12 | 0 | **12** | 3,115 |
| Game.Bullet | Entities | 4 | 5 | **9** | 1,998 |
| Game.Boss | Entities | 9 | 0 | **9** | 1,650 |
| Game.Events | Foundation | 0 | 8 | **8** | 73 |
| Game.ColorUtils | Utils | 0 | 7 | **7** | 251 |
| Game.Enemy | Entities | 7 | 0 | **7** | 1,344 |
| Game.Audio | Foundation | 2 | 4 | **6** | 3,431 |

### Moduli senza copertura ADR

37 moduli su 76 (49%) non hanno un ADR di riferimento diretto nel campo `governed_by`:

| Layer | Moduli senza ADR | LOC coinvolti |
|-------|-----------------|---------------|
| Utils | 8/8 (100%) | 5,252 |
| Foundation | 2/6 (33%) | 4,092 |
| Config | 1/1 (100%) | 3,339 |
| Core Systems | 5/28 (18%) | 2,035 |
| Entities | 4/7 (57%) | 5,430 |
| Managers | 3/9 (33%) | 331 |
| Story | 5/6 (83%) | 1,397 |
| UI | 7/8 (88%) | 3,790 |
| V8 Campaign | 0/1 (0%) | 0 |
| Audio | 1/1 (100%) | 976 |
| Entry Point | 1/1 (100%) | 3,827 |

**Nota:** Il campo `governed_by` nell'architecture-map.json traccia solo la governance diretta. Moduli senza ADR diretto possono comunque essere coperti da ADR di layer (es. ADR-0002 copre tutta la Canvas 2D pipeline, ADR-0003 copre l'EventBus usato da tutti). La percentuale reale di copertura è più alta di quanto indicato qui.

I più critici tra i 37: `Game.Balance` (nessun ADR per il config system da 3,339 LOC), `Game.Player` (nessun ADR per l'entità centrale), `Game.Audio` (3,431 LOC senza ADR), `Game.main` (3,827 LOC — parzialmente coperto da ADR-0014 ma non nel campo `governed_by`).

### Tracciabilità TR-ID per osservazione

| # | Osservazione | TR-ID rilevanti |
|---|-------------|-----------------|
| 1 | Core Systems God Layer | TR-ARC-001..010, TR-V8-001..011 — tutti i requisiti di gioco passano da Core |
| 2 | CollisionSystem max coupling | TR-COLL-* (coperti indirettamente), TR-EA-005 (enemy death detection) |
| 3 | PerkManager hidden orchestrator | TR-WE-001..005 (weapon evolution chain) |
| 4 | Rendering pipeline composite mode | TR-GFX-* (coperti indirettamente da ADR-0002) |
| 5 | AudioSystem game loop position | TR-AUD-* (audio sync requirements) |
| 6 | Due spawn system | TR-V8-001..011 (campaign spawn), TR-ARC-001..010 (arcade spawn) |
| 7 | Story layer senza ADR | TR-V8-007 (inter-level storytelling) — ora coperto da ADR-0016 |
| 8 | Persistenza senza migrazione | TR-MIG-* (non ancora creati — gap) |
| 9 | Zero dipendenze runtime | Fondazionale — nessun TR specifico |
| 10 | DIP Meter distribuito | TR-BOSS-003 (proximity kill mechanic) |

---

## Proiezione Temporale v8/v9

Basata sull'analisi delle tendenze architetturali attuali, ecco gli scenari previsionali per le prossime major version.

### Scenario A — Growth organico (v8)

**Trigger:** Evoluzione naturale senza refactor strutturale.

| Metrica | v7.32 (attuale) | v8 (stimato) | Delta |
|---------|-----------------|-------------|-------|
| Moduli | 76 | 85-92 | +9-16 |
| Core Systems moduli | 28 | 32-36 | +4-8 |
| LOC | 52K | 58-65K | +6-13K |
| ADR | 16 | 18-19 | +2-3 |
| Moduli senza ADR | 37 | 42-48 | +5-11 |

**Rischi attesi:**
- Core Systems cresce da 28 a 35+ moduli (soglia critica per God Layer)
- ~~Senza ADR-0016 (Story), il layer Story rimane senza copertura~~ — ADR-0016 creato 2026-05-17
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
- Copertura ADR: ~85% dei moduli (da 53% attuale — 40/76)

### Scenario C — PWA v2 (v9)

**Trigger:** Nuove feature che richiedono capacità avanzate.

**Possibili evoluzioni:**
- **Multiplayer asincrono** (ghost data, leaderboard live) → richiede WebSocket o Server-Sent Events → **nuovo ADR infrastrutturale**
- **Asset pipeline** (se si aggiungono sprite pre-renderizzati o sprite sheet) → richiede build tool → viola il vincolo "zero bundlers" → **richiede ADR di eccezione**
- **Localizzazione avanzata** (RTL, font non-Latin) → richiede string table system → **ADR-0017**
- **Accessibility overlay** (screen reader, high contrast) → richiede refactor UI → **ADR-0018**

**Stima coupling a v9 (Scenario B applicato):**

| Metrica | v7.32 (attuale) | v9 |
|---------|-----------------|-----|
| Moduli totali | 76 | 90-100 |
| Media coupling out | 1.01 | 0.60-0.70 |
| Media coupling in | 1.01 | 0.55-0.60 |
| Layer con +15 moduli | 1 (Core) | 0 |
| ADR | 16 | 20-22 |

### Raccomandazione strategica

Lo **Scenario B** (refactor strutturale) è vivamente raccomandato **prima di iniziare lo Scenario C** (nuove feature). Il costo del refactor:
- **Senza nuove feature**: ~3-5 giorni di lavoro, rischio basso (i test esistenti coprono le funzionalità)
- **Con nuove feature già aggiunte**: ~10-15 giorni, rischio medio-alto (refactor + regression testing su nuovo codice)

**Timeline ottimale:** Implementare Scenario B durante il primo sprint della v8, prima di qualsiasi nuova feature importante. Questo riduce il rischio di regressione e prepara l'architettura per la crescita futura.

---

*Fine del documento. Ultima rigenerazione: 2026-05-17 con metriche da architecture-map.json (source_hash: f524c2efaf994afc).*
