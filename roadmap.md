# Roadmap: FIAT vs CRYPTO

> [!IMPORTANT]
> **Versione attuale**: v4.17.0 (2026-02-08)
> **Focus**: Mobile-first PWA. Desktop fully supported.
> **Stato**: Gameplay completo, in fase di hardening e bugfix.

---

## v4.16.0 — Post-Audit Balance Tuning (COMPLETATO)

> Dati dal gameplay audit: BTC Arcade Normal, 3 cicli completi, 7:27, 0 morti.
> Problemi critici: cicli 50-60% più veloci del target, boss C1/C2 triviali (<13s),
> 78 power-up raccolti (10.5/min), CHEVRON Y-overflow confermato.

### Modifiche implementate

- [x] **Drop rate dimezzato** — STRONG 6%→3%, MEDIUM 4%→2.5%, WEAK 2%→1%, pity 30→45 kills
- [x] **Drop scaling ridotto** — cycle bonus 1%→0.5%, pity reduction 5→3 kills/cycle
- [x] **Boss HP boost +25-40%** — BASE 2400→3000, PER_LEVEL 50→65, PER_CYCLE 1000→1400
- [x] **Boss phase thresholds da config** — Boss.js:72,74 ora legge Balance.BOSS.PHASE_THRESHOLDS
- [x] **CHEVRON Y-overflow fix** — Y-mult 0.75→0.55 da config, MAX_Y_RATIO estratto (era 0.65 hardcoded)

### Impatto atteso (stime)
| Metrica | Prima | Target |
|---------|-------|--------|
| Power-up/run | ~78 | ~30-40 |
| Cycle 1 | 2:08 | 3:30-4:30 |
| Cycle 2 | 2:02 | 4:00-5:00 |
| Cycle 3 | 3:11 | 5:00-6:00 |
| Boss FED (C1) | 12.7s | 30-50s |
| Boss BCE (C2) | 9.7s | 30-50s |
| Boss BOJ (C3) | 62.7s | 50-75s |

---

## v4.15.0 — Power-Up Visual Design: Category Distinction (COMPLETATO)
- MODIFIER shape: hexagon → 4-pointed diamond (distinzione chiara da UPGRADE stella)
- Glow effects su tutte e 3 le categorie (UPGRADE gold, MODIFIER/SPECIAL color-matched)
- Gerarchia visuale: Star (permanente) / Diamond (temp stackabile) / Circle+Ring (temp esclusivo)

---

## v4.14.0 — Game Balance Rebalancing (COMPLETATO)
- Enemy size -25% (65→48px), spawn +25%, enemy bullets -40% (size+speed)
- Formation spacing ridotto, collision hitbox ricalcolati
- Fire rate invariato (Option A)

---

## v4.14.1 — Debug: Power-Up Economy Report (COMPLETATO)
- `dbg.powerUpReport()` per analisi ciclo di vita drop (spawned/collected/expired)
- Tracking hooks in main.js + Player.js (weapon events, GODCHAIN, modifier overlap)
- Analytics estesi con weaponTimeline, dropsSpawned, modifier overlap frames

---

## v4.17.0 — Unified Balance & Bugfix Patch (COMPLETATO)

> Power-up economy fix, enemy bullet distinction, fire budget system.

### Modifiche implementate

- [x] **Power-Up Economy Fix** (target 30-40/run, was 62)
  - Boss: DROP_INTERVAL 25→40, COOLDOWN 1.5→3.0s, MAX_DROPS_PER_BOSS=6
  - Pity: PITY_BASE 45→55, PITY_REDUCTION 3→2
  - CYCLE_BONUS 0.5%→0% (flat rate), WEAPON_COOLDOWN 5→8s
- [x] **BUG 4: Enemy bullet visual distinction**
  - Glow ridotto (r+6→r+3, alpha dimezzato), hostile tint (70% nemico + 30% rosso)
  - White ring → dark hostile ring, white contours → dark semi-transparent
  - Trail alpha 0.35/0.15→0.20/0.08
