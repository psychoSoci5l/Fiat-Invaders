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

            // Apply Bear Market scaling
            let targetCount = hordeDef.count;
            if (window.isBearMarket) {
                const bearMult = Balance.WAVE_DEFINITIONS.BEAR_MARKET.COUNT_MULT || 1.25;
                targetCount = Math.floor(targetCount * bearMult);
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

            // Spawn enemies
            for (let i = 0; i < positions.length; i++) {
                const pos = positions[i];
                const currencySymbol = currencyAssignments[i];
                const currencyType = Balance.getCurrencyBySymbol(currencySymbol);

                if (!currencyType) {
                    dbg.log('WAVE', `[WM] Warning: Unknown currency ${currencySymbol}`);
                    continue;
                }

                const enemy = this.createEnemy(pos, currencyType, cycle, hordeMods, i);
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
     * Create a single enemy with proper configuration
     */
    createEnemy(pos, currencyType, cycle, hordeMods, index) {
        const G = window.Game;
        const Balance = G.Balance;
        const level = window.currentLevel || 1;

        // Scale HP based on difficulty
        const diff = Balance.calculateDifficulty(level, cycle);
        const scaledHP = Balance.calculateEnemyHP(diff);
        const scaledType = Object.assign({}, currencyType, {
            hp: currencyType.hp * scaledHP
        });

        // Formation entry setup
        const formationConfig = Balance?.FORMATION_ENTRY || {};
        const entryEnabled = formationConfig.ENABLED !== false;
        const spawnYOffset = formationConfig.SPAWN_Y_OFFSET || -80;
        const staggerDelay = formationConfig.STAGGER_DELAY || 0.08;

        const spawnY = entryEnabled ? spawnYOffset : pos.y;
        const enemy = new G.Enemy(pos.x, spawnY, scaledType);

        // Entry animation
        if (entryEnabled) {
            enemy.isEntering = true;
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
        } else if (Balance.TIERS.MEDIUM.includes(symbol)) {
            enemy.hasShield = Math.random() < behaviorChance;
            if (enemy.hasShield) enemy.activateShield();
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
        const assignments = [];

        // If Bear Market forces strong enemies
        let currencies = [...allowedCurrencies];
        if (isBearMarket && Balance.WAVE_DEFINITIONS.BEAR_MARKET.FORCE_STRONG) {
            // Ensure at least 30% are strong tier
            const strongSymbols = currencies.filter(c => Balance.TIERS.STRONG.includes(c));
            if (strongSymbols.length === 0) {
                currencies.push('$', '元');
            }
        }

        // Distribute currencies evenly but with some randomization
        for (let i = 0; i < positions.length; i++) {
            const currencyIndex = i % currencies.length;
            // Add slight randomization (20% chance to pick random)
            if (Math.random() < 0.2) {
                assignments.push(currencies[Math.floor(Math.random() * currencies.length)]);
            } else {
                assignments.push(currencies[currencyIndex]);
            }
        }

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
        const startY = 150 + safeOffset;
        const spacing = 75;

        switch (formationName) {
            case 'DIAMOND': return this.generateDiamond(count, gameWidth, startY, spacing);
            case 'ARROW': return this.generateArrow(count, gameWidth, startY, spacing);
            case 'PINCER': return this.generatePincer(count, gameWidth, startY, spacing);
            case 'CHEVRON': return this.generateChevron(count, gameWidth, startY, spacing);
            case 'FORTRESS': return this.generateFortress(count, gameWidth, startY, spacing);
            case 'SCATTER': return this.generateScatter(count, gameWidth, startY, spacing);
            case 'SPIRAL': return this.generateSpiral(count, gameWidth, startY, spacing);
            case 'CROSS': return this.generateCross(count, gameWidth, startY, spacing);
            case 'WALL': return this.generateWall(count, gameWidth, startY, spacing);
            case 'GAUNTLET': return this.generateGauntlet(count, gameWidth, startY, spacing);
            case 'VORTEX': return this.generateVortex(count, gameWidth, startY, spacing);
            case 'FLANKING': return this.generateFlanking(count, gameWidth, startY, spacing);
            case 'STAIRCASE': return this.generateStaircase(count, gameWidth, startY, spacing, true);
            case 'STAIRCASE_REVERSE': return this.generateStaircase(count, gameWidth, startY, spacing, false);
            case 'HURRICANE': return this.generateHurricane(count, gameWidth, startY, spacing);
            case 'FINAL_FORM': return this.generateFinalForm(count, gameWidth, startY, spacing);
            // Legacy fallbacks
            case 'RECT': return this.generateRect(count, gameWidth, startY, spacing);
            case 'V_SHAPE': return this.generateVShape(count, gameWidth, startY, spacing);
            case 'COLUMNS': return this.generateColumns(count, gameWidth, startY, spacing);
            case 'SINE_WAVE': return this.generateRect(count, gameWidth, startY, spacing);
            default: return this.generateRect(count, gameWidth, startY, spacing);
        }
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
        const size = Math.ceil(Math.sqrt(count));

        for (let row = 0; row < size && positions.length < count; row++) {
            const rowWidth = row < size / 2 ? row + 1 : size - row;
            for (let col = 0; col < rowWidth && positions.length < count; col++) {
                const xOffset = (col - (rowWidth - 1) / 2) * spacing;
                positions.push({
                    x: centerX + xOffset,
                    y: startY + row * (spacing * 0.7)
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
        const rows = Math.ceil(count / 3);

        for (let row = 0; row < rows && positions.length < count; row++) {
            const rowWidth = row + 1;
            for (let col = 0; col < rowWidth && positions.length < count; col++) {
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
                x: leftX + col * spacing * 0.6,
                y: startY + row * spacing * 0.7
            });
        }
        for (let i = 0; i < perSide && positions.length < count; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            // Right wing
            positions.push({
                x: rightX - col * spacing * 0.6,
                y: startY + row * spacing * 0.7
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
        const rows = Math.ceil(count / 2);

        for (let row = 0; row < rows && positions.length < count; row++) {
            const xOffset = (rows - row - 1) * spacing * 0.5;
            // Left side
            if (positions.length < count) {
                positions.push({ x: centerX - xOffset, y: startY + row * spacing * 0.6 });
            }
            // Right side (except center)
            if (xOffset > 0 && positions.length < count) {
                positions.push({ x: centerX + xOffset, y: startY + row * spacing * 0.6 });
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
        const size = Math.ceil(Math.sqrt(count));
        const halfSize = (size - 1) / 2;

        // Outer walls
        for (let i = 0; i < size && positions.length < count; i++) {
            // Top row
            positions.push({ x: centerX + (i - halfSize) * spacing * 0.8, y: startY });
        }
        for (let i = 1; i < size - 1 && positions.length < count; i++) {
            // Left and right walls
            positions.push({ x: centerX - halfSize * spacing * 0.8, y: startY + i * spacing * 0.8 });
            if (positions.length < count) {
                positions.push({ x: centerX + halfSize * spacing * 0.8, y: startY + i * spacing * 0.8 });
            }
        }
        for (let i = 0; i < size && positions.length < count; i++) {
            // Bottom row
            positions.push({ x: centerX + (i - halfSize) * spacing * 0.8, y: startY + (size - 1) * spacing * 0.8 });
        }
        // Center
        if (positions.length < count) {
            positions.push({ x: centerX, y: startY + halfSize * spacing * 0.8 });
        }
        return positions;
    },

    /**
     * SCATTER - Random but controlled positions
     */
    generateScatter(count, gameWidth, startY, spacing) {
        const positions = [];
        const margin = 60;
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
        const centerY = startY + 100;

        for (let i = 0; i < count; i++) {
            const angle = i * 0.5;
            const radius = 30 + i * 12;
            positions.push({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius * 0.6
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
        const armLength = Math.ceil(count / 4);

        // Horizontal arm
        for (let i = -armLength; i <= armLength && positions.length < count; i++) {
            positions.push({
                x: centerX + i * spacing * 0.7,
                y: startY + armLength * spacing * 0.5
            });
        }
        // Vertical arm (skip center to avoid duplicate)
        for (let i = 0; i < armLength * 2 + 1 && positions.length < count; i++) {
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
        const cols = Math.min(8, Math.floor((gameWidth - 2 * margin) / spacing) + 1);
        const rows = Math.ceil(count / cols);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols && positions.length < count; col++) {
                positions.push({
                    x: margin + col * ((gameWidth - 2 * margin) / (cols - 1)),
                    y: startY + row * spacing * 0.8
                });
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
                y: startY + row * spacing * 0.7
            });
        }
        for (let i = 0; i < perSide && positions.length < count; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            positions.push({
                x: rightX - col * spacing * 0.7,
                y: startY + row * spacing * 0.7
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
                y: startY + row * spacing * 0.7
            });
        }

        // Right flank (arrow pointing left)
        for (let i = 0; i < perSide && positions.length < count; i++) {
            const row = Math.floor(i / 3);
            const col = 2 - (i % 3);
            positions.push({
                x: gameWidth - 50 - col * spacing * 0.7,
                y: startY + row * spacing * 0.7
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
        let placed = 0;

        for (let row = 0; row < rows && placed < count; row++) {
            const actualRow = ascending ? row : (rows - 1 - row);
            const enemiesInRow = Math.min(actualRow + 1, count - placed);
            for (let col = 0; col < enemiesInRow && placed < count; col++) {
                positions.push({
                    x: 80 + col * spacing * 0.8,
                    y: startY + row * spacing * 0.7
                });
                placed++;
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
    // LEGACY FORMATION GENERATORS
    // ========================================

    generateRect(count, gameWidth, startY, spacing) {
        const positions = [];
        const cols = Math.min(6, Math.ceil(Math.sqrt(count)));
        const rows = Math.ceil(count / cols);
        const startX = (gameWidth - (cols - 1) * spacing) / 2;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols && positions.length < count; c++) {
                positions.push({
                    x: startX + c * spacing,
                    y: startY + r * spacing
                });
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
        const spacing = 75;
        const cols = Math.floor((gameWidth - 40) / spacing);
        const startX = (gameWidth - (cols * spacing)) / 2 + (spacing / 2);
        const safeOffset = window.safeAreaInsets?.top || 0;
        const startY = 150 + safeOffset;
        const maxY = 380;
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
                    const scaledHP = Balance.calculateEnemyHP(diff);
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
                    else if (typeIdx <= 6) { enemy.hasShield = Math.random() < behaviorChance; if (enemy.hasShield) enemy.activateShield(); }
                    else enemy.canTeleport = Math.random() < behaviorChance;

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
