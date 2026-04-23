# Drop System + APC — Review Log

## Review — 2026-04-23 — Verdict: APPROVED
Scope signal: M
Specialists: none (lean mode — single sonnet Explore agent for research)
Blocking items: 0 | Recommended: 8
Summary: Reverse-documented from code. Completeness 7/7 (Overview, Fantasy, Rules, Balance ref, Kill-switches, Open questions, Related). Surfaced 8 drifts/risks: (1) 3 coexisting power-score formulas — APC 0.50/0.30/0.20, ADAPTIVE_DROPS 0.65/0.35, Balancer 0.50/0.25/0.25 — no single source of truth; (2) legacy `DROPS.PITY_TIMER_KILLS:45` is dead config (runtime uses `DROP_SCALING.PITY_BASE:30`); (3) `CATEGORY_WEIGHTS.UPGRADE:1.5` unreachable post-v5.11; (4) CLAUDE.md tier terminology wrong ("SMALL/MEDIUM/STRONG" → actual is STRONG/MEDIUM/WEAK); (5) CLAUDE.md "pity 30" missing cycle-reduction context (C1=30/C2=28/C3=26, floor 15); (6) CLAUDE.md missing post-death 60s grace, Arcade 0.85×, guaranteed SPECIAL wave 4+, APC C2+ only, HP_RANGE 0.85-1.35×; (7) APC never calibrates C1 (intentional, worth playtest note); (8) anti-cluster 6s hardcoded at DropSystem.js:562 instead of config. CLAUDE.md drift #4/#5/#6 fixed in same commit.
Prior verdict resolved: First review
