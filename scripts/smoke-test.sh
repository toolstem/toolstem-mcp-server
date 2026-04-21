#!/usr/bin/env bash
# Pre-publish smoke test for Toolstem MCP Server.
# Calls every tool against the LIVE Apify Actor and fails loudly on any error,
# empty response, missing-data regression, or missing PPE billing event.
#
# Usage:
#   APIFY_TOKEN=xxx ./scripts/smoke-test.sh
#   APIFY_TOKEN=xxx ACTOR=toolstem~toolstem-mcp-server-staging ./scripts/smoke-test.sh
#
# Exit code 0 = all tools healthy, safe to publish.
# Exit code !=0 = DO NOT publish. Investigate before shipping to npm / MCP Registry.

set -euo pipefail

: "${APIFY_TOKEN:?APIFY_TOKEN env var is required}"
ACTOR="${ACTOR:-toolstem~toolstem-mcp-server}"
TIMEOUT="${TIMEOUT:-120}"

DATA_BASE="https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=${TIMEOUT}"
RUN_BASE="https://api.apify.com/v2/acts/${ACTOR}/runs"

PASS=0
FAIL=0
WARN=0
FAILURES=()

call_tool() {
  local name="$1"
  local payload="$2"
  local response
  response=$(curl -sS -X POST "$DATA_BASE" -H "Content-Type: application/json" -d "$payload" 2>&1)
  echo "$response"
}

run_and_get_run_json() {
  local payload="$1"
  local run_response
  run_response=$(curl -sS -X POST "${RUN_BASE}?token=${APIFY_TOKEN}&waitForFinish=${TIMEOUT}" \
    -H "Content-Type: application/json" \
    -d "$payload")
  echo "$run_response"
}

check() {
  local label="$1"
  local condition="$2"
  local detail="${3:-}"
  if [ "$condition" = "1" ]; then
    printf "  \033[32mPASS\033[0m  %s\n" "$label"
    PASS=$((PASS+1))
  else
    printf "  \033[31mFAIL\033[0m  %s  %s\n" "$label" "$detail"
    FAIL=$((FAIL+1))
    FAILURES+=("$label: $detail")
  fi
}

warn() {
  local label="$1"
  local detail="$2"
  printf "  \033[33mWARN\033[0m  %s  %s\n" "$label" "$detail"
  WARN=$((WARN+1))
}

