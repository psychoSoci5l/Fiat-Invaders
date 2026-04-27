# ADR-0007: V8 Scroller LevelScript Architecture

## Status
Accepted

## Date
2026-04-25

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Vanilla JavaScript (Canvas 2D, no framework) |
| **Domain** | Core / Gameplay |
| **Knowledge Risk** | LOW — pattern is already shipped and active in v7.12.14 |
| **References Consulted** | `src/v8/LevelScript.js`, `src/entities/Enemy.js`, `src/systems/ScrollEngine.js`, `src/systems/HarmonicConductor.js`, `src/config/BalanceConfig.js`, `src/core/GameplayCallbacks.js` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | None — pattern is already shipped and active |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0001 (GameStateMachine), ADR-0003 (EventBus), ADR-0002 (Canvas 2D Rendering) |
| **Enables** | All V8 campaign modes, CRUSH corridor set-pieces, Gravity Gate |
| **Blocks** | None |
| **Ordering Note** | Implements the V8 campaign layer on top of the Foundation ADRs |

## Context

### Problem Statement

The V8 Scroller is the primary campaign mode of FIAT vs CRYPTO (active since v7.5.0). It replaces the legacy WaveManager formation system with a Gradius-style vertical scrolling shooter. The system must:

1. Spawn enemies on scripted absolute timestamps with ±0.1s accuracy
2. Drive four distinct movement patterns (DIVE/SINE/HOVER/SWOOP) updated per frame
3. Support a Gravity Gate state machine overlay (IDLE→DWELL→LEAVING) independent of the selected pattern
4. Deliver a CRUSH corridor set-piece at the end of each level (speed ramp, screen shake, audio pitch drop)
5. Halt scrolling for boss fights and resume on boss death
6. Advance between levels with full state reset
7. Orchestrate cinematic entry burst for newly spawned enemies
8. Provide a scroll speed LUT with piecewise-linear interpolation and DT clamp
9. Gate correctly between campaign (V8 active) and arcade (WaveManager active) modes

### Constraints

- Must coexist with WaveManager — V8 active = WaveManager dormant, and vice versa
- All enemy movement must run through the existing Enemy.update() path (no duplicate update loops)
- Scroll speed LUT must be piecewise-linear with DT clamp to prevent tab-switch runaway
- Level advance must atomically reset: enemy list, scroll position, script pointers, boss state
- Must support 3 levels (L1 FED / L2 BCE / L3 BOJ) with distinct regional currency rosters
- Must not introduce ES modules or bundler dependencies

## Decision

### Decision 1: LevelScript as Orchestrator (not a full state machine)

`LevelScript` (`src/v8/LevelScript.js`) is a tick-based orchestrator, not a state machine. Each frame during PLAY:

```
tick(dt):
  1. Guard: skip if !V8_MODE.ENABLED || isArcadeMode() || gameState !== PLAY || boss active || countdown active
  2. Advance _elapsed += dt
  3. Fire all script bursts where at_s <= _elapsed (advance _idx)
  4. Fire all CRUSH anchors where anchor_s <= _elapsed (advance _anchorIdx)
  5. Check boss trigger at BOSS_AT_S
  6. Cull off-screen enemies (y > gameHeight + 120)
  7. Return action (null / SPAWN_BOSS / LEVEL_END) for main.js to consume
```

Rationale: V8 is a linear timeline, not a state machine. The tick function advances through a script array and returns actions. Main.js owns the response to those actions (spawning UI, state transitions). This keeps LevelScript as a pure data driver.

### Decision 2: Four Movement Patterns as Enemy.update() branches

All four patterns execute inside `Enemy.update()` when `_v8Fall === true`:

- **DIVE**: gravity-only fall at 10 px/s acceleration. Pattern for basic enemies.
- **SINE**: sinusoidal horizontal oscillation at 70 px amplitude, 2.0 rad/s. Mid-complexity dodge pattern.
- **HOVER**: three-phase approach/dwell/leave at 28% screen height. Scripted hover, distinct from Gravity Gate.
- **SWOOP**: edge-spawned enemies curving across screen at 140 px amplitude, 1.3 rad/s. Flanking pattern.

