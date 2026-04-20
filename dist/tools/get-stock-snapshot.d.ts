/**
 * Tool: get_stock_snapshot
 * Combines FMP quote + profile + DCF + rating into a single, agent-ready response.
 */
import { FmpClient } from '../services/fmp.js';
export interface StockSnapshot {
    symbol: string;
    company_name: string | null;
    sector: string | null;
    industry: string | null;
    exchange: string | null;
    price: {
        current: number | null;
        change: number | null;
        change_percent: number | null;
        day_high: number | null;
        day_low: number | null;
        year_high: number | null;
        year_low: number | null;
        distance_from_52w_high_percent: number | null;
        distance_from_52w_low_percent: number | null;
    };
    valuation: {
        market_cap: number | null;
        market_cap_readable: string | null;
        pe_ratio: number | null;
        dcf_value: number | null;
        dcf_upside_percent: number | null;
        dcf_signal: 'UNDERVALUED' | 'FAIRLY VALUED' | 'OVERVALUED' | null;
    };
    rating: {
        score: number | null;
        recommendation: string | null;
        dcf_score: number | null;
        roe_score: number | null;
        roa_score: number | null;
        de_score: number | null;
        pe_score: number | null;
    } | null;
    fundamentals_summary: {
        beta: number | null;
        avg_volume: number | null;
        employees: number | null;
        ipo_date: string | null;
        description: string | null;
    };
    meta: {
        source: string;
        timestamp: string;
        data_delay: string;
    };
}
export declare function getStockSnapshot(symbol: string, client?: FmpClient): Promise<StockSnapshot>;
//# sourceMappingURL=get-stock-snapshot.d.ts.map