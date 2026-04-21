/**
 * Financial Modeling Prep (FMP) API client.
 * Centralizes all HTTP access to the FMP stable API. All methods return null
 * on empty/errored responses so callers can handle graceful degradation.
 */

import { RUSSELL_1000, UNIVERSE_METADATA, UNIVERSE_BY_SYMBOL } from '../data/universe.js';

const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface FmpQuote {
  symbol: string;
  name?: string;
  price?: number;
  changesPercentage?: number;
  change?: number;
  dayLow?: number;
  dayHigh?: number;
  yearHigh?: number;
  yearLow?: number;
  marketCap?: number;
  priceAvg50?: number;
  priceAvg200?: number;
  exchange?: string;
  volume?: number;
  avgVolume?: number;
  open?: number;
  previousClose?: number;
  eps?: number;
  pe?: number;
  earningsAnnouncement?: string;
  sharesOutstanding?: number;
  timestamp?: number;
}

export interface FmpProfile {
  symbol: string;
  price?: number;
  beta?: number;
  volAvg?: number;
  averageVolume?: number;
  mktCap?: number;
  marketCap?: number;
  lastDiv?: number;
  range?: string;
  changes?: number;
  companyName?: string;
  currency?: string;
  cik?: string;
  isin?: string;
  cusip?: string;
  exchange?: string;
  exchangeShortName?: string;
  industry?: string;
  website?: string;
  description?: string;
  ceo?: string;
  sector?: string;
  country?: string;
  fullTimeEmployees?: string | number;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  dcfDiff?: number;
  dcf?: number;
  image?: string;
  ipoDate?: string;
  defaultImage?: boolean;
  isEtf?: boolean;
  isActivelyTrading?: boolean;
  isAdr?: boolean;
  isFund?: boolean;
}

export interface FmpDCF {
  symbol: string;
  date?: string;
  dcf?: number;
  'Stock Price'?: number;
  stockPrice?: number;
}

export interface FmpRating {
  symbol: string;
  date?: string;
  rating?: string;
  ratingScore?: number;
  ratingRecommendation?: string;
  ratingDetailsDCFScore?: number;
  ratingDetailsDCFRecommendation?: string;
  ratingDetailsROEScore?: number;
  ratingDetailsROERecommendation?: string;
  ratingDetailsROAScore?: number;
  ratingDetailsROARecommendation?: string;
  ratingDetailsDEScore?: number;
  ratingDetailsDERecommendation?: string;
  ratingDetailsPEScore?: number;
  ratingDetailsPERecommendation?: string;
  ratingDetailsPBScore?: number;
  ratingDetailsPBRecommendation?: string;
}

export interface FmpStockGrade {
  symbol: string;
  date?: string;
  gradingCompany?: string;
  previousGrade?: string;
  newGrade?: string;
}

export interface FmpScreenerResult {
  symbol: string;
  companyName?: string;
  marketCap?: number | null;
  sector?: string;
  industry?: string;
  beta?: number | null;
  price?: number;
  lastAnnualDividend?: number | null;
  volume?: number;
  exchange?: string;
  exchangeShortName?: string;
  country?: string;
  isEtf?: boolean;
  isFund?: boolean;
  isActivelyTrading?: boolean;
}