Pattern is selected per burst entry in the SCRIPT array, defaulting to DIVE. All patterns share the cinematic entry burst (260 px/s fast-fall for first 40 px of descent).

Rationale: Keeping pattern logic in Enemy.update() avoids a separate movement system and keeps entity behavior self-contained. The `_v8Fall` flag gates V8-specific movement vs legacy WaveManager movement.

### Decision 3: Gravity Gate as Independent Overlay

Gravity Gate is probabilistically applied on top of the base pattern (55% chance, gated by `HOVER_GATE.ENABLED`). It defines a per-enemy `_hoverY` at 25-45% of screen height. When the enemy crosses `_hoverY`:

1. **IDLE → DWELL**: vy=0, `_uprightFlip=true`, `_fireSuppressed=true` for 1.5s grace window
2. **DWELL**: hold for 6.0s, enemy position frozen
3. **DWELL → LEAVING**: vy=-180 px/s, `_uprightFlip=false`, fire suppression cleared

The HOVER pattern is explicitly excluded from Gravity Gate (it has its own scripted dwell).

Rationale: Gravity Gate is an overlay because it needs to coexist with pattern movement — a DIVE enemy that triggers Gravity Gate should hover and then resume falling, not switch to the HOVER pattern. Independent state machine with its own `_hoverTimer`, `_hoverY`, and `_fireSuppressed` flag.

### Decision 4: CRUSH Anchors as Timeline Events

Each level defines 3 anchor entries (CRUSH_ENTER, CRUSH_PEAK, CRUSH_EXIT) with absolute timestamps:

| Level | ENTER | PEAK | EXIT | Peak speed |
|-------|-------|------|------|------------|
| L1 FED | 150s | 152s | 168s | 1.8× |
| L2 BCE | 148s | 150s | 168s | 2.2× |
| L3 BOJ | 142s | 144s | 168s | 2.6× |

Effects are dispatched to ScrollEngine (speed multiplier ramp), EffectsRenderer (screen shake + damage vignette), and AudioSystem (pitch detune). Anchor state is independent of burst script state (separate `_anchorIdx`).

Rationale: Anchors are a parallel timeline to burst spawning. They share the same elapsed-clock but operate on different state. This prevents anchor timing from coupling to script density.

### Decision 5: Scroll Engine with LUT + DT Clamp

`ScrollEngine` manages a piecewise-linear speed LUT (9 keyframes: 0→60, 2400→100, 9000→140, etc.). Effective speed:

```
effectiveSpeed = halted ? 0 : (speedOverride ?? sampleSpeed(scrollY)) × mult
```

DT clamp at 0.050s prevents tab-switch runaway (max single-frame jump: 180 × 0.050 × 2.6 = 23.4 px). Multiplier ramp approaches `multTarget` at rate `|multTarget - mult| / rampTime` per second.

Scroll halts on boss spawn, resumes at 40 px/s on boss death.

Rationale: Piecewise-linear LUT gives level designers clear scroll speed control without a curve formula. DT clamp addresses a real bug pattern (tab-switch causing scroll overshoot).

### Decision 6: Level Advance with Atomic Reset

`advanceToNextV8Level()` performs:
1. Clear enemies[] and pool enemy bullets
2. ScrollEngine.reset() — scrollY→0, mult→1.0, speedOverride cleared
3. LevelScript.loadLevel(nextIdx) — resets _elapsed, _idx, _anchorIdx, _bossSpawned, _hcPrimed, _levelEndTimer
4. Sync level variables
5. Start 3-2-1 countdown + cinematic ship entry

Rationale: Atomic reset prevents stale state from the previous level leaking. Each subsystem receives an explicit reset call rather than relying on garbage collection.

### Decision 7: Gating via isArcadeMode()

