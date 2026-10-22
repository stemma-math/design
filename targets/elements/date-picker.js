// <stemma-date-picker>: a calendar over a native date or datetime-local input.
//
//     <stemma-date-picker placeholder="Choose a date">
//         <input class="input" type="date" name="date" min="2026-01-01" />
//     </stemma-date-picker>
//
// The native input keeps its value, constraints, form association and events.
// Choosing a date or editing the time sends input and change from it. Dates
// use local calendar fields, never a timezone conversion. The month grid starts
// on Monday: arrows move days, Home/End move within the week, PageUp/PageDown
// move months (Shift moves years), digits find a day, and month names find a
// month. Enter/Space chooses; Escape closes and returns focus. Tab moves among
// calendar controls; leaving the picker closes it. refresh() reflects script
// changes to value; attributes, native events and form reset refresh themselves.

import { glyph } from "./glyphs.js";
import { define, place, popovers, uid } from "./internal.js";

const DAY = 86400000;
const FIRST = -62135596800000; // 0001-01-01.
const LAST = 253402300799999; // 9999-12-31, including its time.
const parse = (value) => {
    if (!value) return NaN;
    return Date.parse(value.includes("T") ? `${value}Z` : `${value}T00:00:00Z`);
};
const dayOf = (value) => Math.floor(value / DAY) * DAY;
const dateValue = (value) => new Date(value).toISOString().split("T")[0];
const datetimeValue = (value) =>
    new Date(value)
        .toISOString()
        .replace(/Z$/, "")
        .replace(/:00\.000$/, "")
        .replace(/\.000$/, "");
const today = () => {
    const now = new Date();
    return parse(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    );
};
const monthOf = (value) => {
    const date = new Date(value);
    date.setUTCDate(1);
    return date.getTime();
};
function moveMonth(value, amount) {
    const date = new Date(value);
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + amount);
    const end = new Date(date);
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
    date.setUTCDate(Math.min(day, end.getUTCDate()));
    return Math.max(FIRST, Math.min(dayOf(LAST), date.getTime()));
}

export class StemmaDatePicker extends HTMLElement {
    #input;
    #button;
    #value;
    #panel;
    #heading;
    #grid;
    #previous;
    #next;
    #today;
    #clear;
    #times = [];
    #timeGroup;
    #error;
    #required;
    #focused = today();
    #month = monthOf(this.#focused);
    #typed = "";
    #typedAt = 0;
    #abort;
    #observer;
    #labels = [];
    #locale;

