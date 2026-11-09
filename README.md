# split-flap

A modern [split-flap (Solari) display](https://en.wikipedia.org/wiki/Split-flap_display) as a ~5 KB, dependency-free **web component**. It works anywhere HTML works: plain pages, React, Next.js, Vue, Svelte, Angular, Astro.

- Flaps cycle through the character set to reach each letter, like the real mechanism
- One shared `requestAnimationFrame` loop, so hundreds of cells stay smooth
- Optional mechanical click sound (Web Audio, no assets)
- Respects `prefers-reduced-motion`; accessible `aria-label` with the current text
- Themeable via CSS custom properties

## Use

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/flyptkarsh/split-flap/dist/split-flap.js"></script>
<split-flap cols="24" lines='["LONDON   BA117  ON TIME","PARIS    AF008  DELAYED"]' sound></split-flap>
<script>document.querySelector("split-flap").lines = ["TOKYO    JL044  BOARDING"];</script>
```

```bash
npm i github:flyptkarsh/split-flap
```

```js
import "split-flap";                    // registers <split-flap>
import { createSplitFlap } from "split-flap";
createSplitFlap(document.body, { lines: ["HELLO", "WORLD"], cols: 8 });
```

### React / Next.js

```tsx
"use client";
import { useEffect, useRef } from "react";

export function Board({ lines }: { lines: string[] }) {
  const ref = useRef<any>(null);
  useEffect(() => { import("split-flap"); }, []);          // client only
  useEffect(() => { if (ref.current) ref.current.lines = lines; }, [lines]);
  return <split-flap ref={ref} cols={24} />;
}
```

Vue and Svelte: use the element directly and set the `lines` property.

## API

| Attribute / property | Description |
| --- | --- |
| `lines` (array property, or JSON attribute) | Text rows. Unknown characters become blanks. Uppercased automatically. |
| `cols` | Characters per row (default: longest line) |
| `charset` | Characters on the flap drum (default ` A-Z0-9:.-/`) |
| `flap-ms` | Time per flip in ms (default 70) |
| `sound` | Enable click sound (browsers require a prior user gesture) |

CSS: `--split-flap-font-size`, `--split-flap-bg`, `--split-flap-fg`, `--split-flap-gap`.

## Develop

```bash
npm i && npm run build && npx serve .   # open index.html demo
```

MIT licensed.
