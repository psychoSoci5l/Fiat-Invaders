# Enemy Agents — Review Log

## Review — 2026-04-23 — Verdict: APPROVED
Scope signal: L
Specialists: none (lean mode — system shipped in v7.9+)
Blocking items: 0 | Recommended: 4 (3 risolte in v7.12.7)
Summary: Reverse-documented le 4 subsystem coupled (Procedural Agents + Gravity Gate + Currency-Symbol Bullets + Elite Variants/Behaviors) in un unico GDD coerente (883 righe, 15 formule, 24 AC, file:line citations). Drift risolti in v7.12.7: (1) `ENEMY_AGENT.WALK_CYCLE_MS` dead config rimossa; (2) `ELITE_VARIANTS.ARMORED.SPEED_MULT: 0.8` dichiarata ma mai applicata (WaveManager consuma solo HP_MULT+SCORE_MULT) — rimossa + CLAUDE.md corretta ("HP×2 + SCORE×2, no speed reduction"); (3) `BULLET_SYMBOL.TRAIL_ALPHA` letto da Bullet.js con fallback `?? 0.42` ma chiave assente nel config — aggiunta come chiave tunabile. Doc-fix in CLAUDE.md: "Bomber (C2W1+)" → "C2W2+" (config dice `MIN_WAVE.BOMBER = 7`); "1 per cycle" chiarificato a "one elite type per cycle". Drift non risolto (design decision futura): ARMORED speed reduction richiederebbe propagare mult nel grid + V8 patterns — escluso da scope cleanup. Reflector bullet spawn split (Enemy.takeDamage → CollisionSystem) è architectural note, non bug.
Prior verdict resolved: First review
