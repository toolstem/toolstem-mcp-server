/**
 * Tool: compare_companies
 * Side-by-side comparison of 2-5 companies across price, valuation,
 * profitability, financial health, growth, and dividends.
 * Uses batch quote for efficiency; per-symbol calls run in parallel.
 */

import { FmpClient, type FmpQuote } from '../services/fmp.js';
import { withBatchFallback } from '../services/fallback.js';
import { formatMarketCap, round1, round2, safeNumber } from '../utils/formatting.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompanyComparison {
  symbol: string;
  company_name: string | null;
  sector: string | null;
  industry: string | null;

  price: {
    current: number | null;
    change_percent: number | null;
    year_high: number | null;
    year_low: number | null;
    distance_from_52w_high_percent: number | null;
  };

  valuation: {
    market_cap: number | null;
    market_cap_readable: string | null;
    pe_ratio: number | null;
    pb_ratio: number | null;
    ps_ratio: number | null;
    ev_to_ebitda: number | null;
    dcf_value: number | null;
    dcf_upside_percent: number | null;
  };

  profitability: {
    gross_margin: number | null;
    operating_margin: number | null;
    net_margin: number | null;
    roe: number | null;
    roa: number | null;
    roic: number | null;
  };

  financial_health: {
    debt_to_equity: number | null;
    current_ratio: number | null;
    interest_coverage: number | null;
  };

  growth: {
    revenue_growth_yoy: number | null;
    earnings_growth_yoy: number | null;
  };

  dividend: {
    dividend_yield: number | null;
    payout_ratio: number | null;
  };

  rating: {
    score: number | null;
    recommendation: string | null;
  } | null;
}