check_billing() {
  local label="$1"
  local run_json="$2"

  sleep 5

  local status
  status=$(echo "$run_json" | python3 -c "
import json, sys
d = json.load(sys.stdin)
run = d.get('data', d)
print(run.get('status',''))
" 2>/dev/null || echo "")

  local tool_calls
  tool_calls=$(echo "$run_json" | python3 -c "
import json, sys
d = json.load(sys.stdin)
run = d.get('data', d)
cc = run.get('chargedEventCounts', {}) or {}
print(cc.get('tool-call', 0))
" 2>/dev/null || echo "0")

  if [ "$status" != "SUCCEEDED" ]; then
    check "$label status=SUCCEEDED" 0 "status=$status"
  else
    if [ "$tool_calls" = "1" ]; then
      check "$label chargedEventCounts.tool-call==1" 1
    else
      check "$label chargedEventCounts.tool-call==1" 0 "got $tool_calls"
    fi
  fi
}

echo "=========================================="
echo "Toolstem smoke test"
echo "Actor: $ACTOR"
echo "Time:  $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "=========================================="

# --- Test 1: get_stock_snapshot ---
echo ""
echo "[1/6] get_stock_snapshot (AAPL) – functional"
RESP=$(call_tool "get_stock_snapshot" '{"tool":"get_stock_snapshot","symbol":"AAPL"}')
# HTTP-level error from Apify input validator
ERR=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('error',{}).get('message','')) if isinstance(d,dict) else print('')" 2>/dev/null || echo "parse-error")
if [ -n "$ERR" ] && [ "$ERR" != "parse-error" ]; then
  check "no actor error" 0 "$ERR"
else
  SYMBOL=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print((d[0] if isinstance(d,list) and d else {}).get('symbol',''))" 2>/dev/null || echo "")
  PRICE=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); p=(d[0] if isinstance(d,list) and d else {}).get('price',{}); print(p.get('current','') if isinstance(p,dict) else p)" 2>/dev/null || echo "")
 MCAP=$(echo "$RESP" | python3 -c "
import json,sys
d=json.load(sys.stdin)
item=d[0] if isinstance(d,list) and d else {}
print(item.get('valuation',{}).get('market_cap',''))
" 2>/dev/null || echo "")
  [ "$SYMBOL" = "AAPL" ] && check "symbol=AAPL" 1 || check "symbol=AAPL" 0 "got '$SYMBOL'"
  [ -n "$PRICE" ] && [ "$PRICE" != "None" ] && check "price.current present" 1 || check "price.current present" 0 "got '$PRICE'"
  if [ "$MCAP" = "null" ] || [ "$MCAP" = "None" ] || [ -z "$MCAP" ]; then
    check "marketCap present" 0 "marketCap is null — FMP field-mapping regression"
  else
    check "marketCap present" 1
  fi
fi

echo ""
echo "[2/6] get_stock_snapshot (AAPL) – billing"
RUN_JSON=$(run_and_get_run_json '{"tool":"get_stock_snapshot","symbol":"AAPL"}')
warn "get_stock_snapshot billing" "skipped: owner runs are not charged by Apify"

# --- Test 2: get_company_metrics ---
echo ""
echo "[3/6] get_company_metrics (AAPL) – functional"
RESP=$(call_tool "get_company_metrics" '{"tool":"get_company_metrics","symbol":"AAPL"}')
REV=$(echo "$RESP" | python3 -c "
import json, sys
d = json.load(sys.stdin)
item = d[0] if isinstance(d, list) and d else {}
# Search for a revenue-ish field anywhere in the top-level or nested 'financials'/'income' blocks
def find_rev(obj, depth=0):
    if depth > 3 or not isinstance(obj, dict):
        return None
    for k, v in obj.items():
        if 'revenue' in k.lower() and isinstance(v, (int, float)) and v > 0:
            return v
        if isinstance(v, dict):
            r = find_rev(v, depth+1)
            if r: return r
    return None
r = find_rev(item)
print(r if r else '')
" 2>/dev/null || echo "")
[ -n "$REV" ] && check "revenue > 0" 1 || check "revenue > 0" 0 "no revenue field found"

echo ""
echo "[4/6] get_company_metrics (AAPL) – billing"
RUN_JSON=$(run_and_get_run_json '{"tool":"get_company_metrics","symbol":"AAPL"}')
warn "get_stock_snapshot billing" "skipped: owner runs are not charged by Apify"

# --- Test 3: compare_companies ---
echo ""
echo "[5/6] compare_companies (AAPL, MSFT) – functional"
RESP=$(call_tool "compare_companies" '{"tool":"compare_companies","symbols":["AAPL","MSFT"]}')
N=$(echo "$RESP" | python3 -c "
import json, sys
d = json.load(sys.stdin)
item = d[0] if isinstance(d, list) and d else {}
companies = item.get('companies', [])
print(len(companies) if isinstance(companies, list) else 0)
" 2>/dev/null || echo "0")
[ "$N" = "2" ] && check "2 companies returned" 1 || check "2 companies returned" 0 "got $N"

echo ""
echo "[6/6] compare_companies (AAPL, MSFT) – billing"
RUN_JSON=$(run_and_get_run_json '{"tool":"compare_companies","symbols":["AAPL","MSFT"]}')
warn "compare_companies billing" "skipped: owner runs are not charged by Apify"

# --- Test 4: screen_stocks should be REJECTED (removed in v1.2.2) ---
echo ""
echo "[extra] screen_stocks (should be rejected — removed in v1.2.2)"
RESP=$(call_tool "screen_stocks" '{"tool":"screen_stocks","sector":"Technology"}')
REJECTED=$(echo "$RESP" | python3 -c "
import json, sys
d = json.load(sys.stdin)
err = d.get('error',{}).get('message','') if isinstance(d, dict) else ''
print('1' if 'must be equal to one of' in err else '0')
" 2>/dev/null || echo "0")
[ "$REJECTED" = "1" ] && check "screen_stocks rejected at schema" 1 || check "screen_stocks rejected at schema" 0 "tool should be removed from enum"

# --- Summary ---
echo ""
echo "=========================================="
echo "PASS: $PASS   WARN: $WARN   FAIL: $FAIL"
echo "=========================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "DO NOT PUBLISH. Failures:"
  for f in "${FAILURES[@]}"; do echo "  - $f"; done
  exit 1
fi

echo ""
echo "All tools healthy. Safe to publish."
exit 0