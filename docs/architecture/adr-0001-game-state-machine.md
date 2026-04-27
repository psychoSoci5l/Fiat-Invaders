# ADR-0001: GameStateMachine — Central State Management

## Status
Accepted

## Date
2026-04-25

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Vanilla JavaScript (Canvas 2D, no framework) |
| **Domain** | Core |
| **Knowledge Risk** | LOW — pattern well-established in the codebase since v1.0 |
| **References Consulted** | `src/core/GameStateMachine.js` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | None — pattern is already shipped and active |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | None |
| **Enables** | ADR-0003 (EventBus), all gameplay systems that need state awareness |
| **Blocks** | None |
| **Ordering Note** | All gameplay systems depend on GameStateMachine for lifecycle awareness, but the pattern is well-established |

## Context

### Problem Statement
A vertical-scrolling shoot-'em-up has distinct, mutually-exclusive game phases (intro, hangar, playing, paused, game over, etc.) that need strict ordering guarantees. Systems (input, collision, audio, HUD) need to know the current state to decide what behavior is active. Without central state management, systems would independently track phase via ad-hoc boolean flags, leading to desyncs, edge cases, and impossible-to-reproduce bugs when states transition in unexpected order.

### Constraints
- Must be synchronous — state transitions happen on the same frame, not deferred
- Must provide a single source of truth for "what phase is the game in?"
- Must prevent invalid transitions (e.g., GAMEOVER → HANGAR without going through PLAY)
- Must notify dependent systems on transition without tight coupling
- Must work within the script-load-order namespace pattern (`window.Game.*`)

### Requirements
- Support all game phases: VIDEO, INTRO, HANGAR, WARMUP, PLAY, PAUSE, INTERMISSION, GAMEOVER, STORY_SCREEN, CAMPAIGN_VICTORY, SETTINGS
- Enforce a transition map — only allow explicitly listed state transitions
- Provide listener registration for enter/exit events per state
- Zero external dependencies
- **Mode gating within PLAY**: Systems must distinguish Arcade vs V8 campaign mode within the PLAY state. WaveManager runs only during Arcade mode; V8 LevelScript runs only during campaign mode. The `isArcadeMode()` boolean gate is checked per-frame alongside `currentState === PLAY`.

## Decision

Use a finite state machine (`GameStateMachine`) with an explicit transition map and listener callbacks.

### Architecture

```
GameStateMachine
├── currentState: string (read-only)
├── previousState: string (read-only)
├── transitionMap: { from → [to, to, ...] }
├── enterCallbacks: { state → [fn, fn, ...] }
├── exitCallbacks: { state → [fn, fn, ...] }
└── transition(newState) → boolean
```

### Key Interfaces

```js
// Transition map (strict — only these allowed)
Game.transitionMap = {
  'VIDEO':            ['INTRO'],
  'INTRO':            ['HANGAR', 'SETTINGS', 'WARMUP', 'STORY_SCREEN'],
  'HANGAR':           ['PLAY', 'WARMUP', 'INTRO', 'STORY_SCREEN'],
  'STORY_SCREEN':     ['PLAY', 'WARMUP', 'INTERMISSION', 'INTRO', 'CAMPAIGN_VICTORY'],
  'WARMUP':           ['PLAY', 'PAUSE', 'INTRO'],
  'PLAY':             ['PAUSE', 'INTERMISSION', 'GAMEOVER', 'STORY_SCREEN', 'CAMPAIGN_VICTORY'],
  'PAUSE':            ['PLAY', 'WARMUP', 'INTERMISSION', 'INTRO'],
  'INTERMISSION':     ['PLAY', 'STORY_SCREEN', 'PAUSE'],
  'GAMEOVER':         ['INTRO'],
  'CAMPAIGN_VICTORY': ['INTRO'],
  'SETTINGS':         ['INTRO']
};
```

```js
// Public API
Game.stateMachine = Game.GameState;  // singleton, exposed as Game.GameState
Game.stateMachine.current;            // 'VIDEO' (read-only getter)
Game.stateMachine.transition('INTRO'); // change state, returns boolean
Game.stateMachine.is('PLAY', 'PAUSE'); // check current against one or more states
Game.stateMachine.forceSet('INTRO');   // skip validation (init/reset only)
Game.stateMachine.onEnter('PLAY', fn); // register enter callback (returns unsubscribe)
Game.stateMachine.onExit('PLAY', fn);  // register exit callback (returns unsubscribe)
Game.stateMachine.offEnter('PLAY', fn);// unregister enter callback
Game.stateMachine.offExit('PLAY', fn); // unregister exit callback
Game.stateMachine.onChange(fn);        // generic listener for all state changes
```

