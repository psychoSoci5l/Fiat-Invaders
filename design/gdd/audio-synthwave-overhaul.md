# Audio Design: Synthwave Overhaul

**Last Updated**: 2026-04-27
**Status**: Approved for implementation
**Game Version**: v7.15.x

---

## Executive Summary

La colonna sonora è stata reimmaginata da zero. Si abbandona l'approccio jazz (Kondo-inspired, 80-110 BPM, extended jazz voicings) in favore di **synthwave aggressivo / industrial electronic** (150-178 BPM), il linguaggio musicale nativo degli shoot-'em-up verticali come Gradius e Ikaruga.

**Motivazione**: La musica jazz era in conflitto con tutti e 5 i game pillar (satira economica cyberpunk, combat aggressivo, risk-reward density, due modalità d'azione, PWA-first). Il playtest ha confermato che risultava "moscia" e fuori tono.

---

## 1. Sonic Identity (Audio Director)

### Genre Direction
- **Synthwave Aggressivo** (primario) — 150-170 BPM, supersaw leads, basso pulsante, drum machine potente
- **Industrial/Electronic** (secondario) — 140-160 BPM, granular, distortion, noise texture
- **Fusione**: synthwave per melodie arcade, industrial per tensione (boss, GODCHAIN, Bear Market)

### Tempo Map

| Contesto | BPM | Carattere |
|---|---|---|
| Level 1 — Fountain of Fiat | 155 | Melodic synthwave, hook orecchiabile |
| Level 2 — Liquidity Dream | 160 | Oscuro, industrial-leaning, arp ipnotico |
| Level 3 — Eastern Protocol | 165 | Veloce, lead giapponeggiante, caos controllato |
| Boss Phase 1 | 145 | Stately ma minaccioso |
| Boss Phase 2 | 160 | Aggressivo, modulation tritone |
| Boss Phase 3 | 178 | Blast beat-like, tutto al massimo |
| Intermission | 90 | Dark ambient, no drums |

### Reference Tracks
1. **"Aircraft Carrier" — Gradius III (Arcade)** — melodia semplice e incisiva
2. **"Ikaruga - Stage 1"** — filter cutoff automation, costruzione graduale
3. **"DoDonPachi DaiFukkatsu - Stage 1"** — densità ritmica, stratificazione

---

## 2. SFX Specifications (Sound Designer)

### Sound Categories & Mixing

| Categoria | Bus | Priorità | Volume | Esempi |
|---|---|---|---|---|
| Combat Critical | CombatBus | 1 | -3dB | explosion, missileExplosion, hitBoss |
| Player State | PlayerBus | 2 | -6dB | shoot, shield, nearDeath, graze |
| Enemy | CombatBus | 3 | -8dB | enemyShoot, enemyTelegraph, bossSpawn |
| Graze/Combo | PlayerBus | 4 | -10dB | graze, grazeStreak, comboLost |
| UI Confirm | UIBus | 5 | -12dB | coin, perk, levelUp, waveComplete |
| Ambient | AmbientBus | 6 | -15dB | hum, drone layers |

### Nuovi SFX (Synthwave-specific)

| SFX | Durata | Descrizione | Trigger |
|---|---|---|---|
| Riser | 1.5s | Noise sweep + filter 200→8000Hz | Transizioni intensità, pre-boss |
| HyperImpact | 0.4s | Noise burst + supersaw C2-E2-G2 + sub 50Hz | HYPER activation |
| GodchainGlitch | 0.1s | Noise → delay feedback 50% + LFO 8Hz | GODCHAIN active frame |
| BossTransitionBoom | 1.5s | Sub 60→30Hz + noise rumble + armoniche | Boss phase change |
| BearMarketFilter | ∞ | LFO 0.2Hz su lowpass 400-1200Hz + distortion | Bear Market on |

### Ducking Rules

| Evento | Duck | Durata |
|---|---|---|
| bossSpawn | -6dB | 2.0s |
| nearDeath | -4dB | 1.0s |
| hyperActivate | -3dB | 0.5s |
| bossPhaseChange | -8dB | 1.5s |
| Riser peak | -6dB | 0.45s |

---

## 3. Audio Accessibility (Accessibility Specialist)

### Critical Gameplay Audio → Visual Alternatives — **No gaps found**
- Damage → screen flash + shake + HP bar
- Enemy telegraph → glow/charge animation
- Near-death → screen border glow + HP bar pulse
- HYPER ready/active → HUD icon + ship visual change
- Combo status → combo counter + color change
- Graze → visual ripple + score popup

### Captions Recommended
- Boss announcements ("WARNING: CENTRAL AUTHORITY")
- Wave complete
- HYPER ready/activate/deactivate
- GODCHAIN activate
- Bear Market toggle
- Level up / perk acquired

### Sensitivity Mitigations
- `hyperWarning`: soft cap -6dB, rolloff 8kHz
- `explosion`: peak limit -3dB, attack 5ms
- Rapid graze ticks: coalesce a 100ms minimo tra tick

### Mix Masking Strategy
- Synthwave 150-175BPM riempie 80Hz-4kHz
- SFX critici nella fascia 2-6kHz per tagliare il mix
- `_duckMusic()` per eventi prioritari

### UI Configuration
- Music/SFX volume sliders (esistente)
- Opzione "audio intensity ridotta" (riduce riser/boom non critici)
- Mute-on-tab-hidden (esistente)

---

## 4. Technical Implementation (Technical Artist)

### Bus Architecture

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
  [_musicDuckGain]  (nuovo: ducking senza toccare volume utente)
  |
  [ReverbSendBus → ConvolverNode → ReverbWet → MasterGain bypass]
```

### Effects Chain
- **Supersaw**: 2-3 sawtooth oscillators detuned (ULTRA/HIGH/MEDIUM)
- **Distortion**: WaveShaperNode soft-clip on bass bus
- **Glitch Delay**: DelayNode + feedback loop + LFO quad 8Hz
- **Reverb**: ConvolverNode con impulso 1.5s (ULTRA/HIGH)

### Quality Tiers

| Tier | Max osc | Reverb | Supersaw | Delay | Distortion |
|---|---|---|---|---|---|
| ULTRA | 32 | 1.5s | 3 voci | Sì | Sì |
| HIGH | 24 | 1.0s | 2 voci | Sì | Sì |
| MEDIUM | 16 | 0.5s | 1 voce | No | Solo basso |
| LOW | 12 | Off | Square | No | No |

### Mobile Budget
- **iOS A13+**: 24 oscillatori safe → MEDIUM tier
- **iOS A12-**: 16 oscillatori safe → LOW tier
- Memoria: ~1.2MB worst case (procedurale, zero asset)

---

## 5. Implementation Plan

### Phase 1: Infrastructure
1. `_musicDuckGain` + routing changes (AudioSystem.js:init)
2. SFX sub-buses (combat, player, UI, ambient)
3. `_duckMusic()` helper
4. `_totalErrorCount` graceful degradation
5. Lookahead 200→300ms

### Phase 2: Effects Processing
6. `_createSupersaw()` helper → integrate into playArpFromData/playMelodyFromData
7. `_addDistortionToBus()` → bass bus
8. `_initGlitchDelay()` → DelayNode + LFO
9. Reverb routing → bypass compressor

### Phase 3: New SFX
10. Riser sweep
11. HyperImpact
12. GodchainGlitch
13. BossTransitionBoom
14. BearMarketFilter (replace static lowpass)

### Phase 4: MusicData Rewrite
15. `MusicData.js` — complete replacement jazz→synthwave
16. Synth bass patterns (octave-jumping 16th)
17. Power chord pads
18. 808/909 drum patterns
19. HYPER transpose +2 semitones
20. GODCHAIN noise + glitch
21. Bear Market -3 semitones

### Phase 5: Scheduler Improvements
22. Bar-boundary BPM change
23. Smooth BPM ramp

### Phase 6: Quality & Mobile
24. Quality tier matrix in BalanceConfig
25. applyQualityTier() updates
26. Node pooling

### Phase 7: Polish
27. Ducking rules in callers
28. Boss phase BPM mapping
29. Documentation

---

## Files to Modify

| File | Change | Estimated Δ |
|---|---|---|
| `src/audio/MusicData.js` | Rewrite jazz→synthwave data | 751 lines replaced |
| `src/core/AudioSystem.js` | Add bus, effects, SFX, quality | +300-500 lines |
| `src/config/BalanceConfig.js` | Add AUDIO section | +50 lines |
| `index.html` | Possible AudioSFX.js extraction | +1 line |

---

## Summary

- **SFX totali**: 48 esistenti + 5 nuovi = 53
- **Asset audio**: 0 (tutto procedurale)
- **Temi musicali**: 3 livelli + 3 fasi boss + 1 intermission = 7
- **Quality tiers**: 4 (ULTRA/HIGH/MEDIUM/LOW)
- **Stato**: Design approvato, implementazione in corso
