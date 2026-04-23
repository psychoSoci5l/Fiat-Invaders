# V8 Scroller — Review Log

## Review — 2026-04-23 — Verdict: APPROVED
Scope signal: XL
Specialists: none (lean mode — system already shipped in v7.12.4)
Blocking items: 0 | Recommended: 3
Summary: Reverse-documented from code. Completeness 8/8. Formulas verifiable via file:line citations. Three real code/config drifts surfaced as recommended cleanups: (1) `HOVER_GATE.EASE_IN_MS` declared but unused in Enemy.js, (2) `TIER_TARGETS_BY_LEVEL` lives inside LevelScript.js instead of BalanceConfig (violates "Balance Config is Law"), (3) CRUSH_EXIT anchor never fires when boss is killed mid-CRUSH — works in practice but state machine is fragile. Plus 4 nice-to-haves (LUT-not-per-level, magic cull padding, scheduleLevelEnd asymmetry, brittle H.16 AC).
Prior verdict resolved: First review
