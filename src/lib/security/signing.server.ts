// Assinatura HMAC-SHA256 de links temporários (comprovantes LGPD).
// A chave nunca sai do servidor.

function b64url(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function key(): Promise<CryptoKey> {
  const secret = process.env["RECEIPT_SIGNING_SECRET"];
  if (!secret) throw new Error("RECEIPT_SIGNING_SECRET não configurado");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

export async function signPayload(payload: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await key(), new TextEncoder().encode(payload));
  return b64url(sig);
}

/** Comparação em tempo constante (evita timing attack). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Gera um link assinado válido por `ttlSeconds`. */
export async function signedReceiptQuery(id: string, ttlSeconds = 15 * 60): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = await signPayload(`${id}.${exp}`);
  return `exp=${exp}&sig=${sig}`;
}

export async function verifyReceiptSignature(
  id: string,
  exp: string | null,
  sig: string | null,
): Promise<boolean> {
  if (!exp || !sig) return false;
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum * 1000 < Date.now()) return false;
  const expected = await signPayload(`${id}.${expNum}`);
  return safeEqual(expected, sig);
}
