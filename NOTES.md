# Gameplay Tuning Notes

## Core Loop
- Wave cycle: 5 waves, then boss, repeat.
- Intermission: 3s between waves (perk modal removed).

## Enemy Fire Pacing
- Grouped fire cadence: `enemyFireTimer = 0.25s`, `enemyFireStride = 3`.
- Level scaling: `levelMult = 1 + (level-1) * 0.04`.
- Rate multiplier: `rateMult = levelMult * bearAggro * 0.75`.
- Bullet speed: `220 + level * 4`.
- Aim spread mult: `1.1` (Bear: `0.95`).

## Player Bullet Cancel
- Player bullets destroy enemy bullets on contact.
- Perk trigger: cancel 3 bullets within 1.5s.
- Reset on taking damage.

## Wave Patterns
- Wave 1: RECT
- Wave 2: V_SHAPE
- Wave 3: COLUMNS
- Wave 4: SINE_WAVE
- Wave 5: RECT
- Bear mode: SINE_WAVE from wave 3+

## Enemy Spawn Bounds
- startY: 140
- maxY: 380
- COLUMNS: every other row (r % 2 === 0)

## Power-Ups
- Drawn in Canvas (no sprite assets).

## Known Tweaks to Consider
- Increase `enemyFireStride` to 4 for less density.
- Increase `enemyFireTimer` to 0.35 for softer cadence.
- Reduce `maxY` to 340 for more player breathing room.
