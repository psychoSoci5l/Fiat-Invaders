# Canvas 2D Rendering Module

## Core Patterns

### Draw-Order Pipeline

The game uses a fixed draw-order pipeline, executed each frame in the `draw()` phase of the game loop:

1. **Background** — gradient fill, scroll offset
2. **Vapor trails** — player ship exhaust (below entities)
3. **Enemies** — procedural agent rendering via `Enemy.drawAgent()`
4. **Bullets** — enemy bullets above enemies, player bullets above that
5. **Player** — ship sprite, cannon flares, shield glow
6. **Particles** — explosions, elemental effects, currency shower
7. **HUD** — score, HP bar, combo meter, weapon level, DIP gauge
8. **Screen shake** — applied as `ctx.translate()` around the entire draw

### Offscreen Caching

- Currency-symbol bullet text is rendered once to `OffscreenCanvas` and re-used via `drawImage()` each frame
- Fallback: when `OffscreenCanvas` is unavailable, symbol text is rendered per-frame on the main canvas

### Compositing

- `globalCompositeOperation = 'lighter'` for glow/additive effects (particles, GODCHAIN aura, laser beams)
- `globalCompositeOperation = 'destination-out'` for cutout effects (rare)

## Performance Guidelines

- Minimize `save()`/`restore()` depth — each call has measurable overhead
- Batch similar draw calls together (e.g., draw all enemies before drawing bullets, not interleaved)
- Avoid `shadowBlur` — it forces software rendering in some browsers
- `OffscreenCanvas` cache hit = ~0.01ms per draw; cache miss (fallback) = ~0.1ms per render
