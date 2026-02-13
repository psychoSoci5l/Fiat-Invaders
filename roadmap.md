# Roadmap: FIAT vs CRYPTO

> **Versione attuale**: v5.0.0 (2026-02-13)
> **Focus**: Mobile-first PWA. Desktop fully supported.

---

## COMPLETATO — v5.0 Clean Slate

- [x] Rimosso Sacrifice system (~400 righe di codice morto)
- [x] Rimosso script.js (prototipo v2.0, ~700 righe)
- [x] Rimosso legacy WEAPONS/SHIP_POWERUPS/modifiers
- [x] Rimosso ship selection UI (locked to BTC da v4.55)
- [x] Puliti console.log in WeatherController
- [x] Rimossa localStorage migration shim (v4.50)
- [x] Aggiornati docs: SYSTEM_REFERENCE, README, NOTES, roadmap

---

## COMPLETATO — Elemental Perk Drop System (v4.61)

- [x] Perk elementali droppano come power-up fisici (cristalli diamante)
- [x] Pity timer dedicato: KILLS_FOR_PERK = 50
- [x] PERK bypassa suppression (come UPGRADE)
- [x] HYPER meter: accumulo bloccato durante HYPER, riparte da zero
- [x] Rimosso HODL (incompatibile con mobile autofire)

---

## COMPLETATO — Elemental Perk System + Meter Rebalance (v4.60)

- [x] 3 perk elementali sequenziali: Fire (splash 30%), Laser (+25% speed, +1 pierce), Electric (chain 20%)
- [x] GODCHAIN trigger: 3 elementi raccolti → GODCHAIN 10s
- [x] GODCHAIN re-trigger su perk 4+
- [x] HYPER durata fissa 10s, meter decay raddoppiato (2→4/sec)

---

## COMPLETATO — Premium Purple Neon Unification (v4.53)

- [x] Palette neon violet (#bb44ff) per tutto il UI
- [x] ~130 edit su style.css + Constants + Player + StoryScreen

---

## COMPLETATO — Visual Overhaul: Dark Cyberpunk Neon (v4.52)

- [x] Palette neon: magenta, cyan, gold, green su deep space viola-nero

---

## COMPLETATO — Refactor Architetturale (v4.49)

- [x] 4 moduli estratti da main.js (FloatingTextManager, PerkIconManager, PerkManager, MiniBossManager)
- [x] Test suite: 103 assertions

---

## COMPLETATO — Weapon Evolution Redesign (v4.47)

- [x] Linear 5-level system, LASER rimosso, SHIELD/SPEED utility

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
