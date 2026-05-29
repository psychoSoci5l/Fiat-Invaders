# ADR-0019: Input System — Keyboard, Gamepad, Touch, Tilt

## Status
Accepted

## Date
2026-05-29

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Vanilla JavaScript (Canvas 2D, Web API) |
| **Domain** | Core |
| **Knowledge Risk** | LOW — Gamepad API, Touch, Keyboard sono API Web standard |
| **References Consulted** | `src/core/InputSystem.js`, Gamepad API spec |
| **Post-Cutoff APIs Used** | Gamepad API (stable since ~2012) |
| **Verification Required** | Gamepad d-pad navigation in IntroScreen (manual) |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0003 (EventBus) — InputSystem emette eventi via callback |
| **Enables** | ADR-0020 (UI Framework), tutto il gameplay player-facing |
| **Blocks** | None |
| **Ordering Note** | InputSystem.init() è chiamato in main.js prima di qualsiasi gameplay |

## Context

Il gioco supporta 4 modalità di input simultanee:
1. **Keyboard** — primario desktop (Arrow keys + Z/X/C per azioni)
2. **Gamepad** — standard mapping via Gamepad API, polling 10Hz
3. **Touch** — mobile (swipe, joystick opzionale, tap-shield)
4. **Tilt** — accelerometer (opzionale, richiede permesso iOS 13+)

Nessun framework di input esterno è usato. Tutto è implementato nativamente per minimizzare latency e dipendenze.

## Decision

**DECISION**: Implementare un InputSystem unico con callback pattern anziché event bus diretto.

- `InputSystem.on(event, callback)` registra handler per: `navigate`, `start`, `escape`, `toggleDebug`.
- Gamepad polling a 10Hz (100ms) per d-pad/stick — sufficiente per menu, basso CPU.
- Touch usa `identifier` tracking per multi-touch affidabile.
- Tilt richiede esplicito `requestTiltPermission()` (iOS constraint).
- Keyboard repeat è bloccato (`e.repeat` ignored) per evitare input accidentali durante transizioni di stato.

## Consequences

- **Positivo**: Nessuna dipendenza esterna. Latenza minima. Gamepad supportato senza librerie.
- **Negativo**: Il polling gamepad a 10Hz non è sufficiente per precision frame-perfect in gameplay twitch. Per il menu va bene; per gameplay il gamepad usa assi continui letti nel game loop via `getGamepads()`, non dal poll interval.
- **Trade-off**: Touch shield (tap-on-ship) e joystick opzionale complicano la logica touch, ma sono necessari per mobile.

## File References

| File | Ruolo |
|------|-------|
| `src/core/InputSystem.js` | Implementazione completa |
| `src/main.js` (~linea 765) | `inputSys.init()` + callback wiring |
| `src/main.js` (~linea 986) | `inputSys.on('escape', ...)` |
| `src/main.js` (~linea 1011) | `inputSys.on('navigate', ...)` per ship carousel |

## Traceability

- Copre il requisito di input multi-modal (keyboard/gamepad/touch/tilt) non tracciato esplicitamente nei TR-ID ma presente in `design/accessibility-requirements.md`.
