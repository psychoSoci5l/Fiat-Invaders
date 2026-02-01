window.Game = window.Game || {};

class AudioSystem {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.compressor = null;
        this.isPlaying = false;
        this.timerID = null;
        this.noteTime = 0;
        this.tempo = 0.2;
        this.noteIndex = 0;

        // Boss phase state (0=no boss, 1-3=phases)
        this.bossPhase = 0;

        // Intensity state (0-100)
        this.intensity = 30;

        // Graze combo tracking for pitch scaling
        this.grazeCombo = 0;
        this.lastGrazeTime = 0;

        // Near-death heartbeat state
        this.heartbeatTimer = 0;
        this.isNearDeath = false;

        // Level-based music themes (1-5, loops after)
        this.currentLevel = 1;

        // Level chord progressions (bass roots in Hz)
        // Each array is [beat0-3, beat4-7, beat8-11, beat12-15]
        this.levelChords = {
            1: [65.41, 77.78, 87.31, 98.00],    // C minor: C-Eb-F-G (default)
            2: [73.42, 82.41, 98.00, 110.00],   // D minor: D-E-G-A (warmer)
            3: [55.00, 65.41, 73.42, 82.41],    // A minor: A-C-D-E (darker)
            4: [61.74, 77.78, 92.50, 103.83],   // Eb minor: Eb-Eb-Gb-Ab (tense)
            5: [49.00, 58.27, 73.42, 82.41]     // G minor: G-Bb-D-E (epic)
        };

        // Arp root notes per level (one octave up from bass)
        this.levelArpRoots = {
            1: [261.63, 311.13, 349.23, 392.00],  // C4-Eb4-F4-G4
            2: [293.66, 329.63, 392.00, 440.00],  // D4-E4-G4-A4
            3: [220.00, 261.63, 293.66, 329.63],  // A3-C4-D4-E4
            4: [311.13, 311.13, 369.99, 415.30],  // Eb4-Eb4-Gb4-Ab4
            5: [196.00, 233.08, 293.66, 329.63]   // G3-Bb3-D4-E4
        };

