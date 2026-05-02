# ADR-0014: main.js Structure & Refactoring Strategy

**Status**: Accepted (2026-05-01)
**Context**: Audit strutturale post-v7.20, gate-check Polish→Release PASS
**Doc Owner**: psychoSocial (solo dev)

---

## Contesto

`src/main.js` è cresciuto organicamente per 6+ anni fino a **4656 righe / 124 funzioni**. È il punto di ingresso e orchestratore centrale del gioco, costruito sul pattern namespace (`window.Game`).

Dalla v7.0 in poi, c'è stato uno sforzo sistematico di estrazione in moduli separati (ScoreManager, LeaderboardClient, PerkManager, DrawPipeline, ParticleSystem, IntroScreen, ecc.), ma il file rimane il singoio piu grande del progetto e un punto di attrito per la manutenzione.

Questo ADR documenta la struttura attuale, lo stato estrattivo, le decisioni su cosa estrarre/cosa lasciare, e la strategia consigliata. Non è un piano di esecuzione vincolante — evolve col progetto.

---

## Struttura Attuale

### Blocchi Logici (con numeri di riga)

| # | Blocco | Righe | Funzioni | Descrizione |
|---|--------|-------|----------|-------------|
| A | Setup globale + error handling | 1-65 | 4 | window.onerror, aliasing namespace (G = window.Game), version tracking, gameState |
| B | Stato entità + asset | 66-135 | 3 | arrays entità (bullets, enemies, etc.), loadAssets, dangerZones |
| C | Helper + delegation wrapper | 138-526 | ~48 | safe localStorage, buildPlayerState, initCollisionSystem, RunState aliases, difficulty, DOM cache, wrapper per Score/Meme/Message/Perk/IntroScreen |
| D | init() | 529-1195 | 1 | **673 righe**: bootstrap completo — canvas, eventi, 15+ moduli, startApp, PWA, input, rAF |
| E | UI/Settings/Modal | 1196-1590 | ~20 | resize, updateUIText, toggleLang, resetTutorial, quality, feedback, manual, control modes |
| F | Pause/Restart/V8 | 1592-1800 | ~10 | togglePause, blockIfDailyConsumed, restartRun, showV8Intermission, advanceToNextV8Level |
| G | Gameplay core | 1803-3474 | ~25 | startGame (210r), intermission, clearBattlefield, spawnBoss (102r), miniBoss, update (483r), updateBullets (80r), updateEnemies (96r), death/execute (95r) |
| H | Render pipeline | 3481-4318 | ~10 | initDrawPipeline (353r, 32 layer), draw, overlay drawing (214r), delegation wrapper |
| I | Game loop + game over | 4320-4656 | ~8 | loop (123r), triggerGameOver, _snapPlayerState, updatePowerUps (123r) |

### Mappa dipendenze interne

```
init() ──┬── startGame() ──┬── syncFromRunState()
         │                 ├── updateDifficultyCache()
         │                 ├── initCollisionSystem()
         │                 ├── clearBattlefield()
         │                 ├── closePerkChoice()
         │                 └── emitEvent()
         │
         ├── showV8Intermission() → advanceToNextV8Level()
         ├── togglePause()
         └── resize()

update(dt) ──┬── updateDifficultyCache()
             ├── updateBullets() → updateLivesUI()
             ├── updateEnemies()
             ├── updatePowerUps() ──┬── applyRandomPerk()
             │                      ├── triggerScreenFlash()
             │                      ├── addProximityMeter()
             │                      └── _snapPlayerState()
             ├── updateLivesUI()
             └── updateMusicUI() / updateSfxUI()

loop(timestamp) ──┬── update()
                  ├── updateDifficultyCache()
                  ├── draw() → DrawPipeline
                  └── triggerGameOver() → showGameCompletion()
```

---

## Stato Estrattivo

### Già estratto (moduli autonomi)

| Modulo | Path | Da quando |
|--------|------|-----------|
| ScoreManager | src/managers/ScoreManager.js | v7.0 |
| LeaderboardClient | src/managers/LeaderboardClient.js | v7.0 |
| PerkManager | src/managers/PerkManager.js | v7.0 |
| MiniBossManager | src/managers/MiniBossManager.js | v7.0 |
| CampaignState | src/managers/CampaignState.js | v7.0 |
| GameplayCallbacks | src/core/GameplayCallbacks.js | v7.0 |
| DrawPipeline | src/systems/DrawPipeline.js | v7.13 |
| ParticleSystem | src/systems/ParticleSystem.js | v7.0 |
| EffectsRenderer | src/systems/EffectsRenderer.js | v7.0 |
| FloatingTextManager | src/systems/FloatingTextManager.js | v7.0 |
| MessageSystem | src/systems/MessageSystem.js | v7.0 |
| MemeEngine | src/systems/MemeEngine.js | v7.0 |
| DropSystem | src/systems/DropSystem.js | v7.0 |
| SkyRenderer | src/systems/SkyRenderer.js | v7.0 |
| TransitionManager | src/systems/TransitionManager.js | v7.0 |
| IntroScreen | src/ui/IntroScreen.js | v7.0 |
| DebugOverlay | src/ui/DebugOverlay.js | v7.0 |
| TutorialManager | src/ui/TutorialManager.js | v7.0 |
| ColorUtils | src/utils/ColorUtils.js | v7.0 |

