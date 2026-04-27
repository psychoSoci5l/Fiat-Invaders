/**
 * EventBus unit tests
 */
(function () {
    _testRunner.suite('EventBus singleton', (assert) => {
        const EV = window.Game.Events;
        assert(EV, 'Game.Events exists');
        assert(typeof EV.on === 'function', 'on() is function');
        assert(typeof EV.off === 'function', 'off() is function');
        assert(typeof EV.once === 'function', 'once() is function');
        assert(typeof EV.emit === 'function', 'emit() is function');
        assert(typeof EV.removeAllListeners === 'function', 'removeAllListeners() is function');
    });

    _testRunner.suite('EventBus on/emit', (assert) => {
        const EV = window.Game.Events;
        EV.removeAllListeners();

        let calls = [];
        const h1 = (p) => calls.push('h1:' + p);
        const h2 = (p) => calls.push('h2:' + p);

        EV.on('test:emit', h1);
        EV.on('test:emit', h2);

        EV.emit('test:emit', 'x');
        assert(calls.length === 2, 'both handlers called');
        assert(calls[0] === 'h1:x', 'h1 called first with payload');
        assert(calls[1] === 'h2:x', 'h2 called second with payload');

        // emit with no payload (undefined)
        calls = [];
        EV.on('test:no-payload', (p) => calls.push(p));
        EV.emit('test:no-payload');
        assert(calls.length === 1, 'handler called with undefined payload');
        assert(calls[0] === undefined, 'payload is undefined');

        EV.removeAllListeners();
    });

    _testRunner.suite('EventBus off', (assert) => {
        const EV = window.Game.Events;
        EV.removeAllListeners();

        let count = 0;
        const handler = () => count++;

        EV.on('test:off', handler);
        EV.emit('test:off');
        assert(count === 1, 'handler called once');

        EV.off('test:off', handler);
        EV.emit('test:off');
        assert(count === 1, 'handler not called after off');

        EV.removeAllListeners();
    });

    _testRunner.suite('EventBus off — nonexistent event/handler', (assert) => {
        const EV = window.Game.Events;

        // Should not throw
        let threw = false;
        try {
            EV.off('test:nonexistent', () => {});
            EV.off(null, () => {});
            EV.off(undefined, () => {});
        } catch (e) {
            threw = true;
        }
        assert(!threw, 'off with nonexistent event does not throw');
    });

    _testRunner.suite('EventBus once', (assert) => {
        const EV = window.Game.Events;
        EV.removeAllListeners();

        let count = 0;
        EV.once('test:once', () => count++);

        EV.emit('test:once');
        assert(count === 1, 'once handler fires on first emit');

        EV.emit('test:once');
        assert(count === 1, 'once handler does not fire on second emit');

        EV.removeAllListeners();
    });

    _testRunner.suite('EventBus once — separate event isolation', (assert) => {
        const EV = window.Game.Events;
        EV.removeAllListeners();

        let a = 0, b = 0;
        EV.once('test:iso-a', () => a++);
        EV.once('test:iso-b', () => b++);

        EV.emit('test:iso-a');
        assert(a === 1, 'iso-a handler fired');
        assert(b === 0, 'iso-b handler NOT fired');

        EV.emit('test:iso-b');
        assert(b === 1, 'iso-b handler fired on its own emit');

        EV.removeAllListeners();
    });

    _testRunner.suite('EventBus try-catch isolation', (assert) => {
        const EV = window.Game.Events;
        EV.removeAllListeners();

        let goodCalled = false;
        const bad = () => { throw new Error('bad handler'); };
        const good = () => { goodCalled = true; };

        EV.on('test:error', bad);
        EV.on('test:error', good);

        // Should not throw despite bad handler
        let threw = false;
        try {
            EV.emit('test:error');
        } catch (e) {
            threw = true;
        }
        assert(!threw, 'emit does not throw when a handler throws');
        assert(goodCalled, 'good handler executed despite bad handler');

        EV.removeAllListeners();
    });

    _testRunner.suite('EventBus deferred removal during emit', (assert) => {
        const EV = window.Game.Events;
        EV.removeAllListeners();

        let calls = [];
        const selfRemover = () => {
            calls.push('self');
            EV.off('test:defer', selfRemover);
        };
        const other = () => calls.push('other');

        EV.on('test:defer', selfRemover);
        EV.on('test:defer', other);

        // First emit: both fire, selfRemover queued for removal
        EV.emit('test:defer');
        assert(calls.length === 2, 'both fire on first emit');

        // The deferred removal should have taken effect
        calls = [];
        EV.emit('test:defer');
        assert(calls.length === 1, 'only other fires after selfRemover removed');
        assert(calls[0] === 'other', 'other is the surviving handler');

        EV.removeAllListeners();
    });

    _testRunner.suite('EventBus return unsubscribe function', (assert) => {
        const EV = window.Game.Events;
        EV.removeAllListeners();

        let count = 0;
        const unsubscribe = EV.on('test:unsub', () => count++);

        EV.emit('test:unsub');
        assert(count === 1, 'handler fires before unsubscribe');

        unsubscribe();
        EV.emit('test:unsub');
        assert(count === 1, 'handler does not fire after unsubscribe returned fn');

        EV.removeAllListeners();
    });

    _testRunner.suite('EventBus removeAllListeners', (assert) => {
        const EV = window.Game.Events;
        EV.removeAllListeners();

        let a = 0, b = 0;
        EV.on('test:rem-a', () => a++);
        EV.on('test:rem-b', () => b++);

        EV.removeAllListeners('test:rem-a');
        EV.emit('test:rem-a');
        EV.emit('test:rem-b');
        assert(a === 0, 'removeAll(a) — a not called');
        assert(b === 1, 'removeAll(a) — b still called');

        EV.removeAllListeners();
        EV.emit('test:rem-b');
        assert(b === 1, 'removeAll() — b not called after full clear');
    });

    _testRunner.suite('EventBus multiple listeners same event', (assert) => {
        const EV = window.Game.Events;
        EV.removeAllListeners();

        let count = 0;
        const handlers = [];
        for (let i = 0; i < 5; i++) {
            const h = () => count++;
            handlers.push(h);
            EV.on('test:multi', h);
        }

        EV.emit('test:multi');
        assert(count === 5, 'all 5 handlers fire');

        // Remove middle one
        EV.off('test:multi', handlers[2]);
        count = 0;
        EV.emit('test:multi');
        assert(count === 4, '4 handlers fire after removing middle one');

        EV.removeAllListeners();
    });

    _testRunner.suite('EventBus emit to event with no listeners', (assert) => {
        const EV = window.Game.Events;
        let threw = false;
        try {
            EV.emit('test:ghost-event');
            EV.emit('test:another-ghost');
        } catch (e) {
            threw = true;
        }
        assert(!threw, 'emit to event with no listeners does not throw');
    });

    _testRunner.suite('EventBus payload passthrough', (assert) => {
        const EV = window.Game.Events;
        EV.removeAllListeners();

        let received;
        EV.on('test:payload', (p) => { received = p; });

        EV.emit('test:payload', { value: 42 });
        assert(typeof received === 'object', 'received object payload');
        assert(received.value === 42, 'payload.value is 42');

        EV.emit('test:payload', 'string-payload');
        assert(received === 'string-payload', 'received string payload');

        EV.emit('test:payload', null);
        assert(received === null, 'received null payload');

        EV.removeAllListeners();
    });

    _testRunner.suite('EventBus event naming validation', (assert) => {
        // Validation is a console.warn — we can't easily assert that in the
        // test harness, but we verify the method accepts valid names.
        const EV = window.Game.Events;
        EV.removeAllListeners();

        let count = 0;
        const h = () => count++;

        // Valid naming — should work without warning
        EV.on('test:valid', h);
        EV.emit('test:valid');
        assert(count === 1, 'valid domain:action event works');
        EV.off('test:valid', h);

        // Events with single segment are accepted but warned
        // We verify they still register
        const h2 = () => count++;
        EV.on('invalid', h2);
        EV.emit('invalid');
        assert(count === 2, 'non-conforming event still registers (with warning)');
        EV.off('invalid', h2);

        EV.removeAllListeners();
    });
})();
