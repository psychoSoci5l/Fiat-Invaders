# ADR-0017: Checkpoint / Save System

## Status

Accepted

## Date

2026-05-22

## Decision Makers

Game Designer, Technical Director

## Summary

Il Checkpoint System salva lo stato completo del giocatore (loadout, perk, punteggio, progressione) dopo ogni sconfitta boss in V8 Campaign Mode, consentendo di riprendere dal menu principale — saltando HANGAR e selezione nave — con un pulsante "Continua". Un singolo slot auto-salva su localStorage con chiave `fiat_checkpoint`.

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Vanilla JavaScript (Canvas 2D, no framework) |
| **Domain** | Feature / Persistence |
| **Knowledge Risk** | LOW — pattern già in uso (CampaignState, MigrationSystem) |
| **References Consulted** | `src/managers/CampaignState.js`, `src/utils/RunState.js`, `src/utils/Upgrades.js`, `src/utils/MigrationSystem.js`, `src/ui/IntroScreen.js`, `src/main.js` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | None — localStorage API già in uso |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0001 (GameStateMachine — PLAY/STORY_SCREEN/INTRO transitions), ADR-0007 (V8 Campaign flow), ADR-0016 (Story System — save fires after story crawl) |
| **Enables** | V8 Campaign session persistence, short-session mobile play |
| **Blocks** | None |
| **Ordering Note** | Feature layer — implement after CampaignState, RunState, Upgrades are stable |

## Context

### Problem Statement

La campagna V8 ha 3 boss (FEDERAL_RESERVE, BCE, BOJ) e 4 livelli. Attualmente
`CampaignState` salva solo la progressione (quali boss sconfitti) ma **non salva
il loadout del giocatore**. Se il giocatore chiude il gioco dopo aver sconfitto
un boss e visto il capitolo story, al ritorno deve:

1. Ricominciare da HANGAR (selezionare nave)
2. Ricominciare con armi base (livello 1, nessun perk)
3. Ricominciare da punteggio zero

Questo rende la campagna V8 una "one-sitting experience" — problema per un gioco
PWA mobile giocabile in sessioni brevi.

### Current State

- `CampaignState` salva boss progression in `fiat_campaign` (localStorage)
- `RunState` tiene stato volatile per-run (perduto alla chiusura)
- `Upgrades` tiene armi/perk in memoria (perduto alla chiusura)
- Nessun meccanismo per serializzare il loadout su disco
- IntroScreen non ha un pulsante "Continua"

### Constraints

- Un solo slot auto-salva (nessuna gestione multipla save file)
- localStorage via MigrationSystem (come tutti gli altri dati persistenti)
- Nessuna UI di save management (delete, rename, etc.) — il checkpoint è
  trasparente al giocatore
- Deve funzionare offline (PWA)
- Deve coesistere con Arcade Mode (nessun checkpoint in arcade)

### Requirements

- Salvare loadout completo dopo sconfitta boss (arma, perk, vite, punteggio,
  HYPER/GODCHAIN, ship type)
- Mostrare "Continua" nel menu principale quando esiste un checkpoint
- Ripristinare stato completo al resume (skip HANGAR, skip ship select, restore
  RunState + Upgrades, caricare livello corretto)
- Non cancellare il checkpoint alla morte del giocatore (solo "Nuova Partita" lo
  cancella)

## Decision

### Architecture

```
CampaignState ──┐
RunState ───────┤
Upgrades ───────┼──→ CheckpointManager ──→ localStorage (fiat_checkpoint)
main.js ────────┘         │
                          │
                          ├── hasCheckpoint() → IntroScreen → show/hide "Continua"
                          │
                          └── resumeFromCheckpoint() → RunState + Upgrades restore
                                                      → skip HANGAR → PLAY(nextLevel)
```

**Flusso salvataggio:**
```
Boss sconfitto → boss:defeated → CampaignState.defeatBoss()
→ STORY_SCREEN (chapter crawl)
→ crawl.onComplete()
  → CheckpointManager.save()           ← NUOVO
  → transitionTo(INTERMISSION)
  → transitionTo(PLAY, nextLevel)
```

