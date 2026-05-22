window.Game = window.Game || {};

(function () {
    'use strict';
    const G = window.Game;

    const KEY = 'fiat_checkpoint';
    const PERK_ORDER = ['fire', 'laser', 'electric'];

    function _getPerkIds(runState) {
        const ids = [];
        if (!runState) return ids;
        if (runState.hasFirePerk) ids.push('fire');
        if (runState.hasLaserPerk) ids.push('laser');
        if (runState.hasElectricPerk) ids.push('electric');
        return ids;
    }

    function _getWeaponLevel() {
        return (window.player && typeof window.player.weaponLevel === 'number') ? window.player.weaponLevel : 1;
    }

    function _getHyperActive() {
        return !!(window.player && window.player.hyperActive);
    }

    function _getGodchainActive() {
        return !!(window.player && window.player._godchainActive);
    }

    function _getLives() {
        if (window.player && typeof window.player._livesDisplay === 'number') return window.player._livesDisplay;
        if (typeof window.lives === 'number') return window.lives;
        return 3;
    }

    function _getShipType() {
        if (G.RunState && G.RunState.shipType) return G.RunState.shipType;
        return null;
    }

    function _getScore() {
        return (G.RunState && G.RunState.score) || 0;
    }

    function _isArcadeMode() {
        if (G.GameState && G.GameState.currentState === 'ARCADE') return true;
        if (G.ArcadeModifiers && typeof G.ArcadeModifiers.isArcadeMode === 'function' && G.ArcadeModifiers.isArcadeMode()) return true;
        if (G.CampaignState && !G.CampaignState.isEnabled()) return true;
        return false;
    }

    function _hasDefeatedBoss() {
        if (!G.CampaignState || !G.CampaignState.getProgress) return false;
        const progress = G.CampaignState.getProgress();
        return progress && typeof progress.defeated === 'number' && progress.defeated > 0;
    }

    function _isCheckpointEnabled() {
        return !(G.Balance && G.Balance.CHECKPOINT && G.Balance.CHECKPOINT.ENABLED === false);
    }

    function _getCheckpointVersion() {
        if (G.Balance && G.Balance.CHECKPOINT && typeof G.Balance.CHECKPOINT.VERSION === 'number') {
            return G.Balance.CHECKPOINT.VERSION;
        }
        return 1;
    }

    const CheckpointManager = {
        save() {
            if (!_isCheckpointEnabled()) return false;
            if (_isArcadeMode()) return false;
            if (!_hasDefeatedBoss()) return false;

            try {
                const runState = G.RunState;
                const campState = G.CampaignState;

                const data = {
                    version: _getCheckpointVersion(),
                    timestamp: Date.now(),
                    shipType: _getShipType(),
                    nextBoss: campState ? campState.getNextBoss() : null,
                    levelNumber: (runState && runState.level) || 1,
                    weaponLevel: _getWeaponLevel(),
                    perks: _getPerkIds(runState),
                    perkOrder: PERK_ORDER.slice(),
                    godchainActive: _getGodchainActive(),
                    hyperActive: _getHyperActive(),
                    lives: _getLives(),
                    score: _getScore(),
                    specials: [],
                    utilities: [],
                    ngPlusLevel: campState ? campState.ngPlusLevel : 0,
                    bossesDefeated: campState ? JSON.parse(JSON.stringify(campState.bosses)) : {},
                    storyProgress: campState ? JSON.parse(JSON.stringify(campState.storyProgress)) : {}
                };

                G.MigrationSystem.set(KEY, data);
                return true;
            } catch (e) {
                console.warn('[CheckpointManager] save failed:', e);
                return false;
            }
        },

        load() {
            try {
                const raw = G.MigrationSystem.get(KEY);
                if (!raw) return null;
                if (typeof raw !== 'object') {
                    this.clearCheckpoint();
                    return null;
                }

                const data = raw;

                if (data.version !== _getCheckpointVersion()) {
                    this.clearCheckpoint();
                    return null;
                }

                if (data.shipType && G.SHIPS && !G.SHIPS[data.shipType]) {
                    this.clearCheckpoint();
                    return null;
                }

                if (data.nextBoss && G.CampaignState && G.CampaignState.BOSS_ORDER) {
                    const bossOrder = G.CampaignState.BOSS_ORDER;
                    if (!bossOrder.includes(data.nextBoss)) {
                        this.clearCheckpoint();
                        return null;
                    }
                }

                return {
                    version: data.version,
                    timestamp: data.timestamp,
                    shipType: data.shipType || null,
                    nextBoss: data.nextBoss || null,
                    levelNumber: typeof data.levelNumber === 'number' ? data.levelNumber : 1,
                    weaponLevel: typeof data.weaponLevel === 'number' ? data.weaponLevel : 1,
                    perks: Array.isArray(data.perks) ? data.perks : [],
                    perkOrder: Array.isArray(data.perkOrder) ? data.perkOrder : PERK_ORDER.slice(),
                    godchainActive: !!data.godchainActive,
                    hyperActive: !!data.hyperActive,
                    lives: typeof data.lives === 'number' ? data.lives : 3,
                    score: typeof data.score === 'number' ? data.score : 0,
                    specials: Array.isArray(data.specials) ? data.specials : [],
                    utilities: Array.isArray(data.utilities) ? data.utilities : [],
                    ngPlusLevel: typeof data.ngPlusLevel === 'number' ? data.ngPlusLevel : 0,
                    bossesDefeated: data.bossesDefeated || {},
                    storyProgress: data.storyProgress || {}
                };
            } catch (e) {
                console.warn('[CheckpointManager] load failed:', e);
                this.clearCheckpoint();
                return null;
            }
        },

        hasCheckpoint() {
            const data = this.load();
            return data !== null;
        },

        clearCheckpoint() {
            try {
                G.MigrationSystem.remove(KEY);
            } catch (e) {
                console.warn('[CheckpointManager] clear failed:', e);
            }
        },

        resumeFromCheckpoint() {
            const data = this.load();
            if (!data) return null;

            try {
                const runState = G.RunState;
                const campState = G.CampaignState;
                const player = window.player;

                if (runState) {
                    runState.score = typeof data.score === 'number' ? data.score : runState.score || 0;

                    runState.shipType = data.shipType || runState.shipType || null;

                    runState.hyperActive = !!data.hyperActive;

                    runState.hasFirePerk = data.perks.indexOf('fire') >= 0;
                    runState.hasLaserPerk = data.perks.indexOf('laser') >= 0;
                    runState.hasElectricPerk = data.perks.indexOf('electric') >= 0;

                    if (typeof data.weaponLevel === 'number' && data.weaponLevel > 0) {
                        runState.perkLevel = data.weaponLevel;
                    }
                }

                if (player) {
                    if (typeof data.weaponLevel === 'number' && player.weaponLevel !== undefined) {
                        player.weaponLevel = data.weaponLevel;
                    }
                    if (player.hyperActive !== undefined) {
                        player.hyperActive = !!data.hyperActive;
                    }
                    if (player._godchainActive !== undefined) {
                        player._godchainActive = !!data.godchainActive;
                    }
                }

                if (campState) {
                    if (data.bossesDefeated) {
                        for (let i = 0; i < campState.BOSS_ORDER.length; i++) {
                            const bossType = campState.BOSS_ORDER[i];
                            if (data.bossesDefeated[bossType]) {
                                campState.bosses[bossType] = JSON.parse(JSON.stringify(data.bossesDefeated[bossType]));
                            }
                        }
                    }
                    if (typeof data.ngPlusLevel === 'number') {
                        campState.ngPlusLevel = data.ngPlusLevel;
                    }
                    if (data.storyProgress) {
                        for (const key in data.storyProgress) {
                            if (Object.prototype.hasOwnProperty.call(data.storyProgress, key)) {
                                if (Object.prototype.hasOwnProperty.call(campState.storyProgress, key)) {
                                    campState.storyProgress[key] = data.storyProgress[key];
                                }
                            }
                        }
                    }
                }

                // Note: specials/utilities are persisted in load() for future use
                // but are not yet restored here because the game doesn't have those features.
                // When Upgrades.specials / Upgrades.utilities are implemented, add restore here.
                return {
                    nextBoss: data.nextBoss || null,
                    levelNumber: typeof data.levelNumber === 'number' ? data.levelNumber : 1
                };
            } catch (e) {
                console.warn('[CheckpointManager] resumeFromCheckpoint failed:', e);
                return null;
            }
        }
    };

    G.CheckpointManager = CheckpointManager;

})();
