# ADR-0015: Arcade V8 Migration — WaveManager Legacy → V8 Scroller

**Status**: Accepted (2026-05-30)
**Context**: Migrazione Arcade da WaveManager legacy a V8 scroller. Decisione già presa: Opzione A.
**Doc Owner**: psychoSocial (solo dev)

---

## Decisione

Arcade mode passa da `WaveManager` (15 wave definitions, phase streaming clear-driven) a `ArcadeLevelScript` (1 livello V8 infinito, burst temporali time-driven). I sistemi Arcade (combo, modifier, mini-boss, post-boss flow, infinite loop) si preservano. WaveManager Arcade path diventa inerte.

---

## Motivazione

Eliminare il percorso spawn duplicato, ridurre il debito tecnico, e dare ad Arcade lo stesso feeling verticale Gradius-style della campagna.

---

## Trade-off

| Pro | Contro |
|---|---|
| Unico motore di spawn (V8) per entrambi i mode | Feeling cambia: time-driven vs clear-driven |
| Elimina ~600 righe di logica streaming legacy | Tuning burst necessario per replicare pacing wave |
| Combo / modifier / miniboss preservati senza cambiamenti | Post-C3 difficoltà potrebbe divergere senza playtest |
| Riduce superficie di manutenzione WaveManager | Tempo di implementazione stimato: 1–2 sessioni |

---

## Architettura Target

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
│  ArcadeModifierSystem                                       │
│    ├── MODIFIER_POOL (15 defs)                              │
│    ├── getRandomModifiers(count, current)                   │
│    ├── applyModifier(id) → recalculateBonuses()             │
│    └── arcadeBonuses flat object                            │
├─────────────────────────────────────────────────────────────┤
│  ArcadeMiniBossSystem                                       │
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

## Sistemi Preservati

- **Combo**: kill → timer 3s → decay → graze extend 0.5s → mult cap 5.0
- **Modifier stack**: 15 carte, pick post-boss (3) / post-miniboss (2), stacking, non-stack exclusion
- **Mini-boss**: threshold 0.70× base, cooldown 12s, max 2/wave, HP 0.40×
- **Post-boss flow**: pick carte → intermission → phase transition P1→P2→P3
- **Infinite loop post-C3**: wave defs riciclate, diff +0.20/cycle, formation remix 40%
- **Arcade scaling**: +15% count, –15% HP, behavior rate 0.22, elite chance Arcade
- **Leaderboard submission**, persistent records, drop rate +10%
- **Visual phase progression**: P1→P2→P3 crossfade su boss defeat

---

## Acceptance Criteria

1. Arcade gating: `isArcadeMode()` attiva `ArcadeLevelScript`, non `WaveManager`. Nessuna chiamata a `WaveManager.update()` in Arcade.
2. Burst spawn: le 15 wave definitions generano burst temporali. Nemici spawnano in formazioni corrette.
3. Combo preservato: kill → combo +1, timer 3s, decay, graze extend 0.5s, cap 5.0. HUD colori e pulse.
4. Modifier preservato: pick post-boss (3) e post-miniboss (2). Stacking, non-stack exclusion, recalculate.
5. Mini-boss preservato: threshold 0.70× base, cooldown 12s, max 2/wave, HP 0.40×.
6. Post-boss flow: pick carte → intermission → phase transition P1→P2→P3.
7. Infinite loop: C4+ ricicla C1–C3 defs con diff +0.20/cycle e formation remix 40%.
8. Campagna intatta: V8 Story mode funziona esattamente come prima.
9. Performance: frame budget < 16.6ms. Nessun leak.

---

## Note Operative

- **Version bump**: v8.0.0 (major — pivot architetturale)
- **Commit prefix**: `feat(v8.0): arcade v8 migration — [task]`
- **Non toccare**: Weapon evolution, GODCHAIN, perk system, boss core (HP/collision), audio system, DrawPipeline base
- **Test first**: per ogni sistema estratto, scrivere test prima dell'implementazione (verification-driven)

---

## Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---|---|---|---|
| Feeling Arcade cambia (time-driven vs clear-driven) | Alta | Medio | Test play + tuning `BURST_INTERVAL_PER_PHASE` per simulare pacing |
| Mini-boss/boss integration con V8 spawner | Medio | Alto | `ArcadeLevelScript` wrappa spawn esistenti, non riscrive `EntityFactory` |
| Modifier UI conflitto con V8 intermission | Medio | Medio | `ModifierChoiceScreen` resta DOM overlay; il gating è sul game state |
| Combo HUD duplicato con V8 HUD | Basso | Medio | `ArcadeComboSystem.drawHUD` disegna solo se `isArcadeMode()` |
| Difficoltà post-C3 sbilanciata | Medio | Medio | `BURST_INTERVAL_PER_PHASE` e diff scaling sono tuning knobs; playtest iterativo |

---

*End of ADR*
