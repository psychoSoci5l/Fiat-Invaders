# Privacy Policy - FIAT vs CRYPTO

**Last updated:** May 10, 2026

## Overview

FIAT vs CRYPTO is a free browser-based game. We are committed to protecting your privacy. This policy explains what data we store and how it is used.

## Data We Store

### Local Storage

We store the following data **locally on your device** using browser localStorage:

- **Game progress**: High scores, current level, unlocked achievements
- **Settings**: Language preference, sound/music settings, control preferences
- **Session data**: Current run state (perks, power-ups)

This data never leaves your device unless you choose to submit a score (see below).

### Leaderboard (Voluntary Submission)

The game includes an optional online leaderboard. When you **choose** to submit a score:

- **What is sent**: Your chosen callsign, your score, the ship you used, and minimal technical metadata required for the leaderboard to function (timestamps, game version).
- **What is NOT sent**: No personal information, no location data, no device identifiers, no browsing history.

Score submissions are protected by HMAC signing and nonce-based replay prevention. The leaderboard is hosted on a Cloudflare Worker with KV storage.

### What We Do NOT Collect

- No personal information (name, email, phone)
- No location data
- No device identifiers
- No analytics or tracking
- No advertising data

## Third-Party Services

This game does **not** use any third-party services:

- No analytics (Google Analytics, etc.)
- No advertising networks
- No social media integrations
- No cloud saves (beyond the optional leaderboard described above)

All infrastructure (frontend, leaderboard API, leaderboard storage) is self-hosted on Cloudflare.

## Data Storage

All game data is stored locally in your browser's localStorage. You can clear this data at any time by:

1. Clearing your browser's site data
2. Using your browser's "Clear browsing data" feature
3. Uninstalling the PWA (if installed)

Leaderboard scores remain on the server. If you wish to have a score removed, open an issue on our GitHub repository.

## Children's Privacy

This game does not collect any personal information from anyone, including children under 13. The game is suitable for all ages.

## Contact

If you have questions about this privacy policy, you can:

- Open an issue on our [GitHub repository](https://github.com/psychoSoci5l/Fiat-Invaders)
- Visit [psychosoci5l.com](https://www.psychosoci5l.com/)

## Changes to This Policy

We may update this privacy policy from time to time. Any changes will be reflected in the "Last updated" date above.

---

**Summary**: FIAT vs CRYPTO stores game data locally on your device. If you voluntarily submit a score to the leaderboard, only your chosen callsign, score, and ship selection are transmitted. We do not collect, track, or share any personal information.
