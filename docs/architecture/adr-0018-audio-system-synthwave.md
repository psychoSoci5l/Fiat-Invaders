# ADR-0018: Audio System — Procedural Synthwave Engine

## Status

Accepted

## Date

2026-05-28

## Last Verified

2026-05-28

## Decision Makers

Game Designer, Technical Director, Audio Director, Sound Designer

## Summary

L'Audio System di FvC è passato da un approccio jazz (Kondo-inspired, 80-110 BPM) a synthwave aggressivo / industrial electronic (150-178 BPM), con bus architecture a 6 rami, quality tiering per mobile, e ducking rules per chiarezza del mix. L'intero stack è procedurale (zero asset pre-registrati) basato su Web Audio API. Questo ADR documenta retroattivamente la decisione architetturale e la direzione musicale già implementata.

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Platform** | Web (PWA) — Vanilla JS, Canvas 2D |
| **Domain** | Audio — procedural music + SFX |
| **Audio API** | Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`, `DelayNode`, `WaveShaperNode`, `ConvolverNode`, `DynamicsCompressorNode`) |
| **Knowledge Risk** | LOW — Web Audio API stabile, ben documentata |
| **References Consulted** | `design/gdd/audio-synthwave-overhaul.md`, `docs/architecture/architecture.md` §8 |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0001 (GameStateMachine — audio lifecycle legato agli stati di gioco), ADR-0003 (EventBus — eventi audio guidati da eventi di gioco) |
| **Enables** | Armonic Conductor (audio-reactive enemy actions), quality tiering per mobile |
| **Blocks** | Nessuno — già implementato |
| **Ordering Note** | ADR retroattivo: la decisione è stata implementata in v7.15.x e raffinata fino a v7.33.0 |

## Context

### Problem Statement

La colonna sonora jazz originale (Kondo-inspired, 80-110 BPM, extended jazz voicings) era in conflitto con tutti e 5 i game pillar: satira economica cyberpunk, combat aggressivo, risk-reward density, due modalità d'azione, PWA-first. Il playtest ha confermato che risultava "moscia" e fuori tono per un bullet hell shooter verticale.

Inoltre, l'architettura audio iniziale non aveva una struttura a bus formale, causando:
- Mix masking tra SFX critici e musica
- Ducking assente (gli eventi importanti si sovrapponevano al mix)
- Nessuna protezione per mobile (oscillatori illimitati)
- Nessuna degradazione graziosa su hardware debole

### Current State

L'implementazione synthwave è già completa. Questo ADR formalizza la decisione e cattura l'architettura esistente.

### Constraints

- **Zero asset**: tutto il contenuto audio è procedurale (oscillatori + noise + filtri Web Audio API). Nessun file .wav/.mp3.
- **Single AudioContext**: un solo contesto condiviso, ripreso dopo user gesture. Nessun resume() automatico.
- **Mobile budget**: 12-16 oscillatori su iOS A12-, 24 su A13+.
- **Nessun oscillatore legacy**: il pattern legacy a oscillatore diretto è stato ucciso in v7.20.

### Requirements

- Musica procedurale per 3 livelli + 3 fasi boss + 1 intermission = 7 temi
- 48 SFX esistenti + 5 nuovi (riser, hyperImpact, godchainGlitch, bossTransitionBoom, bearMarketFilter)
- Quality tiers: ULTRA / HIGH / MEDIUM / LOW
- Ducking automatico per eventi prioritari
- Music/SFX volume sliders persistiti su localStorage

## Decision

### Direction Change: Jazz → Synthwave

Abbandonare il jazz (80-110 BPM, Kondo-inspired) per synthwave aggressivo (150-178 BPM) come linguaggio musicale nativo del genere shoot-'em-up verticale. Ispirazione: Gradius III, Ikaruga, DoDonPachi.

### Architecture

```
AudioContext.destination
  |
  [DynamicsCompressor]
  |
  [MasterGain]
  |           \
  [MusicGain]  [SfxGain]
  |            |---[CombatBus]
  |---[BassBus]    |---[PlayerBus]
  |---[ArpBus]     |---[UIBus]
  |---[MelBus]     |---[AmbientBus]
  |---[PadBus]
  |---[DrumBus]
  |
  [_musicDuckGain]  (ducking senza toccare volume utente)
  |
  [ReverbSendBus → ConvolverNode → ReverbWet → MasterGain bypass]
