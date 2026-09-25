/**
 * The xorshift32 PRNG from the differential-fuzz contract (V1), reused for
 * the built-in random bot so bot games are reproducible from a seed.
 *
 * The all-zero state is a fixed point of xorshift32; callers must not seed
 * with 0 (see {@link normalizeSeed}).
 */
export declare class Xorshift32 {
    private state;
    constructor(seed: number);
    /** Advance the generator and return the new state as a u32. */
    next(): number;
}
/**
 * Clamp an arbitrary caller-supplied seed into the PRNG's valid domain:
 * coerce to u32 and remap the degenerate 0 (the same remap value the fuzz
 * contract uses for its per-game seeds).
 */
export declare function normalizeSeed(seed: number): number;
