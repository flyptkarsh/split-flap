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
    get sound(): boolean;
    set sound(v: boolean);
    attributeChangedCallback(name: string, _o: string | null, v: string | null): void;
    connectedCallback(): void;
    private get cols();
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
    sound?: boolean;
    flapMs?: number;
    charset?: string;
}): SplitFlapDisplay;
