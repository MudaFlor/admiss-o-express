import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { BarChart3, TrendingDown, Users2, LineChart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/gestao")({
  head: () => ({ meta: [{ title: "Gestão — Mudaflor People OS" }] }),
  component: GestaoLayout,
});

const tabs = [
  { to: "/gestao", label: "Visão Geral", icon: BarChart3, exact: true },
  { to: "/gestao/absenteismo", label: "Absenteísmo", icon: TrendingDown },
  { to: "/gestao/rotatividade", label: "Rotatividade", icon: LineChart },
  { to: "/gestao/pipeline", label: "Pipeline RH", icon: Users2 },
];

function GestaoLayout() {
  const { pathname } = useLocation();
  return (
    <div className="flex h-full min-h-screen flex-col bg-background">
      <header className="border-b border-border/50 bg-card/40 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-6 pt-8 pb-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Gestão executiva
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
            Dashboards de pessoas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Indicadores reais de absenteísmo, rotatividade e funil de admissão.
          </p>
          <nav className="mt-6 flex flex-wrap gap-1 border-b border-border/50">
            {tabs.map((t) => {
              const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={`relative flex items-center gap-2 rounded-t-md px-4 py-2.5 text-sm transition-colors ${
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                  {active && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}