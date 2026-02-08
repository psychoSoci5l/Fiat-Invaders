# Roadmap: FIAT vs CRYPTO

> [!IMPORTANT]
> **Versione attuale**: v4.16.0 (2026-02-08)
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

## PROSSIMA SESSIONE: v4.17.0 — Balance Pass #2 (Power-Up Economy)

> v4.16.0 ha migliorato enormemente boss e mortalità, ma i power-up restano troppi.
> Dati audit salvati in `tests/console.txt` (v4.15.0) e `tests/console 1.txt` (v4.16.0).

### Problema centrale: Power-Up Flood
v4.16.0 ha raccolto **62 power-up in 8:29** (~7.3/min). Target: **30-40 totali** (~4/min).
Il taglio dal 6/4/2% al 3/2.5/1% ha ridotto solo del 21% perché:

1. **Boss drops non sono limitati dalle drop rate** — usano `BOSS.DROP_INTERVAL` (ogni 25 hit)
   e `BOSS_DROP_COOLDOWN` (1.5s). Con boss fight da 63-79s = ~20-25 drop solo dai boss.
2. **Pity timer a 45 kills** scatta comunque in C2/C3 dove le horde sono 30-50 nemici.
3. **DROP_SCALING.CYCLE_BONUS** aggiunge +0.5%/ciclo — a C3 le rate sono ~4.5%/3.5%/2%.

### Interventi proposti (da discutere)

#### A. Boss Drop Economy (impatto alto, rischio zero)
- `BOSS.DROP_INTERVAL`: 25 → 40 hit (meno drop per boss fight)
- `DROPS.BOSS_DROP_COOLDOWN`: 1.5s → 3.0s (più distanziati)
- Nuovo: **BOSS_MAX_DROPS**: cap 5-6 drop per boss fight (impedisce overflow su fight lunghi)

#### B. Pity Timer Ricalibrato (impatto medio, rischio zero)
- `DROP_SCALING.PITY_BASE`: 45 → 55 (servono più kills senza drop)
- `DROP_SCALING.PITY_REDUCTION`: 3 → 2 kills/ciclo (scaling più lento)
- Alternativa: pity timer a conteggio globale, non per-ciclo

#### C. Cycle Scaling Removal (impatto medio, rischio basso)
- `DROP_SCALING.CYCLE_BONUS`: 0.005 → 0 (nessun aumento rate per ciclo)
- Razionale: i cicli successivi hanno già più nemici = più opportunità di drop naturali

#### D. Weapon Cooldown Esteso (impatto medio, rischio basso)
- `DROPS.WEAPON_COOLDOWN`: 5.0s → 8.0s (meno weapon drop in sequenza rapida)
- Impedisce catene modifier→modifier→modifier in pochi secondi

### Problema secondario: Cicli ancora veloci
| Ciclo | v4.15.0 | v4.16.0 | Target |
|-------|---------|---------|--------|
| C1 | 2:08 | 3:03 | 4-5m |
| C2 | 2:02 | 3:31 | 5-6m |
| C3 | 3:11 | morto C3W4 | 6-7m |

Mancano ~1-2 min per ciclo. Opzioni:
- **Ridurre DPS indirettamente** (meno power-up → già in corso)
- **Enemy HP scaling** più aggressivo (`ENEMY_HP.SCALE`: 15 → 20-25)
- **Weapon evolution nerf** (POWER bonus 25/50/75% → 20/40/60%, o RATE cooldown reduction)
- Non toccare: i cicli veloci possono essere un pregio se il feeling è giusto

### Dati di confronto rapido (per la prossima sessione)

| Metrica | v4.15.0 | v4.16.0 | Target v4.17 |
|---------|---------|---------|--------------|
| Power-up totali | 78 | 62 | 30-40 |
| Morti | 0 | 3 | 2-4 ✅ |
| Boss FED | 12.7s | 63.3s | 45-75s ✅ |
| Boss BCE | 9.7s | 79.4s | 45-75s ✅ |
| HYPER attivazioni | 0 | 1 | 1-3 |
| Ciclo 1 | 2:08 | 3:03 | 4-5m |
| Ciclo 2 | 2:02 | 3:31 | 5-6m |

### Protocollo test
1. `dbg.balanceTest()` → partita BTC Arcade Normal, 3 cicli
2. `dbg.report()` + `dbg.powerUpReport()` (quest'ultimo cruciale per economia drop)
3. Confrontare power-up totali, source breakdown (enemy vs boss), weapon timeline

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

### ~~BUG 6: Drop rate feedback loop → boss triviali~~ ✅ FIXATO v4.16.0
Drop rates dimezzati: 3%/2.5%/1%, pity 45. Boss HP +25-40%. Cycle bonus ridotto.

---

### BUG 7: Firing nemico scala linearmente con conteggio
**Severità**: Media | **Rischio**: Medio | **Complessità**: Nuovo sistema
**Problema**: HarmonicConductor beat-driven, ma più nemici = proporzionalmente più proiettili. Con scaling ciclico diventa ingestibile.
**Soluzione**: Fire budget (3-5 proiettili/sec), distribuito per peso tier.

---

### Priorità rimanente (post-audit v4.16.0)

| # | Bug | Rischio | Complessità | Priorità |
|---|-----|---------|-------------|----------|
| ~~1~~ | ~~Boss thresholds~~ | — | — | ✅ v4.16.0 |
| ~~3~~ | ~~Y-clamp config~~ | — | — | ✅ v4.16.0 |
| ~~2~~ | ~~CHEVRON overflow~~ | — | — | ✅ v4.16.0 |
| ~~6~~ | ~~Drop rate~~ | — | — | ✅ v4.16.0 |
| 4 | Visual proiettili | Medio | ~100 righe | **Alto** (prossimo) |
| 5 | Entity resize | Alto | Multi-file | **Medio** (dopo 4) |
| 7 | Fire budget | Medio | Nuovo sistema | **Basso** (rivalutare dopo playtest v4.16) |

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
