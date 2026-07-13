// Rate limiter em memória para o worker atual.
// Suficiente para bloquear brute-force de tokens no MVP.
// Cada isolate do worker mantém seu próprio Map; não é distribuído.

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

function cleanup() {
  if (store.size < 500) return;
  const now = Date.now();
  for (const [k, v] of store) if (v.resetAt < now) store.delete(k);
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { ok: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const b = store.get(key);
  if (!b || b.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    cleanup();
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: b.resetAt - now };
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count, retryAfterMs: 0 };
}

export function assertRateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): void {
  const r = rateLimit(key, opts);
  if (!r.ok) {
    const s = Math.ceil(r.retryAfterMs / 1000);
    throw new Error(`Muitas tentativas. Aguarde ${s}s e tente novamente.`);
  }
}