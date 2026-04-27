window.Game = window.Game || {};

class EventBus {
    constructor() {
        this.listeners = {};
        this._emitting = null; // track which event is currently emitting
        this._pendingRemovals = []; // deferred removals during emit
    }

    on(eventName, handler) {
        if (!/^[a-z]+:[a-z-]+$/.test(eventName)) {
            console.warn(`[EventBus] Event "${eventName}" does not follow domain:action convention (e.g. "player:died")`);
        }
        if (!this.listeners[eventName]) this.listeners[eventName] = [];
        this.listeners[eventName].push(handler);
        return () => this.off(eventName, handler);
    }

    once(eventName, handler) {
        const wrapper = (payload) => {
            this.off(eventName, wrapper);
            handler(payload);
        };
        wrapper._original = handler;
        return this.on(eventName, wrapper);
    }

    off(eventName, handler) {
        const list = this.listeners[eventName];
        if (!list) return;
        // If we're emitting this event, defer the removal
        if (this._emitting === eventName) {
            this._pendingRemovals.push({ eventName, handler });
            return;
        }
        const idx = list.indexOf(handler);
        if (idx >= 0) list.splice(idx, 1);
    }

    emit(eventName, payload) {
        const list = this.listeners[eventName];
        if (!list || list.length === 0) return;
        this._emitting = eventName;
        // Snapshot the array to protect against additions during iteration
        const snapshot = list.slice();
        for (let i = 0; i < snapshot.length; i++) {
            try {
                snapshot[i](payload);
            } catch (e) {
                console.error(`[EventBus] Error in "${eventName}" handler:`, e);
            }
        }
        this._emitting = null;
        // Process deferred removals
        if (this._pendingRemovals.length > 0) {
            const removals = this._pendingRemovals.splice(0);
            for (const { eventName: evt, handler } of removals) {
                this.off(evt, handler);
            }
        }
    }

    removeAllListeners(eventName) {
        if (eventName) {
            delete this.listeners[eventName];
        } else {
            this.listeners = {};
        }
    }
}

window.Game.Events = new EventBus();
