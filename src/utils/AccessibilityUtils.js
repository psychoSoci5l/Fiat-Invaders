// AccessibilityUtils v1.0 — Shared accessibility utilities for WCAG 2.1 AA
// Provides focus management, ARIA helpers, screen reader announcements, and motion preference detection.
window.Game = window.Game || {};
(function () {
    'use strict';
    var G = window.Game;
    var _modalStack = [];
    var _focusStack = [];

    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function getFocusableElements(container) {
        if (!container) return [];
        return Array.from(container.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
        ));
    }

    function trapFocus(containerEl) {
        if (!containerEl) return;
        var focusable = getFocusableElements(containerEl);
        if (focusable.length === 0) return;

        function onKeyDown(e) {
            if (e.key !== 'Tab') return;
            var els = getFocusableElements(containerEl);
            if (els.length === 0) return;
            var first = els[0];
            var last = els[els.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus({ preventScroll: true });
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus({ preventScroll: true });
                }
            }
        }

        containerEl.addEventListener('keydown', onKeyDown);
        return function cleanup() {
            containerEl.removeEventListener('keydown', onKeyDown);
        };
    }

    function _restoreFocus() {
        while (_focusStack.length > 0) {
            var el = _focusStack.pop();
            if (el && el.isConnected) {
                try { el.focus({ preventScroll: true }); } catch (e) {}
                return;
            }
        }
    }

    function openModal(modalEl, triggerEl) {
        if (!modalEl) return;
        _focusStack.push(triggerEl || document.activeElement);
        modalEl.setAttribute('role', 'dialog');
        modalEl.setAttribute('aria-modal', 'true');
        var titleEl = modalEl.querySelector('h1, h2, h3, .modal-title, .neon-title, .glitch-text, [data-a11y-title]');
        if (titleEl && titleEl.id) {
            modalEl.setAttribute('aria-labelledby', titleEl.id);
        }
        var cleanup = trapFocus(modalEl);
        _modalStack.push({ el: modalEl, cleanup: cleanup });
        var focusable = getFocusableElements(modalEl);
        if (focusable.length > 0) {
            focusable[0].focus({ preventScroll: true });
        }
    }

    function closeModal(modalEl) {
        if (!modalEl) return;
        modalEl.removeAttribute('role');
        modalEl.removeAttribute('aria-modal');
        modalEl.removeAttribute('aria-labelledby');
        var idx = -1;
        for (var i = 0; i < _modalStack.length; i++) {
            if (_modalStack[i].el === modalEl) { idx = i; break; }
        }
        if (idx >= 0) {
            if (_modalStack[idx].cleanup) _modalStack[idx].cleanup();
            _modalStack.splice(idx, 1);
        }
        _restoreFocus();
    }

    function announce(message) {
        if (!message) return;
        var announcer = document.getElementById('a11y-announcer');
        if (!announcer) return;
        announcer.textContent = '';
        requestAnimationFrame(function () {
            announcer.textContent = message;
        });
    }

    function isModalOpen() {
        return _modalStack.length > 0;
    }

    function closeTopModal() {
        if (_modalStack.length === 0) return;
        var entry = _modalStack[_modalStack.length - 1];
        if (!entry || !entry.el) return;
        entry.el.style.display = 'none';
        closeModal(entry.el);
    }

    G.Accessibility = {
        prefersReducedMotion: prefersReducedMotion,
        getFocusableElements: getFocusableElements,
        trapFocus: trapFocus,
        openModal: openModal,
        closeModal: closeModal,
        announce: announce,
        isModalOpen: isModalOpen,
        closeTopModal: closeTopModal
    };
})();
