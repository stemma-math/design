export declare class StemmaLight extends HTMLElement {
    /** How far the light has withdrawn towards its edge, from 0 to 1. */
    progress: number;
    /** Withdraws the light over `--dur-long`; resolves when it is gone. */
    withdraw(): Promise<void>;
    /** Brings the light back; resolves when it is whole. */
    restore(): Promise<void>;
}
