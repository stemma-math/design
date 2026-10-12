export type Intent = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

export interface ToastOptions {
    text: string;
    intent?: Intent;
    /** Milliseconds before it goes by itself; 0 keeps it. 8000 by default. */
    life?: number;
    action?: { label: string; onClick?: () => void };
    /** The close button's accessible name; "Dismiss" by default. */
    closeLabel?: string;
}

export declare class StemmaToastRegion extends HTMLElement {
    /** Shows a toast; the handle's `close()` removes it. */
    show(options: ToastOptions): { close(): void };
}