**Flusso resume:**
```
INTRO → [Continua] → CheckpointManager.resumeFromCheckpoint()
  → restore RunState (score, lives, shipType, hyperActive)
  → restore Upgrades (weaponLevel, perks, godchainActive, specials, utilities)
  → restore CampaignState (bosses, ngPlusLevel, storyProgress)
  → setGameState(PLAY, {level: checkpoint.nextBoss})
```

### Key Interfaces

```
// CheckpointManager singleton
Game.CheckpointManager = {
  // Save current state to localStorage
  save(): void,

  // Load and validate checkpoint, returns null if invalid
  load(): CheckpointData | null,

  // Check if a valid checkpoint exists
  hasCheckpoint(): boolean,

  // Delete checkpoint from localStorage
  clearCheckpoint(): void,

  // Restore all state from checkpoint and transition to PLAY
  resumeFromCheckpoint(): void
}

// Shape of saved data
interface CheckpointData {
  version: number,           // Schema version (1)
  timestamp: number,         // Date.now()
  shipType: string,          // 'BTC' | 'ETH' | 'SOL'
  nextBoss: string | null,   // Boss type for next level
  levelNumber: number,       // 1-4
  weaponLevel: number,       // 1-3
  perks: string[],           // ['fire', 'laser', ...]
  perkOrder: string[],       // ['fire', 'laser', 'electric']
  godchainActive: boolean,
  hyperActive: boolean,
  lives: number,
  score: number,
  specials: string[],
  utilities: string[],
  ngPlusLevel: number,
  bossesDefeated: object,    // Mirror of CampaignState.bosses
  storyProgress: object      // Mirror of CampaignState.storyProgress
}
```

### Implementation Guidelines

1. **CheckpointManager** va in `src/managers/CheckpointManager.js` caricato dopo
   CampaignState nell'ordine script di index.html (layer managers).

2. **Save hook** in `main.js` — nel callback `onComplete` dello story crawl
   (funzione `showStoryScreen()`), chiamare `CheckpointManager.save()` prima
   della transizione a INTERMISSION.

3. **IntroScreen modifica** — dopo aver renderizzato i pulsanti del menu,
   controllare `CheckpointManager.hasCheckpoint()`. Se true, aggiungere
   "Continua" come primo pulsante prima di "Nuova Partita". Il click fa
   partire `startGameFromCheckpoint()`.

4. **startGameFromCheckpoint()** in main.js — chiama
   `CheckpointManager.resumeFromCheckpoint()` che:
   - Legge i dati dal checkpoint
   - Setta `RunState` (score, lives, shipType, hyperActive)
   - Setta `Upgrades` (weaponLevel, perks, specials, utilities, godchainActive)
   - Setta `CampaignState` (bosses, ngPlusLevel, storyProgress)
   - Calcola il level successivo dal `nextBoss` salvato
   - Chiama `setGameState('PLAY')` con skip HANGAR

5. **"Nuova Partita"** — prima di resettare CampaignState, chiamare
   `CheckpointManager.clearCheckpoint()`.

6. **Validazione load** — in `load()`, verificare:
   - `data.version === CHECKPOINT_VERSION`
   - `data.shipType` esiste in `Game.Balance.SHIPS`
   - `data.nextBoss` è un boss valido o null
   - Se validation fallisce → clearCheckpoint() + return null

7. **Niente checkpoint in Arcade** — salvare solo se `!gameState.isArcadeMode()`

## Alternatives Considered

### Alternative 1: Multiplo Save Slot (3 slot con scelta)

- **Description**: 3 slot selezionabili dal giocatore, stile RPG classico
- **Pros**: Flessibilità per il giocatore, possibilità di avere più run
- **Cons**: UI di save management complessa, overkill per un arcade shooter PWA
- **Estimated Effort**: 2× rispetto a slot singolo
- **Rejection Reason**: Un gioco arcade non beneficia di slot multipli — il
  checkpoint è solo per riprendere dopo una pausa, non per branching

### Alternative 2: Cloud Save via Leaderboard Worker

