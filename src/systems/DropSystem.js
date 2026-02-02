/**
 * DropSystem.js - Unified Power-Up Drop Management
 *
 * Consolidates all drop logic:
 * - Enemy kill drops (tier-based chances)
 * - Boss hit drops (periodic power-ups)
 * - Pity timer system
 * - Weapon vs Ship selection
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
        }

        /**
         * Reset drop system state (call on game start)
         */
        reset() {
            this.lastWeaponDropTime = 0;
            this.killsSinceLastDrop = 0;
            this.bossHitCount = 0;
            this.bossDropCooldown = 0;
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
         * Select drop type (weapon or ship)
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

        /**
         * Check if enemy death should trigger a drop
         * @param {string} enemySymbol - Currency symbol of killed enemy
         * @param {number} totalTime - Current game time
         * @param {Function} getUnlockedWeapons - Function to get unlocked weapons
         * @returns {Object|null} Drop info { type, isWeapon, x, y } or null
         */
        tryEnemyDrop(enemySymbol, enemyX, enemyY, totalTime, getUnlockedWeapons) {
            const Balance = G.Balance;

            this.killsSinceLastDrop++;

            // Determine drop chance based on enemy tier
            const dropChance = Balance.getDropChance(enemySymbol);

            // Pity timer: guaranteed drop after N kills without any drop
            const pityDrop = this.killsSinceLastDrop >= Balance.DROPS.PITY_TIMER_KILLS;

            if (pityDrop || Math.random() < dropChance) {
                const dropInfo = this.selectDropType(totalTime, getUnlockedWeapons);
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
         * @param {number} bossX - Boss X position
         * @param {number} bossY - Boss Y position
         * @param {number} totalTime - Current game time
         * @param {Function} getUnlockedWeapons - Function to get unlocked weapons
         * @returns {Object|null} Drop info { type, isWeapon, x, y } or null
         */
        tryBossDrop(bossX, bossY, totalTime, getUnlockedWeapons) {
            const Balance = G.Balance;

            this.bossHitCount++;

            if (this.bossHitCount >= Balance.BOSS.DROP_INTERVAL && this.bossDropCooldown <= 0) {
                this.bossHitCount = 0;
                this.bossDropCooldown = Balance.DROPS.BOSS_DROP_COOLDOWN;

                const dropInfo = this.selectDropType(totalTime, getUnlockedWeapons);
                if (dropInfo) {
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
