# ADR-0023: Bullet & Combat Subsystems

## Status
Accepted

## Date
2026-05-29

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Vanilla JavaScript (Canvas 2D) |
| **Domain** | Gameplay / Combat |
| **Knowledge Risk** | MEDIUM — bullet patterns e hit detection sono core combat, alta densità di edge cases |
| **References Consulted** | `src/systems/BulletSystem.js`, `src/systems/BulletPatterns.js`, `design/gdd/weapon-elementals-godchain.md` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | Automated: `tests/test-collision.js`, `tests/test-boss.js`. Manual: boss pattern recognition. |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0004 (Spatial Grid Collision), ADR-0010 (Weapon/GODCHAIN/HYPER) |
| **Enables** | Tutto il combat loop (player shooting, enemy fire, boss patterns) |
| **Blocks** | None |
| **Ordering Note** | BulletSystem è inizializzato dopo Player e Entities |

## Context

Il combat loop gestisce:
- **Player bullets**: sparate da `Player.js`, governate da `Balance.WEAPON` config (cooldown, geometry, evolution).
- **Enemy bullets**: ogni nemico spara il proprio currency glyph (es. € spara €). Patterns: DIVE, SINE, SWOOP, HOVER.
- **Boss bullets**: 14 pattern distinti tra 3 boss × 3 fasi.
- **Collision**: Spatial Grid + AABB per bullet-vs-entity. Bullet cancella su hit (tranne PIERCE).
- **Rank/Score**: `RankSystem.js` traccia streak, graze, combo multiplier.

## Decision

**DECISION**: Separazione netta tra BulletSystem (update + culling), BulletPatterns (generazione geometria), e RankSystem (scoring/combat metrics).

- `BulletSystem.js`: mantiene array `bullets` e `enemyBullets`. Ogni frame: update posizione, cull off-screen, delegate collision a `CollisionSystem`.
- `BulletPatterns.js`: factory functions per pattern enemy. Ritorna array di `{vx, vy, angle, symbol}`. Separato da `BulletSystem` perché la generazione è stateless ma la culling è stateful.
- `RankSystem.js`: read-only observer del combat. Non modifica bullets/enemies. Aggiorna score multiplier, graze count, streak timer.
- GLOBAL_BULLET_CAP = 150 (da `BalanceConfig`). Enemy bullets hanno priorità su player bullets per culling se il cap è superato (gameplay: evitare bullet hell impossibile).

## Consequences

- **Positivo**: Ogni layer ha una sola responsabilità. Testabili separatamente.
- **Negativo**: 3 moduli per un singolo concetto ("proiettili") aumentano il cognitive load. Il passaggio dati tra `BulletPatterns` → `Enemy.js` → `BulletSystem` è un chain di 3 file.
- **Trade-off**: Currency-symbol bullets (ogni nemico spara il proprio simbolo) richiedono che `Enemy.js` passi il simbolo a `BulletSystem.fire()`. Questo accoppiamento è accettabile perché il simbolo è identità del nemico.

## File References

| File | Ruolo |
|------|-------|
| `src/systems/BulletSystem.js` | Update, culling, fire API |
| `src/systems/BulletPatterns.js` | Pattern geometry factory |
| `src/systems/RankSystem.js` | Score multiplier, streak, graze |
| `src/entities/Bullet.js` | Entity base per proiettili |
| `src/systems/CollisionSystem.js` | Hit detection (consumato da BulletSystem) |

## Traceability

- Copre TR-WEP-002 (per-level firing geometry), TR-EA-003 (currency-symbol bullets), TR-BS-005 (14 attack patterns), TR-ARC-004 (combo system).
