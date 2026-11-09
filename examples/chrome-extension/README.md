# Chrome / Edge / Firefox extension example

1. `cp ../../dist/split-flap.global.js .`
2. Chrome: open `chrome://extensions`, enable Developer mode, **Load unpacked**, choose this folder.
3. Visit https://example.com — a board appears bottom-right.

Notes
- Content scripts have no `customElements`; use `SplitFlapLib.createSplitFlap()`.
- Styles use `adoptedStyleSheets`, so strict page CSP can't block them.
- No inline scripts or `eval`: compatible with Manifest V3 CSP.
- In a popup/options page (extension origin) you can use `<split-flap>` normally.
