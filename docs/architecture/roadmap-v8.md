# Roadmap v8 — FIAT vs CRYPTO

**Data:** 2026-05-17
**Versione attuale:** v7.32.0
**Basata su:** `architecture-observations.md` + `architecture-retrospective.md` + verifica stato reale

---

## Executive Summary

Due documenti di analisi architetturale (osservazioni + retrospettiva) forniscono un quadro chiaro della
situazione attuale. La roadmap integra entrambi in un unico piano d'azione ordinato per priorità.

**Principio guida:** Risolvi i rischi prima di aggiungere feature. Automatizza prima di documentare a mano.

---

## Fase 1 — Mitigazione Rischi (Sprint corrente, ~3 giorni)

Azioni che riducono rischi concreti e immediati. Bloccanti prima di qualsiasi nuova feature.

### 1.1 MigrationSystem — persistenza con versioning

**Rischio:** MEDIO-ALTO. 18 file usano localStorage, nessun versioning. Un cambio di formato
in qualsiasi chiave corrompe i dati dei giocatori esistenti.

**Task:**
- [ ] Creare `src/utils/MigrationSystem.js` con:
  - Lettura versione salvata da ogni chiave localStorage
  - Catena di migrazioni sequenziali (v7 → v8 → ...)
  - Fallback a dati puliti se la migrazione fallisce (mai perdere progresso)
  - Logging in DebugSystem di ogni migrazione applicata
- [ ] Aggiungere campo `version` a tutte le chiavi localStorage esistenti
- [ ] Aggiornare `CampaignState.js`, `ScoreManager.js`, `AchievementSystem.js` e tutti i
  consumer a passare attraverso MigrationSystem

**File coinvolti:** ~18 file che usano localStorage direttamente
**Test:** `tests/unit/migration_test.js`

### 1.2 CollisionSystem — test di regressione + debug event

**Rischio:** ALTO. CollisionSystem è single point of failure: 3 eventi pubblicati, 13 sottoscrizioni.
Un edge case nel narrow-phase si propaga a tutti i sottosistemi.

**Task:**
- [ ] Creare `tests/unit/collision_test.js` con test per:
  - AABB overlap in tutte le configurazioni (sovrapposto, adiacente, separato)
  - Entità che attraversano celle multiple senza detection
  - Spatial grid rebuild corretto dopo rimozione entità
  - Entity count dopo ondate di spawn/despawn rapide
- [ ] Aggiungere evento `collision:debug` emesso in modalità debug
- [ ] Verificare che ogni `entity:died` corrisponda a entità effettivamente nella spatial grid

**File coinvolti:** `src/core/CollisionSystem.js`, `src/utils/DebugSystem.js`
**Test:** `tests/unit/collision_test.js`

### 1.3 DrawPipeline — asserzione composite mode

**Rischio:** MEDIO-BASSO. Se un futuro effetto dimentica `ctx.restore()` dopo aver cambiato
`globalCompositeOperation`, tutti i passi successivi nel draw pipeline ereditano il blending sbagliato.

**Task:**
- [ ] Aggiungere in `DrawPipeline.js` un'asserzione prima di ogni step non-glow
- [ ] Documentare nel control manifest: "Ogni uso di globalCompositeOperation deve essere
  wrapped in ctx.save()/ctx.restore()"
- [ ] Verificare che tutti gli usi esistenti di `globalCompositeOperation` rispettino la regola

**File coinvolti:** `src/core/DrawPipeline.js`, `docs/architecture/control-manifest.md`

---

## Fase 2 — Automazione Tooling (Sprint +1, ~4 giorni)

Rendere i dati architetturali auto-generati, non scritti a mano. La retrospettiva assegna a questa
fase il rapporto impatto/sforzo più alto.

### 2.1 Script estrazione automatica architettura

**Task:**
- [ ] Creare `scripts/extract-architecture.js` che:
  - Parsa `index.html` per estrarre l'ordine dei `<script>` tag
  - Raggruppa i moduli per layer (dal path: `src/core/`, `src/managers/`, ecc.)
  - Estrae namespace (`window.Game.X`) e scopo da doc comment o pattern di utilizzo
  - Calcola LOC e file size per ogni modulo
  - Produce `docs/architecture/architecture-map.json` con `source_hash` e `generated_at`
  - Calcola coupling: per ogni modulo, conta quanti altri moduli reference e da quanti è referenziato
- [ ] Validare: eseguire lo script e confrontare con il JSON attuale per verificare copertura

