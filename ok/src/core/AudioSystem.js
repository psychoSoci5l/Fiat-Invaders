window.Game = window.Game || {};

class AudioSystem {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (this.ctx) return;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AC();
        }
        catch (e) {
            console.warn("Audio Context init failed:", e);
        }
    }

    play(type) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        if (type === 'shoot') {
            let varP = (Math.random() - 0.5) * 100;
            osc.frequency.setValueAtTime(800 + varP, t);
            osc.frequency.exponentialRampToValueAtTime(150, t + 0.1);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc.start(t); osc.stop(t + 0.1);
        }
        else if (type === 'enemyShoot') {
            osc.type = 'square';
            let varP = (Math.random() - 0.5) * 50;
            osc.frequency.setValueAtTime(150 + varP, t);
            osc.frequency.linearRampToValueAtTime(50, t + 0.2);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
            osc.start(t); osc.stop(t + 0.2);
        }
        else if (type === 'hit') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200 + Math.random() * 50, t);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc.start(t); osc.stop(t + 0.1);
        }
        else if (type === 'explosion') {
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
            gain.gain.setValueAtTime(0.8, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
            osc.start(t); osc.stop(t + 0.5);

            const sub = this.ctx.createOscillator();
            const subG = this.ctx.createGain();
            sub.connect(subG); subG.connect(this.ctx.destination);
            sub.frequency.setValueAtTime(60, t);
            sub.frequency.exponentialRampToValueAtTime(10, t + 0.5);
            subG.gain.setValueAtTime(0.5, t);
            subG.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
            sub.start(t); sub.stop(t + 0.5);
        }
        else if (type === 'coin') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, t);
            osc.frequency.exponentialRampToValueAtTime(1800, t + 0.1);
            gain.gain.setValueAtTime(0.1, t);
            osc.start(t); osc.stop(t + 0.1);
        }
        else if (type === 'bossSpawn') {
            osc.type = 'square'; osc.frequency.setValueAtTime(100, t); osc.frequency.linearRampToValueAtTime(50, t + 1); gain.gain.setValueAtTime(0.5, t); gain.gain.linearRampToValueAtTime(0, t + 1); osc.start(t); osc.stop(t + 1);
        }
        else if (type === 'shield') {
            osc.frequency.setValueAtTime(200, t); osc.frequency.linearRampToValueAtTime(600, t + 0.5); gain.gain.setValueAtTime(0.1, t); osc.start(t); osc.stop(t + 0.5);
        }
        else if (type === 'hodl') {
            osc.type = 'square'; osc.frequency.setValueAtTime(1000, t); osc.frequency.exponentialRampToValueAtTime(300, t + 0.2); gain.gain.setValueAtTime(0.1, t); osc.start(t); osc.stop(t + 0.2);
        }
        else if (type === 'comboLost') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, t); osc.frequency.linearRampToValueAtTime(50, t + 0.3); gain.gain.setValueAtTime(0.2, t); gain.gain.linearRampToValueAtTime(0, t + 0.3); osc.start(t); osc.stop(t + 0.3);
        }
    }
}

// Attach to namespace
window.Game.Audio = new AudioSystem();
