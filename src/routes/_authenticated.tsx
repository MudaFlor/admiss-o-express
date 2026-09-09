import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, Loader2 } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppTopbar } from "@/components/AppTopbar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useRoles } from "@/hooks/useRole";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.href } as never });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useRoles();
  const [claiming, setClaiming] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.roles.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md space-y-4 rounded-2xl border bg-card p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-primary" />
          <h1 className="text-xl font-semibold">Acesso aguardando aprovação</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta foi criada, mas ainda não possui permissão para acessar o workspace.
            Um administrador precisa liberar seu acesso em Configurações › Equipe.
          </p>
          <p className="text-xs text-muted-foreground">
            É a primeira conta da empresa? Você pode assumir a administração agora — isso só
            funciona enquanto nenhum administrador existir.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              disabled={claiming}
              onClick={async () => {
                setClaiming(true);
                const { data: ok, error } = await supabase.rpc("claim_first_admin");
                setClaiming(false);
                if (error) return toast.error("Não foi possível liberar o acesso agora.");
                if (!ok) {
                  return toast.error(
                    "Já existe um administrador. Peça a liberação em Configurações › Equipe.",
                  );
                }
                toast.success("Acesso de administrador liberado.");
                await refetch();
              }}
            >
              {claiming ? "Liberando..." : "Sou o administrador desta empresa"}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/login" });
              }}
            >
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <AppTopbar />
          <main className="flex-1 p-4 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}