# Roadmap: FIAT vs CRYPTO

> [!IMPORTANT]
> **Versione attuale**: v4.30.0 (2026-02-09)
> **Focus**: Mobile-first PWA. Desktop fully supported.
> **Stato**: Gameplay completo, in fase di hardening e polish grafico.

---

## v4.30.0 — Batch Rendering (COMPLETATO)

> Riduzione ~30% dei canvas state changes per frame tramite batching delle draw call per composite operation.

### Implementato

- [x] ParticleSystem multi-pass draw: standard (source-over) → additive (lighter) in 2 pass separati
- [x] Player bullet glow batching: `drawGlow(ctx)` estratto, singolo pass additive in main.js
- [x] Floating text shared setup: textAlign/textBaseline/strokeStyle/lineWidth hoistati prima del loop
- [x] Zero cambiamenti gameplay — rendering visivamente identico

---

## v4.29.0 — Object Pool Audit (COMPLETATO)

> Ottimizzazione GC pressure e allocazioni per-frame. Zero cambiamenti gameplay.

### Implementato

- [x] ObjectPool.release: `indexOf` O(n) → `_inPool` flag O(1) (~150-300 confronti/frame eliminati)
- [x] Pre-allocazione oggetti hot-path: `_playerState`, `_stateObj`, `_sparkOpts` (~10-20 allocazioni/frame eliminate)
- [x] ParticleSystem.update: backward+splice → forward write-pointer compaction (1 passo O(n) vs ~15 splice O(n))
- [x] Rimosso dead code: `ParticlePool.getActive()` (mai chiamato, faceva `.slice()`)

---

## v4.28.0 — main.js Decomposition (COMPLETATO)

> Estratti CollisionSystem, GameStateMachine, espanso RunState. main.js ridotto ~400+ righe.

### Implementato

- [x] CollisionSystem.js: 4 collision loop estratti con callback pattern
- [x] GameStateMachine.js: transition table con validazione
- [x] RunState.js espanso: ~30 variabili per-run migrate da main.js
- [x] Zero cambiamenti gameplay

---

## v4.27.0 — Hardcoded Values Audit Tier 1 (COMPLETATO)

> Estratti ~70 magic numbers gameplay-critical da Player.js, Enemy.js, Boss.js e main.js in BalanceConfig.js. Tutto il tuning ora vive in `G.Balance.*`.

### Implementato

- [x] Extended `Balance.PLAYER` con 13 nuovi parametri (spawn, movement, combat, shield)
- [x] Nuovo `Balance.GAME` (BASE_WIDTH, BASE_HEIGHT)
- [x] Extended `Balance.ENEMY_BEHAVIOR` con teleport, wave patterns, entry animation, flash fade
- [x] Extended `Balance.BOSS` con MOVEMENT e ATTACKS per tutti e 3 i boss × 3 fasi
- [x] Player.js: ~14 literal → config references
- [x] Enemy.js: ~20 literal → config references
- [x] Boss.js: ~40 literal → config references
- [x] main.js: 3 literal → config references (canvas size, lives)
- [x] Zero cambiamenti gameplay — valori identici pre/post refactor

---

## v4.26.0 — Top Bar Message Strip (COMPLETATO)

> Consolidato i messaggi in-game su **2 soli punti di comunicazione**: Message Strip DOM (sotto HUD top bar) + Meme Popup DOM (sopra nave).

### Implementato

- [x] DOM element `#message-strip` dentro `#game-container`, z-index 110
- [x] 4 varianti tipo: DANGER (rosso), VICTORY (oro), WAVE (nero/oro), INFO (nero/cyan)
- [x] Priority queue (3 livelli) con interrupt, cooldown 300ms, coda max 3
- [x] Animazioni CSS: entrance 200ms bounce, exit 300ms fade-up, danger pulse
- [x] Rimossi ~130 righe canvas rendering (WAVE_STRIP, ALERT DANGER/VICTORY, MEME_WHISPER)
- [x] SHIP_STATUS e WAVE_SWEEP canvas preservati
- [x] Config `Balance.MESSAGE_STRIP` in BalanceConfig.js
- [x] Mobile responsive (font 10px @ 380px, 9px @ 320px)