export interface FmpKeyMetrics {
  symbol: string;
  date?: string;
  calendarYear?: string;
  period?: string;
  revenuePerShare?: number;
  netIncomePerShare?: number;
  operatingCashFlowPerShare?: number;
  freeCashFlowPerShare?: number;
  cashPerShare?: number;
  bookValuePerShare?: number;
  tangibleBookValuePerShare?: number;
  shareholdersEquityPerShare?: number;
  interestDebtPerShare?: number;
  marketCap?: number;
  enterpriseValue?: number;
  peRatio?: number;
  priceToSalesRatio?: number;
  pocfratio?: number;
  pfcfRatio?: number;
  pbRatio?: number;
  ptbRatio?: number;
  evToSales?: number;
  enterpriseValueOverEBITDA?: number;
  evToOperatingCashFlow?: number;
  evToFreeCashFlow?: number;
  earningsYield?: number;
  freeCashFlowYield?: number;
  debtToEquity?: number;
  debtToAssets?: number;
  netDebtToEBITDA?: number;
  currentRatio?: number;
  interestCoverage?: number;
  incomeQuality?: number;
  dividendYield?: number;
  payoutRatio?: number;
  salesGeneralAndAdministrativeToRevenue?: number;
  researchAndDevelopementToRevenue?: number;
  intangiblesToTotalAssets?: number;
  capexToOperatingCashFlow?: number;
  capexToRevenue?: number;
  capexToDepreciation?: number;
  stockBasedCompensationToRevenue?: number;
  grahamNumber?: number;
  roic?: number;
  returnOnTangibleAssets?: number;
  grahamNetNet?: number;
  workingCapital?: number;
  tangibleAssetValue?: number;
  netCurrentAssetValue?: number;
  investedCapital?: number;
  averageReceivables?: number;
  averagePayables?: number;
  averageInventory?: number;
  daysSalesOutstanding?: number;
  daysPayablesOutstanding?: number;
  daysOfInventoryOnHand?: number;
  receivablesTurnover?: number;
  payablesTurnover?: number;
  inventoryTurnover?: number;
  roe?: number;
  capexPerShare?: number;
}

export interface FmpFinancialRatios {
  symbol: string;
  date?: string;
  calendarYear?: string;
  period?: string;
  currentRatio?: number;
  quickRatio?: number;
  cashRatio?: number;
  daysOfSalesOutstanding?: number;
  daysOfInventoryOutstanding?: number;
  operatingCycle?: number;
  daysOfPayablesOutstanding?: number;
  cashConversionCycle?: number;
  grossProfitMargin?: number;
  operatingProfitMargin?: number;
  pretaxProfitMargin?: number;
  netProfitMargin?: number;
  effectiveTaxRate?: number;
  returnOnAssets?: number;
  returnOnEquity?: number;
  returnOnCapitalEmployed?: number;
  netIncomePerEBT?: number;
  ebtPerEbit?: number;
  ebitPerRevenue?: number;
  debtRatio?: number;
  debtEquityRatio?: number;
  longTermDebtToCapitalization?: number;
  totalDebtToCapitalization?: number;
  interestCoverage?: number;
  cashFlowToDebtRatio?: number;
  companyEquityMultiplier?: number;
  receivablesTurnover?: number;
  payablesTurnover?: number;
  inventoryTurnover?: number;
  fixedAssetTurnover?: number;
  assetTurnover?: number;
  operatingCashFlowPerShare?: number;
  freeCashFlowPerShare?: number;
  cashPerShare?: number;
  payoutRatio?: number;
  operatingCashFlowSalesRatio?: number;
  freeCashFlowOperatingCashFlowRatio?: number;
  cashFlowCoverageRatios?: number;
  shortTermCoverageRatios?: number;
  capitalExpenditureCoverageRatio?: number;
  dividendPaidAndCapexCoverageRatio?: number;
  dividendPayoutRatio?: number;
  priceBookValueRatio?: number;
  priceToBookRatio?: number;
  priceToSalesRatio?: number;
  priceEarningsRatio?: number;
  priceToFreeCashFlowsRatio?: number;
  priceToOperatingCashFlowsRatio?: number;
  priceCashFlowRatio?: number;
  priceEarningsToGrowthRatio?: number;
  priceSalesRatio?: number;
  dividendYield?: number;
  enterpriseValueMultiple?: number;
  priceFairValue?: number;
}

export interface FmpIncomeStatement {
  date?: string;
  symbol: string;
  reportedCurrency?: string;
  cik?: string;
  fillingDate?: string;
  acceptedDate?: string;
  calendarYear?: string;
  period?: string;
  revenue?: number;
  costOfRevenue?: number;
  grossProfit?: number;
  grossProfitRatio?: number;
  researchAndDevelopmentExpenses?: number;
  generalAndAdministrativeExpenses?: number;
  sellingAndMarketingExpenses?: number;
  sellingGeneralAndAdministrativeExpenses?: number;
  otherExpenses?: number;
  operatingExpenses?: number;
  costAndExpenses?: number;
  interestIncome?: number;
  interestExpense?: number;
  depreciationAndAmortization?: number;
  ebitda?: number;
  ebitdaratio?: number;
  operatingIncome?: number;
  operatingIncomeRatio?: number;
  totalOtherIncomeExpensesNet?: number;
  incomeBeforeTax?: number;
  incomeBeforeTaxRatio?: number;
  incomeTaxExpense?: number;
  netIncome?: number;
  netIncomeRatio?: number;
  eps?: number;
  epsdiluted?: number;
  weightedAverageShsOut?: number;
  weightedAverageShsOutDil?: number;
}

