export declare class StemmaMenu extends HTMLElement {
    /** Whether the menu is open. */
    readonly isOpen: boolean;
    /** Opens the menu, focusing its first or last item. */
    open(focus?: "first" | "last"): void;
    /** Closes the menu, returning focus to its button unless `refocus` is false. */
    close(refocus?: boolean): void;
}

/** The `select` event's detail. */
export interface StemmaMenuSelect {
    value: string;
    item: HTMLElement;
}