---

## v4.25.0 — Enemy Resize (COMPLETATO)

> Nemici +20% (48→58px). Drop shadows testate e rimosse (nel cielo gli oggetti non proiettano ombra).

### Implementato

- [x] Enemy resize 48→58px (+20%) — tutte le 4 shape + minion
- [x] Collision radius aggiornato (24→29), hitbox/flash/telegraph/shield
- [x] Formation spacing scalato (65→78, grid 60→72, spiral proporzionale)
- [x] Font scaling su tutti i simboli nemici
- [x] Off-screen culling margin 65→80px
- [x] Proiettili nemici invariati (4×4px)
- [x] Drop shadows testate e rimosse (feedback playtesting)

---

## v4.24.0 — Sky & Background Enhancement (COMPLETATO)

> Cell-shading premium sky: gradienti smooth, 90 stelle + shooting stars, 5 layer colline con silhouette, particelle atmosferiche tematiche, nuvole multi-lobe, horizon glow.

### Implementato

- [x] Gradient sky smooth (cached, invalidate on resize)
- [x] Enhanced star field (90 stars, L3+ visible, parallax drift, shooting stars)
- [x] 5-layer parallax hills (distant atmospheric, configurable freq/amp)
- [x] Hill silhouettes (trees + buildings on layers 0-2, cell-shaded outline)
- [x] Atmospheric particles (dust/pollen/firefly/ember per level, cell-shaded outline)
- [x] Multi-lobe clouds (2-4 lobes, shadow/main/highlight/outline)
- [x] Horizon glow band (pulsing, level-matched color)
- [x] Draw pipeline reordered (particles + glow before hills)
- [x] `Balance.SKY` config with master + per-feature toggles
- [x] Resize fix: SkyRenderer.setDimensions() in main.js resize()

---

## v4.23.1 — Glow Boost + Trail & Motion (COMPLETATO)

> Boost dei valori glow per impatto visivo reale + trail additivi sui proiettili + afterimage potenziata + death glow + spark additive.

### Implementato

- [x] Boost tutti i valori `Balance.GLOW` (alpha, radius, pulse)
- [x] Trail additivi su tutti i 9 metodi draw player bullet
- [x] Player afterimage: soglia 80→50, alpha 0.25→0.4, age 0.12→0.18, additive mode
- [x] `DEATH_FLASH` config + lingering glow particle su enemy death
- [x] `isSpark` flag + rendering additive per white sparks d'impatto
- [x] Enemy bullets invariati

---

## v4.23.0 — Premium Graphics v1: Glow & Bloom (COMPLETATO)

> Additive blending (`globalCompositeOperation: 'lighter'`) su player bullets, engine, muzzle flash, aure HYPER/GODCHAIN, power-up e ring esplosioni. Master toggle `Balance.GLOW.ENABLED`.

### Implementato

- [x] `Balance.GLOW` config block con toggle per-element (BULLET, ENGINE, MUZZLE, AURA, POWERUP, PARTICLES)
- [x] Player bullet pulsing radial glow (additive)
- [x] Engine flame additive glow (warm orange)
- [x] Muzzle flash bloom pass (1.4x radius)
- [x] HYPER + GODCHAIN aura additive wrap
- [x] Power-up outer glow additive (1.2x radius)
- [x] Explosion ring particles additive blending
- [x] Enemy bullets untouched (hostile tint v4.17 preserved)

---

## v4.22.0 — Bullet System v2.0 (COMPLETATO)

> Circle collision, missile AoE fix, centralized bullet config, debug hitbox overlay.

### Implementato

