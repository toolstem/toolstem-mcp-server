/**
 * Tool: get_company_metrics
 * Deep financial analysis synthesized from key-metrics + ratios + income + balance + cash flow.
 * Produces derived signals (margin_trend, health_signal, growth_signal) and 3-year CAGRs.
 */

import { FmpClient, type Period } from '../services/fmp.js';
import {
  calcCAGR,
  calcPercentChange,
  deriveTrendSignal,
  formatMarketCap,
  round1,
  round2,
  safeNumber,
} from '../utils/formatting.js';

export interface CompanyMetrics {
  symbol: string;
  period: Period;
  latest_period_date: string | null;

  profitability: {
    revenue: number | null;
    revenue_readable: string | null;
    revenue_growth_yoy: number | null;
    net_income: number | null;
    net_income_readable: string | null;
    gross_margin: number | null;
    operating_margin: number | null;
    net_margin: number | null;
    roe: number | null;
    roa: number | null;
    roic: number | null;
    margin_trend: 'EXPANDING' | 'STABLE' | 'CONTRACTING' | null;
  };

  financial_health: {
    total_debt: number | null;
    total_cash: number | null;
    net_debt: number | null;
    debt_to_equity: number | null;
    current_ratio: number | null;
    interest_coverage: number | null;
    health_signal: 'STRONG' | 'ADEQUATE' | 'WEAK' | null;
  };

  cash_flow: {
    operating_cash_flow: number | null;
    free_cash_flow: number | null;
    free_cash_flow_readable: string | null;
    fcf_margin: number | null;
    capex: number | null;
    dividends_paid: number | null;
    buybacks: number | null;
    fcf_yield: number | null;
  };

  growth_3yr: {
    revenue_cagr: number | null;
    net_income_cagr: number | null;
    fcf_cagr: number | null;
    growth_signal: 'ACCELERATING' | 'STEADY' | 'DECELERATING' | null;
  };

  per_share: {
    eps: number | null;
    book_value_per_share: number | null;
    fcf_per_share: number | null;
    dividend_per_share: number | null;
    payout_ratio: number | null;
  };

  meta: {
    source: string;
    timestamp: string;
    periods_analyzed: number;
    data_delay: string;
  };
}

/**
 * Convert FMP decimal ratio to percentage.
 * FMP stable /ratios and /key-metrics endpoints consistently return
 * ratios as decimals (e.g., 0.462 for 46.2%). Always multiply by 100.
 */
function toPct(ratio: number | null | undefined): number | null {
  if (ratio === null || ratio === undefined) return null;
  const n = safeNumber(ratio);
  if (n === null) return null;
  return round1(n * 100);
}

function deriveHealthSignal(
  debtToEquity: number | null,
  currentRatio: number | null,
  interestCoverage: number | null,
): 'STRONG' | 'ADEQUATE' | 'WEAK' | null {
  if (debtToEquity === null && currentRatio === null && interestCoverage === null) {
    return null;
  }
  let strongs = 0;
  let weaks = 0;
  let counted = 0;

  if (debtToEquity !== null) {
    counted++;
    if (debtToEquity < 1) strongs++;
    else if (debtToEquity > 2) weaks++;
  }
  if (currentRatio !== null) {
    counted++;
    if (currentRatio >= 1.5) strongs++;
    else if (currentRatio < 1) weaks++;
  }
  if (interestCoverage !== null) {
    counted++;
    if (interestCoverage >= 8) strongs++;
    else if (interestCoverage < 3) weaks++;
  }

  if (counted === 0) return null;
  if (strongs >= 2 && weaks === 0) return 'STRONG';
  if (weaks >= 2) return 'WEAK';
  return 'ADEQUATE';
}

function deriveGrowthSignal(
  growthRates: number[],
): 'ACCELERATING' | 'STEADY' | 'DECELERATING' | null {
  const clean = growthRates.filter(
    (v) => v !== null && v !== undefined && !Number.isNaN(v),
  );
  if (clean.length < 2) return null;
  const first = clean[0];
  const last = clean[clean.length - 1];
  const diff = last - first;
  if (diff >= 2) return 'ACCELERATING';
  if (diff <= -2) return 'DECELERATING';
  return 'STEADY';
}

