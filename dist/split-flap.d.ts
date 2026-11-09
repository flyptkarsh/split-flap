export declare class SplitFlapDisplay extends HTMLElement {
    static observedAttributes: string[];
    private shadow;
    private board;
    private rows;
    private _lines;
    private audio?;
    private lastClick;
    constructor();
    /** Text lines to display. Setting this animates the flaps to the new text. */
    get lines(): string[];
    set lines(v: string[]);
    get charset(): string;
    get flapMs(): number;
    /** Fixed number of rows (blank rows are added/extra rows dropped). Default: number of lines. */
    get rowCount(): number;
    set rowCount(v: number);
    /** Fixed characters per row. Default: longest line. */
    get colCount(): number;
    set colCount(v: number);
    /** Board size: any CSS length ("3rem", "48px") or a number of px. Scales the whole board. */
    get size(): string | null;
    set size(v: string | number | null);
    /** Click volume, 0 to 1 (default 0.15). */
    get volume(): number;
    set volume(v: number);
    set flapMs(v: number);
    get sound(): boolean;
    set sound(v: boolean);
    attributeChangedCallback(name: string, _o: string | null, v: string | null): void;
    connectedCallback(): void;
    private get cols();
    private get visibleLines();
    private makeCell;
    private glyph;
    private paint;
    private render;
    private active;
    private raf;
    private startSpin;
    /** One shared animation loop drives every flap — cheap even for hundreds of cells. */
    private frame;
    private settle;
    /** Soft mechanical tick, throttled so a full board doesn't blare. */
    private tick;
}
/** Imperative helper for code that doesn't use custom elements directly. */
export declare function createSplitFlap(container: HTMLElement, opts?: {
    lines?: string[];
    cols?: number;
    rows?: number;
    size?: string | number;
    sound?: boolean;
    volume?: number;
    flapMs?: number;
    charset?: string;
}): SplitFlapDisplay;