- [x] **BULLET_CONFIG** in BalanceConfig.js — collision radius, speed, piercing per bullet type
- [x] **BulletSystem.js** — `circleCollide()`, `bulletHitsEntity()`, `handleMissileExplosion()`, `drawDebugOverlay()`
- [x] **Circle Collision** — Sostituiti tutti i check AABB con circle-vs-circle (player→enemy, enemy→player, bullet cancel)
- [x] **Missile AoE** — `isMissile`/`aoeRadius` ora funzionano: danno radiale, knockback, particelle, shake
- [x] **Bullet.collisionRadius getter** — auto-resolve da config per tipo (NORMAL/HOMING/PIERCE/LASER/MISSILE/ENEMY)
- [x] **Debug Hitbox Overlay** — `dbg.hitboxes()` toggle visuale, cerchi colorati per entita e zone graze

---

## v4.21.0 — Gameplay Flow & Quality of Life (COMPLETATO)

> Playtest v4.20.0: HYPER sottoutilizzato (82 graze, solo 2 attivazioni), countdown inter-wave spezza il ritmo, bug menu buttons post-game-over, manual non scrollabile su iPhone.

### Implementato

- [x] **HYPER Auto-Activate** — `Balance.HYPER.AUTO_ACTIVATE: true`. Graze meter al 100% triggera HYPER automaticamente. Pulsante HYPER nascosto quando auto-activate attivo
- [x] **Seamless Wave Transitions** — Rimosso countdown 3-2-1 bloccante. `START_INTERMISSION` ora fa cleanup inline (bullet bonus, clear, audio, meme) e cade through a `START_WAVE`. Boss-defeat intermission preservata
- [x] **Bug Fix: Menu Buttons** — Root cause: `.dialogue-container` con `pointer-events: auto` quando invisibile bloccava i tap. Fix: `pointer-events: none` di default, `auto` solo su `.visible`. Anche: `#intro-screen` z-index 250, InputSystem esclude intro, dialogue cleanup in `backToIntro()`
- [x] **Bug Fix: iPhone Manual** — `overflow-y: scroll` (iOS esplicito), `overscroll-behavior: contain`, `100dvh`, safe-area insets. InputSystem esclude touch su modali (#manual-modal, #settings-modal, #help-panel, #tutorial-overlay)
- [x] **Unified Boss Rotation** — Deprecato CampaignState boss tracking. Rotazione sempre `marketCycle % 3` (FED→BCE→BOJ). Campaign reset a ogni nuova partita
- [x] **PWA Banner Polish** — Nascosto in selezione nave, centramento migliorato, spacing corretto con CTA

---

## v4.20.0 — Meme Popup System (COMPLETATO)

> I meme canvas (13px italic, alpha 0.35, posizione random) erano illeggibili. Il player guarda la navicella (bottom-center), quindi i meme venivano persi.

### Implementato

- [x] **DOM Popup** — `#meme-popup` whisper-style inside `#game-container`, z-index 90, bottom 240px, `pointer-events: none`
- [x] **Whisper Aesthetic** — Italic gold text, black outline, no box background (canvas whisper style)
- [x] **3-Tier Priority** — CRITICAL (rosso: boss defeat, death), HIGH (oro: boss spawn, upgrades), NORMAL (oro smorzato: modifiers, streak, graze)
- [x] **Priority Queue** — MemeEngine.js `queueMeme()` API, max 5 queued, CRITICAL interrupts, sorted by priority
- [x] **11 Event Types** — incl. BOSS_TICKER, durate configurabili in `Balance.MEME_POPUP.DURATIONS`
- [x] **Boss dialogues unificate** — BOSS_INTRO + BOSS_PHASE ora via popup con speaker label (POWELL, LAGARDE, KURODA)
- [x] **Boss ticker via popup** — Rotazione meme boss durante il fight usa il popup
- [x] **Intermission meme via popup** — Sostituito rendering canvas
- [x] **Power-up routing** — Categoria power-up → tier meme (UPGRADE/SPECIAL→HIGH, MODIFIER→NORMAL)
- [x] **Death meme** — CRITICAL popup su respawn
- [x] **Pause menu** — Prefisso `>` → `⟡`, testo allineato a sinistra

---

## v4.19.2 — Mode-Aware Tutorial + Mobile Control Fix (COMPLETATO)

> Il tutorial (v4.12.0) mostrava contenuto identico per Story e Arcade, e il testo mobile diceva sempre "joystick" anche con controlli SWIPE.

### Implementato

- [x] **Tutorial per modalita** — Step "Obiettivo" differenziato: Story ("3 atti, FED→BCE→BOJ") vs Arcade ("ondate infinite, record")
- [x] **Controlli mobile dinamici** — Legge `localStorage.fiat_control_mode` e mostra Swipe o Joystick
- [x] **localStorage per-mode** — `fiat_tutorial_story_seen` / `fiat_tutorial_arcade_seen` (backward compat con `fiat_tutorial_seen`)
- [x] **4 chiavi i18n** — `TUT_CONTROLS_MOBILE_SWIPE/JOY`, `TUT_OBJECTIVE_STORY/ARCADE` (EN+IT)

---

## v4.19.1 — Boss Movement Freeze Fix (COMPLETATO)

> Playtest v4.19.0: tutti i boss (FED/BCE) smettono di muoversi dopo transizione di fase.

### Root Cause
- Phase transition shake (`this.x += random * shakeIntensity`) causa random walk fino a ±40px
- Boundary check faceva solo `dir *= -1` senza clamp della posizione
- Step di movimento (~0.88px/frame) insufficiente per uscire dalla zona di overshoot → oscillazione sub-pixel permanente

### Fix
- [x] **Boundary clamp** — FED P1/P2, BCE P1/P2/P3 ora clampano posizione + impostano dir assoluta
- FED P3 e BOJ (tutti i phase) già usavano lerp+clamp, non affetti

---

## v4.19.0 — Adaptive Drop System (COMPLETATO)

> Playtest v4.18: 19 drops in 4:32, SHOT_LV3 at 0:46, 0 GODCHAIN activations.
> Sistema adattivo che interroga lo stato del player prima di droppare.

### Implementato

- [x] **Player Power Score** — 0.0→1.0 composite (shot 40%, mods 35%, special 25%)
- [x] **Suppression Gate** — drop soppresso con probabilità = power score
- [x] **Need-Based Category Selection** — weighted random proporzionale ai bisogni
- [x] **Config ADAPTIVE_DROPS** — in BalanceConfig.js (SUPPRESSION_FLOOR, CATEGORY_WEIGHTS)
- [x] **Debug tracking** — dropsSuppressed in analytics, sezione ADAPTIVE SUPPRESSION in powerUpReport()

### Impatto atteso

| Stato player | Power Score | Soppressione |
|---|---|---|
| Inizio partita | 0.00 | 0% |
| Dopo LV2 | 0.20 | 20% |
| LV3 + qualche mod | 0.53 | 53% |
| Dopo morte (LV2) | 0.20 | 20% (recovery veloce) |

Target: ~12-14 drops in 4:30 (era 19).

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
- [x] **Hardcoded Values Audit** (A): Magic numbers in main.js, Player.js, Enemy.js, Boss.js → BalanceConfig ✅ v4.27.0
- [ ] **Object pool audit** (B): Verificare che tutti gli oggetti ad alta frequenza siano pooled
- [ ] **Batch rendering** (C): Raggruppare entità simili nel draw call
- [ ] **Off-screen canvas** (C): Pre-rendering per elementi statici/ripetitivi
- [x] **main.js Decomposition** (E): CollisionSystem.js, GameStateMachine.js, RunState expansion ✅ v4.28.0
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

### main.js Decomposition (ex Sprint 23.4) ✅ v4.28.0
- [x] CollisionSystem.js (~350 righe estratte, callback pattern)
- [x] GameStateMachine.js (transition table, validation, setGameState wrapper)
- [x] RunState expansion (~30 per-run variables moved, syncFromRunState bridge)

### Performance (ex Sprint 25)
- [ ] Spatial partitioning: collisioni grid-based O(n) vs O(n²)
- [ ] Draw call batching per tipo entità
- [ ] Off-screen canvas per elementi statici

### Content & Polish
- [ ] Formation entry paths (curve, loop-de-loops, split)
- [ ] Geometric shape formations (simboli valuta)
- [ ] iOS icon set completo (120, 152, 167, 180, 1024px)
- [ ] Privacy link in settings/footer