    connectedCallback() {
        if (!this.#input) {
            this.#input = this.querySelector('input[type="date"], input[type="datetime-local"]');
            if (!this.#input) return;
            this.#build();
        }
        this.#abort?.abort();
        this.#abort = new AbortController();
        const on = (target, type, handler, options = {}) =>
            target?.addEventListener(type, handler, { ...options, signal: this.#abort.signal });
        let wasOpen = false;
        on(this.#button, "pointerdown", () => {
            wasOpen = this.isOpen;
        });
        on(this.#button, "click", (event) => {
            const open = event.detail === 0 ? this.isOpen : wasOpen;
            wasOpen = false;
            if (open) this.close();
            else this.open();
        });
        on(this.#button, "keydown", (event) => {
            if (["ArrowDown", "ArrowUp"].includes(event.key)) {
                event.preventDefault();
                this.open();
            } else if (
                event.key.length === 1 &&
                event.key !== " " &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.altKey
            ) {
                event.preventDefault();
                this.open();
                this.#typeahead(event.key);
            }
        });
        on(this.#panel, "keydown", (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                this.close();
            } else if (event.target.closest(".date-picker__day")) this.#key(event);
        });
        on(this.#grid, "focusin", (event) => {
            const button = event.target.closest(".date-picker__day");
            if (!button) return;
            this.#focused = parse(button.dataset.date);
            for (const day of this.#grid.querySelectorAll(".date-picker__day"))
                day.tabIndex = day === button ? 0 : -1;
        });
        on(this.#grid, "click", (event) => {
            const button = event.target.closest(".date-picker__day");
            if (button) this.#choose(parse(button.dataset.date));
        });
        on(this.#previous, "click", () => this.#navigate(-1, false));
        on(this.#next, "click", () => this.#navigate(1, false));
        on(this.#today, "click", () => this.#choose(today()));
        on(this.#clear, "click", () => {
            this.#commit("");
            this.close();
        });
        for (const input of this.#times) on(input, "change", () => this.#timeChanged());
        on(this.#input, "input", () => this.refresh());
        on(this.#input, "change", () => this.refresh());
        on(this.#input, "invalid", (event) => {
            event.preventDefault();
            this.#error.textContent = this.#input.validationMessage;
            this.#button.setAttribute("aria-invalid", "true");
            this.#button.focus();
        });
        // Wait until the native reset has restored the value, including resets
        // initiated by a button. Also handles externally associated forms.
        on(document, "reset", (event) => {
            if (event.target === this.#input.form)
                setTimeout(() => {
                    if (!event.defaultPrevented && this.isConnected) {
                        this.#error.textContent = "";
                        this.refresh();
                    }
                });
        });
        on(document, "pointerdown", (event) => {
            if (this.isOpen && !this.contains(event.target)) this.close(false);
        });
        on(document, "focusin", (event) => {
            if (this.isOpen && !this.contains(event.target)) this.close(false);
        });
        const position = () => {
            if (this.isOpen) this.#place();
        };
        on(window, "resize", position);
        on(document, "scroll", position, { capture: true });
        on(this.#panel, "toggle", (event) => {
            this.#button.setAttribute("aria-expanded", String(event.newState === "open"));
        });
        this.#observer = new MutationObserver(() => this.refresh());
        this.#observer.observe(this.#input, { attributes: true });
        for (let parent = this.parentElement; parent; parent = parent.parentElement) {
            if (parent.matches("fieldset"))
                this.#observer.observe(parent, { attributes: true, attributeFilter: ["disabled"] });
        }
        this.refresh();
    }

    disconnectedCallback() {
        this.close(false);
        this.#abort?.abort();
        this.#observer?.disconnect();
    }

    #build() {
        this.#locale = this.closest("[lang]")?.lang || navigator.language;
        this.#button = document.createElement("button");
        this.#button.type = "button";
        this.#button.className = `input select ${this.#input.className}`;
        this.#button.id = this.#input.id ? `${this.#input.id}-button` : uid("stemma-date-picker");
        this.#button.setAttribute("aria-haspopup", "dialog");
        this.#button.setAttribute("aria-expanded", "false");
        this.#value = document.createElement("span");
        this.#value.className = "select__value";
        this.#button.append(this.#value);
        this.#button.insertAdjacentHTML("beforeend", glyph("chevron-down"));
        this.#labels = [...(this.#input.labels ?? [])];
        for (const label of this.#labels) {
            label.id ||= uid("stemma-date-picker-label");
            label.htmlFor = this.#button.id;
        }
        this.#panel = document.createElement("div");
        this.#panel.className = "date-picker";
        this.#panel.id = uid("stemma-calendar");
        this.#panel.setAttribute("role", "dialog");
        this.#button.setAttribute("aria-controls", this.#panel.id);
        if (popovers) this.#panel.popover = "auto";
        else this.#panel.hidden = true;
        const header = document.createElement("div");
        header.className = "date-picker__header";
        this.#previous = this.#action("Previous month", "arrow-left");
        this.#next = this.#action("Next month", "arrow-right");
        this.#heading = document.createElement("span");
        this.#heading.id = uid("stemma-calendar-month");
        this.#heading.setAttribute("aria-live", "polite");
        header.append(this.#previous, this.#heading, this.#next);
        this.#grid = document.createElement("div");
        this.#grid.setAttribute("role", "grid");
        this.#grid.setAttribute("aria-labelledby", this.#heading.id);
        this.#timeGroup = document.createElement("div");
        this.#timeGroup.className = "date-picker__time";
        for (const [index, name] of ["Hour", "Minute", "Second"].entries()) {
            const label = document.createElement("label");
            label.className = "field";
            const text = document.createElement("span");
            text.className = "field__label";
            text.textContent = name;
            const input = document.createElement("input");
            input.type = "number";
            input.className = "input";
            input.min = "0";
            input.max = index === 0 ? "23" : index === 1 ? "59" : "59.999";
            input.step = index === 2 ? "0.001" : "1";
            // These are editing controls, never additional form fields or constraints.
            input.addEventListener("input", (event) => event.stopPropagation());
            input.addEventListener("change", (event) => event.stopPropagation());
            label.append(text, input);
            this.#times.push(input);
            this.#timeGroup.append(label);
        }
        const footer = document.createElement("div");
        footer.className = "date-picker__footer";
        this.#today = this.#action("Today");
        this.#clear = this.#action("Clear");
        const done = this.#action("Done");
        done.addEventListener("click", () => this.close());
        footer.append(this.#today, this.#clear, done);
        const help = document.createElement("p");
        help.className = "date-picker__help";
        help.id = uid("stemma-calendar-help");
        help.textContent =
            "Arrow keys move days. Page Up/Down moves months; Shift moves years. Type a day or month. Escape closes.";
        this.#grid.setAttribute("aria-describedby", help.id);
        this.#panel.append(header, this.#grid, this.#timeGroup, footer, help);
        this.#error = document.createElement("span");
        this.#error.id = uid("stemma-date-picker-error");
        this.#error.className = "field__error";
        this.#error.setAttribute("aria-live", "polite");
        this.#required = document.createElement("span");
        this.#required.className = "visually-hidden";
        this.#required.id = uid("stemma-date-picker-required");
        this.#required.textContent = "Required.";
        this.append(this.#button, this.#panel, this.#error, this.#required);
        this.#input.hidden = true;
    }

    #action(label, icon) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = icon ? "button button--icon button--small" : "button button--small";
        if (icon) {
            button.setAttribute("aria-label", label);
            button.innerHTML = glyph(icon, true);
        } else button.textContent = label;
        return button;
    }

    #format(value, options) {
        return new Intl.DateTimeFormat(this.#locale, { ...options, timeZone: "UTC" }).format(value);
    }

    get #datetime() {
        return this.#input.type === "datetime-local";
    }
    get #locked() {
        return this.#input.matches(":disabled") || this.#input.readOnly;
    }

    /** The native input's ISO date or local datetime value; setting it sends no events. */
    get value() {
        return this.#input?.value ?? "";
    }
    set value(value) {
        if (this.#input) {
            this.#input.value = value;
            this.refresh();
        }
    }

    /** Whether the calendar is open. */
    get isOpen() {
        return Boolean(
            this.#panel && (popovers ? this.#panel.matches(":popover-open") : !this.#panel.hidden),
        );
    }

    #limits() {
        // Let the native input reject malformed constraints for its own type.
        const probe = document.createElement("input");
        probe.type = this.#input.type;
        probe.value = this.#input.min;
        const min = parse(probe.value);
        probe.value = this.#input.max;
        const max = parse(probe.value);
        const step =
            this.#input.step === "any"
                ? 1
                : (Number(this.#input.step) > 0
                      ? Number(this.#input.step)
                      : this.#datetime
                        ? 60
                        : 1) * (this.#datetime ? 1000 : DAY);
        return {
            min: Number.isFinite(min) ? min : FIRST,
            max: Number.isFinite(max) ? max : LAST,
            base: Number.isFinite(min) ? min : parse(this.#input.defaultValue) || 0,
            step,
        };
    }

    // The first/last permitted step in this day, including partial boundary days.
    #range(day) {
        const { min, max, base, step } = this.#limits();
        const low = Math.max(day, min);
        const high = Math.min(day + (this.#datetime ? DAY - 1 : 0), max);
        return {
            first: base + Math.ceil((low - base) / step) * step,
            last: base + Math.floor((high - base) / step) * step,
            base,
            step,
        };
    }

    #candidate(day, time = parse(this.value)) {
        const { first, last, base, step } = this.#range(day);
        if (first > last) return NaN;
        const offset = this.#datetime && Number.isFinite(time) ? time - dayOf(time) : 0;
        return Math.max(
            first,
            Math.min(last, base + Math.round((day + offset - base) / step) * step),
        );
    }

    /** Reflects value, constraints, disabled/readonly state and accessible labels. */
    refresh() {
        if (!this.#button) return;
        const selected = parse(this.value);
        this.#focused = Number.isFinite(selected)
            ? dayOf(selected)
            : dayOf(Math.max(this.#limits().min, Math.min(this.#limits().max, today())));
        this.#month = monthOf(this.#focused);
        this.#button.disabled = this.#input.disabled || this.#input.readOnly;
        const label = this.#input.getAttribute("aria-label");
        const labelledby =
            this.#input.getAttribute("aria-labelledby") ||
            this.#labels.map((item) => item.id).join(" ");
        this.#button.removeAttribute("aria-labelledby");
        this.#button.removeAttribute("aria-label");
        if (labelledby)
            this.#button.setAttribute("aria-labelledby", `${labelledby} ${this.#button.id}`);
        else
            this.#button.setAttribute(
                "aria-label",
                `${label || "Choose date"}${this.value ? `: ${this.value}` : ""}`,
            );
        this.#panel.setAttribute(
            "aria-label",
            `${label || this.#labels.map((item) => item.textContent.trim()).join(" ") || "Date"} calendar`,
        );
        this.#button.setAttribute(
            "aria-describedby",
            [
                this.#input.getAttribute("aria-describedby"),
                this.#error.id,
                this.#input.required ? this.#required.id : "",
            ]
                .filter(Boolean)
                .join(" "),
        );
        if (this.#input.validity.valid) this.#error.textContent = "";
        this.#button.setAttribute(
            "aria-invalid",
            this.#input.getAttribute("aria-invalid") || String(Boolean(this.#error.textContent)),
        );
        const seconds =
            this.#datetime &&
            (this.#input.step === "any" ||
                this.#limits().step % 60000 !== 0 ||
                (this.value.split("T")[1] || "").split(":").length > 2);
        this.#value.textContent = Number.isFinite(selected)
            ? this.#format(selected, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  ...(this.#datetime
                      ? {
                            hour: "2-digit",
                            minute: "2-digit",
                            ...(seconds ? { second: "2-digit" } : {}),
                        }
                      : {}),
              })
            : this.getAttribute("placeholder") || "Choose a date";
        this.#timeGroup.hidden = !this.#datetime;
        this.#times[2].parentElement.hidden = !seconds;
        const candidate = Number.isFinite(selected) ? selected : this.#candidate(this.#focused);
        const time = new Date(Number.isFinite(candidate) ? candidate : 0);
        for (const [index, input] of this.#times.entries()) {
            input.value = String(
                [
                    time.getUTCHours(),
                    time.getUTCMinutes(),
                    time.getUTCSeconds() + time.getUTCMilliseconds() / 1000,
                ][index],
            );
            input.disabled = !this.#datetime || (index === 2 && !seconds) || this.#locked;
        }
        if (this.#locked && this.isOpen) this.close(false);
        this.#draw();
    }

    #draw() {
        const focused = this.#grid.contains(document.activeElement);
        const selected = dayOf(parse(this.value));
        this.#heading.textContent = this.#format(this.#month, { month: "long", year: "numeric" });
        const { min, max } = this.#limits();
        this.#previous.disabled = this.#month <= monthOf(min);
        this.#next.disabled = this.#month >= monthOf(max);
        this.#today.disabled = !Number.isFinite(this.#candidate(today()));
        this.#clear.disabled = !this.value || this.#locked;
        this.#grid.replaceChildren();
        const header = document.createElement("div");
        header.className = "date-picker__week";
        header.setAttribute("role", "row");
        for (let index = 0; index < 7; index++) {
            const cell = document.createElement("span");
            cell.setAttribute("role", "columnheader");
            cell.setAttribute(
                "aria-label",
                this.#format(parse("2024-01-01") + index * DAY, { weekday: "long" }),
            );
            cell.textContent = this.#format(parse("2024-01-01") + index * DAY, {
                weekday: "narrow",
            });
            header.append(cell);
        }
        this.#grid.append(header);
        const offset = (new Date(this.#month).getUTCDay() + 6) % 7;
        const start = this.#month - offset * DAY;
        for (let week = 0; week < 6; week++) {
            const row = document.createElement("div");
            row.className = "date-picker__week";
            row.setAttribute("role", "row");
            for (let index = 0; index < 7; index++) {
                const day = start + (week * 7 + index) * DAY;
                const cell = document.createElement("div");
                cell.setAttribute("role", "gridcell");
                cell.setAttribute("aria-selected", String(day === selected));
                const button = document.createElement("button");
                button.type = "button";
                button.className = "date-picker__day";
                button.dataset.date = dateValue(day);
                button.dataset.outside = String(monthOf(day) !== this.#month);
                button.textContent = String(new Date(day).getUTCDate());
                button.setAttribute(
                    "aria-label",
                    this.#format(day, {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    }),
                );
                button.setAttribute(
                    "aria-disabled",
                    String(day < FIRST || day > LAST || !Number.isFinite(this.#candidate(day))),
                );
                if (day === today()) button.setAttribute("aria-current", "date");
                button.tabIndex = day === this.#focused ? 0 : -1;
                cell.append(button);
                row.append(cell);
            }
            this.#grid.append(row);
        }
        if (focused) this.#focus();
        if (this.isOpen) this.#place();
    }

    #place() {
        place(this.#panel, this.#button, "below", 4);
        const rect = this.#panel.getBoundingClientRect();
        this.#panel.style.top = `${Math.max(8, Math.min(rect.top, innerHeight - rect.height - 8))}px`;
    }

    #focus() {
        this.#grid.querySelector(`[data-date="${dateValue(this.#focused)}"]`)?.focus();
    }
    #focusDay(day) {
        this.#focused = Math.max(FIRST, Math.min(dayOf(LAST), day));
        this.#month = monthOf(this.#focused);
        this.#draw();
        this.#focus();
    }
    #navigate(amount, focus = true) {
        const next = moveMonth(this.#focused, amount);
        if (focus) this.#focusDay(next);
        else {
            this.#focused = next;
            this.#month = monthOf(next);
            this.#draw();
        }
    }

    /** Opens at the selected date, or today constrained to the available range. */
    open() {
        if (!this.#input || this.#locked) return;
        this.refresh();
        this.#typed = "";
        this.#typedAt = 0;
        if (!this.isOpen) {
            if (popovers) this.#panel.showPopover();
            else this.#panel.hidden = false;
        }
        this.#button.setAttribute("aria-expanded", "true");
        this.#place();
        this.#focus();
    }

    /** Closes, returning focus to the trigger unless refocus is false. */
    close(refocus = true) {
        if (!this.#panel) return;
        if (popovers) {
            if (this.isOpen) this.#panel.hidePopover();
        } else this.#panel.hidden = true;
        this.#button.setAttribute("aria-expanded", "false");
        if (refocus) this.#button.focus();
    }

    #commit(value) {
        if (this.#locked || this.value === value) return;
        this.#input.value = value;
        this.refresh();
        this.#input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        this.#input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    #choose(day) {
        const value = this.#candidate(day);
        if (!Number.isFinite(value) || this.#locked) return;
        this.#commit(this.#datetime ? datetimeValue(value) : dateValue(value));
        if (this.#datetime) this.#times[0].focus();
        else this.close();
    }
    #timeChanged() {
        if (this.#times.some((input) => !input.disabled && (!input.value || !input.validity.valid)))
            return;
        const [hour, minute, second] = this.#times.map((input) => Number(input.value));
        const day = dayOf(parse(this.value) || this.#focused);
        const value = this.#candidate(day, day + (hour * 3600 + minute * 60 + second) * 1000);
        if (Number.isFinite(value)) this.#commit(datetimeValue(value));
    }
    #key(event) {
        const day = parse(event.target.dataset.date);
        const weekday = (new Date(day).getUTCDay() + 6) % 7;
        const delta = {
            ArrowLeft: -1,
            ArrowRight: 1,
            ArrowUp: -7,
            ArrowDown: 7,
            Home: -weekday,
            End: 6 - weekday,
        }[event.key];
        if (delta !== undefined) {
            event.preventDefault();
            this.#focusDay(day + delta * DAY);
        } else if (["PageUp", "PageDown"].includes(event.key)) {
            event.preventDefault();
            this.#navigate((event.key === "PageUp" ? -1 : 1) * (event.shiftKey ? 12 : 1));
        } else if (
            event.key.length === 1 &&
            event.key !== " " &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
        ) {
            event.preventDefault();
            this.#typeahead(event.key);
        }
    }
    #typeahead(key) {
        const now = performance.now();
        this.#typed = now - this.#typedAt > 700 ? key : this.#typed + key;
        this.#typedAt = now;
        if (/^\d+$/.test(this.#typed)) {
            const date = Number(this.#typed);
            const day = this.#month + (date - 1) * DAY;
            if (date >= 1 && monthOf(day) === this.#month && Number.isFinite(this.#candidate(day)))
                this.#focusDay(day);
        } else {
            const start = this.#typed.length === 1 ? 1 : 0;
            for (let index = start; index < start + 12; index++) {
                const day = moveMonth(this.#focused, index);
                if (
                    this.#format(day, { month: "long" })
                        .toLocaleLowerCase()
                        .startsWith(this.#typed.toLocaleLowerCase())
                ) {
                    this.#focusDay(day);
                    break;
                }
            }
        }
    }
}

define("stemma-date-picker", StemmaDatePicker);
