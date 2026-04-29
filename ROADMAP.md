# Roadmap: FIAT vs CRYPTO

> **Versione corrente**: v7.17.0 (2026-04-27)
> **Branch attivo**: `main`
> **Modalità primaria**: v8 scroller Gradius-style (`V8_MODE.ENABLED=true`)
> **Modalità legacy**: Arcade rogue Space-Invaders (WaveManager)

Archivio storico: [ROADMAP_V6_ARCHIVE.md](ROADMAP_V6_ARCHIVE.md) (fino v6.5.4), [ROADMAP_V7_ARCHIVE.md](ROADMAP_V7_ARCHIVE.md) (piano v7.0 pre-pivot).

---

## Stato consegnato (v7.x)

### Pivot architetturale v8 (v7.0.0→v7.5.0)
Da Space Invaders (formazioni statiche + WaveManager) a shmup verticale Gradius-style (scroll continuo + burst scriptati + anchor CRUSH).

- **v7.0.0/v7.0.1** — `LevelScript.js`, 4 pattern (DIVE/SINE/HOVER/SWOOP), parallax NEAR, corridor crush, `ScrollEngine` API
- **v7.1.0** — meta-progression wiring fix
- **v7.2.0** — `LEVELS[]` multi-level (FED/BCE/BOJ), intermission DOM, `advanceToNextV8Level`
- **v7.2.1** — purge `_v8Fall` enemies off-screen
- **v7.2.2** — legibility pass (DIVE.ACCEL 35→10, symbol 22px+outline)
- **v7.3.0** — LEVEL 3 (BOJ) script + anchors
- **v7.4.0** — telemetry (`dbg.v8()` con killsByPattern/Phase/YBucket, escapedOffScreen), routing campaign victory
- **v7.4.1** — L1 onboarding rampa (OPENING 0-50s solo WEAK, 59→30 burst)
- **v7.4.2** — `V8_RAMP` fire budget scalato su `_elapsed/BOSS_AT_S` (0.35 → 1.0 quadratico)
- **v7.5.0** — **regional thematization** (L1 USA, L2 EU, L3 Asia) + `TIER_TARGETS` normalization + fix freeze post-boss con chapter
- **v7.6.0** — onboarding hint contestuali (status strip, lifetime gate via `HintTracker`) + reset tutorial in Settings — *pattern abbandonato in v7.7.0*
- **v7.7.0** — **lesson modals** che mettono in pausa al primo incontro con ogni meccanica (FIRE/LASER/ELECTRIC/GODCHAIN/DIP/HYPER/SPECIAL/UTILITY) + tutorial WARMUP rinfrescato (4 step incl. HYPER, SKIP, font più grandi) + fix `deathTimer` durante PAUSE + fix `restartRun` (HANGAR vs INTRO)
- **v7.8.0–v7.11.1** — polish sweep (safe-area PWA, audio richness, cinematic enemy entry, leaderboard, story crawl, arcade fix waveManager/minibosses/boss rotation)
- **v7.12.0–v7.12.2** — PWA deep safe-area fix (Dynamic Island), tutorial SKIP button audit
- **v7.12.3** — **balance-check V8 pacing**: curva inter-livello HP (L1 1.40 / L2 1.55 / L3 1.75 STRONG), `V8_RAMP` 0.35→0.50 start + quad→lin (OPENING non più muto, no spike 90-120s), L3 CRUSH densificato (14→19 burst), `V8_RAMP.LEVEL_MULT [1.0, 1.1, 1.25]` (fuoco scala anche per livello, non solo per ciclo)
- **v7.12.4** — **UX review pass** (reverse-documented HUD/intro/modifier-choice/game-over in `design/ux/`): gradient categoriale modifier-choice ripristinato, keyboard + ARIA sul modifier-choice, submit leaderboard anche in Arcade, pulizia dead CSS

### GDD reverse-doc sweep (v7.12.5→v7.12.11)
Tutti i sistemi core reverse-documentati in `design/gdd/` con drift fix su config/docs, dead config cleanup, e systems-index centralizzato.

