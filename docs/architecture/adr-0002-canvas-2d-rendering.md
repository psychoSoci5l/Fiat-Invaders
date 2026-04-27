# ADR-0002: Canvas 2D Rendering Pipeline

## Status
Accepted

## Date
2026-04-25

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Vanilla JavaScript (Canvas 2D, no framework) |
| **Domain** | Rendering |
| **Knowledge Risk** | LOW — Canvas 2D API stable across all modern browsers |
| **References Consulted** | `src/entities/*.js`, `src/systems/ParticleSystem.js` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | None |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0001 (GameStateMachine) — rendering only runs during active game states |
| **Enables** | All visual systems (entities, particles, HUD) |
| **Blocks** | None |
| **Ordering Note** | Rendering is the terminal step in the game loop — physics/collision update first, then draw |

## Context

### Problem Statement
The game needs to render 60fps 2D graphics — player ship, enemies, bullets, particles, background scroll, HUD — in a web browser without any GPU abstraction layer. The choice of rendering API determines the entire visual architecture: draw order, offscreen caching strategy, canvas sizing, and compositing approach.

### Constraints
- Must run at 60fps on mid-range mobile devices
- Must handle 22+ concurrent enemies, each with procedurally-drawn agent graphics
- Must handle particle systems with hundreds of active particles
- Zero external dependencies (no WebGL, no PixiJS, no Three.js)
- Must support dynamic canvas sizing (responsive to viewport)

### Requirements
- Support layered rendering (background, entities, bullets, particles, HUD)
- Support offscreen canvas for cached assets (currency-symbol bullets, agent renders)
- Support screen shake and other camera effects
- Must degrade gracefully if OffscreenCanvas is unavailable (use regular canvas)

## Decision

Use Canvas 2D API (`CanvasRenderingContext2D`) with an offscreen caching layer for frequently-rendered assets and a fixed draw-order pipeline.

### Architecture

```
Game Loop
└── draw()
    ├── ScrollEngine (background)
    ├── Entity rendering (enemies, boss)
    ├── Bullet rendering
    ├── Player rendering
    ├── Particle rendering
    ├── HUD overlay
    └── Screen shake (canvas transform)
```

### Key Interfaces

```js
// Main canvas — single full-screen canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Offscreen cache for static/rarely-changed elements
const bulletCache = new OffscreenCanvas(w, h);
bulletCache.getContext('2d').drawText(currencySymbol, ...);
// Used in draw loop: ctx.drawImage(bulletCache, x, y);

// Screen shake (applied as canvas translate before drawing)
ctx.save();
ctx.translate(shakeX, shakeY);
// ... draw everything ...
ctx.restore();
```

### Enemy Agent: Y-Flip Rendering (TR-EA-002)

Enemy agents use a Y-axis flip to communicate orientation:

- **Descent phase** (entering screen): Rendered with `ctx.scale(1, -1)` — agent appears head-first, "diving" downward.
- **DWELL/hover phase** (stationary in formation): Rendered normally (upright) — `ctx.setTransform(1, 0, 0, 1, x, y)` resets to identity before draw.

The flip is applied at the entity level per frame based on `isEntering` flag:

```js
if (enemy.isEntering) {
  ctx.save();
  ctx.translate(x, y + h);  // translate to bottom of bounding box
  ctx.scale(1, -1);         // flip Y
  drawAgent(ctx, 0, 0, w, h);
  ctx.restore();
} else {
  drawAgent(ctx, x, y, w, h);
}
```

The y-flip is purely visual — collision bounds remain unchanged regardless of orientation. This prevents gameplay inconsistency between entry and DWELL phases.

### Enemy Agent: VFX Compositing (TR-EA-004)

Four visual effects layer onto enemy agents via Canvas 2D compositing:

| Effect | Technique | Alpha / Color | Performance |
|--------|-----------|---------------|-------------|
| **Motion trail** | Draw semi-transparent copies of the agent at previous positions (ring buffer of 3-5 frames) before current-frame draw. | `globalAlpha = 0.15-0.30` | 3-5 extra drawImage calls per trailed entity |
| **Halo** | Radial gradient circle behind agent. `createRadialGradient(cx, cy, 0, cx, cy, radius)` with center-to-edge fade. | Center `rgba(r,g,b,0.3)`, edge `rgba(r,g,b,0)` | One fillRect per haloed entity |
| **Glyph** | Overlay symbol (currency icon, elite indicator) drawn on top of agent body. Uses OffscreenCanvas cache for the symbol. | `globalCompositeOperation = 'source-over'` | One drawImage per glyph |
| **Pulse** | Oscillating alpha or scale applied via `sin(time * frequency)` driving `globalAlpha` or a uniform scale factor. | Alpha oscillates ±0.2 around base alpha | One `Math.sin()` + alpha set per pulsed entity |

