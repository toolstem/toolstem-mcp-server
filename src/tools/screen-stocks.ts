/**
 * Tool: screen_stocks
 * Screen/filter stocks by fundamental criteria (sector, market cap, price,
 * beta, volume, dividend, exchange, country). Returns a curated list with
 * derived category signals that agents can immediately act on.
 */

import { FmpClient } from '../services/fmp.js';
import { UNIVERSE_METADATA, UNIVERSE_SECTORS } from '../data/universe.js';
import { formatMarketCap, round2, safeNumber } from '../utils/formatting.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScreenStocksInput {
  sector?: string;
  industry?: string;
  exchange?: string;
  country?: string;
  market_cap_min?: number;
  market_cap_max?: number;
  price_min?: number;
  price_max?: number;
  beta_min?: number;
  beta_max?: number;
  volume_min?: number;
  dividend_min?: number;
  is_etf?: boolean;
  is_fund?: boolean;
  is_actively_trading?: boolean;
  limit?: number;
}

export type CapCategory = 'MEGA' | 'LARGE' | 'MID' | 'SMALL' | 'MICRO' | 'NANO';
export type VolatilityCategory = 'LOW' | 'MODERATE' | 'HIGH';
export type LiquidityCategory = 'HIGH' | 'MODERATE' | 'LOW';

export interface ScreenedStock {
  symbol: string;
  company_name: string | null;
  sector: string | null;
  industry: string | null;
  exchange: string | null;
  country: string | null;
  price: number | null;
  market_cap: number | null;
  market_cap_readable: string | null;
  beta: number | null;
  volume: number | null;
  last_annual_dividend: number | null;
  cap_category: CapCategory | null;
  volatility_category: VolatilityCategory | null;
  liquidity_category: LiquidityCategory | null;
}

export interface ScreenStocksResult {
  query_summary: string;
  total_results: number;
  stocks: ScreenedStock[];
  meta: {
    source: string;
    timestamp: string;
    data_delay: string;
    filters_applied: string[];
    universe: {
      name: string;
      description: string;
      size: number;
      country: string;
    };
    unsupported_filters?: string[];
    notes?: string[];
  };
}

// ---------------------------------------------------------------------------
// Derived signal helpers
// ---------------------------------------------------------------------------

function deriveCapCategory(marketCap: number | null): CapCategory | null {
  if (marketCap === null) return null;
  if (marketCap >= 200_000_000_000) return 'MEGA';
  if (marketCap >= 10_000_000_000) return 'LARGE';
  if (marketCap >= 2_000_000_000) return 'MID';
  if (marketCap >= 300_000_000) return 'SMALL';
  if (marketCap >= 50_000_000) return 'MICRO';
  return 'NANO';
}

function deriveVolatilityCategory(beta: number | null): VolatilityCategory | null {
  if (beta === null) return null;
  if (beta < 0.8) return 'LOW';
  if (beta > 1.3) return 'HIGH';
  return 'MODERATE';
}

function deriveLiquidityCategory(volume: number | null): LiquidityCategory | null {
  if (volume === null) return null;
  if (volume > 1_000_000) return 'HIGH';
  if (volume >= 100_000) return 'MODERATE';
  return 'LOW';
}

function buildQuerySummary(input: ScreenStocksInput, count: number): string {
  const parts: string[] = [];
  if (input.sector) parts.push(`sector=${input.sector}`);
  if (input.industry) parts.push(`industry="${input.industry}"`);
  if (input.exchange) parts.push(`exchange=${input.exchange}`);
  if (input.country) parts.push(`country=${input.country}`);
  if (input.market_cap_min !== undefined) parts.push(`mktCap≥${formatMarketCap(input.market_cap_min)}`);
  if (input.market_cap_max !== undefined) parts.push(`mktCap≤${formatMarketCap(input.market_cap_max)}`);
  if (input.price_min !== undefined) parts.push(`price≥$${input.price_min}`);
  if (input.price_max !== undefined) parts.push(`price≤$${input.price_max}`);
  if (input.beta_min !== undefined) parts.push(`beta≥${input.beta_min}`);
  if (input.beta_max !== undefined) parts.push(`beta≤${input.beta_max}`);
  if (input.volume_min !== undefined) parts.push(`volume≥${input.volume_min.toLocaleString()}`);
  if (input.dividend_min !== undefined) parts.push(`dividend≥${input.dividend_min}`);
  if (input.is_etf === true) parts.push('ETFs only');
  if (input.is_fund === true) parts.push('funds only');

  const filtersStr = parts.length > 0 ? parts.join(', ') : 'no filters';
  return `${count} stock${count !== 1 ? 's' : ''} matching: ${filtersStr}`;
}