```

### Tempo Map

| Contesto | BPM | Carattere |
|----------|-----|-----------|
| Level 1 — Fountain of Fiat | 155 | Melodic synthwave |
| Level 2 — Liquidity Dream | 160 | Industrial-leaning |
| Level 3 — Eastern Protocol | 165 | Caos controllato |
| Boss Phase 1 | 145 | Minaccioso |
| Boss Phase 2 | 160 | Modulation tritone |
| Boss Phase 3 | 178 | Blast beat |
| Intermission | 90 | Dark ambient |

### Ducking Rules

| Evento | Duck | Durata |
|--------|------|--------|
| bossSpawn | -6dB | 2.0s |
| nearDeath | -4dB | 1.0s |
| hyperActivate | -3dB | 0.5s |
| bossPhaseChange | -8dB | 1.5s |
| Riser peak | -6dB | 0.45s |

### Quality Tiers

| Tier | Max osc | Reverb | Supersaw | Delay | Distortion |
|------|---------|--------|----------|-------|------------|
| ULTRA | 32 | 1.5s | 3 voci | Sì | Sì |
| HIGH | 24 | 1.0s | 2 voci | Sì | Sì |
| MEDIUM | 16 | 0.5s | 1 voce | No | Solo basso |
| LOW | 12 | Off | Square | No | No |

### Implementation

- `src/core/AudioSystem.js` — bus architecture, effetti, ducking, quality tiering
- `src/audio/MusicData.js` — pattern musicali procedurali (synthwave rewrite)
- `src/config/BalanceConfig.js` — sezione AUDIO con quality tier config
- `src/audio-reactive/HarmonicConductor.js` — beat-synced enemy actions (consumatore)

## Alternatives Considered

### Alternative 1: Jazz mantenuto (stato pre-v7.15)

- **Description**: Mantenere lo stile jazz con arrangiamenti più aggressivi
- **Pros**: Nessun rewrite di MusicData.js
- **Cons**: Incompatibilità con i game pillar confermata dai playtest; 80-110 BPM non sostiene l'azione bullet hell
- **Rejection Reason**: Il playtest ha dimostrato che il jazz risultava fuori tono. Un compromesso avrebbe richiesto lo stesso sforzo di un rewrite senza risolvere il problema di fondo.

### Alternative 2: Drum & Bass / Breakcore

- **Description**: 170-180 BPM, batteria spezzata, atmosfere jungle
- **Pros**: BPM compatibile con l'azione intensa
- **Cons**: Complessità ritmica estrema distrae dal gameplay; produzione più laboriosa con oscillatori base; masking critico con SFX nella stessa fascia ritmica
- **Rejection Reason**: Il synthwave è più leggibile al mix, ha una tradizione consolidata negli shmup, e la sua struttura a pattern prevedibili è più facile da produrre proceduralmente.

## Consequences

### Positive

- Synthwave allineato con tutti e 5 i game pillar
- 150-178 BPM sostiene l'azione bullet hell senza sembrare lenta
- Bus architecture chiara e manutenibile
- Quality tiering protegge i dispositivi mobili
- Ducking garantisce chiarezza del mix per SFX critici

### Negative

- Rewrite completo di MusicData.js (~751 righe sostituite)
- Aggiunte 300-500 righe ad AudioSystem.js per effetti + bus + quality
- Consumo oscillatoriosuperiore rispetto al jazz (compensato dai quality tier)

### Neutral

- Zero asset audio impattati (tutto procedurale)
- HarmonicConductor già sincronizzato con AudioSystem — nessuna modifica al layer audio-reactive

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Mobile oscillator budget superato | Bassa | Medio | Quality tier LOW limita a 12 oscillator, testato su A12- |
| AudioContext resume fallito dopo tab switch | Media | Alto | `_handleVisibilityChange` + resume() su ogni ritorno; fallback silenzioso |
| Mix masking su fascia 2-6kHz | Bassa | Medio | Ducking rules + SFX critici nella fascia 2-6kHz per tagliare il mix |

## Performance Implications

| Metric | Prima (jazz) | Dopo (synthwave ULTRA) | Budget |
|--------|-------------|------------------------|--------|
| CPU (frame time) | ~0.1ms | ~0.3ms (ULTRA) | <0.5ms |
| Memoria | ~0.8MB | ~1.2MB (ULTRA) | <2MB |
| Load Time | ~50ms | ~80ms (creazione nodi) | <100ms |

## Migration Plan

La migrazione jazz → synthwave è già stata eseguita in 7 fasi (v7.15.x → v7.20):

1. **Infrastructure**: `_musicDuckGain` + routing, SFX sub-buses, `_duckMusic()` helper
2. **Effects Processing**: `_createSupersaw()`, distortion on bass bus, glitch delay
3. **New SFX**: Riser, HyperImpact, GodchainGlitch, BossTransitionBoom, BearMarketFilter
4. **MusicData Rewrite**: 751 righe sostituite jazz→synthwave
5. **Scheduler**: Bar-boundary BPM change, smooth BPM ramp
6. **Quality & Mobile**: Quality tier matrix, applyQualityTier()
7. **Polish**: Ducking rules callers, boss phase BPM mapping

**Rollback plan**: Mantenere il branch git pre-synthwave. Il rollback richiederebbe il ripristino di `MusicData.js` (pre-rewrite) e la rimozione dei nuovi effetti/subsistemi.

## Validation Criteria

- [ ] 7 temi musicali riproducibili (3 livelli + 3 boss + 1 intermission)
- [ ] 53 SFX funzionanti (48 ereditati + 5 nuovi sintetizzati)
- [ ] Tutti e 4 i quality tier producono audio senza crash
- [ ] Ducking si attiva sugli eventi previsti e rientra correttamente
- [ ] Mobile (LOW tier) ≤ 12 oscillator, nessun audible glitch

## GDD Requirements Addressed

| GDD Document | System | Requirement | How This ADR Satisfies It |
|-------------|--------|-------------|--------------------------|
| `design/gdd/audio-synthwave-overhaul.md` | Audio | "Synthwave aggressivo (150-170 BPM)" | Tempo map con 7 contesti, BPM range 90-178 |
| `design/gdd/audio-synthwave-overhaul.md` | Audio | "Bus architecture a 6 rami" | 6 bus SFX + 5 bus music nel routing |
| `design/gdd/audio-synthwave-overhaul.md` | Audio | "Quality tiering per mobile" | 4 tier: ULTRA/HIGH/MEDIUM/LOW con limiti oscillator |
| `design/gdd/audio-synthwave-overhaul.md` | Audio | "Ducking per eventi prioritari" | 5 ducking rules con gain/duration specifici |
| `design/gdd/audio-synthwave-overhaul.md` | Audio | "5 nuovi SFX (riser, hyperImpact, godchainGlitch, bossTransitionBoom, bearMarketFilter)" | Tutti implementati in AudioSystem.js |

## Related

- `design/gdd/audio-synthwave-overhaul.md` — GDD di design approvato
- `docs/architecture/architecture.md` §8 — Audio Pipeline overview
- `docs/architecture/control-manifest.md` §Audio-Reactive Layer Rules — regole operative
- `src/core/AudioSystem.js` — implementazione principale
- `src/audio/MusicData.js` — pattern musicali procedurali
- `src/config/BalanceConfig.js` §AUDIO — quality tier e costanti
- `src/audio-reactive/HarmonicConductor.js` — consumatore beat-synced