V8 is active when `Balance.V8_MODE.ENABLED === true && !ArcadeModifiers.isArcadeMode()`. When V8 is active, WaveManager.update() is called but returns null (dormant). The LevelScript.tick() drives action instead.

Rationale: Single boolean gating point prevents the two spawn systems from fighting. The dormant WaveManager pattern avoids conditional script loading (WaveManager is always loaded, it just doesn't act).

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| v8-scroller.md | Burst spawn system with scripted timestamps at ±0.1s accuracy (TR-V8-001) | LevelScript SCRIPT array with elapsed-clock advancing during PLAY only |
| v8-scroller.md | Four movement patterns (DIVE/SINE/HOVER/SWOOP) updated per frame (TR-V8-002) | Enemy.update() switches on entryPattern when _v8Fall is true |
| v8-scroller.md | Gravity Gate state machine (IDLE→DWELL→LEAVING) on _v8Fall enemies (TR-V8-003) | Independent probabilistic overlay with _hoverY, _hoverTimer, _fireSuppressed |
| v8-scroller.md | CRUSH anchor system (speed ramp, screen shake, audio pitch drop) (TR-V8-004) | Parallel anchor timeline dispatching to ScrollEngine, EffectsRenderer, AudioSystem |
| v8-scroller.md | Scroll speed LUT with piecewise-linear interpolation and DT clamp (TR-V8-005) | ScrollEngine with 9-keyframe LUT, dt ≤ 0.050s clamp |
| v8-scroller.md | Off-edge culling at y > gameHeight + 120 for V8 enemies (TR-V8-006) | LevelScript tick() culls _v8Fall enemies past cullY |
| v8-scroller.md | Boss trigger at BOSS_AT_S=170s with scroll halt (TR-V8-007) | LevelScript boss trigger → main.js spawnBoss() → ScrollEngine.halt() |
| v8-scroller.md | Level advance with full state reset (enemies, scroll, script pointers) (TR-V8-008) | advanceToNextV8Level() atomic reset |
| v8-scroller.md | HUD boss countdown timer indicator (TR-V8-009) | Canvas-drawn HUD indicator in main.js render pass |
| v8-scroller.md | Enemy HP formula with cycle/wave/tier scaling (TR-V8-010) | calculateEnemyHP with difficulty curve in BalanceConfig + per-level TIER_TARGETS |
| v8-scroller.md | Fire budget ramp with V8 curve and per-level multipliers (TR-V8-011) | HarmonicConductor 8-step fire budget with V8_RAMP and LEVEL_MULT |

## Performance Implications

- **CPU**: LevelScript tick is O(n) in fired bursts per frame (typically 0-3). Enemy movement per-frame per entity. ScrollEngine LUT is O(log n) binary search over 9 keyframes.
- **Memory**: LevelScript stores 3 SCRIPT arrays (~50-80 entries each), 3 ANCHOR arrays (3 entries each). Negligible.
- **Load Time**: Zero — LevelScript is data-driven, no precomputation.
- **Network**: None.

## Migration Plan

Already shipped since v7.5.0. No migration needed.

## Validation Criteria

- LevelScript.tick() fires scripted bursts within ±0.1s of declared timestamps
- All four movement patterns produce visibly distinct trajectories
- Gravity Gate DWELL freezes enemy position and suppresses fire for exactly the grace window
- CRUSH anchors fire speed ramp, screen shake, and audio pitch within ±0.5s of scripted times
- ScrollEngine DT clamp bounds any single-frame scrollY jump to ≤ 25px
- Level advance atomically clears all entities and resets all pointers
- isArcadeMode() returns false → V8 active; true → WaveManager active; no overlap

## Related Decisions

- ADR-0001: GameStateMachine — V8 tick is gated on PLAY state
- ADR-0003: EventBus — post-boss flow uses events for decoupled celebration sequence
- ADR-0002: Canvas 2D Rendering — all V8 entities render through the standard draw pipeline
