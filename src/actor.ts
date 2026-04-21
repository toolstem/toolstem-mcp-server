/**
 * Apify Actor entry point for Toolstem financial data tools.
 * Routes input to the correct tool, pushes the result to the default dataset,
 * and emits a per-call event for Pay-Per-Event (PPE) monetization.
 */

import { Actor } from 'apify';

import { getStockSnapshot } from './tools/get-stock-snapshot.js';
import { getCompanyMetrics } from './tools/get-company-metrics.js';
import { compareCompanies } from './tools/compare-companies.js';

// Note: screen_stocks is temporarily disabled in v1.2.2 — returning to v1.3
// once the FMP free-tier batch-quote issue is resolved. Source lives in
// src/tools/screen-stocks.ts and src/data/universe.ts for the v1.3 refactor.

interface ActorInput {
  tool: 'get_stock_snapshot' | 'get_company_metrics' | 'compare_companies';
  // get_stock_snapshot / get_company_metrics
  symbol?: string;
  period?: 'annual' | 'quarter';
  // compare_companies
  symbols?: string[];
}

async function main(): Promise<void> {
  await Actor.init();

  try {
    const input = await Actor.getInput<ActorInput>();
    if (!input) {
      throw new Error('Input is missing!');
    }
    if (!input.tool) {
      throw new Error('Input field "tool" is required.');
    }
    let result: unknown;

    if (input.tool === 'get_stock_snapshot') {
      if (!input.symbol || typeof input.symbol !== 'string') {
        throw new Error('Input field "symbol" is required for get_stock_snapshot.');
      }
      result = await getStockSnapshot(input.symbol);
    } else if (input.tool === 'get_company_metrics') {
      if (!input.symbol || typeof input.symbol !== 'string') {
        throw new Error('Input field "symbol" is required for get_company_metrics.');
      }
      const period = input.period === 'quarter' ? 'quarter' : 'annual';
      result = await getCompanyMetrics(input.symbol, period);
    } else if (input.tool === 'compare_companies') {
      if (!input.symbols || !Array.isArray(input.symbols) || input.symbols.length < 2) {
        throw new Error('Input field "symbols" is required for compare_companies (array of 2-5 ticker symbols).');
      }
      result = await compareCompanies(input.symbols);
    } else {
      throw new Error(`Unknown tool: ${input.tool}. Valid tools: get_stock_snapshot, get_company_metrics, compare_companies. (screen_stocks is temporarily disabled in v1.2.2 and will return in v1.3.)`);
    }

    // Push result to the default dataset.
    await Actor.pushData(result as Record<string, unknown>);

    // Charge per event for PPE monetization. Wrapped so a missing event
    // configuration doesn't crash the run.
    try {
      const maybeCharge = (Actor as unknown as {
        charge?: (args: { eventName: string; count?: number }) => Promise<unknown>;
      }).charge;
      if (typeof maybeCharge === 'function') {
        await maybeCharge.call(Actor, { eventName: 'tool-call', count: 1 });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('PPE charge failed (continuing):', err instanceof Error ? err.message : err);
    }

    await Actor.exit();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Actor run failed:', err);
    await Actor.fail(err instanceof Error ? err.message : String(err));
  }
}

main().catch(async (err) => {
  // Unhandled error outside Actor lifecycle
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  try {
    await Actor.fail(err instanceof Error ? err.message : String(err));
  } catch {
    process.exit(1);
  }
});
