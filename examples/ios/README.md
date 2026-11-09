# iOS (WKWebView / SwiftUI) example

1. Build the library (`npm run build`) and add `dist/split-flap.global.js` to your Xcode target.
2. Add `SplitFlapView.swift` and use `SplitFlapView(lines: [...])`.

Notes
- Works on iOS 16.2+ (uses CSS `color-mix`; older iOS shows flat flaps).
- iOS only starts sound after a user tap; the library unlocks audio on the first touch.
- Update text from Swift by setting `window.board.lines = [...]` via `evaluateJavaScript`.
- Android WebView works the same way (load the IIFE build).
