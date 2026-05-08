# 📊 Toolstem — Financial Data MCP for AI Agents | Stock Analysis & DCF

[![npm version](https://img.shields.io/npm/v/toolstem-mcp-server)](https://www.npmjs.com/package/toolstem-mcp-server)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-active-teal)](https://registry.modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

**Curated financial data MCP for AI agents — equity research in one call.**

Toolstem is the **financial data MCP** built for AI stock analysis, equity research, and agent-driven investment workflows. Real-time stock data, company fundamentals, DCF valuations, financial metrics, and the ability to compare companies side-by-side — all returned as flat, agent-friendly JSON with derived signals already computed.

Works natively with **Claude**, **OpenAI Agents SDK**, and **LangChain**. Pay-per-call pricing, no subscription. More finance MCP servers (SEC filings, insider transactions, institutional holdings) are on the way.

Unlike passthrough wrappers that just expose a vendor's REST API, every Toolstem tool **combines multiple data sources**, **derives signals**, and **pre-computes the math** an agent would otherwise have to do itself.

One call. One agent-friendly JSON response. No nested arrays to parse, no cross-endpoint stitching, no null-checking boilerplate.

The hosted endpoint lives at **`https://mcp.toolstem.com/mcp/finance`**. Product page: <https://toolstem.com/finance/>.

---

## Free vs paid

- **MCP `initialize` and `tools/list` are free** — discovery, schema introspection, and health checks never cost anything.
- **`tools/call` costs 0.01 USDC on Base mainnet (~$0.01) per invocation, paid via [x402](https://www.x402.org).** No API key, no signup, no marketplace account required — the agent's wallet pays directly.

Self-hosted (stdio or your own HTTP) skips the x402 paywall entirely; you bring your own `FMP_API_KEY` and pay FMP directly.

---

## Try it in Claude Desktop

Drop this into your `claude_desktop_config.json` to use the hosted, pay-per-call endpoint (no API key needed — your agent's wallet pays $0.01 USDC per `tools/call` via x402):

```json
{
  "mcpServers": {
    "toolstem-finance": {
      "url": "https://mcp.toolstem.com/mcp/finance"
    }
  }
}
```

Restart Claude Desktop, then ask: *"Use Toolstem to get a snapshot of NVDA."*

Prefer running locally with your own FMP key? See [Self-hosting](#self-hosting) below.

---

## How it works

Toolstem ships as a Node MCP server (this repo) **and** as a hosted, x402-gated proxy.

```
Agent ──MCP──▶ Cloudflare Worker (x402 paywall) ──MCP──▶ Toolstem MCP server ──REST──▶ Financial Modeling Prep
                  │                                          │
                  └─ free: initialize, tools/list            └─ composite tool: fans out to 3–5 FMP endpoints
                  └─ paid: tools/call → 0.01 USDC on Base       in parallel, derives signals, returns flat JSON
```

- **Cloudflare Worker** terminates the public MCP connection at `mcp.toolstem.com` and enforces the x402 payment for `tools/call`.
- **MCP server** (this package) implements the 3 composite tools and talks to Financial Modeling Prep.
- **x402 on Base mainnet** handles the micropayment — settlement is sub-second, no off-chain accounts.

---

## Tools

Three composite tools, each one synthesizing multiple FMP endpoints with derived signals and pre-computed math.

| Tool | Title | Required input | Optional input |
|---|---|---|---|
| [`get_stock_snapshot`](#get_stock_snapshot) | Stock Snapshot | `symbol` (string) | — |
| [`get_company_metrics`](#get_company_metrics) | Company Metrics | `symbol` (string) | `period` (`annual` \| `quarter`, default `annual`) |
| [`compare_companies`](#compare_companies) | Company Comparison | `symbols` (string[2..5]) | — |

All three are read-only, idempotent, and safe for agent retry.

### `get_stock_snapshot`

Comprehensive stock overview combining quote, profile, DCF valuation, and rating into a single response.

**Input:**

```json
{
  "symbol": "AAPL"
}
```

**Example output (truncated):**

```json
{
  "symbol": "AAPL",
  "company_name": "Apple Inc.",
  "sector": "Technology",
  "industry": "Consumer Electronics",
  "exchange": "NASDAQ",
  "price": {
    "current": 178.52,
    "change": 2.34,
    "change_percent": 1.33,
    "day_high": 179.80,
    "day_low": 175.10,
    "year_high": 199.62,
    "year_low": 130.20,
    "distance_from_52w_high_percent": -10.57,
    "distance_from_52w_low_percent": 37.11
  },
  "valuation": {
    "market_cap": 2780000000000,
    "market_cap_readable": "$2.78T",
    "pe_ratio": 29.5,
    "dcf_value": 195.20,
    "dcf_upside_percent": 9.35,
    "dcf_signal": "FAIRLY VALUED"
  },
  "rating": {
    "score": 4,
    "recommendation": "Buy",
    "dcf_score": 5,
    "roe_score": 4,
    "roa_score": 4,
    "de_score": 5,
    "pe_score": 3
  },
  "fundamentals_summary": {
    "beta": 1.28,
    "avg_volume": 55000000,
    "employees": 164000,
    "ipo_date": "1980-12-12",
    "description": "Apple Inc. designs, manufactures..."
  },
  "meta": {
    "source": "Toolstem via Financial Modeling Prep",
    "timestamp": "2026-04-17T18:30:00Z",
    "data_delay": "End of day"
  }
}
```

**Derived fields (not in raw APIs):**

- `dcf_signal` — `UNDERVALUED` if DCF upside > 10%, `OVERVALUED` if < -10%, else `FAIRLY VALUED`.
- `market_cap_readable` — human-friendly `$2.78T`, `$450.2B`, `$12.5M` format.
- `distance_from_52w_high_percent` / `distance_from_52w_low_percent` — pre-computed range position.

---

### `get_company_metrics`

Deep fundamentals analysis — profitability, financial health, cash flow, growth, and per-share metrics — synthesized from 5 financial statements endpoints.

**Input:**

```json
{
  "symbol": "AAPL",
  "period": "annual"
}
```

`period` accepts `annual` (default) or `quarter`.

**Example output (truncated):**

```json
{
  "symbol": "AAPL",
  "period": "annual",
  "latest_period_date": "2025-09-30",
  "profitability": {
    "revenue": 394328000000,
    "revenue_readable": "$394.3B",
    "revenue_growth_yoy": 7.8,
    "net_income": 96995000000,
    "net_income_readable": "$97.0B",
    "gross_margin": 46.2,
    "operating_margin": 31.5,
    "net_margin": 24.6,
    "roe": 160.5,
    "roa": 28.3,
    "roic": 56.2,
    "margin_trend": "EXPANDING"
  },
  "financial_health": {
    "total_debt": 111000000000,
    "total_cash": 65000000000,
    "net_debt": 46000000000,
    "debt_to_equity": 1.87,
    "current_ratio": 1.07,
    "interest_coverage": 41.2,
    "health_signal": "STRONG"
  },
  "cash_flow": {
    "operating_cash_flow": 118000000000,
    "free_cash_flow": 104000000000,
    "free_cash_flow_readable": "$104.0B",
    "fcf_margin": 26.4,
    "capex": 14000000000,
    "dividends_paid": 15000000000,
    "buybacks": 89000000000,
    "fcf_yield": 3.7
  },
  "growth_3yr": {
    "revenue_cagr": 8.2,
    "net_income_cagr": 10.1,
    "fcf_cagr": 9.5,
    "growth_signal": "ACCELERATING"
  },
  "per_share": {
    "eps": 6.42,
    "book_value_per_share": 3.99,
    "fcf_per_share": 6.89,
    "dividend_per_share": 0.96,
    "payout_ratio": 14.9
  },
  "meta": {
    "source": "Toolstem via Financial Modeling Prep",
    "timestamp": "2026-04-17T18:30:00Z",
    "periods_analyzed": 3,
    "data_delay": "End of day"
  }
}
```

**Derived fields:**

- `margin_trend` — `EXPANDING`, `STABLE`, or `CONTRACTING` based on net margin series direction.
- `health_signal` — `STRONG`, `ADEQUATE`, or `WEAK` from debt-to-equity, current ratio, and interest coverage.
- `growth_signal` — `ACCELERATING`, `STEADY`, or `DECELERATING` based on YoY growth trajectory.
- `revenue_cagr`, `net_income_cagr`, `fcf_cagr` — compound annual growth rates over the analyzed window.
- `fcf_margin`, `fcf_yield` — pre-computed from cash flow + revenue + market cap.

---

### `compare_companies`

Side-by-side comparison of 2–5 companies across price, valuation, profitability, financial health, growth, dividends, and analyst ratings.

**Input:**

```json
{
  "symbols": ["AAPL", "MSFT", "GOOGL"]
}
```

`symbols` must be an array of 2 to 5 ticker strings.

**Example output (truncated):**

```json
{
  "symbols_compared": ["AAPL", "MSFT", "GOOGL"],
  "comparison_date": "2026-04-20T18:30:00Z",
  "companies": [
    {
      "symbol": "AAPL",
      "company_name": "Apple Inc.",
      "sector": "Technology",
      "price": { "current": 178.52, "change_percent": 1.33 },
      "valuation": { "pe_ratio": 29.5, "dcf_upside_percent": 9.35 },
      "profitability": { "net_margin": 24.6, "roe": 160.5, "roic": 56.2 },
      "financial_health": { "debt_to_equity": 1.87, "current_ratio": 1.07 },
      "growth": { "revenue_growth_yoy": 7.8, "earnings_growth_yoy": 10.1 },
      "dividend": { "dividend_yield": 0.5, "payout_ratio": 14.9 },
      "rating": { "score": 4, "recommendation": "Buy" }
    }
  ],
  "rankings": {
    "lowest_pe": "GOOGL",
    "highest_margin": "AAPL",
    "strongest_balance_sheet": "GOOGL",
    "best_growth": "MSFT",
    "most_undervalued": "GOOGL",
    "highest_rated": "MSFT"
  },
  "meta": {
    "source": "Toolstem via Financial Modeling Prep",
    "timestamp": "2026-04-20T18:30:00Z",
    "data_delay": "Real-time during market hours",
    "api_calls_made": 19
  }
}
```

**Derived fields:**

- `rankings` — automatically computed: `lowest_pe`, `highest_margin`, `strongest_balance_sheet`, `best_growth`, `most_undervalued`, `highest_rated`.
- All valuation, profitability, health, and growth metrics pre-computed per company.
- Uses batch quote for efficient multi-symbol price retrieval.

---

## Why Toolstem?

Most financial MCP servers expose one tool per API endpoint — forcing your agent to make 4–5 sequential calls, write glue code, and reason about raw data shapes. Toolstem is built differently:

- **Parallel data fetching** — every tool fans out to multiple sources concurrently.
- **Derived signals** — human-readable recommendations like `UNDERVALUED`, `STRONG`, `ACCELERATING` computed from raw numbers.
- **Pre-computed math** — CAGRs, YoY growth, margin trends, distance from 52-week high/low, FCF yield, and more are already in the response.
- **Flat, predictable schema** — no deeply nested vendor quirks leaking into agent prompts.
- **Graceful degradation** — if one upstream endpoint fails, the rest of the response still comes through with nulls in place.

---

## Hosted endpoint (recommended)

```
https://mcp.toolstem.com/mcp/finance
```

- Streamable HTTP MCP transport.
- Free for `initialize` and `tools/list`.
- 0.01 USDC on Base mainnet per `tools/call`, settled via [x402](https://www.x402.org).
- No API key required — your agent's wallet pays directly.

### Use with LangChain.js

The official [`@langchain/mcp-adapters`](https://www.npmjs.com/package/@langchain/mcp-adapters) library connects directly:

```ts
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const client = new MultiServerMCPClient({
  toolstem_finance: {
    transport: "http",
    url: "https://mcp.toolstem.com/mcp/finance",
    // Add your x402-signing middleware via headers, OR run an x402
    // proxy locally and point url at it. See https://www.x402.org/clients.
  },
});

const tools = await client.getTools();
const agent = createReactAgent({ llm: new ChatOpenAI({ model: "gpt-4o-mini" }), tools });
await agent.invoke({ messages: "Compare AAPL, MSFT, and GOOGL on valuation and growth." });
```

---

## Self-hosting

Run the Node MCP server locally with your own FMP key — no x402, no per-call charge beyond your FMP quota.

### npm

```bash
npm install -g toolstem-mcp-server
```

**stdio** (default — for Claude Desktop, Cursor, etc.):

```bash
FMP_API_KEY=your_key_here toolstem-mcp-server
```

**HTTP — local only** (default, binds 127.0.0.1):

```bash
FMP_API_KEY=your_key_here toolstem-mcp-server --http
```

**HTTP — remote + auth** (binds 0.0.0.0, requires bearer token):

```bash
FMP_API_KEY=your_key ALLOW_REMOTE=1 MCP_AUTH_TOKEN=my-secret toolstem-mcp-server --http
```

Clients must send `Authorization: Bearer my-secret` on every `/mcp` request.

**HTTP — remote, auth explicitly disabled** (not recommended):

```bash
FMP_API_KEY=your_key ALLOW_REMOTE=1 MCP_AUTH_DISABLED=1 toolstem-mcp-server --http
```

> **Warning:** This exposes your FMP API key to anyone who can reach the port. Only use for trusted networks or development.

### Claude Desktop (self-hosted)

```json
{
  "mcpServers": {
    "toolstem": {
      "command": "npx",
      "args": ["-y", "toolstem-mcp-server"],
      "env": {
        "FMP_API_KEY": "your_fmp_api_key"
      }
    }
  }
}
```

### From source

```bash
npm install
npm run build
FMP_API_KEY=your_key npm run start:http
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FMP_API_KEY` | Yes (self-hosted) | Financial Modeling Prep API key. Get one at [financialmodelingprep.com](https://financialmodelingprep.com). Not needed when calling the hosted endpoint. |
| `PORT` | No | Port for HTTP transport. Defaults to `3000`. |
| `ALLOW_REMOTE` | No | Set to `1` to bind HTTP on `0.0.0.0` instead of `127.0.0.1`. |
| `MCP_AUTH_TOKEN` | When `ALLOW_REMOTE=1` | Bearer token for authenticating `/mcp` requests. |
| `MCP_AUTH_DISABLED` | No | Set to `1` to explicitly skip auth even with `ALLOW_REMOTE=1`. |

---

## Development

```bash
npm install
npm run dev           # stdio, hot reload via tsx
npm run build         # TypeScript -> dist/
npm start             # run built stdio server
npm run start:http    # run built HTTP server
```

---

## Architecture

```
src/
├── index.ts          # MCP server entry (stdio + Streamable HTTP)
├── actor.ts          # Apify Actor entry (legacy)
├── services/
│   └── fmp.ts        # Financial Modeling Prep API client
├── tools/
│   ├── get-stock-snapshot.ts
│   ├── get-company-metrics.ts
│   └── compare-companies.ts
└── utils/
    └── formatting.ts # Market cap formatting, CAGR, trend signals
```

All FMP endpoints are wrapped in a single `FmpClient` class. Tool implementations fan out to multiple client methods in parallel via `Promise.all`, then synthesize the merged result.

---

## License

MIT — see [LICENSE](./LICENSE).

---

**Toolstem** — curated financial intelligence for the agent-native economy. <https://toolstem.com/finance/>
