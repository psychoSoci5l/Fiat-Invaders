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
// Pre-allocated particle objects to reduce GC churn
const particlePool = [];
const PARTICLE_POOL_SIZE = 100;

// Pre-populate pool
for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    particlePool.push({
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 0, size: 0,
        color: '#fff', type: null, name: null,
        active: false
    });
}

window.Game.ParticlePool = {
    acquire(props) {
        let p = particlePool.find(p => !p.active);
        if (!p) {
            // Pool exhausted, create new (rare)
            p = { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0, color: '#fff', type: null, name: null, active: false };
            particlePool.push(p);
        }
        // Reset and apply properties
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
        p.active = true;
        return p;
    },
    release(p) {
        p.active = false;
    },
    getActive() {
        return particlePool.filter(p => p.active);
    },
    // For compatibility: return count of active particles
    get activeCount() {
        return particlePool.filter(p => p.active).length;
    }
};
