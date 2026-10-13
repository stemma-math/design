import type { StemmaCopyButton } from "./copy-button.js";
import type { StemmaDialog } from "./dialog.js";
import type { StemmaFilterChips } from "./filter-chips.js";
import type { StemmaLight } from "./light.js";
import type { StemmaMark } from "./mark.js";
import type { StemmaMenu } from "./menu.js";
import type { StemmaRange } from "./range.js";
import type { StemmaSegmented } from "./segmented.js";
import type { StemmaSelect } from "./select.js";
import type { StemmaStepper } from "./stepper.js";
import type { StemmaTabs } from "./tabs.js";
import type { StemmaThemeSwitch } from "./theme-switch.js";
import type { StemmaToastRegion } from "./toast-region.js";
import type { StemmaTooltip } from "./tooltip.js";

export { StemmaCopyButton } from "./copy-button.js";
export { StemmaDialog } from "./dialog.js";
export { StemmaFilterChips } from "./filter-chips.js";
export { StemmaLight } from "./light.js";
export { StemmaMark } from "./mark.js";
export { StemmaMenu } from "./menu.js";
export type { StemmaMenuSelect } from "./menu.js";
export { StemmaRange } from "./range.js";
export { StemmaSegmented } from "./segmented.js";
export { StemmaSelect } from "./select.js";
export { StemmaStepper } from "./stepper.js";
export { StemmaTabs } from "./tabs.js";
export { StemmaThemeSwitch, applyStoredTheme, applyTheme, storedTheme } from "./theme-switch.js";
export type { Theme } from "./theme-switch.js";
export { StemmaToastRegion } from "./toast-region.js";
export type { Intent, ToastOptions } from "./toast-region.js";
export { StemmaTooltip } from "./tooltip.js";

declare global {
    interface HTMLElementTagNameMap {
        "stemma-copy-button": StemmaCopyButton;
        "stemma-dialog": StemmaDialog;
        "stemma-filter-chips": StemmaFilterChips;
        "stemma-light": StemmaLight;
        "stemma-mark": StemmaMark;
        "stemma-menu": StemmaMenu;
        "stemma-range": StemmaRange;
        "stemma-segmented": StemmaSegmented;
        "stemma-select": StemmaSelect;
        "stemma-stepper": StemmaStepper;
        "stemma-tabs": StemmaTabs;
        "stemma-theme-switch": StemmaThemeSwitch;
        "stemma-toast-region": StemmaToastRegion;
        "stemma-tooltip": StemmaTooltip;
    }
}
