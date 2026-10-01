import "server-only";

type Bucket = { count: number; resetAt: number };

// In-memory is enough: the app runs as a single server process.
const globalForLimits = globalThis as unknown as { __reelBoardLimits?: Map<string, Bucket> };
const buckets = (globalForLimits.__reelBoardLimits ??= new Map());

/** Fixed-window limiter. Returns false once `limit` attempts were made within `windowMs`. */
export function consumeAttempt(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

export function resetAttempts(key: string): void {
  buckets.delete(key);
}
