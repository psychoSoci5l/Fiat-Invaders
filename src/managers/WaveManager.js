window.Game = window.Game || {};

/**
 * WaveManager v4.0 - Complete Wave/Horde Redesign
 *
 * Features:
 * - 15 unique waves (5 per cycle × 3 cycles)
 * - Variable enemy counts per wave (8-24)
 * - Thematic currency assignments per horde
 * - 15+ unique formations
 * - Horde 1 vs Horde 2 differentiation
 */
window.Game.WaveManager = {
    wave: 1,
    waveInProgress: false,
    intermissionTimer: 0,

    // Horde system (2 hordes per wave)
    currentHorde: 1,              // 1 or 2
    hordeTransitionTimer: 0,
    isHordeTransition: false,
    hordeSpawned: false,          // True if current horde was spawned

    init() {
        this.reset();
    },

    reset() {
        const dbg = window.Game.Debug;
        dbg.log('WAVE', `[WM] RESET called. Previous wave=${this.wave}`);
        this.wave = 1;
        this.waveInProgress = false;
        this.intermissionTimer = 0;
        this.miniBossActive = false;
        this.currentHorde = 1;
        this.hordeTransitionTimer = 0;
        this.isHordeTransition = false;
        this.hordeSpawned = false;
        dbg.log('WAVE', `[WM] RESET complete. wave=${this.wave}`);
    },

    getWavesPerCycle() {
        const Balance = window.Game.Balance;
        return Balance ? Balance.WAVES.PER_CYCLE : 5;
    },

    getHordesPerWave() {
        const Balance = window.Game.Balance;
        return Balance?.WAVES?.HORDES_PER_WAVE || 2;
    },

    getHordeTransitionDuration() {
        const Balance = window.Game.Balance;
        return Balance?.WAVES?.HORDE_TRANSITION_DURATION || 0.8;
    },

    startHordeTransition() {
        this.isHordeTransition = true;
        this.hordeTransitionTimer = this.getHordeTransitionDuration();
    },

    completeHordeTransition() {
        this.isHordeTransition = false;
        this.currentHorde = 2;
    },

    update(dt, gameState, enemiesCount, bossActive) {
        const G = window.Game;

        if (gameState === 'INTERMISSION') {
            this.intermissionTimer -= dt;
            if (this.intermissionTimer <= 0) {
                return { action: 'START_WAVE' };
            }
            return null;
        }

        if (this.isHordeTransition) {
            this.hordeTransitionTimer -= dt;
            if (this.hordeTransitionTimer <= 0) {
                this.completeHordeTransition();
                return { action: 'START_HORDE_2' };
            }
            return null;
        }

        if (!bossActive && !this.miniBossActive && enemiesCount === 0 && !this.waveInProgress && gameState === 'PLAY') {
            const dbg = window.Game.Debug;
            this.waveInProgress = true;
            dbg.log('WAVE', `[WM] Action triggered. wave=${this.wave}, horde=${this.currentHorde}, hordeSpawned=${this.hordeSpawned}, enemiesCount=${enemiesCount}`);

            if (this.currentHorde === 1 && this.hordeSpawned && this.getHordesPerWave() > 1) {
                this.hordeSpawned = false;
                dbg.log('HORDE', `[WM] → START_HORDE_TRANSITION`);
                return { action: 'START_HORDE_TRANSITION' };
            } else {
                this.currentHorde = 1;
                this.hordeSpawned = false;
                if (this.wave <= this.getWavesPerCycle()) {
                    dbg.log('WAVE', `[WM] → START_INTERMISSION (wave ${this.wave} <= ${this.getWavesPerCycle()})`);
                    return { action: 'START_INTERMISSION' };
                } else {
                    dbg.log('BOSS', `[WM] → SPAWN_BOSS (wave ${this.wave} > ${this.getWavesPerCycle()})`);
                    return { action: 'SPAWN_BOSS' };
                }
            }
        }

        return null;
    },

    /**
     * Spawn wave using new definition system
     */
    spawnWave(gameWidth, hordeNumber = 1) {
        const G = window.Game;
        const Balance = G.Balance;
        const dbg = G.Debug;
        const enemies = [];

        const cycle = window.marketCycle || 1;
        const waveInCycle = ((this.wave - 1) % this.getWavesPerCycle()) + 1;

        // Get wave definition
        const waveDef = Balance.getWaveDefinition(cycle, waveInCycle);

        if (waveDef) {
            // Use new definition system
            dbg.log('WAVE', `[WM] Using wave definition: ${waveDef.name} (C${waveDef.cycle}W${waveDef.wave})`);
            const hordeKey = hordeNumber === 1 ? 'horde1' : 'horde2';
            const hordeDef = waveDef[hordeKey];

            // Apply Bear Market scaling + Rank system adjustment
            let targetCount = hordeDef.count;
            if (window.isBearMarket) {
                const bearMult = Balance.WAVE_DEFINITIONS.BEAR_MARKET.COUNT_MULT || 1.25;
                targetCount = Math.floor(targetCount * bearMult);
            }
            // v4.6.1: Cycle scaling — more enemies in later cycles to match player power
            const cycleMult = Balance.WAVE_DEFINITIONS.CYCLE_COUNT_MULT?.[Math.min(cycle - 1, 2)] || 1.0;
            targetCount = Math.floor(targetCount * cycleMult);

            // v4.1.0: Rank-based enemy count adjustment
            if (G.RankSystem) {
                targetCount = Math.max(4, Math.round(targetCount * G.RankSystem.getEnemyCountMultiplier()));
            }

            // Generate positions using formation
            const positions = this.generateFormation(
                hordeDef.formation,
                targetCount,
                gameWidth
            );

            // Assign currencies to positions
            const currencyAssignments = this.assignCurrencies(
                positions,
                hordeDef.currencies,
                cycle,
                window.isBearMarket
            );

            // Get horde modifiers
            const hordeMods = Balance.getHordeModifiers(hordeNumber);

            // Choose entry path (weighted random)
            const entryPath = (hordeMods.entryStyle === 'rapid') ? 'SINE' : this._pickEntryPath();
            dbg.log('WAVE', `[WM] Entry path: ${entryPath}`);

            // Spawn enemies
            for (let i = 0; i < positions.length; i++) {
                const pos = positions[i];
                const currencySymbol = currencyAssignments[i];
                const currencyType = Balance.getCurrencyBySymbol(currencySymbol);

                if (!currencyType) {
                    dbg.log('WAVE', `[WM] Warning: Unknown currency ${currencySymbol}`);
                    continue;
                }

                const enemy = this.createEnemy(pos, currencyType, cycle, hordeMods, i, entryPath, gameWidth);
                enemies.push(enemy);
            }

            dbg.log('WAVE', `[WM] Spawned ${enemies.length} enemies with formation ${hordeDef.formation}`);
        } else {
            // Fallback to legacy system
            dbg.log('WAVE', `[WM] No definition for C${cycle}W${waveInCycle}, using legacy spawn`);
            return this.spawnWaveLegacy(gameWidth, hordeNumber);
        }

        this.hordeSpawned = true;

        const hordesPerWave = this.getHordesPerWave();
        if (hordeNumber >= hordesPerWave) {
            this.wave++;
            dbg.log('WAVE', `[WM] Wave incremented to ${this.wave} (after horde ${hordeNumber})`);
        }
        this.waveInProgress = false;

        // Determine pattern for movement (based on formation)
        const movementPattern = this.getMovementPattern(waveDef ? waveDef[hordeNumber === 1 ? 'horde1' : 'horde2'].formation : 'RECT');

        return { enemies: enemies, pattern: movementPattern, hordeNumber: hordeNumber };
    },

    /**
     * Pick weighted random entry path
     */
    _pickEntryPath() {
        const Balance = window.Game.Balance;
        const paths = Balance?.FORMATION_ENTRY?.PATHS;
        if (!paths) return 'SINE';
        const entries = Object.entries(paths);
        const totalW = entries.reduce((s, [, v]) => s + (v.weight || 1), 0);
        let r = Math.random() * totalW;
        for (const [name, cfg] of entries) {
            r -= (cfg.weight || 1);
            if (r <= 0) return name;
        }
        return 'SINE';
    },

    /**
     * Create a single enemy with proper configuration
     */
    createEnemy(pos, currencyType, cycle, hordeMods, index, entryPath, gameWidth) {
        const G = window.Game;
        const Balance = G.Balance;
        const level = window.currentLevel || 1;

        // Scale HP based on difficulty + APC multiplier (v4.59)
        const diff = Balance.calculateDifficulty(level, cycle);
        const apcMult = (G.RunState && G.RunState.cyclePower) ? G.RunState.cyclePower.hpMult : 1.0;
        const scaledHP = Balance.calculateEnemyHP(diff, cycle) * apcMult;
        const scaledType = Object.assign({}, currencyType, {
            hp: currencyType.hp * scaledHP
        });

        // Formation entry setup
        const formationConfig = Balance?.FORMATION_ENTRY || {};
        const entryEnabled = formationConfig.ENABLED !== false;
        const spawnYOffset = formationConfig.SPAWN_Y_OFFSET || -80;
        const staggerDelay = formationConfig.STAGGER_DELAY || 0.08;
        const path = entryPath || 'SINE';
        const gw = gameWidth || G._gameWidth || 400;

        // Calculate spawn position based on entry path
        let spawnX = pos.x;
        let spawnY = entryEnabled ? spawnYOffset : pos.y;
        if (entryEnabled) {
            if (path === 'SWEEP') {
                // Enter from left or right side
                spawnX = (pos.x < gw / 2) ? -40 : gw + 40;
                spawnY = pos.y + (Math.random() - 0.5) * 40;
            } else if (path === 'SPIRAL') {
                // Spiral down from center top
                const angle = (index / 12) * Math.PI * 2;
                const radius = 30 + index * 8;
                spawnX = gw / 2 + Math.cos(angle) * radius;
                spawnY = spawnYOffset;
            } else if (path === 'SPLIT') {
                // Two groups from opposite sides
                spawnX = (index % 2 === 0) ? -40 : gw + 40;
                spawnY = spawnYOffset + Math.abs(index - 6) * 10;
            }
        }

        const enemy = new G.Enemy(spawnX, spawnY, scaledType);

        // Entry animation
        if (entryEnabled) {
            enemy.isEntering = true;
            enemy.entryPath = path;
            enemy.targetX = pos.x;
            enemy.targetY = pos.y;
            enemy.baseY = pos.y;

            // Horde 2 has rapid entry
            const entryMult = hordeMods.entryStyle === 'rapid' ? 0.5 : 1.0;
            enemy.entryDelay = index * staggerDelay * entryMult;
            enemy.hasSettled = false;
        } else {
            enemy.isEntering = false;
            enemy.hasSettled = true;
        }

        // Apply horde behavior bonuses
        const behaviorChance = Math.min(0.5, 0.1 + cycle * 0.1) + hordeMods.behaviorBonus;

        // Determine tier and apply behaviors
        const symbol = currencyType.s;
        if (Balance.TIERS.WEAK.includes(symbol)) {
            enemy.isKamikaze = Math.random() < behaviorChance * 0.5;
        } else if (Balance.TIERS.STRONG.includes(symbol)) {
            enemy.canTeleport = Math.random() < behaviorChance;
        }

        // Fire rate with horde modifier
        const baseFireDelay = (index * 0.15) + (Math.random() * 0.2);
        enemy.fireTimer = baseFireDelay / hordeMods.fireRateMult;

        return enemy;
    },

    /**
     * Assign currencies to positions based on allowed list
     */
    assignCurrencies(positions, allowedCurrencies, cycle, isBearMarket) {
        const Balance = window.Game.Balance;
        const FC = Balance?.FORMATION || {};
        const rowTolerance = FC.ROW_TOLERANCE || 25;
        const assignments = new Array(positions.length);

        // Bear Market: force strong currencies if none present
        let currencies = [...allowedCurrencies];
        if (isBearMarket && Balance.WAVE_DEFINITIONS.BEAR_MARKET.FORCE_STRONG) {
            const strongSymbols = currencies.filter(c => Balance.TIERS.STRONG.includes(c));
            if (strongSymbols.length === 0) {
                currencies.push('$', '元');
            }
        }

        // Sort currencies by tier: weak → medium → strong
        const tierOrder = (sym) => {
            if (Balance.TIERS.WEAK.includes(sym)) return 0;
            if (Balance.TIERS.MEDIUM.includes(sym)) return 1;
            return 2; // STRONG
        };
        currencies.sort((a, b) => tierOrder(a) - tierOrder(b));

        // Group position indices into rows by Y-proximity
        const indexed = positions.map((p, i) => ({ y: p.y, idx: i }));
        indexed.sort((a, b) => a.y - b.y);

        const rows = []; // each row = array of original indices
        let currentRowY = indexed[0].y;
        let currentRow = [indexed[0].idx];

        for (let i = 1; i < indexed.length; i++) {
            if (Math.abs(indexed[i].y - currentRowY) <= rowTolerance) {
                currentRow.push(indexed[i].idx);
            } else {
                rows.push(currentRow);
                currentRowY = indexed[i].y;
                currentRow = [indexed[i].idx];
            }
        }
        rows.push(currentRow);

        // Assign one currency per row, cycling through sorted list
        for (let r = 0; r < rows.length; r++) {
            const currency = currencies[r % currencies.length];
            for (const idx of rows[r]) {
                assignments[idx] = currency;
            }
        }

        const dbg = window.Game.Debug;
        const rowDetail = rows.map((r, i) => `Y${Math.round(positions[r[0]].y)}:${currencies[i % currencies.length]}×${r.length}`).join(' ');
        dbg.log('WAVE', `[WM] Currency rows: ${rows.length} rows from ${positions.length} pos → ${rowDetail}`);

        return assignments;
    },

    /**
     * Get movement pattern based on formation
     */
    getMovementPattern(formation) {
        const patterns = {
            'DIAMOND': 'V_SHAPE',
            'ARROW': 'V_SHAPE',
            'PINCER': 'RECT',
            'CHEVRON': 'V_SHAPE',
            'FORTRESS': 'RECT',
            'SCATTER': 'SINE_WAVE',
            'SPIRAL': 'SINE_WAVE',
            'CROSS': 'RECT',
            'WALL': 'RECT',
            'GAUNTLET': 'COLUMNS',
            'VORTEX': 'SINE_WAVE',
            'FLANKING': 'COLUMNS',
            'STAIRCASE': 'RECT',
            'STAIRCASE_REVERSE': 'RECT',
            'HURRICANE': 'SINE_WAVE',
            'FINAL_FORM': 'SINE_WAVE'
        };
        return patterns[formation] || 'RECT';
    },

    // ========================================
    // FORMATION GENERATORS
    // ========================================

    /**
     * Generate formation positions
     */
    generateFormation(formationName, count, gameWidth) {
        const safeOffset = window.safeAreaInsets?.top || 0;
        // v4.0.3: Read from BalanceConfig instead of hardcoded values
        const FC = window.Game.Balance?.FORMATION || {};
        const Balance = window.Game.Balance;
        const baseWidth = Balance?.GAME?.BASE_WIDTH || 600;
        const gameH = window.Game._gameHeight || 700;
        const baseHeight = 800;

        // v4.32: Responsive spacing — scales with screen width ratio
        let spacing = FC.SPACING || 75;
        if (FC.RESPONSIVE) {
            const widthRatio = gameWidth / baseWidth;
            spacing = Math.max(FC.SPACING_MIN || 62, Math.round(spacing * widthRatio));
        }

        let startY = (FC.START_Y || 150) + safeOffset;
        if (FC.RESPONSIVE && FC.START_Y_RESPONSIVE) {
            const heightRatio = gameH / baseHeight;
            startY = Math.round(((FC.START_Y || 150) * heightRatio)) + safeOffset;
        }

        let positions;
        switch (formationName) {
            case 'DIAMOND': positions = this.generateDiamond(count, gameWidth, startY, spacing); break;
            case 'ARROW': positions = this.generateArrow(count, gameWidth, startY, spacing); break;
            case 'PINCER': positions = this.generatePincer(count, gameWidth, startY, spacing); break;
            case 'CHEVRON': positions = this.generateChevron(count, gameWidth, startY, spacing); break;
            case 'FORTRESS': positions = this.generateFortress(count, gameWidth, startY, spacing); break;
            case 'SCATTER': positions = this.generateScatter(count, gameWidth, startY, spacing); break;
            case 'SPIRAL': positions = this.generateSpiral(count, gameWidth, startY, spacing); break;
            case 'CROSS': positions = this.generateCross(count, gameWidth, startY, spacing); break;
            case 'WALL': positions = this.generateWall(count, gameWidth, startY, spacing); break;
            case 'GAUNTLET': positions = this.generateGauntlet(count, gameWidth, startY, spacing); break;
            case 'VORTEX': positions = this.generateVortex(count, gameWidth, startY, spacing); break;
            case 'FLANKING': positions = this.generateFlanking(count, gameWidth, startY, spacing); break;
            case 'STAIRCASE': positions = this.generateStaircase(count, gameWidth, startY, spacing, true); break;
            case 'STAIRCASE_REVERSE': positions = this.generateStaircase(count, gameWidth, startY, spacing, false); break;
            case 'HURRICANE': positions = this.generateHurricane(count, gameWidth, startY, spacing); break;
            case 'FINAL_FORM': positions = this.generateFinalForm(count, gameWidth, startY, spacing); break;
            // Currency symbol formations
            case 'BTC_SYMBOL': positions = this.generateBtcSymbol(count, gameWidth, startY, spacing); break;
            case 'DOLLAR_SIGN': positions = this.generateDollarSign(count, gameWidth, startY, spacing); break;
            case 'EURO_SIGN': positions = this.generateEuroSign(count, gameWidth, startY, spacing); break;
            case 'YEN_SIGN': positions = this.generateYenSign(count, gameWidth, startY, spacing); break;
            case 'POUND_SIGN': positions = this.generatePoundSign(count, gameWidth, startY, spacing); break;
            // Legacy fallbacks
            case 'RECT': positions = this.generateRect(count, gameWidth, startY, spacing); break;
            case 'V_SHAPE': positions = this.generateVShape(count, gameWidth, startY, spacing); break;
            case 'COLUMNS': positions = this.generateColumns(count, gameWidth, startY, spacing); break;
            case 'SINE_WAVE': positions = this.generateRect(count, gameWidth, startY, spacing); break;
            default: positions = this.generateRect(count, gameWidth, startY, spacing); break;
        }

        // Log raw generator output
        const dbg = window.Game.Debug;
        const rawCount = positions.length;
        const rawMinX = positions.reduce((m, p) => Math.min(m, p.x), Infinity);
        const rawMaxX = positions.reduce((m, p) => Math.max(m, p.x), -Infinity);
        dbg.log('WAVE', `[WM] ${formationName}: raw ${rawCount}/${count} pos, X[${Math.round(rawMinX)}..${Math.round(rawMaxX)}] on ${gameWidth}px`);

        // Symmetric row-based thinning — preserves bilateral symmetry
        if (positions.length > count) {
            const rowTolerance = FC.ROW_TOLERANCE || 25;
            // Group positions into rows by Y-proximity
            const sorted = [...positions].sort((a, b) => a.y - b.y);
            const rows = [];
            let curRowY = sorted[0].y;
            let curRow = [sorted[0]];
            for (let i = 1; i < sorted.length; i++) {
                if (Math.abs(sorted[i].y - curRowY) <= rowTolerance) {
                    curRow.push(sorted[i]);
                } else {
                    curRow.sort((a, b) => a.x - b.x);
                    rows.push(curRow);
                    curRowY = sorted[i].y;
                    curRow = [sorted[i]];
                }
            }
            curRow.sort((a, b) => a.x - b.x);
            rows.push(curRow);

            let excess = positions.length - count;
            const cx = gameWidth / 2;
            while (excess > 0) {
                // Find widest row; ties → pick lowest (highest Y index)
                let maxW = 0, tgtR = -1;
                for (let r = rows.length - 1; r >= 0; r--) {
                    if (rows[r].length > maxW) { maxW = rows[r].length; tgtR = r; }
                }
                if (tgtR < 0 || rows[tgtR].length <= 1) break;
                // Remove rightmost, then re-center row around screen center
                rows[tgtR].pop();
                excess--;
                const row = rows[tgtR];
                if (row.length > 1) {
                    const shift = cx - (row[0].x + row[row.length - 1].x) / 2;
                    for (const p of row) p.x += shift;
                } else {
                    row[0].x = cx;
                }
            }
            // Rebuild positions from rows
            positions = [];
            for (const row of rows) {
                for (const p of row) positions.push({ x: p.x, y: p.y });
            }
            dbg.log('WAVE', `[WM] Symmetric thin: ${formationName} ${rawCount}→${positions.length} (${rows.length} rows)`);
        }

        // Safety net — fill missing positions with extra rows below
        if (positions.length < count) {
            dbg.log('WAVE', `[WM] Safety net: ${formationName} produced ${positions.length}/${count}, filling ${count - positions.length} extra`);
            const maxY = positions.reduce((m, p) => Math.max(m, p.y), startY);
            const margin = FC.MARGIN || 60;
            const cols = Math.max(3, Math.floor((gameWidth - 2 * margin) / spacing));
            // v4.48: Y-cap for safety net rows
            const gameH = window.Game._gameHeight || 700;
            const cycle = window.marketCycle || 1;
            const ratios = window.Game.Balance?.FORMATION?.MAX_Y_RATIO_BY_CYCLE;
            const maxYRatio = ratios ? (ratios[Math.min(cycle - 1, ratios.length - 1)] || 0.55) : (FC.MAX_Y_RATIO || 0.55);
            const maxPixel = FC.MAX_Y_PIXEL || 500;
            const safetyYBound = Math.min(gameH * maxYRatio, maxPixel);
            let extraRow = 1;
            while (positions.length < count) {
                const y = maxY + extraRow * spacing * 0.8;
                if (y > safetyYBound) break; // v4.48: stop adding rows below Y limit
                const rowCount = Math.min(cols, count - positions.length);
                const rowWidth = (rowCount - 1) * spacing;
                const rowStartX = (gameWidth - rowWidth) / 2;
                for (let c = 0; c < rowCount && positions.length < count; c++) {
                    positions.push({ x: rowStartX + c * spacing, y });
                }
                extraRow++;
            }
        }

        // X-clamping — prevent crash-down from edge detection
        const safeMargin = FC.SAFE_EDGE_MARGIN || 30;
        if (positions.length > 0) {
            const minX = positions.reduce((m, p) => Math.min(m, p.x), Infinity);
            const maxX = positions.reduce((m, p) => Math.max(m, p.x), -Infinity);
            const safeLeft = safeMargin;
            const safeRight = gameWidth - safeMargin;

            if (minX < safeLeft || maxX > safeRight) {
                const span = maxX - minX;
                const availableWidth = safeRight - safeLeft;
                const centerX = (minX + maxX) / 2;

                if (span > availableWidth) {
                    // Scale-to-fit: compress horizontally around center
                    const scale = availableWidth / span;
                    const newCenter = gameWidth / 2;
                    for (let i = 0; i < positions.length; i++) {
                        positions[i].x = newCenter + (positions[i].x - centerX) * scale;
                    }
                    dbg.log('WAVE', `[WM] X-clamp: ${formationName} scaled ${(scale * 100).toFixed(0)}% (span ${span.toFixed(0)} > avail ${availableWidth.toFixed(0)})`);
                } else {
                    // Shift: formation fits but is offset
                    let shiftX = 0;
                    if (minX < safeLeft) shiftX = safeLeft - minX;
                    else if (maxX > safeRight) shiftX = safeRight - maxX;
                    for (let i = 0; i < positions.length; i++) {
                        positions[i].x += shiftX;
                    }
                }

                // Hard clamp: safety net for any remaining outliers (SCATTER jitter)
                for (let i = 0; i < positions.length; i++) {
                    if (positions[i].x < safeLeft) positions[i].x = safeLeft;
                    if (positions[i].x > safeRight) positions[i].x = safeRight;
                }
            }
        }

        // v4.10.2: Y-clamping — prevent enemies spawning above screen or in player area
        if (positions.length > 0) {
            const gameH = window.Game._gameHeight || 700;
            const minYBound = startY;
            // v4.40: per-cycle Y ratio — C1+C2 top-heavy, C3 expands
            const cycle = window.marketCycle || 1;
            const ratios = window.Game.Balance?.FORMATION?.MAX_Y_RATIO_BY_CYCLE;
            const maxYRatio = ratios ? (ratios[Math.min(cycle - 1, ratios.length - 1)] || 0.55) : (window.Game.Balance?.FORMATION?.MAX_Y_RATIO || 0.55);
            const maxPixel = window.Game.Balance?.FORMATION?.MAX_Y_PIXEL || 500;
            const maxYBound = Math.min(gameH * maxYRatio, maxPixel); // v4.48: pixel cap

            const minY = positions.reduce((m, p) => Math.min(m, p.y), Infinity);
            const maxY = positions.reduce((m, p) => Math.max(m, p.y), -Infinity);

            if (minY < minYBound || maxY > maxYBound) {
                const span = maxY - minY;
                const availableHeight = maxYBound - minYBound;

                if (span > availableHeight) {
                    // Scale-to-fit: compress vertically
                    const scale = availableHeight / span;
                    const centerY = (minY + maxY) / 2;
                    const newCenterY = (minYBound + maxYBound) / 2;
                    for (let i = 0; i < positions.length; i++) {
                        positions[i].y = newCenterY + (positions[i].y - centerY) * scale;
                    }
                    dbg.log('WAVE', `[WM] Y-clamp: ${formationName} scaled ${(scale * 100).toFixed(0)}% (span ${span.toFixed(0)} > avail ${availableHeight.toFixed(0)})`);
                } else {
                    // Shift: formation fits but is offset
                    let shiftY = 0;
                    if (minY < minYBound) shiftY = minYBound - minY;
                    else if (maxY > maxYBound) shiftY = maxYBound - maxY;
                    for (let i = 0; i < positions.length; i++) {
                        positions[i].y += shiftY;
                    }
                }

                // Hard clamp: safety net for any remaining outliers
                for (let i = 0; i < positions.length; i++) {
                    if (positions[i].y < minYBound) positions[i].y = minYBound;
                    if (positions[i].y > maxYBound) positions[i].y = maxYBound;
                }
            }
        }

        return positions;
    },

    /**
     * DIAMOND - Central diamond shape
     *     *
     *    * *
     *   *   *
     *    * *
     *     *
     */
    generateDiamond(count, gameWidth, startY, spacing) {
        const positions = [];
        const centerX = gameWidth / 2;

        // Find size where diamond capacity >= count
        // Diamond capacity for size n: sum of row widths
        // Row r width = r < n/2 ? r+1 : n-r
        let size = 3;
        while (size < 50) {
            let cap = 0;
            for (let r = 0; r < size; r++) {
                cap += r < size / 2 ? r + 1 : size - r;
            }
            if (cap >= count) break;
            size++;
        }

        // Generate full diamond shape (no early cutoff)
        for (let row = 0; row < size; row++) {
            const rowWidth = row < size / 2 ? row + 1 : size - row;
            for (let col = 0; col < rowWidth; col++) {
                const xOffset = (col - (rowWidth - 1) / 2) * spacing;
                positions.push({
                    x: centerX + xOffset,
                    y: startY + row * (spacing * 0.8)
                });
            }
        }
        return positions;
    },

    /**
     * ARROW - Downward pointing arrow
     *       *
     *      * *
     *     * * *
     *    *     *
     *   *       *
     */
    generateArrow(count, gameWidth, startY, spacing) {
        const positions = [];
        const centerX = gameWidth / 2;

        // Find rows where triangle capacity (rows*(rows+1)/2) >= count
        let rows = 1;
        while (rows * (rows + 1) / 2 < count) rows++;

        // Generate full arrow shape (no early cutoff)
        for (let row = 0; row < rows; row++) {
            const rowWidth = row + 1;
            for (let col = 0; col < rowWidth; col++) {
                const xOffset = (col - (rowWidth - 1) / 2) * spacing;
                positions.push({
                    x: centerX + xOffset,
                    y: startY + row * (spacing * 0.8)
                });
            }
        }
        return positions;
    },

    /**
     * PINCER - Two wings on sides
     * * *   * *
     *  * * * *
     *   * * *
     *    * *
     */
    generatePincer(count, gameWidth, startY, spacing) {
        const positions = [];
        const perSide = Math.ceil(count / 2);
        const leftX = gameWidth * 0.25;
        const rightX = gameWidth * 0.75;

        for (let i = 0; i < perSide && positions.length < count; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            // Left wing
            positions.push({
                x: leftX + col * spacing * 0.7,
                y: startY + row * spacing * 0.8
            });
        }
        for (let i = 0; i < perSide && positions.length < count; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            // Right wing
            positions.push({
                x: rightX - col * spacing * 0.7,
                y: startY + row * spacing * 0.8
            });
        }
        return positions;
    },

    /**
     * CHEVRON - V-shape pointing down
     * *       *
     *  *     *
     *   *   *
     *    * *
     *     *
     */
    generateChevron(count, gameWidth, startY, spacing) {
        const positions = [];
        const centerX = gameWidth / 2;
        const yMult = window.Game.Balance?.FORMATION?.CHEVRON_Y_MULT || 0.55;

        // v4.48: Filled chevron — row N has (2*N+1) positions, capacity = rows²
        let rows = Math.ceil(Math.sqrt(count));
        rows = Math.min(rows, 8);

        for (let row = 0; row < rows && positions.length < count; row++) {
            const posInRow = 2 * row + 1;
            const y = startY + row * spacing * yMult;
            for (let col = 0; col < posInRow && positions.length < count; col++) {
                const xOff = (col - row) * spacing * 0.5;
                positions.push({ x: centerX + xOff, y });
            }
        }
        return positions;
    },

    /**
     * FORTRESS - Square outline with center
     * * * * * *
     * *       *
     * *   *   *
     * *       *
     * * * * * *
     */
    generateFortress(count, gameWidth, startY, spacing) {
        const positions = [];
        const centerX = gameWidth / 2;

        // Fortress capacity: perimeter + center = 4*(size-1) + 1
        // Find size where capacity >= count
        let size = 3;
        while (4 * (size - 1) + 1 < count) size++;
        const halfSize = (size - 1) / 2;

        // Generate full fortress shape (no early cutoff)
        // Top row
        for (let i = 0; i < size; i++) {
            positions.push({ x: centerX + (i - halfSize) * spacing * 0.85, y: startY });
        }
        // Left and right walls
        for (let i = 1; i < size - 1; i++) {
            positions.push({ x: centerX - halfSize * spacing * 0.85, y: startY + i * spacing * 0.85 });
            positions.push({ x: centerX + halfSize * spacing * 0.85, y: startY + i * spacing * 0.85 });
        }
        // Bottom row
        for (let i = 0; i < size; i++) {
            positions.push({ x: centerX + (i - halfSize) * spacing * 0.85, y: startY + (size - 1) * spacing * 0.85 });
        }
        // Center
        positions.push({ x: centerX, y: startY + halfSize * spacing * 0.85 });
        return positions;
    },

    /**
     * SCATTER - Random but controlled positions
     */
    generateScatter(count, gameWidth, startY, spacing) {
        const positions = [];
        const margin = window.Game.Balance?.FORMATION?.MARGIN || 60;
        const cols = Math.ceil(gameWidth / spacing);
        const rows = Math.ceil(count / cols) + 1;

        // Create a grid with some positions removed for randomness
        for (let row = 0; row < rows && positions.length < count; row++) {
            for (let col = 0; col < cols && positions.length < count; col++) {
                // Skip some positions randomly
                if (Math.random() > 0.6) continue;

                const x = margin + col * spacing + (Math.random() - 0.5) * spacing * 0.4;
                const y = startY + row * spacing + (Math.random() - 0.5) * spacing * 0.3;

                positions.push({ x: Math.max(margin, Math.min(gameWidth - margin, x)), y });
            }
        }

        // Fill remaining if needed
        while (positions.length < count) {
            positions.push({
                x: margin + Math.random() * (gameWidth - 2 * margin),
                y: startY + Math.random() * spacing * 3
            });
        }
        return positions.slice(0, count);
    },

    /**
     * SPIRAL - Enemies in a spiral pattern
     */
    generateSpiral(count, gameWidth, startY, spacing) {
        const positions = [];
        const centerX = gameWidth / 2;
        // v4.0.3: Use BalanceConfig values instead of hardcoded
        const FC = window.Game.Balance?.FORMATION || {};
        const centerY = startY + (FC.SPIRAL_CENTER_Y_OFFSET || 100);
        const angleStep = FC.SPIRAL_ANGLE_STEP || 0.5;
        const baseRadius = FC.SPIRAL_BASE_RADIUS || 30;
        const radiusStep = FC.SPIRAL_RADIUS_STEP || 12;
        const ySqueeze = FC.SPIRAL_Y_SQUEEZE || 0.6;

        // v4.40: cap radius growth to prevent spiral exceeding screen bounds
        const maxRadius = (gameWidth / 2) - (FC.SAFE_EDGE_MARGIN || 30) - 10;
        const effectiveRadiusStep = Math.min(radiusStep, count > 1 ? (maxRadius - baseRadius) / (count - 1) : radiusStep);

        for (let i = 0; i < count; i++) {
            const angle = i * angleStep;
            const radius = baseRadius + i * effectiveRadiusStep;
            positions.push({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius * ySqueeze
            });
        }
        return positions;
    },

    /**
     * CROSS - Plus sign shape
     *     *
     *     *
     * * * * * *
     *     *
     *     *
     */
    generateCross(count, gameWidth, startY, spacing) {
        const positions = [];
        const centerX = gameWidth / 2;
        const armLength = Math.min(Math.ceil(count / 4), 5); // v4.40: cap arm length

        // Generate full cross shape (no early cutoff)
        // Horizontal arm
        for (let i = -armLength; i <= armLength; i++) {
            positions.push({
                x: centerX + i * spacing * 0.7,
                y: startY + armLength * spacing * 0.5
            });
        }
        // Vertical arm (skip center to avoid duplicate)
        for (let i = 0; i < armLength * 2 + 1; i++) {
            if (i === armLength) continue; // Skip center
            positions.push({
                x: centerX,
                y: startY + i * spacing * 0.5
            });
        }
        return positions;
    },

    /**
     * WALL - Dense horizontal lines
     * * * * * * *
     * * * * * * *
     * * * * * * *
     */
    generateWall(count, gameWidth, startY, spacing) {
        const positions = [];
        const margin = 50;
        const maxCols = Math.min(8, Math.floor((gameWidth - 2 * margin) / spacing) + 1);
        // v4.40: find cols that divides count evenly (no incomplete last row)
        let cols = maxCols;
        for (let c = maxCols; c >= 3; c--) {
            if (count % c === 0) { cols = c; break; }
        }
        const rows = Math.ceil(count / cols);

        let placed = 0;
        for (let row = 0; row < rows; row++) {
            const rowCount = Math.ceil((count - placed) / (rows - row));
            for (let col = 0; col < rowCount; col++) {
                positions.push({
                    x: margin + col * ((gameWidth - 2 * margin) / Math.max(rowCount - 1, 1)),
                    y: startY + row * spacing * 0.8
                });
                placed++;
            }
        }
        return positions;
    },

    /**
     * GAUNTLET - Two columns with space in middle
     * * *     * *
     * * *     * *
     * * *     * *
     * * *     * *
     */
    generateGauntlet(count, gameWidth, startY, spacing) {
        const positions = [];
        const perSide = Math.ceil(count / 2);
        const leftX = gameWidth * 0.2;
        const rightX = gameWidth * 0.8;

        for (let i = 0; i < perSide && positions.length < count; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            positions.push({
                x: leftX + col * spacing * 0.7,
                y: startY + row * spacing * 0.8
            });
        }
        for (let i = 0; i < perSide && positions.length < count; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            positions.push({
                x: rightX - col * spacing * 0.7,
                y: startY + row * spacing * 0.8
            });
        }
        return positions;
    },

    /**
     * VORTEX - Circular swirl pattern
     */
    generateVortex(count, gameWidth, startY, spacing) {
        const positions = [];
        const centerX = gameWidth / 2;
        const centerY = startY + 80;

        // Create concentric rings
        let ring = 0;
        let placed = 0;
        while (placed < count) {
            const radius = 40 + ring * 45;
            const enemiesInRing = Math.max(4, Math.floor(ring * 4 + 4));
            for (let i = 0; i < enemiesInRing && placed < count; i++) {
                const angle = (i / enemiesInRing) * Math.PI * 2 + ring * 0.3;
                positions.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius * 0.5
                });
                placed++;
            }
            ring++;
        }
        return positions;
    },

    /**
     * FLANKING - Enemies on both sides attacking inward
     * * * *   * * *
     *   * *   * *
     *     *   *
     */
    generateFlanking(count, gameWidth, startY, spacing) {
        const positions = [];
        const perSide = Math.ceil(count / 2);

        // Left flank (arrow pointing right)
        for (let i = 0; i < perSide && positions.length < count; i++) {
            const row = Math.floor(i / 3);
            const col = i % 3;
            positions.push({
                x: 50 + col * spacing * 0.7,
                y: startY + row * spacing * 0.8
            });
        }

        // Right flank (arrow pointing left)
        for (let i = 0; i < perSide && positions.length < count; i++) {
            const row = Math.floor(i / 3);
            const col = 2 - (i % 3);
            positions.push({
                x: gameWidth - 50 - col * spacing * 0.7,
                y: startY + row * spacing * 0.8
            });
        }
        return positions;
    },

    /**
     * STAIRCASE - Ascending or descending diagonal
     * *
     * * *
     * * * *
     * * * * *
     * * * * * *
     */
    generateStaircase(count, gameWidth, startY, spacing, ascending = true) {
        const positions = [];
        const rows = Math.ceil(Math.sqrt(count * 2));

        // Generate full staircase shape (no early cutoff)
        for (let row = 0; row < rows; row++) {
            const actualRow = ascending ? row : (rows - 1 - row);
            const enemiesInRow = actualRow + 1;
            // Center each row based on its width
            const rowWidth = (enemiesInRow - 1) * spacing * 0.8;
            const rowOffsetX = (gameWidth - rowWidth) / 2;
            for (let col = 0; col < enemiesInRow; col++) {
                positions.push({
                    x: rowOffsetX + col * spacing * 0.8,
                    y: startY + row * spacing * 0.8
                });
            }
        }
        return positions;
    },

    /**
     * HURRICANE - Enemies in chaotic circular motion positions
     */
    generateHurricane(count, gameWidth, startY, spacing) {
        const positions = [];
        const centerX = gameWidth / 2;
        const centerY = startY + 100;

        for (let i = 0; i < count; i++) {
            const t = i / count;
            const radius = 30 + t * 150;
            const angle = t * Math.PI * 6 + (Math.random() - 0.5) * 0.5;
            positions.push({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius * 0.4
            });
        }
        return positions;
    },

    /**
     * FINAL_FORM - Dense ultimate formation
     */
    generateFinalForm(count, gameWidth, startY, spacing) {
        const positions = [];
        const centerX = gameWidth / 2;

        // Dense center core
        const coreCount = Math.ceil(count * 0.4);
        for (let i = 0; i < coreCount && positions.length < count; i++) {
            const angle = (i / coreCount) * Math.PI * 2;
            const radius = 30 + (i % 3) * 25;
            positions.push({
                x: centerX + Math.cos(angle) * radius,
                y: startY + 60 + Math.sin(angle) * radius * 0.5
            });
        }

        // Outer ring
        const outerCount = count - positions.length;
        for (let i = 0; i < outerCount; i++) {
            const angle = (i / outerCount) * Math.PI * 2;
            const radius = 120 + Math.random() * 30;
            positions.push({
                x: centerX + Math.cos(angle) * radius,
                y: startY + 60 + Math.sin(angle) * radius * 0.4
            });
        }

        return positions;
    },

    // ========================================
    // CURRENCY SYMBOL FORMATIONS (v4.46)
    // ========================================

    /**
     * Distribute N points along a polyline path defined by normalized [0-1] vertices.
     * Scales to fit within gameWidth with margins, centered.
     */
    _distributeOnPath(path, count, gameWidth, startY, spacing) {
        const margin = 40;
        const usableW = Math.min(gameWidth - margin * 2, count * spacing * 0.6);
        const usableH = usableW * 1.2;
        const cx = gameWidth / 2;

        // Calculate total path length
        let totalLen = 0;
        const segLens = [];
        for (let i = 1; i < path.length; i++) {
            const dx = path[i][0] - path[i - 1][0];
            const dy = path[i][1] - path[i - 1][1];
            const len = Math.sqrt(dx * dx + dy * dy);
            segLens.push(len);
            totalLen += len;
        }

        const positions = [];
        const step = totalLen / count;
        let accum = step * 0.5; // start at half-step for centering
        let segIdx = 0;
        let segAccum = 0;

        for (let i = 0; i < count; i++) {
            // Walk along segments to find position at distance accum
            let target = accum;
            while (segIdx < segLens.length - 1 && target > segAccum + segLens[segIdx]) {
                segAccum += segLens[segIdx];
                segIdx++;
            }
            const localT = segLens[segIdx] > 0 ? (target - segAccum) / segLens[segIdx] : 0;
            const p0 = path[segIdx];
            const p1 = path[segIdx + 1] || p0;
            const nx = p0[0] + (p1[0] - p0[0]) * localT;
            const ny = p0[1] + (p1[1] - p0[1]) * localT;

            positions.push({
                x: cx + (nx - 0.5) * usableW,
                y: startY + ny * usableH
            });
            accum += step;
        }
        return positions;
    },

    /**
     * BTC_SYMBOL - Bitcoin "B" with vertical bars
     */
    generateBtcSymbol(count, gameWidth, startY, spacing) {
        // B shape with two bumps + vertical bar
        const path = [
            [0.3, 0.0], [0.3, 1.0],  // left vertical
            [0.3, 0.0], [0.6, 0.0], [0.7, 0.1], [0.7, 0.2], [0.6, 0.3], // top bump
            [0.3, 0.3],  // middle connect back
            [0.3, 0.5], [0.65, 0.5], [0.75, 0.6], [0.75, 0.8], [0.65, 0.9], [0.3, 1.0], // bottom bump
            [0.35, -0.05], [0.35, 0.05], // top bar
            [0.35, 0.95], [0.35, 1.05]  // bottom bar
        ];
        return this._distributeOnPath(path, count, gameWidth, startY, spacing);
    },

    /**
     * DOLLAR_SIGN - $ shape
     */
    generateDollarSign(count, gameWidth, startY, spacing) {
        // S-curve + vertical bar
        const path = [
            // S curve
            [0.65, 0.15], [0.55, 0.05], [0.4, 0.0], [0.3, 0.05], [0.25, 0.15],
            [0.3, 0.3], [0.5, 0.45],
            [0.7, 0.55], [0.75, 0.7], [0.7, 0.85],
            [0.6, 0.95], [0.45, 1.0], [0.35, 0.95],
            // Vertical bar
            [0.5, -0.05], [0.5, 1.05]
        ];
        return this._distributeOnPath(path, count, gameWidth, startY, spacing);
    },

    /**
     * EURO_SIGN - Euro symbol with horizontal bars
     */
    generateEuroSign(count, gameWidth, startY, spacing) {
        // C curve + two horizontal bars
        const path = [
            // C shape
            [0.7, 0.15], [0.6, 0.05], [0.5, 0.0], [0.35, 0.05], [0.25, 0.2],
            [0.2, 0.4], [0.2, 0.6],
            [0.25, 0.8], [0.35, 0.95], [0.5, 1.0], [0.6, 0.95], [0.7, 0.85],
            // Top bar
            [0.15, 0.4], [0.55, 0.4],
            // Bottom bar
            [0.15, 0.6], [0.55, 0.6]
        ];
        return this._distributeOnPath(path, count, gameWidth, startY, spacing);
    },

    /**
     * YEN_SIGN - Yen symbol
     */
    generateYenSign(count, gameWidth, startY, spacing) {
        // Y shape + horizontal bars + stem
        const path = [
            // Y top left
            [0.25, 0.0], [0.5, 0.4],
            // Y top right
            [0.75, 0.0], [0.5, 0.4],
            // Stem
            [0.5, 0.4], [0.5, 1.0],
            // Top bar
            [0.3, 0.55], [0.7, 0.55],
            // Bottom bar
            [0.3, 0.7], [0.7, 0.7]
        ];
        return this._distributeOnPath(path, count, gameWidth, startY, spacing);
    },

    /**
     * POUND_SIGN - Pound sterling symbol
     */
    generatePoundSign(count, gameWidth, startY, spacing) {
        // L-curve + horizontal bar + base
        const path = [
            // Top curve
            [0.65, 0.1], [0.55, 0.0], [0.4, 0.0], [0.3, 0.1], [0.3, 0.25],
            // Stem down
            [0.3, 0.4], [0.25, 0.6], [0.2, 0.8], [0.2, 0.95],
            // Base
            [0.2, 1.0], [0.75, 1.0],
            // Cross bar
            [0.15, 0.5], [0.6, 0.5]
        ];
        return this._distributeOnPath(path, count, gameWidth, startY, spacing);
    },

    // ========================================
    // LEGACY FORMATION GENERATORS
    // ========================================

    generateRect(count, gameWidth, startY, spacing) {
        const positions = [];
        // v4.40: find cols that divides count evenly — prefer WIDE grids (search UP first)
        let idealCols = Math.min(7, Math.max(3, Math.ceil(Math.sqrt(count))));
        let cols = idealCols;
        let found = false;
        for (let c = idealCols; c <= 8; c++) {
            if (count % c === 0) { cols = c; found = true; break; }
        }
        if (!found) {
            for (let c = idealCols - 1; c >= 3; c--) {
                if (count % c === 0) { cols = c; break; }
            }
        }
        // Fallback: distribute evenly across rows (variable cols per row)
        const rows = Math.ceil(count / cols);

        let placed = 0;
        for (let r = 0; r < rows; r++) {
            const rowCount = Math.ceil((count - placed) / (rows - r));
            const rowStartX = (gameWidth - (rowCount - 1) * spacing) / 2;
            for (let c = 0; c < rowCount; c++) {
                positions.push({
                    x: rowStartX + c * spacing,
                    y: startY + r * spacing
                });
                placed++;
            }
        }
        return positions;
    },

    generateVShape(count, gameWidth, startY, spacing) {
        const positions = [];
        const centerX = gameWidth / 2;
        const rows = Math.ceil(count / 3);

        for (let r = 0; r < rows && positions.length < count; r++) {
            const rowWidth = r + 1;
            for (let c = 0; c < rowWidth && positions.length < count; c++) {
                positions.push({
                    x: centerX + (c - (rowWidth - 1) / 2) * spacing,
                    y: startY + r * spacing
                });
            }
        }
        return positions;
    },

    generateColumns(count, gameWidth, startY, spacing) {
        const positions = [];
        const cols = 3;
        const colSpacing = gameWidth / (cols + 1);

        for (let i = 0; i < count; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            positions.push({
                x: colSpacing * (col + 1),
                y: startY + row * spacing
            });
        }
        return positions;
    },

    // ========================================
    // LEGACY SPAWN (Fallback)
    // ========================================

    spawnWaveLegacy(gameWidth, hordeNumber = 1) {
        const G = window.Game;
        const Balance = G.Balance;
        const enemies = [];

        let pattern = 'RECT';
        if (this.wave === 2) pattern = 'V_SHAPE';
        if (this.wave === 3) pattern = 'COLUMNS';
        if (this.wave === 4) pattern = 'SINE_WAVE';
        if (this.wave >= 5) pattern = 'RECT';
        if (window.isBearMarket && this.wave >= 2) pattern = 'SINE_WAVE';

        if (hordeNumber === 2 && Balance?.WAVES?.HORDE_2_PATTERN_VARIANT) {
            const patternVariants = { 'RECT': 'V_SHAPE', 'V_SHAPE': 'COLUMNS', 'COLUMNS': 'RECT', 'SINE_WAVE': 'SINE_WAVE' };
            pattern = patternVariants[pattern] || pattern;
        }

        const rows = pattern === 'COLUMNS' ? 5 : (pattern === 'V_SHAPE' ? 5 : 4);
        // v4.32: Use FORMATION config + responsive scaling (was hardcoded 75/150/380)
        const FC = Balance?.FORMATION || {};
        const baseWidth = Balance?.GAME?.BASE_WIDTH || 600;
        const gameH = G._gameHeight || 700;
        let spacing = FC.SPACING || 75;
        if (FC.RESPONSIVE) {
            const widthRatio = gameWidth / baseWidth;
            spacing = Math.max(FC.SPACING_MIN || 62, Math.round(spacing * widthRatio));
        }
        const cols = Math.floor((gameWidth - 40) / spacing);
        const startX = (gameWidth - (cols * spacing)) / 2 + (spacing / 2);
        const safeOffset = window.safeAreaInsets?.top || 0;
        let startY = (FC.START_Y || 80) + safeOffset;
        if (FC.RESPONSIVE && FC.START_Y_RESPONSIVE) {
            const heightRatio = gameH / 800;
            startY = Math.round(((FC.START_Y || 80) * heightRatio)) + safeOffset;
        }
        const maxY = Math.round(gameH * (FC.MAX_Y_RATIO || 0.65));
        const maxRows = Math.min(rows, Math.floor((maxY - startY) / spacing) + 1);

        const strongRows = 1;
        const mediumRows = Math.max(1, Math.floor((maxRows - 1) / 3));

        for (let r = 0; r < maxRows; r++) {
            for (let c = 0; c < cols; c++) {
                let spawn = false;
                if (pattern === 'RECT') spawn = true;
                else if (pattern === 'V_SHAPE' && Math.abs(c - cols / 2) < (rows - r) + 1) spawn = true;
                else if (pattern === 'COLUMNS' && c % 3 < 2) spawn = true;
                else if (pattern === 'SINE_WAVE') spawn = true;

                if (spawn) {
                    let typeIdx;
                    const waveOffset = (this.wave - 1) % 2;
                    if (r < strongRows) typeIdx = 7 + (waveOffset % 3);
                    else if (r < strongRows + mediumRows) typeIdx = 3 + ((r - strongRows + waveOffset) % 4);
                    else typeIdx = 0 + ((r - strongRows - mediumRows + waveOffset) % 3);

                    const cycle = window.marketCycle || 1;
                    const level = window.currentLevel || 1;
                    const diff = Balance.calculateDifficulty(level, cycle);
                    const apcMult2 = (G.RunState && G.RunState.cyclePower) ? G.RunState.cyclePower.hpMult : 1.0;
                    const scaledHP = Balance.calculateEnemyHP(diff, cycle) * apcMult2;
                    const baseType = G.FIAT_TYPES[typeIdx];
                    const scaledType = Object.assign({}, baseType, { hp: baseType.hp * scaledHP });

                    const targetX = startX + c * spacing;
                    const targetY = startY + r * spacing;
                    const formationConfig = Balance?.FORMATION_ENTRY || {};
                    const entryEnabled = formationConfig.ENABLED !== false;
                    const spawnYOffset = formationConfig.SPAWN_Y_OFFSET || -80;
                    const staggerDelay = formationConfig.STAGGER_DELAY || 0.08;

                    const spawnY = entryEnabled ? spawnYOffset : targetY;
                    const enemy = new G.Enemy(targetX, spawnY, scaledType);

                    if (entryEnabled) {
                        enemy.isEntering = true;
                        enemy.targetX = targetX;
                        enemy.targetY = targetY;
                        enemy.baseY = targetY;
                        enemy.entryDelay = enemies.length * staggerDelay;
                        enemy.hasSettled = false;
                    } else {
                        enemy.isEntering = false;
                        enemy.hasSettled = true;
                    }

                    const behaviorChance = Math.min(0.5, 0.1 + cycle * 0.1);
                    if (typeIdx <= 2) enemy.isKamikaze = Math.random() < behaviorChance * 0.5;
                    else if (typeIdx > 6) enemy.canTeleport = Math.random() < behaviorChance;

                    enemy.fireTimer = enemies.length === 0 ? 0 : (enemies.length * 0.15) + (Math.random() * 0.2);
                    enemies.push(enemy);
                }
            }
        }

        this.hordeSpawned = true;
        if (hordeNumber >= this.getHordesPerWave()) this.wave++;
        this.waveInProgress = false;
        return { enemies: enemies, pattern: pattern, hordeNumber: hordeNumber };
    }
};
