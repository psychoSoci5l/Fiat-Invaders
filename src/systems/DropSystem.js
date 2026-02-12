/**
 * DropSystem.js - Unified Power-Up Drop Management
 *
 * WEAPON EVOLUTION v4.47 REDESIGN:
 * - UPGRADE drops (guaranteed every N kills, increases weapon level 1→5)
 * - SPECIAL drops (HOMING/PIERCE/MISSILE - exclusive, temporary 12s)
 * - UTILITY drops (SHIELD/SPEED - non-weapon, separate visual)
 *
 * Legacy system maintained for backward compatibility.
 *
 * Uses Balance config for all tuning values.
 */

(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    class DropSystem {
        constructor() {
            this.lastWeaponDropTime = 0;
            this.killsSinceLastDrop = 0;
            this.bossHitCount = 0;
            this.bossDropCooldown = 0;

            // WEAPON EVOLUTION tracking
            this.totalKills = 0;
            this.lastUpgradeKillCount = 0;

            // Boss drop cap tracking
            this.bossDropCount = 0;
            this.bossFightStartTime = 0;

            // Adaptive drop suppression tracking
            this.suppressedDrops = 0;

            // Anti-cluster — minimum time between drops + no consecutive duplicates
            this.lastEnemyDropTime = 0;
            this.lastDropType = null;
        }

        /**
         * Reset drop system state (call on game start)
         */
        reset() {
            this.lastWeaponDropTime = 0;
            this.killsSinceLastDrop = 0;
            this.bossHitCount = 0;
            this.bossDropCooldown = 0;

            this.totalKills = 0;
            this.lastUpgradeKillCount = 0;

            this.bossDropCount = 0;

            this.suppressedDrops = 0;

            this.lastEnemyDropTime = 0;
            this.lastDropType = null;
        }

        /**
         * Update cooldowns (call each frame)
         * @param {number} dt - Delta time in seconds
         */
        update(dt) {
            if (this.bossDropCooldown > 0) {
                this.bossDropCooldown -= dt;
            }
        }

        /**
         * Get available weapon types based on progression
         * @param {Function} getUnlockedWeapons - Function that returns unlocked weapon array
         * @returns {string[]} Array of weapon type strings
         */
        getWeaponTypes(getUnlockedWeapons) {
            if (typeof getUnlockedWeapons === 'function') {
                return getUnlockedWeapons();
            }
            return ['WIDE', 'NARROW', 'FIRE'];
        }

        /**
         * Get available ship power-up types
         * @returns {string[]} Array of ship power-up type strings
         */
        getShipTypes() {
            return G.Balance.DROPS.SHIP_TYPES;
        }

        /**
         * Select drop type (weapon or ship) - LEGACY SYSTEM
         */
        selectDropType(totalTime, getUnlockedWeapons) {
            const Balance = G.Balance;
            const weaponTypes = this.getWeaponTypes(getUnlockedWeapons);
            const shipTypes = this.getShipTypes();

            const timeSinceWeaponDrop = totalTime - this.lastWeaponDropTime;
            const canDropWeapon = timeSinceWeaponDrop >= Balance.DROPS.WEAPON_COOLDOWN;

            const wantsWeapon = Math.random() < Balance.DROPS.WEAPON_RATIO;

            if (wantsWeapon && canDropWeapon && weaponTypes.length > 0) {
                const type = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
                this.lastWeaponDropTime = totalTime;
                return { type, isWeapon: true };
            } else if (shipTypes.length > 0) {
                const type = shipTypes[Math.floor(Math.random() * shipTypes.length)];
                return { type, isWeapon: false };
            }

            return null;
        }

        // === WEAPON EVOLUTION v4.47 DROP SELECTION ===

        /**
         * Select drop type: UPGRADE, SPECIAL, or UTILITY
         * @param {Object|number} playerStateOrWeaponLevel - Player state or weapon level
         * @returns {Object} { type: string, category: string }
         */
        selectEvolutionDropType(playerStateOrWeaponLevel) {
            const WE = G.Balance.WEAPON_EVOLUTION;
            if (!WE) {
                const fallbackTypes = ['HOMING', 'PIERCE', 'MISSILE'];
                const type = fallbackTypes[Math.floor(Math.random() * fallbackTypes.length)];
                return { type, category: 'special' };
            }

            // Backward compat — wrap number in minimal playerState
            let playerState;
            let currentWeaponLevel;
            if (typeof playerStateOrWeaponLevel === 'number') {
                currentWeaponLevel = playerStateOrWeaponLevel;
                playerState = null;
            } else {
                playerState = playerStateOrWeaponLevel;
                currentWeaponLevel = playerState.weaponLevel;
            }

            // Check for guaranteed UPGRADE (pity timer) — also works at max level for GODCHAIN recharge
            const killsSinceUpgrade = this.totalKills - this.lastUpgradeKillCount;
            if (killsSinceUpgrade >= WE.KILLS_FOR_UPGRADE) {
                this.lastUpgradeKillCount = this.totalKills;
                return { type: 'UPGRADE', category: 'upgrade' };
            }

            // Need-based category selection when adaptive drops enabled
            const AD = G.Balance.ADAPTIVE_DROPS;
            if (AD && AD.ENABLED && playerState) {
                const category = this.selectNeedBasedCategory(playerState);

                if (category === 'upgrade') {
                    // v4.48: At max level, UPGRADE still drops → Player.js sets _godchainPending = true
                    this.lastUpgradeKillCount = this.totalKills;
                    return { type: 'UPGRADE', category: 'upgrade' };
                } else if (category === 'special') {
                    const type = this.getWeightedSpecial(WE);
                    return { type, category: 'special' };
                } else {
                    // utility
                    const utilities = ['SHIELD', 'SPEED'];
                    const type = utilities[Math.floor(Math.random() * utilities.length)];
                    return { type, category: 'utility' };
                }
            }

            // Legacy fixed split (when adaptive is off or no playerState)
            const roll = Math.random();
            if (roll < 0.5) {
                // 50% chance: UPGRADE if not maxed, else special
                if (currentWeaponLevel < (WE.MAX_WEAPON_LEVEL || 5)) {
                    return { type: 'UPGRADE', category: 'upgrade' };
                }
                const type = this.getWeightedSpecial(WE);
                return { type, category: 'special' };
            } else if (roll < 0.8) {
                // 30% chance: special
                const type = this.getWeightedSpecial(WE);
                return { type, category: 'special' };
            } else {
                // 20% chance: utility
                const utilities = ['SHIELD', 'SPEED'];
                const type = utilities[Math.floor(Math.random() * utilities.length)];
                return { type, category: 'utility' };
            }
        }

        /**
         * Select a special type using weighted random selection
         * @param {Object} WE - WEAPON_EVOLUTION config
         * @returns {string} Special type name
         */
        getWeightedSpecial(WE) {
            const weights = WE.SPECIAL_WEIGHTS || {
                HOMING: 25,
                PIERCE: 25,
                MISSILE: 20
            };

            const types = Object.keys(weights);
            const totalWeight = types.reduce((sum, t) => sum + weights[t], 0);

            let roll = Math.random() * totalWeight;
            for (const type of types) {
                roll -= weights[type];
                if (roll <= 0) {
                    return type;
                }
            }

            return 'HOMING';
        }

        /**
         * Check if we should force an UPGRADE drop (for pity timer)
         * @param {number} currentWeaponLevel - Player's current weapon level
         * @returns {boolean}
         */
        shouldForceUpgrade(currentWeaponLevel) {
            const WE = G.Balance.WEAPON_EVOLUTION;
            if (!WE || currentWeaponLevel >= WE.MAX_WEAPON_LEVEL) return false;

            const killsSinceUpgrade = this.totalKills - this.lastUpgradeKillCount;
            return killsSinceUpgrade >= WE.KILLS_FOR_UPGRADE;
        }

        // === ADAPTIVE DROPS v4.47 ===

        /**
         * Calculate player power score (0.0 → 1.0)
         * v4.47: Simplified 2-axis (weapon level + special)
         * @param {Object} playerState - { weaponLevel, hasSpecial }
         * @returns {number} Power score from 0.0 to 1.0
         */
        getPlayerPowerScore(playerState) {
            const AD = G.Balance.ADAPTIVE_DROPS;
            if (!AD) return 0;

            const weaponScore = (playerState.weaponLevel - 1) / 4; // 0.0 at LV1, 1.0 at LV5
            const specialScore = playerState.hasSpecial ? 1.0 : 0.0;

            return AD.WEAPON_WEIGHT * weaponScore
                 + AD.SPECIAL_WEIGHT * specialScore;
        }

        /**
         * Decide if a successful drop roll should be suppressed
         */
        shouldSuppressDrop(playerState, isPityDrop) {
            const AD = G.Balance.ADAPTIVE_DROPS;
            if (!AD || !AD.ENABLED) return false;
            if (isPityDrop) return false;

            // v4.59: APC — weak players bypass suppression entirely
            const APC = G.Balance.ADAPTIVE_POWER;
            if (APC && APC.ENABLED && G.RunState && G.RunState.cyclePower.score < APC.WEAK_THRESHOLD) return false;

            const powerScore = this.getPlayerPowerScore(playerState);
            if (powerScore < AD.SUPPRESSION_FLOOR) return false;

            // v4.59: Strong APC players have lower suppression floor
            const floor = (APC && APC.ENABLED && G.RunState && G.RunState.cyclePower.score > APC.STRONG_THRESHOLD)
                ? 0.35 : AD.SUPPRESSION_FLOOR;
            if (powerScore < floor) return false;

            return Math.random() < powerScore;
        }

        /**
         * Select drop category based on player need
         * v4.47: 3 categories — upgrade, special, utility
         * @param {Object} playerState - Player state object
         * @returns {string} 'upgrade', 'special', or 'utility'
         */
        selectNeedBasedCategory(playerState) {
            const AD = G.Balance.ADAPTIVE_DROPS;
            const CW = AD.CATEGORY_WEIGHTS;
            const MIN = AD.MIN_CATEGORY_WEIGHT;

            // v4.48: Need scores responsive to full player state
            const maxWpn = G.Balance.WEAPON_EVOLUTION.MAX_WEAPON_LEVEL;
            const upgradeNeed = playerState.weaponLevel >= maxWpn
                ? (AD.GODCHAIN_RECHARGE_NEED || 0.35)
                : (maxWpn - playerState.weaponLevel) / (maxWpn - 1);
            const specialNeed = playerState.hasSpecial ? 0.1 : 0.7;
            const utilityNeed = (playerState.hasShield || playerState.hasSpeed) ? 0.2 : 0.5;

            // Weighted needs
            const wUpgrade = Math.max(MIN, upgradeNeed * CW.UPGRADE);
            const wSpecial = Math.max(MIN, specialNeed * CW.SPECIAL);
            const wUtility = Math.max(MIN, utilityNeed * CW.UTILITY);
            const totalWeight = wUpgrade + wSpecial + wUtility;

            // Weighted random selection
            const roll = Math.random() * totalWeight;
            if (roll < wUpgrade) return 'upgrade';
            if (roll < wUpgrade + wSpecial) return 'special';
            return 'utility';
        }

        /**
         * Check if enemy death should trigger a drop
         * @param {string} enemySymbol - Currency symbol of killed enemy
         * @param {number} enemyX - Enemy X position
         * @param {number} enemyY - Enemy Y position
         * @param {number} totalTime - Current game time
         * @param {Function|Object|number} getUnlockedWeaponsOrState - Function for legacy, object/number for evolution
         * @param {boolean} useEvolution - If true, use WEAPON EVOLUTION system
         * @returns {Object|null} Drop info { type, category, x, y } or null
         */
        tryEnemyDrop(enemySymbol, enemyX, enemyY, totalTime, getUnlockedWeaponsOrState, useEvolution = false) {
            const Balance = G.Balance;
            const cycle = window.marketCycle || 1;

            this.killsSinceLastDrop++;
            this.totalKills++;

            // Anti-cluster — enforce minimum 6s between enemy drops (pity bypasses)
            const MIN_DROP_INTERVAL = 6.0;
            const timeSinceLastDrop = totalTime - this.lastEnemyDropTime;

            // Base drop chance from enemy tier
            let dropChance = Balance.getDropChance(enemySymbol);

            // Cycle bonus
            if (Balance.DROP_SCALING) {
                dropChance += (cycle - 1) * Balance.DROP_SCALING.CYCLE_BONUS;
            }

            // Pity timer (+ APC adjustment v4.59)
            let pityThreshold = Balance.DROPS.PITY_TIMER_KILLS;
            if (Balance.DROP_SCALING) {
                pityThreshold = Math.max(15, Balance.DROP_SCALING.PITY_BASE - (cycle - 1) * Balance.DROP_SCALING.PITY_REDUCTION);
            }
            const apcAdj = (G.RunState && G.RunState.cyclePower) ? G.RunState.cyclePower.pityAdj : 0;
            if (apcAdj) pityThreshold = Math.max(10, pityThreshold + apcAdj);
            const pityDrop = this.killsSinceLastDrop >= pityThreshold;

            // === WEAPON EVOLUTION ===
            if (useEvolution && Balance.WEAPON_EVOLUTION) {
                let playerState = null;
                let currentWeaponLevel;
                if (typeof getUnlockedWeaponsOrState === 'object' && getUnlockedWeaponsOrState !== null) {
                    playerState = getUnlockedWeaponsOrState;
                    currentWeaponLevel = playerState.weaponLevel;
                } else {
                    currentWeaponLevel = typeof getUnlockedWeaponsOrState === 'number'
                        ? getUnlockedWeaponsOrState
                        : 1;
                }

                // Check for forced UPGRADE (pity timer for weapon level)
                if (this.shouldForceUpgrade(currentWeaponLevel)) {
                    this.killsSinceLastDrop = 0;
                    this.lastUpgradeKillCount = this.totalKills;
                    this.lastEnemyDropTime = totalTime;
                    this.lastDropType = 'UPGRADE';
                    return {
                        type: 'UPGRADE',
                        category: 'upgrade',
                        x: enemyX,
                        y: enemyY
                    };
                }

                // Normal drop chance check
                if (pityDrop || Math.random() < dropChance) {
                    // Anti-cluster — skip non-pity drops if too soon after last drop
                    if (!pityDrop && timeSinceLastDrop < MIN_DROP_INTERVAL) {
                        return null;
                    }

                    let dropInfo = this.selectEvolutionDropType(playerState || currentWeaponLevel);
                    // Anti-duplicate — if same type as last drop, reroll once
                    if (dropInfo && dropInfo.type === this.lastDropType) {
                        dropInfo = this.selectEvolutionDropType(playerState || currentWeaponLevel);
                    }

                    // v4.48: Suppression AFTER selection — never suppress UPGRADE (GODCHAIN needs it)
                    if (dropInfo && dropInfo.category !== 'upgrade' && playerState && this.shouldSuppressDrop(playerState, pityDrop)) {
                        this.suppressedDrops++;
                        if (G.Debug && G.Debug.trackDropSuppressed) {
                            G.Debug.trackDropSuppressed(playerState);
                        }
                        return null;
                    }

                    if (dropInfo) {
                        this.killsSinceLastDrop = 0;
                        this.lastEnemyDropTime = totalTime;
                        this.lastDropType = dropInfo.type;
                        return {
                            ...dropInfo,
                            x: enemyX,
                            y: enemyY
                        };
                    }
                }

                return null;
            }

            // === LEGACY SYSTEM ===
            if (pityDrop || Math.random() < dropChance) {
                if (!pityDrop && timeSinceLastDrop < MIN_DROP_INTERVAL) return null;
                const dropInfo = this.selectDropType(totalTime, getUnlockedWeaponsOrState);
                if (dropInfo) {
                    this.killsSinceLastDrop = 0;
                    this.lastEnemyDropTime = totalTime;
                    this.lastDropType = dropInfo.type;
                    return {
                        ...dropInfo,
                        x: enemyX,
                        y: enemyY
                    };
                }
            }

            return null;
        }

        /**
         * Check if boss hit should trigger a drop
         */
        tryBossDrop(bossX, bossY, totalTime, getUnlockedWeaponsOrState, useEvolution = false) {
            const Balance = G.Balance;

            this.bossHitCount++;

            if (this.bossFightStartTime === 0) {
                this.bossFightStartTime = totalTime;
            }

            const timeInterval = Balance.BOSS.DROP_TIME_INTERVAL || 12;
            const fightDuration = totalTime - this.bossFightStartTime;
            const maxDrops = Math.max(1, Math.floor(fightDuration / timeInterval) + 1);
            if (this.bossDropCount >= maxDrops) return null;

            if (this.bossHitCount >= Balance.BOSS.DROP_INTERVAL && this.bossDropCooldown <= 0) {
                this.bossHitCount = 0;
                this.bossDropCooldown = Balance.DROPS.BOSS_DROP_COOLDOWN;

                let dropInfo;

                if (useEvolution && Balance.WEAPON_EVOLUTION) {
                    let playerState = null;
                    let currentWeaponLevel;
                    if (typeof getUnlockedWeaponsOrState === 'object' && getUnlockedWeaponsOrState !== null) {
                        playerState = getUnlockedWeaponsOrState;
                        currentWeaponLevel = playerState.weaponLevel;
                    } else {
                        currentWeaponLevel = typeof getUnlockedWeaponsOrState === 'number'
                            ? getUnlockedWeaponsOrState
                            : 1;
                    }

                    if (playerState && this.shouldSuppressDrop(playerState, false)) {
                        this.suppressedDrops++;
                        if (G.Debug && G.Debug.trackDropSuppressed) {
                            G.Debug.trackDropSuppressed(playerState);
                        }
                        return null;
                    }

                    dropInfo = this.selectEvolutionDropType(playerState || currentWeaponLevel);
                } else {
                    dropInfo = this.selectDropType(totalTime, getUnlockedWeaponsOrState);
                }

                if (dropInfo) {
                    this.bossDropCount++;
                    const offsetX = (Math.random() - 0.5) * 160;
                    return {
                        ...dropInfo,
                        x: bossX + offsetX,
                        y: bossY + 80
                    };
                }
            }

            return null;
        }

        /**
         * Reset boss hit tracking (call when boss is defeated/despawned)
         */
        resetBossDrops() {
            this.bossHitCount = 0;
            this.bossDropCooldown = 0;
            this.bossDropCount = 0;
            this.bossFightStartTime = 0;
        }

        /**
         * Create a PowerUp entity from drop info
         * @param {Object} dropInfo - { type, isWeapon, x, y }
         * @returns {Object} PowerUp instance
         */
        createPowerUp(dropInfo) {
            if (!dropInfo || !G.PowerUp) return null;
            return new G.PowerUp(dropInfo.x, dropInfo.y, dropInfo.type);
        }
    }

    // Create singleton instance
    G.DropSystem = new DropSystem();

    // Also expose the class for testing
    G.DropSystemClass = DropSystem;
})();