### Ancora in main.js (candidati residui)

| Blocco | Righe | % del file |
|--------|-------|-----------|
| init() | 673 | 14.5% |
| update(dt) | 483 | 10.4% |
| startGame() | 210 | 4.5% |
| updatePowerUps() | 113 | 3.0% (non ancora estratto) |
| updateEnemies() | 96 | 2.1% |
| updateBullets() | 80 | 1.7% |
| executeDeath + startDeathSequence | 69 | 1.5% |
| Tutti gli altri | ~600 | ~13% |

---

## Stato Condiviso: le ~20 let

Queste variabili module-level sono il principale ostacolo all'estrazione. Ogni funzione che le legge/scrive deve stare in main.js, a meno di refactoring piu profondi.

| Variabile | Linea | Scritta da | Blocca estrazione di |
|-----------|-------|------------|---------------------|
| `gameState` | 51 | init, startGame, update, togglePause, loop, draw | **update**, overlay draw |
| `player` | 75 | init, startGame, executeDeath | **update**, collision, bullet, powerup, enemy |
| `boss` | 303 | spawnBoss, startGame | **update**, spawnBoss |
| `level` | 350 | syncFromRunState, update, advanceToNextV8Level | update, V8 |
| `enemies` | 76 | startGame, update, updateEnemies | **update**, updateEnemies |
| `enemyBullets` | 76 | update, updateBullets, clearBattlefield | **update**, updateBullets |
| `bullets` | 76 | update, updateBullets, clearBattlefield | **update**, updateBullets |
| `lives` | 304 | startGame, executeDeath, adjustLives, callbacks | update, death |
| `score` | 350 | syncFromRunState, update, clearBattlefield, updatePowerUps | update, powerup |
| `shake` | 305 | update, spawnBoss, callbacks | update, spawnBoss |
| `isBearMarket` | 66 | startGame, toggleBearMode, update | update, draw |
| `totalTime` | 350 | syncFromRunState, update, loop | update, loop |
| `grazeMeter` | 352 | syncFromRunState, update, addProximityMeter | update |
| `powerUps` | 76 | startGame, updatePowerUps | updatePowerUps |

---

## Decisioni di Refactoring

### Blocco A: initDrawPipeline() → DrawPipeline.registerAll()

| Campo | Valore |
|-------|--------|
| **Decisione** | SI — estrarre |
| **Sforzo** | Bassa |
| **Rischio** | Basso |
| **Motivazione** | Pura registrazione callback, nessuna dipendenza da variabili globali. DrawPipeline esiste gia come modulo. |
| **Come** | Aggiungere `DrawPipeline.registerAll(deps)` dove `deps` contiene i riferimenti alle funzioni di draw ancora in main.js. |

### Blocco B: Overlay drawing (drawCountdown, drawBossWarning, drawPerkPause)

| Campo | Valore |
|-------|--------|
| **Decisione** | SI — estrarre |
| **Sforzo** | Bassa |
| **Rischio** | Basso |
| **Motivazione** | DrawPipeline supporta layer; questi overlay possono diventare layer separati registrati da DrawPipeline. Le variabili di stato (countdownValue, bossWarningAlpha) sono isolate. |

### Blocco C: Dynamic music (update: 2950-3022)

| Campo | Valore |
|-------|--------|
| **Decisione** | SI — estrarre in AudioSystem.musicEngine |
| **Sforzo** | S |
| **Rischio** | Basso |
| **Motivazione** | Legge solo variabili (boss, player, lives, LevelScript), non le scrive. Può diventare `AudioSystem.updateMusicIntensity(ctx)` dove ctx è read-only. |

### Blocco D: updateMusicUI / updateSfxUI

| Campo | Valore |
|-------|--------|
| **Decisione** | SI — estrarre in UIManager |
| **Sforzo** | Bassa |
| **Rischio** | Basso |
| **Motivazione** | Pura manipolazione DOM. UIManager esiste gia. |

### Blocco E: spawnBoss() + startBossWarning()

| Campo | Valore |
|-------|--------|
| **Decisione** | SI — estratto in BossSpawner (v7.20) |
| **Sforzo** | M |
| **Rischio** | Medio — gestito |
| **Motivazione** | Estratto con pattern context object + return values. BossSpawner.js (186 righe) contiene la logica; main.js ha wrapper sottili che applicano le mutazioni di stato condiviso. |

### Blocco F: updatePowerUps()

| Campo | Valore |
|-------|--------|
| **Decisione** | FORSE — prima unificare i 3 splice() in PowerUps |
| **Sforzo** | M |
| **Rischio** | Medio |
| **Motivazione** | Contiene side effects su player, RunState, Debug, MemeEngine. Da rifattorizzare internamente prima di estrarlo. Vedi nota splice. |

