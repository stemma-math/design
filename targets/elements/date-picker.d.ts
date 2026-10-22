export declare class StemmaDatePicker extends HTMLElement {
    /** The native input's ISO date or local datetime value; setting it sends no events. */
    value: string;
    /** Whether the calendar is open. */
    readonly isOpen: boolean;
    /** Opens at the selected date, or today constrained to the available range. */
    open(): void;
    /** Closes, returning focus to the trigger unless refocus is false. */
    close(refocus?: boolean): void;
    /** Reflects value, constraints, disabled/readonly state and accessible labels. */
    refresh(): void;
}
