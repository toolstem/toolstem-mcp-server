Last week Greg Isenberg dropped an [episode of The Startup Ideas Podcast](https://podcasts.apple.com/us/podcast/making-with-ai-marketing/id1593424985?i=1000758276448) about distribution in 2026. The thesis: AI commoditized code; the moat is now distribution. His Strategy #1 — out of seven — was **"MCP servers as your sales team."**

I'd started building one a week before the episode dropped. So instead of theorizing, here's the worked example: what a finished commercial-grade MCP server looks like, what shipping one costs, and what's actually happening on day 7.

## What I built

[Toolstem](https://apify.com/toolstem/toolstem-mcp-server) is a financial-data MCP server. It exposes three tools to AI agents:

- `get_stock_snapshot(ticker)` — current quote, key ratios, recent performance
- `dcf_analysis(ticker, assumptions)` — discounted cash flow with full assumption transparency
- `compare_stocks(tickers[])` — side-by-side valuation across N tickers

It's hosted as a paid actor on [Apify Store](https://apify.com/toolstem/toolstem-mcp-server) at $0.005 per tool call. No subscription. No contracts. No human sales calls. An agent discovers it, calls it, gets billed per call. The agent's caller (a human or another agent) eventually pays the agent's pass-through.

The whole thing is faceless. There is no founder photo. There is no founder LinkedIn. The brand is a deep-blue mark and a stock typeface. This is the operating model: AI buys from AI.

## Why MCP is the real distribution play

Here's the part Greg got exactly right and most takes don't.

A typical SaaS company spends a third or more of revenue on go-to-market — sales reps, content marketing, conferences, paid ads. That's the cost of fighting for human attention.

When the buyer is an AI agent, you don't fight for attention. The agent's framework points to a directory. The directory exposes a list of tools. The tool description and schema are the entire pitch. There is no awareness funnel, no SDR, no demo, no email sequence. It is among the most frictionless distribution surfaces ever built for software — *if* you can actually be in those directories with a clean spec.

Greg's framing in [the episode](https://x.com/startupideaspod/status/2038697353855787133): building an MCP server in 2026 is like building for mobile in 2010 — early movers own the directory real estate.

This is correct, with two caveats.

**Caveat 1: Many MCP directories exist; the directory game is real.** Smithery, Glama, mcp.so, PulseMCP, the official `modelcontextprotocol/servers` registry, awesome-mcp-servers, the Apify Store. Each has different submission requirements, different ranking signals, different audiences. Listing your server in 6 of them takes a week. This is a real cost.

**Caveat 2: The "vibe coded in a weekend" ad copy is misleading.** A *demo* MCP can be vibe-coded in a weekend. A *commercial* one — with PPE billing wired correctly, a smoke test that actually catches regressions against the live deploy, a release pipeline that doesn't ship broken builds, a default-demo for the empty-input probes that directory health-checks fire at you — takes longer. Not weeks. But not a weekend either.

## Architecture in three sentences

The MCP server is a TypeScript actor running on Apify. Tools wrap [Financial Modeling Prep's](https://financialmodelingprep.com/) free API tier (250 calls/day cap, 512MB/30d bandwidth). Apify's Pay-Per-Event billing fires on every successful tool call; the platform handles billing, charges the caller, and pays out monthly.

Source: [github.com/toolstem/toolstem-mcp-server](https://github.com/toolstem/toolstem-mcp-server). Examples: [github.com/toolstem/toolstem-mcp-examples](https://github.com/toolstem/toolstem-mcp-examples).

## Day-7 numbers, honestly

This is the section every launch post conveniently skips.

| Metric | Day 7 |
|---|---|
| Apify Store users | 1 |
| Apify Store MAU | 3 |
| Apify revenue | $0 |
| npm downloads | 1,084 (mostly registry indexers — collapsing now) |
| GitHub stars / forks | 0 / 0 |
| GitHub unique views | 9 |
| External Apify runs | 2 (both confirmed Microsoft Azure datacenter probes from directory health checks — not real users) |

Greg's episode uses an example of a fintech MCP that hit "150 installs in 30 days, $0 ad spend, vibe coded." If that's true, the creator did something right that I have not done yet. I'm spending this week trying to figure out what.

## What I think the gap is

Distribution is exactly what Greg said it is: the work. Building was the easy part. The build took ~2 days of vibe-coding plus ~5 days of hardening (smoke tests, release pipeline, OIDC publishing, default-demo for probes). Distribution is going to take longer than the build did.

Here's the work, ranked by what I think will move the needle most:

**1. Be in every directory.** Smithery and Glama are live. mcp.so, PulseMCP, modelcontextprotocol/servers, awesome-mcp-servers all in flight this week. This is mostly clerical.

**2. Answer-engine-optimize the README.** The episode mentions this as Strategy #4. AI agents reading the README to decide whether to call the tool need clear, structured, citation-ready prose. Not marketing copy. Direct semantics.

**3. Programmatic SEO on the docs.** Episode Strategy #2. Each tool gets a dedicated page targeting `[tool name] for AI agents`. Each ticker comparison gets a page. Build once, compounds forever. (Peter Levels, per the same [episode](https://podcasts.apple.com/us/podcast/making-with-ai-marketing/id1593424985?i=1000758276448): AI referrals went from 4% to 20% in one month.)

**4. Ship the second vertical fast.** First-mover advantage in directories is per-vertical. SEC filings MCP next; weather and sports odds after that.

**5. Karma in the right communities.** r/mcp, r/LocalLLaMA, the Anthropic Discord. Not posting links — answering questions substantively over weeks. This is slow distribution. It's also the most durable.

I'm not paying for ads. I'm not buying a newsletter (yet — that's Strategy #6 from the episode and I'll revisit at $1K MRR). I'm not running a viral artifact play. The plan is directories + AEO + community presence + shipping a second vertical.

## What I'd tell anyone building one this week

Three things.

**One: Build for the agent reader, not the human reader.** Tool names, descriptions, parameter schemas — the agent has to decide whether to call your tool from text alone. No marketing. No cleverness. Direct functional language. Read it back as if you were Claude trying to pick between three tools that all look similar.

**Two: Get billing right or it doesn't matter.** Apify's PPE event ID in your config has to match the eventName in your `Actor.charge()` call exactly. I shipped a version where these mismatched and discovered it via smoke test, not user complaint. Test the billing path before you market the listing.

**Three: Default-demo on empty input.** Directory health-checks fire empty-input runs at your actor. If those produce no useful output, every directory probe is a wasted conversion opportunity. Make empty input run a representative tool call (cached so probes don't hammer your upstream API) and you've turned the probes into demos.

## Where this goes

If Greg is right — and I think he is — the next 12 months are when the MCP directory landscape solidifies. Whoever has clean, monetized, multi-vertical MCPs in every directory by mid-2027 owns a tollbooth.

I'm going to keep posting actual numbers. If you're building something similar, the Github repos are public and the issues are open. The whole point is AI-to-AI distribution; I don't have a sales team, just a scoreboard.

---

**Toolstem**: [apify.com/toolstem/toolstem-mcp-server](https://apify.com/toolstem/toolstem-mcp-server) · [github.com/toolstem](https://github.com/toolstem) · [@toolstem on Bluesky](https://bsky.app/profile/toolstem.bsky.social)

Source for the strategy framing: Greg Isenberg, [The Startup Ideas Podcast — "Making $$ with AI Marketing"](https://x.com/startupideaspod/status/2038697353855787133), Mar 30 2026.
