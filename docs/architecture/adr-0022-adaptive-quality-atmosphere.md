# ADR-0022: Adaptive Quality & Atmosphere

## Status
Accepted

## Date
2026-05-29

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Vanilla JavaScript (Canvas 2D + DOM) |
| **Domain** | Systems |
| **Knowledge Risk** | LOW — adaptive quality è pattern noto; sky gradient è Canvas 2D base |
| **References Consulted** | `src/systems/QualityManager.js`, `src/systems/SkyRenderer.js` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | Soak test 5min su dispositivo mid-range per verificare tier switching |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0013 (Performance Guardrails), ADR-0021 (Effects Pipeline) |
| **Enables** | WeatherController, SkyRenderer, adaptive particle count |
| **Blocks** | None |
| **Ordering Note** | QualityManager è inizializzato dopo DrawPipeline, prima del game loop |

## Context

Il gioco deve mantenere 60fps su una gamma di dispositivi (desktop high-end → smartphone mid-range). Inoltre, l'atmosfera visiva (cielo, parallax, weather) contribuisce all'immersione senza influenzare il gameplay.

Sistemi coinvolti:
- `QualityManager.js`: monitora frame time e adatta tier (LOW/MED/HIGH) disabilitando effetti costosi.
- `SkyRenderer.js`: gradiente cielo dinamico, stelle, parallax layer.
- `WeatherController.js`: tinta atmosferica (es. bear market = rossastro), lightning flashes.

## Decision

**DECISION**: Adaptive quality a 3 tier con downgrading automatico e manual override possibile.

- **HIGH**: Tutti gli effetti (glow, particles, sky parallax, weather).
- **MED**: Glow ridotto, particles a 60%, sky semplificato.
- **LOW**: Nessun glow, particles a 30%, sky flat gradient, niente weather.
- Switch automatico se frame time > 20ms per 3 frame consecutivi. Upgrade richiede 5s di frame time < 16ms (hysteresis).
- `SkyRenderer` è decorativo: se disabilitato, il gameplay non cambia.
- `WeatherController` legge `isBearMarket` da `main.js` per applicare tinta globale.

## Consequences

- **Positivo**: Esperienza fluida su tutti i dispositivi. Atmosfera immersiva su hardware capace.
- **Negativo**: Qualità visiva non consistente tra giocatori. Leaderboard non può favorire LOW tier (meno VFX = più leggibile).
- **Trade-off**: No benchmark formale per tier assignment — basato su heuristics frame time, non su device detection.

## File References

| File | Ruolo |
|------|-------|
| `src/systems/QualityManager.js` | Tier detection, downgrade/upgrade logic |
| `src/systems/SkyRenderer.js` | Sky gradient, parallax, stars |
| `src/systems/WeatherController.js` | Atmospheric tint, lightning, bear market |

## Traceability

- Copre il requisito performance di `docs/architecture/adr-0013-performance-guardrails.md`.