- **v7.12.5** — V8 GDD reverse-doc + dead config cleanup (`HOVER_GATE.EASE_IN_MS`)
- **v7.12.6** — Arcade GDD reverse-doc + **JACKPOT modifier ora effettivo** (malus DIP gain, era solo upside) + **CHAIN_LIGHTNING 30% chance ripristinato** (era 100%)
- **v7.12.7** — Enemy Agents GDD reverse-doc + dead config (`ELITE_VARIANTS.ARMORED.SPEED_MULT`, `WALK_CYCLE_MS`)
- **v7.12.8** — Weapon+Elementals+GODCHAIN GDD reverse-doc (XL, ~90 citazioni file:line)
- **v7.12.9** — Drop System + APC GDD reverse-doc (M)
- **v7.12.10** — Boss+Proximity + Wave legacy GDD reverse-doc (2×M). **Copertura GDD completa** per FvC v7.12.10: 7 GDD approvati
- **v7.12.11** — Tech-debt cleanup: dead config rimossa (3 aree), JACKPOT modifier ora coerente su tutte le 3 path DIP (kill / boss hit / phase transition)

### Bug fix + refactor (v7.12.12→v7.17.0)

- **v7.12.12** — Fix: Arcade launch blocked (INTRO → PLAY via `forceSet('HANGAR')`)
- **v7.12.13** — Fix: SPLASH → SELECTION skippato da double-tap / key repeat (cooldown mancante)
- **v7.12.14** — Fix: tab modalità visibili in SELECTION + testo descrittivo prima del tap (completamento rework)
- **v7.12.15** — Fix overlay: touch intercept + cleanup critico (4 bug)
- **v7.12.16–18** — **Audio audit**: HYPER layer oscillator leak → GODCHAIN oscillator leak → 5 bug audit (schedule crash, stopMusic leak, crossfade, reverb contention). OggettoPool audit (bullet leak su advanceToNextV8Level, particelle homing senza life/bounds, dead code)
- **v7.13.0** — **Refactor: DrawPipeline rendering modulare**: 32 layer registrati, CullingHelper, OffscreenCanvas, GlowManager. Sostituisce il draw() monolitico in main.js
- **v7.13.1** — Refactor: EnemyAgentRenderer extraction (~1100 linee da Enemy.js) + TutorialManager extraction (~130 linee da main.js)
- **v7.15.0** — **HYPER/GODCHAIN catarsi**: effetti visivi (burst, shockwave, trail, sparkle) + audio stratificato (hitEnemy tier-based, hitBoss, missileExplosion, HYPER drone layer, GODCHAIN square layer)
- **v7.16.0** — **Production readiness**: gamepad d-pad support, HYPER key (H) sempre attiva, aria-label su bottoni icona + HUD, ship selection persistente, prefers-reduced-motion esteso, fix V8 SWOOP/HOVER/graze label
- **v7.17.0** — **Phase sky system**: SkyRenderer + PhaseTransitionController (crossfade 8-12s Earth→Atmosphere→Deep Space) + WeatherController phase-aware + parallax planets (3 corpi celesti con anelli/lune)

### Altri sistemi maturi (v6 era, ancora in uso)
Combat core (weapon evo, GODCHAIN, elemental perks, proximity kill), rendering cyberpunk, HUD/status, audio richness v6.7, tilt/mouse input, PWA full-bleed, debug overlay v2, leaderboard anti-spam, OLED pure black UI.

---

## Open work

### Potenziali direzioni future (nessun impegno)
- **Contenuto**: L4+ (nuova regione? IMF/World Bank?), nuovi pattern oltre DIVE/SINE/HOVER/SWOOP
- **Meta-progression**: unlock cosmetici, sfide, statistiche cumulative cross-run
- **Polish**: accessibilità ARIA, audio cue stati elite, scanlines kill-switch LOW tier
- **Arcade mode**: decidere se mantenerlo (usa WaveManager legacy) o pivotare anche lui a v8 scriptato

---

## Note operative

### Versionamento
- Bump richiesto in: `src/utils/Constants.js` (VERSION) + `sw.js` (SW_VERSION) + `CHANGELOG.md`. Must match.
- Minor bump per tuning/content, major bump solo per pivot architetturale.

### Regole ferree
- Balance config è legge: modificare `BalanceConfig.js`, mai hardcode in entity files
- Non ping-pong in sessione: un obiettivo, poi vai
- Non toccare combat core (bullet/perk/HYPER) senza motivo forte
