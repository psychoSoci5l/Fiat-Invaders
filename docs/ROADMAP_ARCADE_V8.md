# Roadmap: Arcade Mode V8 Migration

> **Epic**: Arcade V8 Migration  
> **Branch**: `main`  
> **Target**: v8.0.0  
> **Decisione**: Arcade pivotato da WaveManager legacy a V8 scroller scriptato. 1 livello infinito, burst temporali, combo + modifier + miniboss preservati.  
> **Data**: 2026-05-30

---

## 1. Visione

L'Arcade mode passa dal sistema a ondate fisse (`WaveManager` con streaming phase-based) al motore V8 scriptato (`LevelScript` con burst temporali). L'obiettivo è eliminare il percorso duplicato di spawn, ridurre il debito tecnico, e dare ad Arcade lo stesso feeling verticale Gradius-style della campagna.

### Cosa cambia
- **Prima**: `WaveManager` gestisce 15 wave definitions (5×3 cicli) con phase trigger a ~25% clearance. Spawn "clear-driven".
- **Dopo**: `ArcadeLevelScript` gestisce un livello V8 infinito. Le 15 wave diventano burst temporali scriptati. Spawn "time-driven" (come V8 campagna), ma con le stesse formazioni e scaling Arcade.

### Cosa NON cambia
- Combo system (kill → timer 3s → decay → HUD)
- Modifier stack (15 carte, pick post-boss/miniboss, stacking)
- Mini-boss trigger (threshold per currency, override Arcade)
- Post-boss flow (pick carte → intermission → phase transition P1→P2→P3)
- Infinite loop post-C3 (wave defs riciclate, diff +0.20/cycle, formation remix 40%)
- Arcade scaling (+15% count, –15% HP, behavior rate 0.22, elite chance Arcade)
- Leaderboard submission, persistent records, drop rate +10%

---

## 2. Architettura Target

