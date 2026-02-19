window.Game = window.Game || {};
const G = window.Game;

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

        // v6.7: Audio richness — persistent sub-buses & effects
        this._bassBus = null;
        this._arpBus = null;
        this._melBus = null;
        this._drumBus = null;
        this._padBus = null;
        this._reverbConvolver = null;
        this._reverbWet = null;
        this._reverbBus = null;
        this._sfxReverbSend = null;
        this._arpLFO = null;
        this._arpFilter = null;
        this._padTremoloLFO = null;
        this._padTremoloGain = null;
        this._stereoPanners = {};     // { bass, arp, melody, kick, snare, hihat, crash, pad }
        this._reverbSends = {};       // { bass, arp, melody, pad, drums }
        this._drumPanners = {};       // { kick, snare, hihat, crash }
        this._currentAudioTier = null;
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

            // v6.7: Create instrument sub-buses → musicGain
            this._bassBus = this.ctx.createGain();
            this._arpBus = this.ctx.createGain();
            this._melBus = this.ctx.createGain();
            this._drumBus = this.ctx.createGain();
            this._padBus = this.ctx.createGain();
            this._bassBus.connect(this.musicGain);
            this._arpBus.connect(this.musicGain);
            this._melBus.connect(this.musicGain);
            this._drumBus.connect(this.musicGain);
            this._padBus.connect(this.musicGain);

            // v6.7: Audio richness chain (order matters)
            this._applyCompressorConfig(this.ctx);
            this._initStereoPanning(this.ctx);
            this._initReverbBus(this.ctx);
            this._initArpLFO(this.ctx);
            this._initPadTremolo(this.ctx);

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

    // ===== v6.7: AUDIO RICHNESS INIT METHODS =====

    _applyCompressorConfig(ac) {
        const cfg = G.Balance?.AUDIO?.COMPRESSOR;
        if (!cfg || !this.compressor) return;
        this.compressor.threshold.value = cfg.THRESHOLD;
        this.compressor.knee.value = cfg.KNEE;
        this.compressor.ratio.value = cfg.RATIO;
        this.compressor.attack.value = cfg.ATTACK;
        this.compressor.release.value = cfg.RELEASE;
    }

    _initStereoPanning(ac) {
        const cfg = G.Balance?.AUDIO?.STEREO;
        if (!cfg?.ENABLED) return;
        if (typeof ac.createStereoPanner !== 'function') return;

        const panCfg = cfg.PAN;
        // Instrument bus panners — insert between bus and musicGain
        const busPairs = [
            ['bass', this._bassBus], ['arp', this._arpBus],
            ['melody', this._melBus], ['pad', this._padBus]
        ];
        busPairs.forEach(([name, bus]) => {
            const panner = ac.createStereoPanner();
            panner.pan.value = panCfg[name] ?? 0;
            bus.disconnect();
            bus.connect(panner);
            panner.connect(this.musicGain);
            this._stereoPanners[name] = panner;
        });

        // Drum element panners (individual — used in playDrumsFromData)
        ['kick', 'snare', 'hihat', 'crash'].forEach(elem => {
            const panner = ac.createStereoPanner();
            panner.pan.value = panCfg[elem] ?? 0;
            panner.connect(this._drumBus);
            this._drumPanners[elem] = panner;
        });
    }

    _initReverbBus(ac) {
        const cfg = G.Balance?.AUDIO?.REVERB;
        if (!cfg?.ENABLED) return;

        // Generate procedural impulse response (stereo)
        const sampleRate = ac.sampleRate;
        const length = Math.ceil(sampleRate * cfg.DECAY);
        const impulse = ac.createBuffer(2, length, sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const data = impulse.getChannelData(ch);
            for (let i = 0; i < length; i++) {
                // Exponential decay with damping (high-freq rolloff via random sign balance)
                const t = i / sampleRate;
                const decay = Math.exp(-t * (3.0 / cfg.DECAY));
                const damping = 1.0 - cfg.DAMPING * (t / cfg.DECAY);
                data[i] = (Math.random() * 2 - 1) * decay * Math.max(0, damping);
            }
        }

        this._reverbConvolver = ac.createConvolver();
        this._reverbConvolver.buffer = impulse;

        this._reverbWet = ac.createGain();
        this._reverbWet.gain.value = cfg.WET_LEVEL;

        this._reverbBus = ac.createGain();
        this._reverbBus.gain.value = 1.0;

        // Chain: reverbBus → convolver → wet → masterGain
        this._reverbBus.connect(this._reverbConvolver);
        this._reverbConvolver.connect(this._reverbWet);
        this._reverbWet.connect(this.masterGain);

        // Create send gains from each instrument bus
        const sendCfg = cfg.SEND;
        const busPairs = [
            ['bass', this._bassBus], ['arp', this._arpBus],
            ['melody', this._melBus], ['pad', this._padBus],
            ['drums', this._drumBus]
        ];
        busPairs.forEach(([name, bus]) => {
            const sendGain = ac.createGain();
            sendGain.gain.value = sendCfg[name] ?? 0;
            bus.connect(sendGain);
            sendGain.connect(this._reverbBus);
            this._reverbSends[name] = sendGain;
        });

        // SFX reverb send (single shared node, gain set per-SFX)
        this._sfxReverbSend = ac.createGain();
        this._sfxReverbSend.gain.value = 0;
        this._sfxReverbSend.connect(this._reverbBus);
    }

    _initArpLFO(ac) {
        const cfg = G.Balance?.AUDIO?.LFO?.ARP_FILTER;
        if (!cfg?.ENABLED) return;

        // Create filter between arpBus and its downstream (panner or musicGain)
        this._arpFilter = ac.createBiquadFilter();
        this._arpFilter.type = 'lowpass';
        this._arpFilter.frequency.value = (cfg.MIN_FREQ + cfg.MAX_FREQ) / 2;
        this._arpFilter.Q.value = cfg.Q;

        // Disconnect arpBus from current downstream, insert filter
        const downstream = this._stereoPanners.arp || this.musicGain;
        this._arpBus.disconnect();
        this._arpBus.connect(this._arpFilter);
        this._arpFilter.connect(downstream);
        // Reconnect reverb send if exists
        if (this._reverbSends.arp) {
            this._arpBus.connect(this._reverbSends.arp);
        }

        // LFO oscillator → gain (depth) → filter.frequency
        this._arpLFO = ac.createOscillator();
        this._arpLFO.type = 'sine';
        this._arpLFO.frequency.value = cfg.RATE;
        const lfoGain = ac.createGain();
        lfoGain.gain.value = (cfg.MAX_FREQ - cfg.MIN_FREQ) / 2;
        this._arpLFO.connect(lfoGain);
        lfoGain.connect(this._arpFilter.frequency);
        this._arpLFO.start();
        this._arpLFOGain = lfoGain;
    }

    _initPadTremolo(ac) {
        const cfg = G.Balance?.AUDIO?.LFO?.PAD_TREMOLO;
        if (!cfg?.ENABLED) return;

        // LFO → gain depth → padBus.gain (amplitude modulation)
        this._padTremoloLFO = ac.createOscillator();
        this._padTremoloLFO.type = 'sine';
        this._padTremoloLFO.frequency.value = cfg.RATE;
        this._padTremoloGain = ac.createGain();
        this._padTremoloGain.gain.value = cfg.DEPTH;
        this._padTremoloLFO.connect(this._padTremoloGain);
        this._padTremoloGain.connect(this._padBus.gain);
        this._padTremoloLFO.start();
    }

    _getSfxReverbOutput(type) {
        const cfg = G.Balance?.AUDIO?.REVERB;
        if (!cfg?.ENABLED || !this._sfxReverbSend || !cfg.SFX_SENDS) return null;
        const sendLevel = cfg.SFX_SENDS[type];
        if (!sendLevel) return null;
        return { node: this._sfxReverbSend, level: sendLevel };
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

        // v6.7: SFX reverb send for qualifying types
        const reverbInfo = this._getSfxReverbOutput(type);
        if (reverbInfo) {
            reverbInfo.node.gain.setValueAtTime(reverbInfo.level, t);
            // Schedule gain back to 0 after 1s to avoid bleed
            reverbInfo.node.gain.setValueAtTime(0, t + 1.0);
        }
        // SFX reverb: qualifying types also connect their final gain to sfxReverbSend
        const sfxReverbNode = reverbInfo ? reverbInfo.node : null;

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
            if (sfxReverbNode) subG.connect(sfxReverbNode);
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
            if (sfxReverbNode) sweepGain.connect(sfxReverbNode);
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
                if (sfxReverbNode) gain.connect(sfxReverbNode);
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
                if (sfxReverbNode) gain.connect(sfxReverbNode);
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
        // v5.15: Cyber destruction SFX (tier-differentiated)
        else if (type === 'enemyDestroy') {
            const sfxCfg = window.Game.Balance?.VFX?.ENEMY_DESTROY?.SFX;
            const tier = (opts && opts.tier) || 'WEAK';
            const tc = sfxCfg?.[tier] || { VOLUME: 0.08, DURATION: 0.08 };
            const vol = tc.VOLUME;
            const dur = tc.DURATION;
            // Layer 1: Noise crunch (highpass filtered)
            const bufSize = 4096;
            const nBuf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
            const nData = nBuf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) nData[i] = Math.random() * 2 - 1;
            const noise = this.ctx.createBufferSource();
            noise.buffer = nBuf;
            const hp = this.ctx.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.value = tier === 'WEAK' ? 2500 : tier === 'MEDIUM' ? 1800 : 1200;
            hp.Q.value = 1.5;
            const nGain = this.ctx.createGain();
            noise.connect(hp); hp.connect(nGain); nGain.connect(output);
            nGain.gain.setValueAtTime(vol, t);
            nGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
            noise.start(t); noise.stop(t + dur + 0.01);
            // Layer 2: Sub-bass thud (MEDIUM/STRONG only)
            if (tier !== 'WEAK') {
                const sub = this.ctx.createOscillator();
                const subG = this.ctx.createGain();
                sub.connect(subG); subG.connect(output);
                sub.type = 'sine';
                sub.frequency.setValueAtTime(tier === 'STRONG' ? 80 : 100, t);
                sub.frequency.exponentialRampToValueAtTime(40, t + dur);
                subG.gain.setValueAtTime(vol * 0.7, t);
                subG.gain.exponentialRampToValueAtTime(0.001, t + dur);
                sub.start(t); sub.stop(t + dur + 0.01);
            }
            // Layer 3: Square snap (descending sweep)
            const snap = this.ctx.createOscillator();
            const snapG = this.ctx.createGain();
            snap.connect(snapG); snapG.connect(output);
            snap.type = 'square';
            snap.frequency.setValueAtTime(tier === 'STRONG' ? 600 : tier === 'MEDIUM' ? 500 : 400, t);
            snap.frequency.exponentialRampToValueAtTime(80, t + dur * 0.8);
            snapG.gain.setValueAtTime(vol * 0.5, t);
            snapG.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.6);
            snap.start(t); snap.stop(t + dur + 0.01);
        }
        // v5.15: Elemental destroy layer
        else if (type === 'elemDestroyLayer') {
            const eCfg = window.Game.Balance?.VFX?.ENEMY_DESTROY?.SFX?.ELEM_LAYER;
            if (!eCfg?.ENABLED) { /* skip */ }
            else {
                const eType = (opts && opts.elemType) || 'fire';
                const vol = eCfg.VOLUME;
                const dur = eCfg.DURATION;
                if (eType === 'fire') {
                    // Bandpass noise at 200Hz (low rumble)
                    const bufSize = 4096;
                    const nBuf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
                    const nData = nBuf.getChannelData(0);
                    for (let i = 0; i < bufSize; i++) nData[i] = Math.random() * 2 - 1;
                    const noise = this.ctx.createBufferSource();
                    noise.buffer = nBuf;
                    const bp = this.ctx.createBiquadFilter();
                    bp.type = 'bandpass'; bp.frequency.value = 200; bp.Q.value = 3;
                    const g = this.ctx.createGain();
                    noise.connect(bp); bp.connect(g); g.connect(output);
                    g.gain.setValueAtTime(vol, t);
                    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
                    noise.start(t); noise.stop(t + dur + 0.01);
                } else if (eType === 'laser') {
                    // Triangle sweep 1800→2700→1080Hz (crystalline)
                    const osc = this.ctx.createOscillator();
                    const g = this.ctx.createGain();
                    osc.connect(g); g.connect(output);
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(1800, t);
                    osc.frequency.linearRampToValueAtTime(2700, t + dur * 0.4);
                    osc.frequency.linearRampToValueAtTime(1080, t + dur);
                    g.gain.setValueAtTime(vol, t);
                    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
                    osc.start(t); osc.stop(t + dur + 0.01);
                } else if (eType === 'electric') {
                    // 3 rapid square pulses at ~900Hz (zap crackling)
                    for (let i = 0; i < 3; i++) {
                        const osc = this.ctx.createOscillator();
                        const g = this.ctx.createGain();
                        osc.connect(g); g.connect(output);
                        osc.type = 'square';
                        osc.frequency.value = 900 + (Math.random() - 0.5) * 200;
                        const pStart = t + i * 0.03;
                        const pDur = 0.02;
                        g.gain.setValueAtTime(vol, pStart);
                        g.gain.exponentialRampToValueAtTime(0.001, pStart + pDur);
                        osc.start(pStart); osc.stop(pStart + pDur + 0.01);
                    }
                }
            }
        }
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
            if (sfxReverbNode) sweepGain.connect(sfxReverbNode);
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
        // === TITLE BOOM (v4.35 — FIAT slam) ===
        else if (type === 'titleBoom') {
            const vol = (G.Balance && G.Balance.TITLE_ANIM) ? G.Balance.TITLE_ANIM.SFX.BOOM_VOLUME : 0.7;
            // Sub bass impact
            const sub = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            sub.connect(subGain); subGain.connect(output);
            sub.type = 'sine';
            sub.frequency.setValueAtTime(100, t);
            sub.frequency.exponentialRampToValueAtTime(40, t + 0.3);
            subGain.gain.setValueAtTime(0.3 * vol, t);
            subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
            sub.start(t); sub.stop(t + 0.4);
            // Metallic ring
            const ring = this.ctx.createOscillator();
            const ringGain = this.ctx.createGain();
            ring.connect(ringGain); ringGain.connect(output);
            ring.type = 'square';
            ring.frequency.setValueAtTime(800, t);
            ring.frequency.exponentialRampToValueAtTime(200, t + 0.25);
            ringGain.gain.setValueAtTime(0.12 * vol, t);
            ringGain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
            ring.start(t); ring.stop(t + 0.3);
            // Noise burst
            const noise = this.createNoiseOsc(0.25);
            if (noise) {
                const filter = this.ctx.createBiquadFilter();
                const nGain = this.ctx.createGain();
                noise.connect(filter); filter.connect(nGain); nGain.connect(output);
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(1500, t);
                filter.frequency.exponentialRampToValueAtTime(200, t + 0.2);
                nGain.gain.setValueAtTime(0.15 * vol, t);
                nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
                noise.start(t); noise.stop(t + 0.25);
            }
        }
        // === TITLE ZAP (v4.35 — CRYPTO electric sweep) ===
        else if (type === 'titleZap') {
            const vol = (G.Balance && G.Balance.TITLE_ANIM) ? G.Balance.TITLE_ANIM.SFX.ZAP_VOLUME : 0.7;
            // Electric sweep
            const sweep = this.ctx.createOscillator();
            const sweepGain = this.ctx.createGain();
            sweep.connect(sweepGain); sweepGain.connect(output);
            sweep.type = 'sawtooth';
            sweep.frequency.setValueAtTime(2400, t);
            sweep.frequency.exponentialRampToValueAtTime(400, t + 0.2);
            sweepGain.gain.setValueAtTime(0.12 * vol, t);
            sweepGain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
            sweep.start(t); sweep.stop(t + 0.25);
            // Sub punch
            const sub = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            sub.connect(subGain); subGain.connect(output);
            sub.type = 'sine';
            sub.frequency.setValueAtTime(150, t);
            sub.frequency.exponentialRampToValueAtTime(60, t + 0.2);
            subGain.gain.setValueAtTime(0.25 * vol, t);
            subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
            sub.start(t); sub.stop(t + 0.3);
            // High noise crackle
            const noise = this.createNoiseOsc(0.15);
            if (noise) {
                const filter = this.ctx.createBiquadFilter();
                const nGain = this.ctx.createGain();
                noise.connect(filter); filter.connect(nGain); nGain.connect(output);
                filter.type = 'highpass';
                filter.frequency.value = 3000;
                nGain.gain.setValueAtTime(0.1 * vol, t);
                nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
                noise.start(t); noise.stop(t + 0.15);
            }
        }
        // === WEAPON DEPLOY SFX (v5.2 — mechanical slide-out) ===
        else if (type === 'weaponDeploy') {
            // Start phase: square wave sweep 150→90Hz + noise burst bandpass 2kHz
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain); gain.connect(output);
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(90, t + 0.18);
            gain.gain.setValueAtTime(0.10, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
            osc.start(t); osc.stop(t + 0.18);

            const noise = this.createNoiseOsc(0.12);
            if (noise) {
                const filter = this.ctx.createBiquadFilter();
                const nGain = this.ctx.createGain();
                noise.connect(filter); filter.connect(nGain); nGain.connect(output);
                filter.type = 'bandpass';
                filter.frequency.value = 2000;
                filter.Q.value = 3;
                nGain.gain.setValueAtTime(0.08, t);
                nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
                noise.start(t); noise.stop(t + 0.12);
            }
        }
        else if (type === 'weaponDeployLock') {
            // Lock phase: triangle sweep 280→112Hz + square click 80Hz
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain); gain.connect(output);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(280, t);
            osc.frequency.exponentialRampToValueAtTime(112, t + 0.10);
            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.10);
            osc.start(t); osc.stop(t + 0.10);

            const click = this.ctx.createOscillator();
            const clickGain = this.ctx.createGain();
            click.connect(clickGain); clickGain.connect(output);
            click.type = 'square';
            click.frequency.value = 80;
            clickGain.gain.setValueAtTime(0.10, t);
            clickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.03);
            click.start(t); click.stop(t + 0.03);
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

    // Create white noise oscillator (cached buffers to reduce GC pressure)
    createNoiseOsc(duration) {
        if (!this.ctx) return null;
        // Cache noise buffers by rounded duration key (avoids creating new buffer each call)
        if (!this._noiseBufferCache) this._noiseBufferCache = {};
        const key = Math.round(duration * 1000); // ms precision
        if (!this._noiseBufferCache[key]) {
            const bufferSize = Math.ceil(this.ctx.sampleRate * duration);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
            this._noiseBufferCache[key] = buffer;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = this._noiseBufferCache[key];
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

        // Prevent burst catch-up after tab regains focus (caps to 8 beats ahead)
        const maxLag = currentTempo * 8;
        if (this.noteTime < this.ctx.currentTime - maxLag) {
            this.noteTime = this.ctx.currentTime;
        }

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
        const output = this._bassBus || this.getMusicOutput();
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
        const output = this._arpBus || this.getMusicOutput();
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
        const output = this._melBus || this.getMusicOutput();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        let freq = noteData.f * this._getBearPitchMult();
        osc.frequency.value = freq;
        osc.type = noteData.w || 'square';

        const dur = (noteData.d || 0.5) * this.getCurrentTempo() * 4;
        const vol = (noteData.v || 0.5) * 0.1;
        const safeDur = Math.max(0.05, dur);

        // v6.7: Per-note lowpass filter with attack/release envelope
        const lfoCfg = G.Balance?.AUDIO?.LFO?.MELODY_FILTER;
        if (lfoCfg?.ENABLED) {
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.Q.value = lfoCfg.Q;
            filter.frequency.setValueAtTime(lfoCfg.RELEASE_FREQ, t);
            filter.frequency.exponentialRampToValueAtTime(lfoCfg.ATTACK_FREQ, t + safeDur * 0.15);
            filter.frequency.exponentialRampToValueAtTime(lfoCfg.RELEASE_FREQ, t + safeDur);
            osc.connect(filter);
            filter.connect(gain);
        } else {
            osc.connect(gain);
        }
        gain.connect(output);

        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + safeDur);

        osc.start(t);
        osc.stop(t + safeDur);
    }

    playDrumsFromData(t, drumData) {
        if (!drumData) return;
        const output = this._drumBus || this.getMusicOutput();
        const drumsCfg = G.Balance?.AUDIO?.DRUMS;

        // Kick
        if (drumData.k) {
            const kickOut = this._drumPanners.kick || output;
            const kick = this.ctx.createOscillator();
            const kickGain = this.ctx.createGain();
            kick.connect(kickGain);
            kickGain.connect(kickOut);
            kick.type = 'sine';
            kick.frequency.setValueAtTime(150, t);
            kick.frequency.exponentialRampToValueAtTime(40, t + 0.1);
            kickGain.gain.setValueAtTime(0.2, t);
            kickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            kick.start(t);
            kick.stop(t + 0.1);

            // v6.7: Kick sub-bass layer
            if (drumsCfg?.KICK_SUB?.ENABLED) {
                const sub = this.ctx.createOscillator();
                const subG = this.ctx.createGain();
                sub.connect(subG);
                subG.connect(kickOut);
                sub.type = 'sine';
                sub.frequency.setValueAtTime(drumsCfg.KICK_SUB.FREQ, t);
                sub.frequency.exponentialRampToValueAtTime(20, t + drumsCfg.KICK_SUB.DECAY);
                subG.gain.setValueAtTime(drumsCfg.KICK_SUB.VOLUME, t);
                subG.gain.exponentialRampToValueAtTime(0.001, t + drumsCfg.KICK_SUB.DECAY);
                sub.start(t);
                sub.stop(t + drumsCfg.KICK_SUB.DECAY + 0.01);
            }
        }

        // Snare
        if (drumData.s) {
            const snareOut = this._drumPanners.snare || output;
            const noise = this.createNoiseOsc(0.08);
            if (noise) {
                const filter = this.ctx.createBiquadFilter();
                const noiseGain = this.ctx.createGain();
                noise.connect(filter);
                filter.connect(noiseGain);
                noiseGain.connect(snareOut);
                filter.type = 'highpass';
                filter.frequency.value = 2000;
                noiseGain.gain.setValueAtTime(0.1, t);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
                noise.start(t);
                noise.stop(t + 0.08);
            }

            // v6.7: Snare body (tonal layer)
            if (drumsCfg?.SNARE_BODY?.ENABLED) {
                const body = this.ctx.createOscillator();
                const bodyG = this.ctx.createGain();
                body.connect(bodyG);
                bodyG.connect(snareOut);
                body.type = 'triangle';
                body.frequency.setValueAtTime(drumsCfg.SNARE_BODY.FREQ, t);
                body.frequency.exponentialRampToValueAtTime(80, t + drumsCfg.SNARE_BODY.DECAY);
                bodyG.gain.setValueAtTime(drumsCfg.SNARE_BODY.VOLUME, t);
                bodyG.gain.exponentialRampToValueAtTime(0.001, t + drumsCfg.SNARE_BODY.DECAY);
                body.start(t);
                body.stop(t + drumsCfg.SNARE_BODY.DECAY + 0.01);
            }
        }

        // Hi-hat
        if (drumData.h) {
            const hhOut = this._drumPanners.hihat || output;
            const isOpen = drumData.h === 0.5;
            const openDecay = drumsCfg?.HIHAT_OPEN_DECAY ?? 0.08;
            const hhDur = isOpen ? openDecay : 0.03;
            const noise = this.createNoiseOsc(hhDur);
            if (noise) {
                const filter = this.ctx.createBiquadFilter();
                const hhGain = this.ctx.createGain();
                noise.connect(filter);
                filter.connect(hhGain);
                hhGain.connect(hhOut);
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
            const crashOut = this._drumPanners.crash || output;
            const noise = this.createNoiseOsc(0.3);
            if (noise) {
                const filter = this.ctx.createBiquadFilter();
                const crashGain = this.ctx.createGain();
                noise.connect(filter);
                filter.connect(crashGain);
                crashGain.connect(crashOut);
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

        const output = this._padBus || this.getMusicOutput();
        const pitchMult = this._getBearPitchMult();
        const detuneCfg = G.Balance?.AUDIO?.LFO?.PAD_DETUNE;
        this.padNodes = [];

        padData.freqs.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(output);
            osc.type = padData.w || 'triangle';
            osc.frequency.value = freq * pitchMult;
            // v6.7: Alternate detune ±cents for chorus width
            if (detuneCfg?.ENABLED) {
                osc.detune.value = (i % 2 === 0) ? detuneCfg.CENTS : -detuneCfg.CENTS;
            }
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

    // ===== v6.7: Quality tier audio scaling =====
    applyQualityTier(tierName) {
        if (!this.ctx) return;
        this._currentAudioTier = tierName;
        const cfg = G.Balance?.AUDIO;
        if (!cfg) return;

        if (tierName === 'ULTRA' || tierName === 'HIGH') {
            // Full effects — restore config values
            if (this._reverbWet) this._reverbWet.gain.value = cfg.REVERB?.WET_LEVEL ?? 0.15;
            // Stereo: restore config pan values
            const panCfg = cfg.STEREO?.PAN;
            if (panCfg) {
                Object.keys(this._stereoPanners).forEach(k => {
                    if (this._stereoPanners[k]) this._stereoPanners[k].pan.value = panCfg[k] ?? 0;
                });
                Object.keys(this._drumPanners).forEach(k => {
                    if (this._drumPanners[k]) this._drumPanners[k].pan.value = panCfg[k] ?? 0;
                });
            }
            // Arp LFO: restore
            if (this._arpLFOGain) this._arpLFOGain.gain.value = ((cfg.LFO?.ARP_FILTER?.MAX_FREQ ?? 4000) - (cfg.LFO?.ARP_FILTER?.MIN_FREQ ?? 800)) / 2;
            // Pad tremolo: restore
            if (this._padTremoloGain) this._padTremoloGain.gain.value = cfg.LFO?.PAD_TREMOLO?.DEPTH ?? 0.3;
            // Compressor: relaxed
            if (this.compressor) {
                this.compressor.threshold.value = cfg.COMPRESSOR?.THRESHOLD ?? -18;
                this.compressor.ratio.value = cfg.COMPRESSOR?.RATIO ?? 6;
            }
            // ULTRA: slightly more reverb
            if (tierName === 'ULTRA' && this._reverbWet) {
                this._reverbWet.gain.value = 0.18;
            }
        }
        else if (tierName === 'MEDIUM') {
            // Disable: reverb, LFO, tremolo, drum enhancements (via config check at play-time)
            if (this._reverbWet) this._reverbWet.gain.value = 0;
            // Arp LFO: silence
            if (this._arpLFOGain) this._arpLFOGain.gain.value = 0;
            // Pad tremolo: silence
            if (this._padTremoloGain) this._padTremoloGain.gain.value = 0;
            // Stereo: keep
            // Compressor: tighter
            if (this.compressor) {
                this.compressor.threshold.value = -20;
                this.compressor.ratio.value = 8;
            }
        }
        else if (tierName === 'LOW') {
            // Disable everything — identical to pre-v6.7 sound
            if (this._reverbWet) this._reverbWet.gain.value = 0;
            if (this._arpLFOGain) this._arpLFOGain.gain.value = 0;
            if (this._padTremoloGain) this._padTremoloGain.gain.value = 0;
            // Stereo: flatten all panners to center
            Object.keys(this._stereoPanners).forEach(k => {
                if (this._stereoPanners[k]) this._stereoPanners[k].pan.value = 0;
            });
            Object.keys(this._drumPanners).forEach(k => {
                if (this._drumPanners[k]) this._drumPanners[k].pan.value = 0;
            });
            // Compressor: original aggressive values
            if (this.compressor) {
                this.compressor.threshold.value = -24;
                this.compressor.ratio.value = 12;
            }
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
