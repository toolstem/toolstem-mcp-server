# Changelog

All notable changes to the Toolstem MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-04-20

### Fixed — v1.2.0 screen_stocks returning 0 results (diagnostic build)

Post-publish QA found `screen_stocks` returns 0 results on the live Apify Actor despite the Russell 1000 universe being present. Apify swallows `console.error` output under `LIMITED_PERMISSIONS`, so root cause was unobservable in logs.

v1.2.1 is a diagnostic release that surfaces the failure point directly in the response body:

- Per-chunk batch-quote stats (`size`, `returned`, `ms`) in `meta.diagnostics.chunks`
- Last non-OK HTTP status and response body in `meta.diagnostics.last_http_status` / `last_http_body`
- Switched FMP error logging from `console.error` to `console.log` so Apify captures it

This is a temporary diagnostic build — `meta.diagnostics` will be removed once the batch-quote issue is confirmed and fixed.

## [1.2.0] - 2026-04-20

### Changed — `screen_stocks` now works on FMP's free tier

FMP's `/company-screener` endpoint requires a paid plan (HTTP 402 on free tier), so `screen_stocks` was silently returning zero results for every free-tier user. v1.2.0 replaces the call with a **synthetic screener** that works on the free tier:

- Screens over a fixed **Russell 1000** universe (~1,000 US large/mid-cap stocks, ~93% of US equity market cap) baked into the server at build time.
- Fetches live quotes for the universe via FMP's free-tier `/batch-quote` endpoint and filters in-memory.
- Response time: ~2–4s for the full universe, <1s when filtered by sector.
- Sector names normalized to FMP taxonomy (e.g., `Information Technology` → `Technology`, `Health Care` → `Healthcare`).
- Results sorted by market cap descending.

### Added
- **Universe metadata in every `screen_stocks` response**: `meta.universe` surfaces the universe name (`russell-1000`), description, size (1003), and country (US). Agents can now detect scope and caveat their output appropriately.
- **Unsupported-filter transparency**: `meta.unsupported_filters` lists any filters that were passed but cannot be honored by the free-tier screener. `meta.notes` explains the limitation in plain language.
- Diagnostic stderr logging in FMP request layer (from superseded 1.1.3 work): non-OK HTTP responses, error-message payloads, fetch exceptions, and empty-body cases log to `console.error` for visibility in Apify Actor logs.

### Removed / Limitations
The synthetic screener cannot honor these filters on the free tier (they are accepted and surfaced as `unsupported_filters` in the response):
- `industry` — iShares data has no GICS sub-industry.
- `beta_min` / `beta_max` — not present in `/batch-quote` payload.
- `dividend_min` — not present in `/batch-quote` payload.
- `exchange` — Russell 1000 is always NYSE/NASDAQ.
- `country` — Russell 1000 is always US (non-US country filters return unsupported).

To use these filters, upgrade to an FMP Starter plan ($19/mo) and revert to the paid `/company-screener` endpoint.

### Docs
- README updated with universe-scope disclosure and filter support matrix.

## [1.1.2] - 2026-04-20

### Fixed
- **Critical**: v1.1.1 fix was incomplete — `apify` was added to `dependencies` but left in `optionalDependencies`, so npm still treated it as optional and it was stripped from production builds. Removed the `optionalDependencies` block entirely. Apify Actor runs now start successfully.

## [1.1.1] - 2026-04-20

### Fixed
- Attempted fix for Apify Actor `ERR_MODULE_NOT_FOUND: apify` startup failure. (Superseded by 1.1.2 — this release was incomplete.)

## [1.1.0] - 2026-04-20

### Added
- **`screen_stocks` tool** — Screen and filter stocks by sector, market cap, price, beta, volume, dividend yield, exchange, and country. Returns derived `cap_category`, `volatility_category`, and `liquidity_category` signals for every match. All filters optional; configurable limit up to 200.
- **`compare_companies` tool** — Side-by-side comparison of 2–5 companies across price, valuation (P/E, DCF), profitability (margins, ROE, ROIC), financial health, growth, dividends, and ratings. Auto-computed `rankings` identify leaders in each dimension: `lowest_pe`, `highest_margin`, `strongest_balance_sheet`, `best_growth`, `most_undervalued`, `highest_rated`.
- FMP client now supports batch quote endpoint (`getBatchQuote`) for efficient multi-symbol price retrieval.

### Changed
- `.actor/input_schema.json` updated — `symbol` is no longer required at the schema level (each tool validates its own inputs).
- Apify Actor versioning aligned to `MAJOR.MINOR` format per platform requirements.

### Docs
- README expanded with full input/output examples and derived-signal documentation for all 4 tools.

## [1.0.0] - 2026-04-17

### Added
- Initial release.
- **`get_stock_snapshot` tool** — Comprehensive stock overview combining quote, profile, DCF valuation, and rating into one response. Includes derived `dcf_signal`, `market_cap_readable`, and 52-week distance metrics.
- **`get_company_metrics` tool** — Deep fundamentals analysis synthesized from 5 financial statement endpoints. Includes `margin_trend`, `health_signal`, `growth_signal`, and pre-computed CAGRs.
- Stdio and Streamable HTTP transport support.
- Apify Actor entry point with Pay-Per-Event monetization.
- Published to npm, MCP Registry, Apify Store, and mcp.so.
