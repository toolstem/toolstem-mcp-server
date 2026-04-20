/**
 * Formatting utilities for Toolstem MCP server.
 * All helpers are pure functions and safe to use with null/undefined by guarding at call sites.
 */
/**
 * Format a large dollar value into a human-readable string with magnitude suffix.
 * Examples: 2_780_000_000_000 -> "$2.78T", 450_200_000_000 -> "$450.2B", 12_500_000 -> "$12.5M".
 */
export declare function formatMarketCap(value: number): string;
/**
 * Format a large number without currency prefix.
 */
export declare function formatLargeNumber(value: number): string;
/**
 * Compound Annual Growth Rate (CAGR) from start to end value over `years` years.
 * Returns a percentage number, e.g. 8.2 for 8.2%.
 * Returns 0 when inputs are invalid or start is non-positive.
 */
export declare function calcCAGR(start: number, end: number, years: number): number;
/**
 * Percentage change between previous and current values. Returns number (e.g. 7.8 for 7.8%).
 */
export declare function calcPercentChange(current: number, previous: number): number;
/**
 * Derive a trend signal from a series of values ordered oldest -> newest.
 * Returns "EXPANDING", "STABLE", or "CONTRACTING".
 * EXPANDING: net change >= +2%
 * CONTRACTING: net change <= -2%
 * STABLE: within +/- 2%
 */
export declare function deriveTrendSignal(values: number[]): 'EXPANDING' | 'STABLE' | 'CONTRACTING';
/** Round to 1 decimal place. */
export declare function round1(value: number): number;
/** Round to 2 decimal places. */
export declare function round2(value: number): number;
/**
 * Safely coerce unknown API field into a number, returning null if invalid.
 * Handles empty strings, whitespace-only strings, and booleans safely.
 */
export declare function safeNumber(value: unknown): number | null;
//# sourceMappingURL=formatting.d.ts.map