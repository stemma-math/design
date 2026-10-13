export declare class StemmaRange extends HTMLElement {
    /** The value, as a number. */
    value: number;
    /** Turns the value into the text the `output` shows. */
    format: (value: number) => string;
    /** Draws the fill and the value again, after a change from script. */
    refresh(): void;
}
