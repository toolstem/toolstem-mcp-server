/**
 * Apify Actor entry point for Toolstem financial data tools.
 * Routes input to the correct tool, pushes the result to the default dataset,
 * and emits a per-call event for Pay-Per-Event (PPE) monetization.
 */

import { Actor } from 'apify';

import { getStockSnapshot } from './tools/get-stock-snapshot.js';
import { getCompanyMetrics } from './tools/get-company-metrics.js';
import { screenStocks } from './tools/screen-stocks.js';
import { compareCompanies } from './tools/compare-companies.js';

interface ActorInput {
  tool: 'get_stock_snapshot' | 'get_company_metrics' | 'screen_stocks' | 'compare_companies';
  // get_stock_snapshot / get_company_metrics
  symbol?: string;
  period?: 'annual' | 'quarter';
  // screen_stocks
  sector?: string;
  industry?: string;
  exchange?: string;
  country?: string;
  market_cap_min?: number;
  market_cap_max?: number;
  price_min?: number;
  price_max?: number;
  beta_min?: number;
  beta_max?: number;
  volume_min?: number;
  dividend_min?: number;
  is_etf?: boolean;
  is_fund?: boolean;
  is_actively_trading?: boolean;
  limit?: number;
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
    } else if (input.tool === 'screen_stocks') {
      result = await screenStocks({
        sector: input.sector,
        industry: input.industry,
        exchange: input.exchange,
        country: input.country,
        market_cap_min: input.market_cap_min,
        market_cap_max: input.market_cap_max,
        price_min: input.price_min,
        price_max: input.price_max,
        beta_min: input.beta_min,
        beta_max: input.beta_max,
        volume_min: input.volume_min,
        dividend_min: input.dividend_min,
        is_etf: input.is_etf,
        is_fund: input.is_fund,
        is_actively_trading: input.is_actively_trading,
        limit: input.limit,
      });
    } else if (input.tool === 'compare_companies') {
      if (!input.symbols || !Array.isArray(input.symbols) || input.symbols.length < 2) {
        throw new Error('Input field "symbols" is required for compare_companies (array of 2-5 ticker symbols).');
      }
      result = await compareCompanies(input.symbols);
    } else {
      throw new Error(`Unknown tool: ${input.tool}. Valid tools: get_stock_snapshot, get_company_metrics, screen_stocks, compare_companies`);
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