function buildFiltersApplied(input: ScreenStocksInput): string[] {
  const filters: string[] = [];
  if (input.sector) filters.push(`sector: ${input.sector}`);
  if (input.industry) filters.push(`industry: ${input.industry}`);
  if (input.exchange) filters.push(`exchange: ${input.exchange}`);
  if (input.country) filters.push(`country: ${input.country}`);
  if (input.market_cap_min !== undefined) filters.push(`market_cap_min: ${input.market_cap_min}`);
  if (input.market_cap_max !== undefined) filters.push(`market_cap_max: ${input.market_cap_max}`);
  if (input.price_min !== undefined) filters.push(`price_min: ${input.price_min}`);
  if (input.price_max !== undefined) filters.push(`price_max: ${input.price_max}`);
  if (input.beta_min !== undefined) filters.push(`beta_min: ${input.beta_min}`);
  if (input.beta_max !== undefined) filters.push(`beta_max: ${input.beta_max}`);
  if (input.volume_min !== undefined) filters.push(`volume_min: ${input.volume_min}`);
  if (input.dividend_min !== undefined) filters.push(`dividend_min: ${input.dividend_min}`);
  if (input.is_etf !== undefined) filters.push(`is_etf: ${input.is_etf}`);
  if (input.is_fund !== undefined) filters.push(`is_fund: ${input.is_fund}`);
  if (input.is_actively_trading !== undefined) filters.push(`is_actively_trading: ${input.is_actively_trading}`);
  if (input.limit !== undefined) filters.push(`limit: ${input.limit}`);
  return filters;
}

// ---------------------------------------------------------------------------
// Main tool function
// ---------------------------------------------------------------------------

export async function screenStocks(
  input: ScreenStocksInput,
  client?: FmpClient,
): Promise<ScreenStocksResult & { meta: { diagnostics?: unknown } }> {
  const fmp = client ?? new FmpClient();

  // Clamp limit: default 50, max 200
  const requestLimit = Math.min(input.limit ?? 50, 200);

  // Track filters that the synthetic screener cannot honor — caller must know.
  const unsupported: string[] = [];
  if (input.industry !== undefined) unsupported.push('industry');
  if (input.beta_min !== undefined) unsupported.push('beta_min');
  if (input.beta_max !== undefined) unsupported.push('beta_max');
  if (input.dividend_min !== undefined) unsupported.push('dividend_min');
  if (input.exchange !== undefined) unsupported.push('exchange');
  if (input.country !== undefined && input.country.toUpperCase() !== 'US') unsupported.push('country');

  const raw = await fmp.screenStocks({
    sector: input.sector,
    industry: input.industry,
    exchange: input.exchange,
    country: input.country,
    marketCapMoreThan: input.market_cap_min,
    marketCapLowerThan: input.market_cap_max,
    priceMoreThan: input.price_min,
    priceLowerThan: input.price_max,
    betaMoreThan: input.beta_min,
    betaLowerThan: input.beta_max,
    volumeMoreThan: input.volume_min,
    dividendMoreThan: input.dividend_min,
    isEtf: input.is_etf,
    isFund: input.is_fund,
    isActivelyTrading: input.is_actively_trading,
    limit: requestLimit,
  });

  const stocks: ScreenedStock[] = raw.map((item) => {
    const marketCap = safeNumber(item.marketCap);
    const beta = safeNumber(item.beta);
    const volume = safeNumber(item.volume);
    const price = safeNumber(item.price);

    return {
      symbol: item.symbol,
      company_name: item.companyName ?? null,
      sector: item.sector ?? null,
      industry: item.industry ?? null,
      exchange: item.exchangeShortName ?? item.exchange ?? null,
      country: item.country ?? null,
      price: price !== null ? round2(price) : null,
      market_cap: marketCap,
      market_cap_readable: marketCap !== null ? formatMarketCap(marketCap) : null,
      beta: beta !== null ? round2(beta) : null,
      volume,
      last_annual_dividend: safeNumber(item.lastAnnualDividend),
      cap_category: deriveCapCategory(marketCap),
      volatility_category: deriveVolatilityCategory(beta),
      liquidity_category: deriveLiquidityCategory(volume),
    };
  });

  const notes: string[] = [
    `Screening universe: ${UNIVERSE_METADATA.description}.`,
    `Supported filters: sector (one of ${UNIVERSE_SECTORS.join(', ')}), market_cap_min/max, price_min/max, volume_min, limit. Results sorted by market cap descending.`,
  ];
  if (unsupported.length > 0) {
    notes.push(
      `Filter${unsupported.length > 1 ? 's' : ''} not supported by the free-tier synthetic screener and ignored: ${unsupported.join(', ')}. Upgrade to FMP Starter+ for full filter coverage.`,
    );
  }

  return {
    query_summary: buildQuerySummary(input, stocks.length),
    total_results: stocks.length,
    stocks,
    meta: {
      source: 'Toolstem via Financial Modeling Prep',
      timestamp: new Date().toISOString(),
      data_delay: 'Real-time during market hours',
      filters_applied: buildFiltersApplied(input),
      universe: {
        name: UNIVERSE_METADATA.name,
        description: UNIVERSE_METADATA.description,
        size: UNIVERSE_METADATA.size,
        country: UNIVERSE_METADATA.country,
      },
      unsupported_filters: unsupported.length > 0 ? unsupported : undefined,
      notes,
      // v1.2.1 diagnostics — remove in v1.2.2 once issue resolved
      diagnostics: {
        chunks: fmp._lastScreenDiag,
        last_http_status: fmp._lastHttpStatus,
        last_http_body: fmp._lastHttpBody,
      },
    },
  };
}
