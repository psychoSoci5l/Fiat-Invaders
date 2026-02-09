window.Game = window.Game || {};

class AudioSystem {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.compressor = null;
        this.isPlaying = false;
        this.timerID = null;
        this.noteTime = 0;
        this.tempo = 0.2;
        this.noteIndex = 0;

        // Beat event tracking for Harmonic Conductor
        this.lastEmittedBeat = -1;

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

        // Error tracking for graceful degradation
        this.errorCounts = {};
        this.disabledSounds = new Set();
        this.MAX_ERRORS_BEFORE_DISABLE = 10;

        // Level-based music themes (1-5, loops after)
        this.currentLevel = 1;

        // v4.34: Music system v2 — section/structure tracking
        this.sectionBeat = 0;
        this.structureIndex = 0;
        this.padNodes = null;

        // v4.34: Separate mute state for music and SFX
        this.musicMuted = false;
        this.sfxMuted = false;

        // v4.34: Bear market distortion node
        this._distortionNode = null;
        this._bearFilterNode = null;
    }

    init() {
        if (this.ctx) return;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) {
                console.warn("AudioContext not supported in this browser");
                return;
            }
            this.ctx = new AC();

            // Master gain + compressor chain
            this.masterGain = this.ctx.createGain();
            this.compressor = this.ctx.createDynamicsCompressor();

            if (!this.masterGain || !this.compressor) {
                console.warn("Failed to create audio nodes");
                this.ctx = null;
                return;
            }

            // v4.34: Create separate music and SFX gain nodes
            this.musicGain = this.ctx.createGain();
            this.sfxGain = this.ctx.createGain();

            // Route: music/sfx → masterGain → compressor → destination
            const audioConfig = window.Game.Balance && window.Game.Balance.AUDIO;
            this.musicGain.gain.value = audioConfig ? audioConfig.MUSIC_VOLUME : 0.7;
            this.sfxGain.gain.value = audioConfig ? audioConfig.SFX_VOLUME : 0.8;

            this.musicGain.connect(this.masterGain);
            this.sfxGain.connect(this.masterGain);

            this.masterGain.gain.value = 0.7;
            this.compressor.threshold.value = -24;
            this.compressor.knee.value = 30;
            this.compressor.ratio.value = 12;
            this.compressor.attack.value = 0.003;
            this.compressor.release.value = 0.25;

            this.masterGain.connect(this.compressor);
            this.compressor.connect(this.ctx.destination);

            // On mobile, context auto-starts suspended (browser policy)
            // On desktop, context starts running — audio plays when startMusic() is called
        }
        catch (e) {
            console.warn("Audio Context init failed:", e);
            this.ctx = null;
        }
    }

    // Get the output node (master gain — legacy fallback)
    getOutput() {
        if (this.masterGain) return this.masterGain;
        if (this.ctx) return this.ctx.destination;
        return null;
    }

    // v4.34: Music output (for schedule/music oscillators)
    getMusicOutput() {
        if (this.musicGain) return this.musicGain;
        return this.getOutput();
    }

    // v4.34: SFX output (for play()/sfx oscillators)
    getSfxOutput() {
        if (this.sfxGain) return this.sfxGain;
        return this.getOutput();
    }

    // Set boss phase for dynamic music
    setBossPhase(phase) {
        this.bossPhase = phase;
        // Reset section tracking on boss phase change for clean transition
        this.sectionBeat = 0;
        this.structureIndex = 0;
        this._stopPad();
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
        this.tempo = 0.2;
        this.currentLevel = 1;
        this.lastEmittedBeat = -1;
        this.sectionBeat = 0;
        this.structureIndex = 0;
        this._stopPad();

        // Reset error tracking
        this.errorCounts = {};
        this.disabledSounds.clear();

        // Reset master gain to normal
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        }
    }

    // Set level for music theme variation (1-5, loops after)
    setLevel(level, instant = false) {
        const newLevel = ((level - 1) % 5) + 1;

        if (newLevel === this.currentLevel || instant || !this.ctx || this.ctx.state !== 'running') {
            this.currentLevel = newLevel;
            // Reset structure on level change
            this.structureIndex = 0;
            this.sectionBeat = 0;
            this._stopPad();
            return;
        }

        // Crossfade: fade music gain out → change level → fade in
        const fadeTime = 0.8;
        const t = this.ctx.currentTime;
        const gainNode = this.musicGain || this.masterGain;

        if (gainNode) {
            const currentVol = gainNode.gain.value;
            gainNode.gain.setValueAtTime(currentVol, t);
            gainNode.gain.linearRampToValueAtTime(0.05, t + fadeTime);

            setTimeout(() => {
                this.currentLevel = newLevel;
                this.structureIndex = 0;
                this.sectionBeat = 0;
                this._stopPad();
            }, fadeTime * 500);

            gainNode.gain.setValueAtTime(0.05, t + fadeTime);
            gainNode.gain.linearRampToValueAtTime(currentVol, t + fadeTime * 2);
        } else {
            this.currentLevel = newLevel;
            this.structureIndex = 0;
            this.sectionBeat = 0;
        }
    }

    // Increment graze combo (for pitch scaling)
    addGraze() {
        const now = this.ctx ? this.ctx.currentTime : 0;
        if (now - this.lastGrazeTime > 1.0) {
            this.grazeCombo = 0;
        }
        this.grazeCombo = Math.min(20, this.grazeCombo + 1);
        this.lastGrazeTime = now;
    }

    // v4.34: Toggle music mute (returns isMuted)
    toggleMusic() {
        if (!this.ctx) this.init();
        if (!this.ctx) return true;
        // Handle suspended context (first interaction on mobile)
        if (this.ctx.state === 'suspended') {
            this.unlockWebAudio();
            this.ctx.resume().catch(e => console.warn('[AudioSystem] resume failed:', e));
            if (!this.isPlaying) this.startMusic();
        }
        this.musicMuted = !this.musicMuted;
        if (this.musicGain) {
            const audioConfig = window.Game.Balance && window.Game.Balance.AUDIO;
            const vol = audioConfig ? audioConfig.MUSIC_VOLUME : 0.7;
            this.musicGain.gain.setValueAtTime(this.musicMuted ? 0 : vol, this.ctx.currentTime);
        }
        return this.musicMuted;
    }

    // v4.34: Toggle SFX mute (returns isMuted)
    toggleSfx() {
        if (!this.ctx) this.init();
        if (!this.ctx) return true;
        // Handle suspended context (first interaction on mobile)
        if (this.ctx.state === 'suspended') {
            this.unlockWebAudio();
            this.ctx.resume().catch(e => console.warn('[AudioSystem] resume failed:', e));
            if (!this.isPlaying) this.startMusic();
        }
        this.sfxMuted = !this.sfxMuted;
        if (this.sfxGain) {
            const audioConfig = window.Game.Balance && window.Game.Balance.AUDIO;
            const vol = audioConfig ? audioConfig.SFX_VOLUME : 0.8;
            this.sfxGain.gain.setValueAtTime(this.sfxMuted ? 0 : vol, this.ctx.currentTime);
        }
        return this.sfxMuted;
    }

    // v4.34: Apply mute states from localStorage (called after init)
    applyMuteStates(musicMuted, sfxMuted) {
        this.musicMuted = musicMuted;
        this.sfxMuted = sfxMuted;
        if (this.musicGain && this.ctx) {
            const audioConfig = window.Game.Balance && window.Game.Balance.AUDIO;
            this.musicGain.gain.value = musicMuted ? 0 : (audioConfig ? audioConfig.MUSIC_VOLUME : 0.7);
        }
        if (this.sfxGain && this.ctx) {
            const audioConfig = window.Game.Balance && window.Game.Balance.AUDIO;
            this.sfxGain.gain.value = sfxMuted ? 0 : (audioConfig ? audioConfig.SFX_VOLUME : 0.8);
        }
    }

    play(type, opts) {
        if (!this.ctx || this.ctx.state !== 'running') return;
        // v4.34: Skip SFX if muted
        if (this.sfxMuted) return;
        if (this.disabledSounds.has(type)) return;

        try {
            this._playSfx(type, opts);
        } catch (e) {
            this._handlePlayError(type, e);
        }
    }

    _handlePlayError(type, error) {
        this.errorCounts[type] = (this.errorCounts[type] || 0) + 1;
        if (this.errorCounts[type] >= this.MAX_ERRORS_BEFORE_DISABLE) {
            this.disabledSounds.add(type);
            console.warn(`[AudioSystem] Sound '${type}' disabled after ${this.MAX_ERRORS_BEFORE_DISABLE} errors`);
        } else if (this.errorCounts[type] === 1) {
            console.warn(`[AudioSystem] Error playing '${type}':`, error.message);
        }
    }

    _playSfx(type, opts) {
        const t = this.ctx.currentTime;
        const output = this.getSfxOutput();

        // === COUNTDOWN TICK (Wave intermission) ===
        if (type === 'countdownTick') {
            const basePitch = opts?.pitch || 1.0;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.value = 440 * basePitch;

            osc.connect(gain);
            gain.connect(output);

            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

            osc.start(t);
            osc.stop(t + 0.15);
        }

        // === GRAZE SOUNDS ===
        else if (type === 'graze') {
            this.addGraze();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(output);

            osc.type = 'square';
            const baseFreq = 1800 + (this.grazeCombo * 50);
            osc.frequency.setValueAtTime(baseFreq, t);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.03);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, t + 0.05);

            gain.gain.setValueAtTime(0.06, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

            osc.start(t);
            osc.stop(t + 0.05);
        }
        else if (type === 'grazeStreak') {
            const frequencies = [523, 659, 784, 1047];
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
                osc2.frequency.value = freq * 2;

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
            gain.gain.setValueAtTime(0.08, t + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

            osc.start(t);
            osc.stop(t + 0.08);
            osc2.start(t);
            osc2.stop(t + 0.08);
        }
        else if (type === 'explosion') {
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
                filter.Q.value = 8;

                gain.gain.setValueAtTime(0.5, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

                noise.start(t);
                noise.stop(t + 0.4);
            }

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
            const freqs = [130.81, 155.56, 196.00];
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
            const notes = [523, 659, 784, 1047];
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
        else if (type === 'shieldDeactivate') {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(output);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, t);
            osc.frequency.exponentialRampToValueAtTime(200, t + 0.3);
            gain.gain.setValueAtTime(0.06, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
            osc.start(t);
            osc.stop(t + 0.35);
        }
        else if (type === 'levelUp') {
            const notes = [392, 523, 659, 784, 1047];
            notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const osc2 = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain);
                osc2.connect(gain);
                gain.connect(output);
                osc.type = 'square';
                osc2.type = 'triangle';
                osc.frequency.value = freq;
                osc2.frequency.value = freq * 2;
                const start = t + i * 0.1;
                gain.gain.setValueAtTime(0.1, start);
                gain.gain.exponentialRampToValueAtTime(0.02, start + 0.2);
                osc.start(start);
                osc.stop(start + 0.2);
                osc2.start(start);
                osc2.stop(start + 0.2);
            });
        }
        else if (type === 'bearMarketToggle') {
            const sub = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            sub.connect(subGain);
            subGain.connect(output);
            sub.type = 'sawtooth';
            sub.frequency.setValueAtTime(80, t);
            sub.frequency.exponentialRampToValueAtTime(40, t + 0.5);
            subGain.gain.setValueAtTime(0.15, t);
            subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
            sub.start(t);
            sub.stop(t + 0.5);
            const high = this.ctx.createOscillator();
            const highGain = this.ctx.createGain();
            high.connect(highGain);
            highGain.connect(output);
            high.type = 'square';
            high.frequency.setValueAtTime(220, t);
            high.frequency.exponentialRampToValueAtTime(110, t + 0.4);
            highGain.gain.setValueAtTime(0.05, t);
            highGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
            high.start(t);
            high.stop(t + 0.4);
        }
        else if (type === 'grazeNearMiss') {
            const noise = this.createNoiseOsc(0.08);
            if (noise) {
                const filter = this.ctx.createBiquadFilter();
                const gain = this.ctx.createGain();
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(output);
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(2000, t);
                filter.frequency.exponentialRampToValueAtTime(500, t + 0.08);
                filter.Q.value = 2;
                gain.gain.setValueAtTime(0.04, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
                noise.start(t);
                noise.stop(t + 0.08);
            }
        }
        else if (type === 'hitEnemy') { this._playHitVariant(output, t, 'enemy'); }
        else if (type === 'hitPlayer') { this._playHitVariant(output, t, 'player'); }
        else if (type === 'coinScore') { this._playCoinVariant(output, t, 1.0); }
        else if (type === 'coinUI') { this._playCoinVariant(output, t, 1.3); }
        else if (type === 'coinPerk') { this._playCoinVariant(output, t, 0.8); }
        else if (type === 'hyperReady') {
            const notes = [392, 523, 659, 784];
            notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const osc2 = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain); osc2.connect(gain); gain.connect(output);
                osc.type = 'square'; osc2.type = 'triangle';
                osc.frequency.value = freq; osc2.frequency.value = freq * 2;
                const start = t + i * 0.06;
                gain.gain.setValueAtTime(0.08, start);
                gain.gain.exponentialRampToValueAtTime(0.03, start + 0.15);
                osc.start(start); osc.stop(start + 0.2);
                osc2.start(start); osc2.stop(start + 0.2);
            });
            const sweep = this.ctx.createOscillator();
            const sweepGain = this.ctx.createGain();
            sweep.connect(sweepGain); sweepGain.connect(output);
            sweep.type = 'sawtooth';
            sweep.frequency.setValueAtTime(500, t);
            sweep.frequency.exponentialRampToValueAtTime(2000, t + 0.3);
            sweepGain.gain.setValueAtTime(0.03, t);
            sweepGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
            sweep.start(t); sweep.stop(t + 0.3);
        }
        else if (type === 'hyperActivate') {
            const chordFreqs = [130.81, 196.00, 261.63, 392.00];
            chordFreqs.forEach((freq) => {
                const osc = this.ctx.createOscillator();
                const osc2 = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain); osc2.connect(gain); gain.connect(output);
                osc.type = 'sawtooth'; osc2.type = 'square';
                osc.frequency.value = freq; osc2.frequency.value = freq * 1.01;
                gain.gain.setValueAtTime(0.12, t);
                gain.gain.linearRampToValueAtTime(0.15, t + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
                osc.start(t); osc.stop(t + 0.8);
                osc2.start(t); osc2.stop(t + 0.8);
            });
            const sweep = this.ctx.createOscillator();
            const sweepGain = this.ctx.createGain();
            sweep.connect(sweepGain); sweepGain.connect(output);
            sweep.type = 'sawtooth';
            sweep.frequency.setValueAtTime(100, t);
            sweep.frequency.exponentialRampToValueAtTime(3000, t + 0.5);
            sweepGain.gain.setValueAtTime(0.08, t);
            sweepGain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
            sweep.start(t); sweep.stop(t + 0.5);
        }
        else if (type === 'godchainActivate') {
            const freqs = [110, 164.81, 220, 329.63, 440];
            freqs.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain); gain.connect(output);
                osc.type = i < 2 ? 'sawtooth' : 'square';
                osc.frequency.setValueAtTime(freq * 0.5, t);
                osc.frequency.exponentialRampToValueAtTime(freq, t + 0.15);
                gain.gain.setValueAtTime(0.08, t + i * 0.02);
                gain.gain.linearRampToValueAtTime(0.12, t + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
                osc.start(t + i * 0.02); osc.stop(t + 0.45);
            });
            const sweep = this.ctx.createOscillator();
            const sweepGain = this.ctx.createGain();
            sweep.connect(sweepGain); sweepGain.connect(output);
            sweep.type = 'sawtooth';
            sweep.frequency.setValueAtTime(80, t);
            sweep.frequency.exponentialRampToValueAtTime(2500, t + 0.3);
            sweepGain.gain.setValueAtTime(0.06, t);
            sweepGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
            sweep.start(t); sweep.stop(t + 0.35);
        }
        else if (type === 'hyperDeactivate') {
            const osc = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain); osc2.connect(gain); gain.connect(output);
            osc.type = 'sawtooth'; osc2.type = 'triangle';
            osc.frequency.setValueAtTime(800, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.5);
            osc2.frequency.setValueAtTime(400, t);
            osc2.frequency.exponentialRampToValueAtTime(50, t + 0.5);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
            osc.start(t); osc.stop(t + 0.5);
            osc2.start(t); osc2.stop(t + 0.5);
        }
        else if (type === 'hyperWarning') {
            for (let i = 0; i < 3; i++) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain); gain.connect(output);
                osc.type = 'square';
                osc.frequency.value = i === 2 ? 1200 : 900;
                const start = t + i * 0.1;
                gain.gain.setValueAtTime(0.1, start);
                gain.gain.exponentialRampToValueAtTime(0.01, start + 0.05);
                osc.start(start); osc.stop(start + 0.05);
            }
        }
        else if (type === 'hyperGraze') {
            const osc = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain); osc2.connect(gain); gain.connect(output);
            osc.type = 'square'; osc2.type = 'triangle';
            const baseFreq = 2400 + Math.random() * 200;
            osc.frequency.setValueAtTime(baseFreq, t);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, t + 0.04);
            osc2.frequency.setValueAtTime(baseFreq * 0.5, t);
            osc2.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, t + 0.04);
            gain.gain.setValueAtTime(0.08, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
            osc.start(t); osc.stop(t + 0.04);
            osc2.start(t); osc2.stop(t + 0.04);
        }
        else if (type === 'sacrificeOffer') {
            for (let i = 0; i < 3; i++) {
                const beat = this.ctx.createOscillator();
                const beatGain = this.ctx.createGain();
                beat.connect(beatGain); beatGain.connect(output);
                beat.type = 'sine'; beat.frequency.value = 40;
                const beatTime = t + i * 0.4;
                beatGain.gain.setValueAtTime(0, beatTime);
                beatGain.gain.linearRampToValueAtTime(0.3, beatTime + 0.05);
                beatGain.gain.exponentialRampToValueAtTime(0.01, beatTime + 0.2);
                beat.start(beatTime); beat.stop(beatTime + 0.3);
            }
            const drone = this.ctx.createOscillator();
            const droneGain = this.ctx.createGain();
            drone.connect(droneGain); droneGain.connect(output);
            drone.type = 'sawtooth';
            drone.frequency.setValueAtTime(55, t);
            drone.frequency.linearRampToValueAtTime(110, t + 1.5);
            droneGain.gain.setValueAtTime(0.1, t);
            droneGain.gain.linearRampToValueAtTime(0.15, t + 1);
            droneGain.gain.exponentialRampToValueAtTime(0.01, t + 2);
            drone.start(t); drone.stop(t + 2);
        }
        else if (type === 'sacrificeActivate') {
            const bufferSize = this.ctx.sampleRate * 0.3;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output_data = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) { output_data[i] = Math.random() * 2 - 1; }
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuffer;
            const noiseGain = this.ctx.createGain();
            noise.connect(noiseGain); noiseGain.connect(output);
            noiseGain.gain.setValueAtTime(0.4, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
            noise.start(t); noise.stop(t + 0.3);
            const chordFreqs = [261.63, 329.63, 392.00, 523.25];
            chordFreqs.forEach((freq) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain); gain.connect(output);
                osc.type = 'sine'; osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.15, t + 0.1);
                gain.gain.linearRampToValueAtTime(0.2, t + 0.3);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);
                osc.start(t + 0.1); osc.stop(t + 1.5);
            });
        }
        else if (type === 'sacrificeSuccess') {
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain); gain.connect(output);
                osc.type = 'sine'; osc.frequency.value = freq;
                const noteStart = t + i * 0.1;
                gain.gain.setValueAtTime(0.15, noteStart);
                gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.6);
                osc.start(noteStart); osc.stop(noteStart + 0.6);
            });
        }
        else if (type === 'sacrificeFail') {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain); gain.connect(output);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(400, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.8);
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
            osc.start(t); osc.stop(t + 0.8);
        }
        else if (type === 'coinJackpot') {
            const notes = [1200, 1400, 1600, 1800, 2000, 2200];
            const noteDuration = 0.04;
            notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const osc2 = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain); osc2.connect(gain); gain.connect(output);
                osc.type = 'square'; osc2.type = 'triangle';
                osc.frequency.value = freq; osc2.frequency.value = freq * 1.5;
                const noteStart = t + i * noteDuration;
                gain.gain.setValueAtTime(0, noteStart);
                gain.gain.linearRampToValueAtTime(0.08, noteStart + 0.008);
                gain.gain.exponentialRampToValueAtTime(0.01, noteStart + noteDuration + 0.02);
                osc.start(noteStart); osc.stop(noteStart + noteDuration + 0.03);
                osc2.start(noteStart); osc2.stop(noteStart + noteDuration + 0.03);
            });
            const chordFreqs = [1600, 2000, 2400];
            chordFreqs.forEach((freq) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain); gain.connect(output);
                osc.type = 'triangle'; osc.frequency.value = freq;
                const chordStart = t + notes.length * noteDuration;
                gain.gain.setValueAtTime(0.06, chordStart);
                gain.gain.exponentialRampToValueAtTime(0.01, chordStart + 0.15);
                osc.start(chordStart); osc.stop(chordStart + 0.15);
            });
        }
        else if (type === 'paperBurn') {
            const noise = this.createNoiseOsc(0.25);
            if (noise) {
                const filter = this.ctx.createBiquadFilter();
                const gain = this.ctx.createGain();
                noise.connect(filter); filter.connect(gain); gain.connect(output);
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(3000, t);
                filter.frequency.exponentialRampToValueAtTime(800, t + 0.2);
                filter.Q.value = 3;
                gain.gain.setValueAtTime(0.12, t);
                gain.gain.linearRampToValueAtTime(0.08, t + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
                noise.start(t); noise.stop(t + 0.25);
            }
            const woosh = this.ctx.createOscillator();
            const wooshGain = this.ctx.createGain();
            woosh.connect(wooshGain); wooshGain.connect(output);
            woosh.type = 'sawtooth';
            woosh.frequency.setValueAtTime(150, t);
            woosh.frequency.exponentialRampToValueAtTime(50, t + 0.2);
            wooshGain.gain.setValueAtTime(0.08, t);
            wooshGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
            woosh.start(t); woosh.stop(t + 0.2);
            for (let i = 0; i < 3; i++) {
                const pop = this.ctx.createOscillator();
                const popGain = this.ctx.createGain();
                pop.connect(popGain); popGain.connect(output);
                pop.type = 'square';
                pop.frequency.value = 400 + Math.random() * 300;
                const popTime = t + 0.03 + i * 0.05 + Math.random() * 0.02;
                popGain.gain.setValueAtTime(0.04, popTime);
                popGain.gain.exponentialRampToValueAtTime(0.01, popTime + 0.02);
                pop.start(popTime); pop.stop(popTime + 0.02);
            }
        }
        else if (type === 'metalShatter') {
            const sub = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            sub.connect(subGain); subGain.connect(output);
            sub.type = 'sine';
            sub.frequency.setValueAtTime(100, t);
            sub.frequency.exponentialRampToValueAtTime(30, t + 0.15);
            subGain.gain.setValueAtTime(0.25, t);
            subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            sub.start(t); sub.stop(t + 0.15);
            const clangFreqs = [440, 587, 698, 880];
            clangFreqs.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain); gain.connect(output);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t);
                osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.3);
                gain.gain.setValueAtTime(0.06 - i * 0.01, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25 - i * 0.03);
                osc.start(t); osc.stop(t + 0.3);
            });
            const noise = this.createNoiseOsc(0.08);
            if (noise) {
                const filter = this.ctx.createBiquadFilter();
                const noiseGain = this.ctx.createGain();
                noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(output);
                filter.type = 'highpass'; filter.frequency.value = 2500;
                noiseGain.gain.setValueAtTime(0.1, t);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
                noise.start(t); noise.stop(t + 0.08);
            }
        }
        else if (type === 'digitalError') {
            const beepCount = 4;
            for (let i = 0; i < beepCount; i++) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain); gain.connect(output);
                osc.type = 'square';
                const freq = [800, 1200, 1600, 2000][Math.floor(Math.random() * 4)];
                osc.frequency.value = freq;
                const beepTime = t + i * 0.035;
                gain.gain.setValueAtTime(0.06, beepTime);
                gain.gain.setValueAtTime(0, beepTime + 0.02);
                osc.start(beepTime); osc.stop(beepTime + 0.025);
            }
            const noise = this.createNoiseOsc(0.12);
            if (noise) {
                const filter = this.ctx.createBiquadFilter();
                const noiseGain = this.ctx.createGain();
                noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(output);
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(4000, t);
                filter.frequency.exponentialRampToValueAtTime(1000, t + 0.1);
                filter.Q.value = 5;
                noiseGain.gain.setValueAtTime(0.08, t);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
                noise.start(t); noise.stop(t + 0.12);
            }
            const error = this.ctx.createOscillator();
            const errorGain = this.ctx.createGain();
            error.connect(errorGain); errorGain.connect(output);
            error.type = 'sawtooth';
            error.frequency.setValueAtTime(600, t + 0.05);
            error.frequency.exponentialRampToValueAtTime(200, t + 0.2);
            errorGain.gain.setValueAtTime(0.07, t + 0.05);
            errorGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
            error.start(t + 0.05); error.stop(t + 0.2);
        }
    }

    // Hit sound variants helper
    _playHitVariant(output, t, target) {
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain); osc2.connect(gain); gain.connect(output);
        osc.type = 'square'; osc2.type = 'sawtooth';
        const variant = Math.floor(Math.random() * (target === 'enemy' ? 3 : 2));
        let baseFreq, decay;
        if (target === 'enemy') {
            const freqs = [350, 280, 420];
            baseFreq = freqs[variant] + Math.random() * 50;
            decay = 0.06 + variant * 0.01;
        } else {
            const freqs = [200, 250];
            baseFreq = freqs[variant] + Math.random() * 30;
            decay = 0.1;
        }
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.3, t + decay);
        osc2.frequency.setValueAtTime(baseFreq * 0.5, t);
        osc2.frequency.exponentialRampToValueAtTime(baseFreq * 0.15, t + decay + 0.02);
        const vol = target === 'player' ? 0.15 : 0.1;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.setValueAtTime(vol * 0.7, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, t + decay);
        osc.start(t); osc.stop(t + decay);
        osc2.start(t); osc2.stop(t + decay + 0.02);
    }

    // Coin sound variants helper
    _playCoinVariant(output, t, pitchMult) {
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain); osc2.connect(gain); gain.connect(output);
        osc.type = 'square'; osc2.type = 'triangle';
        const baseFreq = 1200 * pitchMult;
        const highFreq = 1600 * pitchMult;
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.setValueAtTime(highFreq, t + 0.05);
        osc2.frequency.setValueAtTime(baseFreq, t);
        osc2.frequency.setValueAtTime(highFreq, t + 0.05);
        const duration = pitchMult < 1 ? 0.18 : 0.12;
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
        osc.start(t); osc.stop(t + duration);
        osc2.start(t); osc2.stop(t + duration);
    }

    // Create white noise oscillator
    createNoiseOsc(duration) {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        return source;
    }

    startMusic() {
        if (!this.ctx || this.isPlaying) return;
        // Resume suspended context (mobile requires user gesture — startMusic is always called from one)
        if (this.ctx.state === 'suspended') {
            this.unlockWebAudio();
            this.ctx.resume().catch(e => console.warn('[AudioSystem] resume failed:', e));
        }
        this.isPlaying = true;
        this.noteTime = this.ctx.currentTime + 0.1;
        this.noteIndex = 0;
        this.sectionBeat = 0;
        this.structureIndex = 0;
        this.schedule();
    }

    stopMusic() {
        this.isPlaying = false;
        if (this.timerID) clearTimeout(this.timerID);
        this._stopPad();
    }

    // ===== MUSIC SYSTEM v2 (v4.34) =====

    // Get current song data from MusicData
    getCurrentSong() {
        const MD = window.Game.MusicData;
        if (!MD) return null;

        // Boss phase overrides level song
        if (this.bossPhase > 0) {
            const phaseKey = 'phase' + this.bossPhase;
            return MD.BOSS[phaseKey] || MD.BOSS.phase1;
        }

        return MD.SONGS[this.currentLevel] || MD.SONGS[1];
    }

    // Get current section from song structure
    getCurrentSection(song) {
        if (!song || !song.structure || !song.sections) return null;
        const idx = this.structureIndex % song.structure.length;
        const sectionName = song.structure[idx];
        return song.sections[sectionName] || null;
    }

    // Advance to next section in structure
    advanceStructure() {
        const song = this.getCurrentSong();
        if (!song || !song.structure) return;
        this.structureIndex = (this.structureIndex + 1) % song.structure.length;
    }

    // Get tempo for current beat (seconds per beat)
    getCurrentTempo() {
        const song = this.getCurrentSong();
        let bpm = song ? song.bpm : 140;

        // Bear market modifier
        const MD = window.Game.MusicData;
        if (MD && MD.BEAR_MARKET && window.isBearMarket) {
            bpm *= MD.BEAR_MARKET.tempoMult;
        }

        // Intensity speed-up at high intensity
        if (this.intensity >= 80) {
            bpm *= 1.1;
        }

        // Convert BPM to seconds per 16th note (4 beats per bar, 4 16ths per beat)
        // 16 entries = 1 bar = 4 beats → each entry = 1/4 beat
        return 60 / (bpm * 4);
    }

    // Get pitch shift multiplier for bear market
    _getBearPitchMult() {
        const MD = window.Game.MusicData;
        if (MD && MD.BEAR_MARKET && window.isBearMarket) {
            return Math.pow(2, MD.BEAR_MARKET.pitchShift / 12);
        }
        return 1.0;
    }

    schedule() {
        if (!this.isPlaying) return;
        if (this.ctx.state !== 'running') {
            this.timerID = setTimeout(() => this.schedule(), 100);
            return;
        }

        const currentTempo = this.getCurrentTempo();

        while (this.noteTime < this.ctx.currentTime + 0.2) {
            // Beat tracking for HarmonicConductor
            if (this.noteIndex !== this.lastEmittedBeat) {
                this.lastEmittedBeat = this.noteIndex;
            }

            // v4.34: Only create oscillators if music is NOT muted
            if (!this.musicMuted) {
                const song = this.getCurrentSong();
                const section = this.getCurrentSection(song);

                if (section) {
                    const beat = this.sectionBeat;

                    // Bass (always)
                    if (section.bass && section.bass[beat]) {
                        this.playBassFromData(this.noteTime, section.bass[beat]);
                    }

                    // Arp (intensity >= 30)
                    if (this.intensity >= 30 && section.arp && section.arp[beat]) {
                        this.playArpFromData(this.noteTime, section.arp[beat]);
                    }

                    // Drums (intensity >= 50)
                    if (this.intensity >= 50 && section.drums && section.drums[beat]) {
                        this.playDrumsFromData(this.noteTime, section.drums[beat]);
                    }

                    // Melody (intensity >= 60)
                    if (this.intensity >= 60 && section.melody && section.melody[beat]) {
                        this.playMelodyFromData(this.noteTime, section.melody[beat]);
                    }

                    // Pad (intensity >= 40, on section start)
                    if (this.intensity >= 40 && beat === 0 && section.pad) {
                        this.playPadFromData(this.noteTime, section.pad);
                    }
                }
            }

            // ALWAYS advance timing (even when muted — for HarmonicConductor sync)
            this.noteTime += currentTempo;
            this.noteIndex = (this.noteIndex + 1) % 16;
            this.sectionBeat = (this.sectionBeat + 1) % 16;

            if (this.sectionBeat === 0) {
                this.advanceStructure();
            }
        }

        // Expose tempo for HarmonicConductor compatibility
        this.tempo = currentTempo;

        this.timerID = setTimeout(() => this.schedule(), 50);
    }

    // v4.34: Data-driven music methods

    playBassFromData(t, noteData) {
        if (!noteData || !noteData.f) return;
        const output = this.getMusicOutput();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(output);

        let freq = noteData.f * this._getBearPitchMult();
        osc.frequency.value = freq;
        osc.type = 'sawtooth';

        filter.type = 'lowpass';
        const filterPeak = this.bossPhase >= 2 ? 1200 : 800;
        filter.frequency.setValueAtTime(200, t);
        filter.frequency.exponentialRampToValueAtTime(filterPeak, t + 0.05);
        filter.frequency.exponentialRampToValueAtTime(200, t + 0.15);
        filter.Q.value = this.bossPhase >= 2 ? 4 : 1;

        const dur = (noteData.d || 0.5) * this.getCurrentTempo() * 4;
        const vol = (noteData.v || 0.7) * 0.2;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + Math.max(0.05, dur));

        osc.start(t);
        osc.stop(t + Math.max(0.05, dur));
    }

    playArpFromData(t, noteData) {
        if (!noteData || !noteData.f) return;
        const output = this.getMusicOutput();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(output);

        let freq = noteData.f * this._getBearPitchMult();
        osc.frequency.value = freq;
        osc.type = 'square';

        const dur = (noteData.d || 0.25) * this.getCurrentTempo() * 4;
        const vol = (noteData.v || 0.35) * 0.12;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + Math.max(0.03, dur));

        osc.start(t);
        osc.stop(t + Math.max(0.03, dur));
    }

    playMelodyFromData(t, noteData) {
        if (!noteData || !noteData.f) return;
        const output = this.getMusicOutput();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(output);

        let freq = noteData.f * this._getBearPitchMult();
        osc.frequency.value = freq;
        osc.type = noteData.w || 'square';

        const dur = (noteData.d || 0.5) * this.getCurrentTempo() * 4;
        const vol = (noteData.v || 0.5) * 0.1;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + Math.max(0.05, dur));

        osc.start(t);
        osc.stop(t + Math.max(0.05, dur));
    }

    playDrumsFromData(t, drumData) {
        if (!drumData) return;
        const output = this.getMusicOutput();

        // Kick
        if (drumData.k) {
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

        // Snare
        if (drumData.s) {
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

        // Hi-hat
        if (drumData.h) {
            const isOpen = drumData.h === 0.5;
            const hhDur = isOpen ? 0.08 : 0.03;
            const noise = this.createNoiseOsc(hhDur);
            if (noise) {
                const filter = this.ctx.createBiquadFilter();
                const hhGain = this.ctx.createGain();
                noise.connect(filter);
                filter.connect(hhGain);
                hhGain.connect(output);
                filter.type = 'highpass';
                filter.frequency.value = 8000;
                hhGain.gain.setValueAtTime(isOpen ? 0.06 : 0.04, t);
                hhGain.gain.exponentialRampToValueAtTime(0.01, t + hhDur);
                noise.start(t);
                noise.stop(t + hhDur);
            }
        }

        // Crash
        if (drumData.c) {
            const noise = this.createNoiseOsc(0.3);
            if (noise) {
                const filter = this.ctx.createBiquadFilter();
                const crashGain = this.ctx.createGain();
                noise.connect(filter);
                filter.connect(crashGain);
                crashGain.connect(output);
                filter.type = 'highpass';
                filter.frequency.value = 4000;
                crashGain.gain.setValueAtTime(0.08, t);
                crashGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                noise.start(t);
                noise.stop(t + 0.3);
            }
        }
    }

    playPadFromData(t, padData) {
        if (!padData || !padData.freqs) return;
        this._stopPad();

        const output = this.getMusicOutput();
        const pitchMult = this._getBearPitchMult();
        this.padNodes = [];

        padData.freqs.forEach(freq => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(output);
            osc.type = padData.w || 'triangle';
            osc.frequency.value = freq * pitchMult;
            gain.gain.setValueAtTime(padData.v || 0.08, t);
            // Pad sustains for ~4 beats then fades
            const sustainTime = this.getCurrentTempo() * 16;
            gain.gain.setValueAtTime(padData.v || 0.08, t + sustainTime * 0.8);
            gain.gain.exponentialRampToValueAtTime(0.001, t + sustainTime);
            osc.start(t);
            osc.stop(t + sustainTime + 0.1);
            this.padNodes.push({ osc, gain });
        });
    }

    _stopPad() {
        if (this.padNodes) {
            const now = this.ctx ? this.ctx.currentTime : 0;
            this.padNodes.forEach(n => {
                try {
                    n.gain.gain.cancelScheduledValues(now);
                    n.gain.gain.setValueAtTime(0.001, now);
                    n.osc.stop(now + 0.05);
                } catch (e) { /* already stopped */ }
            });
            this.padNodes = null;
        }
    }

    toggleMute() {
        if (!this.ctx) this.init();
        if (!this.ctx) return true;

        if (this.ctx.state === 'suspended') {
            this.unlockWebAudio();
            this.ctx.resume().catch(e => console.error(e));
            if (!this.isPlaying) this.startMusic();
            return false;
        }

        if (this.ctx.state === 'running') {
            this.ctx.suspend();
            return true;
        }

        return false;
    }

    unlockWebAudio() {
        if (!this.ctx) return;
        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start(0);
    }
}

// Attach to namespace
window.Game.Audio = new AudioSystem();
