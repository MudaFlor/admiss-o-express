import { createFileRoute } from "@tanstack/react-router";

// Purga candidatos que solicitaram exclusão há mais de 30 dias (LGPD - direito ao esquecimento).
// Remove: dependents, documents (arquivos + linhas), notifications e o candidato.
// Mantém: lgpd_consents (5 anos como prova legal), mas anonimiza campos sensíveis.
export const Route = createFileRoute("/api/public/hooks/purge-candidates")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const { data: expired, error } = await supabaseAdmin
          .from("candidates")
          .select("id")
          .not("deletion_requested_at", "is", null)
          .lt("deletion_requested_at", cutoff);
        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
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
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});