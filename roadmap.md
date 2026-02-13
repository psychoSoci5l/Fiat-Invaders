# Roadmap: FIAT vs CRYPTO

> **Versione attuale**: v4.60.0 (2026-02-13)
> **Focus**: Mobile-first PWA. Desktop fully supported.

---

## TODO — Perk Drop Mechanic Redesign (v4.61)

Il sistema elemental perk (v4.60) è implementato ma usa ancora il trigger bullet-cancel ereditato dal vecchio sistema. I perk devono avere una meccanica di drop propria, separata dalla cancellazione proiettili.

- [ ] Progettare nuova meccanica di acquisizione perk (non bullet-cancel)
- [ ] Scollegare `applyRandomPerk()` dal callback `onBulletCancel` in main.js
- [ ] Implementare nuovo trigger in PerkManager
- [ ] Bilanciare pacing: Fire ~L1, Laser ~L2-3, Electric ~fine C1
- [ ] Testare progressione perk su run completa

---

## COMPLETATO — Elemental Perk System + Meter Rebalance (v4.60)

- [x] 3 perk elementali sequenziali: Fire (splash 30%), Laser (+25% speed, +1 pierce), Electric (chain 20%)
- [x] GODCHAIN trigger cambiato: 3 elementi raccolti → GODCHAIN 10s (era weapon level 5)
- [x] GODCHAIN re-trigger su ulteriori bullet cancel dopo perk 3
- [x] GODCHAIN HUD timer bar
- [x] HYPER durata fissa 10s (era 5s + estensioni)
- [x] Meter decay raddoppiato (2→4/sec)
- [x] Bullet draw elementali (fire trail, laser glow, electric arcs)
- [x] Particle effects: fire impact, electric chain
- [ ] **BLOCCATO**: trigger perk ancora via bullet-cancel → da sostituire in v4.61

---

## COMPLETATO — Premium Purple Neon Unification (v4.53)

- [x] Tutti i bottoni da gold gradient a neon violet outline (#bb44ff)
- [x] CSS vars: `--neon-orange` → `--neon-violet`, `--btn-gold-*` → `--btn-violet-*`
- [x] ~130 edit su style.css (modals, manual, tutorial, settings, whatsnew, pause-btn, sliders)
- [x] Nave BTC: arancione → viola (Constants, Player.js, index.html, DialogueUI)
- [x] StoryScreen: highlights gold → viola
- [x] Arcade mode disabilitato (WIP) — pill greyed out + tag WIP
- [x] What's New aggiornato con entry v4.53
- [x] Preservati gold: HUD score, GODCHAIN, streaks, boss phases, bullet colors

---

## COMPLETATO — Visual Overhaul: Dark Cyberpunk Neon (v4.52)

- [x] Palette neon: magenta, cyan, gold, green su deep space viola-nero
- [x] 11 file modificati, ~100 CSS color replacements
- [x] Sky system, enemies, weapons, bosses, powerups, particles tutti reworked

---

## COMPLETATO — What's New iOS Fix + Update Notification (v4.51)

- [x] iOS scroll fix: `#whatsnew-panel` aggiunto alla whitelist touch passthrough in InputSystem.js
- [x] Root cause: `handleTouch` chiamava `preventDefault()` su touch nel panel (CSS era già corretto)
- [x] Update notification glow: pulsante What's New brilla quando c'è un aggiornamento
- [x] Glow si spegne dopo apertura panel (versione salvata in `fiat_whatsnew_seen`)
- [x] Test su iPhone reale — scroll confermato funzionante

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