### Blocco G: startGame()

| Campo | Valore |
|-------|--------|
| **Decisione** | NO per ora |
| **Sforzo** | M |
| **Rischio** | Alto |
| **Motivazione** | Resetta ~40 variabili globali. Senza un GameContext centralizzato, qualsiasi estrazione richiederebbe passare 15+ parametri. Da fare solo dopo consolidamento variabili. |

### Blocco H: update()

| Campo | Valore |
|-------|--------|
| **Decisione** | NO per ora |
| **Sforzo** | XL |
| **Rischio** | Alto |
| **Motivazione** | 483 righe con mini state machine inline (waveAction). Tocca ~20 variabili globali. Estrarlo richiederebbe una riscrittura massiccia o un oggetto RunContext. L'approccio migliore è continuare a svuotare i blocchi periferici (A-D) finché `update()` non rimane abbastanza snello da giustificare il refactor. |

---

## Strategia Consigliata

### Ordine di esecuzione

1. **[Fase 1] Basso rischio** ✅ — initDrawPipeline() in DrawPipeline, overlay drawing in layer separati, dynamic music in AudioSystem, musicUI/SfxUI in UIManager, updateUIText in UIManager
2. **[Fase 2] Rischio medio** — spawnBoss + startBossWarning ✅ → BossSpawner. updatePowerUps ancora da valutare (dopo aver unificato splice)
3. **[Fase 3] Valutare** → startGame() e update() dopo che Fase 1-2 hanno ridotto il file sotto 3500 righe

### Principi guida

- **Nessuna regressione > nessun refactor**. Se un blocco non può essere estratto in sicurezza, non si estrae.
- **Refactor per svuotamento progressivo**, non per riscrittura. Ogni estrazione riduce la superficie di main.js.
- **Le variabili globali si consolidano, non si eliminano**. Questo non è un progetto con TypeScript o dependency injection. L'obiettivo è raggruppare lo stato per dominio, non eliminare il pattern namespace.
- **Documentare ogni estrazione** in questo ADR con data, blocco, e verifiche fatte.

### Metriche di successo

| Metrica | Attuale | Target Fase 2 | Target Finale |
|---------|---------|---------------|---------------|
| Righe main.js | 3804* | < 3500 | < 3000 |
| Funzioni main.js | ~110 | < 95 | < 75 |
| Variabili globali let | ~28 | ~20 | ~15 |

\* Dopo Fase 1 + spawnBoss (2026-05-01): -852 righe. updateUIText e spawnBoss/startBossWarning estratti. updatePowerUps ancora in main.js.

---

## Rischi e Mitigazioni

| Rischio | Probabilità | Mitigazione |
|---------|-------------|-------------|
| Regressione silenziosa in update() | Alta (dati ~20 variabili shared) | Fase 1 solo blocchi periferici. Test manuale su tutti i game mode dopo ogni estrazione. |
| Stato sporco su restart | Media | Dopo estrazioni, verificare che startGame() resetti ancora tutte le variabili. |
| Ordine init fragile | Media | init() va toccata con cautela. Preferire estrazioni post-init (draw, overlay, UI) prima di toccare il bootstrap. |
| Sincronizzazione multiplayer non presente | N/A | Single-player, nessun rischio. |
| Dimenticare un alias backward-compat | Bassa | Dopo ogni estrazione, grep per la variabile vecchia in tutto src/. |

---

## Appendice: Convenzione Aliasing

Ogni funzione wrapper che delega a un modulo esterno segue questa convenzione:

```js
function nomeFunzione(args) {
    return G.ModuloEsterno.metodo(args);
}
```

Gli alias sono **solo in main.js** e servono a evitare find-replace massivi nel codice rimanente. Non vanno esportati ne propagati. Quando tutto il codice che chiama un alias viene spostato fuori da main.js, l'alias viene rimosso.

---

## Storico Modifiche

| Data | Modifica |
|------|----------|
| 2026-05-01 | Stesura iniziale ADR |
| 2026-05-01 | **Fase 1 completata**: updateMusicUI/updateSfxUI → UIManager, initDrawPipeline + overlay drawing → DrawPipeline, dynamic music → AudioSystem. Test 739/739 invariati. main.js: 4656→4020 (-636), funzioni: 124→120. drawPerkPauseOverlay identificato come dead code (non estratto). |
| 2026-05-01 | **Fase 1 residua completata**: updateUIText → UIManager (delegation wrapper). main.js: 4020→3888 (-132). UIManager aveva già implementazione completa; sostituita la definizione in main.js con wrapper. Test 739/739 invariati. |
| 2026-05-01 | **Fase 2 — spawnBoss completata**: startBossWarning + spawnBoss → BossSpawner (nuovo modulo src/systems/BossSpawner.js, 186 righe). main.js: 3888→3804 (-84). Entrambe le funzioni ora sono delegation wrapper. Il modulo usa IIFE pattern e riceve lo stato condiviso via context object (ctx), restituendo mutazioni per main.js. Test 739/739 invariati. |
