export type Theme = "system" | "light" | "dark";

export declare class StemmaThemeSwitch extends HTMLElement {
    /** The choice. Setting it applies it without storing it. */
    value: Theme;
    /** Fill the container with equal-width options. Reflects `fill`. */
    fill: boolean;
}

/** The stored choice. */
export declare function storedTheme(key?: string): Theme;
/** Applies a choice to the root element's `data-theme`. */
export declare function applyTheme(theme: Theme): void;
/** Applies the stored choice; call it before the page paints. */
export declare function applyStoredTheme(key?: string): void;
