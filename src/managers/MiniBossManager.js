/**
 * MiniBossManager.js — Mini-boss spawn, update, draw, hit detection
 * Extracted from main.js (v4.49 refactor)
 */
(function () {
    'use strict';
    const G = window.Game;
    const Balance = G.Balance;

    let miniBoss = null;
    let _deps = {};

    function init(deps) {
        _deps = deps || {};
    }

    function get() { return miniBoss; }
    function isActive() { return !!(miniBoss && miniBoss.active); }

    // S12.2 (v7.32): resolve currency bloc from symbol
    function _resolveBloc(symbol) {
        const _patterns = Balance.ARCADE && Balance.ARCADE.MINI_BOSS_PATTERNS;
        if (_patterns && _patterns.BLOCS) {
            for (var blocName in _patterns.BLOCS) {
                if (_patterns.BLOCS[blocName].indexOf(symbol) !== -1) return blocName;
            }
        }
        // Fallback: hard-coded bloc mapping
        if (['$', 'C$', 'Ⓒ'].indexOf(symbol) !== -1) return 'USA';
        if (['€', '£', '₣', '₺'].indexOf(symbol) !== -1) return 'EU';
        if (['¥', '₩', '₹', '元'].indexOf(symbol) !== -1) return 'ASIA';
        return 'EMERGING';
    }

    function spawn(bossTypeOrSymbol, triggerColor) {
        const { gameWidth, gameHeight, level, marketCycle, runState,
                player, waveMgr, enemies: getEnemies, setEnemies,
                enemyBullets: getEnemyBullets, setEnemyBullets,
                applyHitStop, showDanger, canSpawnEnemyBullet,
                bossDeathTimeout } = _deps;

        applyHitStop('BOSS_DEFEAT_SLOWMO', false);

        // S12.1 (v7.32): Continuous-action miniboss — no clearBattlefield,
        // no wave suspension. Regular enemies persist during the fight.
        // Only clear in-flight enemy bullets for visual clarity.
        const validBossTypes = ['FEDERAL_RESERVE', 'BCE', 'BOJ'];
        const isBossType = validBossTypes.includes(bossTypeOrSymbol);

        // Boss-instance minibosses (FED/BCE/BOJ used as miniboss) retain
        // the legacy clearBattlefield + suspend flow for backward compat.
        if (isBossType) {
            const savedEnemies = [...getEnemies()];
            if (waveMgr) waveMgr.suspendStreaming(savedEnemies);
            if (G.clearBattlefield) {
                G.clearBattlefield();
            } else {
                const eb = getEnemyBullets();
                eb.forEach(b => {
                    b.markedForDeletion = true;
                    if (G.Bullet && G.Bullet.Pool && G.Bullet.Pool.release) {
                        G.Bullet.Pool.release(b);
                    }
                });
                setEnemyBullets([]);
            }
            setEnemies([]);
            if (waveMgr) waveMgr.miniBossActive = true;
            if (G.HarmonicConductor) G.HarmonicConductor.enemies = getEnemies();
        } else {
            // Legacy miniboss (currency hexagon): clear bullets only, keep enemies
            const eb = getEnemyBullets();
            eb.forEach(b => {
                b.markedForDeletion = true;
                if (G.Bullet && G.Bullet.Pool && G.Bullet.Pool.release) {
                    G.Bullet.Pool.release(b);
                }
            });
            setEnemyBullets([]);
        }

        if (isBossType) {
            const bossType = bossTypeOrSymbol;
            const bossConfig = G.BOSSES[bossType] || G.BOSSES.FEDERAL_RESERVE;

            miniBoss = new G.Boss(gameWidth(), gameHeight(), bossType);
            window.miniBoss = miniBoss;
            miniBoss.isMiniBoss = true;
            miniBoss.triggerColor = triggerColor;

            const perkCount = (runState() && runState().perks) ? runState().perks.length : 0;
            const perkScaling = 1 + (perkCount * Balance.BOSS.HP.PERK_SCALE);
            const fullBossHp = Balance.calculateBossHP(level(), marketCycle());
            const _arcadeMB = (G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode() && Balance.ARCADE) ? Balance.ARCADE.MINI_BOSS : null;
            // S12.6 (v7.32): use updated HP_MULT (0.40) from config
            const hpMult = _arcadeMB ? (_arcadeMB.HP_MULT || 0.40) : 0.6;
            const miniBossHp = Math.floor(fullBossHp * hpMult * perkScaling);
            miniBoss.hp = miniBossHp;
            miniBoss.maxHp = miniBossHp;

            const signatureMeme = G.BOSS_SIGNATURE_MEMES?.[bossType];
            showDanger(bossConfig.name + ' ' + _deps.t('APPEARS'));
            if (signatureMeme) {
                G.MemeEngine.queueMeme('MINI_BOSS_SPAWN', signatureMeme, bossConfig.name);
            }
        } else {
            const symbol = bossTypeOrSymbol;
            const color = triggerColor;
            const fiatNames = { '¥': 'YEN', '€': 'EURO', '£': 'POUND', '$': 'DOLLAR', '₽': 'RUBLE', '₹': 'RUPEE', '₣': 'FRANC', '₺': 'LIRA', '元': 'YUAN', 'Ⓒ': 'CBDC' };

            // S12.2/S12.6 (v7.32): resolve bloc for per-bloc HP and fire rate
            const _blocCfg = Balance.ARCADE && Balance.ARCADE.MINI_BOSS_PATTERNS ? Balance.ARCADE.MINI_BOSS_PATTERNS : null;
            const _mbCfg = Balance.ARCADE && Balance.ARCADE.MINI_BOSS ? Balance.ARCADE.MINI_BOSS : null;
            const bloc = _resolveBloc(symbol);
            const blocHpMult = (_blocCfg && _blocCfg[bloc] && _blocCfg[bloc].hpMult) || (_mbCfg && _mbCfg.HP_MULT_PER_BLOC && _mbCfg.HP_MULT_PER_BLOC[bloc]) || 1.0;
            const blocFireRate = (_blocCfg && _blocCfg[bloc] && _blocCfg[bloc].fireRate) || (_mbCfg && _mbCfg.FIRE_RATE_PER_BLOC && _mbCfg.FIRE_RATE_PER_BLOC[bloc]) || 1.0;

            // S12.6 (v7.32): use data-driven HP from calculateBossHP, consistent with boss-instances
            const fullBossHp = Balance.calculateBossHP(level(), marketCycle());
            const hpMult = (_mbCfg && _mbCfg.HP_MULT) || 0.40;
            const perkCount = (runState() && runState().perks) ? runState().perks.length : 0;
            const perkScaling = 1 + (perkCount * (Balance.BOSS.HP.PERK_SCALE || 0.10));
            const scaledHp = Math.floor(fullBossHp * hpMult * perkScaling * blocHpMult);

            // S12.6: base fire rate from config, adjusted by bloc
            const baseFireRate = (_mbCfg && _mbCfg.BASE_FIRE_RATE) || 1.0;
            const adjustedFireRate = baseFireRate * blocFireRate;

            miniBoss = {
                x: gameWidth() / 2,
                y: 150,
                targetY: 180,
                width: 120,
                height: 120,
                hp: scaledHp,
                maxHp: scaledHp,
                symbol: symbol,
                color: color,
                name: fiatNames[symbol] || 'FIAT',
                fireTimer: 0,
                fireRate: adjustedFireRate,
                phase: 0,
                phaseTimer: 0,
                animTime: 0,
                active: true,
                bloc: bloc,
                // S12.2 (v7.32): movement state for bloc-specific patterns
                moveState: {},
                // S12.3 (v7.32): attack state for bloc-specific attacks
                attackState: {},
            };
            window.miniBoss = miniBoss;

            showDanger(miniBoss.name + ' ' + _deps.t('REVENGE'));
            G.MemeEngine.queueMeme('MINI_BOSS_SPAWN', _deps.getFiatDeathMeme(), miniBoss.name);
        }

        G.Audio.play('bossSpawn');

        // S12.4 (v7.32): Reset miniboss drop tracking on spawn
        if (G.DropSystem && G.DropSystem.resetMinibossDrops) G.DropSystem.resetMinibossDrops();
    }

    function update(dt) {
        if (!miniBoss || !miniBoss.active) return;

        const { player, canSpawnEnemyBullet, gameWidth } = _deps;
        const getEB = _deps.enemyBullets;
        const pl = player();

        if (miniBoss instanceof G.Boss) {
            const attackBullets = miniBoss.update(dt, pl);
            if (attackBullets && attackBullets.length > 0) {
                const eb = getEB();
                for (const bd of attackBullets) {
                    if (!canSpawnEnemyBullet()) break;
                    const bullet = G.Bullet.Pool.acquire(bd.x, bd.y, bd.vx, bd.vy, bd.color, bd.w, bd.h, false);
                    if (bd.isHoming) {
                        bullet.isHoming = true;
                        bullet.homingStrength = bd.homingStrength || 2.5;
                        bullet.targetX = pl.x;
                        bullet.targetY = pl.y;
                        bullet.maxSpeed = bd.maxSpeed || 200;
                    }
                    eb.push(bullet);
                }
            }
            return;
        }

        // S12.2 (v7.32): Legacy mini-boss update — bloc-specific movement
        miniBoss.animTime += dt;
        if (miniBoss.y < miniBoss.targetY) miniBoss.y += 60 * dt;

        const _blocCfg = Balance.ARCADE && Balance.ARCADE.MINI_BOSS_PATTERNS ? Balance.ARCADE.MINI_BOSS_PATTERNS[miniBoss.bloc] : null;
        const movementType = (_blocCfg && _blocCfg.movementType) || 'PATROL';
        const ms = miniBoss.moveState;

        if (movementType === 'PATROL') {
            // USA: horizontal oscillation with occasional pauses
            var patrolSpeed = (_blocCfg && _blocCfg.speed) || 1.2;
            var patrolAmp = (_blocCfg && _blocCfg.amplitude) || 180;
            if (ms.paused) {
                ms.pauseTimer -= dt;
                if (ms.pauseTimer <= 0) ms.paused = false;
            } else {
                ms.patrolTime = (ms.patrolTime || 0) + dt * patrolSpeed;
                miniBoss.x = gameWidth() / 2 + Math.sin(ms.patrolTime * 1.5) * patrolAmp;
                if (Math.random() < ((_blocCfg && _blocCfg.pauseChance) || 0.15) * dt) {
                    ms.paused = true;
                    ms.pauseTimer = (_blocCfg && _blocCfg.pauseDuration) || 0.8;
                }
            }
        } else if (movementType === 'WEAVE') {
            // EU: figure-8 / lemniscate pattern
            var weaveSpeed = (_blocCfg && _blocCfg.speed) || 0.8;
            var weaveAmpX = (_blocCfg && _blocCfg.ampX) || 160;
            var weaveAmpY = (_blocCfg && _blocCfg.ampY) || 40;
            ms.weaveTime = (ms.weaveTime || 0) + dt * weaveSpeed;
            miniBoss.x = gameWidth() / 2 + Math.sin(ms.weaveTime) * weaveAmpX;
            miniBoss.y = miniBoss.targetY + Math.sin(ms.weaveTime * 2) * weaveAmpY;
        } else if (movementType === 'DASH') {
            // ASIA: quick lateral bursts with hover stops
            var dashSpd = (_blocCfg && _blocCfg.dashSpeed) || 500;
            var dashDist = (_blocCfg && _blocCfg.dashDistance) || 120;
            var hoverDur = (_blocCfg && _blocCfg.hoverDuration) || 1.5;
            var dashCD = (_blocCfg && _blocCfg.cooldown) || 2.0;
            if (!ms.dashDir) ms.dashDir = Math.random() < 0.5 ? 1 : -1;
            if (ms.hovering) {
                ms.hoverTimer -= dt;
                if (ms.hoverTimer <= 0) {
                    ms.hovering = false;
                    ms.dashDir = Math.random() < 0.5 ? 1 : -1;
                    ms.dashDistLeft = dashDist;
                }
            } else if (ms.dashCooldown > 0) {
                ms.dashCooldown -= dt;
            } else {
                miniBoss.x += dashSpd * ms.dashDir * dt;
                ms.dashDistLeft -= dashSpd * dt;
                if (ms.dashDistLeft <= 0) {
                    ms.hovering = true;
                    ms.hoverTimer = hoverDur;
                    ms.dashCooldown = dashCD;
                    miniBoss.x = Math.max(60, Math.min(gameWidth() - 60, miniBoss.x));
                }
            }
        } else if (movementType === 'ORBIT') {
            // EMERGING: circular path around fixed point
            var orbitSpeed = (_blocCfg && _blocCfg.speed) || 1.0;
            var orbitRX = (_blocCfg && _blocCfg.radiusX) || 100;
            var orbitRY = (_blocCfg && _blocCfg.radiusY) || 50;
            var orbitCY = (_blocCfg && _blocCfg.centerY) || 140;
            ms.orbitAngle = (ms.orbitAngle || 0) + dt * orbitSpeed;
            miniBoss.x = gameWidth() / 2 + Math.cos(ms.orbitAngle) * orbitRX;
            miniBoss.y = orbitCY + Math.sin(ms.orbitAngle) * orbitRY;
        } else {
            // Fallback: legacy sine wave
            miniBoss.x = gameWidth() / 2 + Math.sin(miniBoss.animTime * 1.5) * 150;
        }

        miniBoss.fireTimer -= dt;
        if (miniBoss.fireTimer <= 0) {
            miniBoss.fireTimer = miniBoss.fireRate - (miniBoss.hp / miniBoss.maxHp) * 0.3;
            _fireBullets(dt);
        }

        // S12.3 (v7.32): update orbit bullets between fire calls
        var _as = miniBoss.attackState;
        if (_as && _as.orbitBullets && _as.orbitBullets.length > 0) {
            for (var _oi = 0; _oi < _as.orbitBullets.length; _oi++) {
                var _ob = _as.orbitBullets[_oi];
                if (_ob && !_ob.markedForDeletion) {
                    _ob.orbitAngle = (_ob.orbitAngle || 0) + dt * 3;
                    _ob.x = miniBoss.x + Math.cos(_ob.orbitAngle) * (_ob.orbitRadius || 50);
                    _ob.y = miniBoss.y + Math.sin(_ob.orbitAngle) * (_ob.orbitRadius || 50);
                }
            }
        }
        // S12.3 (v7.32): update homing bullets between fire calls
        if (_as && _as.homingBullets && _as.homingBullets.length > 0) {
            for (var _hi = 0; _hi < _as.homingBullets.length; _hi++) {
                var _hb = _as.homingBullets[_hi];
                if (_hb && !_hb.markedForDeletion && miniBoss.animTime < _hb.homingExpiry) {
                    var _hDx = pl.x - _hb.x, _hDy = pl.y - _hb.y;
                    var _hDist = Math.sqrt(_hDx * _hDx + _hDy * _hDy) || 1;
                    var _turnRate = (_hb.homingStrength || 4.0) * dt;
                    var _hSpd = _hb.maxSpeed || 160;
                    var _tVx = (_hDx / _hDist) * _hSpd;
                    var _tVy = (_hDy / _hDist) * _hSpd;
                    _hb.vx += (_tVx - _hb.vx) * _turnRate;
                    _hb.vy += (_tVy - _hb.vy) * _turnRate;
                    var _hSp = Math.sqrt(_hb.vx * _hb.vx + _hb.vy * _hb.vy) || 1;
                    _hb.vx = (_hb.vx / _hSp) * _hSpd;
                    _hb.vy = (_hb.vy / _hSp) * _hSpd;
                }
            }
        }

        const hpPct = miniBoss.hp / miniBoss.maxHp;
        if (hpPct < 0.3 && miniBoss.phase < 2) {
            miniBoss.phase = 2;
            miniBoss.fireRate = 0.4;
            _deps.setShake(15);
        } else if (hpPct < 0.6 && miniBoss.phase < 1) {
            miniBoss.phase = 1;
            miniBoss.fireRate = 0.6;
        }
    }

    // S12.3 (v7.32): fire a single bullet with common setup
    function _spawnBullet(x, y, vx, vy, color, w, h) {
        if (!_deps.canSpawnEnemyBullet()) return null;
        const eb = _deps.enemyBullets();
        const b = G.Bullet.Pool.acquire(x, y, vx, vy, color, w, h, false);
        eb.push(b);
        return b;
    }

    function _fireBullets(dt) {
        if (!miniBoss) return;
        const { player, canSpawnEnemyBullet, enemyBullets: getEB } = _deps;
        if (!canSpawnEnemyBullet()) return;
        const pl = player();
        const eb = getEB();

        // S12.3 (v7.32): Boss-instance minibosses use their own attack system
        if (miniBoss instanceof G.Boss) return;

        // S12.3 (v7.32): bloc-specific signature attacks
        const _blocCfg = Balance.ARCADE && Balance.ARCADE.MINI_BOSS_PATTERNS ? Balance.ARCADE.MINI_BOSS_PATTERNS[miniBoss.bloc] : null;
        const phaseKey = 'phase' + miniBoss.phase;
        var atkCfg = (_blocCfg && _blocCfg.attacks && _blocCfg.attacks[phaseKey]) || null;

        // Fallback: legacy generic attacks if no bloc config
        if (!atkCfg) {
            _fireLegacyPhase(eb, pl, miniBoss.phase);
            G.Audio.play('enemyShoot');
            return;
        }

        var as = miniBoss.attackState;
        var t = miniBoss.animTime;

        if (atkCfg.type === 'RAPID_AIMED') {
            // USA phase0: 2 aimed bullets in quick succession
            var count = atkCfg.count || 2;
            var interval = atkCfg.interval || 0.15;
            var spd = atkCfg.speed || 180;
            if (!as.rapidIdx) as.rapidIdx = 0;
            if (as.rapidIdx < count) {
                var dx = pl.x - miniBoss.x, dy = pl.y - miniBoss.y;
                var dist = Math.sqrt(dx * dx + dy * dy) || 1;
                _spawnBullet(miniBoss.x, miniBoss.y + 60, (dx / dist) * spd, (dy / dist) * spd, miniBoss.color, 8, 8);
                as.rapidIdx++;
                miniBoss.fireTimer = interval;
                if (as.rapidIdx >= count) as.rapidIdx = 0;
            }
        } else if (atkCfg.type === 'CONE') {
            // USA phase1: cone of bullets aimed at player
            var coneCount = atkCfg.count || 5;
            var coneSpread = atkCfg.spread || 0.26;
            var coneSpd = atkCfg.speed || 170;
            var cDx = pl.x - miniBoss.x, cDy = pl.y - miniBoss.y;
            var cDist = Math.sqrt(cDx * cDx + cDy * cDy) || 1;
            var baseAngle = Math.atan2(cDy, cDx);
            for (var ci = 0; ci < coneCount; ci++) {
                if (!canSpawnEnemyBullet()) break;
                var a = baseAngle - coneSpread / 2 + (coneSpread / (coneCount - 1)) * ci;
                _spawnBullet(miniBoss.x, miniBoss.y + 60, Math.cos(a) * coneSpd, Math.sin(a) * coneSpd, miniBoss.color, 8, 8);
            }
        } else if (atkCfg.type === 'SWEEP_ARC') {
            // USA phase2: 12 bullets spread over 1.5s in a sweeping arc
            var sweepCount = atkCfg.count || 12;
            var sweepArc = atkCfg.arcWidth || 1.2;
            var sweepSpd = atkCfg.speed || 160;
            if (!as.sweepIdx) as.sweepIdx = 0;
            if (as.sweepIdx < sweepCount) {
                var sa = -sweepArc / 2 + (sweepArc / (sweepCount - 1)) * as.sweepIdx;
                _spawnBullet(miniBoss.x, miniBoss.y + 60, Math.cos(sa) * sweepSpd, Math.sin(sa + Math.PI / 2) * sweepSpd, miniBoss.color, 7, 7);
                as.sweepIdx++;
                miniBoss.fireTimer = (atkCfg.duration || 1.5) / sweepCount;
                if (as.sweepIdx >= sweepCount) as.sweepIdx = 0;
            }
        } else if (atkCfg.type === 'ALTERNATE') {
            // EU phase0: alternating left/right shots
            var altSpd = atkCfg.speed || 170;
            if (!as.altDir) as.altDir = 1;
            _spawnBullet(miniBoss.x + as.altDir * 30, miniBoss.y + 60, as.altDir * altSpd * 0.3, altSpd * 0.8, miniBoss.color, 8, 8);
            as.altDir *= -1;
        } else if (atkCfg.type === 'HORIZONTAL_WALL') {
            // EU phase1: horizontal wall of bullets falling down
            var wallCount = atkCfg.count || 6;
            var wallSpacing = atkCfg.spacing || 30;
            var wallVy = atkCfg.vy || 60;
            var startX = miniBoss.x - (wallCount - 1) * wallSpacing / 2;
            for (var wi = 0; wi < wallCount; wi++) {
                if (!canSpawnEnemyBullet()) break;
                _spawnBullet(startX + wi * wallSpacing, miniBoss.y + 60, 0, wallVy, miniBoss.color, 6, 6);
            }
        } else if (atkCfg.type === 'ORBIT_DELAYED') {
            // EU phase2: 4 orbiting bullets that release after 2s
            var orbitCount = atkCfg.count || 4;
            var orbitDur = atkCfg.orbitDuration || 2.0;
            var releaseSpd = atkCfg.releaseSpeed || 150;
            if (!as.orbitBullets) {
                as.orbitBullets = [];
                as.orbitStart = t;
                for (var oi = 0; oi < orbitCount; oi++) {
                    var ob = _spawnBullet(miniBoss.x, miniBoss.y, 0, 0, miniBoss.color, 8, 8);
                    if (ob) {
                        ob.orbitAngle = (Math.PI * 2 / orbitCount) * oi;
                        ob.orbitRadius = 50;
                        as.orbitBullets.push(ob);
                    }
                }
            }
            var elapsed = t - as.orbitStart;
            if (elapsed >= orbitDur) {
                for (var ri = 0; ri < as.orbitBullets.length; ri++) {
                    var rb = as.orbitBullets[ri];
                    if (rb && !rb.markedForDeletion) {
                        var rdx = pl.x - rb.x, rdy = pl.y - rb.y;
                        var rDist = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
                        rb.vx = (rdx / rDist) * releaseSpd;
                        rb.vy = (rdy / rDist) * releaseSpd;
                    }
                }
                as.orbitBullets = null;
            } else {
                // Orbit around miniboss
                for (var ui = 0; ui < as.orbitBullets.length; ui++) {
                    var ub = as.orbitBullets[ui];
                    if (ub && !ub.markedForDeletion) {
                        ub.orbitAngle += dt * 3;
                        ub.x = miniBoss.x + Math.cos(ub.orbitAngle) * ub.orbitRadius;
                        ub.y = miniBoss.y + Math.sin(ub.orbitAngle) * ub.orbitRadius;
                    }
                }
                miniBoss.fireTimer = 0.05;
            }
        } else if (atkCfg.type === 'FAST_AIMED') {
            // ASIA phase0: single fast aimed bullet
            var fastSpd = atkCfg.speed || 240;
            var fDx = pl.x - miniBoss.x, fDy = pl.y - miniBoss.y;
            var fDist = Math.sqrt(fDx * fDx + fDy * fDy) || 1;
            _spawnBullet(miniBoss.x, miniBoss.y + 60, (fDx / fDist) * fastSpd, (fDy / fDist) * fastSpd, miniBoss.color, 8, 8);
        } else if (atkCfg.type === 'MULTI_SPEED') {
            // ASIA phase1: bullets at multiple speeds
            var speeds = atkCfg.speeds || [200, 140, 90];
            var mDx = pl.x - miniBoss.x, mDy = pl.y - miniBoss.y;
            var mDist = Math.sqrt(mDx * mDx + mDy * mDy) || 1;
            var mBaseAngle = Math.atan2(mDy, mDx);
            for (var si = 0; si < speeds.length; si++) {
                if (!canSpawnEnemyBullet()) break;
                _spawnBullet(miniBoss.x, miniBoss.y + 60, Math.cos(mBaseAngle) * speeds[si], Math.sin(mBaseAngle) * speeds[si], miniBoss.color, 7, 7);
            }
        } else if (atkCfg.type === 'TEMPORARY_HOMING') {
            // ASIA phase2: 2 bullets that home for 1s then go straight
            var homingCount = atkCfg.count || 2;
            var homingDur = atkCfg.homingDuration || 1.0;
            var homingSpd = atkCfg.speed || 160;
            if (!as.homingBullets) {
                as.homingBullets = [];
                as.homingStart = t;
                for (var hi = 0; hi < homingCount; hi++) {
                    var hb = _spawnBullet(miniBoss.x, miniBoss.y + 60, 0, homingSpd, miniBoss.color, 8, 8);
                    if (hb) {
                        hb.homing = true;
                        hb.homingStrength = 4.0;
                        hb.homingExpiry = t + homingDur;
                        hb.maxSpeed = homingSpd;
                        as.homingBullets.push(hb);
                    }
                }
                miniBoss.fireTimer = 0.05;
            }
            // Update homing bullets manually (enemy bullets don't get enemy context)
            for (var hmi = 0; hmi < as.homingBullets.length; hmi++) {
                var hmb = as.homingBullets[hmi];
                if (hmb && !hmb.markedForDeletion) {
                    if (t < hmb.homingExpiry) {
                        var hDx = pl.x - hmb.x, hDy = pl.y - hmb.y;
                        var hDist = Math.sqrt(hDx * hDx + hDy * hDy) || 1;
                        var turnRate = hmb.homingStrength * dt;
                        var targetVx = (hDx / hDist) * homingSpd;
                        var targetVy = (hDy / hDist) * homingSpd;
                        hmb.vx += (targetVx - hmb.vx) * turnRate;
                        hmb.vy += (targetVy - hmb.vy) * turnRate;
                        var hSpeed = Math.sqrt(hmb.vx * hmb.vx + hmb.vy * hmb.vy) || 1;
                        hmb.vx = (hmb.vx / hSpeed) * homingSpd;
                        hmb.vy = (hmb.vy / hSpeed) * homingSpd;
                    }
                }
            }
        } else if (atkCfg.type === 'RANDOM_BURST') {
            // EMERGING phase0: 3 bullets at random angles
            var burstCount = atkCfg.count || 3;
            var burstSpd = atkCfg.speed || 150;
            for (var bi = 0; bi < burstCount; bi++) {
                if (!canSpawnEnemyBullet()) break;
                var ba = Math.random() * Math.PI * 2;
                _spawnBullet(miniBoss.x, miniBoss.y + 60, Math.cos(ba) * burstSpd, Math.sin(ba) * burstSpd, miniBoss.color, 7, 7);
            }
        } else if (atkCfg.type === 'SHOTGUN') {
            // EMERGING phase1: wide spread shotgun blast
            var sgCount = atkCfg.count || 8;
            var sgSpread = atkCfg.spread || 1.2;
            var sgSpd = atkCfg.speed || 100;
            var sgDir = atkCfg.direction || 'down';
            var sgBaseAngle = sgDir === 'down' ? Math.PI / 2 : Math.atan2(pl.y - miniBoss.y, pl.x - miniBoss.x);
            for (var sgi = 0; sgi < sgCount; sgi++) {
                if (!canSpawnEnemyBullet()) break;
                var sga = sgBaseAngle - sgSpread / 2 + (sgSpread / (sgCount - 1)) * sgi;
                _spawnBullet(miniBoss.x, miniBoss.y + 60, Math.cos(sga) * sgSpd, Math.sin(sga) * sgSpd, miniBoss.color, 6, 6);
            }
        } else if (atkCfg.type === 'EXPANDING_RING') {
            // EMERGING phase2: expanding rings of bullets
            var rings = atkCfg.rings || 2;
            var ringCount = atkCfg.countPerRing || 10;
            var ringInterval = atkCfg.interval || 0.5;
            var ringSpd = atkCfg.speed || 130;
            if (!as.ringIdx) as.ringIdx = 0;
            if (!as.ringTimer) as.ringTimer = 0;
            if (as.ringIdx < rings && as.ringTimer <= 0) {
                for (var rni = 0; rni < ringCount; rni++) {
                    if (!canSpawnEnemyBullet()) break;
                    var rna = (Math.PI * 2 / ringCount) * rni + t;
                    _spawnBullet(miniBoss.x, miniBoss.y + 60, Math.cos(rna) * ringSpd, Math.sin(rna) * ringSpd, miniBoss.color, 6, 6);
                }
                as.ringIdx++;
                as.ringTimer = ringInterval;
                miniBoss.fireTimer = 0.05;
            } else {
                as.ringTimer -= dt;
                if (as.ringTimer <= 0 && as.ringIdx >= rings) {
                    as.ringIdx = 0;
                    as.ringTimer = 0;
                }
                miniBoss.fireTimer = 0.05;
            }
        } else {
            // Fallback: legacy generic attacks
            _fireLegacyPhase(eb, pl, miniBoss.phase);
        }

        G.Audio.play('enemyShoot');
    }

    // S12.3 (v7.32): legacy fallback attack patterns
    function _fireLegacyPhase(eb, pl, phase) {
        const bulletSpeed = 170 + (phase * 42);
        if (phase === 0) {
            const dx = pl.x - miniBoss.x;
            const dy = pl.y - miniBoss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const vx = (dx / dist) * bulletSpeed;
            const vy = (dy / dist) * bulletSpeed;
            eb.push(G.Bullet.Pool.acquire(miniBoss.x, miniBoss.y + 60, vx, vy, miniBoss.color, 8, 8, false));
        } else if (phase === 1) {
            for (let angle = -0.3; angle <= 0.3; angle += 0.3) {
                if (!_deps.canSpawnEnemyBullet()) break;
                const dx = pl.x - miniBoss.x;
                const dy = pl.y - miniBoss.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const baseAngle = Math.atan2(dy, dx) + angle;
                const vx = Math.cos(baseAngle) * bulletSpeed;
                const vy = Math.sin(baseAngle) * bulletSpeed;
                eb.push(G.Bullet.Pool.acquire(miniBoss.x, miniBoss.y + 60, vx, vy, miniBoss.color, 8, 8, false));
            }
        } else {
            for (let i = 0; i < 8; i++) {
                if (!_deps.canSpawnEnemyBullet()) break;
                const angle = (Math.PI * 2 / 8) * i + miniBoss.animTime;
                const vx = Math.cos(angle) * bulletSpeed * 0.8;
                const vy = Math.sin(angle) * bulletSpeed * 0.8;
                eb.push(G.Bullet.Pool.acquire(miniBoss.x, miniBoss.y + 40, vx, vy, miniBoss.color, 6, 6, false));
            }
        }
    }

    // S12.5 (v7.32): draw a polygon with N sides
    function _drawPolygon(ctx, sides, radius, rotation) {
        ctx.beginPath();
        for (var i = 0; i < sides; i++) {
            var a = (Math.PI * 2 / sides) * i + rotation;
            var px = Math.cos(a) * radius;
            var py = Math.sin(a) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    // S12.5 (v7.32): draw a diamond (rotated square)
    function _drawDiamond(ctx, radius) {
        ctx.beginPath();
        ctx.moveTo(0, -radius);
        ctx.lineTo(radius * 0.7, 0);
        ctx.lineTo(0, radius);
        ctx.lineTo(-radius * 0.7, 0);
        ctx.closePath();
    }

    // S12.5 (v7.32): draw a jagged hexagon with per-frame vertex jitter
    function _drawJaggedHex(ctx, radius, t) {
        ctx.beginPath();
        for (var i = 0; i < 6; i++) {
            var a = (Math.PI * 2 / 6) * i - Math.PI / 2;
            var jitter = Math.sin(t * 12 + i * 2.3) * 4;
            var r = radius + jitter;
            var hx = Math.cos(a) * r;
            var hy = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
    }

    // S12.5 (v7.32): draw bloc-specific shape
    function _drawShape(ctx, shape, radius, t, rgb, hpPct) {
        if (shape === 'HEAVY_HEX') {
            // Larger hexagon with angular edges
            for (var i = 0; i < 6; i++) {
                var a = (Math.PI * 2 / 6) * i - Math.PI / 2;
                var hx = Math.cos(a) * radius;
                var hy = Math.sin(a) * radius;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
        } else if (shape === 'OCTAGON') {
            _drawPolygon(ctx, 8, radius, Math.PI / 8);
        } else if (shape === 'DIAMOND') {
            _drawDiamond(ctx, radius);
        } else if (shape === 'JAGGED_HEX') {
            _drawJaggedHex(ctx, radius, t);
        } else {
            // Fallback: standard hexagon
            for (var fi = 0; fi < 6; fi++) {
                var fa = (Math.PI * 2 / 6) * fi - Math.PI / 2;
                var fx = Math.cos(fa) * radius;
                var fy = Math.sin(fa) * radius;
                if (fi === 0) ctx.moveTo(fx, fy);
                else ctx.lineTo(fx, fy);
            }
            ctx.closePath();
        }
    }

    // S12.5 (v7.32): draw bloc-specific VFX
    function _drawVFX(ctx, visual, t, rgb, pulse) {
        if (!visual) return;

        // USA: twin exhaust trails
        if (visual.shape === 'HEAVY_HEX' && visual.trailCount) {
            var trailColor = visual.trailColor || '#ff4400';
            var tcRgb = G.ColorUtils.hexToRgb(trailColor);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.3 + pulse * 0.1;
            for (var ti = 0; ti < visual.trailCount; ti++) {
                var tx = (ti === 0 ? -20 : 20);
                ctx.strokeStyle = `rgba(${tcRgb}, 0.4)`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(tx, 50);
                ctx.quadraticCurveTo(tx + Math.sin(t * 8 + ti) * 8, 80, tx + Math.sin(t * 6 + ti) * 12, 110);
                ctx.stroke();
            }
            ctx.restore();
        }

        // EU: rotating star ring
        if (visual.starRing) {
            var starCount = visual.starCount || 12;
            var trimColor = visual.trimColor || '#ffcc00';
            var tcRgb2 = G.ColorUtils.hexToRgb(trimColor);
            ctx.save();
            ctx.globalAlpha = 0.5;
            for (var si = 0; si < starCount; si++) {
                var sa = (Math.PI * 2 / starCount) * si + t * 0.5;
                var sr = 68;
                var sx = Math.cos(sa) * sr;
                var sy = Math.sin(sa) * sr;
                ctx.fillStyle = `rgba(${tcRgb2}, ${0.3 + Math.sin(t * 3 + si) * 0.2})`;
                ctx.beginPath();
                // Small 5-pointed star
                for (var sp = 0; sp < 5; sp++) {
                    var spa = (Math.PI * 2 / 5) * sp - Math.PI / 2 + sa;
                    var outerR = 4;
                    var innerR = 2;
                    var ox = sx + Math.cos(spa) * outerR;
                    var oy = sy + Math.sin(spa) * outerR;
                    var ix = sx + Math.cos(spa + Math.PI / 5) * innerR;
                    var iy = sy + Math.sin(spa + Math.PI / 5) * innerR;
                    if (sp === 0) ctx.moveTo(ox, oy);
                    else ctx.lineTo(ox, oy);
                    ctx.lineTo(ix, iy);
                }
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }

        // ASIA: flash on direction change (shown as brief white overlay)
        if (visual.flashOnDirectionChange && miniBoss.moveState) {
            var ms = miniBoss.moveState;
            if (ms.hovering && ms.hoverTimer > (visual.hoverDuration || 1.5) - 0.2) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.15;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, 70, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // EMERGING: flickering aura
        if (visual.flickerAura) {
            var flickerSpd = visual.flickerSpeed || 8.0;
            var flickerAlpha = 0.1 + Math.abs(Math.sin(t * flickerSpd)) * 0.2;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = flickerAlpha;
            ctx.fillStyle = miniBoss.color;
            ctx.beginPath();
            ctx.arc(0, 0, 80 + pulse * 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // S12.5 (v7.32): draw bloc-specific phase dots
    function _drawPhaseDots(ctx, phase, color, radius) {
        for (var p = 0; p < 3; p++) {
            if (phase < p) continue;
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = color;

            if (p === 0) {
                // All blocs: base dot at bottom
                ctx.beginPath();
                ctx.arc(0, radius + 12, 7, 0, Math.PI * 2);
                ctx.fill();
            } else if (p === 1) {
                // Second dot position varies by style
                ctx.beginPath();
                ctx.arc(-12, radius + 12, 7, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Third dot position varies by style
                ctx.beginPath();
                ctx.arc(12, radius + 12, 7, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        // Inner phase dots (always visible positions)
        for (var p2 = 0; p2 < 3; p2++) {
            var dotX, dotY;
            if (p2 === 0) { dotX = 0; dotY = radius + 12; }
            else if (p2 === 1) { dotX = -12; dotY = radius + 12; }
            else { dotX = 12; dotY = radius + 12; }
            ctx.fillStyle = phase >= p2 ? color : '#333';
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function draw(ctx) {
        if (!miniBoss || !miniBoss.active) return;

        if (miniBoss instanceof G.Boss) {
            miniBoss.draw(ctx);
            return;
        }

        ctx.save();
        ctx.translate(miniBoss.x, miniBoss.y);

        const hpPct = miniBoss.hp / miniBoss.maxHp;
        const pulse = Math.sin(miniBoss.animTime * 3.5) * 0.12;
        const rgb = G.ColorUtils.hexToRgb(miniBoss.color);
        const isDamaged = hpPct < 0.3;
        const t = miniBoss.animTime;

        // S12.5 (v7.32): resolve bloc visual config
        const _blocCfg = Balance.ARCADE && Balance.ARCADE.MINI_BOSS_PATTERNS ? Balance.ARCADE.MINI_BOSS_PATTERNS[miniBoss.bloc] : null;
        const visual = (_blocCfg && _blocCfg.visual) || null;
        const shape = (visual && visual.shape) || 'HEXAGON';
        const shapeRadius = (visual && visual.radius) || 56;

        // ── Outer glow (additive) ──
        ctx.globalCompositeOperation = 'lighter';
        var glowRadius = shape === 'HEAVY_HEX' ? 110 : 100;
        const glowGrad = ctx.createRadialGradient(0, 0, 15, 0, 0, glowRadius);
        glowGrad.addColorStop(0, `rgba(${rgb}, 0.35)`);
        glowGrad.addColorStop(0.5, `rgba(${rgb}, 0.12)`);
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius + pulse * 20, 0, Math.PI * 2);
        ctx.fill();

        // Rotating outer ring
        ctx.strokeStyle = `rgba(${rgb}, 0.20)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, shape === 'HEAVY_HEX' ? 80 : 72, t * 0.8, t * 0.8 + Math.PI * 1.6);
        ctx.stroke();

        ctx.globalCompositeOperation = 'source-over';

        // ── Bloc-specific VFX (behind body) ──
        _drawVFX(ctx, visual, t, rgb, pulse);

        // ── Body shape ──
        const bodyGrad = ctx.createLinearGradient(0, -shapeRadius, 0, shapeRadius);
        bodyGrad.addColorStop(0, `rgba(${rgb}, 0.85)`);
        bodyGrad.addColorStop(1, `rgba(${rgb}, 0.50)`);
        ctx.fillStyle = bodyGrad;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 3;

        _drawShape(ctx, shape, shapeRadius, t, rgb, hpPct);
        ctx.fill();
        ctx.stroke();

        // Edge highlight
        ctx.strokeStyle = `rgba(${rgb}, 0.45)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // EU: gold trim ring
        if (visual && visual.trimColor) {
            var trimRgb = G.ColorUtils.hexToRgb(visual.trimColor);
            ctx.strokeStyle = `rgba(${trimRgb}, 0.6)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, shapeRadius + 4, 0, Math.PI * 2);
            ctx.stroke();
        }

        // ── Inner ring ──
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, shape === 'HEAVY_HEX' ? 44 : 40, 0, Math.PI * 2);
        ctx.stroke();

        // ── Dark core ──
        ctx.fillStyle = '#08081a';
        ctx.beginPath();
        ctx.arc(0, 0, (shape === 'HEAVY_HEX' ? 41 : 37), 0, Math.PI * 2);
        ctx.fill();

        // ── Currency symbol with additive glow ──
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.25 + pulse * 0.1;
        ctx.fillStyle = miniBoss.color;
        var symbolSize = shape === 'HEAVY_HEX' ? 66 : 62;
        ctx.font = `bold ${symbolSize}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(miniBoss.symbol, 0, 0);
        ctx.restore();
        ctx.fillStyle = isDamaged ? '#fff' : '#f0f0ff';
        ctx.font = `bold ${symbolSize - 6}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(miniBoss.symbol, 0, 0);

        // ── Damage cracks + red flash (<30% HP) ──
        if (isDamaged) {
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-28, -22); ctx.lineTo(-12, -6); ctx.lineTo(-20, 12);
            ctx.moveTo(22, -16); ctx.lineTo(30, 6); ctx.lineTo(16, 24);
            ctx.moveTo(6, -36); ctx.lineTo(0, -26);
            ctx.stroke();

            ctx.fillStyle = `rgba(255, 0, 0, ${0.08 + Math.abs(pulse) * 0.35})`;
            ctx.beginPath();
            ctx.arc(0, 0, shapeRadius - 8, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Phase dots (bloc-specific style) ──
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        _drawPhaseDots(ctx, miniBoss.phase, miniBoss.color, shapeRadius);
        ctx.restore();

        // ── HP bar ──
        const barW = shape === 'HEAVY_HEX' ? 128 : 114;
        const barH = 7, barY = shapeRadius + 28;
        ctx.fillStyle = '#15152a';
        ctx.fillRect(-barW / 2, barY, barW, barH);
        const barGrad = ctx.createLinearGradient(-barW / 2, 0, -barW / 2 + barW * hpPct, 0);
        barGrad.addColorStop(0, isDamaged ? '#ff3333' : miniBoss.color);
        barGrad.addColorStop(1, isDamaged ? '#ff7777' : '#ffffff');
        ctx.fillStyle = barGrad;
        ctx.fillRect(-barW / 2, barY, barW * hpPct, barH);
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barW / 2, barY, barW, barH);

        // ── Name (bloc-specific warning text) ──
        var warningText = (visual && visual.warningText) || (miniBoss.name + ' BOSS');
        ctx.fillStyle = isDamaged ? '#ff7777' : '#bbb';
        ctx.font = 'bold 13px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(warningText, 0, barY + 20);

        ctx.restore();
    }

    function checkHit(b) {
        if (!miniBoss || !miniBoss.active) return false;
        if (miniBoss.isEntering) return false; // Invulnerable during entrance

        const { player, runState, score: getScore, setScore, marketCycle,
                waveMgr, setEnemies, enemyBullets: getEB, setEnemyBullets,
                showVictory, createEnemyDeathExplosion, createExplosion,
                setShake, totalTime: getTotalTime, setWaveStartTime,
                setBossJustDefeated } = _deps;

        const isBossInstance = miniBoss instanceof G.Boss;
        const hitboxW = isBossInstance ? miniBoss.width / 2 : 44;
        const hitboxH = isBossInstance ? miniBoss.height / 2 : 44;
        const bossX = isBossInstance ? (miniBoss.x + miniBoss.width / 2) : miniBoss.x;
        const bossY = isBossInstance ? (miniBoss.y + miniBoss.height / 2) : miniBoss.y;

        if (Math.abs(b.x - bossX) < hitboxW && Math.abs(b.y - bossY) < hitboxH) {
            const pl = player();
            const rs = runState();
            const baseDmg = pl.stats.baseDamage ?? 14;
            let dmg = baseDmg;

            if (isBossInstance) {
                miniBoss.damage(dmg);
            } else {
                miniBoss.hp -= dmg;
            }
            G.Audio.play('hitEnemy');

            // S12.4 (v7.32): Perk drop roll on miniboss hit
            if (miniBoss.hp > 0 && G.DropSystem && G.DropSystem.tryMinibossDrop) {
                var _dropInfo = G.DropSystem.tryMinibossDrop(miniBoss.x, miniBoss.y, getTotalTime());
                if (_dropInfo && _deps.addPowerUp) {
                    _deps.addPowerUp(new G.PowerUp(_dropInfo.x, _dropInfo.y, _dropInfo.type));
                    G.Audio.play('coinPerk');
                    if (G.Debug && G.Debug.trackDropSpawned) G.Debug.trackDropSpawned(_dropInfo.type, _dropInfo.category, 'miniboss');
                }
            }

            if (miniBoss.hp <= 0) {
                G.Debug.trackMiniBossDefeat(isBossInstance ? miniBoss.bossType : miniBoss.name);

                if (G.Debug._miniBossStartInfo) {
                    const info = G.Debug._miniBossStartInfo;
                    const duration = Date.now() - info.startTime;
                    G.Debug.trackMiniBossFight(info.type, info.trigger, info.killCount, duration);
                    G.Debug._miniBossStartInfo = null;
                }

                // S12.3 (v7.32): Clean up orbit/homing bullets spawned by miniboss attacks
                if (miniBoss.attackState) {
                    var as = miniBoss.attackState;
                    if (as.orbitBullets) {
                        for (var oci = 0; oci < as.orbitBullets.length; oci++) {
                            if (as.orbitBullets[oci] && !as.orbitBullets[oci].markedForDeletion) {
                                as.orbitBullets[oci].markedForDeletion = true;
                                G.Bullet.Pool.release(as.orbitBullets[oci]);
                            }
                        }
                    }
                    if (as.homingBullets) {
                        for (var hci = 0; hci < as.homingBullets.length; hci++) {
                            if (as.homingBullets[hci] && !as.homingBullets[hci].markedForDeletion) {
                                as.homingBullets[hci].markedForDeletion = true;
                                G.Bullet.Pool.release(as.homingBullets[hci]);
                            }
                        }
                    }
                }

                // Ghost bullet fix
                const eb = getEB();
                if (eb.length > 0) {
                    G.Debug.log('BULLET', `[MINIBOSS] Cleared ${eb.length} ghost bullets on mini-boss defeat`);
                    eb.forEach(b2 => G.Bullet.Pool.release(b2));
                    eb.length = 0;
                    window.enemyBullets = eb;
                }

                if (G.HarmonicConductor) G.HarmonicConductor.reset();
                setBossJustDefeated(true);

                const bonusScore = isBossInstance ? 3000 * marketCycle() : 2000 * marketCycle();
                const newScore = getScore() + bonusScore;
                setScore(newScore);
                _deps.updateScore(newScore);

                const deathX = isBossInstance ? (miniBoss.x + miniBoss.width / 2) : miniBoss.x;
                const deathY = isBossInstance ? (miniBoss.y + miniBoss.height / 2) : miniBoss.y;
                const deathColor = isBossInstance ? (miniBoss.color || '#ffffff') : miniBoss.color;
                const deathSymbol = isBossInstance ? (miniBoss.symbol || '$') : miniBoss.symbol;
                const deathName = isBossInstance ? (miniBoss.name || 'BOSS') : miniBoss.name;

                createEnemyDeathExplosion(deathX, deathY, deathColor, deathSymbol);
                createExplosion(deathX - 40, deathY - 30, deathColor, 15);
                createExplosion(deathX + 40, deathY + 30, deathColor, 15);
                createExplosion(deathX, deathY, '#fff', 20);

                showVictory(deathName + ' ' + _deps.t('DESTROYED'));
                G.MemeEngine.queueMeme('MINI_BOSS_DEFEATED', isBossInstance ? "CENTRAL BANK REKT!" : "FIAT IS DEAD!", deathName);
                if (G.StatsTracker && G.StatsTracker.recordMiniBossDefeat) G.StatsTracker.recordMiniBossDefeat();
                setShake(40);
                G.Audio.play('explosion');

                if (window.Game.applyHitStop) window.Game.applyHitStop('BOSS_DEFEAT_SLOWMO', false);
                if (window.Game.triggerScreenFlash) window.Game.triggerScreenFlash('BOSS_DEFEAT');

                // S12.1 (v7.32): Continuous-action — only Boss-instance minibosses
                // need resumeStreaming. Legacy minibosses never suspended the wave.
                if (isBossInstance) {
                    var restored = (waveMgr && typeof waveMgr.resumeStreaming === 'function')
                        ? waveMgr.resumeStreaming()
                        : [];
                    setEnemies(restored);
                    setWaveStartTime(getTotalTime());
                    if (G.HarmonicConductor) G.HarmonicConductor.enemies = restored;
                } else {
                    setWaveStartTime(getTotalTime());
                }

                // Arcade: mini-boss defeat → modifier choice (2-card)
                // During the modifier pick window, prevent WaveManager from triggering
                // a full boss spawn or intermission by keeping waveInProgress true.
                if (G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode() && G.ModifierChoiceScreen) {
                    if (waveMgr) waveMgr.waveInProgress = true;
                    const picks = (G.Balance.ARCADE && G.Balance.ARCADE.MODIFIERS && G.Balance.ARCADE.MODIFIERS.POST_MINIBOSS_PICKS) || 2;
                    const _showModChoice = () => {
                        const rs = G.RunState;
                        const extraL = rs.arcadeBonuses.extraLives;
                        if (extraL !== 0 && G.adjustLives) {
                            G.adjustLives(extraL);
                            rs.arcadeBonuses.extraLives = 0;
                        }
                        // Unblock WaveManager now that modifier pick is done
                        if (waveMgr) {
                            waveMgr.miniBossActive = false;
                            waveMgr.waveInProgress = false;
                        }
                    };
                    if (typeof bossDeathTimeout === 'function') {
                        bossDeathTimeout(_showModChoice, 800);
                    } else {
                        setTimeout(_showModChoice, 800);
                    }
                } else {
                    if (waveMgr) waveMgr.miniBossActive = false;
                    // Legacy path (non-arcade): enemies were never cleared, just unblock the wave
                    waveMgr.waveInProgress = false;
                    setWaveStartTime(getTotalTime());
                }

                // S12.4 (v7.32): Reset miniboss drop tracking on defeat
                if (G.DropSystem && G.DropSystem.resetMinibossDrops) G.DropSystem.resetMinibossDrops();

                miniBoss = null;
                window.miniBoss = null;
            }
            return true;
        }
        return false;
    }

    function clear() {
        if (miniBoss) {
            miniBoss.active = false;
            if (_deps.waveMgr) _deps.waveMgr.miniBossActive = false;
        }
        // S12.4 (v7.32): Reset miniboss drop tracking on clear
        if (G.DropSystem && G.DropSystem.resetMinibossDrops) G.DropSystem.resetMinibossDrops();
        miniBoss = null;
        window.miniBoss = null;
    }

    function reset() {
        // S12.4 (v7.32): Reset miniboss drop tracking on reset
        if (G.DropSystem && G.DropSystem.resetMinibossDrops) G.DropSystem.resetMinibossDrops();
        if (_deps && _deps.waveMgr) {
            _deps.waveMgr.miniBossActive = false;
            _deps.waveMgr.waveInProgress = false;
        }
        miniBoss = null;
        window.miniBoss = null;
    }

    G.MiniBossManager = {
        init,
        get,
        isActive,
        spawn,
        update,
        draw,
        checkHit,
        clear,
        reset
    };
})();
