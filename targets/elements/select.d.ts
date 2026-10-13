export declare class StemmaSelect extends HTMLElement {
    /** The chosen option's value, as the native `select` has it. */
    value: string;
    /** Whether the list is open. */
    readonly isOpen: boolean;
    /** Opens the list, with the chosen option focused. */
    open(): void;
    /** Closes the list, returning focus to the button unless `refocus` is false. */
    close(refocus?: boolean): void;
    /** Draws the options and the chosen one again from the `select`. */
    refresh(): void;
}
