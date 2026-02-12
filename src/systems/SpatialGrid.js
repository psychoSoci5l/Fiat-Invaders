// SpatialGrid.js — Spatial hash grid for collision optimization
// v4.46: Reduces O(n*m) collision checks to near O(n)
window.Game = window.Game || {};

(function() {
    const CELL_SIZE = 80; // covers max bullet + enemy radius

    class SpatialGrid {
        constructor() {
            this.cellSize = CELL_SIZE;
            this.cells = new Map();
        }

        _key(cx, cy) {
            return (cx << 16) | (cy & 0xFFFF);
        }

        clear() {
            this.cells.clear();
        }

        insert(entity) {
            const cx = Math.floor(entity.x / this.cellSize);
            const cy = Math.floor(entity.y / this.cellSize);
            const key = this._key(cx, cy);
            let cell = this.cells.get(key);
            if (!cell) {
                cell = [];
                this.cells.set(key, cell);
            }
            cell.push(entity);
        }

        /**
         * Query all entities within radius of (x, y).
         * Returns array of entities (may include duplicates if entity spans cells).
         */
        query(x, y, radius) {
            const results = [];
            const minCx = Math.floor((x - radius) / this.cellSize);
            const maxCx = Math.floor((x + radius) / this.cellSize);
            const minCy = Math.floor((y - radius) / this.cellSize);
            const maxCy = Math.floor((y + radius) / this.cellSize);

            for (let cx = minCx; cx <= maxCx; cx++) {
                for (let cy = minCy; cy <= maxCy; cy++) {
                    const cell = this.cells.get(this._key(cx, cy));
                    if (cell) {
                        for (let i = 0; i < cell.length; i++) {
                            results.push(cell[i]);
                        }
                    }
                }
            }
            return results;
        }
    }

    window.Game.SpatialGrid = new SpatialGrid();
})();
