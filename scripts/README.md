# scripts/

Operational scripts for Toolstem MCP Server.

## smoke-test.sh

Pre-publish smoke test. Calls every live tool against the deployed Apify Actor
and fails loudly on any error, empty response, or missing-data regression
(e.g. upstream FMP API changes).

**Run BEFORE every `npm publish` / MCP Registry publish.**

```bash
APIFY_TOKEN=xxx npm run smoke
```

Exit code:
- `0` — all tools healthy, safe to publish
- `1` — at least one failure, DO NOT publish

Test an alternate Actor (e.g. staging):

```bash
APIFY_TOKEN=xxx ACTOR=toolstem~toolstem-mcp-server-staging npm run smoke
```

### What it checks

| Tool                 | Checks                                          |
| -------------------- | ----------------------------------------------- |
| `get_stock_snapshot` | symbol echoes, price.current present, marketCap present |
| `get_company_metrics`| revenue > 0 somewhere in payload                |
| `compare_companies`  | 2 companies returned                            |
| `screen_stocks`      | REJECTED at input schema (removed in v1.2.2)    |

### Why this exists

On 2026-04-21 we shipped v1.1.0 with `screen_stocks` broken — FMP moved
`/stable/batch-quote` behind a paywall (HTTP 402) and neither code review
nor static tests caught it because they didn't hit the live endpoint.
This script catches that class of regression before it reaches customers.

### Release workflow

1. Push code to GitHub → Apify auto-builds
2. Wait for Apify build to succeed
3. **Run `npm run smoke`** — must exit 0
4. Only then: `npm publish` and `./mcp-publisher publish`
