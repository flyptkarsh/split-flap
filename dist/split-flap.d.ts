export interface SplitFlapOptions {
    lines?: string[];
    cols?: number;
    rows?: number;
    size?: string | number;
    theme?: "black" | "white";
    sound?: boolean;
    volume?: number;
    flapMs?: number;
    charset?: string;
}
/** Core renderer. Attaches a shadow root to any element you give it. */
export declare class SplitFlap {
    readonly host: HTMLElement;
    private shadow;
    private board;
    private rows;
    private o;
    private audio?;
    private lastClick;
    constructor(host: HTMLElement, opts?: SplitFlapOptions);
    /** Update any options; the board re-renders and animates. */
    set(opts: SplitFlapOptions): this;
    get lines(): string[];
    set lines(v: string[]);
    get cols(): number;
    set cols(v: number);
    get rowCount(): number;
    set rowCount(v: number);
    get size(): string | number | null;
    set size(v: string | number | null);
    get theme(): "black" | "white";
    set theme(v: "black" | "white");
    get sound(): boolean;
    set sound(v: boolean);
    get volume(): number;
    set volume(v: number);
    get flapMs(): number;
    set flapMs(v: number);
    get charset(): string;
    /** Stop animating and remove the board. */
    destroy(): void;
    private get colsEff();
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
    /** iOS/Safari only start audio from a user gesture: unlock on the first touch/click. */
    private armAudio;
    /** Soft mechanical tick, throttled so a full board doesn't blare. */
    private tick;
}
/** Mount a board in `container` using a plain element: works in extensions and WebViews. */
export declare function createSplitFlap(container: HTMLElement, opts?: SplitFlapOptions): SplitFlap;
/** <split-flap> custom element: a thin attribute/property wrapper around SplitFlap. */
declare const HTMLElementBase: typeof HTMLElement;
export declare class SplitFlapDisplay extends HTMLElementBase {
    static observedAttributes: string[];
    private core;
    get lines(): string[];
    set lines(v: string[]);
    get colCount(): number;
    set colCount(v: number);
    get rowCount(): number;
    set rowCount(v: number);
    get size(): string | number | null;
    set size(v: string | number | null);
    get theme(): "black" | "white";
    set theme(v: "black" | "white");
    get sound(): boolean;
    set sound(v: boolean);
    get volume(): number;
    set volume(v: number);
    get flapMs(): number;
    set flapMs(v: number);
    attributeChangedCallback(name: string, _o: string | null, v: string | null): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
}
export {};
