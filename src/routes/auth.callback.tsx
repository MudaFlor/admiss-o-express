import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MailCheck, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Confirmando e-mail — Mudaflor People" },
      { name: "description", content: "Confirmação de e-mail e liberação de acesso ao Mudaflor People." },
      { property: "og:title", content: "Confirmando e-mail — Mudaflor People" },
      { property: "og:description", content: "Confirmação de e-mail e liberação de acesso ao Mudaflor People." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let done = false;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const urlError = hash.get("error_description") || query.get("error_description");
    if (urlError) {
      setError(urlError.replace(/\+/g, " "));
      return;
    }

    async function finish() {
      if (done) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      done = true;
      const isCandidate = data.session.user.user_metadata?.account_type === "candidato";
      navigate({ to: isCandidate ? "/portal" : "/dashboard", replace: true });
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") void finish();
    });

    (async () => {
      const code = query.get("code");
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr) {
          const { data } = await supabase.auth.getSession();
          if (!data.session) return setError("Link inválido ou expirado.");
        }
      }
      await finish();
    })();

    const timer = setTimeout(() => {
      if (!done) setError("Não foi possível confirmar o acesso. O link pode ter expirado.");
    }, 10000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md space-y-4 rounded-2xl border bg-card p-8 text-center">
        {error ? (
          <>
            <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="text-xl font-semibold">Link de confirmação inválido</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground">
              Tente entrar com seu e-mail e senha. Se o e-mail ainda não estiver confirmado, use
              "Esqueci minha senha" para receber um novo link.
            </p>
            <Button asChild><Link to="/login">Ir para o login</Link></Button>
          </>
        ) : (
          <>
            <MailCheck className="mx-auto h-10 w-10 text-primary" />
            <h1 className="text-xl font-semibold">Confirmando seu e-mail…</h1>
            <p className="text-sm text-muted-foreground">Estamos preparando seu acesso.</p>
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          </>
        )}
      </div>
    </div>
  );
}
