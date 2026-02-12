/**
 * Test harness — zero dependencies, console.assert based
 */
(function () {
    let suites = [];
    let totalPass = 0;
    let totalFail = 0;

    window._testRunner = {
        suite(name, fn) {
            suites.push({ name, fn });
        },

        run() {
            const results = document.getElementById('results');
            const summary = document.getElementById('summary');

            suites.forEach(s => {
                const div = document.createElement('div');
                div.className = 'suite';
                div.innerHTML = `<div class="suite-name">${s.name}</div>`;

                const tests = [];
                const assert = (condition, msg) => {
                    if (condition) {
                        totalPass++;
                        tests.push({ pass: true, msg });
                    } else {
                        totalFail++;
                        tests.push({ pass: false, msg });
                        console.error(`FAIL: [${s.name}] ${msg}`);
                    }
                };

                try {
                    s.fn(assert);
                } catch (e) {
                    totalFail++;
                    tests.push({ pass: false, msg: `EXCEPTION: ${e.message}` });
                    console.error(`EXCEPTION in [${s.name}]:`, e);
                }

                tests.forEach(t => {
                    const el = document.createElement('div');
                    el.className = `test ${t.pass ? 'pass' : 'fail'}`;
                    el.textContent = `${t.pass ? '  PASS' : '  FAIL'} ${t.msg}`;
                    div.appendChild(el);
                });

                results.appendChild(div);
            });

            const total = totalPass + totalFail;
            summary.className = `summary ${totalFail === 0 ? 'ok' : 'err'}`;
            summary.textContent = `${totalPass}/${total} passed` +
                (totalFail > 0 ? ` — ${totalFail} FAILED` : ' — ALL OK');
        }
    };

    // --- MathUtils tests ---
    _testRunner.suite('MathUtils', (assert) => {
        const M = window.Game.MathUtils;
        assert(M, 'MathUtils exists');

        // distance
        assert(M.distance(0, 0, 3, 4) === 5, 'distance(0,0,3,4) = 5');
        assert(M.distance(0, 0, 0, 0) === 0, 'distance(0,0,0,0) = 0');

        // distanceSquared
        assert(M.distanceSquared(0, 0, 3, 4) === 25, 'distanceSquared(0,0,3,4) = 25');

        // normalize
        const n = M.normalize(3, 4);
        assert(Math.abs(n.x - 0.6) < 0.001, 'normalize(3,4).x ~ 0.6');
        assert(Math.abs(n.y - 0.8) < 0.001, 'normalize(3,4).y ~ 0.8');

        // clamp
        assert(M.clamp(5, 0, 10) === 5, 'clamp(5,0,10) = 5');
        assert(M.clamp(-1, 0, 10) === 0, 'clamp(-1,0,10) = 0');
        assert(M.clamp(15, 0, 10) === 10, 'clamp(15,0,10) = 10');

        // lerp
        assert(M.lerp(0, 10, 0.5) === 5, 'lerp(0,10,0.5) = 5');
        assert(M.lerp(0, 10, 0) === 0, 'lerp(0,10,0) = 0');
        assert(M.lerp(0, 10, 1) === 10, 'lerp(0,10,1) = 10');

        // isWithinDistance
        assert(M.isWithinDistance(0, 0, 3, 4, 5), 'isWithinDistance(0,0,3,4,5) true');
        assert(!M.isWithinDistance(0, 0, 3, 4, 4), 'isWithinDistance(0,0,3,4,4) false');

        // angleBetween
        const a = M.angleBetween(0, 0, 1, 0);
        assert(Math.abs(a) < 0.001, 'angleBetween to right = 0');

        // velocityTowards
        const v = M.velocityTowards(0, 0, 10, 0, 5);
        assert(Math.abs(v.vx - 5) < 0.001, 'velocityTowards vx = 5');
        assert(Math.abs(v.vy) < 0.001, 'velocityTowards vy = 0');

        // CircularBuffer
        const buf = new M.CircularBuffer(3);
        assert(buf.length === 0, 'CircularBuffer starts empty');
        buf.add({ active: true, val: 1 });
        buf.add({ active: true, val: 2 });
        assert(buf.length === 2, 'CircularBuffer length 2 after 2 adds');
        buf.add({ active: true, val: 3 });
        buf.add({ active: true, val: 4 }); // overwrites val 1
        assert(buf.length === 3, 'CircularBuffer capped at capacity');
    });

    // --- ColorUtils tests ---
    _testRunner.suite('ColorUtils', (assert) => {
        const CU = window.Game.ColorUtils;
        assert(CU, 'ColorUtils exists');

        // rgba caching
        const r1 = CU.rgba(255, 0, 0, 1);
        const r2 = CU.rgba(255, 0, 0, 1);
        assert(r1 === r2, 'rgba returns cached string');
        assert(typeof r1 === 'string' && r1.startsWith('rgba('), 'rgba format is rgba(...) string');

        // font caching
        const f1 = CU.font('bold', 20, 'Arial');
        const f2 = CU.font('bold', 20, 'Arial');
        assert(f1 === f2, 'font returns cached string');
        assert(f1 === 'bold 20px Arial', 'font format correct');

        // parseHex
        if (CU.parseHex) {
            const rgb = CU.parseHex('#ff0000');
            assert(rgb.r === 255, 'parseHex red channel');
            assert(rgb.g === 0, 'parseHex green channel');
            assert(rgb.b === 0, 'parseHex blue channel');
        }
    });
})();