```
┌─────────────────────────────────────────────────────────────┐
│                     ARCADE MODE (V8)                        │
├─────────────────────────────────────────────────────────────┤
│  ArcadeLevelScript (extends LevelScript)                    │
│    ├── loadWaveAsBurst(waveDef, cycle) → burst temporali    │
│    ├── tick(dt) → consuma burst, spawna nemici             │
│    ├── onWaveComplete() → intermission + pick (se boss)   │
│    └── onCycleComplete() → phase transition + diff ramp     │
├─────────────────────────────────────────────────────────────┤
│  ArcadeComboSystem                                          │
│    ├── onEnemyKilled(e) → comboCount++, timer reset        │
│    ├── onGraze() → comboTimer += 0.5s                       │
│    ├── update(dt) → decay, reset, bestCombo                 │
│    └── drawHUD(ctx) → colori per soglia, pulse, decay       │
├─────────────────────────────────────────────────────────────┤
│  ArcadeModifierSystem (estrae da ArcadeModifiers.js)        │
│    ├── MODIFIER_POOL (15 defs)                              │
│    ├── getRandomModifiers(count, current)                   │
│    ├── applyModifier(id) → recalculateBonuses()             │
│    └── arcadeBonuses flat object                            │
├─────────────────────────────────────────────────────────────┤
│  ArcadeMiniBossSystem (estrae trigger da GameplayCallbacks)│
│    ├── onEnemyKilled(symbol) → fiatKillCounter++             │
│    ├── checkThreshold() → spawn miniboss se superato        │
│    └── HP scaling: 0.40 × fullBossHP × perkScaling          │
├─────────────────────────────────────────────────────────────┤
│  WaveManager (Arcade path rimosso)                          │
│    ├── Se isArcadeMode() → early return (dormiente)         │
│    └── Solo Story path attivo (ma Story usa V8, quindi      │
│        WaveManager diventa totalmente inutilizzato)          │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Sequenza Task

### Task 1 — ADR & Design Doc
**File**: `docs/architecture/adr-0015-arcade-v8-migration.md`  
**Scopo**: Documentare la decisione architetturale, i trade-off, i sistemi coinvolti.  
**Input**: Questa roadmap + GDD Arcade + GDD V8 + report agent.  
**Output**: ADR approvato.

### Task 2 — Estrazione Combo System
**File**: `src/systems/ArcadeComboSystem.js` (nuovo)  
**Scopo**: Isolare combo logic dal `main.js` loop e da `GameplayCallbacks.js`.  
**Stato da migrare**:
- `RunState.comboCount`, `comboTimer`, `comboMult`, `bestCombo`, `comboDecayAnim`
- `COMBO.TIMEOUT (3.0)`, `GRAZE_EXTEND (0.5)`, `MULT_PER_COMBO (0.05)`, `MULT_CAP (5.0)`, `DECAY_ANIM (0.5)`
- HUD `drawArcadeComboHUD` da `main.js`
**Hook**:
- `onEnemyKilled(e)` — chiamato da GameplayCallbacks
- `onGraze()` — chiamato da collision callback
- `onDeath()` — reset combo
- `update(dt)` — chiamato da main loop
- `drawHUD(ctx)` — chiamato da DrawPipeline

### Task 3 — Estrazione Modifier System
**File**: `src/systems/ArcadeModifierSystem.js` (nuovo, estrae da `ArcadeModifiers.js`)  
**Scopo**: Isolare pool, pick, stacking, recalculate. Rendi il sistema indipendente dal modo di gioco.  
**Stato da migrare**:
- `MODIFIER_POOL` (15 defs, stackable/non-stackable, maxStacks, apply func)
- `getRandomModifiers(count, currentModifiers)` con garanzia OFFENSE+DEFENSE per count≥3
- `applyModifier(id)` → append + `recalculateBonuses()` (reset e replay)
- `arcadeBonuses` flat object (fireRateMult, piercePlus, critChance, damageMult, enemyHpMult, scoreMult, enemyBulletSpeedMult, dropRateMult, speedMult, grazeRadiusMult, grazeGainMult, pityMult, nanoShieldCooldown, nanoShieldTimer, extraLives, lastStandAvailable, volatileRounds, chainLightning, noShieldDrops)
**API pubblica**:
- `getRandomModifiers(count)` → array di defs
- `applyModifier(id)` → void
- `getBonuses()` → bonuses object (readonly snapshot)
- `getModifierCount()` → int
- `hasModifier(id)` → bool
- `reset()` → clear all

### Task 4 — Estrazione Mini-Boss System
**File**: `src/systems/ArcadeMiniBossSystem.js` (nuovo)  
**Scopo**: Isolare trigger threshold, spawn, HP scaling, pattern.  
**Stato da migrare**:
- `fiatKillCounter` mappa per currency symbol
- Threshold check: `floor(mapping.threshold × THRESHOLD_MULT (0.70))`
- Cooldown: `MINI_BOSS.COOLDOWN (12.0)`, `MAX_PER_WAVE (2)`
- `spawnMiniBoss(symbol, color)` → crea miniboss con HP = `floor(calculateBossHP × HP_MULT (0.40) × perkScaling)`
- Per-bloc config: USA/EU/ASIA/EMERGING pattern, HP mult, fire rate
**Hook**:
- `onEnemyKilled(enemy)` — incrementa counter, check threshold
- `onMiniBossSpawned()` — reset counter per quella currency
- `getMiniBossConfig(symbol)` → bloc config

### Task 5 — ArcadeLevelScript
**File**: `src/v8/ArcadeLevelScript.js` (nuovo, estende/wrappa LevelScript)  
**Scopo**: Tradurre le 15 wave definitions in burst temporali V8; gestire cicli infiniti.  
**Stato**:
- `currentWaveIndex` (0-14, poi loop)
- `currentCycle` (1, 2, 3, 4+...)
- `waveDefs[]` — le 15 definitions da BalanceConfig.WAVE_DEFINITIONS.WAVES
- `burstQueue[]` — coda di burst costruita dalla wave corrente
- `isIntermission` — flag pausa tra wave
- `intermissionTimer` — 2.0s standard, 4.0s post-boss
**Logica**:
1. `loadWave(index)`:
   - Legge `waveDefs[index]`
   - Applica scaling: count × cycle_mult × arcade_count_mult × rank_mult
   - Converte ogni phase in burst temporali (es. phase 0 a t=0, phase 1 a t=3.0s, phase 2 a t=6.0s — fixed, non più clear-driven)
   - Ogni burst ha: currencies, formation (posizioni da `generateFormation`), count, pattern
2. `tick(dt)`:
   - Se intermission: decrementa timer, a 0 → prossima wave
   - Se active: consuma burstQueue, spawna nemici via `EntityFactory`
   - Traccia nemici vivi; quando tutti morti + burst completi → wave complete
3. `onWaveComplete()`:
   - Se wave 5 (boss wave): `gameState = INTERMISSION`, `intermissionTimer = BOSS_DURATION`, dopo → spawn boss
   - Altrimenti: `intermissionTimer = INTERMISSION_DURATION`, prossima wave
4. `onBossDeath()`:
   - Incrementa cycle
   - Se cycle 1→2: `PhaseTransitionController.startTransition(1,2)`
   - Se cycle 2→3: `PhaseTransitionController.startTransition(2,3)`
   - Pick modifier: `ModifierChoiceScreen.show(POST_BOSS_PICKS)`
   - Se cycle ≥ 4: applica diff scaling (+0.20), formation remix (40%)
5. `onMiniBossDeath()`:
   - Pick modifier: `ModifierChoiceScreen.show(POST_MINIBOSS_PICKS)`

### Task 6 — Integrazione in main.js & GameplayCallbacks
**File**: `src/main.js`, `src/core/GameplayCallbacks.js`  
**Scopo**: Collegare i nuovi sistemi al loop di gioco.  
**Cambiamenti**:
- `main.js` loop:
  - Se Arcade mode: chiama `ArcadeComboSystem.update(dt)`, `ArcadeModifierSystem.update(dt)` (nano shield tick)
  - `drawArcadeComboHUD` → delega a `ArcadeComboSystem.drawHUD(ctx)`
  - `executeDeath()` → delega reset combo a `ArcadeComboSystem.onDeath()`
- `GameplayCallbacks.js`:
  - `onEnemyKilled` → delega combo a `ArcadeComboSystem.onEnemyKilled()`, modifier a `ArcadeModifierSystem.onEnemyKilled()` (volatile/chain), miniboss a `ArcadeMiniBossSystem.onEnemyKilled()`
  - `onGraze` → delega combo a `ArcadeComboSystem.onGraze()`
  - `onBossDeath` → biforca: se Arcade mode, chiama `ArcadeLevelScript.onBossDeath()` invece di `advanceToNextV8Level()`

### Task 7 — Deprecazione WaveManager Arcade Path
**File**: `src/managers/WaveManager.js`  
**Scopo**: Rendere il percorso Arcade inert.  
**Cambiamenti**:
- In `update()`: se `isArcadeMode()`, early return immediato (non più null check V8, ma return pulito)
- In `prepareStreamingWave()`, `spawnWave()`: log di deprecation warning in debug
- Commentare/rimuovere il codice Arcade-specifico se non condiviso con Story (ma Story usa V8, quindi tutto il percorso WM diventa inutilizzato)

### Task 8 — BalanceConfig — Nuovo Blocco V8_ARCADE
**File**: `src/config/BalanceConfig.js`  
**Scopo**: Centralizzare tuning Arcade nel formato V8.  
**Aggiunta**:
```js
V8_ARCADE: {
    // Pacing
    INTERMISSION_DURATION: 2.0,
    INTERMISSION_BOSS_DURATION: 4.0,
    // Burst timing (simula phase streaming)
    BURST_INTERVAL_PER_PHASE: 3.0,  // seconds between phase bursts
    // Scaling
    ENEMY_COUNT_MULT: 1.15,
    ENEMY_HP_MULT: 0.85,
    DROP_RATE_MULT: 1.10,
    BEHAVIOR_RATE: 0.22,
    // Post-C3
    POST_C3_DIFF_PER_CYCLE: 0.20,
    POST_C3_FORMATION_REMIX: 0.40,
    // Combo (mirror ARCADE.COMBO)
    COMBO: { /* mirror */ },
    // Mini-boss (mirror ARCADE.MINI_BOSS)
    MINI_BOSS: { /* mirror */ },
    // Modifiers (mirror ARCADE.MODIFIERS)
    MODIFIERS: { /* mirror */ },
    // Difficulty cap
    MAX_DIFFICULTY: 3.0
}
```

### Task 9 — Test Suite
**File**: `tests/unit/arcade-v8/`  
**Scopo**: Verificare ogni sistema estratto in isolamento.  
**Test**:
1. `ArcadeComboSystem` — incremento, decay, graze extend, cap, reset on death, HUD snapshot
2. `ArcadeModifierSystem` — pick, stack, non-stack exclusion, recalculate, max stacks
3. `ArcadeMiniBossSystem` — threshold, cooldown, max per wave, HP scaling
4. `ArcadeLevelScript` — loadWave, burst timing, wave complete, cycle increment, post-C3 diff
5. `Integration` — launch Arcade, verifica nessuna chiamata WaveManager.update(), verifica burst spawn

### Task 10 — Smoke & Regression
**Scopo**: Verificare che la campagna V8 non sia toccata.  
**Checklist**:
- [ ] Campaign L1 completo senza errori
- [ ] Campaign boss death → advanceToNextV8Level funziona
- [ ] Campaign intermission timing corretto
- [ ] Arcade launch → nessun errore console
- [ ] Arcade wave 1 → burst spawn, nemici visibili
- [ ] Arcade combo → HUD aggiornato
- [ ] Arcade miniboss → trigger a threshold corretto
- [ ] Arcade boss → pick 3 carte, phase transition
- [ ] Arcade post-C3 → diff aumenta, wave defs riciclate
- [ ] Leaderboard submit in Arcade

---

## 4. Acceptance Criteria

1. **Arcade gating**: `isArcadeMode()` attiva `ArcadeLevelScript`, non `WaveManager`. Nessuna chiamata a `WaveManager.update()` in Arcade.
2. **Burst spawn**: Le 15 wave definitions generano burst temporali. Nemici spawnano in formazioni corrette.
3. **Combo preservato**: Kill → combo +1, timer 3s, decay, graze extend 0.5s, cap 5.0. HUD colori e pulse.
4. **Modifier preservato**: Pick post-boss (3) e post-miniboss (2). Stacking, non-stack exclusion, recalculate.
5. **Mini-boss preservato**: Threshold 0.70× base, cooldown 12s, max 2/wave, HP 0.40×.
6. **Post-boss flow**: Pick carte → intermission → phase transition P1→P2→P3.
7. **Infinite loop**: C4+ ricicla C1–C3 defs con diff +0.20/cycle e formation remix 40%.
8. **Campagna intatta**: V8 Story mode funziona esattamente come prima.
9. **Performance**: Frame budget < 16.6ms. Nessun leak.

---

## 5. Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---|---|---|---|
| Feeling Arcade cambia (time-driven vs clear-driven) | Alta | Medio | Test play + tuning `BURST_INTERVAL_PER_PHASE` per simulare pacing |
| Mini-boss/boss integration con V8 spawner | Medio | Alto | `ArcadeLevelScript` wrappa spawn esistenti, non riscrive `EntityFactory` |
| Modifier UI conflitto con V8 intermission | Medio | Medio | `ModifierChoiceScreen` resta DOM overlay; il gating è sul game state, non sullo spawner |
| Combo HUD duplicato con V8 HUD | Basso | Medio | `ArcadeComboSystem.drawHUD` disegna solo se `isArcadeMode()` |
| Difficoltà post-C3 sbilanciata | Medio | Medio | `BURST_INTERVAL_PER_PHASE` e diff scaling sono tuning knobs; playtest iterativo |

---

## 6. Note Operative

- **Version bump**: v8.0.0 (major — pivot architetturale)
- **Commit message prefix**: `feat(v8.0): arcade v8 migration — [task]`
- **Non toccare**: Weapon evolution, GODCHAIN, perk system, boss core (HP/collision), audio system, DrawPipeline base
- **Test first**: Per ogni sistema estratto, scrivere test prima dell'implementazione (verification-driven)
- **Checklist attiva**: Tracciata in `production/session-state/active.md`, aggiornata dopo ogni task

---

*End of Roadmap*
