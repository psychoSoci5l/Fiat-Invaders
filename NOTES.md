# Gameplay Tuning Notes

## Core Loop
- Wave cycle: 5 waves per level, then boss, repeat (3 cycles = 15 waves total, legacy fallback cycle 4+)
- Seamless wave transitions (no intermission between waves, only boss-defeat intermission)
- Bear Market: 1.3x difficulty multiplier, +1 enemy fire rate

## Enemy System (v4.40+)
- 10 currencies, 3 tiers (C1/C2/C3), 4 shapes
- Fire budget per tier: C1=25, C2=45, C3=70 bullets/sec
- Level scaling: +8%/level, +20%/cycle, cap 85%
- Dynamic rank: +-1 based on player performance

## Weapon Evolution (v5.0)
- Linear 5-level system (weaponLevel 1-7 in config, 5 base + 2 HYPER temp)
- 3 specials: HOMING, PIERCE, MISSILE (12s duration)
- 2 utilities: SHIELD (absorbs 1 hit), SPEED (+40%, 12s)
- Death penalty: -1 weapon level, lose special/utility
- HYPER mode: +2 temp levels, activated via DIP meter

## Elemental Perk System (v5.0)
- Diamond crystal drops every 50 kills (KILLS_FOR_PERK)
- Fixed order: Fire (splash 30%) → Laser (+25% speed, +1 pierce) → Electric (chain 20%)
- Perk 3 → GODCHAIN activation (10s). Perk 4+ → re-trigger GODCHAIN
- Death resets all perks (perkLevel → 0)

## Proximity Kill (DIP Meter, v4.38)
- Vertical-distance kills fill meter (replaces graze as HYPER source)
- Boss hits +0.4, phase transitions +15
- Meter accumulation blocked during HYPER (resets to 0 on activation)
- API: Game.addProximityMeter(gain)

## Mini-Boss (Arcade only)
- Kill threshold per fiat currency triggers mini-boss spawn
- Boss-type mini-boss (60% HP of full boss) or legacy fiat giant
- Does NOT spawn in Story mode
- Cooldown and max-per-wave limits in Balance.MINI_BOSS

## Boss System
- 3 bosses: FEDERAL_RESERVE, BCE, BOJ
- 3 phases each, HP formula in Balance.calculateBossHP()
- Rotation: marketCycle % 3
- Adaptive Power Calibration: enemy HP 0.85-1.35x at cycle transitions (C2+)

## Known Tuning Points
- All values in BalanceConfig.js — NEVER hardcode in entity files
- Test with `dbg.balanceTest()` after any tuning changes
