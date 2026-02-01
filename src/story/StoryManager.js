/**
 * StoryManager.js - Dialogue trigger controller
 *
 * Manages when and what dialogues appear.
 * Modular design ready for Visual Novel style expansion.
 */
window.Game = window.Game || {};

class StoryManager {
    constructor() {
        this.currentShip = 'BTC';
        this.currentBoss = 'FEDERAL_RESERVE';
        this.dialogueQueue = [];
        this.isShowingDialogue = false;
        this.lastShownDialogue = null;
    }

    /**
     * Set current player ship (for ship-specific dialogues)
     */
    setShip(shipType) {
        this.currentShip = shipType;
    }

    /**
     * Get random item from array
     */
    _randomPick(arr) {
        if (!arr || arr.length === 0) return null;
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /**
     * Format dialogue object for UI
     * Handles both string and {speaker, text} formats
     */
    _formatDialogue(dialogue, defaultSpeaker = null) {
        if (typeof dialogue === 'string') {
            return {
                speaker: defaultSpeaker || this.currentShip,
                text: dialogue,
                portrait: null,
                mood: 'default'
            };
        }
        return {
            speaker: dialogue.speaker || defaultSpeaker || this.currentShip,
            text: dialogue.text,
            portrait: dialogue.portrait || null,
            mood: dialogue.mood || 'default'
        };
    }

    /**
     * Show dialogue via UI
     */
    _showDialogue(dialogue) {
        if (!dialogue) return;

        const formatted = this._formatDialogue(dialogue);
        this.lastShownDialogue = formatted;
        this.isShowingDialogue = true;

        // Trigger UI to show dialogue
        if (window.Game.DialogueUI) {
            window.Game.DialogueUI.show(formatted);
        }

        // Also emit event for other systems
        if (window.Game.Events) {
            window.Game.Events.emit('dialogue:show', formatted);
        }
    }

    // ==========================================
    // PUBLIC TRIGGER METHODS
    // ==========================================

    /**
     * Ship selected / game start
     */
    onShipSelect(shipType) {
        this.setShip(shipType);
        const dialogues = window.Game.DIALOGUES?.SHIP_INTRO?.[shipType];
        if (dialogues) {
            this._showDialogue(this._randomPick(dialogues));
        }
    }

    /**
     * Level/wave completed
     */
    onLevelComplete(level) {
        const specific = window.Game.DIALOGUES?.LEVEL_COMPLETE?.[level];
        const generic = window.Game.DIALOGUES?.LEVEL_COMPLETE_GENERIC;

        // Use specific dialogue if available, otherwise generic
        const pool = specific || generic;
        if (pool) {
            this._showDialogue(this._randomPick(pool));
        }
    }

    /**
     * Boss appears
     */
    onBossIntro(bossType = 'FEDERAL_RESERVE') {
        this.currentBoss = bossType;
        const dialogues = window.Game.DIALOGUES?.BOSS_INTRO?.[bossType];
        if (dialogues) {
            this._showDialogue(this._randomPick(dialogues));
        }
    }

    /**
     * Boss changes phase
     */
    onBossPhaseChange(phase, bossType = null) {
        const boss = bossType || this.currentBoss;
        const bossPhases = window.Game.DIALOGUES?.BOSS_PHASE?.[boss];
        const dialogues = bossPhases?.[phase];
        if (dialogues) {
            this._showDialogue(this._randomPick(dialogues));
        }
    }

    /**
     * Boss defeated
     */
    onBossDefeat(bossType = 'FEDERAL_RESERVE') {
        const dialogues = window.Game.DIALOGUES?.BOSS_DEFEAT?.[bossType];
        if (dialogues) {
            this._showDialogue(this._randomPick(dialogues));
        }
    }

    /**
     * Player dies / game over
     */
    onGameOver() {
        const dialogues = window.Game.DIALOGUES?.GAME_OVER?.[this.currentShip];
        if (dialogues) {
            this._showDialogue(this._randomPick(dialogues));
        }
    }

    /**
     * Continue screen / before restart
     */
    onContinue() {
        const dialogues = window.Game.DIALOGUES?.CONTINUE;
        if (dialogues) {
            this._showDialogue(this._randomPick(dialogues));
        }
    }

    /**
     * New market cycle (after boss, difficulty increases)
     */
    onNewCycle() {
        const dialogues = window.Game.DIALOGUES?.NEW_CYCLE;
        if (dialogues) {
            this._showDialogue(this._randomPick(dialogues));
        }
    }

    /**
     * Bear market mode activated
     */
    onBearMarketStart() {
        const dialogues = window.Game.DIALOGUES?.BEAR_MARKET_START;
        if (dialogues) {
            this._showDialogue(this._randomPick(dialogues));
        }
    }

    /**
     * Get random tip (for loading, pause, etc.)
     */
    getRandomTip() {
        const tips = window.Game.DIALOGUES?.TIPS;
        return tips ? this._randomPick(tips) : null;
    }

    /**
     * Hide current dialogue
     */
    hideDialogue() {
        this.isShowingDialogue = false;
        if (window.Game.DialogueUI) {
            window.Game.DialogueUI.hide();
        }
    }
}

// Create singleton
window.Game.Story = new StoryManager();
