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

## Weapon Evolution (v4.47)
- Linear 5-level system (weaponLevel 1-7 in config, 5 base + 2 HYPER temp)
- 3 specials: HOMING, PIERCE, MISSILE (12s duration)
- 2 utilities: SHIELD (instant), SPEED (+50%, 12s)
- Death penalty: -1 weapon level, lose special
- HYPER mode: +2 temp levels, activated via DIP meter

## Proximity Kill (DIP Meter, v4.38)
- Vertical-distance kills fill meter (replaces graze as HYPER source)
- Boss hits +0.4, phase transitions +15
- API: Game.addProximityMeter(gain)

## Perk System
- Bullet cancel 5 enemy bullets in 1.5s triggers random perk
- Cooldown: 4s between perk awards
- Weighted random with pity counter (rare guaranteed after 2 common)

## Mini-Boss (Arcade only)
- Kill threshold per fiat currency triggers mini-boss spawn
- Boss-type mini-boss (60% HP of full boss) or legacy fiat giant
- Cooldown and max-per-wave limits in Balance.MINI_BOSS

## Boss System
- 3 bosses: FEDERAL_RESERVE, BCE, BOJ
- 3 phases each, HP formula in Balance.calculateBossHP()
- Rotation: marketCycle % 3

## Known Tuning Points
- All values in BalanceConfig.js — NEVER hardcode in entity files
- Test with `dbg.balanceTest()` after any tuning changes
