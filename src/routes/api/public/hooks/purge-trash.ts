import { createFileRoute } from "@tanstack/react-router";
import { safeEqual } from "@/lib/security/signing.server";

function authorized(request: Request): boolean {
  const secret = process.env["CRON_SECRET"];
  const sent = request.headers.get("x-cron-secret") ?? "";
  return !!secret && safeEqual(secret, sent);
}

export const Route = createFileRoute("/api/public/hooks/purge-trash")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: expired, error } = await supabaseAdmin
          .from("documents")
          .select("id, storage_path")
          .not("deleted_at", "is", null)
          .lt("deleted_at", cutoff);
        if (error) {
          console.error("[purge-trash]", error.message);
          return new Response(JSON.stringify({ ok: false }), {
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
          { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
