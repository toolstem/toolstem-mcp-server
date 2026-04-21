/**
 * Formatting utilities for Toolstem MCP server.
 * All helpers are pure functions and safe to use with null/undefined by guarding at call sites.
 */

/**
 * Format a large dollar value into a human-readable string with magnitude suffix.
 * Examples: 2_780_000_000_000 -> "$2.78T", 450_200_000_000 -> "$450.2B", 12_500_000 -> "$12.5M".
 */
export function formatMarketCap(value: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  if (abs >= 1e12) {
    return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  }
  if (abs >= 1e9) {
    return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  }
  if (abs >= 1e6) {
    return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  }
  if (abs >= 1e3) {
    return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  }
  return `${sign}$${abs.toFixed(2)}`;
}

/**
 * Format a large number without currency prefix.
 */
export function formatLargeNumber(value: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  if (abs >= 1e12) {
    return `${sign}${(abs / 1e12).toFixed(2)}T`;
  }
  if (abs >= 1e9) {
    return `${sign}${(abs / 1e9).toFixed(1)}B`;
  }
  if (abs >= 1e6) {
    return `${sign}${(abs / 1e6).toFixed(1)}M`;
  }
  if (abs >= 1e3) {
    return `${sign}${(abs / 1e3).toFixed(1)}K`;
  }
  return `${sign}${abs.toFixed(2)}`;
}

/**
 * Compound Annual Growth Rate (CAGR) from start to end value over `years` years.
 * Returns a percentage number, e.g. 8.2 for 8.2%.
 * Returns 0 when inputs are invalid or start is non-positive.
 */
export function calcCAGR(start: number, end: number, years: number): number {
  if (
    start === null ||
    end === null ||
    start === undefined ||
    end === undefined ||
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    years <= 0 ||
    start <= 0
  ) {
    return 0;
  }
  const ratio = end / start;
  if (ratio <= 0) return 0;
  const cagr = Math.pow(ratio, 1 / years) - 1;
  return round1(cagr * 100);
}

/**
 * Percentage change between previous and current values. Returns number (e.g. 7.8 for 7.8%).
 */
export function calcPercentChange(current: number, previous: number): number {
  if (
    current === null ||
    previous === null ||
    current === undefined ||
    previous === undefined ||
    Number.isNaN(current) ||
    Number.isNaN(previous) ||
    previous === 0
  ) {
    return 0;
  }
  return round2(((current - previous) / Math.abs(previous)) * 100);
}

/**
 * Derive a trend signal from a series of values ordered oldest -> newest.
 * Returns "EXPANDING", "STABLE", or "CONTRACTING".
 * EXPANDING: net change >= +2%
 * CONTRACTING: net change <= -2%
 * STABLE: within +/- 2%
 */
export function deriveTrendSignal(values: number[]): 'EXPANDING' | 'STABLE' | 'CONTRACTING' {
  const clean = (values || []).filter(
    (v) => v !== null && v !== undefined && !Number.isNaN(v),
  );
  if (clean.length < 2) return 'STABLE';

  const first = clean[0];
  const last = clean[clean.length - 1];

  if (first === 0) {
    if (last > 0) return 'EXPANDING';
    if (last < 0) return 'CONTRACTING';
    return 'STABLE';
  }

  const pctChange = ((last - first) / Math.abs(first)) * 100;
  if (pctChange >= 2) return 'EXPANDING';
  if (pctChange <= -2) return 'CONTRACTING';
  return 'STABLE';
}

/** Round to 1 decimal place. */
export function round1(value: number): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  return Math.round(value * 10) / 10;
}

/** Round to 2 decimal places. */
export function round2(value: number): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  return Math.round(value * 100) / 100;
}

/**
 * Safely coerce unknown API field into a number, returning null if invalid.
 * Handles empty strings, whitespace-only strings, and booleans safely.
 */
export function safeNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  return null;
}

