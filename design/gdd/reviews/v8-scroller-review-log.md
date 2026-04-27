# V8 Scroller — Review Log

## Review — 2026-04-23 — Verdict: APPROVED
Scope signal: XL
Specialists: none (lean mode — system already shipped in v7.12.4)
Blocking items: 0 | Recommended: 3
Summary: Reverse-documented from code. Completeness 8/8. Formulas verifiable via file:line citations. Three real code/config drifts surfaced as recommended cleanups: (1) `HOVER_GATE.EASE_IN_MS` declared but unused in Enemy.js, (2) `TIER_TARGETS_BY_LEVEL` lives inside LevelScript.js instead of BalanceConfig (violates "Balance Config is Law"), (3) CRUSH_EXIT anchor never fires when boss is killed mid-CRUSH — works in practice but state machine is fragile. Plus 4 nice-to-haves (LUT-not-per-level, magic cull padding, scheduleLevelEnd asymmetry, brittle H.16 AC).
Prior verdict resolved: First review

## Review — 2026-04-27 — Verdict: NEEDS REVISION → APPROVED (revised)
Scope signal: XL
Specialists: game-designer, systems-designer, level-designer, ai-programmer, qa-lead, creative-director
Blocking items: 4 resolved | Recommended: 2 added
Summary: Re-review in full depth. Verdict changed from APPROVED to NEEDS REVISION after discovering: (1) Gravity Gate not implemented in code and contradicting Player Fantasy — removed from GDD, (2) SWOOP amplitude (140px) exceeds screen bounds causing 2.4s clamp artifact — documented as Gap #5, (3) no top-side cull for HOVER LEAVE enemies causing zombie accumulation — documented as Gap #6, (4) LUT 180→40 deceleration inverts apparent enemy motion undocumented — documented as Gap #7. Added Recommended Improvements section: per-level scroll profiles and CRUSH-specific enemy variant. Gravity Gate section (C.7), HOVER_GATE tuning (G.5), 3 ACs (H.10-H.12), and E.10 removed from GDD. Verdict upgraded to APPROVED after revisions.
Prior verdict resolved: Yes — 4 blocking items from full review addressed
