window.Game = window.Game || {};

class EventBus {
    constructor() {
        this.listeners = {};
    }

    on(eventName, handler) {
        if (!this.listeners[eventName]) this.listeners[eventName] = [];
        this.listeners[eventName].push(handler);
        return () => this.off(eventName, handler);
    }

    off(eventName, handler) {
        const list = this.listeners[eventName];
        if (!list) return;
        const idx = list.indexOf(handler);
        if (idx >= 0) list.splice(idx, 1);
    }

    emit(eventName, payload) {
        const list = this.listeners[eventName];
        if (!list || list.length === 0) return;
        // Iterate without .slice() allocation; snapshot length for safety
        for (var i = 0, len = list.length; i < len; i++) {
            try { list[i](payload); } catch (e) { }
        }
    }
}

window.Game.Events = new EventBus();
