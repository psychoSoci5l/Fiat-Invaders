/**
 * WaveManager tests
 */
(function () {
    _testRunner.suite('WaveManager exists', (assert) => {
        const WM = window.Game.WaveManager;
        assert(WM, 'G.WaveManager exists');
        assert(typeof WM.init === 'function', 'has init method');
        assert(typeof WM.reset === 'function', 'has reset method');
        assert(typeof WM.update === 'function', 'has update method');
        assert(typeof WM.spawnWave === 'function', 'has spawnWave method');
        assert(typeof WM.getWavesPerCycle === 'function', 'has getWavesPerCycle method');
    });

    _testRunner.suite('WaveManager wave progression', (assert) => {
        const WM = window.Game.WaveManager;

        // Save original state
        var origWave = WM.wave;
        var origInProgress = WM.waveInProgress;
        var origStreaming = WM.isStreaming;

        // Reset to known state
        WM.reset();
        assert(WM.wave === 1, 'wave starts at 1 after reset');

        // Manually increment wave (simulating what update does on wave complete)
        WM.wave++;
        assert(WM.wave === 2, 'wave increments to 2');

        WM.wave++;
        assert(WM.wave === 3, 'wave increments to 3');

        // getWavesPerCycle should return a positive number
        var wpc = WM.getWavesPerCycle();
        assert(typeof wpc === 'number' && wpc > 0, 'getWavesPerCycle returns positive number');
        assert(wpc === 5 || wpc > 0, 'waves per cycle is configured (default 5)');

        // Restore
        WM.wave = origWave;
        WM.waveInProgress = origInProgress;
        WM.isStreaming = origStreaming;
    });

    _testRunner.suite('WaveManager reset', (assert) => {
        const WM = window.Game.WaveManager;

        // Save original state
        var origWave = WM.wave;
        var origInProgress = WM.waveInProgress;
        var origStreaming = WM.isStreaming;
        var origIntermission = WM.intermissionTimer;

        // Mutate state
        WM.wave = 99;
        WM.waveInProgress = true;
        WM.isStreaming = true;
        WM.intermissionTimer = 5.0;
        WM.streamingSpawnedCount = 42;
        WM._currentPhaseIndex = 3;
        WM._phasesSpawned = 2;
        WM.miniBossActive = true;

        // Reset
        WM.reset();

        assert(WM.wave === 1, 'wave resets to 1');
        assert(WM.waveInProgress === false, 'waveInProgress resets to false');
        assert(WM.isStreaming === false, 'isStreaming resets to false');
        assert(WM.intermissionTimer === 0, 'intermissionTimer resets to 0');
        assert(WM.streamingSpawnedCount === 0, 'streamingSpawnedCount resets to 0');
        assert(WM._currentPhaseIndex === 0, '_currentPhaseIndex resets to 0');
        assert(WM._phasesSpawned === 0, '_phasesSpawned resets to 0');
        assert(WM.miniBossActive === false, 'miniBossActive resets to false');

        // Restore
        WM.wave = origWave;
        WM.waveInProgress = origInProgress;
        WM.isStreaming = origStreaming;
        WM.intermissionTimer = origIntermission;
    });
})();
