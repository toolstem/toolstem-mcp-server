# Changelog

All notable changes to the Toolstem MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.6] - 2026-04-27

### Changed

- **Default demonstration on empty input.** When the actor is invoked with no input (or with input missing the `tool` field), it now runs `get_stock_snapshot('AAPL')` as a default demonstration instead of exiting with an error. This addresses a real conversion leak observed in production: directory health-check probes and first-time evaluators frequently invoke actors with empty input to verify reachability, and the previous behavior (silent exit, no output) made the actor look broken or empty in those probes. The new behavior produces a real, useful result so directory listings and exploratory runs see what the actor actually does. MCP gateway invocations are unaffected — they always pass `tool` explicitly.

### Added

- **Default-demo response cache** (KV store, 6h TTL) so high probe volume does not multiply FMP API consumption (the FMP free tier is 250 calls/day). First default-demo run hits FMP; subsequent probes within 6h are served from cache.
- **No-charge policy for default-demo runs.** Default demonstrations skip the `tool-call` PPE charge. Probes don't generate revenue, and we shouldn't bill health-check accounts for runs they didn't intend. Real invocations (input with `tool` specified) charge as before.

## [1.2.5] - 2026-04-24

### Fixed

- **Critical:** Actor runs no longer hang until the 120-second container timeout. Restored the `await Actor.exit()` call at the end of the Actor entrypoint, which is required by the Apify SDK v3 when `Actor.init()` has been called (init opens a WebSocket that must be explicitly closed). Without this, every run completed its tool work successfully but the container stayed alive until timeout, causing downstream orchestration (including the pre-publish smoke test) to see runs as `TIMED-OUT`. Regression introduced in commit `fb7d35c` (2026-04-21); detected by the pre-publish smoke test on 2026-04-24.

## [1.2.4] - 2026-04-24

### Fixed

- `compare_companies`: graceful degradation when FMP's `/stable/batch-quote` endpoint returns 402 on the free tier. The tool now falls back to per-symbol `getQuote` calls via the new `withBatchFallback` helper, so a 2–5 symbol comparison completes with a full response instead of failing the whole call.

### Internal

- Introduced reusable `withBatchFallback` helper in `src/services/fallback.ts` for batch → per-item degradation with bounded concurrency. Reserved for reuse by future tools that depend on batch endpoints (SEC Form 4 batches, 13F batch holdings in the upcoming SEC server).
- `api_calls_made` in the `compare_companies` response now reflects the true network round-trip count in both the batch-succeeded and fallback paths.

## [1.2.3] - 2026-04-23

### Changed

- README H1 and front-matter updated to keyword-forward financial intelligence positioning for MCP directory discoverability.
- `actor.json` declares `LIMITED_PERMISSIONS` explicitly.
- Added `server-card.json` for MCP registry distribution.

## [1.2.2] - 2026-04-21

### Removed — `screen_stocks` tool temporarily disabled

v1.2.1 diagnostics confirmed the root cause of `screen_stocks` returning 0 results: FMP's `/stable/batch-quote` endpoint now returns HTTP 402 ("Restricted Endpoint") on the free tier. The diagnostic payload showed every batch request rejected with a subscription-required error regardless of chunk size.

Rather than ship a broken tool, v1.2.2 removes `screen_stocks` from the public surface area:

- Removed tool registration from the MCP server (`src/index.ts`).
- Removed tool branch from the Apify Actor entry (`src/actor.ts`).
- Removed `screen_stocks`-specific fields from the Apify input schema (`.actor/input_schema.json`).
- Supported tools are now: `get_stock_snapshot`, `get_company_metrics`, `compare_companies`.

The underlying source for the screener (`src/tools/screen-stocks.ts`, `src/services/fmp.ts` helpers, and the Russell 1000 universe in `src/data/universe.ts`) is retained in the repository for the v1.3 refactor, but is no longer reachable from any transport.

`screen_stocks` will return in v1.3 built on FMP's free-tier-available `/api/v3/stock-screener` endpoint (server-side filtering, 1 API call instead of 11, supports filters previously stubbed out: `industry`, `beta`, `dividend`, `country`).

### Other

- Removed the v1.2.1 diagnostic plumbing (`_lastScreenDiag`, `_lastHttpStatus`, `_lastHttpBody`, per-chunk `meta.diagnostics`) — retained only within the now-inert `screenStocks` path in `fmp.ts` for v1.3 reference.
- Updated the HTTP `/health` endpoint and `createServer()` to report version `1.2.2`.

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
