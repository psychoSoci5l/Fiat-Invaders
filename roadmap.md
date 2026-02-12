# Roadmap: FIAT vs CRYPTO

> **Versione attuale**: v4.50.0 (2026-02-12)
> **Focus**: Mobile-first PWA. Desktop fully supported.

---

## TODO — What's New scroll fix (iOS Safari)

- [ ] What's New panel non scrolla su iPhone reale (scroll funziona in emulatore desktop)
- [ ] Copiare esattamente il pattern CSS del manual-v2 (che funziona su iPhone): `height: 100dvh` esplicito su mobile, `overflow: visible`, `.whatsnew-scroll` con `flex: 1; min-height: 0; overflow-y: scroll`
- [ ] Verificare se `body { touch-action: none }` interferisce (manual ha `touch-action: pan-y` sul modal)
- [ ] Test su iPhone reale prima di chiudere

---

## COMPLETATO — Arcade Mode Enhancements (v4.50)

- [x] High score separati Story/Arcade (chiavi localStorage distinte + migrazione one-time)
- [x] Gameover Arcade con stats progressione (cycle/level/wave)
- [x] Arcade Records persistenti (bestCycle, bestLevel, bestKills) con badge "NEW BEST!"
- [x] Arcade Records visibili nell'intro screen (selection state)
- [x] Stringhe i18n EN/IT per nuovi elementi
- [x] What's New panel (icona intro → changelog + planned features per i tester)
- [x] Stop localStorage wipe on version change (records persistono tra aggiornamenti)

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
