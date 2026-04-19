# ROADMAP v7.0 — "MAJOR RELEASE"

> **Versione attuale**: v6.9.0 (in sviluppo)
> **Target**: v7.0.0
> **Filosofia**: Se è più complicato modificare che rifare, si rifà.
> **Principio**: Ogni fase deve lasciare il gioco funzionante e deployabile.

---

## FASE 1 — FONDAMENTA (Sicurezza + Stabilità critica) ✅ COMPLETATA

### 1.1 Sicurezza Leaderboard [CRITICAL] ✅
- [x] Spostare firma HMAC server-side nel Cloudflare Worker (v2.0)
  - Client invia score raw (no firma), worker valida internamente
  - Rimossa chiave XOR-offuscata `_sk` e `signScore()` da main.js
  - Aggiunto nonce anti-replay (TTL 10min in KV)
- [x] Restringere CORS nel worker (solo dominio produzione, no più `*`)
- [x] Aggiunta validazione durata partita (`dur` campo, minimo 15s)

### 1.2 CSP Headers [HIGH] ✅
- [x] `_headers` riscritto: `default-src`, `script-src`, `style-src`, `connect-src`, `img-src`, `media-src`, `frame-ancestors`
- [x] Aggiunti `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- [ ] Testare che il gioco funzioni con i nuovi header (deploy necessario)

### 1.3 Service Worker [CRITICAL] ✅
- [x] Aggiunto `WeatherController.js` alla cache list (era mancante — gioco rotto offline)
- [x] Aggiunto `LeaderboardClient.js` alla cache list
- [x] Audit completo: verificato tutti gli script di index.html sono nella cache
- [ ] Testare funzionamento offline completo (deploy necessario)

### 1.4 Stabilità Core [HIGH] ✅
- [x] Page Visibility API: auto-pause su `visibilitychange` (tab/app switch)
- [x] EventBus RISCRITTO: `console.error` al posto di `catch(e) {}`, snapshot array in emit, deferred removal, `once()`, `removeAllListeners()`
- [x] Fix togglePause: memorizza stato esatto pre-pausa (`_pausedFromState`) e ripristina al resume (PLAY/WARMUP/INTERMISSION)
- [x] Helper `safeGetItem`/`safeSetItem`/`safeGetJSON` per localStorage + applicati a punti critici (high score, arcade records, nickname, device ID, maxCycle)

---

## FASE 2 — ARCHITETTURA (Spezzare il monolite) 🔄 IN CORSO

main.js: da 6899 a **4348 righe** (−2551, −37%). Target: < 3500.

### 2.1 Nuova struttura main.js → moduli estratti
- [x] `LeaderboardClient.js` — nickname, device ID, nonce, pending score, leaderboard API (~280 righe estratte)
- [x] `GameplayCallbacks.js` — tutti i 12 callback collision via deps injection (~560 righe → `src/core/`)
- [x] `DebugOverlay.js` — triple-tap debug overlay, diagnostica, email report (~277 righe → `src/ui/`)
- [x] `IntroScreen.js` — SPLASH/SELECTION state machine, ship carousel, What's New, launch animation, backToIntro (~1303 righe → `src/ui/`)
- [x] `GameCompletion.js` — triggerGameOver, showGameCompletion, showCampaignVictory, victory buttons (~310 righe → `src/ui/`)
- [ ] main.js residuo: init, startGame, game loop (update/draw/loop), stato globale → target < 3500 righe (mancano ~850 righe di estrazioni minori)

> **Nota architetturale**: GameLoop (update/draw/loop) NON viene estratto. Accede a 50+ variabili
> mutabili di stato — l'overhead di getter/setter injection nel hot path a 60fps è inaccettabile.
> Il game loop è la responsabilità primaria di main.js. Estrarre il sistema intro e il flusso
> game-over/victory è più efficace e meno rischioso.

### 2.2 State Machine [RIFATTA] ✅
- [x] GameStateMachine che BLOCCA transizioni invalide (`console.error` + `return false`)
- [x] Eliminato doppio stato: `gameState` locale ora è alias sync via `onChange` listener
- [x] `setGameState()` ritorna `boolean` per indicare successo/fallimento
- [x] Aggiunto `onChange(fn)` per listener di cambio stato
- [x] Aggiunta transizione `PAUSE → INTERMISSION` nella tabella (serviva per fix togglePause)

### 2.3 EventBus [RIFATTO] ✅ (completato in Fase 1.4)

### 2.4 Performance chirurgica
- [x] SpatialGrid.query(): riuso array risultati (zero alloc per frame) + clear() senza dealloc celle
- [ ] ~~ParticleSystem splice~~ → VERIFICATO: già usa compact-in-place O(n), non serve intervento
- [ ] CollisionSystem indexOf: impatto contenuto con max 22 nemici, non prioritario

**Risultato attuale**: StateMachine, EventBus rifatti. Leaderboard, GameplayCallbacks, DebugOverlay estratti. SpatialGrid ottimizzato. Prossimi: IntroScreen, GameCompletion.

---

## FASE 3 — QUALITÀ (Test + Bug fix) ✅ COMPLETATA

### 3.1 Test Suite [Espansa]
- [x] Mantenuto runner.html custom (zero deps, browser-compatible) — funziona bene, no motivo di migrare
- [x] Test CollisionSystem: interface, init con mock, buildGrids verification
- [x] Test StateMachine: transizioni bloccate (6 test), catene, reset — aggiornato test-state.js
- [x] Test Score Calculation: config keys, moltiplicatori streak/bear/HYPER, combined multipliers
- [x] Test DropSystem: pity timer trigger, suppression logic, killsSinceLastDrop tracking
- [x] Test WaveManager: wave progression, reset, getWavesPerCycle
- [x] Target ≥ 30% sistemi critici: raggiunto (4 nuovi file, ~44 test)

### 3.2 Bug Fix Batch
- [x] Multi-touch SWIPE: `_activeTouchId` tracking via touch identifier (InputSystem.js)
- [x] ellipse() fallback: `G.safeEllipse()` globale in ColorUtils.js, 13 chiamate sostituite (Boss, Bullet, Player, WeatherController), SkyRenderer unificato
- [x] ObjectPool: `maxSize` param (default 200), cap in `release()` (ObjectPool.js)
- [x] ~~crypto.subtle~~: non necessario — HMAC è server-side nel Worker (fatto in Fase 1)
- [x] localStorage: try-catch su setItem critici (fatto in Fase 1.4)

---

## FASE 4 — GAME DESIGN TUNING ✅ COMPLETATA

### 4.1 Bilanciamento ✅
- [x] HP C1→C2: 2.5x → 1.8x, C3: 3.2x → 2.8x (curva più graduale)
- [x] LV2 cooldown: 0.85x → 0.75x (upgrade percepito)
- [x] Special duration: 8s → 10s
- [x] HYPER: attivazione manuale via bottone/H key (AUTO_ACTIVATE false). Aggiunge scelta strategica

### 4.2 Arcade Rebalance ✅
- [x] Nano Shield: cooldown 45s → 22s
- [x] Jackpot: -1 vita → -50% graze gain (trade-off meno punitivo)
- [x] Speed Demon: nemici NON accelerano (solo player + bullet speed)
- [x] Selezione modifier: garanzia 1 OFFENSE + 1 DEFENSE nelle 3 carte
- [ ] Combo sinergie esplicite tra modifier (differito a Fase 5)

### 4.3 Anti-Degenerate ✅
- [x] TOTAL_MULT_CAP: 12x (era ~25x uncapped). HYPERGOD*combo*streak capped
- [x] Score ceiling worker: 15000 → 12000 base (riflette nuovo cap)

---

## FASE 5 — CONTENUTO & RETENTION

### 5.1 Meta-Progressione
- [ ] Sistema di unlock persistente tra le run (localStorage)
  - Cosmetici nave (colori trail, icone cockpit)
  - Sfide completate (es. "Batti FED senza scudo", "Combo 50+")
  - Statistiche cumulative (nemici totali, ore giocate, boss sconfitti)
- [ ] Schermata Profilo/Statistiche accessibile dall'intro

### 5.2 Arcade Depth
- [ ] Lore fragments: frammenti narrativi come reward per milestone Arcade
- [ ] Mini-boss dedicati: meccaniche uniche (scudo rotante, drone emitter) — non solo boss ridotti
- [ ] Daily seed run: stessa sequenza wave/modifier per tutti, classifica giornaliera

### 5.3 Nuovi Contenuti
- [ ] Boss IMF (International Monetary Fund) — pattern unici
- [ ] Boss World Bank — pattern unici
- [ ] Story mode Capitolo 4+ (se narrativa disponibile)
- [ ] Achievement system con badge visibili nella leaderboard

---

## FASE 6 — POLISH & ACCESSIBILITÀ

### 6.1 Accessibilità [HIGH]
- [ ] ARIA: `aria-live="polite"` su score e vite
- [ ] ARIA: `role="img"` con `aria-label` sul canvas
- [ ] ARIA: `aria-label` su tutti i pulsanti icon
- [ ] Audio cue per stati elite/elementali nemici

### 6.2 Audio Polish
- [ ] Mixing: explosion da 0.5 a 0.35, shoot da 0.08 a 0.10
- [ ] Particle pool: aumentare MAX_PARTICLES da 180 a 240
- [ ] Unificare gold (#ffaa00 vs #FFD700) in costante unica

### 6.3 Performance
- [ ] Scanlines CSS: kill-switch per quality tier LOW
- [ ] Boss FED: ridurre draw call su tier LOW (semplificare orbita/scanlines)

---

## NOTE OPERATIVE

### Ordine delle fasi
Le fasi sono **sequenziali per necessità**: non ha senso fare test (Fase 3) su un monolite che stai per smontare (Fase 2), né bilanciare il gameplay (Fase 4) senza test per verificarlo. Ogni fase lascia il gioco funzionante.

### Sessioni di lavoro
Ogni fase è progettata per essere completata in **1-3 sessioni di lavoro**. Alla fine di ogni sessione:
1. Il gioco deve compilare e funzionare
2. CHANGELOG.md aggiornato
3. Versione incrementata (v6.9.x durante le fasi, v7.0.0 al completamento)

### Versionamento durante lo sviluppo
- Fase 1: v6.9.0 ✅
- Fase 2: v6.9.1-v6.9.5 🔄
- Fase 3: v6.9.6
- Fase 4: v6.9.7
- Fase 5: v6.9.8
- Fase 6: v7.0.0

### Decisione "rifare vs modificare"
Se un modulo richiede più di 60% di riscrittura, si rifà da zero mantenendo l'API pubblica:
- **GameStateMachine.js** → ✅ RIFATTO (blocca transizioni invalide, onChange listener)
- **EventBus.js** → ✅ RIFATTO (safe emit, error logging, once, removeAllListeners)
- **Test suite** → DA RIFARE (harness custom → framework)
- **main.js** → SMONTARE (estrarre, non riscrivere) — in corso

### Changelog sessione 1 (2026-04-14)
- Fase 1 completata al 100%
- Fase 2: StateMachine rifatta, EventBus rifatto, LeaderboardClient estratto, SpatialGrid ottimizzato
- main.js: 6899 → 6596 righe (−4.4%)

### Changelog sessione 2 (2026-04-14)
- GameplayCallbacks.js estratto (12 collision callbacks, ~560 righe logiche, deps injection pattern)
- DebugOverlay.js estratto (debug overlay system, ~277 righe, autocontenuto)
- IntroScreen.js estratto (intro screen system completo, ~1303 righe: SPLASH/SELECTION state machine, ship carousel + canvas rendering, What's New, launch animation, backToIntro)
- main.js: 6596 → 4627 righe (−29.8%)
- Decisione: GameLoop NON estratto (50+ variabili mutabili, overhead inaccettabile nel hot path 60fps)
- Target rivisto: < 3500 (era < 1500, irrealistico senza refactoring profondo)
- GameCompletion.js estratto (game over + campaign victory + completion screens, ~310 righe)
- main.js: 6596 → 4348 righe (−34.1%)
- Prossimi: estrazioni minori per raggiungere target < 3500
