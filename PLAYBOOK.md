# Toolstem Playbook

Everything we learned building and shipping `toolstem-mcp-server`. Use this as the template for every future MCP server (crypto, weather, SEC, etc.).

---

## Product architecture

**One Actor = one product listing.** Each MCP server is a single Apify Actor with multiple tools inside it. Customers install the Actor; tools are features of that product.

**File layout:**

```
/
├── src/
│   ├── index.ts          # MCP server (stdio + HTTP)
│   ├── actor.ts          # Apify entry point — dispatches to tools
│   ├── tools/            # One file per tool
│   ├── services/         # External API clients (FMP, etc.)
│   └── utils/            # Formatting helpers
├── .actor/
│   ├── actor.json        # Apify metadata (MAJOR.MINOR format — DO NOT edit casually)
│   ├── input_schema.json # Input validation — acts as the tool enum enforcer
│   └── Dockerfile
├── scripts/
│   ├── smoke-test.sh     # Pre-publish verification
│   └── README.md
├── server.json           # MCP Registry metadata (version in 2 places)
├── package.json          # npm metadata (version in 1 place)
├── CHANGELOG.md
└── README.md
```

**Version bump checklist** — every release touches:

1. `package.json` → `"version"`
2. `server.json` → `"version"` (appears twice in file)
3. `src/index.ts` → `createServer()` version and `/health` endpoint
4. `CHANGELOG.md` → add new entry
5. Do NOT touch `.actor/actor.json` — that's Apify's MAJOR.MINOR metadata

---

## Billing — the pattern that works

**Pay-Per-Event with a shared post-success charge.** This is the critical pattern we learned the hard way.

### The correct shape (src/actor.ts)

```typescript
let result;

switch (input.tool) {
  case 'tool_a':
    result = await toolA(input);
    break;
  case 'tool_b':
    result = await toolB(input);
    break;
  default:
    throw new Error(`Unsupported tool: ${input.tool}`);
}

// Charge ONCE in the shared post-success path.
// Never gate on tool type, symbol count, or other branches.
await Actor.charge({ eventName: 'tool-call' });
return result;
```

### What goes wrong

- **Charging per-tool inside each case** → easy to miss one branch, giving away paid tools for free (this bug lived in v1.2.0–v1.2.2 until caught on 2026-04-21).
- **Apify permissions set to "Limited"** → `Actor.charge()` silently returns without charging. Must be set to **full permissions** in the Apify UI for the Actor.
- **Charging before the tool runs** → customers get billed on validation failures or upstream errors.

### Rules of thumb

- One `Actor.charge()` call per run, at the end of the success path.
- `input_schema.json` enum rejects unknown tools before the switch is reached → no charge on invalid input.
- Price per event uniformly to start. Differentiate later if tools have meaningfully different costs.

### Owner-run limitation

Apify does NOT charge Actor owners for their own runs. `chargedEventCounts["tool-call"]` will be `0` when you test your own Actor. This is by design — it's not a bug. The smoke test treats billing assertions as WARN for this reason.

**Only a third-party customer run will prove billing fires end-to-end in production.**

---

## Pre-publish smoke test

`scripts/smoke-test.sh` — runs against the live Apify Actor before every `npm publish` / MCP Registry publish.

**Rules:**

- Exit 0 = safe to publish
- Exit 1 = DO NOT publish
- Tests output correctness (functional) AND billing intent (WARN on owner runs)
- Include a negative test that any removed tool is rejected at schema level

**Release order:**

1. Push to GitHub → Apify auto-builds
2. Wait for Apify build SUCCEEDED
3. `APIFY_TOKEN=xxx npm run smoke` → must be clean
4. `npm publish`
5. `./mcp-publisher login github` (JWT expires every ~2 weeks) and `./mcp-publisher publish`

---

## Upstream API discipline

**Static code review cannot catch upstream API changes.** On 2026-04-21 we shipped with `screen_stocks` broken because FMP moved `/stable/batch-quote` behind a paywall (HTTP 402) after we wrote the code. Neither human review nor agent review caught it.

### Countermeasures

1. **Smoke test must hit the live API, not mocks.** If the upstream changes access tiers, you want to know before customers do.
2. **Endpoint access map** — document which upstream endpoints are free vs paid. Pin it in the repo.
3. **Monthly cron** — probe each upstream endpoint and alert on unexpected 402/403.

### Known FMP access map (as of 2026-04-21)

**Free tier:**
- `/stable/quote`, `/stable/profile`, `/stable/key-metrics`, `/stable/ratios`
- `/stable/income-statement`, `/stable/balance-sheet-statement`, `/stable/cash-flow-statement`
- `/stable/discounted-cash-flow`, `/stable/ratings-snapshot`, `/stable/grades`
- `/api/v3/quote/AAPL,MSFT,GOOG` (comma-separated legacy batch — still free)
- `/api/v3/stock-screener` (free — use for the eventual screen_stocks v1.3 rewrite)

**Paid (HTTP 402):**
- `/stable/batch-quote` — requires paid plan
- `/stable/company-screener` — requires paid plan

---

## Publishing distribution surface

Every server should be submitted to ALL of these:

| Destination | Method | Update required per version? |
|---|---|---|
| GitHub | `git push` | Automatic |
| Apify Store | Auto-build on GitHub push | Automatic |
| npm | `npm publish` | Yes |
| MCP Registry | `./mcp-publisher publish` | Yes (JWT expires) |
| Smithery | Submit once, then auto-syncs | One-time |
| Glama | Submit URL | One-time |
| mcp.so | Submit URL | One-time |
| PulseMCP | Submit URL | One-time |
| awesome-mcp-servers (GitHub) | PR | One-time |

---

## macOS Archive Utility trap

**Never ship code as a ZIP to a macOS user.** Archive Utility silently drops directories during unzip. This bit us three times on 2026-04-20 → 21.

Use inline `cat > path << 'FILE_EOF' ... FILE_EOF` heredoc shell scripts for multi-file transfers. See `recovery/restore-v121.sh` pattern.

---

## Clone-and-fork workflow for new servers

To spin up `toolstem-<vertical>-mcp-server`:

1. `gh repo create toolstem/toolstem-<vertical>-mcp-server --public --template toolstem/toolstem-mcp-server` (or manual clone)
2. Rename in `package.json`, `server.json`, `.actor/actor.json`
3. Replace `src/services/fmp.ts` with the new upstream API client
4. Rewrite `src/tools/*.ts` for the new domain's tools
5. Update `input_schema.json` enum and per-tool fields
6. Update `README.md` and `CHANGELOG.md`
7. Keep `src/actor.ts` billing pattern exactly as-is
8. Keep `scripts/smoke-test.sh` structure — swap assertions to match new tools
9. Configure Apify Actor: **full permissions**, PPE pricing with `tool-call` event
10. Publish to all distribution surfaces

**Target:** second server shipped in ≤6 hours using this template.

---

## Operational reminders

- **Rotate Apify API tokens regularly** — never commit them, never share long-lived ones in chat.
- **Set git committer identity globally** so commits don't show `user@MacBookPro.lan`:
  ```bash
  git config --global user.email "jonathan@troen.net"
  git config --global user.name "Jonathan Troen"
  ```
- **MCP Registry JWT expires** — re-auth with `./mcp-publisher login github` whenever publish fails.
- **Weekly ecosystem cron** watches for MCP SDK/registry changes, competitor activity, and platform policy shifts. Check `cron_tracking/ecosystem_monitor/` for findings.
