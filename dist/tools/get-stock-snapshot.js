/**
 * Tool: get_stock_snapshot
 * Combines FMP quote + profile + DCF + rating into a single, agent-ready response.
 */
import { FmpClient } from '../services/fmp.js';
import { formatMarketCap, round2, safeNumber } from '../utils/formatting.js';
function deriveDcfSignal(upside) {
    if (upside === null)
        return null;
    if (upside > 10)
        return 'UNDERVALUED';
    if (upside < -10)
        return 'OVERVALUED';
    return 'FAIRLY VALUED';
}
export async function getStockSnapshot(symbol, client) {
    const fmp = client ?? new FmpClient();
    const upperSymbol = symbol.trim().toUpperCase();
    const [quote, profile, dcf, rating] = await Promise.all([
        fmp.getQuote(upperSymbol).catch(() => null),
        fmp.getProfile(upperSymbol).catch(() => null),
        fmp.getDCF(upperSymbol).catch(() => null),
        fmp.getRating(upperSymbol).catch(() => null),
    ]);
    // Price section
    const current = safeNumber(quote?.price);
    const change = safeNumber(quote?.change);
    const changePercent = safeNumber(quote?.changesPercentage);
    const dayHigh = safeNumber(quote?.dayHigh);
    const dayLow = safeNumber(quote?.dayLow);
    const yearHigh = safeNumber(quote?.yearHigh);
    const yearLow = safeNumber(quote?.yearLow);
    let distanceFromHigh = null;
    if (current !== null && yearHigh !== null && yearHigh > 0) {
        distanceFromHigh = round2(((current - yearHigh) / yearHigh) * 100);
    }
    let distanceFromLow = null;
    if (current !== null && yearLow !== null && yearLow > 0) {
        distanceFromLow = round2(((current - yearLow) / yearLow) * 100);
    }
    // Valuation section
    const marketCap = safeNumber(quote?.marketCap) ?? safeNumber(profile?.marketCap) ?? safeNumber(profile?.mktCap);
    const peRatio = safeNumber(quote?.pe);
    const dcfValue = safeNumber(dcf?.dcf) ?? safeNumber(profile?.dcf);
    let dcfUpside = null;
    if (dcfValue !== null && current !== null && current > 0) {
        dcfUpside = round2(((dcfValue - current) / current) * 100);
    }
    // Rating section
    let ratingBlock = null;
    if (rating) {
        ratingBlock = {
            score: safeNumber(rating.ratingScore),
            recommendation: rating.ratingRecommendation ?? rating.rating ?? null,
            dcf_score: safeNumber(rating.ratingDetailsDCFScore),
            roe_score: safeNumber(rating.ratingDetailsROEScore),
            roa_score: safeNumber(rating.ratingDetailsROAScore),
            de_score: safeNumber(rating.ratingDetailsDEScore),
            pe_score: safeNumber(rating.ratingDetailsPEScore),
        };
    }
    // Fundamentals
    const employeesRaw = profile?.fullTimeEmployees;
    const employees = employeesRaw !== undefined && employeesRaw !== null
        ? typeof employeesRaw === 'number'
            ? employeesRaw
            : Number.parseInt(String(employeesRaw).replace(/[, ]/g, ''), 10) || null
        : null;
    const avgVolume = safeNumber(quote?.avgVolume) ?? safeNumber(profile?.volAvg);
    const snapshot = {
        symbol: upperSymbol,
        company_name: profile?.companyName ?? quote?.name ?? null,
        sector: profile?.sector ?? null,
        industry: profile?.industry ?? null,
        exchange: profile?.exchangeShortName ?? profile?.exchange ?? quote?.exchange ?? null,
        price: {
            current: current !== null ? round2(current) : null,
            change: change !== null ? round2(change) : null,
            change_percent: changePercent !== null ? round2(changePercent) : null,
            day_high: dayHigh !== null ? round2(dayHigh) : null,
            day_low: dayLow !== null ? round2(dayLow) : null,
            year_high: yearHigh !== null ? round2(yearHigh) : null,
            year_low: yearLow !== null ? round2(yearLow) : null,
            distance_from_52w_high_percent: distanceFromHigh,
            distance_from_52w_low_percent: distanceFromLow,
        },
        valuation: {
            market_cap: marketCap,
            market_cap_readable: marketCap !== null ? formatMarketCap(marketCap) : null,
            pe_ratio: peRatio !== null ? round2(peRatio) : null,
            dcf_value: dcfValue !== null ? round2(dcfValue) : null,
            dcf_upside_percent: dcfUpside,
            dcf_signal: deriveDcfSignal(dcfUpside),
        },
        rating: ratingBlock,
        fundamentals_summary: {
            beta: profile?.beta !== undefined ? round2(profile.beta) : null,
            avg_volume: avgVolume,
            employees,
            ipo_date: profile?.ipoDate ?? null,
            description: profile?.description ?? null,
        },
        meta: {
            source: 'Toolstem via Financial Modeling Prep',
            timestamp: new Date().toISOString(),
            data_delay: 'End of day',
        },
    };
    return snapshot;
}
//# sourceMappingURL=get-stock-snapshot.js.map