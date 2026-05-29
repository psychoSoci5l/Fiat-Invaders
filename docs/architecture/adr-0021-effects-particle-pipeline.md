# ADR-0021: Effects & Particle Pipeline

## Status
Accepted

## Date
2026-05-29

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Vanilla JavaScript (Canvas 2D, no WebGL) |
| **Domain** | Rendering / VFX |
| **Knowledge Risk** | LOW — Canvas 2D composite operations sono API mature |
| **References Consulted** | `src/rendering/DrawPipeline.js`, `src/systems/ParticleSystem.js` |
| **Post-Cutoff APIs Used** | `OffscreenCanvas` (widely supported) |
| **Verification Required** | Lighthouse Performance > 77 in locale; nessun drop > 5fps durante VFX massimo |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0002 (Canvas 2D Rendering), ADR-0012 (Object Pool) |
| **Enables** | Tutti i VFX di gameplay (death explosions, HYPER glow, screen flash) |
| **Blocks** | None |
| **Ordering Note** | DrawPipeline registra layer in `main.js:registerAll()` |

## Context

Il pipeline di rendering è single-pass Canvas 2D con layer registrati:
1. Background (sky, scroll)
2. Entities (enemies, player, bullets)
3. Particles / VFX
4. Glow compositing (GlowManager)
5. HUD overlay (DOM)

ParticleSystem usa object pool per evitare GC spikes. EffectsRenderer gestisce screen shake, flash, vignette — tutti frame-based e non persistono tra stati.

## Decision

**DECISION**: Single-pass Canvas 2D con composite glow layer e object-pooled particles.

- `DrawPipeline.js` registra layer con `order` implicito; ogni layer riceve `ctx` e `dt`.
- `GlowManager.js` usa `ctx.globalCompositeOperation = 'lighter'` per additive glow. **Ogni uso di `globalCompositeOperation` deve essere wrapped in `ctx.save()` / `ctx.restore()`** — regola del control manifest.
- `ParticleSystem.js`: pooled particles con `life`, `maxLife`, `scale` tween. Max count governed da `Balance.PARTICLES.MAX_COUNT`.
- `EffectsRenderer.js`: screen shake modifica `canvas.style.transform` (non il context) per non invalidare il render loop.

## Consequences

- **Positivo**: Nessuna dipendenza WebGL/shader. Funziona su ogni dispositivo.
- **Negativo**: Glow via `lighter` è costoso su schermi densi di entità (pixel fill bound). Mitigato da `QualityManager` che disabilita glow su tier LOW.
- **Trade-off**: Particelle limitate a ~200 simultanee per rispettare il frame budget.

## File References

| File | Ruolo |
|------|-------|
| `src/rendering/DrawPipeline.js` | Layer registration e orchestrazione draw pass |
| `src/rendering/GlowManager.js` | Additive glow composite |
| `src/systems/ParticleSystem.js` | Pooled particles (death explosions, trails) |
| `src/systems/EffectsRenderer.js` | Screen shake, flash, vignette |
| `src/core/ObjectPool.js` | Pool generico usato da ParticleSystem |

## Traceability

- Copre i requisiti VFX di `design/gdd/v8-scroller.md` (CRUSH anchors, motion trails) e `design/gdd/weapon-elementals-godchain.md` (elemental on-kill VFX).