**File creati:** `scripts/extract-architecture.js`
**File aggiornati:** `docs/architecture/architecture-map.json`

### 2.2 JSON arricchito con metadati

**Task:**
- [ ] Aggiungere a `architecture-map.json`:
  - `source_hash`: SHA256 dei file sorgente al momento dell'estrazione
  - `generated_at`: timestamp ISO 8601
  - `governed_by`: array di ADR che governano il modulo
  - `covers_requirements`: array di TR-ID coperti dal modulo
  - `loc`, `size_kb`: metriche per modulo
  - `coupled_to`, `coupled_from`: conteggio dipendenze

**File aggiornati:** `docs/architecture/architecture-map.json`

### 2.3 Dashboard HTML — caricamento da JSON esterno + mobile

**Task:**
- [ ] Modificare `architecture-map.html` per caricare `architecture-map.json` via `fetch()`
- [ ] Aggiungere hamburger menu per mobile (sidebar attualmente `display: none`)
- [ ] Aggiungere dashboard header con metriche aggregate: moduli totali, coupling medio, ADR coverage %

**File aggiornati:** `docs/architecture/architecture-map.html`

---

## Fase 3 — Documentazione & Tracciabilità (Sprint +2, ~3 giorni)

Colmare i gap di documentazione identificati dalle osservazioni.

### 3.1 ADR-0016: Story System Architecture

**Rischio:** BASSO-MEDIO. 6 moduli Story senza ADR. Il sistema funziona ma è "tribal knowledge."

**Task:**
- [ ] Creare `docs/architecture/adr-0016-story-system.md` con:
  - Formato dati di StoryScreenData e DialogueData
  - Flusso STORY_SCREEN → PLAY → INTERMISSION → STORY_SCREEN
  - Gestione background (StoryBackgrounds)
  - Sistema di dialogo (DialogueUI + DialogueData)
  - Decisioni su timing, skip, e lesson modal integration

**File creati:** `docs/architecture/adr-0016-story-system.md`

### 3.2 Metriche quantitative in architecture-observations.md

**Task:**
- [ ] Aggiungere sezione "Metriche Quantitative" con dati estratti automaticamente:
  - Coupling density per layer
  - Cohesion score (rapporto moduli/eventi/ADR per layer)
  - Distribuzione LOC per layer
  - Bus factor stimato per modulo (basato su git blame)
- [ ] Tracciare ogni osservazione ai TR-* ID rilevanti
- [ ] Linkare paragrafi specifici ADR (non solo il numero)
- [ ] Completare proiezione temporale v8/v9

**File aggiornati:** `docs/architecture/architecture-observations.md`

### 3.3 Control manifest — regole mancanti

**Task:**
- [ ] Aggiungere al control manifest:
  - "Ogni uso di globalCompositeOperation deve essere wrapped in ctx.save()/ctx.restore()"
  - "Nessuna dipendenza runtime esterna senza ADR di eccezione"
  - "Nuove chiavi localStorage devono includere campo version e passare da MigrationSystem"
- [ ] Aggiornare `Manifest Version:` con data corrente

**File aggiornati:** `docs/architecture/control-manifest.md`

---

## Fase 4 — Refactor Strutturale (Sprint +3, ~6 giorni)

Interventi che riducono la complessità architetturale e preparano il terreno per nuove feature.
**Eseguire SOLO dopo Fase 1-3 completate.** Il costo senza le fasi precedenti è 2-3x per regressione.

### 4.1 Split Core Systems in sottolayer

**Problema:** Core Systems ha 28+ moduli (38% codebase). Nessun altro layer supera 9.

**Task:**
- [ ] Estrarre layer "Rendering Infra" (order: 1.5):
  - `DrawPipeline`, `GlowManager`, `OffscreenCanvas`, `CullingHelper`
- [ ] Estrarre layer "Audio-Reactive" (order: 2.5):
  - `HarmonicConductor`, `HarmonicSequences`
- [ ] Spostare in UI (order: 6):
  - `FloatingTextManager`, `PerkIconManager`, `MessageSystem`, `MemeEngine`
- [ ] Aggiornare `index.html` load order
- [ ] Aggiornare control manifest con i nuovi layer

**Risultato atteso:** Core Systems da 28 a ~16 moduli. Nuovi layer: Rendering Infra (4), Audio-Reactive (2).
UI layer da 8 a 12.

**File coinvolti:** ~12 file spostati + `index.html` + control manifest

