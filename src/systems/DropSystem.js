/**
 * DropSystem.js - Unified Power-Up Drop Management
 *
 * WEAPON EVOLUTION v3.0 UPDATE:
 * - UPGRADE drops (guaranteed every N kills, increases shot level)
 * - MODIFIER drops (RATE/POWER/SPREAD - stackable, temporary)
 * - SPECIAL drops (HOMING/PIERCE/LASER/MISSILE/SHIELD/SPEED - exclusive, temporary)
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

            // WEAPON EVOLUTION v3.0 tracking
            this.totalKills = 0;           // Total kills for UPGRADE pity timer
            this.lastUpgradeKillCount = 0; // Last kill count when UPGRADE was given

            // v4.17: Boss drop cap tracking
            this.bossDropCount = 0;        // Drops generated in current boss fight
        }

        /**
         * Reset drop system state (call on game start)
         */
        reset() {
            this.lastWeaponDropTime = 0;
            this.killsSinceLastDrop = 0;
            this.bossHitCount = 0;
            this.bossDropCooldown = 0;

            // WEAPON EVOLUTION v3.0 reset
            this.totalKills = 0;
            this.lastUpgradeKillCount = 0;

            // v4.17: Boss drop cap reset
            this.bossDropCount = 0;
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
            // Fallback to basic weapons
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
         * @param {number} totalTime - Current game time
         * @param {Function} getUnlockedWeapons - Function to get unlocked weapons
         * @returns {Object} { type: string, isWeapon: boolean } or null if no drop
         */
        selectDropType(totalTime, getUnlockedWeapons) {
            const Balance = G.Balance;
            const weaponTypes = this.getWeaponTypes(getUnlockedWeapons);
            const shipTypes = this.getShipTypes();

            const timeSinceWeaponDrop = totalTime - this.lastWeaponDropTime;
            const canDropWeapon = timeSinceWeaponDrop >= Balance.DROPS.WEAPON_COOLDOWN;

            // Decide weapon vs ship based on configured ratio
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

        // === WEAPON EVOLUTION v3.0 DROP SELECTION ===

        /**
         * Select drop type using WEAPON EVOLUTION v3.0 system
         * @param {number} currentShotLevel - Player's current shot level (1-3)
         * @returns {Object} { type: string, category: string }
         */
        selectEvolutionDropType(currentShotLevel) {
            const WE = G.Balance.WEAPON_EVOLUTION;
            if (!WE) {
                // Fallback to legacy - pick a random modifier/special
                const fallbackTypes = ['RATE', 'POWER', 'SPREAD', 'HOMING', 'PIERCE', 'SPEED'];
                const type = fallbackTypes[Math.floor(Math.random() * fallbackTypes.length)];
                return { type, category: 'modifier' };
            }

            // Check for guaranteed UPGRADE (pity timer)
            const killsSinceUpgrade = this.totalKills - this.lastUpgradeKillCount;
            if (killsSinceUpgrade >= WE.KILLS_FOR_UPGRADE && currentShotLevel < WE.MAX_SHOT_LEVEL) {
                this.lastUpgradeKillCount = this.totalKills;
                return { type: 'UPGRADE', category: 'upgrade' };
            }

            // Random drop: 60% modifier, 40% special
            const roll = Math.random();
            if (roll < 0.6) {
                // Modifier (equal weight among RATE, POWER, SPREAD)
                const modifiers = ['RATE', 'POWER', 'SPREAD'];
                const type = modifiers[Math.floor(Math.random() * modifiers.length)];
                return { type, category: 'modifier' };
            } else {
                // Special (weighted selection)
                const type = this.getWeightedSpecial(WE);
                return { type, category: 'special' };
            }
        }

        /**
         * Select a special type using weighted random selection
         * @param {Object} WE - WEAPON_EVOLUTION config
         * @returns {string} Special type name
         */
        getWeightedSpecial(WE) {
            const weights = WE.SPECIAL_WEIGHTS || {
                HOMING: 20,
                PIERCE: 20,
                SPEED: 20,
                MISSILE: 15,
                LASER: 15,
                SHIELD: 10
            };

            // Calculate total weight
            const types = Object.keys(weights);
            const totalWeight = types.reduce((sum, t) => sum + weights[t], 0);

            // Weighted random selection
            let roll = Math.random() * totalWeight;
            for (const type of types) {
                roll -= weights[type];
                if (roll <= 0) {
                    return type;
                }
            }

            // Fallback
            return 'HOMING';
        }

        /**
         * Check if we should force an UPGRADE drop (for pity timer)
         * @param {number} currentShotLevel - Player's current shot level
         * @returns {boolean}
         */
        shouldForceUpgrade(currentShotLevel) {
            const WE = G.Balance.WEAPON_EVOLUTION;
            if (!WE || currentShotLevel >= WE.MAX_SHOT_LEVEL) return false;

            const killsSinceUpgrade = this.totalKills - this.lastUpgradeKillCount;
            return killsSinceUpgrade >= WE.KILLS_FOR_UPGRADE;
        }

        /**
         * Check if enemy death should trigger a drop
         * Supports both legacy and WEAPON EVOLUTION v3.0 systems
         * @param {string} enemySymbol - Currency symbol of killed enemy
         * @param {number} enemyX - Enemy X position
         * @param {number} enemyY - Enemy Y position
         * @param {number} totalTime - Current game time
         * @param {Function|number} getUnlockedWeaponsOrShotLevel - Function for legacy, or shot level for evolution
         * @param {boolean} useEvolution - If true, use WEAPON EVOLUTION v3.0 system
         * @returns {Object|null} Drop info { type, category, x, y } or null
         */
        tryEnemyDrop(enemySymbol, enemyX, enemyY, totalTime, getUnlockedWeaponsOrShotLevel, useEvolution = false) {
            const Balance = G.Balance;
            const cycle = window.marketCycle || 1;

            this.killsSinceLastDrop++;
            this.totalKills++;

            // Base drop chance from enemy tier
            let dropChance = Balance.getDropChance(enemySymbol);

            // Cycle bonus: +1% per cycle to help with increasing difficulty
            if (Balance.DROP_SCALING) {
                dropChance += (cycle - 1) * Balance.DROP_SCALING.CYCLE_BONUS;
            }

            // Pity timer: decreases with cycle (more forgiving at higher difficulty)
            let pityThreshold = Balance.DROPS.PITY_TIMER_KILLS;
            if (Balance.DROP_SCALING) {
                pityThreshold = Math.max(15, Balance.DROP_SCALING.PITY_BASE - (cycle - 1) * Balance.DROP_SCALING.PITY_REDUCTION);
            }
            const pityDrop = this.killsSinceLastDrop >= pityThreshold;

            // === WEAPON EVOLUTION v3.0 ===
            if (useEvolution && Balance.WEAPON_EVOLUTION) {
                const currentShotLevel = typeof getUnlockedWeaponsOrShotLevel === 'number'
                    ? getUnlockedWeaponsOrShotLevel
                    : 1;

                // Check for forced UPGRADE (pity timer for shot level)
                if (this.shouldForceUpgrade(currentShotLevel)) {
                    this.killsSinceLastDrop = 0;
                    this.lastUpgradeKillCount = this.totalKills;
                    return {
                        type: 'UPGRADE',
                        category: 'upgrade',
                        x: enemyX,
                        y: enemyY
                    };
                }

                // Normal drop chance check
                if (pityDrop || Math.random() < dropChance) {
                    const dropInfo = this.selectEvolutionDropType(currentShotLevel);
                    if (dropInfo) {
                        this.killsSinceLastDrop = 0;
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
                const dropInfo = this.selectDropType(totalTime, getUnlockedWeaponsOrShotLevel);
                if (dropInfo) {
                    this.killsSinceLastDrop = 0;
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
         * Supports both legacy and WEAPON EVOLUTION v3.0 systems
         * @param {number} bossX - Boss X position
         * @param {number} bossY - Boss Y position
         * @param {number} totalTime - Current game time
         * @param {Function|number} getUnlockedWeaponsOrShotLevel - Function for legacy, or shot level for evolution
         * @param {boolean} useEvolution - If true, use WEAPON EVOLUTION v3.0 system
         * @returns {Object|null} Drop info { type, category, x, y } or null
         */
        tryBossDrop(bossX, bossY, totalTime, getUnlockedWeaponsOrShotLevel, useEvolution = false) {
            const Balance = G.Balance;

            this.bossHitCount++;

            // v4.17: Enforce max drops per boss fight
            const maxDrops = Balance.BOSS.MAX_DROPS_PER_BOSS || 6;
            if (this.bossDropCount >= maxDrops) return null;

            if (this.bossHitCount >= Balance.BOSS.DROP_INTERVAL && this.bossDropCooldown <= 0) {
                this.bossHitCount = 0;
                this.bossDropCooldown = Balance.DROPS.BOSS_DROP_COOLDOWN;

                let dropInfo;

                // === WEAPON EVOLUTION v3.0 ===
                if (useEvolution && Balance.WEAPON_EVOLUTION) {
                    const currentShotLevel = typeof getUnlockedWeaponsOrShotLevel === 'number'
                        ? getUnlockedWeaponsOrShotLevel
                        : 1;
                    dropInfo = this.selectEvolutionDropType(currentShotLevel);
                } else {
                    // Legacy system
                    dropInfo = this.selectDropType(totalTime, getUnlockedWeaponsOrShotLevel);
                }

                if (dropInfo) {
                    this.bossDropCount++; // v4.17: Track drops for cap
                    // Randomize position around boss
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
            this.bossDropCount = 0; // v4.17: Reset drop cap counter
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
