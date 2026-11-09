/**
 * split-flap — a split-flap (Solari) display. No dependencies, no build step needed to use.
 *
 *  - <split-flap> custom element (pages, React, Vue, Svelte, ...)
 *  - SplitFlap / createSplitFlap(): plain class that works WITHOUT customElements,
 *    so it runs in browser-extension content scripts and iOS/Android WebViews.
 */
const DEFAULT_CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-/";

const STYLE = `
:host{display:inline-block;font-size:var(--split-flap-font-size,2rem);
  --split-flap-bg:#1c1c1c;--split-flap-fg:#f4f4f0;--split-flap-gap:.08em;--split-flap-flap-ms:70}
:host([theme="white"]){--split-flap-bg:#f6f5f0;--split-flap-fg:#141414;--split-flap-frame:#c9c8c2}
:host([theme="black"]){--split-flap-bg:#1c1c1c;--split-flap-fg:#f4f4f0;--split-flap-frame:#000}
.board{display:flex;flex-direction:column;gap:.18em;padding:.5em;background:var(--split-flap-frame,#000);border-radius:.3em;
  box-shadow:0 .5em 1.5em rgba(0,0,0,.45);width:max-content}
.row{display:flex;gap:var(--split-flap-gap)}
.cell{position:relative;width:.72em;height:1.2em;perspective:6em;
  font:700 1em/1 var(--split-flap-font,"Helvetica Neue",Helvetica,Arial,sans-serif);color:var(--split-flap-fg)}
.half{position:absolute;left:0;right:0;height:50%;overflow:hidden;background:var(--split-flap-bg);backface-visibility:hidden}
.half span{position:absolute;left:0;right:0;height:200%;display:flex;align-items:center;justify-content:center}
.t{top:0;border-radius:.08em .08em 0 0;background:linear-gradient(color-mix(in srgb,var(--split-flap-bg),#fff 8%),var(--split-flap-bg))}
.t span{top:0}
.b{bottom:0;border-radius:0 0 .08em .08em;background:linear-gradient(color-mix(in srgb,var(--split-flap-bg),#000 12%),var(--split-flap-bg))}
.b span{top:-100%}
.t.flap{transform-origin:50% 100%;visibility:hidden}
.b.flap{transform-origin:50% 0;visibility:hidden}
.cell::after{content:"";position:absolute;left:0;right:0;top:50%;height:max(1px,.03em);background:#000;z-index:3;box-shadow:0 0 .04em #000}
`;


export interface SplitFlapOptions {
  lines?: string[]; cols?: number; rows?: number;
  size?: string | number; theme?: "black" | "white";
  sound?: boolean; volume?: number; flapMs?: number; charset?: string;
}

type Cell = {
  root: HTMLElement;
  tTop: HTMLElement; tBot: HTMLElement; fTop: HTMLElement; fBot: HTMLElement;
  idx: number; target: number; running: boolean; next: number; wait: number; stepStart: number;
};


/** Core renderer. Attaches a shadow root to any element you give it. */
export class SplitFlap {
  private shadow: ShadowRoot;
  private board = document.createElement("div");
  private rows: Cell[][] = [];
  private o: Required<Omit<SplitFlapOptions, "size">> & { size: string | number | null } = {
    lines: [], cols: 0, rows: 0, size: null, theme: "black", sound: false, volume: 0.15, flapMs: 70, charset: DEFAULT_CHARSET,
  };
  private audio?: AudioContext;
  private lastClick = 0;
  constructor(public readonly host: HTMLElement, opts: SplitFlapOptions = {}) {
    this.shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    // adoptedStyleSheets is exempt from page CSP (important inside extensions); fall back to <style>.
    try {
      const sheet = new CSSStyleSheet(); sheet.replaceSync(STYLE);
      this.shadow.adoptedStyleSheets = [sheet];
    } catch {
      const st = document.createElement("style"); st.textContent = STYLE; this.shadow.append(st);
    }
    this.board.className = "board";
    this.board.setAttribute("role", "img");
    this.shadow.append(this.board);
    this.set(opts);
  }

