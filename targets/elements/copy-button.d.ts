export declare class StemmaCopyButton extends HTMLElement {
    /** The text that will be copied: `value`, or the text of the element `for` names. */
    readonly text: string;
    /** Copies the text; resolves to whether it worked. */
    copy(): Promise<boolean>;
}