All VFX are applied after the base agent draw in the entity render pass. Kill-switch: `AGENT_VFX_ENABLED` in BalanceConfig suppresses all four effects.

### Enemy Agent: Kill-Switch Fallback to Minion Silhouette (TR-EA-008)

When `ENEMY_AGENT_ENABLED` is `false` in BalanceConfig, enemy agents revert to a simple geometric silhouette:

- **Shape**: Filled rectangle (`#888`) with a slightly smaller inner rectangle (`#555`) and two "eye" dots (`#aaa`, 4px circles).
- **Size**: Matches the agent bounding box (58×58px base).
- **Performance**: Single `fillRect` + two `arc()` calls — negligible cost.
- **Purpose**: Provides visual distinction between active enemies and the background even when agent rendering is disabled, without requiring the full procedural draw pipeline.

```js
function drawMinion(ctx, x, y, w, h) {
  ctx.fillStyle = '#888';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#555';
  ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  ctx.fillStyle = '#aaa';
  ctx.beginPath();
  ctx.arc(x + w * 0.35, y + h * 0.4, 2, 0, Math.PI * 2);
  ctx.arc(x + w * 0.65, y + h * 0.4, 2, 0, Math.PI * 2);
  ctx.fill();
}
```

The kill-switch is checked at spawn time — when disabled, `enemy.renderFn = drawMinion` replaces the procedural `drawAgent`. This avoids per-frame branching on the kill-switch flag.

## Alternatives Considered

### Alternative 1: WebGL (raw or via library)
- **Description**: Use WebGL for GPU-accelerated 2D rendering
- **Pros**: Better performance for massive particle counts; shader effects
- **Cons**: Adds complexity; requires sprite batching; incompatible with the zero-dependency constraint; overkill for the game's visual complexity
- **Rejection Reason**: Canvas 2D handles the entity count easily at 60fps. WebGL complexity and dependency cost not justified.

### Alternative 2: DOM-based rendering (divs/spans)
- **Description**: Use positioned HTML elements for game objects
- **Pros**: Free accessibility, CSS animations, text rendering
- **Cons**: DOM performance tanks above ~50 elements; layout thrashing at 60fps; no pixel-level control
- **Rejection Reason**: Completely unsuitable for 60fps action games with 100+ simultaneous draw calls.

## Consequences

### Positive
- Zero dependencies — rendering is built into the browser
- OffscreenCanvas caching reduces per-frame draw calls for frequently-rendered elements
- Simple draw-order pipeline is easy to debug and profile
- Works identically across Chrome, Firefox, Safari, Edge

### Negative
- No shader effects (bloom, glow, blur) without manual pixel manipulation
- Particle count limited by CPU draw throughput (no GPU batching)

### Risks
- OffscreenCanvas not available in older browsers (Safari < 11)
  - **Mitigation**: Fallback to rendering currency bullets each frame in the main canvas (already implemented in v7.12: `OffscreenCanvas` check at render time)

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| enemy-agents.md | Procedural agent rendering with drawAgent() | Canvas 2D enables per-frame procedural drawing of pilot/vehicle |
| enemy-agents.md | Currency-symbol bullets (OffscreenCanvas cache) | OffscreenCanvas provides the cache layer for symbol rendering |
| weapon-elementals-godchain.md | GODCHAIN visual identity (red-orange aura, vignette) | Canvas 2D compositing (globalCompositeOperation) enables overlay effects |
| enemy-agents.md | Y-flip rendering for entry/descent vs DWELL (TR-EA-002) | Per-frame `ctx.scale(1, -1)` during entry phase based on `isEntering` flag; identity transform during DWELL |
| enemy-agents.md | VFX compositing: trail, halo, glyph, pulse (TR-EA-004) | Four techniques layered via compositing: semi-transparent trail copies, radial gradient halo, OffscreenCanvas glyph overlay, sin-driven pulse alpha |
| enemy-agents.md | Kill-switch fallback to minion silhouette (TR-EA-008) | `renderFn` swap at spawn time: `drawMinion` (fillRect + eyes) replaces `drawAgent` when `ENEMY_AGENT_ENABLED` is false |

## Performance Implications
- **CPU**: Primary bottleneck is fill rate and draw call count. OffscreenCanvas cache reduces per-frame cost of complex draws.
- **Memory**: One full-screen canvas (~8MB at 1920×1080) + OffscreenCanvas caches (~1-2MB total)
- **Load Time**: Zero — canvas initialization is synchronous
- **Network**: None

## Migration Plan
Already shipped. No migration needed.

## Validation Criteria
- 60fps sustained with 22 concurrent enemies + full particle system
- OffscreenCanvas fallback path correctly renders bullet symbols when OffscreenCanvas is unavailable
- Screen shake does not clip or leave artifacts at canvas edges

## Related Decisions
- ADR-0001: GameStateMachine — rendering loop gates on currentState === PLAY