- [x] **BUG 7: Fire Budget System** in HarmonicConductor
  - Per-cycle bullet limits: C1=25, C2=45, C3=70 bullets/sec
  - Bear Market +10, PANIC +30%, Rank ±15%
  - Budget recharge per-frame, cap 1.5x, skip commands when exhausted
- [x] **BUG 5 closed** — 48px confirmed OK (v4.14.0)

### Protocollo test
1. `dbg.balanceTest()` → partita BTC Arcade Normal, 3 cicli
2. `dbg.report()` + `dbg.powerUpReport()` → confronto power-up totali vs target 30-40
3. Verificare visivamente proiettili nemici vs power-up
4. Verificare fire budget limita densità senza rendere il gioco facile

---

## FASI COMPLETATE (v1.0 → v4.13.0)

> Archivio compatto di tutto ciò che è stato implementato. Dettagli nelle versioni precedenti di questo file o in CHANGELOG.md.

| Fase | Versione | Contenuto |
|------|----------|-----------|
| 1-3 | v1.x | Architettura (namespace pattern), object pooling, EventBus, iOS PWA |
| 4-6 | v1.x | Neon visuals, juice (shake/flash), boss 3 fasi, procedural audio, persistence |
| 7 | v1.1 | Balance pass (SOL/ETH), panic selling, mobile button fix |
| 7.5 | v1.x | 5 wave/boss cycle, perk flow, code-drawn entities |
| 8-9 | v1.x | Bear Market mode (red aesthetics, 1.3x difficulty), sky parallax + lightning |
| 10-11 | v1.x | Canvas optimization, meme system, difficulty/progression scaling |
| 12-13 | v2.x | Visual identity refresh, mini-boss system (10 currency triggers), 100+ memes |
| 14 | v2.3 | Curtain reveal, PLAY → "CHANGE THE SYSTEM", launch animation |
| 15-16 | v2.x | Fibonacci firing, tier distribution, game rebrand FIAT vs CRYPTO, message system |
| 17 | v2.x | Cell-shading (outlines, two-tone, rim light, speed lines, ink splatters, flat sky) |
| 18 | v2.x | Deep balance (boss HP/graze/drops), UX polish, audio completeness, content expansion |
| 19 | v2.x | Story Campaign Mode (FED→BCE→BOJ, NG+, CampaignState) |
| 19.5-19.6 | v2.x | Bugfix pass, code consolidation (BalanceConfig, DropSystem, MemeEngine, ColorUtils) |
| 20 | v2.12 | Gameplay redesign Ikeda-style, intro screen redesign, game cycle fixes |
| 21 | v2.x | Player manual (6 tabs), technical revision, campaign mode fix |
| 22 | v2.12-13 | HYPER graze, hit stop/juice, wave choreography, Satoshi's Sacrifice, graze sound |
| 23 | v2.14-15 | Tech debt (MathUtils, ParticlePool, EffectsRenderer, ParticleSystem extraction) |
| 24 | v2.15.2-9 | Code quality (memory leaks, iOS audio, console cleanup, icon/privacy/i18n, PWA hotfixes) |
| 24-vis | v2.19 | Enemy bullet shapes (coin/bill/bar/card), death animations per forma, audio differenziato |
| 25 | v2.24 | Final balance pass (difficulty curve, combat feel, boss encounters, power-up economy) |
| 26 | v2.24 | 1-Hit = 1-Life system (HP 3→1, death slowmo, bullet explosions) |
| 27 | v3.0.7 | Compact wave info HUD ("CYCLE X - WAVE Y/5") |
| 28 | v4.0 | Wave/Horde system redesign (15 waves, 16 formations, currency themes, Bear Market scaling) |
| 29 | v4.0.1-4.1 | Gameplay polish (bug fixes, fairness, formations, HYPER touch, Rank System) |
| 30 | v4.1.1 | Polish pass (intermission memes, wave 1-2 buff, formation overlap fix, HUD debug) |
| 31 | v4.1.2 | Formation generator fixes (DIAMOND/ARROW/CHEVRON/FORTRESS), meme readability |
| 32 | v4.2.2 | Formation system overhaul (row currency, symmetric thinning, X-clamping, entry animation) |
| 33 | v4.3.0 | PWA install prompt (iOS/Android, auto-dismiss, localized) |
| 34 | v4.4.0 | HUD redesign (12→5 channels, compact 45px top bar, diegetic ship HUD, reactive feedback) |
| 35 | v4.5.0 | Game feel overhaul (hit reactions, impact sparks, muzzle flash, tiered explosions, VFX config) |
| 36 | v4.6.0-1 | GODCHAIN mode, meme audit/dedup, post-playtest bug fixes |
| 37 | v4.7.0 | Story Mode narrativa (Prologue + 3 capitoli, StoryScreen, typewriter) |
| 38 | v4.8.0 | Intro screen redesign (STORY/ARCADE tabs, double-tap quick start) |
| 40-partial | v4.10-11 | Engine hardening (GC fix, DOM cache, EventBus audit, perf profiler, i18n audit, draw optimization) |
| Accessibility | v4.12.1 | WCAG AA+ (contrast, tutorial, title, manual v2, meme reposition, version migration) |
| Button Design System | v4.13.0 | Unified 12-class button system, CSS variables, removed 15+ old classes, focus-visible |

