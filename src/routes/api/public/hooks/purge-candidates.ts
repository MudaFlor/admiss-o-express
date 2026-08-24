import { createFileRoute } from "@tanstack/react-router";
import { safeEqual } from "@/lib/security/signing.server";

// Purga candidatos que solicitaram exclusão há mais de 30 dias (LGPD - direito ao esquecimento).
// Remove: dependents, documents (arquivos + linhas), notifications e o candidato.
// Mantém: lgpd_consents (5 anos como prova legal), mas anonimiza campos sensíveis.
// Rota destrutiva: exige o segredo CRON_SECRET no header x-cron-secret.

function authorized(request: Request): boolean {
  const secret = process.env["CRON_SECRET"];
  const sent = request.headers.get("x-cron-secret") ?? "";
  return !!secret && safeEqual(secret, sent);
}

export const Route = createFileRoute("/api/public/hooks/purge-candidates")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const { data: expired, error } = await supabaseAdmin
          .from("candidates")
          .select("id")
          .not("deletion_requested_at", "is", null)
          .lt("deletion_requested_at", cutoff);
        if (error) {
          console.error("[purge-candidates]", error.message);
          return new Response(JSON.stringify({ ok: false }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }

        const ids = (expired ?? []).map((r) => r.id);
        let filesRemoved = 0;
        for (const candidateId of ids) {
          const { data: docs } = await supabaseAdmin
            .from("documents")
            .select("storage_path")
            .eq("candidate_id", candidateId);
          const paths = (docs ?? []).map((d) => d.storage_path);
          if (paths.length) {
            await supabaseAdmin.storage.from("candidate-documents").remove(paths);
            filesRemoved += paths.length;
          }
          await supabaseAdmin.from("documents").delete().eq("candidate_id", candidateId);
          await supabaseAdmin.from("dependents").delete().eq("candidate_id", candidateId);
          await supabaseAdmin.from("notifications").delete().eq("candidate_id", candidateId);
          // Anonimiza consentimentos mas mantém como prova legal
          await supabaseAdmin
            .from("lgpd_consents")
            .update({
              signature_name: "[anonimizado]",
              signature_cpf: "[anonimizado]",
              ip_address: null,
              user_agent: null,
              device_info: {} as never,
              geolocation: null as never,
            })
            .eq("candidate_id", candidateId);
          await supabaseAdmin.from("candidates").delete().eq("id", candidateId);
        }

        return new Response(
          JSON.stringify({ ok: true, candidates_purged: ids.length, files_removed: filesRemoved }),
          { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
