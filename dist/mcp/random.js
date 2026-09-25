"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Xorshift32 = void 0;
exports.normalizeSeed = normalizeSeed;
/**
 * The xorshift32 PRNG from the differential-fuzz contract (V1), reused for
 * the built-in random bot so bot games are reproducible from a seed.
 *
 * The all-zero state is a fixed point of xorshift32; callers must not seed
 * with 0 (see {@link normalizeSeed}).
 */
class Xorshift32 {
    constructor(seed) {
        this.state = seed >>> 0;
    }
    /** Advance the generator and return the new state as a u32. */
    next() {
        let s = this.state;
        s ^= (s << 13) >>> 0;
        s >>>= 0;
        s ^= s >>> 17;
        s ^= (s << 5) >>> 0;
        s >>>= 0;
        this.state = s;
        return s;
    }
}
exports.Xorshift32 = Xorshift32;
/**
 * Clamp an arbitrary caller-supplied seed into the PRNG's valid domain:
 * coerce to u32 and remap the degenerate 0 (the same remap value the fuzz
 * contract uses for its per-game seeds).
 */
function normalizeSeed(seed) {
    const s = seed >>> 0;
    return s === 0 ? 0x9E3779B9 : s;
}
