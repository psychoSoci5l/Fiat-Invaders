/**
 * DialogueUI.js - Dialogue box rendering
 *
 * Phase 1: Simple text box
 * Ready for Phase 2: Visual Novel style with portraits
 */
window.Game = window.Game || {};

class DialogueUI {
    constructor() {
        this.container = null;
        this.speakerEl = null;
        this.textEl = null;
        this.isVisible = false;
        this.hideTimeout = null;
        this.typewriterInterval = null;
        this._listenersAttached = false;  // Prevent duplicate listeners

        // Bound handlers for cleanup
        this._onClickHandler = null;
        this._onTouchHandler = null;

        // Config
        this.config = {
            displayTime: 4000,        // ms to show dialogue
            typewriterSpeed: 30,      // ms per character (0 = instant)
            fadeInDuration: 300,      // ms
            fadeOutDuration: 200      // ms
        };
    }

    /**
     * Initialize UI elements
     */
    init() {
        // Create container if not exists
        if (!document.getElementById('dialogue-container')) {
            this._createElements();
        }

        this.container = document.getElementById('dialogue-container');
        this.speakerEl = document.getElementById('dialogue-speaker');
        this.textEl = document.getElementById('dialogue-text');

        // Click/tap to dismiss (only attach once)
        if (this.container && !this._listenersAttached) {
            this._onClickHandler = () => this.hide();
            this._onTouchHandler = (e) => {
                e.preventDefault();
                this.hide();
            };
            this.container.addEventListener('click', this._onClickHandler);
            this.container.addEventListener('touchstart', this._onTouchHandler, { passive: false });
            this._listenersAttached = true;
        }
    }

    /**
     * Create DOM elements
     */
    _createElements() {
        const container = document.createElement('div');
        container.id = 'dialogue-container';
        container.className = 'dialogue-container';
        container.innerHTML = `
            <div class="dialogue-box">
                <div id="dialogue-speaker" class="dialogue-speaker"></div>
                <div id="dialogue-text" class="dialogue-text"></div>
                <div class="dialogue-tap-hint">TAP TO CONTINUE</div>
            </div>
        `;
        document.body.appendChild(container);
    }

    /**
     * Show dialogue
     * @param {Object} dialogue - {speaker, text, portrait, mood}
     */
    show(dialogue) {
        if (!this.container) this.init();

        // Clear any pending hide
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }

        // Clear any ongoing typewriter
        if (this.typewriterInterval) {
            clearInterval(this.typewriterInterval);
            this.typewriterInterval = null;
        }

        // Set speaker (with color based on type)
        const speakerColor = this._getSpeakerColor(dialogue.speaker);
        this.speakerEl.textContent = dialogue.speaker;
        this.speakerEl.style.color = speakerColor;

        // Set text with typewriter effect
        if (this.config.typewriterSpeed > 0) {
            this._typewriterEffect(dialogue.text);
        } else {
            this.textEl.textContent = dialogue.text;
        }

        // Show container
        this.container.classList.add('visible');
        this.isVisible = true;

        // Auto-hide after delay
        this.hideTimeout = setTimeout(() => {
            this.hide();
        }, this.config.displayTime);

        // Emit event
        if (window.Game.Events) {
            window.Game.Events.emit('dialogue:shown', dialogue);
        }
    }

    /**
     * Typewriter text effect
     */
    _typewriterEffect(text) {
        this.textEl.textContent = '';
        let index = 0;

        this.typewriterInterval = setInterval(() => {
            if (index < text.length) {
                this.textEl.textContent += text[index];
                index++;
            } else {
                clearInterval(this.typewriterInterval);
                this.typewriterInterval = null;
            }
        }, this.config.typewriterSpeed);
    }

    /**
     * Get color for speaker name
     */
    _getSpeakerColor(speaker) {
        const colors = {
            'BTC': '#F7931A',
            'ETH': '#8c7ae6',
            'SOL': '#00d2d3',
            'POWELL': '#e74c3c',
            'FED': '#c0392b',
            'LAGARDE': '#003399',
            'BCE': '#003399',
            'KURODA': '#bc002d',
            'UEDA': '#bc002d',
            'BOJ': '#bc002d',
            'SYSTEM': '#3498db',
            'PLAYER': '#2ecc71'
        };
        return colors[speaker] || '#F7931A';
    }

    /**
     * Hide dialogue
     */
    hide() {
        if (!this.container) return;

        // Clear timeouts
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
        if (this.typewriterInterval) {
            clearInterval(this.typewriterInterval);
            this.typewriterInterval = null;
        }

        // Hide container
        this.container.classList.remove('visible');
        this.isVisible = false;

        // Emit event
        if (window.Game.Events) {
            window.Game.Events.emit('dialogue:hidden');
        }
    }

    /**
     * Check if dialogue is currently visible
     */
    isShowing() {
        return this.isVisible;
    }

    /**
     * Update config
     */
    setConfig(options) {
        Object.assign(this.config, options);
    }

    /**
     * Cleanup - remove event listeners and DOM
     */
    destroy() {
        this.hide();

        // Remove event listeners
        if (this.container && this._listenersAttached) {
            if (this._onClickHandler) {
                this.container.removeEventListener('click', this._onClickHandler);
            }
            if (this._onTouchHandler) {
                this.container.removeEventListener('touchstart', this._onTouchHandler);
            }
            this._listenersAttached = false;
        }

        // Remove DOM element
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        this.container = null;
        this.speakerEl = null;
        this.textEl = null;
    }
}

// Create singleton
window.Game.DialogueUI = new DialogueUI();