### Mode Gating Within PLAY

The PLAY state hosts two mutually exclusive game modes. Mode selection is orthogonal to state:

- **Arcade mode**: `isArcadeMode() === true` — WaveManager active, spawns wave phases procedurally. V8 LevelScript is dormant (no update, no tick).
- **V8 campaign mode**: `isArcadeMode() === false` — LevelScript active, drives scrolling + burst spawns from timeline data. WaveManager is dormant (no phase streaming, no formation generation).

Each system checks both `currentState === PLAY` and its mode gate before doing work. This dual-gating ensures WaveManager and LevelScript never conflict — exactly one spawning system is active per game session.

## Alternatives Considered

### Alternative 1: Ad-hoc boolean flags
- **Description**: Each system tracks its own `isPlaying`, `isPaused`, etc.
- **Pros**: No central abstraction needed
- **Cons**: Flags desync easily; no enforcement of valid transitions; adding a new state requires auditing every system
- **Rejection Reason**: Causes bugs on state transitions (e.g., collision system processing during transitions). The FSM pattern eliminates an entire class of bugs.

### Alternative 2: Event-driven only (no state machine)
- **Description**: Emit events like `game:play`, `game:pause` and let systems decide independently
- **Pros**: Decoupled, flexible
- **Cons**: No guarantee that all systems respond to the same event; no enforcement of ordering; systems can end up in contradictory internal states
- **Rejection Reason**: Works for notification but not for authoritative state. Combined with EventBus (ADR-0003) for notification, but FSM remains the authority.

## Consequences

### Positive
- Single source of truth for game phase — every system reads `currentState`
- Impossible transitions are caught at call time (e.g., PAUSE → GAMEOVER blocked)
- Adding a new state is one entry in the transition map + listener registrations
- Enables the EventBus to filter events by state (ADR-0003)

### Negative
- State transitions are in-band (same frame) — long-running transition logic blocks the frame
- No built-in history/stack — cannot "pop" back to previous state (not needed for this game's flow)

### Risks
- A system that doesn't check currentState can fire during wrong game phase
  - **Mitigation**: EventBus (ADR-0003) allows filtering by state at the dispatch level

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| v8-scroller.md | Activation gating (V8 active only during PLAY, not INTRO/HANGAR) | State machine enforces that V8 logic only runs when currentState === PLAY |
| arcade-rogue-protocol.md | Arcade mode activation gating | State machine distinguishes PLAY from HANGAR for modifier selection flow |
| wave-legacy-arcade.md | WaveManager only updates during PLAY | WaveManager gates on currentState check before spawning |
| wave-legacy-arcade.md | WaveManager dormant in V8 campaign (TR-WAV-006) | Mode gating within PLAY: WaveManager skips update when `!isArcadeMode()`. LevelScript skips update when `isArcadeMode()`. Dual-gate prevents concurrent spawn systems. |
| v8-scroller.md | INTERMISSION state for between-level narrative | StoryScreen + INTERMISSION states allow campaign flow without exiting PLAY context |
| enemy-agents.md | WARMUP state for pre-wave preparation | Short safe period before enemy spawns begin, entered from HANGAR via WARMUP → PLAY |

## Performance Implications
- **CPU**: Negligible — single property read per frame per system
- **Memory**: ~1KB for the state names, map, and callback registry
- **Load Time**: Zero — instantiated at boot
- **Network**: None

## Migration Plan
Already shipped. No migration needed.

## Validation Criteria
- Illegal transitions (logged via `transitionMap` lookup) return false and log via `console.error`
- All systems that previously used ad-hoc flags now read `Game.GameState.current`
- No state-related desync bugs reproduce
- WaveManager does not spawn enemies during V8 campaign (verified per-frame mode gate)
- LevelScript does not advance during Arcade mode (verified per-frame mode gate)
- Self-transitions (e.g., PLAY → PLAY) are no-ops and return true

## Related Decisions
- ADR-0003: EventBus — decoupled notifications triggered on state transitions
