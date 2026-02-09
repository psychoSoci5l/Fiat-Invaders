/**
 * MusicData.js — Musical phrases for all levels, boss, and bear market
 *
 * Loaded BEFORE AudioSystem.js. Defines structured musical data
 * that the schedule() loop reads beat-by-beat.
 *
 * Each entry in bass/melody/arp:
 *   { f: freq Hz, d: duration in beats, v: velocity 0-1, w: waveform override }
 *   null = rest/silence
 *
 * Each entry in drums:
 *   { k: kick 0/1, s: snare 0/1, h: hihat 0/1 (0.5=open), c: crash 0/1 }
 *   null = rest
 *
 * Pad: { freqs: [Hz...], v: volume, w: waveform } — sustained chord
 */

window.Game = window.Game || {};

(function() {
    'use strict';

    const G = window.Game;

    // Helper: generate note frequency from MIDI note number
    // A4 = 69 = 440Hz
    function midiToFreq(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }

    // Common note frequencies for readability
    const N = {
        // Octave 2
        C2: 65.41, D2: 73.42, Eb2: 77.78, E2: 82.41, F2: 87.31, G2: 98.00, Ab2: 103.83, A2: 110, Bb2: 116.54,
        // Octave 3
        C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, Gb3: 185.00, G3: 196.00, Ab3: 207.65, A3: 220, Bb3: 233.08, B3: 246.94,
        // Octave 4
        C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, Gb4: 369.99, G4: 392.00, Ab4: 415.30, A4: 440, Bb4: 466.16, B4: 493.88,
        // Octave 5
        C5: 523.25, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, G5: 783.99, Ab5: 830.61, A5: 880, Bb5: 932.33,
        // Octave 6
        C6: 1046.50
    };

    G.MusicData = {

        // =====================================================================
        // LEVEL SONGS
        // =====================================================================
        SONGS: {

            // -----------------------------------------------------------------
            // Level 1 — "Digital Dawn" (C minor, 140 BPM feel)
            // Synth-pop energetico, il "tema del gioco"
            // -----------------------------------------------------------------
            1: {
                name: 'Digital Dawn',
                key: 'Cm',
                bpm: 140,
                sections: {
                    A: {
                        bass: [
                            {f:N.C3,d:0.5,v:0.8}, null, {f:N.G3,d:0.25,v:0.6}, {f:N.C3,d:0.5,v:0.7},
                            {f:N.Eb3,d:0.5,v:0.8}, null, {f:N.Bb3,d:0.25,v:0.6}, {f:N.Eb3,d:0.5,v:0.7},
                            {f:N.F3,d:0.5,v:0.8}, null, {f:N.C3,d:0.25,v:0.6}, {f:N.F3,d:0.5,v:0.7},
                            {f:N.G3,d:0.5,v:0.8}, null, {f:N.D3,d:0.25,v:0.6}, {f:N.G3,d:0.5,v:0.7}
                        ],
                        melody: [
                            {f:N.C5,d:1,v:0.5,w:'square'}, null, {f:N.Eb5,d:0.5,v:0.45}, {f:N.G5,d:0.5,v:0.5},
                            {f:N.F5,d:1,v:0.45}, null, {f:N.Eb5,d:0.5,v:0.4}, {f:N.D5,d:0.5,v:0.45},
                            {f:N.C5,d:1,v:0.5}, null, {f:N.Bb4,d:0.5,v:0.4}, {f:N.C5,d:0.5,v:0.45},
                            {f:N.Eb5,d:1,v:0.5}, null, {f:N.D5,d:0.5,v:0.4}, null
                        ],
                        arp: [
                            {f:N.C4,d:0.25,v:0.4}, {f:N.Eb4,d:0.25,v:0.35}, {f:N.G4,d:0.25,v:0.4}, {f:N.C5,d:0.25,v:0.35},
                            {f:N.Eb4,d:0.25,v:0.4}, {f:N.G4,d:0.25,v:0.35}, {f:N.Bb4,d:0.25,v:0.4}, {f:N.Eb5,d:0.25,v:0.35},
                            {f:N.F4,d:0.25,v:0.4}, {f:N.Ab4,d:0.25,v:0.35}, {f:N.C5,d:0.25,v:0.4}, {f:N.F5,d:0.25,v:0.35},
                            {f:N.G4,d:0.25,v:0.4}, {f:N.Bb4,d:0.25,v:0.35}, {f:N.D5,d:0.25,v:0.4}, {f:N.G5,d:0.25,v:0.35}
                        ],
                        drums: [
                            {k:1,h:1}, {h:1}, {h:1}, {h:1},
                            {k:0,s:1,h:1}, {h:1}, {h:1}, {h:1},
                            {k:1,h:1}, {h:1}, {k:1,h:1}, {h:1},
                            {k:0,s:1,h:1}, {h:1}, {h:1}, {h:0.5}
                        ],
                        pad: {freqs:[N.C4, N.Eb4, N.G4], v:0.08, w:'triangle'}
                    },
                    B: {
                        bass: [
                            {f:N.Ab2,d:0.5,v:0.8}, null, {f:N.Eb3,d:0.25,v:0.6}, {f:N.Ab2,d:0.5,v:0.7},
                            {f:N.Bb2,d:0.5,v:0.8}, null, {f:N.F3,d:0.25,v:0.6}, {f:N.Bb2,d:0.5,v:0.7},
                            {f:N.C3,d:0.5,v:0.8}, null, {f:N.G3,d:0.25,v:0.6}, {f:N.C3,d:0.5,v:0.7},
                            {f:N.G2,d:0.5,v:0.8}, null, {f:N.D3,d:0.25,v:0.6}, {f:N.G3,d:0.5,v:0.7}
                        ],
                        melody: [
                            {f:N.Eb5,d:1,v:0.5,w:'square'}, null, {f:N.F5,d:0.5,v:0.45}, {f:N.G5,d:0.5,v:0.5},
                            {f:N.Bb5,d:1.5,v:0.5}, null, null, {f:N.Ab5,d:0.5,v:0.4},
                            {f:N.G5,d:1,v:0.5}, null, {f:N.F5,d:0.5,v:0.45}, {f:N.Eb5,d:0.5,v:0.45},
                            {f:N.D5,d:1,v:0.45}, null, {f:N.C5,d:1,v:0.5}, null
                        ],
                        arp: [
                            {f:N.Ab4,d:0.25,v:0.4}, {f:N.C5,d:0.25,v:0.35}, {f:N.Eb5,d:0.25,v:0.4}, {f:N.Ab4,d:0.25,v:0.35},
                            {f:N.Bb4,d:0.25,v:0.4}, {f:N.D5,d:0.25,v:0.35}, {f:N.F5,d:0.25,v:0.4}, {f:N.Bb4,d:0.25,v:0.35},
                            {f:N.C5,d:0.25,v:0.4}, {f:N.Eb5,d:0.25,v:0.35}, {f:N.G5,d:0.25,v:0.4}, {f:N.C5,d:0.25,v:0.35},
                            {f:N.G4,d:0.25,v:0.4}, {f:N.Bb4,d:0.25,v:0.35}, {f:N.D5,d:0.25,v:0.4}, {f:N.G4,d:0.25,v:0.35}
                        ],
                        drums: [
                            {k:1,h:1}, {h:1}, {h:1}, {h:1},
                            {k:0,s:1,h:1}, {h:1}, {k:1,h:1}, {h:1},
                            {k:1,h:1}, {h:1}, {h:1}, {h:0.5},
                            {k:0,s:1,h:1}, {h:1}, {h:1,s:1}, {h:1}
                        ],
                        pad: {freqs:[N.Ab4, N.C5, N.Eb5], v:0.07, w:'triangle'}
                    },
                    FILL: {
                        bass: [
                            {f:N.C3,d:0.5,v:0.8}, {f:N.C3,d:0.25,v:0.6}, {f:N.Eb3,d:0.25,v:0.7}, {f:N.G3,d:0.5,v:0.8},
                            {f:N.F3,d:0.5,v:0.7}, {f:N.Eb3,d:0.25,v:0.6}, {f:N.D3,d:0.25,v:0.7}, {f:N.C3,d:0.5,v:0.8},
                            {f:N.G2,d:0.5,v:0.8}, {f:N.Bb2,d:0.25,v:0.6}, {f:N.C3,d:0.25,v:0.7}, {f:N.D3,d:0.5,v:0.8},
                            {f:N.Eb3,d:0.5,v:0.7}, {f:N.F3,d:0.5,v:0.8}, {f:N.G3,d:0.5,v:0.9}, {f:N.G3,d:0.5,v:1.0}
                        ],
                        melody: [
                            null, null, null, null,
                            null, null, null, null,
                            null, null, null, null,
                            {f:N.G5,d:0.25,v:0.5}, {f:N.Ab5,d:0.25,v:0.5}, {f:N.Bb5,d:0.25,v:0.55}, {f:N.C6,d:0.5,v:0.6}
                        ],
                        arp: [
                            {f:N.C5,d:0.25,v:0.4}, {f:N.Eb5,d:0.25,v:0.4}, {f:N.G5,d:0.25,v:0.4}, {f:N.C5,d:0.25,v:0.4},
                            {f:N.Eb5,d:0.25,v:0.4}, {f:N.G5,d:0.25,v:0.4}, {f:N.C5,d:0.25,v:0.4}, {f:N.Eb5,d:0.25,v:0.4},
                            {f:N.G4,d:0.25,v:0.4}, {f:N.Bb4,d:0.25,v:0.4}, {f:N.D5,d:0.25,v:0.4}, {f:N.G4,d:0.25,v:0.4},
                            {f:N.Bb4,d:0.25,v:0.4}, {f:N.D5,d:0.25,v:0.45}, {f:N.G5,d:0.25,v:0.5}, {f:N.Bb5,d:0.25,v:0.5}
                        ],
                        drums: [
                            {k:1,c:1}, {h:1}, {s:1,h:1}, {h:1},
                            {k:1,h:1}, {s:1}, {k:1,s:1}, {h:1},
                            {s:1}, {s:1}, {s:1,h:1}, {s:1},
                            {k:1,s:1}, {s:1}, {s:1,k:1}, {k:1,s:1,c:1}
                        ],
                        pad: {freqs:[N.C4, N.Eb4, N.G4], v:0.1, w:'triangle'}
                    }
                },
                structure: ['A','A','B','A','A','B','A','FILL']
            },

            // -----------------------------------------------------------------
            // Level 2 — "Deep Liquidity" (D minor, 130 BPM feel)
            // Deeper, groovy, funky
            // -----------------------------------------------------------------
            2: {
                name: 'Deep Liquidity',
                key: 'Dm',
                bpm: 130,
                sections: {
                    A: {
                        bass: [
                            {f:N.D2,d:0.5,v:0.8}, null, {f:N.A2,d:0.25,v:0.6}, {f:N.D3,d:0.25,v:0.7},
                            {f:N.F2,d:0.5,v:0.7}, null, {f:N.E2,d:0.25,v:0.6}, {f:N.D2,d:0.5,v:0.8},
                            {f:N.G2,d:0.5,v:0.8}, null, {f:N.A2,d:0.25,v:0.6}, {f:N.Bb2,d:0.25,v:0.7},
                            {f:N.A2,d:0.5,v:0.8}, null, {f:N.G2,d:0.25,v:0.6}, {f:N.A2,d:0.5,v:0.7}
                        ],
                        melody: [
                            {f:N.D5,d:1,v:0.45}, null, {f:N.A4,d:0.5,v:0.4}, {f:N.C5,d:0.5,v:0.45},
                            {f:N.F5,d:1.5,v:0.5}, null, null, {f:N.E5,d:0.5,v:0.4},
                            {f:N.D5,d:0.5,v:0.45}, {f:N.C5,d:0.5,v:0.4}, {f:N.Bb4,d:0.5,v:0.4}, {f:N.A4,d:0.5,v:0.45},
                            {f:N.G4,d:1,v:0.4}, null, {f:N.A4,d:0.5,v:0.45}, null
                        ],
                        arp: [
                            {f:N.D4,d:0.25,v:0.35}, {f:N.F4,d:0.25,v:0.3}, {f:N.A4,d:0.25,v:0.35},
                            {f:N.D4,d:0.25,v:0.3}, {f:N.F4,d:0.25,v:0.35}, {f:N.A4,d:0.25,v:0.3},
                            null, null,
                            {f:N.G4,d:0.25,v:0.35}, {f:N.Bb4,d:0.25,v:0.3}, {f:N.D5,d:0.25,v:0.35},
                            {f:N.G4,d:0.25,v:0.3}, {f:N.Bb4,d:0.25,v:0.35}, {f:N.D5,d:0.25,v:0.3},
                            null, null
                        ],
                        drums: [
                            {k:1,h:1}, {h:0.5}, {h:1}, {h:0.5},
                            {s:1,h:1}, {h:1}, {h:0.5}, {h:1},
                            {k:1,h:1}, {h:0.5}, {k:1,h:1}, {h:0.5},
                            {s:1,h:1}, {h:1}, {h:0.5}, {s:1}
                        ],
                        pad: {freqs:[N.D4, N.F4, N.A4, N.C5], v:0.07, w:'triangle'}
                    },
                    B: {
                        bass: [
                            {f:N.Bb2,d:0.5,v:0.8}, null, {f:N.F3,d:0.25,v:0.6}, {f:N.Bb2,d:0.5,v:0.7},
                            {f:N.C3,d:0.5,v:0.8}, null, {f:N.G3,d:0.25,v:0.6}, {f:N.C3,d:0.5,v:0.7},
                            {f:N.D3,d:0.5,v:0.8}, null, {f:N.A2,d:0.25,v:0.6}, {f:N.D3,d:0.25,v:0.7},
                            {f:N.A2,d:0.5,v:0.8}, null, {f:N.E3,d:0.25,v:0.6}, {f:N.A2,d:0.5,v:0.7}
                        ],
                        melody: [
                            {f:N.Bb4,d:0.5,v:0.45}, {f:N.D5,d:0.5,v:0.5}, {f:N.F5,d:1,v:0.5}, null,
                            {f:N.E5,d:0.5,v:0.45}, {f:N.C5,d:0.5,v:0.45}, {f:N.D5,d:1,v:0.5}, null,
                            {f:N.A4,d:0.5,v:0.45}, {f:N.C5,d:0.5,v:0.45}, {f:N.D5,d:0.5,v:0.5}, {f:N.F5,d:0.5,v:0.5},
                            {f:N.E5,d:1.5,v:0.5}, null, null, null
                        ],
                        arp: [
                            {f:N.Bb4,d:0.25,v:0.35}, {f:N.D5,d:0.25,v:0.3}, {f:N.F5,d:0.25,v:0.35},
                            {f:N.Bb4,d:0.25,v:0.3}, {f:N.D5,d:0.25,v:0.35}, {f:N.F5,d:0.25,v:0.3},
                            null, null,
                            {f:N.A4,d:0.25,v:0.35}, {f:N.C5,d:0.25,v:0.3}, {f:N.E5,d:0.25,v:0.35},
                            {f:N.A4,d:0.25,v:0.3}, {f:N.C5,d:0.25,v:0.35}, {f:N.E5,d:0.25,v:0.3},
                            null, null
                        ],
                        drums: [
                            {k:1,h:1}, {h:0.5}, {h:1}, {h:1},
                            {s:1,h:1}, {h:0.5}, {h:1}, {h:0.5},
                            {k:1,h:1}, {h:1}, {h:0.5}, {k:1,h:1},
                            {s:1,h:1}, {h:0.5}, {h:1,s:1}, {h:1}
                        ],
                        pad: {freqs:[N.Bb4, N.D5, N.F5], v:0.06, w:'triangle'}
                    },
                    FILL: {
                        bass: [
                            {f:N.D3,d:0.5,v:0.8}, {f:N.E3,d:0.25,v:0.6}, {f:N.F3,d:0.25,v:0.7}, {f:N.G3,d:0.5,v:0.8},
                            {f:N.A3,d:0.5,v:0.8}, {f:N.G3,d:0.25,v:0.6}, {f:N.F3,d:0.25,v:0.7}, {f:N.E3,d:0.5,v:0.8},
                            {f:N.D3,d:0.5,v:0.8}, {f:N.C3,d:0.25,v:0.6}, {f:N.D3,d:0.25,v:0.7}, {f:N.E3,d:0.5,v:0.8},
                            {f:N.F3,d:0.5,v:0.7}, {f:N.G3,d:0.5,v:0.8}, {f:N.A3,d:0.5,v:0.9}, {f:N.A3,d:0.5,v:1.0}
                        ],
                        melody: [
                            null, null, null, null, null, null, null, null,
                            null, null, null, null,
                            {f:N.A5,d:0.25,v:0.5}, {f:N.Bb5,d:0.25,v:0.5}, {f:N.C6,d:0.25,v:0.55}, {f:N.D5,d:0.5,v:0.6}
                        ],
                        arp: [
                            {f:N.D5,d:0.25,v:0.4}, {f:N.F5,d:0.25,v:0.4}, {f:N.A5,d:0.25,v:0.4}, {f:N.D5,d:0.25,v:0.4},
                            {f:N.F5,d:0.25,v:0.4}, {f:N.A5,d:0.25,v:0.4}, {f:N.D5,d:0.25,v:0.4}, {f:N.F5,d:0.25,v:0.4},
                            {f:N.A4,d:0.25,v:0.4}, {f:N.C5,d:0.25,v:0.4}, {f:N.E5,d:0.25,v:0.4}, {f:N.A4,d:0.25,v:0.4},
                            {f:N.C5,d:0.25,v:0.4}, {f:N.E5,d:0.25,v:0.45}, {f:N.A5,d:0.25,v:0.5}, {f:N.C6,d:0.25,v:0.5}
                        ],
                        drums: [
                            {k:1,c:1}, {h:1}, {s:1,h:1}, {h:1},
                            {k:1,h:1}, {s:1}, {k:1,s:1}, {h:1},
                            {s:1}, {s:1}, {s:1,h:1}, {s:1},
                            {k:1,s:1}, {s:1}, {s:1,k:1}, {k:1,s:1,c:1}
                        ],
                        pad: {freqs:[N.D4, N.F4, N.A4], v:0.09, w:'triangle'}
                    }
                },
                structure: ['A','A','B','A','A','B','A','FILL']
            },

            // -----------------------------------------------------------------
            // Level 3 — "Dark Protocol" (A minor, 150 BPM feel)
            // Aggressive, dark, breakbeat
            // -----------------------------------------------------------------
            3: {
                name: 'Dark Protocol',
                key: 'Am',
                bpm: 150,
                sections: {
                    A: {
                        bass: [
                            {f:N.A2,d:0.25,v:0.9}, null, {f:N.A2,d:0.25,v:0.7}, {f:N.C3,d:0.25,v:0.8},
                            null, {f:N.A2,d:0.25,v:0.8}, null, {f:N.E3,d:0.25,v:0.7},
                            {f:N.F2,d:0.25,v:0.9}, null, {f:N.F2,d:0.25,v:0.7}, {f:N.Ab2,d:0.25,v:0.8},
                            null, {f:N.E2,d:0.25,v:0.8}, null, {f:N.G2,d:0.25,v:0.9}
                        ],
                        melody: [
                            {f:N.A5,d:0.25,v:0.5,w:'square'}, {f:N.C6,d:0.25,v:0.45}, null, {f:N.A5,d:0.25,v:0.5},
                            {f:N.G5,d:0.25,v:0.45}, null, {f:N.E5,d:0.5,v:0.5}, null,
                            {f:N.F5,d:0.25,v:0.5}, {f:N.Ab5,d:0.25,v:0.45}, null, {f:N.F5,d:0.25,v:0.5},
                            {f:N.E5,d:0.25,v:0.45}, null, {f:N.D5,d:0.25,v:0.4}, {f:N.E5,d:0.25,v:0.5}
                        ],
                        arp: [
                            {f:N.A4,d:0.25,v:0.4}, {f:N.C5,d:0.25,v:0.35}, {f:N.E5,d:0.25,v:0.4}, null,
                            {f:N.A4,d:0.25,v:0.35}, null, {f:N.C5,d:0.25,v:0.4}, {f:N.E5,d:0.25,v:0.35},
                            {f:N.F4,d:0.25,v:0.4}, {f:N.Ab4,d:0.25,v:0.35}, {f:N.C5,d:0.25,v:0.4}, null,
                            {f:N.E4,d:0.25,v:0.35}, null, {f:N.G4,d:0.25,v:0.4}, {f:N.B4,d:0.25,v:0.35}
                        ],
                        drums: [
                            {k:1,h:1}, {h:1}, {s:1}, {h:1},
                            {k:1,h:1}, {h:1}, {k:1,s:1,h:1}, {h:1},
                            {h:1}, {k:1,h:1}, {s:1,h:1}, {h:1},
                            {k:1,h:1}, {s:1}, {h:1,k:1}, {s:1,h:1}
                        ],
                        pad: {freqs:[N.A3, N.C4, N.E4], v:0.06, w:'sawtooth'}
                    },
                    B: {
                        bass: [
                            {f:N.E2,d:0.25,v:0.9}, null, {f:N.E2,d:0.25,v:0.7}, {f:N.G2,d:0.25,v:0.8},
                            null, {f:N.E2,d:0.25,v:0.8}, null, {f:N.B2,d:0.25,v:0.7},
                            {f:N.A2,d:0.25,v:0.9}, null, {f:N.C3,d:0.25,v:0.7}, null,
                            {f:N.A2,d:0.25,v:0.9}, {f:N.G2,d:0.25,v:0.8}, {f:N.F2,d:0.25,v:0.8}, {f:N.E2,d:0.25,v:0.9}
                        ],
                        melody: [
                            {f:N.E5,d:0.5,v:0.5,w:'square'}, {f:N.G5,d:0.25,v:0.5}, null, {f:N.A5,d:0.25,v:0.5},
                            {f:N.B4,d:0.5,v:0.45}, null, {f:N.C5,d:0.25,v:0.45}, {f:N.D5,d:0.25,v:0.5},
                            {f:N.E5,d:0.25,v:0.5}, {f:N.C5,d:0.25,v:0.45}, {f:N.A4,d:0.5,v:0.45}, null,
                            {f:N.A4,d:0.25,v:0.45}, {f:N.G4,d:0.25,v:0.4}, {f:N.E4,d:0.5,v:0.45}, null
                        ],
                        arp: [
                            {f:N.E4,d:0.25,v:0.4}, null, {f:N.G4,d:0.25,v:0.35}, {f:N.B4,d:0.25,v:0.4},
                            null, {f:N.E5,d:0.25,v:0.35}, null, {f:N.B4,d:0.25,v:0.4},
                            {f:N.A4,d:0.25,v:0.4}, null, {f:N.C5,d:0.25,v:0.35}, {f:N.E5,d:0.25,v:0.4},
                            null, {f:N.A4,d:0.25,v:0.35}, null, {f:N.E5,d:0.25,v:0.4}
                        ],
                        drums: [
                            {k:1,h:1}, {h:1}, {s:1,h:1}, {h:1},
                            {h:1}, {k:1,s:1,h:1}, {h:1}, {k:1,h:1},
                            {s:1,h:1}, {h:1}, {k:1,h:1}, {s:1},
                            {k:1,s:1}, {h:1}, {s:1,k:1}, {s:1,h:1}
                        ],
                        pad: {freqs:[N.E3, N.G3, N.B3], v:0.06, w:'sawtooth'}
                    },
                    FILL: {
                        bass: [
                            {f:N.A2,d:0.25,v:0.9}, {f:N.A2,d:0.25,v:0.7}, {f:N.C3,d:0.25,v:0.8}, {f:N.E3,d:0.25,v:0.9},
                            {f:N.F3,d:0.25,v:0.8}, {f:N.E3,d:0.25,v:0.7}, {f:N.C3,d:0.25,v:0.8}, {f:N.A2,d:0.25,v:0.9},
                            {f:N.E2,d:0.25,v:0.9}, {f:N.G2,d:0.25,v:0.8}, {f:N.A2,d:0.25,v:0.9}, {f:N.B2,d:0.25,v:0.8},
                            {f:N.C3,d:0.25,v:0.8}, {f:N.D3,d:0.25,v:0.9}, {f:N.E3,d:0.25,v:0.9}, {f:N.E3,d:0.25,v:1.0}
                        ],
                        melody: [
                            null, null, null, null, null, null, null, null,
                            null, null, null, null,
                            {f:N.E5,d:0.25,v:0.5}, {f:N.F5,d:0.25,v:0.5}, {f:N.G5,d:0.25,v:0.55}, {f:N.A5,d:0.5,v:0.6}
                        ],
                        arp: [
                            {f:N.A4,d:0.25,v:0.45}, {f:N.C5,d:0.25,v:0.45}, {f:N.E5,d:0.25,v:0.45}, {f:N.A4,d:0.25,v:0.45},
                            {f:N.C5,d:0.25,v:0.45}, {f:N.E5,d:0.25,v:0.45}, {f:N.A4,d:0.25,v:0.45}, {f:N.C5,d:0.25,v:0.45},
                            {f:N.E4,d:0.25,v:0.45}, {f:N.G4,d:0.25,v:0.45}, {f:N.B4,d:0.25,v:0.45}, {f:N.E4,d:0.25,v:0.45},
                            {f:N.G4,d:0.25,v:0.45}, {f:N.B4,d:0.25,v:0.5}, {f:N.E5,d:0.25,v:0.5}, {f:N.A5,d:0.25,v:0.5}
                        ],
                        drums: [
                            {k:1,c:1}, {s:1}, {k:1,s:1}, {s:1},
                            {k:1,s:1}, {s:1}, {k:1,s:1,h:1}, {s:1},
                            {s:1,k:1}, {s:1}, {s:1,k:1}, {s:1},
                            {k:1,s:1}, {s:1,k:1}, {s:1,k:1}, {k:1,s:1,c:1}
                        ],
                        pad: {freqs:[N.A3, N.C4, N.E4], v:0.08, w:'sawtooth'}
                    }
                },
                structure: ['A','A','B','A','A','B','A','FILL']
            },

            // -----------------------------------------------------------------
            // Level 4 — "Crypto Winter" (Eb minor, 120 BPM feel)
            // Atmospheric, tense, industrial
            // -----------------------------------------------------------------
            4: {
                name: 'Crypto Winter',
                key: 'Ebm',
                bpm: 120,
                sections: {
                    A: {
                        bass: [
                            {f:N.Eb2,d:1,v:0.8}, null, null, null,
                            {f:N.Eb2,d:0.5,v:0.6}, null, {f:N.Gb3,d:0.5,v:0.5}, null,
                            {f:N.Ab2,d:1,v:0.8}, null, null, null,
                            {f:N.Ab2,d:0.5,v:0.6}, null, {f:N.Bb2,d:0.5,v:0.7}, null
                        ],
                        melody: [
                            {f:N.Eb5,d:2,v:0.4,w:'triangle'}, null, null, null,
                            null, null, null, null,
                            {f:N.Gb4,d:2,v:0.35,w:'triangle'}, null, null, null,
                            null, null, {f:N.Ab4,d:1,v:0.4,w:'triangle'}, null
                        ],
                        arp: [
                            {f:N.Eb4,d:0.25,v:0.3}, null, null, {f:N.Gb4,d:0.25,v:0.25},
                            null, null, {f:N.Bb4,d:0.25,v:0.3}, null,
                            {f:N.Ab4,d:0.25,v:0.3}, null, null, {f:N.Eb4,d:0.25,v:0.25},
                            null, null, {f:N.Gb4,d:0.25,v:0.3}, null
                        ],
                        drums: [
                            {k:1}, null, null, {h:1},
                            null, null, {s:1}, null,
                            {k:1}, null, {h:1}, null,
                            null, {s:1}, null, {h:0.5}
                        ],
                        pad: {freqs:[N.Eb3, N.Gb3, N.Bb3], v:0.1, w:'sawtooth'}
                    },
                    B: {
                        bass: [
                            {f:N.Bb2,d:1,v:0.8}, null, null, null,
                            {f:N.Bb2,d:0.5,v:0.6}, null, {f:N.Ab2,d:0.5,v:0.5}, null,
                            {f:N.Gb2,d:1,v:0.8}, null, null, null,
                            {f:N.Eb2,d:0.5,v:0.7}, null, {f:N.Bb2,d:0.5,v:0.8}, null
                        ],
                        melody: [
                            {f:N.Bb5,d:2,v:0.4,w:'triangle'}, null, null, null,
                            null, null, {f:N.Ab5,d:1,v:0.35,w:'triangle'}, null,
                            {f:N.Gb4,d:1.5,v:0.4,w:'triangle'}, null, null, {f:N.Eb4,d:1,v:0.35,w:'triangle'},
                            null, null, null, null
                        ],
                        arp: [
                            {f:N.Bb4,d:0.25,v:0.3}, null, null, {f:N.Ab4,d:0.25,v:0.25},
                            null, {f:N.Gb4,d:0.25,v:0.3}, null, null,
                            {f:N.Gb4,d:0.25,v:0.3}, null, {f:N.Eb4,d:0.25,v:0.25}, null,
                            null, {f:N.Bb4,d:0.25,v:0.3}, null, null
                        ],
                        drums: [
                            {k:1}, null, {h:0.5}, null,
                            null, {s:1}, null, {h:1},
                            {k:1}, null, null, {s:1},
                            null, {h:1}, {k:1}, null
                        ],
                        pad: {freqs:[N.Bb3, N.Eb4, N.Gb4], v:0.1, w:'sawtooth'}
                    },
                    FILL: {
                        bass: [
                            {f:N.Eb2,d:0.5,v:0.9}, {f:N.Gb2,d:0.5,v:0.8}, {f:N.Ab2,d:0.5,v:0.8}, {f:N.Bb2,d:0.5,v:0.9},
                            {f:N.Eb3,d:0.5,v:0.8}, {f:N.Bb2,d:0.5,v:0.7}, {f:N.Ab2,d:0.5,v:0.8}, {f:N.Gb2,d:0.5,v:0.8},
                            {f:N.Eb2,d:0.5,v:0.9}, {f:N.Eb2,d:0.5,v:0.7}, {f:N.Gb2,d:0.5,v:0.8}, {f:N.Ab2,d:0.5,v:0.8},
                            {f:N.Bb2,d:0.5,v:0.8}, {f:N.Bb2,d:0.5,v:0.9}, {f:N.Eb3,d:0.5,v:0.9}, {f:N.Eb3,d:0.5,v:1.0}
                        ],
                        melody: [
                            null, null, null, null, null, null, null, null,
                            null, null, null, null,
                            {f:N.Eb5,d:0.5,v:0.4}, null, {f:N.Gb5,d:0.5,v:0.45}, {f:N.Bb5,d:0.5,v:0.5}
                        ],
                        arp: [
                            {f:N.Eb4,d:0.25,v:0.35}, {f:N.Gb4,d:0.25,v:0.35}, {f:N.Bb4,d:0.25,v:0.35}, {f:N.Eb4,d:0.25,v:0.35},
                            {f:N.Gb4,d:0.25,v:0.35}, {f:N.Bb4,d:0.25,v:0.35}, {f:N.Eb4,d:0.25,v:0.35}, {f:N.Gb4,d:0.25,v:0.35},
                            {f:N.Bb4,d:0.25,v:0.35}, {f:N.Eb5,d:0.25,v:0.35}, {f:N.Gb4,d:0.25,v:0.35}, {f:N.Bb4,d:0.25,v:0.35},
                            {f:N.Eb5,d:0.25,v:0.4}, {f:N.Gb4,d:0.25,v:0.4}, {f:N.Bb4,d:0.25,v:0.45}, {f:N.Eb5,d:0.25,v:0.5}
                        ],
                        drums: [
                            {k:1,c:1}, null, {s:1}, null,
                            {k:1}, {s:1}, {k:1,s:1}, null,
                            {s:1}, {s:1,k:1}, {s:1}, {s:1},
                            {k:1,s:1}, {s:1}, {s:1,k:1}, {k:1,s:1,c:1}
                        ],
                        pad: {freqs:[N.Eb3, N.Gb3, N.Bb3], v:0.12, w:'sawtooth'}
                    }
                },
                structure: ['A','A','B','A','A','B','A','FILL']
            },

            // -----------------------------------------------------------------
            // Level 5 — "Final Hash" (G minor, 160 BPM feel)
            // Epic, triumphant, fast
            // -----------------------------------------------------------------
            5: {
                name: 'Final Hash',
                key: 'Gm',
                bpm: 160,
                sections: {
                    A: {
                        bass: [
                            {f:N.G2,d:0.5,v:0.9}, null, {f:N.D3,d:0.25,v:0.7}, {f:N.G3,d:0.25,v:0.8},
                            {f:N.Bb2,d:0.5,v:0.8}, null, {f:N.F3,d:0.25,v:0.7}, {f:N.Bb2,d:0.5,v:0.8},
                            {f:N.C3,d:0.5,v:0.8}, null, {f:N.G3,d:0.25,v:0.7}, {f:N.C3,d:0.5,v:0.8},
                            {f:N.D3,d:0.5,v:0.9}, null, {f:N.A3,d:0.25,v:0.7}, {f:N.D3,d:0.5,v:0.9}
                        ],
                        melody: [
                            {f:N.G5,d:0.5,v:0.55,w:'square'}, {f:N.Bb5,d:0.5,v:0.5}, {f:N.D5,d:0.5,v:0.5}, {f:N.G5,d:0.5,v:0.55},
                            {f:N.F5,d:1,v:0.5}, null, {f:N.D5,d:0.5,v:0.45}, {f:N.Bb4,d:0.5,v:0.5},
                            {f:N.C5,d:0.5,v:0.5}, {f:N.Eb5,d:0.5,v:0.5}, {f:N.G5,d:1,v:0.55}, null,
                            {f:N.A5,d:0.5,v:0.55}, {f:N.G5,d:0.5,v:0.5}, {f:N.F5,d:0.5,v:0.5}, {f:N.D5,d:0.5,v:0.55}
                        ],
                        arp: [
                            {f:N.G4,d:0.25,v:0.4}, {f:N.Bb4,d:0.25,v:0.35}, {f:N.D5,d:0.25,v:0.4}, {f:N.G5,d:0.25,v:0.35},
                            {f:N.Bb4,d:0.25,v:0.4}, {f:N.D5,d:0.25,v:0.35}, {f:N.F5,d:0.25,v:0.4}, {f:N.Bb5,d:0.25,v:0.35},
                            {f:N.C5,d:0.25,v:0.4}, {f:N.Eb5,d:0.25,v:0.35}, {f:N.G5,d:0.25,v:0.4}, {f:N.C6,d:0.25,v:0.35},
                            {f:N.D5,d:0.25,v:0.4}, {f:N.F5,d:0.25,v:0.35}, {f:N.A5,d:0.25,v:0.4}, {f:N.D5,d:0.25,v:0.35}
                        ],
                        drums: [
                            {k:1,h:1}, {h:1}, {s:1,h:1}, {h:1},
                            {k:1,h:1}, {h:1}, {s:1,h:1}, {k:1,h:1},
                            {k:1,h:1}, {h:1}, {s:1,h:1}, {h:1},
                            {k:1,h:1}, {s:1,h:1}, {k:1,h:1}, {s:1,h:1,c:1}
                        ],
                        pad: {freqs:[N.G4, N.Bb4, N.D5], v:0.08, w:'triangle'}
                    },
                    B: {
                        bass: [
                            {f:N.Eb3,d:0.5,v:0.8}, null, {f:N.Bb3,d:0.25,v:0.7}, {f:N.Eb3,d:0.5,v:0.8},
                            {f:N.F3,d:0.5,v:0.8}, null, {f:N.C3,d:0.25,v:0.7}, {f:N.F3,d:0.5,v:0.8},
                            {f:N.G2,d:0.5,v:0.9}, null, {f:N.D3,d:0.25,v:0.7}, {f:N.G3,d:0.25,v:0.8},
                            {f:N.D3,d:0.5,v:0.9}, null, {f:N.G3,d:0.25,v:0.8}, {f:N.D3,d:0.5,v:0.9}
                        ],
                        melody: [
                            {f:N.Eb5,d:0.5,v:0.5,w:'square'}, {f:N.G5,d:0.5,v:0.55}, {f:N.Bb5,d:1,v:0.55}, null,
                            {f:N.A5,d:0.5,v:0.5}, {f:N.F5,d:0.5,v:0.5}, {f:N.D5,d:1,v:0.55}, null,
                            {f:N.G5,d:0.5,v:0.55}, {f:N.F5,d:0.5,v:0.5}, {f:N.Eb5,d:0.5,v:0.5}, {f:N.D5,d:0.5,v:0.55},
                            {f:N.D5,d:1,v:0.5}, null, {f:N.G5,d:0.5,v:0.55}, {f:N.A5,d:0.5,v:0.55}
                        ],
                        arp: [
                            {f:N.Eb5,d:0.25,v:0.4}, {f:N.G5,d:0.25,v:0.35}, {f:N.Bb5,d:0.25,v:0.4}, {f:N.Eb5,d:0.25,v:0.35},
                            {f:N.F5,d:0.25,v:0.4}, {f:N.A5,d:0.25,v:0.35}, {f:N.C6,d:0.25,v:0.4}, {f:N.F5,d:0.25,v:0.35},
                            {f:N.G4,d:0.25,v:0.4}, {f:N.Bb4,d:0.25,v:0.35}, {f:N.D5,d:0.25,v:0.4}, {f:N.G5,d:0.25,v:0.35},
                            {f:N.D5,d:0.25,v:0.4}, {f:N.F5,d:0.25,v:0.35}, {f:N.A5,d:0.25,v:0.4}, {f:N.D5,d:0.25,v:0.35}
                        ],
                        drums: [
                            {k:1,h:1}, {h:1}, {s:1,h:1}, {h:1},
                            {k:1,h:1}, {s:1,h:1}, {k:1,h:1}, {s:1,h:1},
                            {k:1,h:1}, {h:1}, {s:1,h:1}, {k:1,h:1},
                            {s:1,h:1}, {k:1,h:1}, {s:1,h:1}, {k:1,s:1,c:1}
                        ],
                        pad: {freqs:[N.Eb4, N.G4, N.Bb4], v:0.08, w:'triangle'}
                    },
                    FILL: {
                        bass: [
                            {f:N.G2,d:0.5,v:0.9}, {f:N.Bb2,d:0.25,v:0.8}, {f:N.C3,d:0.25,v:0.8}, {f:N.D3,d:0.5,v:0.9},
                            {f:N.Eb3,d:0.5,v:0.8}, {f:N.D3,d:0.25,v:0.7}, {f:N.C3,d:0.25,v:0.8}, {f:N.Bb2,d:0.5,v:0.8},
                            {f:N.G2,d:0.5,v:0.9}, {f:N.A2,d:0.25,v:0.8}, {f:N.Bb2,d:0.25,v:0.8}, {f:N.C3,d:0.5,v:0.9},
                            {f:N.D3,d:0.5,v:0.9}, {f:N.Eb3,d:0.5,v:0.9}, {f:N.F3,d:0.5,v:1.0}, {f:N.G3,d:0.5,v:1.0}
                        ],
                        melody: [
                            null, null, null, null, null, null, null, null,
                            {f:N.D5,d:0.25,v:0.5}, {f:N.Eb5,d:0.25,v:0.5}, {f:N.F5,d:0.25,v:0.55}, {f:N.G5,d:0.25,v:0.55},
                            {f:N.A5,d:0.25,v:0.55}, {f:N.Bb5,d:0.25,v:0.55}, {f:N.C6,d:0.5,v:0.6}, null
                        ],
                        arp: [
                            {f:N.G5,d:0.25,v:0.45}, {f:N.Bb5,d:0.25,v:0.45}, {f:N.D5,d:0.25,v:0.45}, {f:N.G5,d:0.25,v:0.45},
                            {f:N.Bb5,d:0.25,v:0.45}, {f:N.D5,d:0.25,v:0.45}, {f:N.G5,d:0.25,v:0.45}, {f:N.Bb5,d:0.25,v:0.45},
                            {f:N.D5,d:0.25,v:0.45}, {f:N.F5,d:0.25,v:0.45}, {f:N.A5,d:0.25,v:0.45}, {f:N.D5,d:0.25,v:0.45},
                            {f:N.G5,d:0.25,v:0.5}, {f:N.Bb5,d:0.25,v:0.5}, {f:N.D5,d:0.25,v:0.5}, {f:N.G5,d:0.25,v:0.55}
                        ],
                        drums: [
                            {k:1,c:1}, {h:1}, {s:1,h:1}, {k:1,h:1},
                            {s:1,k:1}, {h:1}, {k:1,s:1,h:1}, {h:1},
                            {s:1,k:1}, {s:1}, {s:1,k:1}, {s:1},
                            {k:1,s:1}, {s:1,k:1}, {s:1,k:1}, {k:1,s:1,c:1}
                        ],
                        pad: {freqs:[N.G3, N.D4, N.G4], v:0.1, w:'triangle'}
                    }
                },
                structure: ['A','A','B','A','A','B','A','FILL']
            }
        },

        // =====================================================================
        // BOSS THEME — "Central Authority"
        // 3 phases with increasing intensity
        // =====================================================================
        BOSS: {
            phase1: {
                name: 'Central Authority - Phase 1',
                bpm: 130,
                sections: {
                    A: {
                        bass: [
                            {f:N.C2,d:1,v:0.9}, null, null, null,
                            {f:N.C2,d:0.5,v:0.7}, null, {f:N.Eb2,d:0.5,v:0.6}, null,
                            {f:N.C2,d:1,v:0.9}, null, null, null,
                            {f:N.G2,d:0.5,v:0.7}, null, {f:N.C2,d:0.5,v:0.8}, null
                        ],
                        melody: [
                            null, null, null, null,
                            null, null, null, null,
                            null, null, null, null,
                            null, null, null, null
                        ],
                        arp: [
                            {f:N.C4,d:0.25,v:0.3}, null, null, {f:N.Eb4,d:0.25,v:0.25},
                            null, {f:N.G4,d:0.25,v:0.3}, null, null,
                            {f:N.Eb4,d:0.25,v:0.3}, null, null, {f:N.C4,d:0.25,v:0.25},
                            null, {f:N.G3,d:0.25,v:0.3}, null, null
                        ],
                        drums: [
                            {k:1}, null, null, {h:0.5},
                            null, null, {k:1}, null,
                            {s:1}, null, {h:1}, null,
                            {k:1}, null, null, null
                        ],
                        pad: {freqs:[N.C3, N.Eb3, N.G3], v:0.12, w:'sawtooth'}
                    },
                    B: {
                        bass: [
                            {f:N.Ab2,d:1,v:0.9}, null, null, null,
                            {f:N.Ab2,d:0.5,v:0.7}, null, {f:N.Bb2,d:0.5,v:0.6}, null,
                            {f:N.C2,d:1,v:0.9}, null, null, null,
                            {f:N.G2,d:0.5,v:0.8}, null, {f:N.Eb2,d:0.5,v:0.7}, null
                        ],
                        melody: [
                            null, null, null, null,
                            null, null, null, null,
                            null, null, null, null,
                            null, null, null, null
                        ],
                        arp: [
                            {f:N.Ab4,d:0.25,v:0.3}, null, null, {f:N.C5,d:0.25,v:0.25},
                            null, {f:N.Eb5,d:0.25,v:0.3}, null, null,
                            {f:N.C4,d:0.25,v:0.3}, null, null, {f:N.G4,d:0.25,v:0.25},
                            null, {f:N.Eb4,d:0.25,v:0.3}, null, null
                        ],
                        drums: [
                            {k:1}, null, {h:0.5}, null,
                            null, {s:1}, null, {h:1},
                            {k:1}, null, null, null,
                            {s:1}, null, {k:1}, null
                        ],
                        pad: {freqs:[N.Ab3, N.C4, N.Eb4], v:0.12, w:'sawtooth'}
                    }
                },
                structure: ['A','B','A','B']
            },

            phase2: {
                name: 'Central Authority - Phase 2',
                bpm: 145,
                sections: {
                    A: {
                        bass: [
                            {f:N.C2,d:0.5,v:0.9}, null, {f:N.C3,d:0.25,v:0.7}, {f:N.C2,d:0.5,v:0.8},
                            {f:N.Eb2,d:0.5,v:0.8}, null, {f:N.G2,d:0.25,v:0.7}, {f:N.Eb2,d:0.5,v:0.8},
                            {f:N.Ab2,d:0.5,v:0.8}, null, {f:N.Eb3,d:0.25,v:0.7}, {f:N.Ab2,d:0.5,v:0.8},
                            {f:N.G2,d:0.5,v:0.9}, null, {f:N.D3,d:0.25,v:0.7}, {f:N.G2,d:0.5,v:0.9}
                        ],
                        melody: [
                            {f:N.C5,d:0.5,v:0.5,w:'square'}, {f:N.Eb5,d:0.25,v:0.45}, null, {f:N.G5,d:0.5,v:0.5},
                            null, {f:N.F5,d:0.25,v:0.45}, {f:N.Eb5,d:0.5,v:0.5}, null,
                            {f:N.Ab5,d:0.5,v:0.5}, null, {f:N.G5,d:0.25,v:0.45}, {f:N.F5,d:0.5,v:0.5},
                            {f:N.Eb5,d:0.5,v:0.45}, null, {f:N.D5,d:0.5,v:0.5}, null
                        ],
                        arp: [
                            {f:N.C4,d:0.25,v:0.4}, {f:N.Eb4,d:0.25,v:0.35}, {f:N.G4,d:0.25,v:0.4}, {f:N.C5,d:0.25,v:0.35},
                            {f:N.Eb4,d:0.25,v:0.4}, {f:N.G4,d:0.25,v:0.35}, {f:N.Bb4,d:0.25,v:0.4}, {f:N.Eb5,d:0.25,v:0.35},
                            {f:N.Ab4,d:0.25,v:0.4}, {f:N.C5,d:0.25,v:0.35}, {f:N.Eb5,d:0.25,v:0.4}, {f:N.Ab4,d:0.25,v:0.35},
                            {f:N.G4,d:0.25,v:0.4}, {f:N.Bb4,d:0.25,v:0.35}, {f:N.D5,d:0.25,v:0.4}, {f:N.G4,d:0.25,v:0.35}
                        ],
                        drums: [
                            {k:1,h:1}, {h:1}, {s:1,h:1}, {h:1},
                            {k:1,h:1}, {h:1}, {s:1,h:1}, {k:1,h:1},
                            {k:1,h:1}, {h:1}, {s:1,h:1}, {h:1},
                            {k:1,h:1}, {s:1,h:1}, {k:1,h:1}, {s:1,h:1}
                        ],
                        pad: {freqs:[N.C3, N.Eb3, N.G3], v:0.1, w:'sawtooth'}
                    },
                    B: {
                        bass: [
                            {f:N.F2,d:0.5,v:0.9}, null, {f:N.C3,d:0.25,v:0.7}, {f:N.F2,d:0.5,v:0.8},
                            {f:N.Ab2,d:0.5,v:0.8}, null, {f:N.Eb3,d:0.25,v:0.7}, {f:N.Ab2,d:0.5,v:0.8},
                            {f:N.C2,d:0.5,v:0.9}, null, {f:N.G2,d:0.25,v:0.7}, {f:N.C3,d:0.25,v:0.8},
                            {f:N.G2,d:0.5,v:0.9}, {f:N.F2,d:0.25,v:0.8}, {f:N.Eb2,d:0.25,v:0.8}, {f:N.D2,d:0.5,v:0.9}
                        ],
                        melody: [
                            {f:N.F5,d:0.5,v:0.5,w:'square'}, {f:N.Ab5,d:0.25,v:0.5}, null, {f:N.C6,d:0.5,v:0.55},
                            null, {f:N.Bb5,d:0.25,v:0.45}, {f:N.Ab5,d:0.5,v:0.5}, null,
                            {f:N.G5,d:0.5,v:0.5}, {f:N.F5,d:0.25,v:0.45}, {f:N.Eb5,d:0.5,v:0.5}, null,
                            {f:N.D5,d:0.5,v:0.5}, null, {f:N.C5,d:0.5,v:0.5}, null
                        ],
                        arp: [
                            {f:N.F4,d:0.25,v:0.4}, {f:N.Ab4,d:0.25,v:0.35}, {f:N.C5,d:0.25,v:0.4}, {f:N.F5,d:0.25,v:0.35},
                            {f:N.Ab4,d:0.25,v:0.4}, {f:N.C5,d:0.25,v:0.35}, {f:N.Eb5,d:0.25,v:0.4}, {f:N.Ab5,d:0.25,v:0.35},
                            {f:N.C4,d:0.25,v:0.4}, {f:N.Eb4,d:0.25,v:0.35}, {f:N.G4,d:0.25,v:0.4}, {f:N.C5,d:0.25,v:0.35},
                            {f:N.G4,d:0.25,v:0.4}, {f:N.Bb4,d:0.25,v:0.35}, {f:N.D5,d:0.25,v:0.4}, {f:N.G4,d:0.25,v:0.35}
                        ],
                        drums: [
                            {k:1,h:1}, {h:1}, {s:1,h:1}, {h:1},
                            {k:1,h:1}, {s:1,h:1}, {k:1,h:1}, {s:1,h:1},
                            {k:1,h:1}, {h:1}, {s:1,h:1}, {k:1,h:1},
                            {s:1,k:1}, {h:1}, {s:1,k:1}, {s:1,k:1,c:1}
                        ],
                        pad: {freqs:[N.F3, N.Ab3, N.C4], v:0.1, w:'sawtooth'}
                    }
                },
                structure: ['A','B','A','B']
            },

            phase3: {
                name: 'Central Authority - Phase 3',
                bpm: 165,
                sections: {
                    A: {
                        bass: [
                            {f:N.C2,d:0.25,v:1.0}, {f:N.C2,d:0.25,v:0.8}, {f:N.Eb2,d:0.25,v:0.9}, {f:N.G2,d:0.25,v:0.9},
                            {f:N.Ab2,d:0.25,v:0.9}, {f:N.G2,d:0.25,v:0.8}, {f:N.Eb2,d:0.25,v:0.9}, {f:N.C2,d:0.25,v:1.0},
                            {f:N.Bb2,d:0.25,v:0.9}, {f:N.Ab2,d:0.25,v:0.8}, {f:N.G2,d:0.25,v:0.9}, {f:N.F2,d:0.25,v:0.9},
                            {f:N.Eb2,d:0.25,v:0.9}, {f:N.D2,d:0.25,v:0.9}, {f:N.C2,d:0.25,v:1.0}, {f:N.G2,d:0.25,v:1.0}
                        ],
                        melody: [
                            {f:N.C5,d:0.25,v:0.55,w:'square'}, {f:N.Eb5,d:0.25,v:0.5}, {f:N.G5,d:0.25,v:0.55}, {f:N.C6,d:0.25,v:0.55},
                            {f:N.Bb5,d:0.25,v:0.5}, {f:N.Ab5,d:0.25,v:0.5}, {f:N.G5,d:0.25,v:0.55}, {f:N.F5,d:0.25,v:0.5},
                            {f:N.Eb5,d:0.25,v:0.55}, {f:N.F5,d:0.25,v:0.5}, {f:N.G5,d:0.5,v:0.55}, null,
                            {f:N.Ab5,d:0.25,v:0.5}, {f:N.G5,d:0.25,v:0.5}, {f:N.F5,d:0.25,v:0.55}, {f:N.Eb5,d:0.25,v:0.55}
                        ],
                        arp: [
                            {f:N.C5,d:0.25,v:0.45}, {f:N.Eb5,d:0.25,v:0.4}, {f:N.G5,d:0.25,v:0.45}, {f:N.C5,d:0.25,v:0.4},
                            {f:N.Eb5,d:0.25,v:0.45}, {f:N.G5,d:0.25,v:0.4}, {f:N.C5,d:0.25,v:0.45}, {f:N.Eb5,d:0.25,v:0.4},
                            {f:N.Ab4,d:0.25,v:0.45}, {f:N.C5,d:0.25,v:0.4}, {f:N.Eb5,d:0.25,v:0.45}, {f:N.Ab4,d:0.25,v:0.4},
                            {f:N.G4,d:0.25,v:0.45}, {f:N.Bb4,d:0.25,v:0.4}, {f:N.D5,d:0.25,v:0.45}, {f:N.G5,d:0.25,v:0.4}
                        ],
                        drums: [
                            {k:1,h:1}, {h:1}, {s:1,h:1}, {k:1,h:1},
                            {s:1,h:1}, {k:1,h:1}, {s:1,h:1}, {k:1,h:1},
                            {k:1,s:1,h:1}, {h:1}, {s:1,k:1,h:1}, {h:1},
                            {k:1,h:1}, {s:1,h:1}, {k:1,s:1,h:1}, {k:1,s:1,c:1}
                        ],
                        pad: {freqs:[N.C3, N.Eb3, N.G3, N.Bb3], v:0.12, w:'sawtooth'}
                    },
                    B: {
                        bass: [
                            {f:N.Ab2,d:0.25,v:1.0}, {f:N.Ab2,d:0.25,v:0.8}, {f:N.Bb2,d:0.25,v:0.9}, {f:N.C3,d:0.25,v:0.9},
                            {f:N.Eb3,d:0.25,v:0.9}, {f:N.C3,d:0.25,v:0.8}, {f:N.Bb2,d:0.25,v:0.9}, {f:N.Ab2,d:0.25,v:1.0},
                            {f:N.G2,d:0.25,v:1.0}, {f:N.G2,d:0.25,v:0.8}, {f:N.Ab2,d:0.25,v:0.9}, {f:N.Bb2,d:0.25,v:0.9},
                            {f:N.C3,d:0.25,v:0.9}, {f:N.D3,d:0.25,v:0.9}, {f:N.Eb3,d:0.25,v:1.0}, {f:N.G3,d:0.25,v:1.0}
                        ],
                        melody: [
                            {f:N.Ab5,d:0.25,v:0.55,w:'square'}, {f:N.C6,d:0.25,v:0.55}, {f:N.Ab5,d:0.25,v:0.5}, {f:N.G5,d:0.25,v:0.55},
                            {f:N.F5,d:0.25,v:0.5}, {f:N.Eb5,d:0.25,v:0.55}, {f:N.D5,d:0.25,v:0.5}, {f:N.C5,d:0.25,v:0.55},
                            {f:N.G5,d:0.5,v:0.55}, null, {f:N.Ab5,d:0.25,v:0.5}, {f:N.Bb5,d:0.25,v:0.55},
                            {f:N.C6,d:0.5,v:0.6}, null, {f:N.G5,d:0.25,v:0.55}, {f:N.C6,d:0.25,v:0.6}
                        ],
                        arp: [
                            {f:N.Ab4,d:0.25,v:0.45}, {f:N.C5,d:0.25,v:0.4}, {f:N.Eb5,d:0.25,v:0.45}, {f:N.Ab4,d:0.25,v:0.4},
                            {f:N.C5,d:0.25,v:0.45}, {f:N.Eb5,d:0.25,v:0.4}, {f:N.Ab4,d:0.25,v:0.45}, {f:N.C5,d:0.25,v:0.4},
                            {f:N.G4,d:0.25,v:0.45}, {f:N.Bb4,d:0.25,v:0.4}, {f:N.D5,d:0.25,v:0.45}, {f:N.G4,d:0.25,v:0.4},
                            {f:N.Bb4,d:0.25,v:0.45}, {f:N.D5,d:0.25,v:0.4}, {f:N.G5,d:0.25,v:0.45}, {f:N.Bb5,d:0.25,v:0.4}
                        ],
                        drums: [
                            {k:1,h:1}, {s:1,h:1}, {k:1,h:1}, {s:1,h:1},
                            {k:1,s:1,h:1}, {h:1}, {k:1,s:1,h:1}, {h:1},
                            {k:1,h:1}, {s:1,h:1}, {k:1,s:1,h:1}, {s:1,h:1},
                            {k:1,s:1}, {s:1,k:1}, {k:1,s:1,h:1}, {k:1,s:1,c:1}
                        ],
                        pad: {freqs:[N.Ab3, N.C4, N.Eb4, N.G4], v:0.12, w:'sawtooth'}
                    },
                    C: {
                        bass: [
                            {f:N.C2,d:0.25,v:1.0}, {f:N.Eb2,d:0.25,v:0.9}, {f:N.G2,d:0.25,v:0.9}, {f:N.C3,d:0.25,v:1.0},
                            {f:N.Eb3,d:0.25,v:0.9}, {f:N.C3,d:0.25,v:0.9}, {f:N.G2,d:0.25,v:1.0}, {f:N.Eb2,d:0.25,v:0.9},
                            {f:N.G2,d:0.25,v:1.0}, {f:N.Bb2,d:0.25,v:0.9}, {f:N.D3,d:0.25,v:0.9}, {f:N.G3,d:0.25,v:1.0},
                            {f:N.D3,d:0.25,v:0.9}, {f:N.Bb2,d:0.25,v:0.9}, {f:N.G2,d:0.25,v:1.0}, {f:N.G2,d:0.25,v:1.0}
                        ],
                        melody: [
                            {f:N.C6,d:0.25,v:0.6,w:'sawtooth'}, {f:N.G5,d:0.25,v:0.55}, {f:N.Eb5,d:0.25,v:0.55}, {f:N.C5,d:0.25,v:0.55},
                            {f:N.Eb5,d:0.25,v:0.55}, {f:N.G5,d:0.25,v:0.55}, {f:N.C6,d:0.5,v:0.6}, null,
                            {f:N.Bb5,d:0.25,v:0.55}, {f:N.G5,d:0.25,v:0.55}, {f:N.D5,d:0.25,v:0.5}, {f:N.G5,d:0.25,v:0.55},
                            {f:N.Bb5,d:0.25,v:0.55}, {f:N.D5,d:0.25,v:0.55}, {f:N.G5,d:0.5,v:0.6}, null
                        ],
                        arp: [
                            {f:N.C5,d:0.25,v:0.5}, {f:N.Eb5,d:0.25,v:0.45}, {f:N.G5,d:0.25,v:0.5}, {f:N.C6,d:0.25,v:0.45},
                            {f:N.G5,d:0.25,v:0.5}, {f:N.Eb5,d:0.25,v:0.45}, {f:N.C5,d:0.25,v:0.5}, {f:N.G4,d:0.25,v:0.45},
                            {f:N.G4,d:0.25,v:0.5}, {f:N.Bb4,d:0.25,v:0.45}, {f:N.D5,d:0.25,v:0.5}, {f:N.G5,d:0.25,v:0.45},
                            {f:N.D5,d:0.25,v:0.5}, {f:N.Bb4,d:0.25,v:0.45}, {f:N.G4,d:0.25,v:0.5}, {f:N.D4,d:0.25,v:0.45}
                        ],
                        drums: [
                            {k:1,s:1,h:1}, {k:1,h:1}, {s:1,k:1,h:1}, {k:1,h:1},
                            {s:1,k:1,h:1}, {k:1,h:1}, {s:1,k:1,h:1}, {k:1,s:1,h:1},
                            {k:1,s:1,h:1}, {s:1,h:1}, {k:1,s:1,h:1}, {s:1,h:1},
                            {k:1,s:1,h:1}, {k:1,s:1}, {k:1,s:1,h:1}, {k:1,s:1,c:1}
                        ],
                        pad: {freqs:[N.C3, N.Eb3, N.G3, N.Bb3, N.D4], v:0.14, w:'sawtooth'}
                    }
                },
                structure: ['A','B','C','A']
            }
        },

        // =====================================================================
        // BEAR MARKET MODIFIER
        // Applied on top of any song when Bear Market is active
        // =====================================================================
        BEAR_MARKET: {
            pitchShift: -1,          // Semitones down (applied as freq multiplier)
            tempoMult: 1.1,          // 10% faster
            distortion: true,        // Enable WaveShaper
            filterCutoff: 800,       // Low-pass Hz (darker sound)
            volumeBoost: 1.1         // Slightly louder
        }
    };

})();
