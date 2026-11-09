/**
 * <split-flap> — a split-flap (Solari) display as a framework-agnostic web component.
 *
 *   <split-flap lines='["LONDON  BA117  ON TIME"]' sound></split-flap>
 *   el.lines = ["PARIS  AF008  DELAYED"];
 */
const DEFAULT_CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-/";

const STYLE = `
:host{display:inline-block;font-size:var(--split-flap-font-size,2rem);
  --split-flap-bg:#1a1a1a;--split-flap-fg:#f4f4f0;--split-flap-gap:.08em;--split-flap-flap-ms:70}
.board{display:flex;flex-direction:column;gap:.18em;padding:.5em;background:#000;border-radius:.3em;
  box-shadow:0 .5em 1.5em rgba(0,0,0,.45);width:max-content}
.row{display:flex;gap:var(--split-flap-gap)}
.cell{position:relative;width:.72em;height:1.2em;perspective:6em;
  font:700 1em/1 "Helvetica Neue",Helvetica,Arial,sans-serif;color:var(--split-flap-fg)}
.half{position:absolute;left:0;right:0;height:50%;overflow:hidden;background:var(--split-flap-bg);backface-visibility:hidden}
.half span{position:absolute;left:0;right:0;height:200%;display:flex;align-items:center;justify-content:center}
.t{top:0;border-radius:.08em .08em 0 0;background:linear-gradient(#222,#151515)}
.t span{top:0}
.b{bottom:0;border-radius:0 0 .08em .08em;background:linear-gradient(#151515,#1f1f1f)}
.b span{top:-100%}
.t.flap{transform-origin:50% 100%;visibility:hidden}
.b.flap{transform-origin:50% 0;visibility:hidden}
.cell::after{content:"";position:absolute;left:0;right:0;top:50%;height:max(1px,.03em);background:#000;z-index:3;box-shadow:0 0 .04em #000}
`;

type Cell = {
  root: HTMLElement;
  tTop: HTMLElement; tBot: HTMLElement; fTop: HTMLElement; fBot: HTMLElement;
  idx: number; target: number; running: boolean; next: number; wait: number; stepStart: number;
};

export class SplitFlapDisplay extends HTMLElement {
  static observedAttributes = ["lines", "cols", "sound", "charset", "flap-ms"];

  private shadow = this.attachShadow({ mode: "open" });
  private board = document.createElement("div");
  private rows: Cell[][] = [];
  private _lines: string[] = [];
  private audio?: AudioContext;
  private lastClick = 0;

  constructor() {
    super();
    const style = document.createElement("style");
    style.textContent = STYLE;
    this.board.className = "board";
    this.board.setAttribute("role", "img");
    this.shadow.append(style, this.board);
  }

  /** Text lines to display. Setting this animates the flaps to the new text. */
  get lines(): string[] { return this._lines; }
  set lines(v: string[]) { this._lines = (v ?? []).map(String); this.render(); }

  get charset(): string { return this.getAttribute("charset") ?? DEFAULT_CHARSET; }
  get flapMs(): number { return Number(this.getAttribute("flap-ms")) || 70; }
  get sound(): boolean { return this.hasAttribute("sound"); }
  set sound(v: boolean) { this.toggleAttribute("sound", v); }

  attributeChangedCallback(name: string, _o: string | null, v: string | null) {
    if (name === "lines" && v) {
      try { const p = JSON.parse(v); if (Array.isArray(p)) this.lines = p; }
      catch { this.lines = v.split("\n"); }
    } else if (name === "cols") this.render();
  }

  connectedCallback() { this.render(); }

  private get cols(): number {
    const attr = Number(this.getAttribute("cols"));
    return attr > 0 ? attr : Math.max(1, ...this._lines.map((l) => l.length));
  }

  private makeCell(): Cell {
    const root = document.createElement("div");
    root.className = "cell";
    const half = (cls: string) => {
      const d = document.createElement("div");
      d.className = "half " + cls;
      d.append(document.createElement("span"));
      return d;
    };
    const tBot = half("b"), tTop = half("t"), fTop = half("t flap"), fBot = half("b flap");
    root.append(tTop, tBot, fTop, fBot);
    const cell: Cell = { root, tTop, tBot, fTop, fBot, idx: 0, target: 0, running: false, next: 0, wait: 0, stepStart: 0 };
    this.paint(cell, 0, 0);
    return cell;
  }

  private glyph(i: number) { return this.charset[i] === " " ? " " : this.charset[i]; }

