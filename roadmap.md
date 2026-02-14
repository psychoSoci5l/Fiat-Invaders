# Roadmap: FIAT vs CRYPTO

> **Versione attuale**: v5.8.0 (2026-02-14)
> **Focus**: Mobile-first PWA. Desktop fully supported.

---

## COMPLETATO — Arcade "Rogue Protocol" (v5.8.0)

- [x] Arcade mode unlocked — fully playable distinct experience
- [x] 15 roguelike modifiers (5 OFFENSE / 5 DEFENSE / 5 WILD) with apply/stack/recalculate
- [x] Post-boss 3-card modifier choice, post-mini-boss 2-card choice (DOM modal)
- [x] Combo scoring system (3s timeout, graze extends, 0.05x/kill, cap 5.0x at 80 combo)
- [x] Canvas combo HUD with color gradient (white→yellow→orange→red) and pulse animation
- [x] Arcade pacing: 2s intermission, 0.5s horde transition, +15% enemies, -15% enemy HP
- [x] Mini-boss enhancement: lower thresholds (×0.65), 10s cooldown, max 3/wave, modifier rewards
- [x] Post-C3 infinite scaling: wave definitions cycle C1→C3, +20%/cycle difficulty, formation remix 40%
- [x] Modifier effects: fire rate, damage, pierce, critical hit, AoE, chain lightning, bullet time, nano shield, last stand, etc.
- [x] Arcade gameover stats: best combo, modifier picks
- [x] Comprehensive debug utility: `dbg.arcade()`, `dbg.arcadeMod()`, `dbg.arcadePick()`, presets
- [x] New files: `ArcadeModifiers.js`, `ModifierChoiceScreen.js`

---

## COMPLETATO — Premium Boss Redesign + Tap Shield (v5.7.0)

- [x] FED boss: Illuminati Pyramid — All-Seeing Eye with tracking pupil, orbiting $, CRT scanlines, P3 matrix rain
- [x] BCE boss: Star Fortress — 12 energy nodes, segmented golden ring, holographic €, P3 light-leak cracks
- [x] BOJ boss: Golden Torii — rising sun rays, ¥ glow, P2 yield curve EKG, P3 meltdown with heat haze
- [x] Boss HP bar: rounded rect, gradient fill, additive glow, phase threshold markers
- [x] Hexgrid energy shield: honeycomb pattern, radial wave, multi-layer glow, fade-out
- [x] Tap-on-ship shield activation (mobile) — replaces shield button
- [x] Pulsing diegetic ready indicator with rotating dash accents
- [x] Status text sizes +2-3px for better readability
- [x] `dbg.boss(type)` debug command for boss testing

---

## COMPLETATO — Digital Scanline Void (v5.6.0)

- [x] Neon violet scanline split replaces paper tear effect
- [x] Glitch segments, CRT void scanlines, shimmer/breathing, opening/closing flash

---

## COMPLETATO — Cinematic Story Backgrounds (v5.5.0)

- [x] Per-chapter animated backgrounds (falling coins, Matrix rain, network nodes, lightning globe)
- [x] Kill-switch + legacy stars fallback

---

## COMPLETATO — Weapon Deployment Animation (v5.2.0)

- [x] Mechanical slide-out animation on weapon upgrade (ease-out-back, 0.35s)
- [x] LV1 nose barrel (always visible, pulsing glow)
- [x] Geometry cache `_geom` — shared by `_drawShipBody` + `_drawMuzzleFlash`
- [x] Procedural SFX: `weaponDeploy` (whoosh) + `weaponDeployLock` (clank)
- [x] Screen shake + haptic at lock-in (85% progress)
- [x] Deploy cancelled on death/reset

---

## COMPLETATO — Shooting VFX (v5.1.0)

- [x] Nuovo effetto sparo: canvas V-flash direzionale a diamante, 3 layer (inner→outer)
- [x] L'effetto scala con weapon level (+12%/livello, include HYPER boost)
- [x] Variante elementale: Fire (wider), Laser (taller), Electric (side sparks), GODCHAIN (fire tongues)

---

## COMPLETATO — Visual Polish + Elemental Tuning (v5.0.9)

- [x] Rimosso muzzle flash "bolla" (cerchio + ring burst + glow additivo)
- [x] Rimosso flash ring particle dal sistema muzzle spark
- [x] Evoluzione nave più evidente: pod più larghi, staffe montaggio, body scaling progressivo
- [x] Elemental tuning round 2: fire splash 1.2×, electric chain 0.8×, contagion decay 0.7
- [x] Kill rate contagion: 3.4% → 26.9% (target raggiunto)

---

## COMPLETATO — Balance Tuning v5.0.x

### Boss Damage Rebalance (v5.0.5)
- [x] Ricalcolare enemy HP vs DPS effettivo per la nuova curva di progressione
- [x] Boss damage scala con weapon level (`damageMult`) — era flat dal lancio
- [x] Fix missile AoE che non danneggiava i boss (`takeDamage` → `damage`)
- [x] Rimosso boss HP `CYCLE_MULT` (calibrato per vecchio sistema compound)
- [x] Aggiunto `BOSS.DMG_DIVISOR` tunabile da config
- [x] Playtest C1→C2: boss FED kill ~34s (target 35-40s), C2 raggiunto L10 — confermato

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
- ~~Boss attack pattern variety (per-phase unique patterns)~~ ✅ v5.0.4
- ~~Boss visual redesign (premium cyberpunk aesthetic)~~ ✅ v5.7.0
- ~~Combo system (chain kills for multiplier)~~ ✅ v5.8.0
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