---

## FASE ATTIVA: Engine Hardening (Phase 40) — Parziale

> Il gameplay è completo. Focus su solidità, performance e pulizia codice.

### Completati
- [x] **GC pressure fix** (v4.10.0): ~1000+ alloc/sec eliminati (HarmonicConductor, EventBus, handler loops)
- [x] **DOM access caching** (v4.10.0): `_domCache` per `setStyle()`/`setUI()`, refs cached
- [x] **Object reuse** (v4.10.0): `_weaponState` pre-allocato, aggiornato in-place
- [x] **EventBus audit** (v4.10.0): 28 eventi, 5 con listener, 14 orfani (benigni), `beat` rimosso
- [x] **Performance Profiler** (v4.10.1): FPS histogram, percentili, jank counters, GC spike detection
- [x] **Localization audit** (v4.10.1): 17 stringhe hardcoded → chiavi i18n EN/IT
- [x] **Balance fixes** (v4.10.2): BOJ Phase 1 nerfato, mini-boss spam cap, boss HP semplificato
- [x] **Unified debug report** (v4.10.3): `dbg.balanceTest()` auto-perf, `dbg.report()` con sezione PERFORMANCE
- [x] **Draw + GC optimization** (v4.11.0): rgba/font cache, blur rimosso, trail ridotti, shadowBlur eliminato
- [x] **Story Mode bug fixes** (v4.11.0): Campaign persistence, victory score, language, mini-boss guard, skip intermission

### Aperti
- [ ] **Hardcoded Values Audit** (A): Magic numbers in main.js, Player.js, Enemy.js, Boss.js → BalanceConfig
- [ ] **Object pool audit** (B): Verificare che tutti gli oggetti ad alta frequenza siano pooled
- [ ] **Batch rendering** (C): Raggruppare entità simili nel draw call
- [ ] **Off-screen canvas** (C): Pre-rendering per elementi statici/ripetitivi
- [ ] **main.js Decomposition** (E): CollisionSystem.js extraction, state machine, global cleanup
- [ ] **60fps target mobile** (F): Test su device reale durante fasi intensive (boss P3, Cycle 3)
- [ ] **Memory footprint** (F): Stabilità memoria su sessioni lunghe (10+ minuti)

---

## BUGFIX ROADMAP — Da v4.11.0 (base stabile)

