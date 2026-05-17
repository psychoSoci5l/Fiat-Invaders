// CollisionSystem tests — v1.0
// Tests: AABB overlap, spatial grid, circle collision, edge cases
// Run: node tests/unit/collision_test.js

(function () {
    'use strict';

    let passed = 0, failed = 0;
    function assert(cond, msg) {
        if (cond) { passed++; }
        else { failed++; console.error('FAIL:', msg); }
    }

    // ── Inline minimal implementations (no Game namespace needed) ────

    // Circle collision
    function circleCollide(x1, y1, r1, x2, y2, r2) {
        const dx = x2 - x1, dy = y2 - y1;
        const distSq = dx * dx + dy * dy;
        const rSum = r1 + r2;
        return distSq <= rSum * rSum;
    }

    // Line segment vs circle
    function lineSegmentVsCircle(x1, y1, x2, y2, cx, cy, r) {
        const dx = x2 - x1, dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return circleCollide(x1, y1, 0, cx, cy, r);
        let t = ((cx - x1) * dx + (cy - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const nearX = x1 + t * dx, nearY = y1 + t * dy;
        const distSq = (cx - nearX) * (cx - nearX) + (cy - nearY) * (cy - nearY);
        return distSq <= r * r;
    }

    // AABB overlap
    function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    // ── Spatial Grid (minimal clone for testing) ────────────────────
    class SpatialGrid {
        constructor(cellSize = 80) {
            this.cellSize = cellSize;
            this.cells = new Map();
            this._results = [];
        }
        _key(cx, cy) { return (cx << 16) | (cy & 0xFFFF); }
        clear() { this.cells.forEach(c => { c.length = 0; }); }
        insert(e) {
            const cx = Math.floor(e.x / this.cellSize);
            const cy = Math.floor(e.y / this.cellSize);
            const key = this._key(cx, cy);
            let cell = this.cells.get(key);
            if (!cell) { cell = []; this.cells.set(key, cell); }
            cell.push(e);
        }
        query(x, y, radius) {
            const r = this._results;
            r.length = 0;
            const minCx = Math.floor((x - radius) / this.cellSize);
            const maxCx = Math.floor((x + radius) / this.cellSize);
            const minCy = Math.floor((y - radius) / this.cellSize);
            const maxCy = Math.floor((y + radius) / this.cellSize);
            for (let cx = minCx; cx <= maxCx; cx++) {
                for (let cy = minCy; cy <= maxCy; cy++) {
                    const cell = this.cells.get(this._key(cx, cy));
                    if (cell) for (let i = 0; i < cell.length; i++) r.push(cell[i]);
                }
            }
            return r;
        }
        removeFromCell(entity) {
            const cx = Math.floor(entity.x / this.cellSize);
            const cy = Math.floor(entity.y / this.cellSize);
            const cell = this.cells.get(this._key(cx, cy));
            if (!cell) return false;
            const idx = cell.indexOf(entity);
            if (idx >= 0) { cell.splice(idx, 1); return true; }
            return false;
        }
        entityCount() {
            let count = 0;
            this.cells.forEach(c => { count += c.length; });
            return count;
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // TEST SUITE 1: AABB Overlap
    // ══════════════════════════════════════════════════════════════════

    console.log('\n── Suite 1: AABB Overlap ──');

    // Overlapping
    assert(aabbOverlap(10, 10, 20, 20, 20, 20, 20, 20) === true, 'AABB: partially overlapping');
    assert(aabbOverlap(10, 10, 20, 20, 10, 10, 20, 20) === true, 'AABB: fully overlapping (same position)');
    assert(aabbOverlap(10, 10, 20, 20, 15, 15, 5, 5) === true, 'AABB: one inside another');

    // Adjacent (touching but not overlapping)
    assert(aabbOverlap(10, 10, 10, 10, 20, 10, 10, 10) === false, 'AABB: adjacent right edge');
    assert(aabbOverlap(10, 10, 10, 10, 10, 20, 10, 10) === false, 'AABB: adjacent bottom edge');

    // Separated
    assert(aabbOverlap(10, 10, 10, 10, 100, 100, 10, 10) === false, 'AABB: far apart');
    assert(aabbOverlap(10, 10, 10, 10, 30, 30, 10, 10) === false, 'AABB: separated by gap');

    // Edge case: zero-size
    assert(aabbOverlap(10, 10, 0, 0, 10, 10, 20, 20) === false, 'AABB: zero-size box no overlap');

    // Edge case: negative coordinates
    assert(aabbOverlap(-50, -50, 40, 40, -30, -30, 40, 40) === true, 'AABB: negative coords overlapping');

    // ══════════════════════════════════════════════════════════════════
    // TEST SUITE 2: Circle Collision
    // ══════════════════════════════════════════════════════════════════

    console.log('\n── Suite 2: Circle Collision ──');

    assert(circleCollide(0, 0, 10, 15, 0, 10) === true, 'Circle: overlapping (dist 15 < sum 20)');
    assert(circleCollide(0, 0, 10, 20, 0, 10) === true, 'Circle: touching exactly (dist = sum = 20)');
    assert(circleCollide(0, 0, 10, 25, 0, 10) === false, 'Circle: separated (dist 25 > sum 20)');

    // Concentric
    assert(circleCollide(0, 0, 5, 0, 0, 10) === true, 'Circle: concentric');

    // Edge case: zero radius
    assert(circleCollide(0, 0, 0, 0, 0, 0) === true, 'Circle: both zero radius at origin');
    assert(circleCollide(0, 0, 0, 10, 0, 5) === false, 'Circle: zero radius point outside');

    // Large radii
    assert(circleCollide(100, 100, 500, 600, 600, 500) === true, 'Circle: large radii overlapping');

    // ══════════════════════════════════════════════════════════════════
    // TEST SUITE 3: Line Segment vs Circle
    // ══════════════════════════════════════════════════════════════════

    console.log('\n── Suite 3: Line Segment vs Circle ──');

    // Segment crossing through circle center
    assert(lineSegmentVsCircle(0, -20, 0, 20, 0, 0, 5) === true, 'Line: crosses circle center');

    // Segment far away
    assert(lineSegmentVsCircle(100, 0, 200, 0, 0, 0, 5) === false, 'Line: far from circle');

    // Segment endpoint inside circle
    assert(lineSegmentVsCircle(0, 0, 50, 50, 3, 3, 10) === true, 'Line: starts inside circle');

    // Segment tangent (grazing)
    assert(lineSegmentVsCircle(10, -50, 10, 50, 0, 0, 10) === true, 'Line: tangent (touches at x=10, y=0)');

    // Zero-length segment
    assert(lineSegmentVsCircle(5, 5, 5, 5, 5, 5, 1) === true, 'Line: zero-length on circle center');
    assert(lineSegmentVsCircle(100, 100, 100, 100, 0, 0, 5) === false, 'Line: zero-length far');

    // ══════════════════════════════════════════════════════════════════
    // TEST SUITE 4: Spatial Grid
    // ══════════════════════════════════════════════════════════════════

    console.log('\n── Suite 4: Spatial Grid ──');

    const grid = new SpatialGrid();

    // 4a: Insert and query
    {
        grid.clear();
        const entities = [
            { x: 50, y: 50 },
            { x: 200, y: 200 },
            { x: 55, y: 55 }
        ];
        entities.forEach(e => grid.insert(e));

        const results = grid.query(50, 50, 30);
        assert(results.length === 2, 'Grid: query returns 2 nearby entities (got ' + results.length + ')');

        const farResults = grid.query(500, 500, 30);
        assert(farResults.length === 0, 'Grid: query far away returns empty');
    }

    // 4b: Entities spanning multiple cells
    {
        grid.clear();
        // Place entities at cell boundaries
        for (let i = 0; i < 100; i++) {
            grid.insert({ x: Math.random() * 800, y: Math.random() * 600 });
        }
        assert(grid.entityCount() === 100, 'Grid: 100 entities inserted');

        // Query a large area — should find everything
        const all = grid.query(400, 300, 1000);
        assert(all.length === 100, 'Grid: large query returns all ' + all.length + ' entities');
    }

    // 4c: Clear and rebuild
    {
        grid.clear();
        assert(grid.entityCount() === 0, 'Grid: cleared grid has 0 entities');

        grid.insert({ x: 10, y: 10 });
        grid.insert({ x: 20, y: 20 });
        assert(grid.entityCount() === 2, 'Grid: after clear + insert has 2 entities');
    }

    // 4d: Entity removal
    {
        grid.clear();
        const e1 = { x: 50, y: 50 };
        const e2 = { x: 200, y: 200 };
        grid.insert(e1);
        grid.insert(e2);
        assert(grid.entityCount() === 2, 'Grid: before removal');
        grid.removeFromCell(e1);
        assert(grid.entityCount() === 1, 'Grid: after removing one entity');
        grid.removeFromCell(e2);
        assert(grid.entityCount() === 0, 'Grid: after removing both');
    }

    // 4e: Entity at cell origin (0,0)
    {
        grid.clear();
        grid.insert({ x: 0, y: 0 });
        const r = grid.query(0, 0, 10);
        assert(r.length === 1, 'Grid: entity at (0,0) found via query');
    }

    // ══════════════════════════════════════════════════════════════════
    // TEST SUITE 5: Rapid Spawn/Despawn (Entity Count)
    // ══════════════════════════════════════════════════════════════════

    console.log('\n── Suite 5: Rapid Spawn/Despawn ──');

    const pool = [];
    function spawn(x, y) { const e = { x, y, alive: true }; grid.insert(e); pool.push(e); return e; }
    function despawn(e) { e.alive = false; grid.removeFromCell(e); }

    grid.clear();
    pool.length = 0;

    // Rapid spawn
    for (let i = 0; i < 50; i++) spawn(i * 10, 100);
    assert(grid.entityCount() === 50, 'Spawn: 50 rapid spawns');

    // Rapid despawn
    for (let i = 0; i < 25; i++) despawn(pool[i]);
    assert(grid.entityCount() === 25, 'Despawn: 25 removed, 25 remain');

    // Mixed spawn/despawn
    for (let i = 0; i < 10; i++) {
        spawn(Math.random() * 800, Math.random() * 600);
        const alive = pool.filter(e => e.alive);
        if (alive.length > 0) despawn(alive[0]);
    }
    assert(grid.entityCount() === 25, 'Mixed: spawn + despawn net 0 change');

    // Remove all
    const remaining = pool.filter(e => e.alive);
    remaining.forEach(e => despawn(e));
    assert(grid.entityCount() === 0, 'Despawn: all removed');

    // ══════════════════════════════════════════════════════════════════
    // TEST SUITE 6: Collision integration scenarios
    // ══════════════════════════════════════════════════════════════════

    console.log('\n── Suite 6: Integrated Scenarios ──');

    // 6a: Bullet vs entity through spatial grid
    {
        grid.clear();
        const enemies = [
            { x: 50, y: 50, r: 15 },
            { x: 200, y: 200, r: 15 },
            { x: 55, y: 55, r: 15 }
        ];
        enemies.forEach(e => grid.insert(e));

        const bullet = { x: 52, y: 52, r: 4 };
        const candidates = grid.query(bullet.x, bullet.y, 15 + 4 + 10);

        const hits = candidates.filter(e => circleCollide(bullet.x, bullet.y, bullet.r, e.x, e.y, e.r));
        assert(hits.length === 2, 'Integrated: bullet hits 2 nearby enemies via grid');
    }

    // 6b: Miss scenario
    {
        grid.clear();
        grid.insert({ x: 50, y: 50, r: 15 });
        const bullet = { x: 500, y: 500, r: 4 };
        const candidates = grid.query(bullet.x, bullet.y, 15 + 4 + 10);
        const hits = candidates.filter(e => circleCollide(bullet.x, bullet.y, bullet.r, e.x, e.y, e.r));
        assert(hits.length === 0, 'Integrated: no hits for distant bullet');
    }

    // 6c: Entity just outside cell boundary
    {
        grid.clear();
        const enemy = { x: 79, y: 79, r: 15 };  // Near cell boundary
        grid.insert(enemy);

        // Query from adjacent cell
        const bullet = { x: 81, y: 81, r: 4 };
        const candidates = grid.query(bullet.x, bullet.y, 15 + 4 + 10);
        const hits = candidates.filter(e => circleCollide(bullet.x, bullet.y, bullet.r, e.x, e.y, e.r));
        assert(hits.length === 1, 'Integrated: cross-cell-boundary detection works');
    }

    // ══════════════════════════════════════════════════════════════════
    // TEST SUITE 7: Regression edge cases
    // ══════════════════════════════════════════════════════════════════

    console.log('\n── Suite 7: Regression Edge Cases ──');

    // 7a: Query results array reuse (no stale data leak)
    {
        grid.clear();
        grid.insert({ x: 50, y: 50 });
        const r1 = grid.query(50, 50, 30);
        assert(r1.length === 1, 'Query reuse: first query correct');
        const r2 = grid.query(500, 500, 10);
        assert(r2.length === 0, 'Query reuse: second query (empty) doesn\'t leak from first');
    }

    // 7b: Negative coordinates
    {
        grid.clear();
        grid.insert({ x: -10, y: -10 });
        const r = grid.query(-10, -10, 5);
        assert(r.length === 1, 'Grid: handles negative coordinates');
    }

    // 7c: Very large coordinate values
    {
        grid.clear();
        grid.insert({ x: 100000, y: 100000 });
        const r = grid.query(100000, 100000, 10);
        assert(r.length === 1, 'Grid: handles large coordinate values');
    }

    // 7d: Duplicate insertion
    {
        grid.clear();
        const e = { x: 100, y: 100 };
        grid.insert(e);
        grid.insert(e);  // Duplicate
        assert(grid.entityCount() === 2, 'Grid: duplicate insertion counted');

        grid.removeFromCell(e);
        assert(grid.entityCount() === 1, 'Grid: remove one of duplicates');
    }

    // ── Results ────────────────────────────────────────────────────
    console.log('\n=== CollisionSystem Tests ===');
    console.log('Passed:', passed);
    console.log('Failed:', failed);
    console.log('Total:', passed + failed);

    if (failed > 0) process.exit(1);
    else console.log('\nAll CollisionSystem tests passed!');

})();
