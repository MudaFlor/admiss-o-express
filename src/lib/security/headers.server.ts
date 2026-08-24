// Cabeçalhos de segurança aplicados a todas as respostas do worker.
//
// Nota sobre `script-src`: o framework injeta scripts inline de hidratação
// (dados do roteador + script anti-flash de tema) sem nonce estável, por isso
// 'unsafe-inline' continua necessário para scripts próprios. Todo o resto está
// travado: nenhuma origem externa de script, sem plugins, sem embed em iframe
// de terceiros, sem envio de formulário para fora do site.

const SUPABASE_ORIGIN = "https://*.supabase.co";
const SUPABASE_WS = "wss://*.supabase.co";

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://cdn.gpteng.co`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `img-src 'self' data: blob: ${SUPABASE_ORIGIN}`,
  `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WS} https://ai.gateway.lovable.dev`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self' https://lovable.dev https://*.lovable.app https://*.lovableproject.com",
  "upgrade-insecure-requests",
].join("; ");

const STATIC: Record<string, string> = {
  "Content-Security-Policy": CSP,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(self), microphone=(), payment=(), usb=(), geolocation=(self)",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Frame-Options": "SAMEORIGIN",
};

export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(STATIC)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
