// One-shot Dev.to publisher.
// Reads body markdown from .github/scripts/devto_article_body.md
// Reads metadata from env (DEVTO_API_KEY, DEVTO_PUBLISH=true|false).
// Prints article id + URL to stdout.

import fs from "node:fs";
import path from "node:path";

const apiKey = process.env.DEVTO_API_KEY;
if (!apiKey) {
  console.error("DEVTO_API_KEY not set");
  process.exit(1);
}

const publish = process.env.DEVTO_PUBLISH !== "false"; // default true

const bodyPath = path.join(
  process.env.GITHUB_WORKSPACE || ".",
  ".github/scripts/devto_article_body.md"
);
const body = fs.readFileSync(bodyPath, "utf8");

const article = {
  article: {
    title:
      "I built the MCP server Greg Isenberg recommends in his 2026 distribution playbook. Here's day 7.",
    published: publish,
    body_markdown: body,
    tags: ["mcp", "ai", "startups", "distribution"],
    description:
      "Greg's #1 distribution strategy for 2026 is \"MCP servers as your sales team.\" I shipped one a week ago. This is what's actually happening — installs, revenue, and the directory game.",
    main_image:
      "https://raw.githubusercontent.com/toolstem/toolstem-mcp-examples/main/assets/devto_cover.png",
  },
};

const res = await fetch("https://dev.to/api/articles", {
  method: "POST",
  headers: {
    "api-key": apiKey,
    "Content-Type": "application/json",
    "User-Agent": "toolstem-publisher/1.0",
  },
  body: JSON.stringify(article),
});

const text = await res.text();

function safeErrorMessage(raw) {
  // Print only sanctioned error fields. Never echo the full response body —
  // we don't trust upstream not to reflect headers or metadata.
  try {
    const obj = JSON.parse(raw);
    const msg = obj.error || obj.message || obj.errors;
    if (msg) return typeof msg === "string" ? msg : JSON.stringify(msg);
    return "(error body suppressed: no recognized error field)";
  } catch {
    return "(error body suppressed: non-JSON response)";
  }
}

if (!res.ok) {
  console.error(`Dev.to API error ${res.status}: ${safeErrorMessage(text)}`);
  process.exit(1);
}

let json;
try {
  json = JSON.parse(text);
} catch {
  console.error("Non-JSON success response from Dev.to (body suppressed)");
  process.exit(1);
}

console.log("OK");
console.log(`id: ${json.id}`);
console.log(`url: ${json.url}`);
console.log(`canonical_url: ${json.canonical_url}`);
console.log(`published: ${json.published}`);
console.log(`reading_time_minutes: ${json.reading_time_minutes}`);
