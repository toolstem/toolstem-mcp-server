#!/usr/bin/env node
/**
 * Toolstem MCP Server — entry point.
 *
 * Exposes three curated financial intelligence tools:
 *   - get_stock_snapshot
 *   - get_company_metrics
 *   - compare_companies
 *
 * Note: screen_stocks is temporarily disabled in v1.2.2. It relied on FMP's
 * /stable/batch-quote endpoint, which now requires a paid subscription
 * (HTTP 402 on free tier). Coming back in v1.3 with a refactored implementation.
 *
 * Supports two transports:
 *   - stdio (default) — for Claude Desktop, Smithery, npm installs, etc.
 *   - HTTP (via --http flag) — Streamable HTTP on PORT (default 3000)
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export declare function createServer(): McpServer;
//# sourceMappingURL=index.d.ts.map