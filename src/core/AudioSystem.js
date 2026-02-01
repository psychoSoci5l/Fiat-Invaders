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
            // Force suspended state - user must explicitly unmute
            if (this.ctx.state === 'running') {
                this.ctx.suspend();
            }
        }
        catch (e) {
            console.warn("Audio Context init failed:", e);
        }
    }

    play(type) {
        // Only play sounds if audio is unmuted (context running)
        if (!this.ctx || this.ctx.state !== 'running') return;
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
        else if (type === 'enemyTelegraph') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(420, t);
            osc.frequency.exponentialRampToValueAtTime(520, t + 0.08);
            gain.gain.setValueAtTime(0.06, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
            osc.start(t); osc.stop(t + 0.08);
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
        else if (type === 'perk') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, t);
            osc.frequency.exponentialRampToValueAtTime(1200, t + 0.12);
            gain.gain.setValueAtTime(0.08, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
            osc.start(t); osc.stop(t + 0.12);
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
        // Don't schedule if muted (context suspended)
        if (this.ctx.state !== 'running') {
            this.timerID = setTimeout(() => this.schedule(), 100);
            return;
        }
        while (this.noteTime < this.ctx.currentTime + 0.2) {
            this.playBassNote(this.noteTime, this.noteIndex);
            if (this.noteIndex % 2 === 0) { // Melody is half-speed (8th notes) or full speed? Let's do arps on 16ths
                this.playArp(this.noteTime, this.noteIndex);
            }
            this.noteTime += this.tempo;
            this.noteIndex = (this.noteIndex + 1) % 16;
        }
        this.timerID = setTimeout(() => this.schedule(), 50);
    }

    playBassNote(t, i) {
        // Pattern: C2(0-3) | D#2(4-7) | F2(8-11) | G2(12-15)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter(); // Lowpass for punch

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        let freq = 65.41; // C2
        if (i >= 4 && i < 8) freq = 77.78; // D#2
        if (i >= 8 && i < 12) freq = 87.31; // F2
        if (i >= 12) freq = 98.00; // G2

        // Octave jump on off-beat for driving bass
        if (i % 2 !== 0) freq *= 2;

        osc.frequency.value = freq;
        osc.type = 'sawtooth';

        // Filter Envelope (Wah)
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, t);
        filter.frequency.exponentialRampToValueAtTime(800, t + 0.05);
        filter.frequency.exponentialRampToValueAtTime(200, t + 0.2);

        // Amp Envelope
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        osc.start(t);
        osc.stop(t + 0.2);
    }

    playArp(t, i) {
        // Simple minor arpeggio that follows the bass root
        // Key: C Minor (C, D#, G)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        let root = 261.63; // C4
        if (i >= 4 && i < 8) root = 311.13; // D#4
        if (i >= 8 && i < 12) root = 349.23; // F4
        if (i >= 12) root = 392.00; // G4

        // Arp pattern offset: Root -> +3 semitones -> +7 semitones -> Octave
        const offset = i % 4;
        let freq = root;
        if (offset === 1) freq *= 1.189; // Minor 3rd
        if (offset === 2) freq *= 1.498; // 5th
        if (offset === 3) freq *= 2;     // Octave

        osc.frequency.value = freq;
        osc.type = 'square'; // Chiptune feel

        gain.gain.setValueAtTime(0.03, t); // Quiet texture
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        osc.start(t);
        osc.stop(t + 0.1);
    }
    toggleMute() {
        if (!this.ctx) this.init();
        if (!this.ctx) return true; // Failed to init

        // If suspended, unmute (resume)
        if (this.ctx.state === 'suspended') {
            this.unlockWebAudio(); // iOS hack
            this.ctx.resume().catch(e => console.error(e));
            // Start music if not already playing
            if (!this.isPlaying) this.startMusic();
            return false; // Now Unmuted
        }

        // If running, mute (suspend)
        if (this.ctx.state === 'running') {
            this.ctx.suspend();
            return true; // Now Muted
        }

        return false; // Default fallback
    }

    unlockWebAudio() {
        if (!this.ctx) return;
        // Create empty buffer
        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start(0);
    }
}

// Attach to namespace
window.Game.Audio = new AudioSystem();
