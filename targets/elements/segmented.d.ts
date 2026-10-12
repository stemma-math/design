export declare class StemmaSegmented extends HTMLElement {
    /** The chosen option's value. */
    value: string;
}

/** Makes the buttons inside `group` a single choice; returns a function that chooses a value. */
export declare function bindSegmented(
    group: HTMLElement,
    onChoose: (value: string) => void,
): (value: string, focus?: boolean) => void;
