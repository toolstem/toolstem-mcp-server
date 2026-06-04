/**
 * Toolstem Finance MCP — Apify Actor entry point.
 *
 * Pay-Per-Event billing model:
 *
 *   All three tools fire the single PPE event `tool-call`.
 *
 * The event name MUST exactly match an event declared in the Apify Console
 * Monetization settings — PPE event definitions live in the Console, not in
 * `.actor/actor.json`. Firing an undeclared event name causes Apify to log it
 * as an "unknown event" and the charge silently fails to attach. The Console
 * declares exactly one event (`tool-call`), so this code fires only that name.
 *
 * Charges are emitted ONLY after a successful upstream response (the tool
 * produced real data). On upstream failure — every FMP request returned an
 * error or empty payload — the run fails and no charge is fired. Callers are
 * never billed for a run that produced no usable data.
 *
 * Default-demo runs (no input.tool provided) skip all PPE charges — they
 * exist solely for directory health-check probes and first-time evaluators
 * and must never generate revenue or drain FMP API quota unnecessarily.
 */
import { Actor } from 'apify';
import { getStockSnapshot } from './tools/get-stock-snapshot.js';
import { getCompanyMetrics } from './tools/get-company-metrics.js';
import { compareCompanies } from './tools/compare-companies.js';
/**
 * Decide whether a tool result reflects a successful upstream response.
 *
 * Each tool degrades gracefully on upstream failure by returning a
 * well-formed object whose data fields are null/empty. That is the right
 * behavior for the MCP client, but it must NOT trigger a charge — billing a
 * caller for an all-null payload is the exact failure this guard prevents.
 *
 * Returns true only when the tool's primary upstream data is present.
 */
function wasUpstreamSuccessful(tool, result) {
    if (result === null || typeof result !== 'object')
        return false;
    const r = result;
    switch (tool) {
        case 'get_stock_snapshot':
            // Primary signal is the live quote price.
            return r.price?.current !== null && r.price?.current !== undefined;
        case 'get_company_metrics':
            // periods_analyzed > 0 means at least one financial statement returned.
            return typeof r.meta?.periods_analyzed === 'number' && r.meta.periods_analyzed > 0;
        case 'compare_companies':
            // Success if at least one compared company has a live price.
            return (Array.isArray(r.companies) &&
                r.companies.some((c) => c?.price?.current !== null && c?.price?.current !== undefined));
        default:
            return false;
    }
}
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
        // Guard: never charge (or even surface results) for a run whose upstream
        // requests all failed. The tool returns an all-null object on total
        // upstream failure; billing that is exactly the bug this prevents.
        const upstreamOk = wasUpstreamSuccessful(input.tool, result);
        if (!isDefaultDemo && !upstreamOk) {
            // eslint-disable-next-line no-console
            console.error(`Upstream data provider returned no usable data for ${input.tool}. ` +
                `No charge fired — failing the run.`);
            await Actor.fail('Upstream data provider returned no usable data. No charge was applied.');
            return;
        }
        await Actor.pushData(result);
        if (isDefaultDemo) {
            // Cache the demo result so subsequent probes are served from cache,
            // not by calling FMP again — but only when it carries real data, so a
            // transient upstream failure doesn't get pinned for 6h.
            if (upstreamOk) {
                await Actor.setValue(DEMO_CACHE_KEY, { at: Date.now(), result });
            }
            // eslint-disable-next-line no-console
            console.log('Default demonstration result served. PPE charge skipped (probe).');
        }
        else {
            // Single declared PPE event. Event names are configured in the Apify
            // Console Monetization settings, not in actor.json; firing a name the
            // Console does not declare logs an "unknown event" and the charge never
            // attaches. The Console declares exactly one event: `tool-call`.
            //
            // The charge fires here, AFTER wasUpstreamSuccessful() confirmed real
            // data was produced — never on an upstream failure.
            const eventName = 'tool-call';
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