> Ogni fix deve essere chirurgico: minimo impatto, massima stabilità.
> Priorità da rivalutare dopo il gameplay audit della prossima sessione.

---

### ~~BUG 1: Boss phase thresholds ignorano config~~ ✅ FIXATO v4.16.0
Boss.js ora legge `Balance.BOSS.PHASE_THRESHOLDS` con fallback [0.66, 0.33].

---

### ~~BUG 2: CHEVRON formation overflow~~ ✅ FIXATO v4.16.0
Y-spacing estratto in `Balance.FORMATION.CHEVRON_Y_MULT` (0.75→0.55).

---

### ~~BUG 3: Y-clamp hardcoded a 0.65~~ ✅ FIXATO v4.16.0
Estratto in `Balance.FORMATION.MAX_Y_RATIO` con fallback 0.65.

---

### ~~BUG 4: Confusione visiva proiettili nemici ↔ power-up~~ ✅ FIXATO v4.17.0
Approccio conservativo (no riscrittura): glow ridotto, hostile tint (rosso), white ring→dark ring, trail dimmed.
Shape-based system preservato (coin/bill/bar/card). Contorni bianchi→scuri su tutte le forme.

---

### ~~BUG 5: Entità sovradimensionate (65px nemici)~~ ✅ CHIUSO v4.17.0
Ridimensionamento a 48px completato in v4.14.0. Confermato OK dopo playtest.

---

### ~~BUG 6: Drop rate feedback loop → boss triviali~~ ✅ FIXATO v4.16.0
Drop rates dimezzati: 3%/2.5%/1%, pity 45. Boss HP +25-40%. Cycle bonus ridotto.

---

### ~~BUG 7: Firing nemico scala linearmente con conteggio~~ ✅ FIXATO v4.17.0
Fire budget integrato in HarmonicConductor: C1=25, C2=45, C3=70 bullets/sec.
Bear Market +10, PANIC +30%, Rank ±15%. Budget recharge per-frame, skip se esaurito.

---

### Priorità rimanente — TUTTI I BUG RISOLTI

| # | Bug | Stato |
|---|-----|-------|
| ~~1~~ | ~~Boss thresholds~~ | ✅ v4.16.0 |
| ~~2~~ | ~~CHEVRON overflow~~ | ✅ v4.16.0 |
| ~~3~~ | ~~Y-clamp config~~ | ✅ v4.16.0 |
| ~~4~~ | ~~Visual proiettili~~ | ✅ v4.17.0 |
| ~~5~~ | ~~Entity resize~~ | ✅ v4.17.0 (chiuso, 48px OK) |
| ~~6~~ | ~~Drop rate~~ | ✅ v4.16.0 |
| ~~7~~ | ~~Fire budget~~ | ✅ v4.17.0 |

---

## BACKLOG FUTURO

> Idee parcheggiate, da valutare dopo il bugfix sprint.

### Formation Visual Audit (ex Phase 39)
- [ ] Test visivo di ciascuna delle 16 formazioni con debug overlay
- [ ] Tuning spaziatura/fattori per formazione
- [ ] Verifica a tutti i conteggi (8-24) e larghezze schermo

### main.js Decomposition (ex Sprint 23.4)
- [ ] CollisionSystem.js (~400 righe estraibili)
- [ ] State machine formale (eliminare if/else chains)
- [ ] Global variable cleanup → RunState o manager dedicati

### Performance (ex Sprint 25)
- [ ] Spatial partitioning: collisioni grid-based O(n) vs O(n²)
- [ ] Draw call batching per tipo entità
- [ ] Off-screen canvas per elementi statici

### Content & Polish
- [ ] Formation entry paths (curve, loop-de-loops, split)
- [ ] Geometric shape formations (simboli valuta)
- [ ] iOS icon set completo (120, 152, 167, 180, 1024px)
- [ ] Privacy link in settings/footer
