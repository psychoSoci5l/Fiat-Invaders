window.Game = window.Game || {};

class ObjectPool {
    constructor(createFn, initialSize = 10) {
        this.createFn = createFn;
        this.active = [];
        this.reserve = [];

        // Pre-populate
        for (let i = 0; i < initialSize; i++) {
            const obj = this.createFn();
            obj._inPool = true;
            this.reserve.push(obj);
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

        obj._inPool = false;

        // Reset object state if it has a reset method
        if (obj.reset) {
            obj.reset(...args);
        }

        return obj;
    }

    release(obj) {
        if (!obj._inPool) {
            obj._inPool = true;
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
        // v5.15: Reset all special flags to prevent stale state from recycled particles
        p.isSpark = props.isSpark || false;
        p.isRing = props.isRing || false;
        p.isGlow = props.isGlow || false;
        p.isRect = props.isRect || false;
        p.explosionGrow = props.explosionGrow || false;
        p.symbol = props.symbol || null;
        p.rotation = props.rotation || 0;
        p.rotSpeed = props.rotSpeed || 0;
        p.baseSize = props.baseSize || props.size || 4;
        p.gravity = props.gravity || 0;
        p.rectW = props.rectW || 0;
        p.rectH = props.rectH || 0;
        p.target = props.target || null;
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

    // O(1) - direct count from stackPtr
    get activeCount() {
        return particleStackPtr;
    },

    // Reset pool (for game restart)
    clear() {
        particleStackPtr = 0;
    }
};
