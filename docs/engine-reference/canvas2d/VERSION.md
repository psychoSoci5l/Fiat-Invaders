# Canvas 2D — Engine Reference

| Field | Value |
|-------|-------|
| **Engine** | Canvas 2D (Web API) |
| **Specification** | HTML Living Standard — Canvas 2D Context |
| **LLM Knowledge Cutoff** | 2025-04 (baseline; API is stable with minimal changes) |
| **Post-Cutoff Risk** | LOW — Canvas 2D API has not had breaking changes in recent years |
| **Browser Targets** | Chrome 120+, Firefox 115+, Safari 17+, Edge 120+ |
| **Mobile Targets** | Chrome Android 120+, Safari iOS 17+ |

## Key API Surfaces Used

- `CanvasRenderingContext2D` — drawImage, fillText, strokeText, arc, rect, save/restore, translate, rotate, scale, globalAlpha, globalCompositeOperation
- `OffscreenCanvas` — for cached bullet symbol rendering (fallback path available)
- `CanvasGradient` — for background gradient, vignette effects
- `requestAnimationFrame` — game loop timing

## Notes

- OffscreenCanvas availability: Chrome 69+, Firefox 105+, Safari 16.4+
- Safari has historically been the laggard for OffscreenCanvas support — the fallback path (render to offscreen `<canvas>` element in DOM) is exercised during development
- `willReadFrequently` hint should be set on the canvas context for pixel-read operations (currently not used by the game)
