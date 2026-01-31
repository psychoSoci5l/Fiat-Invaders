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
