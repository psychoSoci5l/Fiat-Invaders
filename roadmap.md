# Roadmap: FIAT vs CRYPTO

> [!IMPORTANT]
> **Versione attuale**: v4.12.1 (2026-02-08)
> **Focus**: Mobile-first PWA. Desktop fully supported.
> **Stato**: Gameplay completo, in fase di hardening e bugfix.

---

## PROSSIMA SESSIONE: Gameplay Audit con Debug Attivo

> Prima di qualsiasi fix, serve una valutazione sul campo dello stato attuale del gioco.

### Protocollo
1. `dbg.balanceTest()` — attiva tracking + perf profiler
2. Giro completo: Arcade BTC, Ciclo 1 → Boss FED → Ciclo 2 inizio
3. `dbg.report()` — analytics completo + performance
4. Annotare: cosa funziona, cosa stona, cosa è rotto
5. Decidere priorità della patch sulla base dei dati reali

### Osservare durante il gioco
- Formazioni: nemici fuori schermo? CHEVRON overflow?
- Proiettili nemici: confusione con power-up?
- Drop rate: troppi power-up? Boss triviali?
- Performance mobile: jank? GC spikes?
- Tutorial: funziona al primo avvio? Chiaro?
- Manual: scroll fluido? Contenuti utili?
- Modo Story: flow narrativo completo? Reset campagna?

---

## FASI COMPLETATE (v1.0 → v4.12.1)

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

### BUG 1: Boss phase thresholds ignorano config
**Severità**: Media | **Rischio**: Zero | **Complessità**: 2 righe
**File**: `src/entities/Boss.js` — `damage()`, righe 72/74
**Problema**: `0.66` e `0.33` hardcoded. `Balance.BOSS.PHASE_THRESHOLDS` esiste ma non viene letto.
**Fix**:
```javascript
const thresholds = window.Game.Balance?.BOSS?.PHASE_THRESHOLDS || [0.66, 0.33];
if (hpPct <= thresholds[1] && this.phase < 3) { ... }
else if (hpPct <= thresholds[0] && this.phase < 2) { ... }
```

---

### BUG 2: CHEVRON formation overflow → nemici nella zona player
**Severità**: Alta | **Rischio**: Basso | **Complessità**: ~30 righe
**File**: `src/managers/WaveManager.js` — `generateChevron()`, righe 657-677
**Problema**: 1 nemico/braccio/riga → `(count+1)/2` righe. Con scaling ciclico (×1.25/×1.5), CHEVRON di Cycle 2+ producono 10+ righe che superano la Y-safety zone.
**Opzioni**:
- A: Braccia larghe (2 nemici/braccio/riga → dimezza righe)
- B: Spaziatura Y compressa (0.75 → ~0.45 per CHEVRON)
- Estrarre moltiplicatore Y in `Balance.FORMATION`

---

### BUG 3: Y-clamp hardcoded a 0.65
**Severità**: Media | **Rischio**: Zero | **Complessità**: 2 righe
**File**: `src/managers/WaveManager.js` — riga 507
**Problema**: `maxYBound = gameH * 0.65` hardcoded. Non configurabile.
**Fix**: Estrarre in `Balance.FORMATION.MAX_Y_RATIO` con fallback 0.65.

---

### BUG 4: Confusione visiva proiettili nemici ↔ power-up
**Severità**: Alta | **Rischio**: Medio | **Complessità**: ~100 righe
**File**: `src/entities/Bullet.js` — `drawEnemyBullet()`
**Problema**: Proiettili "coin" (rotondi, metallici, brillanti) assomigliano ai power-up.
**Obiettivo**: Sistema tier-based (WEAK/MEDIUM/STRONG) con visual distinti.
**Regola**: "Se brilla d'oro → raccoglilo". Mai glow dorato sui nemici.
**Attenzione**: Due tentativi di riscrittura rifiutati. Il codice shape-based v4.11.0 è il BASELINE di qualità da eguagliare o superare.

---

### BUG 5: Entità sovradimensionate (65px nemici)
**Severità**: Media | **Rischio**: Alto | **Complessità**: Multi-file
**File**: `src/entities/Enemy.js` riga 5 (`super(x, y, 65, 65)`)
**Problema**: Nemici 65×65px = 2× power-up (30px). Formazioni dense → muro impenetrabile.
**Target**: ~36×36px con riduzione proporzionale di spacing, proiettili, power-up.
**Rischio**: Tocca rendering di tutte le entità. Richiede playtest approfondito.

---

### BUG 6: Drop rate feedback loop → boss triviali
**Severità**: Media | **Rischio**: Zero | **Complessità**: Config only
**File**: `src/config/BalanceConfig.js` — `DROPS`
**Problema**: 6%/4%/2% + pity 30 = pioggia power-up → DPS esplode → boss in <30s.
**Target**: `0.04/0.025/0.015`, pity 40, max 5 drop per boss fight.

---

### BUG 7: Firing nemico scala linearmente con conteggio
**Severità**: Media | **Rischio**: Medio | **Complessità**: Nuovo sistema
**Problema**: HarmonicConductor beat-driven, ma più nemici = proporzionalmente più proiettili. Con scaling ciclico diventa ingestibile.
**Soluzione**: Fire budget (3-5 proiettili/sec), distribuito per peso tier.

---

### Priorità consigliata (da rivalutare dopo gameplay audit)

| # | Bug | Rischio | Complessità | Priorità |
|---|-----|---------|-------------|----------|
| 1 | Boss thresholds | Zero | 2 righe | **Immediato** |
| 3 | Y-clamp config | Zero | 2 righe | **Immediato** |
| 2 | CHEVRON overflow | Basso | ~30 righe | **Alto** |
| 6 | Drop rate | Zero | Config only | **Alto** |
| 4 | Visual proiettili | Medio | ~100 righe | **Medio** |
| 5 | Entity resize | Alto | Multi-file | **Medio** (dopo 4) |
| 7 | Fire budget | Medio | Nuovo sistema | **Basso** (dopo 5+6) |

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