### 4.2 SpawnSystem — interfaccia unificata

**Problema:** WaveManager (Arcade) e LevelScript (Campaign) sono due implementazioni
della stessa responsabilità in layer diversi. Ogni feature di spawn costa il doppio.

**Task:**
- [ ] Definire interfaccia `SpawnSystem` con metodi:
  - `update(dt)` — aggiorna lo stato spawn
  - `isActive()` — se sta spawnando
  - `getEnemyCount()` — nemici attivi
  - `getWave()` — ondata corrente
- [ ] Implementare `WaveSpawnSystem` (wrapper WaveManager esistente)
- [ ] Implementare `ScriptedSpawnSystem` (wrapper LevelScript esistente)
- [ ] Single wiring point in `main.js`

**File creati:** `src/systems/SpawnSystem.js` (interfaccia)
**File aggiornati:** `src/main.js`

### 4.3 DIP Meter — evento `dip:changed`

**Task:**
- [ ] Aggiungere emissione `dip:changed` quando il valore DIP cambia (Boss.update)
- [ ] Aggiungere logging in DebugSystem alle soglie 50, 75, 100
- [ ] Documentare il flusso DIP completo nell'ADR-0009 con diagramma di sequenza

**File coinvolti:** `src/entities/Boss.js`, `src/utils/DebugSystem.js`, `docs/architecture/adr-0009-boss-system-dip.md`

---

## Fase 5 — Eccellenza Dashboard (Sprint +4, ~5 giorni)

Portare la dashboard HTML a uno strumento di lavoro quotidiano. Fase opzionale —
esegui solo se la dashboard viene effettivamente usata in code review.

### 5.1 State machine diagram interattivo

Sostituire la griglia statica con SVG state diagram: nodi cliccabili, transizioni evidenziate,
overlay con condizioni e side effects.

### 5.2 Event bus connection highlighting

Click su evento → subscriber illuminati. Click su publisher → eventi evidenziati.
Hover su subscriber → mostra publisher.

### 5.3 Force-directed dependency graph

Sostituire il bar chart con grafo force-directed in Vanilla JS (no D3). Nodi = moduli,
archi = dipendenze reali.

### 5.4 Export PNG e print-friendly view

Pulsante "Export as PNG" + CSS `@media print` con layout ottimizzato.

---

## Riepilogo Temporale

| Fase | Nome | Giorni | Cumulativo | Bloccante per |
|------|------|--------|------------|---------------|
| 1 | Mitigazione Rischi | 3 | 3 | Qualsiasi nuova feature |
| 2 | Automazione Tooling | 4 | 7 | Fase 3-4 |
| 3 | Documentazione & Tracciabilità | 3 | 10 | Fase 4 |
| 4 | Refactor Strutturale | 6 | 16 | Fase 5, nuove feature |
| 5 | Eccellenza Dashboard | 5 | 21 | Niente (opzionale) |

**Totale Fase 1-4 (obbligatorie):** ~16 giorni
**Totale con Fase 5 (opzionale):** ~21 giorni

---

## Cosa NON fare ora

Decisioni esplicite di rinvio, con motivazione:

| Cosa | Perché rimandare |
|------|-----------------|
| Refactor Core Systems **prima** dei test CollisionSystem | Se rompi il CollisionSystem durante il refactor, non hai test che ti dicono cosa hai rotto |
| Nuove feature di gameplay | La persistenza senza migrazione è un rischio reale — ogni nuova feature che tocca localStorage lo amplifica |
| Force-directed graph in dashboard | La dashboard non viene ancora usata in code review — prima rendila utile (Fase 2), poi rendila bella (Fase 5) |
| Riscrittura CollisionSystem | Non serve — funziona. Servono test + debug event, non refactor |
| Unificazione SpawnSystem come primo intervento | È il refactor a più alto rischio di regressione — va fatto dopo che i test di CollisionSystem sono in posto |

---

## Principi per la Fase di Sviluppo Successiva

1. **Nessun nuovo modulo tocca localStorage direttamente** — passa sempre da MigrationSystem
2. **Ogni ADR cita TR-ID** e ogni TR-ID è tracciato a un GDD requirement
3. **Il JSON di architettura non si tocca a mano** — solo lo script lo genera
4. **I test sul CollisionSystem sono il prerequisite per qualsiasi refactor che tocchi entità**
5. **Zero nuove dipendenze runtime** — se serve una libreria, ADR di eccezione obbligatorio
