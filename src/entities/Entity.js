window.Game = window.Game || {};

class Entity {
    constructor(x, y, w, h) {
        this.x = x || 0;
        this.y = y || 0;
        this.width = w || 0;
        this.height = h || 0;
        this.vx = 0;
        this.vy = 0;
        this.markedForDeletion = false;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    draw(ctx) {
        // Override me
    }
}

window.Game.Entity = Entity;