export interface FmpBalanceSheet {
  date?: string;
  symbol: string;
  reportedCurrency?: string;
  cik?: string;
  fillingDate?: string;
  acceptedDate?: string;
  calendarYear?: string;
  period?: string;
  cashAndCashEquivalents?: number;
  shortTermInvestments?: number;
  cashAndShortTermInvestments?: number;
  netReceivables?: number;
  inventory?: number;
  otherCurrentAssets?: number;
  totalCurrentAssets?: number;
  propertyPlantEquipmentNet?: number;
  goodwill?: number;
  intangibleAssets?: number;
  goodwillAndIntangibleAssets?: number;
  longTermInvestments?: number;
  taxAssets?: number;
  otherNonCurrentAssets?: number;
  totalNonCurrentAssets?: number;
  otherAssets?: number;
  totalAssets?: number;
  accountPayables?: number;
  shortTermDebt?: number;
  taxPayables?: number;
  deferredRevenue?: number;
  otherCurrentLiabilities?: number;
  totalCurrentLiabilities?: number;
  longTermDebt?: number;
  deferredRevenueNonCurrent?: number;
  deferredTaxLiabilitiesNonCurrent?: number;
  otherNonCurrentLiabilities?: number;
  totalNonCurrentLiabilities?: number;
  otherLiabilities?: number;
  capitalLeaseObligations?: number;
  totalLiabilities?: number;
  preferredStock?: number;
  commonStock?: number;
  retainedEarnings?: number;
  accumulatedOtherComprehensiveIncomeLoss?: number;
  othertotalStockholdersEquity?: number;
  totalStockholdersEquity?: number;
  totalEquity?: number;
  totalLiabilitiesAndStockholdersEquity?: number;
  minorityInterest?: number;
  totalLiabilitiesAndTotalEquity?: number;
  totalInvestments?: number;
  totalDebt?: number;
  netDebt?: number;
}

export interface FmpCashFlow {
  date?: string;
  symbol: string;
  reportedCurrency?: string;
  cik?: string;
  fillingDate?: string;
  acceptedDate?: string;
  calendarYear?: string;
  period?: string;
  netIncome?: number;
  depreciationAndAmortization?: number;
  deferredIncomeTax?: number;
  stockBasedCompensation?: number;
  changeInWorkingCapital?: number;
  accountsReceivables?: number;
  inventory?: number;
  accountsPayables?: number;
  otherWorkingCapital?: number;
  otherNonCashItems?: number;
  netCashProvidedByOperatingActivities?: number;
  operatingCashFlow?: number;
  investmentsInPropertyPlantAndEquipment?: number;
  capitalExpenditure?: number;
  acquisitionsNet?: number;
  purchasesOfInvestments?: number;
  salesMaturitiesOfInvestments?: number;
  otherInvestingActivites?: number;
  netCashUsedForInvestingActivites?: number;
  debtRepayment?: number;
  commonStockIssued?: number;
  commonStockRepurchased?: number;
  dividendsPaid?: number;
  otherFinancingActivites?: number;
  netCashUsedProvidedByFinancingActivities?: number;
  effectOfForexChangesOnCash?: number;
  netChangeInCash?: number;
  cashAtEndOfPeriod?: number;
  cashAtBeginningOfPeriod?: number;
  freeCashFlow?: number;
}

// -----------------------------------------------------------------------------
// Client
// -----------------------------------------------------------------------------

export type Period = 'annual' | 'quarter';

