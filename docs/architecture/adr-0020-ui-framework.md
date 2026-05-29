# ADR-0020: UI Framework & Screen Management

## Status
Accepted

## Date
2026-05-29

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Vanilla JavaScript (Canvas 2D + DOM/CSS overlay) |
| **Domain** | UI |
| **Knowledge Risk** | LOW — DOM/CSS overlay su canvas è pattern standard web games |
| **References Consulted** | `src/ui/UIManager.js`, `src/ui/IntroScreen.js`, `design/ux/hud.md` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | Manual walkthrough Intro → Game → GameOver per ogni release |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0003 (EventBus), ADR-0019 (InputSystem) |
| **Enables** | Tutti gli screen flow player-facing |
| **Blocks** | None |
| **Ordering Note** | UI layer è caricato dopo Core Systems, prima di Entities |

## Context

Il rendering del gioco è Canvas 2D, ma tutta l'interfaccia utente (HUD, menu, modali) è DOM-based per:
- Accessibilità nativa (screen reader, focus, aria)
- Layout responsive senza calcoli manuali per-pixel
- CSS animations/transitions performanti

12 moduli UI gestiscono superfici diverse:
- **Screen flow**: `IntroScreen`, `GameCompletion`, `ModifierChoiceScreen`
- **HUD**: `UIManager`, `PerkIconManager`, `FloatingTextManager`
- **Modali/Overlay**: `LessonModal`, `TutorialManager`, `DebugOverlay`
- **Feedback**: `ToastSystem`, `MessageSystem`, `MemeEngine`

## Decision

**DECISION**: Architettura DOM-overlay con z-index stratificato e modal stack gestito centralmente.

- Canvas: `z-index: 1` (gameplay)
- HUD: `z-index: 10` (punteggio, vite)
- Modali: `z-index: 100` (pause, settings)
- Curtain/Transition: `z-index: 200` (fullscreen overlay)
- Focus trap: `AccessibilityUtils` gestisce `Tab` cycling dentro modali aperti.
- Escape key: `InputSystem` → chiude top modal (se aperto) prima di triggerare pause.

## Consequences

- **Positivo**: Accessibilità AA raggiungibile nativamente. Layout responsive gratis.
- **Negativo**: Sincronizzazione stato DOM/Canvas (es. player posizione vs touch coordinate) richiede conversione coordinate. Performance: DOM reflow su HUD aggiornato ogni frame può causare layout thrashing — mitigato da caching elementi e batching CSS class toggles.
- **Trade-off**: Non usiamo UI Toolkit proprietario (Godot UMG/Unity UI) — va bene per PWA ma richiede manual z-index e focus management.

## File References

| File | Ruolo |
|------|-------|
| `src/ui/UIManager.js` | Coordination layer, DOM cache, screen transitions |
| `src/ui/IntroScreen.js` | Intro state machine (VIDEO → SPLASH → SELECTION) |
| `src/ui/ModifierChoiceScreen.js` | Post-boss modifier card selection |
| `src/ui/GameCompletion.js` | Campaign victory / Arcade game over |
| `src/utils/AccessibilityUtils.js` | Focus trap, aria-live, modal stack |

## Traceability

- Copre i requisiti UX di `design/ux/hud.md`, `design/ux/intro.md`, `design/accessibility-requirements.md`.
