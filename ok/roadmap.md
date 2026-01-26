# Roadmap: Fiat Invaders -> iOS App Store Ready 📱

> [!IMPORTANT]
> **PIVOT**: As of Phase 3, development is exclusively focused on **Mobile/iOS**. Desktop support is deprecated.

## Phase 1: The Great Refactor (Foundation) ✅
*Goal: Transform the prototype code into a professional, maintainable architecture.*
- [x] **Project Structure Setup**: Create folder structure (`src/core`, `src/entities`, etc.).
- [x] **Decoupling**: Extricate `Constants` and `AudioSys` first.
- [x] **Entity Migration**: Move Player, Enemy, Bullet logic to separate classes.
- [x] **Manager Migration**: Isolate Wave, Collision, and UI logic.
- [x] **Entry Point**: Re-wire `index.html` to use `src/main.js` (Namespace Pattern).

## Phase 2: Hardening & Optimization 🚧
*Goal: Ensure stability and performance.*
- [x] **Object Pooling**: Formalize the recycling of bullets and particles (prevent GC stutters).
- [ ] **Event System**: Implement a Pub/Sub system (e.g., `Events.emit('PLAYER_HIT')`) to reduce tight coupling between managers.
- [ ] **Game Center Prep**: Add hooks for High Score submission (Mock implementation for now).

## Phase 3: iOS Experience Polish ✅
*Goal: It feels like an App, not a website.*
- [x] **Viewport Management**: Prevent all rubber-banding/zooming.
- [x] **Notch Support**: CSS updates for Safe Areas.
- [x] **Touch Control v2**: Refine the touch zones and sensitivity for mobile play.
- [x] **Haptics**: Add vibration feedback (Navigator.vibrate for now, Capacitor Haptics later).

## Phase 4: Next-Gen Visuals & Gameplay 🎨
*Goal: Graphics and mechanics worthy of the App Store.*
- [x] **Visual Identity**: Decide between Pixel Art, High-Res Sprites, or "Neon Geometry".
- [ ] **Asset Pipeline**: Skipped (Procedural).
- [x] **Juice**: Particle explosions, dynamic lighting/glow, screen shake polish.
- [ ] **Gameplay Depth**: New enemy patterns (Done), Boss mechanics (Next).

## Phase 5: Final Polish & Pre-Flight 🚀
- [ ] **Asset Review**: App Icon & Splash Screen.