export class FmpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey?: string, baseUrl: string = FMP_BASE_URL) {
    const key = apiKey ?? process.env.FMP_API_KEY;
    if (!key) {
      throw new Error(
        'FMP_API_KEY environment variable is not set. Set FMP_API_KEY or pass apiKey to FmpClient.',
      );
    }
    this.apiKey = key;
    this.baseUrl = baseUrl;
  }

  /**
   * Low-level GET helper. Returns parsed JSON, or null on empty/error.
   */
  private async request<T>(
    path: string,
    params: Record<string, string | undefined>,
  ): Promise<T | null> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, v);
    }
    url.searchParams.set('apikey', this.apiKey);

    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        // Diagnostic: log non-OK responses to stderr (Apify captures these)
        let errBody = '';
        try { errBody = (await res.text()).slice(0, 500); } catch { /* ignore */ }
        console.error(`[FMP] HTTP ${res.status} for ${path} — body: ${errBody}`);
        return null;
      }
      const body = (await res.json()) as unknown;
      if (body === null || body === undefined) {
        console.error(`[FMP] null/undefined body for ${path}`);
        return null;
      }
      if (Array.isArray(body) && body.length === 0) {
        console.error(`[FMP] empty array for ${path}`);
        return null;
      }
      if (
        typeof body === 'object' &&
        body !== null &&
        'Error Message' in (body as Record<string, unknown>)
      ) {
        console.error(`[FMP] Error Message for ${path}: ${JSON.stringify(body)}`);
        return null;
      }
      return body as T;
    } catch (err) {
      console.error(`[FMP] fetch threw for ${path}: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  async getQuote(symbol: string): Promise<FmpQuote | null> {
    const data = await this.request<FmpQuote[]>('/quote', { symbol });
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    return data[0];
  }

  async getProfile(symbol: string): Promise<FmpProfile | null> {
    const data = await this.request<FmpProfile[]>('/profile', { symbol });
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    return data[0];
  }

  async getDCF(symbol: string): Promise<FmpDCF | null> {
    const data = await this.request<FmpDCF[]>('/discounted-cash-flow', { symbol });
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    return data[0];
  }

  async getKeyMetrics(symbol: string, period: Period = 'annual'): Promise<FmpKeyMetrics[] | null> {
    const data = await this.request<FmpKeyMetrics[]>('/key-metrics', { symbol, period });
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    return data;
  }

  async getFinancialRatios(
    symbol: string,
    period: Period = 'annual',
  ): Promise<FmpFinancialRatios[] | null> {
    const data = await this.request<FmpFinancialRatios[]>('/ratios', {
      symbol,
      period,
    });
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    return data;
  }

  async getIncomeStatement(
    symbol: string,
    period: Period = 'annual',
  ): Promise<FmpIncomeStatement[] | null> {
    const data = await this.request<FmpIncomeStatement[]>('/income-statement', {
      symbol,
      period,
    });
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    return data;
  }

  async getBalanceSheet(
    symbol: string,
    period: Period = 'annual',
  ): Promise<FmpBalanceSheet[] | null> {
    const data = await this.request<FmpBalanceSheet[]>('/balance-sheet-statement', {
      symbol,
      period,
    });
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    return data;
  }

  async getCashFlow(symbol: string, period: Period = 'annual'): Promise<FmpCashFlow[] | null> {
    const data = await this.request<FmpCashFlow[]>('/cash-flow-statement', {
      symbol,
      period,
    });
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    return data;
  }

  async getRating(symbol: string): Promise<FmpRating | null> {
    const data = await this.request<FmpRating[]>('/ratings-snapshot', { symbol });
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    return data[0];
  }

  async getStockGrade(symbol: string): Promise<FmpStockGrade[] | null> {
    const data = await this.request<FmpStockGrade[]>('/grades', { symbol });
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    return data;
  }

  /**
   * Screen stocks by fundamental criteria — synthetic implementation.
   *
   * FMP's `/company-screener` requires a paid plan (HTTP 402 on free tier).
   * We instead operate over a fixed Russell 1000 universe (src/data/universe.ts):
   * batch-fetch live quotes for the full universe via `/batch-quote`
   * (free-tier), merge sector data from the universe file, and filter
   * in-memory.
   *
   * Supported filters: sector, marketCap (min/max), price (min/max), volume
   * (min), isEtf, isFund, isActivelyTrading, limit.
   *
   * NOT supported at this time (filters silently ignored, surfaced in the
   * tool-level response metadata):
   *   - industry (iShares CSV has no sub-industry)
   *   - beta (not in /quote; would require /profile per symbol)
   *   - dividendMoreThan (not in /quote; would require /profile per symbol)
   *   - exchange (Russell 1000 is always NYSE/NASDAQ)
   *   - country (Russell 1000 is always US)
   *
   * Returns results in the same `FmpScreenerResult` shape as the paid
   * endpoint so downstream code is unchanged.
   */
  async screenStocks(params: {
    sector?: string;
    industry?: string;
    exchange?: string;
    country?: string;
    marketCapMoreThan?: number;
    marketCapLowerThan?: number;
    priceMoreThan?: number;
    priceLowerThan?: number;
    betaMoreThan?: number;
    betaLowerThan?: number;
    volumeMoreThan?: number;
    dividendMoreThan?: number;
    isEtf?: boolean;
    isFund?: boolean;
    isActivelyTrading?: boolean;
    limit?: number;
  }): Promise<FmpScreenerResult[]> {
    // Short-circuit: Russell 1000 universe is all operating companies,
    // not ETFs or funds. If the caller insists on ETFs/funds we return empty.
    if (params.isEtf === true) return [];
    if (params.isFund === true) return [];

    // Sector filter: match case-insensitively against universe sectors.
    let candidates: readonly { symbol: string; sector: string }[] = RUSSELL_1000;
    if (params.sector) {
      const needle = params.sector.toLowerCase();
      candidates = candidates.filter((e) => e.sector.toLowerCase() === needle);
      if (candidates.length === 0) return [];
    }

    // Batch the universe into /batch-quote calls. FMP accepts many symbols
    // per call; we chunk at 100 to stay safely under URL length limits.
    const BATCH_SIZE = 100;
    const symbols = candidates.map((e) => e.symbol);
    const chunks: string[][] = [];
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      chunks.push(symbols.slice(i, i + BATCH_SIZE));
    }

    const quoteBatches = await Promise.all(chunks.map((c) => this.getBatchQuote(c)));
    const quotes: FmpQuote[] = quoteBatches.flat();

    // Apply remaining filters in-memory.
    const results: FmpScreenerResult[] = [];
    for (const q of quotes) {
      if (!q.symbol) continue;
      const universeEntry = UNIVERSE_BY_SYMBOL.get(q.symbol);
      // Defensive: skip anything not in the universe (shouldn't happen).
      if (!universeEntry) continue;

      const marketCap = typeof q.marketCap === 'number' ? q.marketCap : null;
      const price = typeof q.price === 'number' ? q.price : null;
      const volume = typeof q.volume === 'number' ? q.volume : null;

      if (params.marketCapMoreThan !== undefined && (marketCap === null || marketCap < params.marketCapMoreThan)) continue;
      if (params.marketCapLowerThan !== undefined && (marketCap === null || marketCap > params.marketCapLowerThan)) continue;
      if (params.priceMoreThan !== undefined && (price === null || price < params.priceMoreThan)) continue;
      if (params.priceLowerThan !== undefined && (price === null || price > params.priceLowerThan)) continue;
      if (params.volumeMoreThan !== undefined && (volume === null || volume < params.volumeMoreThan)) continue;

      results.push({
        symbol: q.symbol,
        companyName: q.name,
        marketCap: marketCap,
        sector: universeEntry.sector,
        // industry/beta/lastAnnualDividend not populated — require paid endpoints
        industry: undefined,
        beta: null,
        price: price ?? undefined,
        lastAnnualDividend: null,
        volume: volume ?? undefined,
        exchange: q.exchange,
        exchangeShortName: q.exchange,
        country: UNIVERSE_METADATA.country,
        isEtf: false,
        isFund: false,
        isActivelyTrading: true,
      });
    }

    // Sort by market cap descending (largest first) — matches what paid
    // screener returns by default and is the most useful order for agents.
    results.sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));

    const limit = params.limit ?? 50;
    return results.slice(0, limit);
  }

  /**
   * Batch quote — get quotes for multiple symbols in a single call.
   * Symbols are comma-separated.
   */
  async getBatchQuote(symbols: string[]): Promise<FmpQuote[]> {
    const data = await this.request<FmpQuote[]>('/batch-quote', {
      symbols: symbols.join(','),
    });
    if (!data || !Array.isArray(data)) return [];
    return data;
  }
}
