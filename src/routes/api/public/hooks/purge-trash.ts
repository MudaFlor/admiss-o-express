import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/purge-trash")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: expired, error } = await supabaseAdmin
          .from("documents")
          .select("id, storage_path")
          .not("deleted_at", "is", null)
          .lt("deleted_at", cutoff);
        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        const rows = expired ?? [];
        if (rows.length > 0) {
          await supabaseAdmin.storage
            .from("candidate-documents")
            .remove(rows.map((r) => r.storage_path));
          await supabaseAdmin
            .from("documents")
            .delete()
            .in("id", rows.map((r) => r.id));
        }
        return new Response(
          JSON.stringify({ ok: true, purged: rows.length }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});