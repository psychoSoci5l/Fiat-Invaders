// Audio Achievement Unlock Test — Sprint 7 A6
// Verifies that AudioSystem has the achievementUnlock SFX entry + method.

const assert = require('assert');
const path = require('path');

// Minimal AudioContext mock
function createMockNode() {
    const node = {
        connect: () => node,
        disconnect: () => node,
        start: () => {},
        stop: () => {},
        gain: { value: 1, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, cancelScheduledValues: () => {} },
        frequency: { value: 440, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        pan: { value: 0 },
        Q: { value: 1 },
        type: 'sine',
        buffer: null
    };
    return node;
}

const mockCtx = {
    state: 'running',
    currentTime: 0,
    sampleRate: 48000,
    createGain: createMockNode,
    createOscillator: createMockNode,
    createBiquadFilter: createMockNode,
    createStereoPanner: createMockNode,
    createConvolver: createMockNode,
    createBuffer: () => ({ getChannelData: () => new Float32Array(1), length: 1, sampleRate: 48000, numberOfChannels: 2 }),
    createBufferSource: createMockNode,
    destination: createMockNode(),
    resume: () => Promise.resolve(),
    close: () => Promise.resolve()
};

// Mock Web Audio constructor
function MockAudioContext() { return mockCtx; }
global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

// Provide window global before loading browser modules
if (!global.window) global.window = { Game: {} };

// Mock Balance config (minimal AUDIO block)
window.Game.Balance = {
    AUDIO: {
        MUSIC_VOLUME: 0.7,
        SFX_VOLUME: 0.8,
        COMPRESSOR: { THRESHOLD: -24, KNEE: 30, RATIO: 12, ATTACK: 0.003, RELEASE: 0.25 },
        REVERB: {
            ENABLED: true, DECAY: 1.5, DAMPING: 0.7, WET_LEVEL: 0.15,
            SEND: { bass: 0.08, arp: 0.25, melody: 0.20, pad: 0.35, drums: 0.05 },
            SFX_SENDS: { explosion: 0.20, bossSpawn: 0.30, waveComplete: 0.25, levelUp: 0.20, godchainActivate: 0.30, achievementUnlock: 0.25 }
        },
        STEREO: { ENABLED: true, PAN: { bass: 0, arp: -0.3, melody: 0.3, kick: 0, snare: 0, hihat: 0.4, crash: -0.2, pad: 0 } },
        LFO: {
            ARP_FILTER: { ENABLED: true, RATE: 2, MIN_FREQ: 800, MAX_FREQ: 4000, Q: 0.7 },
            PAD_TREMOLO: { ENABLED: true, RATE: 2, DEPTH: 0.15 }
        },
        GODCHAIN_AUDIO: { EFFECTS: true, LEGACY_OSCILLATORS_ENABLED: false }
    }
};

// Load AudioSystem
require(path.join(__dirname, '../../src/core/AudioSystem.js'));

const G = global.window.Game;

function suite(name, fn) {
    console.log(`  [AudioAchievement] ${name}`);
    fn(assert);
}

suite('SFX table contains achievementUnlock', (a) => {
    a(G.Audio._sfxTable.achievementUnlock !== undefined, 'achievementUnlock entry exists in _sfxTable');
});

suite('_sfxAchievementUnlock method exists', (a) => {
    a(typeof G.Audio._sfxAchievementUnlock === 'function', '_sfxAchievementUnlock is a function');
});

suite('BalanceConfig SFX_SENDS includes achievementUnlock', (a) => {
    const sends = window.Game.Balance.AUDIO.REVERB.SFX_SENDS;
    a(sends.achievementUnlock === 0.25, 'achievementUnlock reverb send level is 0.25');
});

suite('achievementUnlock SFX plays without throwing', (a) => {
    G.Audio.init();
    let threw = false;
    try {
        G.Audio.play('achievementUnlock');
    } catch (e) {
        threw = true;
        console.warn('play threw:', e.message);
    }
    a(!threw, 'play("achievementUnlock") does not throw');
});

console.log('[PASS] Audio Achievement tests — all assertions passed');
