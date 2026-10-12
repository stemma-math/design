export declare class StemmaDialog extends HTMLElement {
    /** Whether the dialog is open. */
    readonly isOpen: boolean;
    /** The value the dialog last closed with. */
    readonly returnValue: string;
    /** Opens the dialog as a modal; resolves to its return value once it closes. */
    open(): Promise<string>;
    /** Closes the dialog with `value`. */
    close(value?: string): void;
}
