# Canvas 2D — Known Issues & Gotchas

## OffscreenCanvas Safari Support

Safari 16.4+ supports `OffscreenCanvas`. On older versions, the game falls back to rendering currency-symbol bullets inline on each frame. This fallback is exercised during development to ensure it doesn't regress.

## Canvas Sizing on High-DPI Screens

Canvas dimensions must be multiplied by `devicePixelRatio` for crisp rendering on Retina/HiDPI displays. The canvas `width`/`height` attributes are set to `displaySize * devicePixelRatio`, and CSS size to `displaySize`. The game does this in the initialization path.

## requestAnimationFrame Tab Throttling

When the browser tab is backgrounded, `requestAnimationFrame` call rate is throttled (to 1fps or less depending on browser). The game uses delta-time accumulation rather than fixed-step assumption, so it resumes correctly when foregrounded.

## Font Rendering

`ctx.fillText()` for currency symbols uses system fonts. Rendering can vary between platforms — the game does not bundle custom fonts. Symbol glyphs are chosen to be universally available in common Unicode fonts.

## Canvas Pattern Performance

`ctx.createPattern()` with an image can cause GPU memory issues if called every frame. The game creates patterns once and re-uses the `CanvasPattern` object, not the API call.
