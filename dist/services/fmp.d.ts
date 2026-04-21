/**
 * Financial Modeling Prep (FMP) API client.
 * Centralizes all HTTP access to the FMP stable API. All methods return null
 * on empty/errored responses so callers can handle graceful degradation.
 */
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
export type Period = 'annual' | 'quarter';
export declare class FmpClient {
    private readonly apiKey;
    private readonly baseUrl;
    _lastScreenDiag: Array<{
        size: number;
        returned: number;
        ms: number;
    }>;
    _lastHttpStatus: number | null;
    _lastHttpBody: string;
    constructor(apiKey?: string, baseUrl?: string);
    /**
     * Low-level GET helper. Returns parsed JSON, or null on empty/error.
     */
    private request;
    getQuote(symbol: string): Promise<FmpQuote | null>;
    getProfile(symbol: string): Promise<FmpProfile | null>;
    getDCF(symbol: string): Promise<FmpDCF | null>;
    getKeyMetrics(symbol: string, period?: Period): Promise<FmpKeyMetrics[] | null>;
    getFinancialRatios(symbol: string, period?: Period): Promise<FmpFinancialRatios[] | null>;
    getIncomeStatement(symbol: string, period?: Period): Promise<FmpIncomeStatement[] | null>;
    getBalanceSheet(symbol: string, period?: Period): Promise<FmpBalanceSheet[] | null>;
    getCashFlow(symbol: string, period?: Period): Promise<FmpCashFlow[] | null>;
    getRating(symbol: string): Promise<FmpRating | null>;
    getStockGrade(symbol: string): Promise<FmpStockGrade[] | null>;
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
    screenStocks(params: {
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
    }): Promise<FmpScreenerResult[]>;
    /**
     * Batch quote — get quotes for multiple symbols in a single call.
     * Symbols are comma-separated.
     */
    getBatchQuote(symbols: string[]): Promise<FmpQuote[]>;
}
//# sourceMappingURL=fmp.d.ts.map