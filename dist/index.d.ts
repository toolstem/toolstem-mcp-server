#!/usr/bin/env node
/**
 * Toolstem MCP Server — entry point.
 *
 * Exposes four curated financial intelligence tools:
 *   - get_stock_snapshot
 *   - get_company_metrics
 *   - screen_stocks
 *   - compare_companies
 *
 * Supports two transports:
 *   - stdio (default) — for Claude Desktop, Smithery, npm installs, etc.
 *   - HTTP (via --http flag) — Streamable HTTP on PORT (default 3000)
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export declare function createServer(): McpServer;
//# sourceMappingURL=index.d.ts.map