export async function getCompanyMetrics(
  symbol: string,
  period: Period = 'annual',
  client?: FmpClient,
): Promise<CompanyMetrics> {
  const fmp = client ?? new FmpClient();
  const upperSymbol = symbol.trim().toUpperCase();

  const [keyMetrics, ratios, income, balance, cashFlow] = await Promise.all([
    fmp.getKeyMetrics(upperSymbol, period).catch(() => null),
    fmp.getFinancialRatios(upperSymbol, period).catch(() => null),
    fmp.getIncomeStatement(upperSymbol, period).catch(() => null),
    fmp.getBalanceSheet(upperSymbol, period).catch(() => null),
    fmp.getCashFlow(upperSymbol, period).catch(() => null),
  ]);

  // Take newest 3 periods (FMP returns newest-first)
  const km = (keyMetrics ?? []).slice(0, 3);
  const rt = (ratios ?? []).slice(0, 3);
  const inc = (income ?? []).slice(0, 3);
  const bs = (balance ?? []).slice(0, 3);
  const cf = (cashFlow ?? []).slice(0, 3);

  const latestInc = inc[0];
  const priorInc = inc[1];
  const latestBs = bs[0];
  const latestCf = cf[0];
  const latestRt = rt[0];
  const latestKm = km[0];

  const periodsAnalyzed = Math.max(inc.length, bs.length, cf.length, rt.length, km.length);

  // --- Profitability ---
  const revenue = safeNumber(latestInc?.revenue);
  const priorRevenue = safeNumber(priorInc?.revenue);
  const netIncome = safeNumber(latestInc?.netIncome);

  const revenueGrowthYoy =
    revenue !== null && priorRevenue !== null && priorRevenue !== 0
      ? calcPercentChange(revenue, priorRevenue)
      : null;

  const grossMargin = toPct(latestRt?.grossProfitMargin ?? latestInc?.grossProfitRatio);
  const operatingMargin = toPct(latestRt?.operatingProfitMargin ?? latestInc?.operatingIncomeRatio);
  const netMargin = toPct(latestRt?.netProfitMargin ?? latestInc?.netIncomeRatio);

  const roe = toPct(latestRt?.returnOnEquity ?? latestKm?.roe);
  const roa = toPct(latestRt?.returnOnAssets);
  const roic = toPct(latestKm?.roic);

  // Margin trend from net margin across available periods, oldest -> newest
  const netMarginsSeries = rt
    .slice()
    .reverse()
    .map((r) => toPct(r?.netProfitMargin))
    .filter((v): v is number => v !== null);
  const marginTrend = netMarginsSeries.length >= 2 ? deriveTrendSignal(netMarginsSeries) : null;

  // --- Financial Health ---
  const totalDebt = safeNumber(latestBs?.totalDebt);
  const totalCash =
    safeNumber(latestBs?.cashAndShortTermInvestments) ??
    safeNumber(latestBs?.cashAndCashEquivalents);
  const netDebt =
    safeNumber(latestBs?.netDebt) ??
    (totalDebt !== null && totalCash !== null ? totalDebt - totalCash : null);
  const debtToEquity =
    safeNumber(latestRt?.debtEquityRatio) ??
    safeNumber(latestKm?.debtToEquity);
  const currentRatio =
    safeNumber(latestRt?.currentRatio) ?? safeNumber(latestKm?.currentRatio);
  const interestCoverage =
    safeNumber(latestRt?.interestCoverage) ?? safeNumber(latestKm?.interestCoverage);

  const debtToEquityRounded = debtToEquity !== null ? round2(debtToEquity) : null;
  const currentRatioRounded = currentRatio !== null ? round2(currentRatio) : null;
  const interestCoverageRounded = interestCoverage !== null ? round1(interestCoverage) : null;

  const healthSignal = deriveHealthSignal(
    debtToEquityRounded,
    currentRatioRounded,
    interestCoverageRounded,
  );

  // --- Cash Flow ---
  const operatingCashFlow =
    safeNumber(latestCf?.netCashProvidedByOperatingActivities) ??
    safeNumber(latestCf?.operatingCashFlow);
  const freeCashFlow = safeNumber(latestCf?.freeCashFlow);
  const capexRaw = safeNumber(latestCf?.capitalExpenditure);
  const capex = capexRaw !== null ? Math.abs(capexRaw) : null;
  const dividendsPaidRaw = safeNumber(latestCf?.dividendsPaid);
  const dividendsPaid = dividendsPaidRaw !== null ? Math.abs(dividendsPaidRaw) : null;
  const buybacksRaw = safeNumber(latestCf?.commonStockRepurchased);
  const buybacks = buybacksRaw !== null ? Math.abs(buybacksRaw) : null;

  const fcfMargin =
    freeCashFlow !== null && revenue !== null && revenue > 0
      ? round1((freeCashFlow / revenue) * 100)
      : null;

  const marketCap = safeNumber(latestKm?.marketCap);
  const fcfYield =
    freeCashFlow !== null && marketCap !== null && marketCap > 0
      ? round1((freeCashFlow / marketCap) * 100)
      : safeNumber(latestKm?.freeCashFlowYield) !== null
        ? toPct(latestKm?.freeCashFlowYield)
        : null;

  // --- Growth 3yr ---
  // Use available span. If we have N data points, CAGR span is (N-1) periods.
  // For quarterly data, convert periods to years (×0.25).
  const periodMultiplier = period === 'quarter' ? 0.25 : 1;
  const incPointsAsc = inc.slice().reverse(); // oldest -> newest
  const cfPointsAsc = cf.slice().reverse();

  const revenueSeries = incPointsAsc
    .map((r) => safeNumber(r?.revenue))
    .filter((v): v is number => v !== null && v > 0);
  const netIncomeSeries = incPointsAsc
    .map((r) => safeNumber(r?.netIncome))
    .filter((v): v is number => v !== null);
  const fcfSeries = cfPointsAsc
    .map((r) => safeNumber(r?.freeCashFlow))
    .filter((v): v is number => v !== null);

  // Revenue CAGR — only meaningful for positive values
  const revenueYears = (revenueSeries.length - 1) * periodMultiplier;
  const revenueCagr =
    revenueSeries.length >= 2 && revenueYears > 0
      ? calcCAGR(
          revenueSeries[0],
          revenueSeries[revenueSeries.length - 1],
          revenueYears,
        )
      : null;

  // Net income and FCF can cross zero, so use simple % change when sign changes.
  // CAGR only works with positive start values.
  function growthRate(series: number[]): number | null {
    if (series.length < 2) return null;
    const start = series[0];
    const end = series[series.length - 1];
    const years = (series.length - 1) * periodMultiplier;
    if (years <= 0) return null;
    if (start > 0 && end > 0) {
      return calcCAGR(start, end, years);
    }
    // Sign change or negative start — use simple annualized % change
    if (start !== 0) {
      return round1(((end - start) / Math.abs(start)) * 100 / years);
    }
    return null; // can't compute from zero
  }

  const netIncomeCagr = growthRate(netIncomeSeries);
  const fcfCagr = growthRate(fcfSeries);

  // Growth signal: compare YoY growth between the most recent two periods
  let growthSignal: 'ACCELERATING' | 'STEADY' | 'DECELERATING' | null = null;
  if (inc.length >= 3) {
    const latestRev = safeNumber(inc[0]?.revenue);
    const midRev = safeNumber(inc[1]?.revenue);
    const oldestRev = safeNumber(inc[2]?.revenue);
    if (latestRev !== null && midRev !== null && oldestRev !== null && midRev > 0 && oldestRev > 0) {
      const recentYoy = ((latestRev - midRev) / midRev) * 100;
      const priorYoy = ((midRev - oldestRev) / oldestRev) * 100;
      growthSignal = deriveGrowthSignal([priorYoy, recentYoy]);
    }
  } else if (revenueGrowthYoy !== null && revenueCagr !== null) {
    // Fallback: compare latest YoY to CAGR
    growthSignal = deriveGrowthSignal([revenueCagr, revenueGrowthYoy]);
  }

  // --- Per share ---
  const eps = safeNumber(latestInc?.epsdiluted) ?? safeNumber(latestInc?.eps);
  const bookValuePerShare = safeNumber(latestKm?.bookValuePerShare);
  const fcfPerShare = safeNumber(latestKm?.freeCashFlowPerShare);
  // Derive dividend-per-share from cash flow dividends and shares outstanding
  const sharesOut =
    safeNumber(latestInc?.weightedAverageShsOutDil) ??
    safeNumber(latestInc?.weightedAverageShsOut);
  const derivedDps =
    dividendsPaid !== null && sharesOut !== null && sharesOut > 0
      ? round2(dividendsPaid / sharesOut)
      : null;
  const payoutRatio = toPct(latestRt?.payoutRatio ?? latestRt?.dividendPayoutRatio);

  const metrics: CompanyMetrics = {
    symbol: upperSymbol,
    period,
    latest_period_date: latestInc?.date ?? latestBs?.date ?? latestCf?.date ?? null,

    profitability: {
      revenue,
      revenue_readable: revenue !== null ? formatMarketCap(revenue) : null,
      revenue_growth_yoy: revenueGrowthYoy,
      net_income: netIncome,
      net_income_readable: netIncome !== null ? formatMarketCap(netIncome) : null,
      gross_margin: grossMargin,
      operating_margin: operatingMargin,
      net_margin: netMargin,
      roe,
      roa,
      roic,
      margin_trend: marginTrend,
    },

    financial_health: {
      total_debt: totalDebt,
      total_cash: totalCash,
      net_debt: netDebt,
      debt_to_equity: debtToEquityRounded,
      current_ratio: currentRatioRounded,
      interest_coverage: interestCoverageRounded,
      health_signal: healthSignal,
    },

    cash_flow: {
      operating_cash_flow: operatingCashFlow,
      free_cash_flow: freeCashFlow,
      free_cash_flow_readable: freeCashFlow !== null ? formatMarketCap(freeCashFlow) : null,
      fcf_margin: fcfMargin,
      capex,
      dividends_paid: dividendsPaid,
      buybacks,
      fcf_yield: fcfYield,
    },

    growth_3yr: {
      revenue_cagr: revenueCagr,
      net_income_cagr: netIncomeCagr,
      fcf_cagr: fcfCagr,
      growth_signal: growthSignal,
    },

    per_share: {
      eps: eps !== null ? round2(eps) : null,
      book_value_per_share: bookValuePerShare !== null ? round2(bookValuePerShare) : null,
      fcf_per_share: fcfPerShare !== null ? round2(fcfPerShare) : null,
      dividend_per_share: derivedDps,
      payout_ratio: payoutRatio,
    },

    meta: {
      source: 'Toolstem via Financial Modeling Prep',
      timestamp: new Date().toISOString(),
      periods_analyzed: periodsAnalyzed,
      data_delay: 'End of day',
    },
  };

  return metrics;
}
