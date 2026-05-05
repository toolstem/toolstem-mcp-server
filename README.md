# 📊 Toolstem — Financial Data MCP for AI Agents | Stock Analysis & DCF

[![npm version](https://img.shields.io/npm/v/toolstem-mcp-server)](https://www.npmjs.com/package/toolstem-mcp-server)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-active-teal)](https://registry.modelcontextprotocol.io)
[![Hosted](https://img.shields.io/badge/Hosted-mcp.toolstem.com-blue)](https://toolstem.com/finance/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

**Curated financial data MCP for AI agents — equity research in one call.**

Toolstem is a **financial data MCP** designed for autonomous agents doing stock analysis, equity research, and investment workflows. It returns real-time quotes, fundamentals, DCF valuations, and side-by-side comparisons as flat, agent-ready JSON with derived signals (`UNDERVALUED`, `STRONG`, `ACCELERATING`) already computed.

Three composite tools. No marketplace account, no subscription, no API key on the hosted endpoint — agents pay per call directly from their own wallet via [x402](https://www.x402.org). This is the AI-to-AI revenue path.

Works natively with **Claude**, **OpenAI Agents SDK**, and **LangChain.js**. More finance MCPs (SEC filings, insider transactions, institutional holdings) are on the way at [toolstem.com/finance](https://toolstem.com/finance/).

---

## Try it in Claude Desktop

Add this to `claude_desktop_config.json` — no FMP key needed, the hosted proxy handles upstream auth:

```json
{
  "mcpServers": {
    "toolstem-finance": {
      "url": "https://mcp.toolstem.com/mcp/finance"
    }
  }
}
```

Restart Claude Desktop, then ask: *"Use Toolstem to compare AAPL, MSFT, and GOOGL on valuation and growth."*

> **Free vs paid:** MCP `initialize` and `tools/list` are free. `tools/call` costs **0.01 USDC on Base mainnet (~$0.01) per invocation**, paid via x402 on first call. Your wallet client signs the payment automatically.

---

## Tools

The hosted server at `https://mcp.toolstem.com/mcp/finance` exposes **3 composite tools**, all sourced from Financial Modeling Prep:

| Tool | Required input | Optional input | Returns |
|---|---|---|---|
| `get_stock_snapshot` | `symbol` (string) | — | Real-time quote + profile + DCF + analyst rating, with derived `dcf_signal` and 52-week range distance. |
| `get_company_metrics` | `symbol` (string) | `period`: `annual` (default) \| `quarter` | Profitability, financial health, cash flow, 3-year CAGRs, per-share metrics, with `margin_trend` / `health_signal` / `growth_signal`. |
| `compare_companies` | `symbols` (string[2..5]) | — | Side-by-side comparison + auto-computed rankings: `lowest_pe`, `highest_margin`, `strongest_balance_sheet`, `best_growth`, `most_undervalued`, `highest_rated`. |

All three are read-only, idempotent, and synthesize 3+ FMP endpoints into a single response.

### `get_stock_snapshot`

Comprehensive overview combining quote, profile, DCF valuation, and analyst rating.

```json
{ "symbol": "AAPL" }
```

Returns: `symbol`, `company_name`, `sector`, `industry`, `exchange`, `price{current,change,change_percent,day_high,day_low,year_high,year_low,distance_from_52w_high_percent,distance_from_52w_low_percent}`, `valuation{market_cap,market_cap_readable,pe_ratio,dcf_value,dcf_upside_percent,dcf_signal}`, `rating{score,recommendation,dcf_score,roe_score,roa_score,de_score,pe_score}`, `fundamentals_summary{beta,avg_volume,employees,ipo_date,description}`, `meta`.

**Derived fields:** `dcf_signal` (`UNDERVALUED` / `FAIRLY VALUED` / `OVERVALUED`), `market_cap_readable` (`$2.78T`), `distance_from_52w_high_percent`.

### `get_company_metrics`

Deep fundamentals synthesized from key-metrics, ratios, income, balance, and cash flow statements.

```json
{ "symbol": "AAPL", "period": "annual" }
```

Returns: `profitability{revenue,revenue_growth_yoy,gross_margin,operating_margin,net_margin,roe,roa,roic,margin_trend}`, `financial_health{total_debt,net_debt,debt_to_equity,current_ratio,interest_coverage,health_signal}`, `cash_flow{operating_cash_flow,free_cash_flow,fcf_margin,fcf_yield,capex,dividends_paid,buybacks}`, `growth_3yr{revenue_cagr,net_income_cagr,fcf_cagr,growth_signal}`, `per_share{eps,book_value_per_share,fcf_per_share,dividend_per_share,payout_ratio}`, `meta`.

**Derived fields:** `margin_trend` (`EXPANDING` / `STABLE` / `CONTRACTING`), `health_signal` (`STRONG` / `ADEQUATE` / `WEAK`), `growth_signal` (`ACCELERATING` / `STEADY` / `DECELERATING`), 3-year CAGRs, FCF margin and yield.

### `compare_companies`

Side-by-side comparison of 2–5 tickers across price, valuation, profitability, financial health, growth, and dividends.

```json
{ "symbols": ["AAPL", "MSFT", "GOOGL"] }
```

Returns: `companies[]` (per-symbol `price`, `valuation`, `profitability`, `financial_health`, `growth`, `dividend`, `rating`), `rankings{lowest_pe,highest_margin,strongest_balance_sheet,best_growth,most_undervalued,highest_rated}`, `meta{api_calls_made,...}`.

Uses FMP batch quote for efficient multi-symbol price retrieval; per-symbol calls run in parallel.

---

## Why Toolstem?

- **Composite, not passthrough.** Each tool synthesizes 3+ upstream endpoints. Your agent makes one call instead of stitching together quote / profile / DCF / rating itself.
- **Derived signals in-band.** `UNDERVALUED`, `STRONG`, `ACCELERATING` — pre-computed from raw numbers so the model doesn't have to reason about thresholds.
- **Pre-computed math.** CAGRs, YoY growth, margin trends, 52-week range distance, FCF yield — already in the response.
- **Flat, predictable schema.** No deeply nested vendor quirks leaking into agent prompts.
- **Graceful degradation.** If one upstream endpoint fails, the rest of the response still comes through with `null` placeholders.
- **Wallet-native billing.** Hosted endpoint is x402-gated. Agents pay 0.01 USDC per call on Base mainnet — no API key, no signup.

---

## How it works

```
Agent (Claude / GPT / LangChain)
   │  MCP Streamable HTTP
   ▼
mcp.toolstem.com/mcp/finance  ──►  Cloudflare Worker (x402 payment gate)
                                        │  on payment success, forwards to:
                                        ▼
                                   Toolstem MCP server (this repo)
                                        │
                                        ▼
                                   Financial Modeling Prep REST API
```

The Cloudflare Worker validates the x402 payment header, forwards `tools/call` to the Node MCP server (this package), which fans out to FMP endpoints in parallel and synthesizes the composite response. `initialize` and `tools/list` skip the payment gate so agents can discover tools for free before spending.

You can also run the MCP server yourself (stdio or HTTP) with your own FMP key — see **Self-hosting** below.

---

## Use with LangChain.js (hosted, agent pays via x402)

The official [`@langchain/mcp-adapters`](https://www.npmjs.com/package/@langchain/mcp-adapters) library connects directly:

```ts
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const client = new MultiServerMCPClient({
  toolstem_finance: {
    transport: "http",
    url: "https://mcp.toolstem.com/mcp/finance",
    // Add x402-signing middleware via headers, OR run an x402
    // proxy locally and point url at it. See https://www.x402.org/clients.
  },
});

const tools = await client.getTools();
const agent = createReactAgent({ llm: new ChatOpenAI({ model: "gpt-4o-mini" }), tools });
await agent.invoke({ messages: "Compare AAPL, MSFT, and GOOGL on valuation and growth." });
```

---

## Self-hosting

Run the MCP server locally with your own FMP key. No x402, no payments — all calls are free, you supply the upstream credential.

### npm (stdio, local agents)

```bash
npm install -g toolstem-mcp-server
FMP_API_KEY=your_key_here toolstem-mcp-server
```

Local Claude Desktop config:

```json
{
  "mcpServers": {
    "toolstem": {
      "command": "npx",
      "args": ["-y", "toolstem-mcp-server"],
      "env": { "FMP_API_KEY": "your_fmp_api_key" }
    }
  }
}
```

### HTTP (Streamable HTTP transport)

```bash
FMP_API_KEY=your_key PORT=3000 toolstem-mcp-server --http
```

Clients connect to `POST http://your-host:3000/mcp`.

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FMP_API_KEY` | Yes | Financial Modeling Prep API key. Get one at [financialmodelingprep.com](https://financialmodelingprep.com). |
| `PORT` | No | Port for HTTP transport. Defaults to `3000`. |

---

## Development

```bash
npm install
npm run dev           # stdio, hot reload via tsx
npm run build         # TypeScript -> dist/
npm start             # run built stdio server
npm run start:http    # run built HTTP server
```

### Architecture

```
src/
├── index.ts          # MCP server entry (stdio + Streamable HTTP)
├── services/
│   └── fmp.ts        # Financial Modeling Prep API client
├── tools/
│   ├── get-stock-snapshot.ts
│   ├── get-company-metrics.ts
│   └── compare-companies.ts
└── utils/
    └── formatting.ts # Market cap formatting, CAGR, trend signals
```

All FMP endpoints are wrapped in a single `FmpClient`. Tool implementations fan out via `Promise.all` and synthesize the merged result.

---

## License

MIT — see [LICENSE](./LICENSE).

---

**Toolstem** — curated financial intelligence for the agent-native economy. More servers at [toolstem.com/finance](https://toolstem.com/finance/).
