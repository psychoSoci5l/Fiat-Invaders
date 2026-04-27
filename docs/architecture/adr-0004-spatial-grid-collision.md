# ADR-0004: Spatial-Grid Collision Detection

## Status
Accepted

## Date
2026-04-25

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Vanilla JavaScript (Canvas 2D, no framework) |
| **Domain** | Physics / Core |
| **Knowledge Risk** | LOW — spatial-grid collision is a well-documented pattern |
| **References Consulted** | `src/systems/CollisionSystem.js` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | None |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0001 (GameStateMachine) — collision only runs during PLAY state |
| **Enables** | All combat gameplay (bullets hitting enemies/enemies hitting player) |
| **Blocks** | None |
| **Ordering Note** | Collision runs after movement/physics update and before entity removal each frame |

## Context

### Problem Statement
Each frame, every bullet must be checked against every enemy, and every enemy must be checked against the player. With 22+ concurrent enemies and 100+ bullets, naive O(n*m) pairwise comparison costs ~2,200 checks per frame at 60fps — 132,000 checks per second. This grows as entity counts increase (Arcade mode post-C3, boss fights with minions). A broad-phase optimization is needed to reduce comparisons.

### Constraints
- Must run synchronously each frame (no deferred or async collision)
- Must support multiple collision shapes (axis-aligned rectangles for entities, point checks for bullets)
- Must handle both bullet→enemy and enemy→player collisions
- Must integrate with ObjectPool (entities can be alive or dead)
- Zero external dependencies

### Requirements
- Reduce per-frame collision comparisons by at least 5× vs. brute-force
- Support dynamic grid cell sizing
- Must handle entities that span multiple grid cells (large boss hitbox)
- Must clear and rebuild the grid each frame (dynamic entities)

## Decision

Use a spatial grid (grid-based broad phase) that bins entities into cells by their axis-aligned bounding box, then only checks pairs within the same cell.

### Architecture

```
CollisionSystem
├── grid: { cellKey → [entity, entity, ...] }
├── cellSize: 80px
├── rebuild(entities) — clear + re-bin all active entities
├── update() — rebuild grid → check collisions
│
├── checkBulletEnemyCollisions()
│   └── for each bullet: get grid cell → check vs. enemies in cell
│
└── checkEnemyPlayerCollisions()
    └── for each enemy: get grid cell → check vs. player rect
```

### Key Interfaces

```js
// Cell key = `${Math.floor(y / cellSize)}:${Math.floor(x / cellSize)}`
const key = `${by}:${bx}`;
grid[key] = grid[key] || [];
grid[key].push(entity);

// For an entity spanning multiple cells, compute the range of cells it overlaps
const minCX = Math.floor(entity.x / cellSize);
const maxCX = Math.floor((entity.x + entity.width) / cellSize);
const minCY = Math.floor(entity.y / cellSize);
const maxCY = Math.floor((entity.y + entity.height) / cellSize);
// Iterate all cells in range, check candidates

// Collision check (AABB)
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}
```

### Cell Size Selection
- Cell size = 80px (empirically chosen and later tuned — 80px provides finer granularity than originally planned 120px, reducing candidates per cell for typical enemy/bullet sizes)
- Bullets are ~8-12px — small enough that they rarely span more than 1-2 cells
- Boss hitbox (160×140) spans 2 cells in each dimension — handled by multi-cell range iteration

## Alternatives Considered

### Alternative 1: Brute-force O(n*m)
- **Description**: Check every bullet against every enemy and every enemy against the player
- **Pros**: Simplest implementation, no grid overhead
- **Cons**: ~2,200 checks/frame at moderate entity counts; degrades non-linearly as count increases
- **Rejection Reason**: Unnecessary CPU waste. Spatial grid costs ~200 comparisons + grid rebuild for the same result.

### Alternative 2: Quadtree
- **Description**: Recursively subdivide space into quadrants containing entities
- **Pros**: Better for unevenly distributed entities; works well for varied entity sizes
- **Cons**: Tree rebuild overhead; recursive implementation is harder to debug; overkill for top-down shooter where entities are roughly evenly distributed
- **Rejection Reason**: Spatial grid is simpler, faster to rebuild each frame, and sufficient for the game's entity distribution.

## Consequences

### Positive
- Reduces per-frame comparisons from O(n*m) to O(n * k) where k = entities in same cell (typically 3-8)
- Grid rebuild each frame is O(n) — fast since all entities are iterated anyway
- Cell size can be tuned for performance vs. granularity tradeoff

### Negative
- Entities near cell boundaries are checked against entities in adjacent cells (small overhead)
- Large entities (boss) require multi-cell range iteration

### Risks
- Cell size too small → entities miss collisions across cell boundaries
  - **Mitigation**: Cell size (80px) is larger than typical bullet size; multi-cell range for larger entities (boss)

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| v8-scroller.md | Enemy HP and damage application | Collision system delivers bullet→enemy hits that apply damage |
| weapon-elementals-godchain.md | Elemental on-kill effects (contagion radius) | Collision system provides the spatial query for finding enemies within contagion range |
| arcade-rogue-protocol.md | Combo system (kills in rapid succession) | Collision detection triggers kill events that feed the combo timer |

## Performance Implications
- **CPU**: ~200-400 AABB checks per frame vs. ~2,200 for brute-force. Grid rebuild adds ~50μs.
- **Memory**: Grid object created and discarded each frame (~2-4KB peak during rebuild)
- **Load Time**: Zero
- **Network**: None

## Migration Plan
Already shipped. No migration needed.

## Validation Criteria
- No missed collisions at gameplay speeds (bullets passing through enemies at high velocity)
- Grid rebuild + collision check completes in <1ms per frame
- Boss entities spanning multiple cells correctly collide with bullets in all overlapping cells

## Related Decisions
- ADR-0001: GameStateMachine — collision only runs during PLAY state
- ADR-0002: Canvas 2D Rendering — collision debug visualization renders grid cells (toggle via DebugSystem)
