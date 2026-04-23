# Roadmap: FIAT vs CRYPTO

> **Versione corrente**: v7.12.3 (2026-04-23)
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

### Altri sistemi maturi (v6 era, ancora in uso)
Combat core (weapon evo, GODCHAIN, elemental perks, proximity kill), rendering cyberpunk, HUD/status, audio richness v6.7, tilt/mouse input, PWA full-bleed, debug overlay v2, leaderboard anti-spam, OLED pure black UI.

---

## Open work

### Imminente — validazione v7.5.0
- [ ] Playthrough completo L1→L2→L3→victory senza debug helpers
- [ ] Bilanciamento regional: verificare che tier normalization non rompa la percezione di difficoltà (es. ¥ STRONG L3 deve sentirsi come $ STRONG L1)
- [ ] Escape rate target <10% in tutti i livelli (telemetria via `dbg.v8()`)

### Tuning post-release (se emergono problemi dal playtest)
- Anchor CRUSH speed: attualmente L1=1.8×, L2=2.2×, L3=2.6×. Aggiustare solo su feedback
- Fire budget `V8_RAMP` curve: validato, non toccare senza dati
- L3 opening softening: monitorare se MEDIUM 元 da t=0 è ancora troppo duro

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
- Budget token finito (Max cancellato 2026-04-18): no esplorazioni a vuoto
