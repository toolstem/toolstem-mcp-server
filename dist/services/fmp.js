/**
 * Financial Modeling Prep (FMP) API client.
 * Centralizes all HTTP access to the FMP stable API. All methods return null
 * on empty/errored responses so callers can handle graceful degradation.
 */
const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';
export class FmpClient {
    apiKey;
    baseUrl;
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
                return null;
            }
            const body = (await res.json());
            if (body === null || body === undefined)
                return null;
            if (Array.isArray(body) && body.length === 0)
                return null;
            if (typeof body === 'object' &&
                body !== null &&
                'Error Message' in body) {
                return null;
            }
            return body;
        }
        catch {
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
     * Screen stocks by fundamental criteria.
     * All filter params are optional; omit to not filter on that dimension.
     */
    async screenStocks(params) {
        const queryParams = {};
        if (params.sector !== undefined)
            queryParams.sector = params.sector;
        if (params.industry !== undefined)
            queryParams.industry = params.industry;
        if (params.exchange !== undefined)
            queryParams.exchange = params.exchange;
        if (params.country !== undefined)
            queryParams.country = params.country;
        if (params.marketCapMoreThan !== undefined)
            queryParams.marketCapMoreThan = String(params.marketCapMoreThan);
        if (params.marketCapLowerThan !== undefined)
            queryParams.marketCapLowerThan = String(params.marketCapLowerThan);
        if (params.priceMoreThan !== undefined)
            queryParams.priceMoreThan = String(params.priceMoreThan);
        if (params.priceLowerThan !== undefined)
            queryParams.priceLowerThan = String(params.priceLowerThan);
        if (params.betaMoreThan !== undefined)
            queryParams.betaMoreThan = String(params.betaMoreThan);
        if (params.betaLowerThan !== undefined)
            queryParams.betaLowerThan = String(params.betaLowerThan);
        if (params.volumeMoreThan !== undefined)
            queryParams.volumeMoreThan = String(params.volumeMoreThan);
        if (params.dividendMoreThan !== undefined)
            queryParams.dividendMoreThan = String(params.dividendMoreThan);
        if (params.isEtf !== undefined)
            queryParams.isEtf = String(params.isEtf);
        if (params.isFund !== undefined)
            queryParams.isFund = String(params.isFund);
        if (params.isActivelyTrading !== undefined)
            queryParams.isActivelyTrading = String(params.isActivelyTrading);
        if (params.limit !== undefined)
            queryParams.limit = String(params.limit);
        const data = await this.request('/company-screener', queryParams);
        if (!data || !Array.isArray(data))
            return [];
        return data;
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