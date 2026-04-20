/**
 * Tool: get_company_metrics
 * Deep financial analysis synthesized from key-metrics + ratios + income + balance + cash flow.
 * Produces derived signals (margin_trend, health_signal, growth_signal) and 3-year CAGRs.
 */
import { FmpClient, type Period } from '../services/fmp.js';
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
export declare function getCompanyMetrics(symbol: string, period?: Period, client?: FmpClient): Promise<CompanyMetrics>;
//# sourceMappingURL=get-company-metrics.d.ts.map