        // Lead scales per level (pentatonic variations)
        this.levelScales = {
            1: [523, 622, 698, 784, 932],         // C minor penta
            2: [587, 659, 784, 880, 988],         // D minor penta
            3: [440, 523, 587, 659, 784],         // A minor penta
            4: [622, 698, 831, 932, 1047],        // Eb minor penta
            5: [392, 466, 523, 587, 698]          // G minor penta
        };
    }

    init() {
        if (this.ctx) return;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AC();

            // Master gain + compressor chain
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.7;

            this.compressor = this.ctx.createDynamicsCompressor();
            this.compressor.threshold.value = -24;
            this.compressor.knee.value = 30;
            this.compressor.ratio.value = 12;
            this.compressor.attack.value = 0.003;
            this.compressor.release.value = 0.25;

            this.masterGain.connect(this.compressor);
            this.compressor.connect(this.ctx.destination);

            // Force suspended state - user must explicitly unmute
            if (this.ctx.state === 'running') {
                this.ctx.suspend();
            }
        }
        catch (e) {
            console.warn("Audio Context init failed:", e);
        }
    }

    // Get the output node (master gain for compression)
    getOutput() {
        return this.masterGain || this.ctx.destination;
    }

    // Set boss phase for dynamic music
    setBossPhase(phase) {
        this.bossPhase = phase;
        // Adjust tempo based on phase
        if (phase === 0) {
            this.tempo = 0.2; // Normal
        } else if (phase === 1) {
            this.tempo = 0.18; // Slightly faster
        } else if (phase === 2) {
            this.tempo = 0.15; // +20% faster
        } else if (phase === 3) {
            this.tempo = 0.12; // +40% faster (RAGE)
        }
    }

    // Set intensity for dynamic music (0-100)
    setIntensity(level) {
        this.intensity = Math.min(100, Math.max(0, level));
    }

    // Set near-death state for heartbeat
    setNearDeath(isNearDeath) {
        this.isNearDeath = isNearDeath;
    }

    // Reset all dynamic audio state (for game over, restart, etc.)
    resetState() {
        this.bossPhase = 0;
        this.intensity = 30;
        this.grazeCombo = 0;
        this.lastGrazeTime = 0;
        this.isNearDeath = false;
        this.tempo = 0.2; // Reset to normal tempo
        this.currentLevel = 1;

        // Reset master gain to normal (in case we were mid-crossfade)
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        }
    }

    // Set level for music theme variation (1-5, loops after)
    // Includes crossfade to smoothly transition between themes
    setLevel(level, instant = false) {
        const newLevel = ((level - 1) % 5) + 1; // Cycles 1-5

        // If same level or instant mode, just set it
        if (newLevel === this.currentLevel || instant || !this.ctx || this.ctx.state !== 'running') {
            this.currentLevel = newLevel;
            return;
        }

        // Crossfade: fade out -> change level -> fade in
        const fadeTime = 0.8; // seconds for fade
        const t = this.ctx.currentTime;

        if (this.masterGain) {
            // Store current volume
            const currentVol = this.masterGain.gain.value;

            // Fade out
            this.masterGain.gain.setValueAtTime(currentVol, t);
            this.masterGain.gain.linearRampToValueAtTime(0.05, t + fadeTime);

            // Change level at the midpoint
            setTimeout(() => {
                this.currentLevel = newLevel;
            }, fadeTime * 500); // Half of fade time in ms

            // Fade back in
            this.masterGain.gain.setValueAtTime(0.05, t + fadeTime);
            this.masterGain.gain.linearRampToValueAtTime(currentVol, t + fadeTime * 2);
        } else {
            // Fallback if no master gain
            this.currentLevel = newLevel;
        }
    }

    // Increment graze combo (for pitch scaling)
    addGraze() {
        const now = this.ctx ? this.ctx.currentTime : 0;
        // Reset combo if more than 1 second since last graze
        if (now - this.lastGrazeTime > 1.0) {
            this.grazeCombo = 0;
        }
        this.grazeCombo = Math.min(20, this.grazeCombo + 1);
        this.lastGrazeTime = now;
    }

    play(type) {
        // Only play sounds if audio is unmuted (context running)
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        const output = this.getOutput();

        // === GRAZE SOUNDS ===
        if (type === 'graze') {
            this.addGraze();
            // Crystalline chiptune shimmer - pitch increases with combo
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(output);

            osc.type = 'square';
            const baseFreq = 1800 + (this.grazeCombo * 50); // Pitch scales with combo
            osc.frequency.setValueAtTime(baseFreq, t);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.03);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, t + 0.05);

            gain.gain.setValueAtTime(0.06, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

            osc.start(t);
            osc.stop(t + 0.05);
        }
        else if (type === 'grazeStreak') {
            // Fast ascending arpeggio C-E-G-C (every 10 graze)
            const frequencies = [523, 659, 784, 1047]; // C5-E5-G5-C6
            const noteDuration = 0.035;

            frequencies.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain);
                gain.connect(output);

                osc.type = 'square';
                osc.frequency.value = freq;

                const noteStart = t + i * noteDuration;
                gain.gain.setValueAtTime(0, noteStart);
                gain.gain.linearRampToValueAtTime(0.08, noteStart + 0.005);
                gain.gain.exponentialRampToValueAtTime(0.01, noteStart + noteDuration);

                osc.start(noteStart);
                osc.stop(noteStart + noteDuration + 0.01);
            });
        }
        else if (type === 'grazePerk') {
            // Triumphant 8-bit fanfare (50 graze bonus)
            // Descending arpeggio with resonance: C6-G5-E5-C5
            const frequencies = [1047, 784, 659, 523, 784, 1047];
            const noteDuration = 0.06;

            frequencies.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const osc2 = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain);
                osc2.connect(gain);
                gain.connect(output);

                osc.type = 'square';
                osc2.type = 'triangle';
                osc.frequency.value = freq;
                osc2.frequency.value = freq * 2; // Octave up

                const noteStart = t + i * noteDuration;
                gain.gain.setValueAtTime(0, noteStart);
                gain.gain.linearRampToValueAtTime(0.1, noteStart + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.02, noteStart + noteDuration);

                osc.start(noteStart);
                osc.stop(noteStart + noteDuration + 0.02);
                osc2.start(noteStart);
                osc2.stop(noteStart + noteDuration + 0.02);
            });
        }

        // === UPGRADED SFX (8-BIT STYLE) ===
        else if (type === 'shoot') {
            // Double pulse + rapid decay (arcade laser)
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(output);

            osc1.type = 'square';
            osc2.type = 'square';

            const varP = (Math.random() - 0.5) * 100;
            osc1.frequency.setValueAtTime(900 + varP, t);
            osc1.frequency.exponentialRampToValueAtTime(200, t + 0.06);
            osc2.frequency.setValueAtTime(1100 + varP, t);
            osc2.frequency.exponentialRampToValueAtTime(300, t + 0.05);

            gain.gain.setValueAtTime(0.08, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);

            osc1.start(t);
            osc1.stop(t + 0.06);
            osc2.start(t);
            osc2.stop(t + 0.05);
        }
        else if (type === 'enemyShoot') {
            // Noise burst + pitch down (8-bit enemy laser)
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(output);

            osc.type = 'sawtooth';
            const varP = (Math.random() - 0.5) * 50;
            osc.frequency.setValueAtTime(400 + varP, t);
            osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

            gain.gain.setValueAtTime(0.07, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

            osc.start(t);
            osc.stop(t + 0.12);

            // Add noise burst
            const noise = this.createNoiseOsc(0.04);
            if (noise) {
                const noiseGain = this.ctx.createGain();
                noise.connect(noiseGain);
                noiseGain.connect(output);
                noiseGain.gain.setValueAtTime(0.04, t);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
                noise.start(t);
                noise.stop(t + 0.04);
            }
        }
        else if (type === 'enemyTelegraph') {
            // Warning beep
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(output);

            osc.type = 'square';
            osc.frequency.setValueAtTime(520, t);
            osc.frequency.exponentialRampToValueAtTime(620, t + 0.06);

            gain.gain.setValueAtTime(0.05, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);

            osc.start(t);
            osc.stop(t + 0.06);
        }
        else if (type === 'hit') {
            // Bit-crush style click + impact
            const osc = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            osc2.connect(gain);
            gain.connect(output);

            osc.type = 'square';
            osc2.type = 'sawtooth';

            const freq = 300 + Math.random() * 100;
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);
            osc2.frequency.setValueAtTime(freq * 0.5, t);
            osc2.frequency.exponentialRampToValueAtTime(40, t + 0.08);

            gain.gain.setValueAtTime(0.12, t);
            gain.gain.setValueAtTime(0.08, t + 0.01); // Click
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

            osc.start(t);
            osc.stop(t + 0.08);
            osc2.start(t);
            osc2.stop(t + 0.08);
        }
        else if (type === 'explosion') {
            // White noise + resonance (arcade explosion)
            const noise = this.createNoiseOsc(0.4);
            if (noise) {
                const filter = this.ctx.createBiquadFilter();
                const gain = this.ctx.createGain();
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(output);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(2000, t);
                filter.frequency.exponentialRampToValueAtTime(100, t + 0.4);
                filter.Q.value = 8; // Resonance

                gain.gain.setValueAtTime(0.5, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

                noise.start(t);
                noise.stop(t + 0.4);
            }

            // Sub bass thump
            const sub = this.ctx.createOscillator();
            const subG = this.ctx.createGain();
            sub.connect(subG);
            subG.connect(output);

            sub.type = 'sine';
            sub.frequency.setValueAtTime(80, t);
            sub.frequency.exponentialRampToValueAtTime(20, t + 0.3);

            subG.gain.setValueAtTime(0.4, t);
            subG.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

            sub.start(t);
            sub.stop(t + 0.3);
        }
        else if (type === 'coin') {
            // Classic coin collect (8-bit ding)
            const osc = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            osc2.connect(gain);
            gain.connect(output);

            osc.type = 'square';
            osc2.type = 'triangle';

            osc.frequency.setValueAtTime(1200, t);
            osc.frequency.setValueAtTime(1600, t + 0.05);
            osc2.frequency.setValueAtTime(1200, t);
            osc2.frequency.setValueAtTime(1600, t + 0.05);

            gain.gain.setValueAtTime(0.08, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

            osc.start(t);
            osc.stop(t + 0.12);
            osc2.start(t);
            osc2.stop(t + 0.12);
        }
        else if (type === 'perk') {
            // Power-up jingle
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(output);

            osc.type = 'square';
            osc.frequency.setValueAtTime(600, t);
            osc.frequency.setValueAtTime(800, t + 0.06);
            osc.frequency.setValueAtTime(1000, t + 0.12);

            gain.gain.setValueAtTime(0.08, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

            osc.start(t);
            osc.stop(t + 0.18);
        }
        else if (type === 'bossSpawn') {
            // Minor chord + sweep up (ominous)
            // C minor chord: C-Eb-G
            const freqs = [130.81, 155.56, 196.00]; // C3-Eb3-G3

            freqs.forEach((freq) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain);
                gain.connect(output);

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq * 0.5, t);
                osc.frequency.linearRampToValueAtTime(freq, t + 0.5);
                osc.frequency.linearRampToValueAtTime(freq * 0.5, t + 1.0);

                gain.gain.setValueAtTime(0.12, t);
                gain.gain.linearRampToValueAtTime(0.15, t + 0.5);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 1.0);

                osc.start(t);
                osc.stop(t + 1.0);
            });

            // Add sweep
            const sweep = this.ctx.createOscillator();
            const sweepGain = this.ctx.createGain();
            sweep.connect(sweepGain);
            sweepGain.connect(output);

            sweep.type = 'sawtooth';
            sweep.frequency.setValueAtTime(50, t);
            sweep.frequency.exponentialRampToValueAtTime(400, t + 0.8);

            sweepGain.gain.setValueAtTime(0.1, t);
            sweepGain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);

            sweep.start(t);
            sweep.stop(t + 0.8);
        }
        else if (type === 'shield') {
            // Shield activation - rising shimmer
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(output);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, t);
            osc.frequency.exponentialRampToValueAtTime(1200, t + 0.3);

            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

            osc.start(t);
            osc.stop(t + 0.4);
        }
        else if (type === 'shieldBreak') {
            // Glass shatter - noise burst + descending tones
            const noise = this.createNoiseOsc(0.15);
            if (noise) {
                const filter = this.ctx.createBiquadFilter();
                const gain = this.ctx.createGain();
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(output);

                filter.type = 'highpass';
                filter.frequency.setValueAtTime(3000, t);
                filter.frequency.exponentialRampToValueAtTime(500, t + 0.15);

                gain.gain.setValueAtTime(0.15, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

                noise.start(t);
                noise.stop(t + 0.15);
            }

            // Descending chime
            [1200, 900, 600].forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain);
                gain.connect(output);

                osc.type = 'square';
                osc.frequency.value = freq;

                const start = t + i * 0.04;
                gain.gain.setValueAtTime(0.06, start);
                gain.gain.exponentialRampToValueAtTime(0.01, start + 0.08);

                osc.start(start);
                osc.stop(start + 0.08);
            });
        }
        else if (type === 'hodl') {
            // HODL special shot
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(output);

            osc.type = 'square';
            osc.frequency.setValueAtTime(1200, t);
            osc.frequency.exponentialRampToValueAtTime(400, t + 0.15);

            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

            osc.start(t);
            osc.stop(t + 0.15);
        }
        else if (type === 'comboLost') {
            // Sad descending tone
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(output);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.linearRampToValueAtTime(80, t + 0.25);

            gain.gain.setValueAtTime(0.15, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.25);

            osc.start(t);
            osc.stop(t + 0.25);
        }
        else if (type === 'bulletCancel') {
            // Pop when enemy bullet destroyed
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(output);

            osc.type = 'square';
            osc.frequency.setValueAtTime(2000, t);
            osc.frequency.exponentialRampToValueAtTime(800, t + 0.03);

            gain.gain.setValueAtTime(0.05, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.03);

            osc.start(t);
            osc.stop(t + 0.03);
        }
        else if (type === 'nearDeath') {
            // 8-bit heartbeat pulse (80 BPM feel)
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(output);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(60, t);
            osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);

            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

            osc.start(t);
            osc.stop(t + 0.15);

            // Second beat
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(output);

            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(50, t + 0.18);
            osc2.frequency.exponentialRampToValueAtTime(35, t + 0.3);

            gain2.gain.setValueAtTime(0.15, t + 0.18);
            gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

            osc2.start(t + 0.18);
            osc2.stop(t + 0.3);
        }
        else if (type === 'waveComplete') {
            // Victory jingle
            const notes = [523, 659, 784, 1047]; // C5-E5-G5-C6
            notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain);
                gain.connect(output);

                osc.type = 'square';
                osc.frequency.value = freq;

                const start = t + i * 0.08;
                gain.gain.setValueAtTime(0.08, start);
                gain.gain.exponentialRampToValueAtTime(0.02, start + 0.15);

                osc.start(start);
                osc.stop(start + 0.15);
            });
        }
        else if (type === 'bossPhaseChange') {
            // Dramatic phase transition - ominous sweep + alarm
            const sweep = this.ctx.createOscillator();
            const sweepGain = this.ctx.createGain();
            sweep.connect(sweepGain);
            sweepGain.connect(output);

            sweep.type = 'sawtooth';
            sweep.frequency.setValueAtTime(100, t);
            sweep.frequency.exponentialRampToValueAtTime(800, t + 0.5);
            sweep.frequency.exponentialRampToValueAtTime(150, t + 1.0);

            sweepGain.gain.setValueAtTime(0.15, t);
            sweepGain.gain.exponentialRampToValueAtTime(0.01, t + 1.0);

            sweep.start(t);
            sweep.stop(t + 1.0);

            // Alarm tones
            for (let i = 0; i < 4; i++) {
                const alarm = this.ctx.createOscillator();
                const alarmGain = this.ctx.createGain();
                alarm.connect(alarmGain);
                alarmGain.connect(output);

                alarm.type = 'square';
                alarm.frequency.value = i % 2 === 0 ? 600 : 400;

                const start = t + i * 0.15;
                alarmGain.gain.setValueAtTime(0.08, start);
                alarmGain.gain.exponentialRampToValueAtTime(0.01, start + 0.1);

                alarm.start(start);
                alarm.stop(start + 0.1);
            }
        }
    }

    // Create white noise oscillator
    createNoiseOsc(duration) {
        if (!this.ctx) return null;

        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        return source;
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

        // Adjust tempo based on intensity (80-100 = +10%)
        let currentTempo = this.tempo;
        if (this.intensity >= 80) {
            currentTempo *= 0.9; // 10% faster
        }

        while (this.noteTime < this.ctx.currentTime + 0.2) {
            // Always play bass (intensity 0+)
            this.playBassNote(this.noteTime, this.noteIndex);

            // Arp at intensity 30+ or during boss
            if (this.intensity >= 30 || this.bossPhase > 0) {
                if (this.noteIndex % 2 === 0) {
                    this.playArp(this.noteTime, this.noteIndex);
                }
            }

            // Drums at intensity 60+ or boss phase 2+
            if (this.intensity >= 60 || this.bossPhase >= 2) {
                this.playDrumHit(this.noteTime, this.noteIndex);
            }

            // Lead at intensity 80+ or boss phase 2+
            if ((this.intensity >= 80 || this.bossPhase >= 2) && this.noteIndex % 4 === 0) {
                this.playLeadNote(this.noteTime, this.noteIndex);
            }

            // Alarm tone in boss phase 3
            if (this.bossPhase === 3 && this.noteIndex % 8 === 0) {
                this.playAlarmTone(this.noteTime);
            }

            this.noteTime += currentTempo;
            this.noteIndex = (this.noteIndex + 1) % 16;
        }
        this.timerID = setTimeout(() => this.schedule(), 50);
    }

    playBassNote(t, i) {
        const output = this.getOutput();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(output);

        // Get level-specific chord progression
        const chords = this.levelChords[this.currentLevel] || this.levelChords[1];

        // Pattern based on beat position
        let freq = chords[0];
        if (i >= 4 && i < 8) freq = chords[1];
        if (i >= 8 && i < 12) freq = chords[2];
        if (i >= 12) freq = chords[3];

        // Octave jump on off-beat for driving bass
        if (i % 2 !== 0) freq *= 2;

        // Boss phase 3: Drop bass an octave for more menace
        if (this.bossPhase === 3 && i % 4 === 0) {
            freq *= 0.5;
        }

        osc.frequency.value = freq;
        osc.type = 'sawtooth';

        // Filter Envelope (Wah) - more aggressive during boss
        filter.type = 'lowpass';
        const filterPeak = this.bossPhase >= 2 ? 1200 : 800;
        filter.frequency.setValueAtTime(200, t);
        filter.frequency.exponentialRampToValueAtTime(filterPeak, t + 0.05);
        filter.frequency.exponentialRampToValueAtTime(200, t + 0.2);
        filter.Q.value = this.bossPhase >= 2 ? 4 : 1;

        // Amp Envelope - louder during boss
        const volume = this.bossPhase > 0 ? 0.18 : 0.15;
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        osc.start(t);
        osc.stop(t + 0.2);
    }

    playArp(t, i) {
        const output = this.getOutput();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(output);

        // Get level-specific arp roots
        const arpRoots = this.levelArpRoots[this.currentLevel] || this.levelArpRoots[1];

        // Root note based on beat position
        let root = arpRoots[0];
        if (i >= 4 && i < 8) root = arpRoots[1];
        if (i >= 8 && i < 12) root = arpRoots[2];
        if (i >= 12) root = arpRoots[3];

        // Arp pattern offset: Root -> +3 semitones -> +7 semitones -> Octave
        const offset = i % 4;
        let freq = root;
        if (offset === 1) freq *= 1.189; // Minor 3rd
        if (offset === 2) freq *= 1.498; // 5th
        if (offset === 3) freq *= 2;     // Octave

        // Boss phase 2+: Add octave up for more intensity
        if (this.bossPhase >= 2) {
            freq *= 1.5;
        }

        osc.frequency.value = freq;
        osc.type = 'square'; // Chiptune feel

        // Volume scales with intensity and boss phase
        const baseVol = 0.03 + (this.intensity / 400); // 0.03-0.055
        const volume = this.bossPhase > 0 ? baseVol * 1.3 : baseVol;

        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        osc.start(t);
        osc.stop(t + 0.1);
    }

    playDrumHit(t, i) {
        const output = this.getOutput();

        // Kick on 1 and 3 (beats 0, 8)
        if (i === 0 || i === 8) {
            const kick = this.ctx.createOscillator();
            const kickGain = this.ctx.createGain();
            kick.connect(kickGain);
            kickGain.connect(output);

            kick.type = 'sine';
            kick.frequency.setValueAtTime(150, t);
            kick.frequency.exponentialRampToValueAtTime(40, t + 0.1);

            kickGain.gain.setValueAtTime(0.2, t);
            kickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

            kick.start(t);
            kick.stop(t + 0.1);
        }

        // Snare (8-bit noise) on 2 and 4 (beats 4, 12)
        if (i === 4 || i === 12) {
            const noise = this.createNoiseOsc(0.08);
            if (noise) {
                const filter = this.ctx.createBiquadFilter();
                const noiseGain = this.ctx.createGain();
                noise.connect(filter);
                filter.connect(noiseGain);
                noiseGain.connect(output);

                filter.type = 'highpass';
                filter.frequency.value = 2000;

                noiseGain.gain.setValueAtTime(0.1, t);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

                noise.start(t);
                noise.stop(t + 0.08);
            }
        }

        // Hi-hat on every beat during boss phase 3
        if (this.bossPhase === 3) {
            const noise = this.createNoiseOsc(0.03);
            if (noise) {
                const filter = this.ctx.createBiquadFilter();
                const hhGain = this.ctx.createGain();
                noise.connect(filter);
                filter.connect(hhGain);
                hhGain.connect(output);

                filter.type = 'highpass';
                filter.frequency.value = 8000;

                hhGain.gain.setValueAtTime(0.04, t);
                hhGain.gain.exponentialRampToValueAtTime(0.01, t + 0.03);

                noise.start(t);
                noise.stop(t + 0.03);
            }
        }
    }

    playLeadNote(t, i) {
        const output = this.getOutput();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(output);

        // Get level-specific scale
        const scale = this.levelScales[this.currentLevel] || this.levelScales[1];
        const noteIdx = Math.floor(i / 4) % scale.length;

        osc.type = 'square';
        osc.frequency.value = scale[noteIdx];

        // Syncopated rhythm - short staccato notes
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

        osc.start(t);
        osc.stop(t + 0.08);
    }

    playAlarmTone(t) {
        const output = this.getOutput();
        // Low pulsing siren for boss phase 3 danger
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(output);

        osc.type = 'square';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(200, t + 0.15);
        osc.frequency.linearRampToValueAtTime(150, t + 0.3);

        gain.gain.setValueAtTime(0.06, t);
        gain.gain.linearRampToValueAtTime(0.03, t + 0.15);
        gain.gain.linearRampToValueAtTime(0.06, t + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

        osc.start(t);
        osc.stop(t + 0.35);
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
