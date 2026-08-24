// Duas camadas de proteção contra força bruta / abuso:
// 1) contador em memória (rápido, mas por isolate do worker);
// 2) contador persistente no banco (compartilhado entre todos os isolates).

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

/**
 * Contador persistente (tabela public.rate_limits, acessível só pelo servidor).
 * Usado nas rotas públicas críticas, onde o contador em memória não basta
 * porque o tráfego é distribuído entre vários isolates do worker.
 */
export async function assertRateLimitPersisted(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): Promise<void> {
  // Primeira barreira, sem custo de rede.
  assertRateLimit(key, { limit, windowMs });

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();
    const { data, error } = await supabaseAdmin.rpc("bump_rate_limit", {
      _key: key,
      _window_start: windowStart,
    });
    if (error) {
      console.error("[rate-limit] falha ao contar no banco", error.message);
      return; // degrada para o contador em memória
    }
    if (typeof data === "number" && data > limit) {
      throw new Error("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Muitas tentativas")) throw e;
    console.error("[rate-limit] erro inesperado", e);
  }
}
