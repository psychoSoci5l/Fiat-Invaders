/**
 * DropSystem.js - Unified Power-Up Drop Management
 *
 * WEAPON EVOLUTION v5.11 REDESIGN:
 * - UPGRADE no longer drops from enemies (only from boss Evolution Core)
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

            // v4.61: Perk drop tracking
            this.killsSincePerkDrop = 0;
            this.lastPerkKillCount = 0;

            this.specialDroppedThisCycle = false; // v5.18: track SPECIAL drops per cycle

            // v5.19: Adaptive Drop Balancer
            this._lastDropGameTime = 0;
            this._lastKillGameTime = 0;
            this._recentKillTimes = [];
            this._struggleDropCount = 0;
            this._dominationSuppressCount = 0;
            this._deathGraceUntil = 0;
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

            this.killsSincePerkDrop = 0;
            this.lastPerkKillCount = 0;

            this.specialDroppedThisCycle = false; // v5.18

            // v5.19: Adaptive Drop Balancer
            this._lastDropGameTime = 0;
            this._lastKillGameTime = 0;
            this._recentKillTimes = [];
            this._struggleDropCount = 0;
            this._dominationSuppressCount = 0;
            this._deathGraceUntil = 0;
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
            if (typeof playerStateOrWeaponLevel === 'number') {
                playerState = null;
            } else {
                playerState = playerStateOrWeaponLevel;
            }

            // v4.61: Check for guaranteed PERK drop (pity timer)
            if (G.Balance.PERK && G.Balance.PERK.ENABLED) {
                const killsSincePerk = this.totalKills - this.lastPerkKillCount;
                const perkPity = WE.KILLS_FOR_PERK || 50;
                if (killsSincePerk >= perkPity) {
                    this.lastPerkKillCount = this.totalKills;
                    this.killsSincePerkDrop = 0;
                    return { type: 'PERK', category: 'perk' };
                }
            }

            // v5.18: Guaranteed SPECIAL in late waves if none dropped this cycle
            const DS = G.Balance.DROP_SCALING;
            const gswThreshold = (DS && DS.GUARANTEED_SPECIAL_WAVE) || 99;
            const currentWave = (G.WaveManager && G.WaveManager.wave) || 1;
            if (currentWave >= gswThreshold && !this.specialDroppedThisCycle) {
                this.specialDroppedThisCycle = true;
                return { type: this.getWeightedSpecial(WE), category: 'special' };
            }

            // v5.11: UPGRADE no longer drops from enemies — only from boss Evolution Core
            // Need-based category selection: SPECIAL, UTILITY, PERK only
            const AD = G.Balance.ADAPTIVE_DROPS;
            if (AD && AD.ENABLED && playerState) {
                const category = this.selectNeedBasedCategory(playerState);

                if (category === 'perk') {
                    this.lastPerkKillCount = this.totalKills;
                    this.killsSincePerkDrop = 0;
                    return { type: 'PERK', category: 'perk' };
                } else if (category === 'upgrade') {
                    // v5.11: Redirect UPGRADE → SPECIAL (upgrades only from boss)
                    const type = this.getWeightedSpecial(WE);
                    return { type, category: 'special' };
                } else if (category === 'special') {
                    const type = this.getWeightedSpecial(WE);
                    return { type, category: 'special' };
                } else {
                    const utilities = ['SHIELD', 'SPEED'];
                    const type = utilities[Math.floor(Math.random() * utilities.length)];
                    return { type, category: 'utility' };
                }
            }

            // Legacy fixed split (when adaptive is off or no playerState)
            // v5.11: No UPGRADE — 60% special, 20% utility, 20% perk
            const roll = Math.random();
            if (roll < 0.60) {
                const type = this.getWeightedSpecial(WE);
                return { type, category: 'special' };
            } else if (roll < 0.80) {
                const utilities = ['SHIELD', 'SPEED'];
                const type = utilities[Math.floor(Math.random() * utilities.length)];
                return { type, category: 'utility' };
            } else {
                if (G.Balance.PERK && G.Balance.PERK.ENABLED) {
                    this.lastPerkKillCount = this.totalKills;
                    this.killsSincePerkDrop = 0;
                    return { type: 'PERK', category: 'perk' };
                }
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

        // v5.11: shouldForceUpgrade removed — UPGRADE no longer drops from enemies

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

            const weaponScore = (playerState.weaponLevel - 1) / 2; // v5.11: 0.0 at LV1, 0.5 at LV2, 1.0 at LV3
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

        // === ADAPTIVE DROP BALANCER v5.19 ===

        /**
         * Extended power score (3 axes: weapon, special, perks)
         * @param {Object} playerState - { weaponLevel, hasSpecial, perkLevel }
         * @returns {number} 0.0–1.0
         */
        _getBalancerPowerScore(playerState) {
            const weaponAxis = ((playerState.weaponLevel ?? 1) - 1) / 2; // 0.0 at LV1, 0.5 at LV2, 1.0 at LV3
            const specialAxis = playerState.hasSpecial ? 1.0 : 0.0;
            const perkAxis = Math.min((playerState.perkLevel ?? 0) / 3, 1.0);
            return 0.50 * weaponAxis + 0.25 * specialAxis + 0.25 * perkAxis;
        }

        /**
         * Check struggle + domination in a single pass
         * @param {number} totalTime - current game time
         * @param {Object} playerState - player state snapshot
         * @returns {{ struggleBoost: number, struggleForce: boolean, struggleBias: boolean, dominationActive: boolean }}
         */
        _checkBalance(totalTime, playerState) {
            const result = { struggleBoost: 1, struggleForce: false, struggleBias: false, dominationActive: false };
            const ADB = G.Balance.ADAPTIVE_DROP_BALANCER;
            if (!ADB || !ADB.ENABLED) return result;

            const powerScore = this._getBalancerPowerScore(playerState);
            const cycle = window.marketCycle || 1;
            const isArcade = G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode();
            const arcadeMult = (isArcade && ADB.ARCADE_MULT) ? ADB.ARCADE_MULT : 1.0;

            // --- DOMINATION CHECK ---
            const DOM = ADB.DOMINATION;
            if (DOM) {
                // Auto-suppress during HYPER/GODCHAIN
                const hyperSuppress = DOM.HYPER_SUPPRESS && playerState.isHyper;
                const godchainSuppress = DOM.GODCHAIN_SUPPRESS && playerState.isGodchain;

                if (hyperSuppress || godchainSuppress) {
                    result.dominationActive = true;
                } else if (powerScore >= DOM.POWER_FLOOR && this._recentKillTimes.length >= 3) {
                    // Kill rate calculation
                    const times = this._recentKillTimes;
                    const oldest = times[0];
                    const newest = times[times.length - 1];
                    const span = newest - oldest;
                    if (span > 0) {
                        const killRate = (times.length - 1) / span;
                        if (killRate > DOM.KILL_RATE_THRESHOLD) {
                            result.dominationActive = true;
                        }
                    }
                }
            }

            // --- STRUGGLE CHECK ---
            const STR = ADB.STRUGGLE;
            if (STR && powerScore <= STR.POWER_CEILING) {
                // Apply cycle reduction + arcade mult
                let timeThreshold = STR.TIME_THRESHOLD - (cycle - 1) * STR.CYCLE_REDUCTION;
                let forceThreshold = STR.FORCE_THRESHOLD - (cycle - 1) * STR.CYCLE_REDUCTION;
                let minKills = STR.MIN_KILLS_SINCE_DROP;

                // Post-death grace
                const PD = ADB.POST_DEATH;
                if (PD && totalTime < this._deathGraceUntil) {
                    timeThreshold = PD.THRESHOLD;
                    forceThreshold = PD.THRESHOLD + 15; // force = threshold + 15s
                    minKills = PD.MIN_KILLS;
                }

                // Arcade scaling
                timeThreshold *= arcadeMult;
                forceThreshold *= arcadeMult;

                const timeSinceDrop = totalTime - this._lastDropGameTime;

                if (timeSinceDrop >= timeThreshold) {
                    // Anti-AFK: must have killed recently
                    const timeSinceKill = totalTime - this._lastKillGameTime;
                    if (timeSinceKill > STR.ACTIVITY_WINDOW) return result; // AFK

                    // Min kills check
                    if (this.killsSinceLastDrop < minKills) return result;

                    if (timeSinceDrop >= forceThreshold) {
                        result.struggleForce = true;
                        result.struggleBias = true;
                    } else {
                        result.struggleBoost = STR.CHANCE_BOOST;
                        result.struggleBias = true;
                    }
                }
            }

            return result;
        }

        /**
         * Select category using struggle bias weights
         * @returns {string} 'special'|'perk'|'utility'
         */
        _selectStruggleCategory() {
            const ADB = G.Balance.ADAPTIVE_DROP_BALANCER;
            const bias = (ADB && ADB.STRUGGLE) ? ADB.STRUGGLE.CATEGORY_BIAS : null;
            if (!bias) return 'special';

            const roll = Math.random();
            if (roll < bias.SPECIAL) return 'special';
            if (roll < bias.SPECIAL + bias.PERK) return 'perk';
            return 'utility';
        }

        /**
         * Notify drop system of player death for grace period
         * @param {number} totalTime - current game time
         */
        notifyDeath(totalTime) {
            const ADB = G.Balance.ADAPTIVE_DROP_BALANCER;
            if (!ADB || !ADB.ENABLED || !ADB.POST_DEATH) return;
            this._deathGraceUntil = totalTime + ADB.POST_DEATH.WINDOW;
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

            // v5.11: UPGRADE need always 0 — upgrades only from boss Evolution Core
            const upgradeNeed = 0;
            const specialNeed = playerState.hasSpecial ? 0.1 : 0.7;
            const utilityNeed = (playerState.hasShield || playerState.hasSpeed) ? 0.2 : 0.5;

            // v4.61: Perk need — high pre-3, reduced post-3 (GODCHAIN re-trigger)
            const perkLevel = playerState.perkLevel || 0;
            const maxElements = (G.Balance.PERK && G.Balance.PERK.MAX_ELEMENTS) || 3;
            const perkNeed = perkLevel >= maxElements ? 0.35 : (maxElements - perkLevel) / maxElements;

            // Weighted needs
            const wUpgrade = Math.max(MIN, upgradeNeed * CW.UPGRADE);
            const wSpecial = Math.max(MIN, specialNeed * CW.SPECIAL);
            const wUtility = Math.max(MIN, utilityNeed * CW.UTILITY);
            const wPerk = (G.Balance.PERK && G.Balance.PERK.ENABLED && CW.PERK)
                ? Math.max(MIN, perkNeed * CW.PERK) : 0;
            const totalWeight = wUpgrade + wSpecial + wUtility + wPerk;

            // Weighted random selection
            const roll = Math.random() * totalWeight;
            if (roll < wUpgrade) return 'upgrade';
            if (roll < wUpgrade + wSpecial) return 'special';
            if (roll < wUpgrade + wSpecial + wPerk) return 'perk';
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
            this.killsSincePerkDrop++;

            // v5.19: Track kill timestamps for balancer
            this._lastKillGameTime = totalTime;
            const ADB = Balance.ADAPTIVE_DROP_BALANCER;
            if (ADB && ADB.ENABLED) {
                const window_ = (ADB.DOMINATION && ADB.DOMINATION.KILL_RATE_WINDOW) || 10;
                this._recentKillTimes.push(totalTime);
                while (this._recentKillTimes.length > window_) {
                    this._recentKillTimes.shift();
                }
            }

            // Anti-cluster — enforce minimum 6s between enemy drops (pity bypasses)
            const MIN_DROP_INTERVAL = 6.0;
            const timeSinceLastDrop = totalTime - this.lastEnemyDropTime;

            // Base drop chance from enemy tier
            let dropChance = Balance.getDropChance(enemySymbol);

            // Arcade modifier: drop rate
            const _isArcadeDrop = G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode();
            if (_isArcadeDrop && Balance.ARCADE) {
                dropChance *= Balance.ARCADE.DROP_RATE_MULT;
                const ab = G.RunState && G.RunState.arcadeBonuses;
                if (ab && ab.dropRateMult !== 1.0) dropChance *= ab.dropRateMult;
            }

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
            // Arcade modifier: pity multiplier
            if (_isArcadeDrop) {
                const ab2 = G.RunState && G.RunState.arcadeBonuses;
                if (ab2 && ab2.pityMult !== 1.0) pityThreshold = Math.max(5, Math.floor(pityThreshold * ab2.pityMult));
            }

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

                // v5.19: Adaptive Drop Balancer — check struggle/domination
                const bal = playerState ? this._checkBalance(totalTime, playerState) : null;

                // v5.19: Domination — inflate pity threshold + reduce drop chance
                if (bal && bal.dominationActive) {
                    const DOM = ADB.DOMINATION;
                    pityThreshold = Math.max(15, Math.floor(pityThreshold * DOM.PITY_MULT));
                    dropChance *= DOM.CHANCE_MULT;
                    this._dominationSuppressCount++;
                }

                // v5.19: Struggle boost — multiply drop chance
                if (bal && bal.struggleBoost > 1) {
                    dropChance *= bal.struggleBoost;
                }

                // v5.11: No forced UPGRADE from enemies — upgrades come from boss Evolution Core only

                const pityDrop = this.killsSinceLastDrop >= pityThreshold;

                // v5.19: Struggle force — guaranteed drop
                const struggleForce = bal && bal.struggleForce;

                // Normal drop chance check
                if (struggleForce || pityDrop || Math.random() < dropChance) {
                    // Anti-cluster — skip non-pity/non-struggle drops if too soon after last drop
                    if (!pityDrop && !struggleForce && timeSinceLastDrop < MIN_DROP_INTERVAL) {
                        return null;
                    }

                    let dropInfo;

                    // v5.19: Struggle bias — use biased category selection
                    if (bal && bal.struggleBias) {
                        const cat = this._selectStruggleCategory();
                        if (cat === 'perk' && G.Balance.PERK && G.Balance.PERK.ENABLED) {
                            this.lastPerkKillCount = this.totalKills;
                            this.killsSincePerkDrop = 0;
                            dropInfo = { type: 'PERK', category: 'perk' };
                        } else if (cat === 'utility') {
                            const utilities = ['SHIELD', 'SPEED'];
                            dropInfo = { type: utilities[Math.floor(Math.random() * utilities.length)], category: 'utility' };
                        } else {
                            const WE = Balance.WEAPON_EVOLUTION;
                            dropInfo = { type: this.getWeightedSpecial(WE), category: 'special' };
                        }
                        this._struggleDropCount++;
                    } else {
                        dropInfo = this.selectEvolutionDropType(playerState || currentWeaponLevel);
                    }

                    // v5.19: Redirect PERK → SPECIAL when perk is on cooldown
                    if (dropInfo && dropInfo.category === 'perk' && playerState && playerState.perkOnCooldown) {
                        const WE = Balance.WEAPON_EVOLUTION;
                        dropInfo = { type: this.getWeightedSpecial(WE), category: 'special' };
                    }

                    // Anti-duplicate — if same type as last drop, reroll once
                    if (dropInfo && dropInfo.type === this.lastDropType && !(bal && bal.struggleBias)) {
                        dropInfo = this.selectEvolutionDropType(playerState || currentWeaponLevel);
                    }

                    // v4.48: Suppression AFTER selection — never suppress UPGRADE/PERK or struggle drops
                    if (dropInfo && !struggleForce && !(bal && bal.struggleBias) && dropInfo.category !== 'upgrade' && dropInfo.category !== 'perk' && playerState && this.shouldSuppressDrop(playerState, pityDrop)) {
                        this.suppressedDrops++;
                        if (G.Debug && G.Debug.trackDropSuppressed) {
                            G.Debug.trackDropSuppressed(playerState);
                        }
                        return null;
                    }

                    if (dropInfo) {
                        this.killsSinceLastDrop = 0;
                        this.lastEnemyDropTime = totalTime;
                        this._lastDropGameTime = totalTime; // v5.19
                        this.lastDropType = dropInfo.type;
                        if (dropInfo.category === 'special') this.specialDroppedThisCycle = true; // v5.18
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
            const pityDrop = this.killsSinceLastDrop >= pityThreshold;
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
                    this._lastDropGameTime = totalTime; // v5.19
                    if (dropInfo.category === 'special') this.specialDroppedThisCycle = true; // v5.18
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
