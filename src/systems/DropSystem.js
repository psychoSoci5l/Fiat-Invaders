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
            this.bossFightStartTime = 0;   // v4.18: Track fight start for dynamic cap

            // v4.19: Adaptive drop suppression tracking
            this.suppressedDrops = 0;

            // v4.40: Anti-cluster — minimum time between drops + no consecutive duplicates
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

            // WEAPON EVOLUTION v3.0 reset
            this.totalKills = 0;
            this.lastUpgradeKillCount = 0;

            // v4.17: Boss drop cap reset
            this.bossDropCount = 0;

            // v4.19: Adaptive drop suppression reset
            this.suppressedDrops = 0;

            // v4.40: Anti-cluster reset
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
         * v4.19: Accepts playerState object or number (backward compat)
         * @param {Object|number} playerStateOrShotLevel - Player state or shot level
         * @returns {Object} { type: string, category: string }
         */
        selectEvolutionDropType(playerStateOrShotLevel) {
            const WE = G.Balance.WEAPON_EVOLUTION;
            if (!WE) {
                const fallbackTypes = ['RATE', 'POWER', 'SPREAD', 'HOMING', 'PIERCE', 'SPEED'];
                const type = fallbackTypes[Math.floor(Math.random() * fallbackTypes.length)];
                return { type, category: 'modifier' };
            }

            // v4.19: Backward compat — wrap number in minimal playerState
            let playerState;
            let currentShotLevel;
            if (typeof playerStateOrShotLevel === 'number') {
                currentShotLevel = playerStateOrShotLevel;
                playerState = null;
            } else {
                playerState = playerStateOrShotLevel;
                currentShotLevel = playerState.shotLevel;
            }

            // Check for guaranteed UPGRADE (pity timer)
            const killsSinceUpgrade = this.totalKills - this.lastUpgradeKillCount;
            if (killsSinceUpgrade >= WE.KILLS_FOR_UPGRADE && currentShotLevel < WE.MAX_SHOT_LEVEL) {
                this.lastUpgradeKillCount = this.totalKills;
                return { type: 'UPGRADE', category: 'upgrade' };
            }

            // v4.19: Need-based category selection when adaptive drops enabled
            const AD = G.Balance.ADAPTIVE_DROPS;
            if (AD && AD.ENABLED && playerState) {
                const category = this.selectNeedBasedCategory(playerState);

                if (category === 'upgrade') {
                    // If player already at max shot level, fall back to modifier
                    if (currentShotLevel >= WE.MAX_SHOT_LEVEL) {
                        const modifiers = ['RATE', 'POWER', 'SPREAD'];
                        const type = modifiers[Math.floor(Math.random() * modifiers.length)];
                        return { type, category: 'modifier' };
                    }
                    this.lastUpgradeKillCount = this.totalKills;
                    return { type: 'UPGRADE', category: 'upgrade' };
                } else if (category === 'modifier') {
                    const modifiers = ['RATE', 'POWER', 'SPREAD'];
                    const type = modifiers[Math.floor(Math.random() * modifiers.length)];
                    return { type, category: 'modifier' };
                } else {
                    const type = this.getWeightedSpecial(WE);
                    return { type, category: 'special' };
                }
            }

            // Legacy fixed 60/40 split (when adaptive is off or no playerState)
            const roll = Math.random();
            if (roll < 0.6) {
                const modifiers = ['RATE', 'POWER', 'SPREAD'];
                const type = modifiers[Math.floor(Math.random() * modifiers.length)];
                return { type, category: 'modifier' };
            } else {
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

        // === ADAPTIVE DROPS v4.19 ===

        /**
         * Calculate player power score (0.0 → 1.0)
         * @param {Object} playerState - { shotLevel, modifiers: { rate, power, spread }, hasSpecial }
         * @returns {number} Power score from 0.0 (unarmed) to 1.0 (fully armed)
         */
        getPlayerPowerScore(playerState) {
            const AD = G.Balance.ADAPTIVE_DROPS;
            if (!AD) return 0;

            const shotScore = (playerState.shotLevel - 1) / 2;
            const modTotal = (playerState.modifiers.rate || 0)
                           + (playerState.modifiers.power || 0)
                           + (playerState.modifiers.spread || 0);
            const modScore = modTotal / 8;
            const specialScore = playerState.hasSpecial ? 1.0 : 0.0;

            return AD.SHOT_WEIGHT * shotScore
                 + AD.MOD_WEIGHT * modScore
                 + AD.SPECIAL_WEIGHT * specialScore;
        }

        /**
         * Decide if a successful drop roll should be suppressed
         * @param {Object} playerState - Player state object
         * @param {boolean} isPityDrop - If true, pity drops bypass suppression
         * @returns {boolean} True if drop should be suppressed
         */
        shouldSuppressDrop(playerState, isPityDrop) {
            const AD = G.Balance.ADAPTIVE_DROPS;
            if (!AD || !AD.ENABLED) return false;
            if (isPityDrop) return false;

            const powerScore = this.getPlayerPowerScore(playerState);
            if (powerScore < AD.SUPPRESSION_FLOOR) return false;

            return Math.random() < powerScore;
        }

        /**
         * Select drop category based on player need (replaces fixed 60/40 split)
         * @param {Object} playerState - Player state object
         * @returns {string} 'upgrade', 'modifier', or 'special'
         */
        selectNeedBasedCategory(playerState) {
            const AD = G.Balance.ADAPTIVE_DROPS;
            const CW = AD.CATEGORY_WEIGHTS;
            const MIN = AD.MIN_CATEGORY_WEIGHT;

            // Calculate need scores (0.0 = no need, 1.0 = maximum need)
            const upgradeNeed = (3 - playerState.shotLevel) / 2;
            const modTotal = (playerState.modifiers.rate || 0)
                           + (playerState.modifiers.power || 0)
                           + (playerState.modifiers.spread || 0);
            const modifierNeed = (8 - modTotal) / 8;
            const specialNeed = playerState.hasSpecial ? 0.0 : 1.0;

            // Weighted needs
            const wUpgrade = Math.max(MIN, upgradeNeed * CW.UPGRADE);
            const wModifier = Math.max(MIN, modifierNeed * CW.MODIFIER);
            const wSpecial = Math.max(MIN, specialNeed * CW.SPECIAL);
            const totalWeight = wUpgrade + wModifier + wSpecial;

            // Weighted random selection
            const roll = Math.random() * totalWeight;
            if (roll < wUpgrade) return 'upgrade';
            if (roll < wUpgrade + wModifier) return 'modifier';
            return 'special';
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

            // v4.40: Anti-cluster — enforce minimum 3s between enemy drops (pity bypasses)
            const MIN_DROP_INTERVAL = 3.0;
            const timeSinceLastDrop = totalTime - this.lastEnemyDropTime;

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
                // v4.19: Extract playerState (object or number for backward compat)
                let playerState = null;
                let currentShotLevel;
                if (typeof getUnlockedWeaponsOrShotLevel === 'object' && getUnlockedWeaponsOrShotLevel !== null) {
                    playerState = getUnlockedWeaponsOrShotLevel;
                    currentShotLevel = playerState.shotLevel;
                } else {
                    currentShotLevel = typeof getUnlockedWeaponsOrShotLevel === 'number'
                        ? getUnlockedWeaponsOrShotLevel
                        : 1;
                }

                // Check for forced UPGRADE (pity timer for shot level)
                if (this.shouldForceUpgrade(currentShotLevel)) {
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
                    // v4.40: Anti-cluster — skip non-pity drops if too soon after last drop
                    if (!pityDrop && timeSinceLastDrop < MIN_DROP_INTERVAL) {
                        return null;
                    }

                    // v4.19: Adaptive suppression gate
                    if (playerState && this.shouldSuppressDrop(playerState, pityDrop)) {
                        this.suppressedDrops++;
                        // Track suppression in debug
                        if (G.Debug && G.Debug.trackDropSuppressed) {
                            G.Debug.trackDropSuppressed(playerState);
                        }
                        // killsSinceLastDrop NOT reset — pity timer keeps counting
                        return null;
                    }

                    let dropInfo = this.selectEvolutionDropType(playerState || currentShotLevel);
                    // v4.40: Anti-duplicate — if same type as last drop, reroll once
                    if (dropInfo && dropInfo.type === this.lastDropType) {
                        dropInfo = this.selectEvolutionDropType(playerState || currentShotLevel);
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
                // v4.40: Anti-cluster for legacy path
                if (!pityDrop && timeSinceLastDrop < MIN_DROP_INTERVAL) return null;
                const dropInfo = this.selectDropType(totalTime, getUnlockedWeaponsOrShotLevel);
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

            // v4.18: Track fight start time on first hit
            if (this.bossFightStartTime === 0) {
                this.bossFightStartTime = totalTime;
            }

            // v4.18: Dynamic time-based cap (1 drop per DROP_TIME_INTERVAL seconds)
            const timeInterval = Balance.BOSS.DROP_TIME_INTERVAL || 12;
            const fightDuration = totalTime - this.bossFightStartTime;
            const maxDrops = Math.max(1, Math.floor(fightDuration / timeInterval) + 1);
            if (this.bossDropCount >= maxDrops) return null;

            if (this.bossHitCount >= Balance.BOSS.DROP_INTERVAL && this.bossDropCooldown <= 0) {
                this.bossHitCount = 0;
                this.bossDropCooldown = Balance.DROPS.BOSS_DROP_COOLDOWN;

                let dropInfo;

                // === WEAPON EVOLUTION v3.0 ===
                if (useEvolution && Balance.WEAPON_EVOLUTION) {
                    // v4.19: Extract playerState
                    let playerState = null;
                    let currentShotLevel;
                    if (typeof getUnlockedWeaponsOrShotLevel === 'object' && getUnlockedWeaponsOrShotLevel !== null) {
                        playerState = getUnlockedWeaponsOrShotLevel;
                        currentShotLevel = playerState.shotLevel;
                    } else {
                        currentShotLevel = typeof getUnlockedWeaponsOrShotLevel === 'number'
                            ? getUnlockedWeaponsOrShotLevel
                            : 1;
                    }

                    // v4.19: Adaptive suppression gate (boss drops)
                    if (playerState && this.shouldSuppressDrop(playerState, false)) {
                        this.suppressedDrops++;
                        if (G.Debug && G.Debug.trackDropSuppressed) {
                            G.Debug.trackDropSuppressed(playerState);
                        }
                        return null;
                    }

                    dropInfo = this.selectEvolutionDropType(playerState || currentShotLevel);
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
            this.bossDropCount = 0;        // v4.17: Reset drop cap counter
            this.bossFightStartTime = 0;   // v4.18: Reset fight start time
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
