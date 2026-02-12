# Roadmap: FIAT vs CRYPTO

> **Versione attuale**: v4.49.0 (2026-02-12)
> **Focus**: Mobile-first PWA. Desktop fully supported.

---

## COMPLETATO — Refactor Architetturale (v4.49)

### Fase 1 — Quick Wins
- [x] FloatingTextManager.js — floating text + score popups estratti da main.js
- [x] PerkIconManager.js — perk glow icons estratti da main.js
- [x] PerkManager.js — perk choice/roll/apply logic estratti da main.js

### Fase 2 — Estrazione Strutturale
- [x] MiniBossManager.js — spawn/update/draw/hit mini-boss estratti da main.js

### Fase 3 — Test Minimali
- [x] Test runner (tests/runner.html) — zero dipendenze, console.assert, 103 assertions
- [x] test-utils.js — MathUtils + ColorUtils
- [x] test-balance.js — BalanceConfig + ObjectPool
- [x] test-state.js — GameStateMachine + RunState

### Skipped (costo > beneficio)
- IntroManager.js — codice DOM raramente toccato, troppo accoppiato con window.* bindings
- HUDManager.js — mix DOM+canvas, funzioni sparse, beneficio minimo
- init() decomposition — funzione eseguita una volta sola, bassa priorità

### Risultati
- main.js: da ~5.470 a ~4.820 righe (~12% riduzione)
- 4 nuovi moduli estratti, ciascuno testabile indipendentemente
- 3 file di test con 103 assertions

---

## COMPLETATO — v4.48.0

- [x] Balance Recalibration Post-Weapon Evolution
- [x] Weapon Evolution Redesign (Linear 5-Level System)
- [x] Formation Visual Audit — `dbg.formations()` console audit
- [x] Spatial partitioning — SpatialGrid.js hash grid 80px
- [x] Formation entry paths — 4 tipi weighted random
- [x] Geometric shape formations — 5 simboli valuta
- [x] iOS icon set — 120/152/167/180/192/1024px
- [x] Privacy link — Settings modal, localized EN/IT

---

## FUTURE IDEAS

### Gameplay
- New enemy types (elite variants, shield enemies)
- Boss attack pattern variety (per-phase unique patterns)
- Combo system (chain kills for multiplier)
- Daily challenge mode
- Leaderboard (local, no server)

### Technical
- WebGL renderer option for low-end devices
- Asset preloading with progress bar

### Content
- New bosses (IMF, World Bank)
- Story mode Chapter 4+
- Achievement system
- Ship upgrades (persistent progression)
