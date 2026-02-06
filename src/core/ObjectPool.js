window.Game = window.Game || {};

class ObjectPool {
    constructor(createFn, initialSize = 10) {
        this.createFn = createFn;
        this.active = [];
        this.reserve = [];

        // Pre-populate
        for (let i = 0; i < initialSize; i++) {
            this.reserve.push(this.createFn());
        }
    }

    acquire(...args) {
        let obj;
        if (this.reserve.length > 0) {
            obj = this.reserve.pop();
        } else {
            // Expand pool
            obj = this.createFn();
        }

        // Reset object state if it has a reset method
        if (obj.reset) {
            obj.reset(...args);
        }

        // We generally don't track 'active' inside the pool for game loops 
        // because the game loop manages its own list (e.g. bullets array),
        // but for some use cases we might. Here we just return it.
        return obj;
    }

    release(obj) {
        if (this.reserve.indexOf(obj) === -1) {
            this.reserve.push(obj);
        }
    }
}

window.Game.ObjectPool = ObjectPool;

// --- PARTICLE POOL ---
// Pre-allocated particle objects with stack pointer pattern for O(1) operations
// Active particles: indices 0 to stackPtr-1
// Inactive particles: indices stackPtr to pool.length-1
const particlePool = [];
const PARTICLE_POOL_SIZE = 100;
let particleStackPtr = 0; // Points to first inactive slot

// Create a new particle object
function createParticle() {
    return {
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 0, size: 0,
        color: '#fff', type: null, name: null,
        _poolIndex: -1 // Track position for O(1) release
    };
}

// Pre-populate pool
for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    const p = createParticle();
    p._poolIndex = i;
    particlePool.push(p);
}

window.Game.ParticlePool = {
    // O(1) acquire - takes from stackPtr position
    acquire(props) {
        let p;
        if (particleStackPtr < particlePool.length) {
            p = particlePool[particleStackPtr];
        } else {
            // Pool exhausted, expand (rare)
            p = createParticle();
            p._poolIndex = particlePool.length;
            particlePool.push(p);
        }
        particleStackPtr++;

        // Apply properties
        p.x = props.x || 0;
        p.y = props.y || 0;
        p.vx = props.vx || 0;
        p.vy = props.vy || 0;
        p.life = props.life || 0;
        p.maxLife = props.maxLife || props.life || 0;
        p.size = props.size || 4;
        p.color = props.color || '#fff';
        p.type = props.type || null;
        p.name = props.name || null;
        return p;
    },

    // O(1) release - swap with last active and decrement stackPtr
    release(p) {
        if (particleStackPtr <= 0) return;
        const idx = p._poolIndex;
        if (idx < 0 || idx >= particleStackPtr) return; // Already released or invalid

        particleStackPtr--;
        // Swap released particle with the last active one
        if (idx !== particleStackPtr) {
            const lastActive = particlePool[particleStackPtr];
            particlePool[idx] = lastActive;
            particlePool[particleStackPtr] = p;
            lastActive._poolIndex = idx;
            p._poolIndex = particleStackPtr;
        }
    },

    // O(1) - returns view of active particles (indices 0 to stackPtr-1)
    getActive() {
        return particlePool.slice(0, particleStackPtr);
    },

    // O(1) - direct count from stackPtr
    get activeCount() {
        return particleStackPtr;
    },

    // Reset pool (for game restart)
    clear() {
        particleStackPtr = 0;
    }
};
