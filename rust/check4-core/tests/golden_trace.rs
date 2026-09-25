//! Regenerates the differential-fuzz contract trace for baseSeed=42,
//! games=3, plyCap=60 in-process and compares it line-by-line against the
//! golden fixture produced by the normative TypeScript engine.

use check4_core::fuzz::run_trace;

const GOLDEN: &str = include_str!("fixtures/golden_seed42.txt");

#[test]
fn regenerates_seed42_golden_trace() {
    let ours = run_trace(42, 3, 60);

    for (i, (got, want)) in ours.lines().zip(GOLDEN.lines()).enumerate() {
        assert_eq!(got, want, "trace diverges at line {}", i + 1);
    }

    assert_eq!(
        ours.lines().count(),
        GOLDEN.lines().count(),
        "trace line counts differ"
    );

    // Belt and braces: the whole trace must match byte for byte,
    // trailing newline included.
    assert_eq!(ours, GOLDEN, "trace is not byte-for-byte identical");
}
