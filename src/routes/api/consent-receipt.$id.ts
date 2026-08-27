import { createFileRoute } from "@tanstack/react-router";

function esc(v: unknown): string {
  return String(v ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const Route = createFileRoute("/api/consent-receipt/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        // O comprovante contém dados pessoais (nome, CPF, IP, geolocalização):
        // só é servido com link assinado (HMAC + expiração) gerado pelo RH.
        const url = new URL(request.url);
        const { verifyReceiptSignature } = await import("@/lib/security/signing.server");
        const { assertRateLimitPersisted } = await import("@/lib/rate-limit.server");

        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";
        try {
          await assertRateLimitPersisted(`receipt:${ip}`, { limit: 20, windowMs: 60_000 });
        } catch {
          return new Response("Muitas tentativas", {
            status: 429,
            headers: { "Cache-Control": "no-store" },
          });
        }

        const valid = await verifyReceiptSignature(
          params.id,
          url.searchParams.get("exp"),
          url.searchParams.get("sig"),
        );
        if (!valid) {
          return new Response("Link inválido ou expirado", {
            status: 403,
            headers: { "Cache-Control": "no-store" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: consent, error } = await supabaseAdmin
          .from("lgpd_consents")
          .select("*")
          .eq("id", params.id)
          .maybeSingle();
        if (error || !consent) {
          return new Response("Comprovante não encontrado", { status: 404 });
        }
        const { data: candidate } = await supabaseAdmin
          .from("candidates")
          .select("full_name, cpf, email")
          .eq("id", consent.candidate_id)
          .maybeSingle();

        const dev = (consent.device_info ?? {}) as Record<string, unknown>;
        const geo = consent.geolocation as { lat?: number; lng?: number; accuracy?: number } | null;
        const accepted = new Date(consent.accepted_at).toLocaleString("pt-BR", {
          dateStyle: "full", timeStyle: "long",
        });
        const screen = dev.screen as { w?: number; h?: number } | undefined;

        const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Comprovante de Aceite LGPD — ${esc(candidate?.full_name)}</title>
<meta name="robots" content="noindex,nofollow" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 780px; margin: 32px auto; padding: 0 24px; color: #111; line-height: 1.5; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: .04em; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .muted { color: #666; font-size: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 13px; }
  .field { padding: 6px 0; }
  .label { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #888; }
  .value { font-weight: 500; word-break: break-word; }
  .hash { font-family: ui-monospace, Menlo, monospace; font-size: 11px; word-break: break-all; background: #f4f4f5; padding: 6px 8px; border-radius: 4px; }
  .terms { white-space: pre-wrap; font-size: 12px; background: #fafafa; border: 1px solid #eee; padding: 12px; border-radius: 6px; max-height: none; }
  .no-print { margin-bottom: 16px; }
  button { padding: 8px 14px; border: 1px solid #111; background: #111; color: #fff; border-radius: 6px; cursor: pointer; font-size: 13px; }
  @media print { .no-print { display: none; } body { margin: 0; } }
  .stamp { border: 2px solid ${consent.revoked_at ? "#b91c1c" : "#047857"}; color: ${consent.revoked_at ? "#b91c1c" : "#047857"}; display:inline-block; padding: 4px 10px; font-weight: 700; letter-spacing: .1em; border-radius: 4px; font-size: 11px; margin-top: 8px; }
</style>
</head>
<body>
  <div class="no-print"><button onclick="window.print()">Baixar como PDF (imprimir)</button></div>
  <h1>Comprovante de Aceite — Termo LGPD</h1>
  <div class="muted">Emitido em ${esc(new Date().toLocaleString("pt-BR"))}</div>
  <div class="stamp">${consent.revoked_at ? "REVOGADO" : "ASSINADO DIGITALMENTE"}</div>

  <h2>Signatário</h2>
  <div class="grid">
    <div class="field"><div class="label">Nome cadastrado</div><div class="value">${esc(candidate?.full_name)}</div></div>
    <div class="field"><div class="label">CPF cadastrado</div><div class="value">${esc(candidate?.cpf)}</div></div>
    <div class="field"><div class="label">Nome assinado</div><div class="value">${esc(consent.signature_name)}</div></div>
    <div class="field"><div class="label">CPF confirmado</div><div class="value">${esc(consent.signature_cpf)}</div></div>
    <div class="field"><div class="label">Email</div><div class="value">${esc(candidate?.email)}</div></div>
  </div>

  <h2>Momento do aceite</h2>
  <div class="grid">
    <div class="field"><div class="label">Data e hora (servidor)</div><div class="value">${esc(accepted)}</div></div>
    <div class="field"><div class="label">Endereço IP</div><div class="value">${esc(consent.ip_address)}</div></div>
    <div class="field"><div class="label">Fuso horário</div><div class="value">${esc(dev.timezone)}</div></div>
    <div class="field"><div class="label">Idioma</div><div class="value">${esc(dev.language)}</div></div>
  </div>

  <h2>Aparelho utilizado</h2>
  <div class="grid">
    <div class="field"><div class="label">Tipo</div><div class="value">${esc(dev.device_type)}</div></div>
    <div class="field"><div class="label">Plataforma</div><div class="value">${esc(dev.platform)}</div></div>
    <div class="field"><div class="label">Resolução</div><div class="value">${screen?.w && screen?.h ? `${screen.w}×${screen.h}` : "—"}</div></div>
    <div class="field"><div class="label">User-Agent</div><div class="value" style="font-size:11px;">${esc(consent.user_agent)}</div></div>
  </div>

  <h2>Localização</h2>
  <div class="grid">
    <div class="field"><div class="label">Autorização</div><div class="value">${consent.geo_consent ? "Autorizada pelo candidato" : "Não autorizada"}</div></div>
    <div class="field"><div class="label">Coordenadas</div><div class="value">${
      geo && typeof geo.lat === "number" && typeof geo.lng === "number"
        ? `${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}${geo.accuracy ? ` (±${Math.round(geo.accuracy)}m)` : ""}`
        : "—"
    }</div></div>
  </div>

  <h2>Integridade do termo</h2>
  <div class="field"><div class="label">Versão</div><div class="value">${esc(consent.terms_version)}</div></div>
  <div class="field"><div class="label">Hash SHA-256 (termo + versão)</div><div class="hash">${esc(consent.terms_hash)}</div></div>

  <h2>Texto integral do termo aceito</h2>
  <div class="terms">${esc(consent.terms_text)}</div>

  ${consent.revoked_at ? `<h2>Revogação</h2><div class="field"><div class="value">Revogado em ${esc(new Date(consent.revoked_at).toLocaleString("pt-BR"))}</div></div>` : ""}

  <p class="muted" style="margin-top:32px;">
    Este comprovante é gerado a partir do registro imutável armazenado no sistema no momento do aceite.
    A integridade do texto pode ser verificada recomputando o hash SHA-256 sobre o texto + versão.
  </p>
</body>
</html>`;

        return new Response(html, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "private, no-store",
            "X-Robots-Tag": "noindex, nofollow",
          },
        });
      },
    },
  },
});