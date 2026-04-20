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
}
//# sourceMappingURL=fmp.js.map