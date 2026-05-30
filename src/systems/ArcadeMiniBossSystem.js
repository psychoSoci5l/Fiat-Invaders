/**
 * ArcadeMiniBossSystem — Isolato da GameplayCallbacks.js v7.39.4
 * Gestisce trigger threshold, cooldown, max per wave, spawn miniboss Arcade.
 * Delega spawn a G.MiniBossManager.spawn().
 */
(function() {
    'use strict';

    const G = window.Game;
    if (!G) return;

    function getArcadeMiniCfg() {
        return G.Balance && G.Balance.ARCADE && G.Balance.ARCADE.MINI_BOSS;
    }

    function isArcadeMode() {
        return G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode && G.ArcadeModifiers.isArcadeMode();
    }

    function _resolveBloc(symbol) {
        const _patterns = getArcadeMiniCfg() && getArcadeMiniCfg().PATTERNS;
        if (_patterns && _patterns.BLOCS) {
            for (var blocName in _patterns.BLOCS) {
                if (_patterns.BLOCS[blocName].indexOf(symbol) !== -1) return blocName;
            }
        }
        if (['$', 'C$', 'Ⓒ'].indexOf(symbol) !== -1) return 'USA';
        if (['€', '£', '₣', '₺'].indexOf(symbol) !== -1) return 'EU';
        if (['¥', '₩', '₹', '元'].indexOf(symbol) !== -1) return 'ASIA';
        return 'EMERGING';
    }

    const ArcadeMiniBossSystem = {
        onEnemyKilled(enemy) {
            const _arcadeMini = isArcadeMode() && getArcadeMiniCfg();
            if (!_arcadeMini) return;

            const boss = typeof G.getBoss === 'function' ? G.getBoss() : null;
            const miniBoss = G.MiniBossManager ? G.MiniBossManager.isActive() : false;
            if (miniBoss || boss) return;
            if (!enemy.symbol || enemy.isMinion) return;

            const Balance = G.Balance;
            const _mbCooldown = _arcadeMini.COOLDOWN || 10.0;
            const _mbMaxWave = _arcadeMini.MAX_PER_WAVE || 3;

            const rs = G.RunState;
            const totalTime = typeof G.getTotalTime === 'function' ? G.getTotalTime() : (rs.totalTime || 0);
            const bossWarningTimer = typeof G.getBossWarningTimer === 'function' ? G.getBossWarningTimer() : 0;

            if (bossWarningTimer > 0) return;
            if ((totalTime - rs.lastMiniBossSpawnTime) < _mbCooldown) return;
            if (rs.miniBossThisWave >= _mbMaxWave) return;

            const fkc = rs.fiatKillCounter;
            if (fkc[enemy.symbol] === undefined) return;
            fkc[enemy.symbol]++;

            const mapping = Balance.MINI_BOSS.CURRENCY_BOSS_MAP && Balance.MINI_BOSS.CURRENCY_BOSS_MAP[enemy.symbol];
            const _threshMult = _arcadeMini.THRESHOLD_MULT || 0.65;
            const threshold = Math.floor((mapping && mapping.threshold || Balance.MINI_BOSS.KILL_THRESHOLD || 15) * _threshMult);

            if (G.Debug && G.Debug.log) {
                G.Debug.log('MINIBOSS', `Kill ${enemy.symbol}: ${fkc[enemy.symbol]}/${threshold}`);
            }

            if (fkc[enemy.symbol] >= threshold) {
                const miniBossSymbol = enemy.symbol;
                if (G.Debug && G.Debug.trackMiniBossSpawn) {
                    G.Debug.trackMiniBossSpawn(miniBossSymbol, enemy.symbol, fkc[enemy.symbol]);
                }
                if (G.Debug) {
                    G.Debug._miniBossStartInfo = { type: miniBossSymbol, trigger: enemy.symbol, killCount: fkc[enemy.symbol], startTime: Date.now() };
                }
                rs.lastMiniBossSpawnTime = totalTime;
                rs.miniBossThisWave++;
                if (G.MiniBossManager && G.MiniBossManager.spawn) {
                    G.MiniBossManager.spawn(miniBossSymbol, enemy.color);
                }
                // Reset all counters after spawn
                Object.keys(fkc).forEach(k => fkc[k] = 0);
            }
        },

        getMiniBossConfig(symbol) {
            const _arcadeMini = getArcadeMiniCfg();
            const _patterns = G.Balance && G.Balance.ARCADE && G.Balance.ARCADE.MINI_BOSS_PATTERNS;
            const bloc = _resolveBloc(symbol);
            const blocCfg = (_patterns && _patterns[bloc]) || {};
            return {
                bloc,
                hpMult: blocCfg.hpMult || (_arcadeMini && _arcadeMini.HP_MULT_PER_BLOC && _arcadeMini.HP_MULT_PER_BLOC[bloc]) || 1.0,
                fireRate: blocCfg.fireRate || (_arcadeMini && _arcadeMini.FIRE_RATE_PER_BLOC && _arcadeMini.FIRE_RATE_PER_BLOC[bloc]) || 1.0
            };
        },

        reset() {
            const rs = G.RunState;
            if (rs.fiatKillCounter) {
                Object.keys(rs.fiatKillCounter).forEach(k => rs.fiatKillCounter[k] = 0);
            }
            rs.lastMiniBossSpawnTime = 0;
            rs.miniBossThisWave = 0;
        }
    };

    G.ArcadeMiniBossSystem = ArcadeMiniBossSystem;
})();
