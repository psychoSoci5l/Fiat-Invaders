# Launchpad: Arcade V8 Migration

> Prompt da incollare in una nuova sessione Claude Code (`/new` o `/clear`) per riprendere la migrazione senza contesto precedente.

---

## Prompt da copiare/incollare

```
/epic arcade-v8-migration

Continua la migrazione Arcade mode da WaveManager legacy a V8 scroller.
Prima di tutto, recupera contesto leggendo questi file in ordine:

1. docs/ROADMAP_ARCADE_V8.md — roadmap completa (visione, architettura, 10 task, acceptance criteria)
2. production/session-state/active.md — checklist attiva con stato corrente dei task
3. design/gdd/arcade-rogue-protocol.md — cosa preservare (combo, modifier, miniboss, post-boss flow, infinite loop)
4. design/gdd/v8-scroller.md — motore target (burst temporali, pattern, livelli)
5. design/gdd/wave-legacy-arcade.md — cosa abbandoniamo (phase streaming, WaveManager Arcade path)

Decisione già presa dall'utente:
- Opzione A: 1 livello infinito V8, burst temporali che simulano le 15 wave definitions
- Spawn time-driven (non più clear-driven). Tuning via BURST_INTERVAL_PER_PHASE in BalanceConfig.
- Combo, modifier stack, miniboss trigger, post-boss pick, phase transition P1→P2→P3, infinite loop post-C3 si preservano.
- WaveManager Arcade path diventa inerte (early return in update()).

Sequenza task (segui la checklist in active.md per lo stato corrente):
1. ADR & Design Doc
2. Estrazione Combo System
3. Estrazione Modifier System
4. Estrazione Mini-Boss System
5. ArcadeLevelScript
6. Integrazione main.js + GameplayCallbacks
7. Deprecazione WaveManager Arcade
8. BalanceConfig V8_ARCADE block
9. Unit Test Suite
10. Smoke & Regression

VINCOLI TECNICI (dal progetto):
- Rispondi SEMPRE in italiano. Mai mischiare EN/IT.
- Non toccare campaign V8 (src/v8/LevelScript.js story path).
- Non toccare combat core (bullet, perk, HYPER, GODCHAIN).
- Non toccare audio system, DrawPipeline base, EntityFactory.
- BalanceConfig.js è legge: tuning solo lì, mai hardcode in entity files.
- Test first: scrivi test prima dell'implementazione (verification-driven).
- Batch edits, no ping-pong. Scegli invece di proporre opzioni.
- Version target: v8.0.0 (major bump). Commit prefix: feat(v8.0): ...
- Segnala over-engineering PRIMA di eseguire, non dopo.

CHIEDI ALL'UTENTE quale task iniziare, o se vuole saltare l'ADR e partire dal codice.
```

---

## Riferimenti veloci

| Cosa | Dove |
|------|------|
| Roadmap | `docs/ROADMAP_ARCADE_V8.md` |
| Checklist task | `production/session-state/active.md` |
| GDD Arcade | `design/gdd/arcade-rogue-protocol.md` |
| GDD V8 | `design/gdd/v8-scroller.md` |
| GDD Wave legacy | `design/gdd/wave-legacy-arcade.md` |
| ADR (da scrivere) | `docs/architecture/adr-0015-arcade-v8-migration.md` |
| File nuovi da creare | `src/systems/ArcadeComboSystem.js`, `src/systems/ArcadeModifierSystem.js`, `src/systems/ArcadeMiniBossSystem.js`, `src/v8/ArcadeLevelScript.js` |
| File da modificare | `src/main.js`, `src/core/GameplayCallbacks.js`, `src/managers/WaveManager.js`, `src/config/BalanceConfig.js`, `src/systems/ArcadeModifiers.js` |

---

*Creato: 2026-05-30*
