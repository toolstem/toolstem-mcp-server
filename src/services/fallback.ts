/**
 * Reusable batch → per-item fallback helper.
 *
 * Designed for supplier APIs whose batch endpoint may be paywalled or
 * rate-limited while the per-item endpoint is available. On batch failure
 * (null/empty result), fans out to the per-item function in parallel
 * with bounded concurrency, merges results, and surfaces a diagnostic
 * tag so callers can log the fallback path without affecting response shape.
 *
 * Future callers: SEC server insider-transactions batch, 13F batch holdings.
 */

export interface BatchFallbackDiag {
  usedFallback: boolean;
  batchStatus?: number | null;
  batchMs?: number;
  perItemMs?: number;
  perItemCount?: number;
  perItemSucceeded?: number;
}

export interface BatchFallbackOptions {
  concurrency?: number;
  isBatchEmpty?: (result: unknown) => boolean;
  readBatchStatus?: () => number | null | undefined;
  onFallback?: (info: { itemCount: number; batchStatus?: number | null }) => void;
}

export async function withBatchFallback<I, T>(
  items: I[],
  batchFn: (items: I[]) => Promise<T[] | null>,
  perItemFn: (item: I) => Promise<T | null>,
  options: BatchFallbackOptions = {},
): Promise<{ results: T[]; diag: BatchFallbackDiag }> {
  const diag: BatchFallbackDiag = { usedFallback: false };
  if (!items || items.length === 0) return { results: [], diag };

  const batchStart = Date.now();
  const batchResult = await batchFn(items);
  diag.batchMs = Date.now() - batchStart;
  diag.batchStatus = options.readBatchStatus?.() ?? null;

  const isEmpty = options.isBatchEmpty
    ? options.isBatchEmpty(batchResult)
    : !batchResult || (Array.isArray(batchResult) && batchResult.length === 0);

  if (!isEmpty && Array.isArray(batchResult)) {
    return { results: batchResult, diag };
  }

  diag.usedFallback = true;
  options.onFallback?.({ itemCount: items.length, batchStatus: diag.batchStatus });

  const concurrency = Math.max(1, options.concurrency ?? 5);
  const results: T[] = [];
  const perItemStart = Date.now();
  let succeeded = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      const item = items[idx];
      try {
        const r = await perItemFn(item);
        if (r !== null && r !== undefined) {
          results.push(r);
          succeeded++;
        }
      } catch {
        // graceful degradation
      }
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  diag.perItemMs = Date.now() - perItemStart;
  diag.perItemCount = items.length;
  diag.perItemSucceeded = succeeded;

  return { results, diag };
}
