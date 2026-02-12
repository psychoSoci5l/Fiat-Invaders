# Roadmap: FIAT vs CRYPTO

> **Versione attuale**: v4.49.0 (2026-02-12)
> **Focus**: Mobile-first PWA. Desktop fully supported.

---

## IN PROGRESS — Refactor Architetturale (v4.49)

### Fase 1 — Quick Wins (COMPLETATO)
- [x] FloatingTextManager.js — floating text + score popups estratti da main.js
- [x] PerkIconManager.js — perk glow icons estratti da main.js
- [x] PerkManager.js — perk choice/roll/apply logic estratti da main.js

### Fase 2 — Estrazione Strutturale (PARZIALE)
- [x] MiniBossManager.js — spawn/update/draw/hit mini-boss estratti da main.js
- [ ] IntroManager.js — intro screen state machine e DOM manipulation

### Fase 3 — Refactor Profondo
- [ ] HUDManager.js — DOM + canvas HUD updates
- [ ] init() decomposition — spezzare init() in sotto-funzioni nominate

### Fase 4 — Test Minimali (COMPLETATO)
- [x] Test runner (tests/runner.html) — zero dipendenze, console.assert
- [x] test-utils.js — MathUtils + ColorUtils
- [x] test-balance.js — BalanceConfig + ObjectPool
- [x] test-state.js — GameStateMachine + RunState

### Risultati
- main.js: da ~5.470 a ~4.820 righe (~12% riduzione)
- 4 nuovi moduli estratti, ciascuno testabile indipendentemente
- 3 file di test con ~50 assertions

---

## BACKLOG — COMPLETATO (v4.48.0)

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
- Complete IntroManager extraction
- HUDManager extraction
- init() decomposition in main.js
- WebGL renderer option for low-end devices
- Asset preloading with progress bar

### Content
- New bosses (IMF, World Bank)
- Story mode Chapter 4+
- Achievement system
- Ship upgrades (persistent progression)
