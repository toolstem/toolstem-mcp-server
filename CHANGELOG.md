# Changelog

All notable changes to the Toolstem MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-04-20

### Fixed
- **Critical**: Apify Actor runs failed on startup with `ERR_MODULE_NOT_FOUND: apify` because the `apify` dependency was declared as optional and excluded from production builds. Moved `apify` from `optionalDependencies` to `dependencies` so it ships in the runtime container.

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
