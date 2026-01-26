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

    startMusic() {
        if (!this.ctx || this.isPlaying) return;
        this.isPlaying = true;
        this.noteTime = this.ctx.currentTime + 0.1;
        this.tempo = 0.2; // 120 BPM ish
        this.noteIndex = 0;
        this.schedule();
    }

    stopMusic() {
        this.isPlaying = false;
        if (this.timerID) clearTimeout(this.timerID);
    }

    schedule() {
        if (!this.isPlaying) return;
        while (this.noteTime < this.ctx.currentTime + 0.2) {
            this.playBassNote(this.noteTime, this.noteIndex);
            this.noteTime += this.tempo;
            this.noteIndex = (this.noteIndex + 1) % 16;
        }
        this.timerID = setTimeout(() => this.schedule(), 50);
    }

    playBassNote(t, i) {
        // Pattern: C C C C | D# D# D# D# | F F F F | G G G G (Simple driving bass)
        // 0-3: 65Hz (C2), 4-7: 77Hz (D#2), 8-11: 87Hz (F2), 12-15: 98Hz (G2)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        let freq = 65.41; // C2
        if (i >= 4 && i < 8) freq = 77.78; // D#2
        if (i >= 8 && i < 12) freq = 87.31; // F2
        if (i >= 12) freq = 98.00; // G2

        // Alternate octave for "rolling" feel
        if (i % 2 !== 0) freq *= 2;

        osc.frequency.setValueAtTime(freq, t);
        osc.type = 'sawtooth';

        // Envelope (Pluck)
        gain.gain.setValueAtTime(0.08, t); // Low volume background
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        // Filter for "dark" synthwave feel
        // (If context supports filters, but keep simple for now sans filter)

        osc.start(t);
        osc.stop(t + 0.2);
    }
}

// Attach to namespace
window.Game.Audio = new AudioSystem();
