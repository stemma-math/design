export declare class StemmaStepper extends HTMLElement {
    /** The value, as a number. */
    value: number;
    /** Steps the value `direction` steps (negative to go down); sends `input`,
     * and `change` unless `change` is false. Returns whether it moved. */
    step(direction?: number, change?: boolean): boolean;
}
