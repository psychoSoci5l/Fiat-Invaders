# ADR-0003: EventBus — Decoupled Pub/Sub Communication

## Status
Accepted

## Date
2026-04-25

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Vanilla JavaScript (Canvas 2D, no framework) |
| **Domain** | Core |
| **Knowledge Risk** | LOW — pub/sub is a well-established pattern; implementation is straightforward |
| **References Consulted** | `src/core/EventBus.js` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | None |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0001 (GameStateMachine) — EventBus emits state transition events |
| **Enables** | ADR-0006 (Leaderboard), all gameplay callback systems |
| **Blocks** | None |
| **Ordering Note** | EventBus is initialized at boot, before any system that emits or listens to events |

## Context

### Problem Statement
Game systems need to communicate without tight coupling. When the player dies, the collision system, audio system, particle system, HUD, and game-over screen all need to react — but the collision system shouldn't know about the audio system. Without a decoupling layer, adding a new reaction to an event means modifying the code that triggers it, creating a spiderweb of direct dependencies.

### Constraints
- Must be synchronous — events fire and are handled in the same frame
- Must support one-shot and persistent listeners
- Must work within the `window.Game.*` namespace pattern
- Must allow listener registration before event sources exist (startup ordering flexibility)
- Zero external dependencies

### Requirements
- Support named events with optional payload data
- Support registering and unregistering listeners
- Support one-shot listeners (auto-remove after first fire)
- Provide a `clear()` method for cleanup on state transitions
- Must not throw if a listener throws (isolate failures)

## Decision

Use a simple pub/sub EventBus with named string events, typed payloads, and isolated listener execution.

### Architecture

```
System A (emitter)
  └── eventBus.emit('player:died', { x, y, killer })
        ├── Listener 1: AudioSystem → playDeathSound()
        ├── Listener 2: ParticleSystem → spawnExplosion(x, y)
        ├── Listener 3: StatsTracker → incrementDeaths()
        └── Listener 4: GameStateMachine → transition('GAMEOVER')
```

### Key Interfaces

```js
// EventBus API
Game.eventBus = new EventBus();

// Register listener
Game.eventBus.on('player:died', (data) => { /* ... */ });

// Register one-shot listener
Game.eventBus.once('player:died', (data) => { /* ... */ });

// Emit event (synchronous, all listeners fire immediately)
Game.eventBus.emit('player:died', { x: player.x, y: player.y, killer: 'BOSS' });

// Remove listener
Game.eventBus.off('player:died', callback);

// Remove all listeners for an event
Game.eventBus.clear('player:died');

// Remove all listeners for all events (on state cleanup)
Game.eventBus.clear();
```

### Event Naming Convention
```
domain:action — e.g.,:
  player:died       player:evolved    player:shot
  enemy:killed      enemy:spawned     boss:defeated
  pickup:collected  wave:started      wave:completed
  game:over          game:paused       game:resumed
  state:entered     state:exited
```

## Alternatives Considered

### Alternative 1: Direct method calls between systems
- **Description**: `AudioSystem.play('death')` called directly from collision handler
- **Pros**: Simple, no abstraction overhead
- **Cons**: Tight coupling; adding a reaction means modifying the caller; testing requires all systems to be instantiated
- **Rejection Reason**: Creates the exact spiderweb dependency the project aims to avoid.

### Alternative 2: Global signals (observer pattern)
- **Description**: Each system exposes an `onPlayerDied` callback that other systems set
- **Pros**: Slightly less coupled than direct calls
- **Cons**: Single-listener-per-event (only one system can observe); registration order matters; no built-in cleanup
- **Rejection Reason**: EventBus supports multiple listeners per event and provides `clear()` for clean teardown.

## Consequences

### Positive
- Systems are decoupled — adding a new reaction to an event doesn't modify the emitter
- One-shot listeners (`once`) simplify temporary reaction patterns
- `clear()` provides clean teardown on state transitions (prevents stale listeners)

### Negative
- Event flow is harder to trace than direct calls (no call stack for "who handles this event?")
- No built-in event logging — debugging requires adding a logging listener

### Risks
- Listener throws can break the emit loop if not caught
  - **Mitigation**: Each listener is wrapped in try-catch; a throw does not prevent subsequent listeners from firing

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| v8-scroller.md | Boss trigger at BOSS_AT_S | EventBus emits `boss:trigger` to start boss fight sequence |
| arcade-rogue-protocol.md | Modifier card selection on boss/mini-boss defeat | EventBus emits `boss:defeated` to trigger modifier choice screen |
| drop-system-apc.md | Post-death grace window | EventBus emits `player:died` to start grace timer |

## Performance Implications
- **CPU**: Negligible — event dispatch is O(n) where n = number of listeners for that event
- **Memory**: ~1KB for the listener registry (event name → array of callbacks)
- **Load Time**: Zero — instantiated at boot
- **Network**: None

## Migration Plan
Already shipped. No migration needed.

## Validation Criteria
- Any listener throw does not prevent other listeners from firing
- `once` listeners auto-remove after first emit
- `clear()` removes all listeners for the specified event (or all events if no event specified)
- Event emit with zero listeners is a no-op (no error)

## Related Decisions
- ADR-0001: GameStateMachine — EventBus emits `state:entered` and `state:exited` on transitions
