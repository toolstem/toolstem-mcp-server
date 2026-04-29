/**
 * Toolstem Finance MCP — Apify Actor entry point.
 *
 * Three-tier per-result pricing model (v1.2.9+):
 *
 *   Tool                 | PPE Event Name       | Tier     | Price
 *   ---------------------|----------------------|----------|-------
 *   get_stock_snapshot   | tool-call            | Cheap    | $0.005
 *   get_company_metrics  | tool-call-standard   | Standard | $0.05
 *   compare_companies    | tool-call-premium    | Premium  | $0.50
 *
 * Dollar amounts for `tool-call-standard` and `tool-call-premium` are
 * configured in the Apify Console PPE settings — this code only fires
 * `Actor.charge({ eventName })`. The Apify platform then deducts the
 * configured amount from the caller's prepaid credit balance.
 *
 * Default-demo runs (no input.tool provided) skip all PPE charges — they
 * exist solely for directory health-check probes and first-time evaluators
 * and must never generate revenue or drain FMP API quota unnecessarily.
 */
import { Actor } from 'apify';
import { getStockSnapshot } from './tools/get-stock-snapshot.js';
import { getCompanyMetrics } from './tools/get-company-metrics.js';
import { compareCompanies } from './tools/compare-companies.js';
async function main() {
    await Actor.init();
    try {
        const rawInput = await Actor.getInput();
        // Default behavior: when no input or no tool is provided (e.g. directory
        // health-check probes, first-time evaluators clicking "Run" with empty
        // fields), demonstrate the most common tool with a well-known ticker so
        // the run produces a useful result instead of an empty exit.
        //
        // Default-demo runs are NOT charged the per-call PPE event — health-check
        // probes shouldn't generate revenue and shouldn't drain the FMP daily
        // quota. The result is also cached in the actor's default key-value
        // store under DEMO_CACHE_KEY for DEMO_CACHE_TTL_MS, so a high probe rate
        // does not multiply FMP API consumption.
        const isDefaultDemo = !rawInput || !rawInput.tool;
        const input = {
            tool: rawInput?.tool ?? 'get_stock_snapshot',
            symbol: rawInput?.symbol ?? 'AAPL',
            period: rawInput?.period,
            symbols: rawInput?.symbols,
        };
        if (isDefaultDemo) {
            // eslint-disable-next-line no-console
            console.log(`No tool specified — running default demonstration: ${input.tool}(${input.symbol}). ` +
                `For real usage, specify { "tool": "...", "symbol": "..." } or use the MCP gateway at https://mcp.apify.com/?tools=toolstem/toolstem-mcp-server`);
        }
        // Default-demo cache: if a recent default demo result is in the KV
        // store, serve it instead of calling FMP again. Real (non-default)
        // invocations always go to FMP.
        const DEMO_CACHE_KEY = 'DEFAULT_DEMO_RESULT_V1';
        const DEMO_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
        let result;
        if (isDefaultDemo) {
            const cached = (await Actor.getValue(DEMO_CACHE_KEY));
            if (cached && typeof cached.at === 'number' && Date.now() - cached.at < DEMO_CACHE_TTL_MS) {
                // eslint-disable-next-line no-console
                console.log(`Serving default demonstration from cache (age: ${Math.round((Date.now() - cached.at) / 1000)}s).`);
                result = cached.result;
                await Actor.pushData(result);
                await Actor.exit();
                return;
            }
        }
        switch (input.tool) {
            case 'get_stock_snapshot': {
                if (!input.symbol || typeof input.symbol !== 'string') {
                    throw new Error('Input field "symbol" is required for get_stock_snapshot.');
                }
                result = await getStockSnapshot(input.symbol);
                break;
            }
            case 'get_company_metrics': {
                if (!input.symbol || typeof input.symbol !== 'string') {
                    throw new Error('Input field "symbol" is required for get_company_metrics.');
                }
                const period = input.period === 'quarter' ? 'quarter' : 'annual';
                result = await getCompanyMetrics(input.symbol, period);
                break;
            }
            case 'compare_companies': {
                if (!input.symbols || !Array.isArray(input.symbols) || input.symbols.length < 2) {
                    throw new Error('Input field "symbols" is required for compare_companies (array of 2-5 ticker symbols).');
                }
                result = await compareCompanies(input.symbols);
                break;
            }
            default:
                throw new Error(`Unknown tool: ${input.tool}. Valid tools: get_stock_snapshot, get_company_metrics, compare_companies.`);
        }
        await Actor.pushData(result);
        if (isDefaultDemo) {
            // Cache the demo result so subsequent probes are served from cache,
            // not by calling FMP again.
            await Actor.setValue(DEMO_CACHE_KEY, { at: Date.now(), result });
            // eslint-disable-next-line no-console
            console.log('Default demonstration result cached for 6h. PPE charge skipped (probe).');
        }
        else {
            const PRICING_TIER = {
                get_stock_snapshot: 'tool-call', // Cheap    — $0.005
                get_company_metrics: 'tool-call-standard', // Standard — $0.05
                compare_companies: 'tool-call-premium', // Premium  — $0.50
            };
            const eventName = PRICING_TIER[input.tool];
            const chargeResult = await Actor.charge({ eventName });
            // eslint-disable-next-line no-console
            console.log(`PPE charge result (${eventName}):`, JSON.stringify(chargeResult));
        }
        // Explicitly terminate the Actor run. Without this, the container keeps
        // running until the per-run timeout (120s default) even though the tool
        // has already returned, causing smoke tests and downstream orchestration
        // to see runs as TIMED-OUT.
        await Actor.exit();
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('Actor run failed:', err);
        await Actor.fail(err instanceof Error ? err.message : String(err));
    }
}
main().catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled error:', err);
    try {
        await Actor.fail(err instanceof Error ? err.message : String(err));
    }
    catch {
        process.exit(1);
    }
});
//# sourceMappingURL=actor.js.map