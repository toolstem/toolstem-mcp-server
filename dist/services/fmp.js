/**
 * Financial Modeling Prep (FMP) API client.
 * Centralizes all HTTP access to the FMP stable API. All methods return null
 * on empty/errored responses so callers can handle graceful degradation.
 */
import { RUSSELL_1000, UNIVERSE_METADATA, UNIVERSE_BY_SYMBOL } from '../data/universe.js';
const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';
export class FmpClient {
    apiKey;
    baseUrl;
    // v1.2.1 diagnostic: per-chunk stats from the last screenStocks call
    _lastScreenDiag = [];
    _lastHttpStatus = null;
    _lastHttpBody = '';
    constructor(apiKey, baseUrl = FMP_BASE_URL) {
        const key = apiKey ?? process.env.FMP_API_KEY;
        if (!key) {
            throw new Error('FMP_API_KEY environment variable is not set. Set FMP_API_KEY or pass apiKey to FmpClient.');
        }
        this.apiKey = key;
        this.baseUrl = baseUrl;
    }
    /**
     * Low-level GET helper. Returns parsed JSON, or null on empty/error.
     */
    async request(path, params) {
        const url = new URL(`${this.baseUrl}${path}`);
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined)
                url.searchParams.set(k, v);
        }
        url.searchParams.set('apikey', this.apiKey);
        try {
            const res = await fetch(url.toString(), {
                method: 'GET',
                headers: { Accept: 'application/json' },
                signal: AbortSignal.timeout(15_000),
            });
            if (!res.ok) {
                // Diagnostic: log non-OK responses to stdout (Apify captures stderr
                // inconsistently under LIMITED_PERMISSIONS)
                let errBody = '';
                try {
                    errBody = (await res.text()).slice(0, 500);
                }
                catch { /* ignore */ }
                // eslint-disable-next-line no-console
                console.log(`[FMP] HTTP ${res.status} for ${path} — body: ${errBody}`);
                this._lastHttpStatus = res.status;
                this._lastHttpBody = errBody;
                return null;
            }
            const body = (await res.json());
            if (body === null || body === undefined) {
                console.error(`[FMP] null/undefined body for ${path}`);
                return null;
            }
            if (Array.isArray(body) && body.length === 0) {
                console.error(`[FMP] empty array for ${path}`);
                return null;
            }
            if (typeof body === 'object' &&
                body !== null &&
                'Error Message' in body) {
                console.error(`[FMP] Error Message for ${path}: ${JSON.stringify(body)}`);
                return null;
            }
            return body;
        }
        catch (err) {
            console.error(`[FMP] fetch threw for ${path}: ${err instanceof Error ? err.message : String(err)}`);
            return null;
        }
    }
    async getQuote(symbol) {
        const data = await this.request('/quote', { symbol });
        if (!data || !Array.isArray(data) || data.length === 0)
            return null;
        return data[0];
    }
    async getProfile(symbol) {
        const data = await this.request('/profile', { symbol });
        if (!data || !Array.isArray(data) || data.length === 0)
            return null;
        return data[0];
    }
    async getDCF(symbol) {
        const data = await this.request('/discounted-cash-flow', { symbol });
        if (!data || !Array.isArray(data) || data.length === 0)
            return null;
        return data[0];
    }
    async getKeyMetrics(symbol, period = 'annual') {
        const data = await this.request('/key-metrics', { symbol, period });
        if (!data || !Array.isArray(data) || data.length === 0)
            return null;
        return data;
    }
    async getFinancialRatios(symbol, period = 'annual') {
        const data = await this.request('/ratios', {
            symbol,
            period,
        });
        if (!data || !Array.isArray(data) || data.length === 0)
            return null;
        return data;
    }
    async getIncomeStatement(symbol, period = 'annual') {
        const data = await this.request('/income-statement', {
            symbol,
            period,
        });
        if (!data || !Array.isArray(data) || data.length === 0)
            return null;
        return data;
    }
    async getBalanceSheet(symbol, period = 'annual') {
        const data = await this.request('/balance-sheet-statement', {
            symbol,
            period,
        });
        if (!data || !Array.isArray(data) || data.length === 0)
            return null;
        return data;
    }
    async getCashFlow(symbol, period = 'annual') {
        const data = await this.request('/cash-flow-statement', {
            symbol,
            period,
        });
        if (!data || !Array.isArray(data) || data.length === 0)
            return null;
        return data;
    }
    async getRating(symbol) {
        const data = await this.request('/ratings-snapshot', { symbol });
        if (!data || !Array.isArray(data) || data.length === 0)
            return null;
        return data[0];
    }
    async getStockGrade(symbol) {
        const data = await this.request('/grades', { symbol });
        if (!data || !Array.isArray(data) || data.length === 0)
            return null;
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
    async screenStocks(params) {
        // Short-circuit: Russell 1000 universe is all operating companies,
        // not ETFs or funds. If the caller insists on ETFs/funds we return empty.
        if (params.isEtf === true)
            return [];
        if (params.isFund === true)
            return [];
        // Sector filter: match case-insensitively against universe sectors.
        let candidates = RUSSELL_1000;
        if (params.sector) {
            const needle = params.sector.toLowerCase();
            candidates = candidates.filter((e) => e.sector.toLowerCase() === needle);
            if (candidates.length === 0)
                return [];
        }
        // Batch the universe into /batch-quote calls. FMP accepts many symbols
        // per call; we chunk at 100 to stay safely under URL length limits.
        const BATCH_SIZE = 100;
        const symbols = candidates.map((e) => e.symbol);
        const chunks = [];
        for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
            chunks.push(symbols.slice(i, i + BATCH_SIZE));
        }
        // v1.2.1: collect per-chunk diagnostics to surface in response when
        // something goes wrong (Apify stderr swallowed under LIMITED_PERMISSIONS).
        const chunkResults = await Promise.all(chunks.map(async (c, i) => {
            const t0 = Date.now();
            const data = await this.getBatchQuote(c);
            const ms = Date.now() - t0;
            // eslint-disable-next-line no-console
            console.log(`[screen_stocks] chunk ${i} size=${c.length} returned=${data.length} in ${ms}ms`);
            return { size: c.length, returned: data.length, ms, data };
        }));
        this._lastScreenDiag = chunkResults.map(({ size, returned, ms }) => ({ size, returned, ms }));
        const quotes = chunkResults.flatMap((r) => r.data);
        // Apply remaining filters in-memory.
        const results = [];
        for (const q of quotes) {
            if (!q.symbol)
                continue;
            const universeEntry = UNIVERSE_BY_SYMBOL.get(q.symbol);
            // Defensive: skip anything not in the universe (shouldn't happen).
            if (!universeEntry)
                continue;
            const marketCap = typeof q.marketCap === 'number' ? q.marketCap : null;
            const price = typeof q.price === 'number' ? q.price : null;
            const volume = typeof q.volume === 'number' ? q.volume : null;
            if (params.marketCapMoreThan !== undefined && (marketCap === null || marketCap < params.marketCapMoreThan))
                continue;
            if (params.marketCapLowerThan !== undefined && (marketCap === null || marketCap > params.marketCapLowerThan))
                continue;
            if (params.priceMoreThan !== undefined && (price === null || price < params.priceMoreThan))
                continue;
            if (params.priceLowerThan !== undefined && (price === null || price > params.priceLowerThan))
                continue;
            if (params.volumeMoreThan !== undefined && (volume === null || volume < params.volumeMoreThan))
                continue;
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
    async getBatchQuote(symbols) {
        const data = await this.request('/batch-quote', {
            symbols: symbols.join(','),
        });
        if (!data || !Array.isArray(data))
            return [];
        return data;
    }
}
//# sourceMappingURL=fmp.js.map