- **Description**: Salvataggio su Cloudflare KV come per i punteggi leaderboard
- **Pros**: Cross-device resume
- **Cons**: Richiede login/account, rompe il pillar PWA "zero-friction"
- **Estimated Effort**: 4×
- **Rejection Reason**: Contro il pillar "no account, no login, no friction"

## Consequences

### Positive

- Giocatori possono giocare la campagna V8 in sessioni breve (PWA mobile)
- Nessuna perdita di progresso se la tab/device viene chiusa
- Nessuna UI complessa — il checkpoint è invisibile fino al resume
- Riutilizza infrastruttura esistente (MigrationSystem, CampaignState)

### Negative

- Un solo slot — se due giocatori condividono lo stesso browser, si sovrascrivono
- Checkpoint non si cancella alla morte — il giocatore potrebbe non capire
  perché "Continua" lo riporta al vecchio checkpoint

### Neutral

- Aggiunge ~150 LOC a `src/managers/` + modifiche minori a `main.js` e `IntroScreen`
- Richiede update a index.html per caricare il nuovo script

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| localStorage quota exceeded | LOW | Media | Checkpoint data è ~1KB (ben sotto limiti) |
| Save corruption da versione vecchia | LOW | Media | Version field + validation su load |
| Player confuso da checkpoint dopo morte | MEDIUM | Bassa | UI "Continua (boss X checkpoint)" chiarisce |

## Performance Implications

| Metric | Value |
|--------|-------|
| CPU (frame time) | ~0ms — save/load fuori dal game loop |
| Memory | ~1KB per checkpoint in localStorage |
| Load Time | ~0ms — lettura sincrona localStorage |
| Storage | ~1KB per save slot |

## Migration Plan

1. Creare `src/managers/CheckpointManager.js` con l'API definita
2. Aggiungere `<script src="src/managers/CheckpointManager.js">` in index.html
3. Modificare `main.js`: hook save dopo story crawl complete
4. Modificare `IntroScreen.js`: aggiungere pulsante "Continua"
5. Aggiungere `CHECKPOINT_ENABLED`, `CHECKPOINT_KEY`, `CHECKPOINT_VERSION` in BalanceConfig

**Rollback plan**: Settare `CHECKPOINT_ENABLED = false` in BalanceConfig disabilita
l'intero sistema senza modifiche al codice.

## Validation Criteria

- [ ] Checkpoint salvato in localStorage dopo boss defeat (verify con dev console)
- [ ] "Continua" visibile in IntroScreen quando checkpoint esiste
- [ ] Resume ripristina arma, perk, vite, punteggio correttamente
- [ ] "Nuova Partita" cancella il checkpoint
- [ ] Checkpoint sopravvive a game over
- [ ] Corrupted data gestito (silent delete + hide "Continua")
- [ ] NG+ checkpoint funziona con moltiplicatore difficoltà

## GDD Requirements Addressed

| GDD Document | System | Requirement | How This ADR Satisfies It |
|-------------|--------|-------------|--------------------------|
| `design/gdd/save-checkpoint.md` | Checkpoint System | "Autosave fires after boss defeat" | CheckpointManager.save() hook in story crawl onComplete |
| `design/gdd/save-checkpoint.md` | Checkpoint System | "Continua appears in IntroScreen" | IntroScreen checks hasCheckpoint() |
| `design/gdd/save-checkpoint.md` | Checkpoint System | "Resume restores full state" | resumeFromCheckpoint() restores RunState + Upgrades + CampaignState |
| `design/gdd/save-checkpoint.md` | Checkpoint System | "New game clears checkpoint" | clearCheckpoint() on Nuova Partita |

## Related

- ADR-0001 (GameStateMachine) — fornisce INTRO/PLAY state transitions
- ADR-0007 (V8 Scroller LevelScript) — campagna V8 che i checkpoint preservano
- ADR-0016 (Story System) — save hook dopo story crawl
- `src/managers/CampaignState.js` — progression tracking esistente
- `src/utils/MigrationSystem.js` — localStorage wrapper esistente