  /** Update any options; the board re-renders and animates. */
  set(opts: SplitFlapOptions): this {
    Object.assign(this.o, Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)));
    if (opts.lines) this.o.lines = opts.lines.map(String);
    if (opts.size !== undefined) {
      const v = this.o.size;
      if (v == null || v === "") this.host.style.removeProperty("--split-flap-font-size");
      else this.host.style.setProperty("--split-flap-font-size", /^[\d.]+$/.test(String(v)) ? v + "px" : String(v));
    }
    if (opts.theme && this.host.getAttribute("theme") !== opts.theme) this.host.setAttribute("theme", opts.theme);
    if (opts.sound) this.armAudio();
    this.render();
    return this;
  }

  get lines() { return this.o.lines; }  set lines(v: string[]) { this.set({ lines: v }); }
  get cols() { return this.o.cols; }    set cols(v: number) { this.set({ cols: v }); }
  get rowCount() { return this.o.rows; } set rowCount(v: number) { this.set({ rows: v }); }
  get size() { return this.o.size; }    set size(v: string | number | null) { this.o.size = v; this.set({ size: v as any }); }
  get theme() { return this.o.theme; }  set theme(v: "black" | "white") { this.set({ theme: v }); }
  get sound() { return this.o.sound; }  set sound(v: boolean) { this.set({ sound: v }); }
  get volume() { return this.o.volume; } set volume(v: number) { this.o.volume = Math.min(1, Math.max(0, v)); }
  get flapMs() { return this.o.flapMs || 70; } set flapMs(v: number) { this.o.flapMs = v; }
  get charset() { return this.o.charset; }

  /** Stop animating and remove the board. */
  destroy() { cancelAnimationFrame(this.raf); this.raf = 0; this.active.clear(); this.board.remove(); this.audio?.close?.(); }

  private get colsEff(): number {
    return this.o.cols > 0 ? this.o.cols : Math.max(1, ...this.o.lines.map((l) => l.length));
  }

  private get visibleLines(): string[] {
    const n = this.o.rows;
    return n ? Array.from({ length: n }, (_, i) => this.o.lines[i] ?? "") : this.o.lines;
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
    if (!this.host.isConnected) return;
    const cols = this.colsEff;
    const lines = this.visibleLines;
    // Grow/shrink the grid.
    while (this.rows.length > lines.length) this.rows.pop();
    this.board.replaceChildren();
    lines.forEach((_, r) => {
      const row = this.rows[r] ?? (this.rows[r] = []);
      row.length = Math.min(row.length, cols);
      while (row.length < cols) row.push(this.makeCell());
      const el = document.createElement("div");
      el.className = "row";
      el.append(...row.map((c) => c.root));
      this.board.append(el);
    });
    this.board.setAttribute("aria-label", lines.join(", "));

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    lines.forEach((line, r) => {
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


  /** iOS/Safari only start audio from a user gesture: unlock on the first touch/click. */
  private armAudio() {
    const unlock = () => {
      try {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        this.audio ??= new AC();
        if (this.audio.state === "suspended") void this.audio.resume();
      } catch { /* no audio available */ }
    };
    for (const ev of ["pointerdown", "touchend", "keydown"]) document.addEventListener(ev, unlock, { once: true, passive: true });
  }

  /** Soft mechanical tick, throttled so a full board doesn't blare. */
  private tick() {
    if (!this.o.sound || !this.audio || this.audio.state !== "running") return;
    const now = performance.now();
    if (now - this.lastClick < 30) return;
    this.lastClick = now;
    try {
      const ctx = this.audio;
      const len = Math.floor(ctx.sampleRate * 0.012);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
      const src = ctx.createBufferSource(), g = ctx.createGain();
      g.gain.value = this.o.volume; src.buffer = buf; src.connect(g).connect(ctx.destination); src.start();
    } catch { /* ignore */ }
  }
}

/** Mount a board in `container` using a plain element: works in extensions and WebViews. */
export function createSplitFlap(container: HTMLElement, opts: SplitFlapOptions = {}): SplitFlap {
  const host = document.createElement("div");
  host.style.display = "inline-block";
  container.append(host);
  return new SplitFlap(host, opts);
}

/** <split-flap> custom element: a thin attribute/property wrapper around SplitFlap. */
const HTMLElementBase: typeof HTMLElement = typeof HTMLElement === "undefined" ? (class {} as any) : HTMLElement;

export class SplitFlapDisplay extends HTMLElementBase {
  static observedAttributes = ["lines", "cols", "rows", "size", "theme", "sound", "volume", "charset", "flap-ms"];
  private core = new SplitFlap(this);

  get lines() { return this.core.lines; }  set lines(v: string[]) { this.core.lines = v; }
  get colCount() { return this.core.cols; } set colCount(v: number) { v > 0 ? this.setAttribute("cols", String(v)) : this.removeAttribute("cols"); }
  get rowCount() { return this.core.rowCount; } set rowCount(v: number) { v > 0 ? this.setAttribute("rows", String(v)) : this.removeAttribute("rows"); }
  get size() { return this.getAttribute("size"); } set size(v: string | number | null) { v == null ? this.removeAttribute("size") : this.setAttribute("size", String(v)); }
  get theme() { return this.core.theme; } set theme(v: "black" | "white") { this.setAttribute("theme", v); }
  get sound() { return this.hasAttribute("sound"); } set sound(v: boolean) { this.toggleAttribute("sound", v); }
  get volume() { return this.core.volume; } set volume(v: number) { this.setAttribute("volume", String(v)); }
  get flapMs() { return this.core.flapMs; } set flapMs(v: number) { this.setAttribute("flap-ms", String(v)); }

  attributeChangedCallback(name: string, _o: string | null, v: string | null) {
    const c = this.core;
    switch (name) {
      case "lines": if (v) { try { const p = JSON.parse(v); if (Array.isArray(p)) c.lines = p; } catch { c.lines = v.split("\n"); } } break;
      case "cols": c.set({ cols: Number(v) || 0 }); break;
      case "rows": c.set({ rows: Number(v) || 0 }); break;
      case "size": c.set({ size: v ?? "" }); break;
      case "theme": c.set({ theme: v === "white" ? "white" : "black" }); break;
      case "sound": c.set({ sound: v !== null }); break;
      case "volume": c.volume = parseFloat(v ?? "") || 0.15; break;
      case "flap-ms": c.flapMs = Number(v) || 70; break;
      case "charset": c.set({ charset: v ?? DEFAULT_CHARSET }); break;
    }
  }
  connectedCallback() { this.core.set({}); }
  disconnectedCallback() { this.core.destroy(); }
}

if (typeof customElements !== "undefined" && customElements && !customElements.get("split-flap")) {
  customElements.define("split-flap", SplitFlapDisplay);
}