export interface CompareCompaniesResult {
  symbols_compared: string[];
  comparison_date: string;
  companies: CompanyComparison[];
  rankings: {
    lowest_pe: string | null;
    highest_margin: string | null;
    strongest_balance_sheet: string | null;
    best_growth: string | null;
    most_undervalued: string | null;
    highest_rated: string | null;
  };
  meta: {
    source: string;
    timestamp: string;
    data_delay: string;
    api_calls_made: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert FMP decimal ratio to percentage (same logic as get_company_metrics).
 */
function toPct(ratio: number | null | undefined): number | null {
  if (ratio === null || ratio === undefined) return null;
  const n = safeNumber(ratio);
  if (n === null) return null;
  return round1(n * 100);
}

/**
 * Fetch all per-symbol data in parallel for a single company.
 * Returns a structured comparison object.
 */
async function fetchCompanyData(
  symbol: string,
  quote: FmpQuote | undefined,
  fmp: FmpClient,
): Promise<{ comparison: CompanyComparison; apiCalls: number }> {
  let apiCalls = 0;

  // Fire all per-symbol requests in parallel
  const [profile, dcf, rating, keyMetrics, ratios, income] = await Promise.all([
    fmp.getProfile(symbol).catch(() => null),
    fmp.getDCF(symbol).catch(() => null),
    fmp.getRating(symbol).catch(() => null),
    fmp.getKeyMetrics(symbol, 'annual').catch(() => null),
    fmp.getFinancialRatios(symbol, 'annual').catch(() => null),
    fmp.getIncomeStatement(symbol, 'annual').catch(() => null),
  ]);
  apiCalls += 6;

  // Price section (prefer batch quote, fall back to profile)
  const current = safeNumber(quote?.price) ?? safeNumber(profile?.price);
  const changePercent = safeNumber(quote?.changesPercentage);
  const yearHigh = safeNumber(quote?.yearHigh);
  const yearLow = safeNumber(quote?.yearLow);

  let distFromHigh: number | null = null;
  if (current !== null && yearHigh !== null && yearHigh > 0) {
    distFromHigh = round2(((current - yearHigh) / yearHigh) * 100);
  }

  // Valuation section
  const marketCap =
    safeNumber(quote?.marketCap) ?? safeNumber(profile?.marketCap) ?? safeNumber(profile?.mktCap);
  const peRatio = safeNumber(quote?.pe);
  const dcfValue = safeNumber(dcf?.dcf) ?? safeNumber(profile?.dcf);

  let dcfUpside: number | null = null;
  if (dcfValue !== null && current !== null && current > 0) {
    dcfUpside = round2(((dcfValue - current) / current) * 100);
  }

  // Key metrics (latest only)
  const latestKm = keyMetrics?.[0] ?? null;
  const latestRt = ratios?.[0] ?? null;

  const pbRatio = safeNumber(latestKm?.pbRatio) ?? safeNumber(latestRt?.priceToBookRatio);
  const psRatio = safeNumber(latestKm?.priceToSalesRatio) ?? safeNumber(latestRt?.priceToSalesRatio);
  const evToEbitda =
    safeNumber(latestKm?.enterpriseValueOverEBITDA) ??
    safeNumber(latestRt?.enterpriseValueMultiple);

  // Profitability
  const grossMargin = toPct(latestRt?.grossProfitMargin);
  const operatingMargin = toPct(latestRt?.operatingProfitMargin);
  const netMargin = toPct(latestRt?.netProfitMargin);
  const roe = toPct(latestRt?.returnOnEquity ?? latestKm?.roe);
  const roa = toPct(latestRt?.returnOnAssets);
  const roic = toPct(latestKm?.roic);

  // Financial health
  const debtToEquity =
    safeNumber(latestRt?.debtEquityRatio) ?? safeNumber(latestKm?.debtToEquity);
  const currentRatio =
    safeNumber(latestRt?.currentRatio) ?? safeNumber(latestKm?.currentRatio);
  const interestCoverage =
    safeNumber(latestRt?.interestCoverage) ?? safeNumber(latestKm?.interestCoverage);

  // Growth — compute from income statements
  const incLatest = income?.[0] ?? null;
  const incPrior = income?.[1] ?? null;
  let revenueGrowth: number | null = null;
  let earningsGrowth: number | null = null;

  const rev0 = safeNumber(incLatest?.revenue);
  const rev1 = safeNumber(incPrior?.revenue);
  if (rev0 !== null && rev1 !== null && rev1 !== 0) {
    revenueGrowth = round1(((rev0 - rev1) / Math.abs(rev1)) * 100);
  }

  const ni0 = safeNumber(incLatest?.netIncome);
  const ni1 = safeNumber(incPrior?.netIncome);
  if (ni0 !== null && ni1 !== null && ni1 !== 0) {
    earningsGrowth = round1(((ni0 - ni1) / Math.abs(ni1)) * 100);
  }

  // Dividend
  const dividendYield = toPct(latestRt?.dividendYield ?? latestKm?.dividendYield);
  const payoutRatio = toPct(latestRt?.payoutRatio ?? latestRt?.dividendPayoutRatio);

  // Rating
  let ratingBlock: CompanyComparison['rating'] = null;
  if (rating) {
    ratingBlock = {
      score: safeNumber(rating.ratingScore),
      recommendation: rating.ratingRecommendation ?? rating.rating ?? null,
    };
  }

  const comparison: CompanyComparison = {
    symbol,
    company_name: profile?.companyName ?? quote?.name ?? null,
    sector: profile?.sector ?? null,
    industry: profile?.industry ?? null,

    price: {
      current: current !== null ? round2(current) : null,
      change_percent: changePercent !== null ? round2(changePercent) : null,
      year_high: yearHigh !== null ? round2(yearHigh) : null,
      year_low: yearLow !== null ? round2(yearLow) : null,
      distance_from_52w_high_percent: distFromHigh,
    },

    valuation: {
      market_cap: marketCap,
      market_cap_readable: marketCap !== null ? formatMarketCap(marketCap) : null,
      pe_ratio: peRatio !== null ? round2(peRatio) : null,
      pb_ratio: pbRatio !== null ? round2(pbRatio) : null,
      ps_ratio: psRatio !== null ? round2(psRatio) : null,
      ev_to_ebitda: evToEbitda !== null ? round2(evToEbitda) : null,
      dcf_value: dcfValue !== null ? round2(dcfValue) : null,
      dcf_upside_percent: dcfUpside,
    },

    profitability: {
      gross_margin: grossMargin,
      operating_margin: operatingMargin,
      net_margin: netMargin,
      roe,
      roa,
      roic,
    },

    financial_health: {
      debt_to_equity: debtToEquity !== null ? round2(debtToEquity) : null,
      current_ratio: currentRatio !== null ? round2(currentRatio) : null,
      interest_coverage: interestCoverage !== null ? round1(interestCoverage) : null,
    },

    growth: {
      revenue_growth_yoy: revenueGrowth,
      earnings_growth_yoy: earningsGrowth,
    },

    dividend: {
      dividend_yield: dividendYield,
      payout_ratio: payoutRatio,
    },

    rating: ratingBlock,
  };

  return { comparison, apiCalls };
}

// ---------------------------------------------------------------------------
// Rankings
// ---------------------------------------------------------------------------

function deriveRankings(companies: CompanyComparison[]): CompareCompaniesResult['rankings'] {
  // Lowest positive P/E
  const withPe = companies.filter((c) => c.valuation.pe_ratio !== null && c.valuation.pe_ratio > 0);
  const lowestPe = withPe.length > 0
    ? withPe.reduce((a, b) => (a.valuation.pe_ratio! < b.valuation.pe_ratio! ? a : b)).symbol
    : null;

  // Highest net margin
  const withMargin = companies.filter((c) => c.profitability.net_margin !== null);
  const highestMargin = withMargin.length > 0
    ? withMargin.reduce((a, b) => (a.profitability.net_margin! > b.profitability.net_margin! ? a : b)).symbol
    : null;

  // Strongest balance sheet (lowest non-negative D/E)
  const withDe = companies.filter(
    (c) => c.financial_health.debt_to_equity !== null && c.financial_health.debt_to_equity >= 0,
  );
  const strongestBs = withDe.length > 0
    ? withDe.reduce((a, b) => (a.financial_health.debt_to_equity! < b.financial_health.debt_to_equity! ? a : b)).symbol
    : null;

  // Best revenue growth
  const withGrowth = companies.filter((c) => c.growth.revenue_growth_yoy !== null);
  const bestGrowth = withGrowth.length > 0
    ? withGrowth.reduce((a, b) => (a.growth.revenue_growth_yoy! > b.growth.revenue_growth_yoy! ? a : b)).symbol
    : null;

  // Most undervalued (highest DCF upside)
  const withDcf = companies.filter((c) => c.valuation.dcf_upside_percent !== null);
  const mostUndervalued = withDcf.length > 0
    ? withDcf.reduce((a, b) => (a.valuation.dcf_upside_percent! > b.valuation.dcf_upside_percent! ? a : b)).symbol
    : null;

  // Highest rated
  const withRating = companies.filter((c) => c.rating !== null && c.rating.score !== null);
  const highestRated = withRating.length > 0
    ? withRating.reduce((a, b) => (a.rating!.score! > b.rating!.score! ? a : b)).symbol
    : null;

  return {
    lowest_pe: lowestPe,
    highest_margin: highestMargin,
    strongest_balance_sheet: strongestBs,
    best_growth: bestGrowth,
    most_undervalued: mostUndervalued,
    highest_rated: highestRated,
  };
}

// ---------------------------------------------------------------------------
// Main tool function
// ---------------------------------------------------------------------------

export async function compareCompanies(
  symbols: string[],
  client?: FmpClient,
): Promise<CompareCompaniesResult> {
  const fmp = client ?? new FmpClient();
  const normalized = symbols.map((s) => s.trim().toUpperCase());

  // 1. Batch quote with per-symbol fallback on 402/empty.
  // FMP moved /stable/batch-quote behind a paywall on free tier; withBatchFallback
  // degrades gracefully to per-symbol getQuote calls so the comparison still
  // returns a complete response instead of failing the whole tool.
  const { results: quotes, diag: quoteDiag } = await withBatchFallback<string, FmpQuote>(
    normalized,
    async (syms) => {
      try {
        return await fmp.getBatchQuote(syms);
      } catch {
        return null;
      }
    },
    async (sym) => {
      try {
        return await fmp.getQuote(sym);
      } catch {
        return null;
      }
    },
    { concurrency: 5 },
  );
  // When fallback fires, the initial (failed) batch call still consumed a
  // network round-trip, so count it alongside the per-item attempts.
  let totalApiCalls = quoteDiag.usedFallback
    ? 1 + (quoteDiag.perItemCount ?? normalized.length)
    : 1;

  // Map quotes by symbol for fast lookup
  const quoteMap = new Map<string, FmpQuote>();
  for (const q of quotes) {
    quoteMap.set(q.symbol, q);
  }

  // 2. Fetch per-symbol data in parallel
  const results = await Promise.all(
    normalized.map((sym) => fetchCompanyData(sym, quoteMap.get(sym), fmp)),
  );

  const companies = results.map((r) => r.comparison);
  totalApiCalls += results.reduce((sum, r) => sum + r.apiCalls, 0);

  // 3. Derive rankings
  const rankings = deriveRankings(companies);

  return {
    symbols_compared: normalized,
    comparison_date: new Date().toISOString(),
    companies,
    rankings,
    meta: {
      source: 'Toolstem via Financial Modeling Prep',
      timestamp: new Date().toISOString(),
      data_delay: 'Real-time during market hours',
      api_calls_made: totalApiCalls,
    },
  };
}