  private paint(c: Cell, from: number, to: number) {
    const set = (el: HTMLElement, i: number) => { (el.firstChild as HTMLElement).textContent = this.glyph(i); };
    set(c.tTop, to); set(c.tBot, from); set(c.fTop, from); set(c.fBot, to);
  }

  private render() {
    if (!this.isConnected) return;
    const cols = this.cols;
    // Grow/shrink the grid.
    while (this.rows.length > this._lines.length) this.rows.pop();
    this.board.replaceChildren();
    this._lines.forEach((_, r) => {
      const row = this.rows[r] ?? (this.rows[r] = []);
      row.length = Math.min(row.length, cols);
      while (row.length < cols) row.push(this.makeCell());
      const el = document.createElement("div");
      el.className = "row";
      el.append(...row.map((c) => c.root));
      this.board.append(el);
    });
    this.board.setAttribute("aria-label", this._lines.join(", "));

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this._lines.forEach((line, r) => {
      const padded = line.toUpperCase().padEnd(cols, " ").slice(0, cols);
      [...padded].forEach((ch, c) => {
        const cell = this.rows[r][c];
        const t = this.charset.indexOf(ch);
        cell.target = t < 0 ? 0 : t;
        if (reduced) { cell.idx = cell.target; this.paint(cell, cell.idx, cell.idx); }
        else if (!cell.running) this.startSpin(cell, c * 20 + r * 50);
      });
    });
  }

  private active = new Set<Cell>();
  private raf = 0;

  private startSpin(c: Cell, delay: number) {
    c.running = true; c.wait = performance.now() + delay; c.stepStart = 0;
    this.active.add(c);
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  /** One shared animation loop drives every flap — cheap even for hundreds of cells. */
  private frame = (now: number) => {
    const n = this.charset.length, dur = this.flapMs;
    for (const c of this.active) {
      if (now < c.wait) continue;
      if (!c.stepStart) {
        if (c.idx === c.target) { this.settle(c); continue; }
        c.next = (c.idx + 1) % n;
        this.paint(c, c.idx, c.next);
        c.stepStart = now;
        this.tick();
      }
      const p = (now - c.stepStart) / dur;
      if (p >= 1) {
        // Slow frame (background tab, busy CPU): skip ahead rather than crawl.
        const left = (c.target - c.next + n) % n;
        c.next = (c.next + Math.min(Math.floor(p) - 1, left)) % n;
        c.tBot.firstChild!.textContent = this.glyph(c.next);
        c.fTop.style.visibility = c.fBot.style.visibility = "hidden";
        c.idx = c.next; c.stepStart = 0;
        if (c.idx === c.target) this.settle(c);
      } else if (p < 0.5) {
        c.fBot.style.visibility = "hidden";
        c.fTop.style.visibility = "visible";
        c.fTop.style.transform = `rotateX(${-p * 180}deg)`;
      } else {
        c.fTop.style.visibility = "hidden";
        c.fBot.style.visibility = "visible";
        c.fBot.style.transform = `rotateX(${(1 - p) * 180}deg)`;
      }
    }
    this.raf = this.active.size ? requestAnimationFrame(this.frame) : 0;
  };

  private settle(c: Cell) {
    this.paint(c, c.idx, c.idx);
    c.running = false;
    this.active.delete(c);
  }

  /** Soft mechanical tick, throttled so a full board doesn't blare. */
  private tick() {
    if (!this.sound) return;
    const now = performance.now();
    if (now - this.lastClick < 30) return;
    this.lastClick = now;
    try {
      const ctx = (this.audio ??= new AudioContext());
      const len = Math.floor(ctx.sampleRate * 0.012);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
      const src = ctx.createBufferSource(), g = ctx.createGain();
      g.gain.value = 0.15; src.buffer = buf; src.connect(g).connect(ctx.destination); src.start();
    } catch { /* audio unavailable until a user gesture */ }
  }
}

if (typeof customElements !== "undefined" && !customElements.get("split-flap")) {
  customElements.define("split-flap", SplitFlapDisplay);
}

/** Imperative helper for code that doesn't use custom elements directly. */
export function createSplitFlap(
  container: HTMLElement,
  opts: { lines?: string[]; cols?: number; sound?: boolean; flapMs?: number; charset?: string } = {}
): SplitFlapDisplay {
  const el = document.createElement("split-flap") as SplitFlapDisplay;
  if (opts.cols) el.setAttribute("cols", String(opts.cols));
  if (opts.flapMs) el.setAttribute("flap-ms", String(opts.flapMs));
  if (opts.charset) el.setAttribute("charset", opts.charset);
  if (opts.sound) el.sound = true;
  container.append(el);
  if (opts.lines) el.lines = opts.lines;
  return el;
}
