#!/usr/bin/env node
/**
 * Toolstem MCP Server — entry point.
 *
 * Exposes two curated financial intelligence tools:
 *   - get_stock_snapshot
 *   - get_company_metrics
 *
 * Supports two transports:
 *   - stdio (default) — for Claude Desktop, Smithery, npm installs, etc.
 *   - HTTP (via --http flag) — Streamable HTTP on PORT (default 3000)
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getStockSnapshot } from './tools/get-stock-snapshot.js';
import { getCompanyMetrics } from './tools/get-company-metrics.js';
// -----------------------------------------------------------------------------
// Zod schemas mirroring tool outputs (for structuredContent validation)
// -----------------------------------------------------------------------------
const StockSnapshotShape = {
    symbol: z.string(),
    company_name: z.string().nullable(),
    sector: z.string().nullable(),
    industry: z.string().nullable(),
    exchange: z.string().nullable(),
    price: z.object({
        current: z.number().nullable(),
        change: z.number().nullable(),
        change_percent: z.number().nullable(),
        day_high: z.number().nullable(),
        day_low: z.number().nullable(),
        year_high: z.number().nullable(),
        year_low: z.number().nullable(),
        distance_from_52w_high_percent: z.number().nullable(),
        distance_from_52w_low_percent: z.number().nullable(),
    }),
    valuation: z.object({
        market_cap: z.number().nullable(),
        market_cap_readable: z.string().nullable(),
        pe_ratio: z.number().nullable(),
        dcf_value: z.number().nullable(),
        dcf_upside_percent: z.number().nullable(),
        dcf_signal: z.enum(['UNDERVALUED', 'FAIRLY VALUED', 'OVERVALUED']).nullable(),
    }),
    rating: z
        .object({
        score: z.number().nullable(),
        recommendation: z.string().nullable(),
        dcf_score: z.number().nullable(),
        roe_score: z.number().nullable(),
        roa_score: z.number().nullable(),
        de_score: z.number().nullable(),
        pe_score: z.number().nullable(),
    })
        .nullable(),
    fundamentals_summary: z.object({
        beta: z.number().nullable(),
        avg_volume: z.number().nullable(),
        employees: z.number().nullable(),
        ipo_date: z.string().nullable(),
        description: z.string().nullable(),
    }),
    meta: z.object({
        source: z.string(),
        timestamp: z.string(),
        data_delay: z.string(),
    }),
};
const CompanyMetricsShape = {
    symbol: z.string(),
    period: z.enum(['annual', 'quarter']),
    latest_period_date: z.string().nullable(),
    profitability: z.object({
        revenue: z.number().nullable(),
        revenue_readable: z.string().nullable(),
        revenue_growth_yoy: z.number().nullable(),
        net_income: z.number().nullable(),
        net_income_readable: z.string().nullable(),
        gross_margin: z.number().nullable(),
        operating_margin: z.number().nullable(),
        net_margin: z.number().nullable(),
        roe: z.number().nullable(),
        roa: z.number().nullable(),
        roic: z.number().nullable(),
        margin_trend: z.enum(['EXPANDING', 'STABLE', 'CONTRACTING']).nullable(),
    }),
    financial_health: z.object({
        total_debt: z.number().nullable(),
        total_cash: z.number().nullable(),
        net_debt: z.number().nullable(),
        debt_to_equity: z.number().nullable(),
        current_ratio: z.number().nullable(),
        interest_coverage: z.number().nullable(),
        health_signal: z.enum(['STRONG', 'ADEQUATE', 'WEAK']).nullable(),
    }),
    cash_flow: z.object({
        operating_cash_flow: z.number().nullable(),
        free_cash_flow: z.number().nullable(),
        free_cash_flow_readable: z.string().nullable(),
        fcf_margin: z.number().nullable(),
        capex: z.number().nullable(),
        dividends_paid: z.number().nullable(),
        buybacks: z.number().nullable(),
        fcf_yield: z.number().nullable(),
    }),
    growth_3yr: z.object({
        revenue_cagr: z.number().nullable(),
        net_income_cagr: z.number().nullable(),
        fcf_cagr: z.number().nullable(),
        growth_signal: z.enum(['ACCELERATING', 'STEADY', 'DECELERATING']).nullable(),
    }),
    per_share: z.object({
        eps: z.number().nullable(),
        book_value_per_share: z.number().nullable(),
        fcf_per_share: z.number().nullable(),
        dividend_per_share: z.number().nullable(),
        payout_ratio: z.number().nullable(),
    }),
    meta: z.object({
        source: z.string(),
        timestamp: z.string(),
        periods_analyzed: z.number(),
        data_delay: z.string(),
    }),
};
// -----------------------------------------------------------------------------
// Server factory
// -----------------------------------------------------------------------------
export function createServer() {
    const server = new McpServer({
        name: 'toolstem-mcp-server',
        version: '1.0.0',
    });
    server.registerTool('get_stock_snapshot', {
        title: 'Stock Snapshot',
        description: 'Get a comprehensive stock snapshot including real-time price, valuation metrics, DCF analysis, and analyst ratings for any publicly traded company. Returns curated, agent-ready data synthesized from multiple sources in a single call — includes derived signals like dcf_signal (UNDERVALUED/FAIRLY VALUED/OVERVALUED), human-readable market cap, and 52-week range distance. Use this when you need a quick overview of a stock before digging into financials.',
        inputSchema: {
            symbol: z
                .string()
                .min(1)
                .max(10)
                .regex(/^[A-Za-z0-9.^=-]+$/, 'Invalid ticker symbol format')
                .describe('Stock ticker symbol (e.g., AAPL, MSFT, TSLA)'),
        },
        outputSchema: StockSnapshotShape,
    }, async ({ symbol }) => {
        const result = await getStockSnapshot(symbol);
        // Cast is safe: StockSnapshot interface mirrors StockSnapshotShape Zod schema.
        // Both are maintained in this file — keep them in sync when modifying fields.
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result,
        };
    });
    server.registerTool('get_company_metrics', {
        title: 'Company Metrics',
        description: 'Deep financial analysis including profitability, financial health, cash flow, growth (3-year CAGR), and per-share metrics. Synthesizes key metrics, financial ratios, income statement, balance sheet, and cash flow statement into one agent-ready response with derived signals: margin_trend (EXPANDING/STABLE/CONTRACTING), health_signal (STRONG/ADEQUATE/WEAK), and growth_signal (ACCELERATING/STEADY/DECELERATING). Use this for fundamental analysis, financial health checks, or when you need to understand a company\'s trajectory.',
        inputSchema: {
            symbol: z
                .string()
                .min(1)
                .max(10)
                .regex(/^[A-Za-z0-9.^=-]+$/, 'Invalid ticker symbol format')
                .describe('Stock ticker symbol (e.g., AAPL, MSFT, TSLA)'),
            period: z
                .enum(['annual', 'quarter'])
                .default('annual')
                .describe('Reporting period. Defaults to annual.'),
        },
        outputSchema: CompanyMetricsShape,
    }, async ({ symbol, period }) => {
        const result = await getCompanyMetrics(symbol, period ?? 'annual');
        // Cast is safe: CompanyMetrics interface mirrors CompanyMetricsShape Zod schema.
        // Both are maintained in this file — keep them in sync when modifying fields.
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result,
        };
    });
    return server;
}
// -----------------------------------------------------------------------------
// Transport runners
// -----------------------------------------------------------------------------
async function runStdio() {
    if (!process.env.FMP_API_KEY) {
        console.error('ERROR: FMP_API_KEY environment variable is required.');
        process.exit(1);
    }
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Keep process alive — stdio transport handles close events.
}
async function runHttp() {
    if (!process.env.FMP_API_KEY) {
        console.error('ERROR: FMP_API_KEY environment variable is required.');
        process.exit(1);
    }
    const app = express();
    app.use(express.json({ limit: '4mb' }));
    const port = Number.parseInt(process.env.PORT ?? '3000', 10);
    const sessions = new Map();
    // Sweep stale sessions every 60 seconds (30-minute inactivity TTL)
    const SESSION_TTL_MS = 30 * 60 * 1000;
    setInterval(() => {
        const now = Date.now();
        for (const [id, entry] of sessions) {
            if (now - entry.lastActivity > SESSION_TTL_MS) {
                try {
                    entry.transport.close?.();
                }
                catch { /* ignore */ }
                sessions.delete(id);
            }
        }
    }, 60_000).unref();
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', service: 'toolstem-mcp-server', version: '1.0.0' });
    });
    app.post('/mcp', async (req, res) => {
        try {
            const sessionId = req.header('mcp-session-id');
            let transport;
            if (sessionId && sessions.has(sessionId)) {
                const entry = sessions.get(sessionId);
                entry.lastActivity = Date.now();
                transport = entry.transport;
            }
            else {
                // New session (or no session header) — create a fresh transport + server pair.
                transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => randomUUID(),
                    onsessioninitialized: (newId) => {
                        if (transport)
                            sessions.set(newId, { transport, lastActivity: Date.now() });
                    },
                });
                transport.onclose = () => {
                    if (transport?.sessionId) {
                        sessions.delete(transport.sessionId);
                    }
                };
                const server = createServer();
                await server.connect(transport);
            }
            if (!transport) {
                res.status(500).json({ error: 'Failed to initialize transport' });
                return;
            }
            await transport.handleRequest(req, res, req.body);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (!res.headersSent) {
                res.status(500).json({ error: message });
            }
        }
    });
    app.get('/mcp', async (req, res) => {
        const sessionId = req.header('mcp-session-id');
        if (!sessionId || !sessions.has(sessionId)) {
            res.status(400).json({ error: 'Missing or unknown mcp-session-id' });
            return;
        }
        const entry = sessions.get(sessionId);
        entry.lastActivity = Date.now();
        await entry.transport.handleRequest(req, res);
    });
    app.delete('/mcp', async (req, res) => {
        const sessionId = req.header('mcp-session-id');
        if (!sessionId || !sessions.has(sessionId)) {
            res.status(400).json({ error: 'Missing or unknown mcp-session-id' });
            return;
        }
        const entry = sessions.get(sessionId);
        entry.lastActivity = Date.now();
        await entry.transport.handleRequest(req, res);
    });
    app.listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`Toolstem MCP server listening on http://0.0.0.0:${port}/mcp`);
    });
}
// -----------------------------------------------------------------------------
// CLI
// -----------------------------------------------------------------------------
const useHttp = process.argv.includes('--http');
if (useHttp) {
    runHttp().catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to start HTTP server:', err);
        process.exit(1);
    });
}
else {
    runStdio().catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to start stdio server:', err);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map