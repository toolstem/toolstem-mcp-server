import { Actor } from 'apify';

import { getStockSnapshot } from './tools/get-stock-snapshot.js';
import { getCompanyMetrics } from './tools/get-company-metrics.js';
import { compareCompanies } from './tools/compare-companies.js';

interface ActorInput {
  tool: 'get_stock_snapshot' | 'get_company_metrics' | 'compare_companies';
  symbol?: string;
  period?: 'annual' | 'quarter';
  symbols?: string[];
}

async function main(): Promise<void> {
  await Actor.init();

  try {
    const input = await Actor.getInput<ActorInput>();
    if (!input) throw new Error('Input is missing!');
    if (!input.tool) throw new Error('Input field "tool" is required.');

    let result: unknown;

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
        throw new Error(
          `Unknown tool: ${input.tool}. Valid tools: get_stock_snapshot, get_company_metrics, compare_companies.`
        );
    }

    await Actor.pushData(result as Record<string, unknown>);

    const chargeResult = await Actor.charge({ eventName: 'tool-call' });
    // eslint-disable-next-line no-console
    console.log('PPE charge result:', JSON.stringify(chargeResult));

    // Explicitly terminate the Actor run. Without this, the container keeps
    // running until the per-run timeout (120s default) even though the tool
    // has already returned, causing smoke tests and downstream orchestration
    // to see runs as TIMED-OUT.
    await Actor.exit();
  } catch (err) {
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
  } catch {
    process.exit(1);
  }
});