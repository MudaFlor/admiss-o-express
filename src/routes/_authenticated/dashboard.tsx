import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users,
  Briefcase,
  UserPlus,
  FileText,
  TrendingDown,
  Plus,
  ArrowUpRight,
  MoreHorizontal,
  Search,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getDashboardStats, listCandidates } from "@/lib/candidates.functions";
import { getManagementOverview } from "@/lib/management.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Mudaflor People OS" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const stats = useServerFn(getDashboardStats);
  const list = useServerFn(listCandidates);
  const overview = useServerFn(getManagementOverview);

  const statsQ = useQuery({ queryKey: ["dash-stats"], queryFn: () => stats() });
  const recentQ = useQuery({ queryKey: ["dash-recent"], queryFn: () => list({ data: {} }) });
  const overviewQ = useQuery({
    queryKey: ["dash-overview", 6],
    queryFn: () => overview({ data: { months: 6 } }),
  });

  const k = overviewQ.data?.kpis;
  const pipeline = overviewQ.data?.pipeline;
  const series = overviewQ.data?.series ?? [];
  const chartData = series.map((s) => ({
    m: s.month,
    admissoes: s.admissions,
    desligamentos: s.terminations,
  }));
  const hasMovement = chartData.some((d) => d.admissoes > 0 || d.desligamentos > 0);

  const candCount =
    (statsQ.data?.counts.pendente ?? 0) +
    (statsQ.data?.counts.em_analise ?? 0) +
    (statsQ.data?.counts.aprovado ?? 0) +
    (statsQ.data?.counts.rejeitado ?? 0);

  const kpis = [
    { label: "Colaboradores ativos", value: k?.active_employees ?? 0, icon: Users, to: "/colaboradores" as const },
    { label: "Candidatos no pipeline", value: candCount, icon: Briefcase, to: "/candidatos" as const },
    { label: "Admissões no período", value: k?.period_admissions ?? 0, icon: UserPlus, to: "/gestao" as const },
    { label: "Cadastros pendentes", value: statsQ.data?.counts.pendente ?? 0, icon: FileText, to: "/candidatos" as const },
    {
      label: "Absenteísmo (mês)",
      value: `${(k?.absenteeism_rate ?? 0).toFixed(2)}%`,
      icon: TrendingDown,
      to: "/gestao/absenteismo" as const,
    },
  ];

  const stages = [
    { name: "Pendentes", count: pipeline?.pendentes ?? 0, color: "bg-muted-foreground/50" },
    { name: "Em análise", count: pipeline?.em_analise ?? 0, color: "bg-primary/70" },
    { name: "Aprovados", count: pipeline?.aprovados_aguardando ?? 0, color: "bg-primary" },
    { name: "Rejeitados", count: pipeline?.rejeitados ?? 0, color: "bg-accent" },
    { name: "Total currículos", count: pipeline?.curriculos ?? 0, color: "bg-accent/70" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            People OS · Visão geral
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Bem-vindo de volta.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {candCount > 0
              ? `${candCount} candidato${candCount === 1 ? "" : "s"} no pipeline`
              : "Cadastre colaboradores e candidatos para começar a ver dados."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="h-10 border-border bg-card hover:bg-secondary">
            <Link to="/recrutamento">
              <Briefcase className="h-4 w-4" /> Abrir vaga
            </Link>
          </Button>
          <Button asChild className="h-10 bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
            <Link to="/colaboradores">
              <Plus className="h-4 w-4" /> Novo colaborador
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kp, i) => (
          <motion.div
            key={kp.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          >
            <Link to={kp.to} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
              <Card className="group relative overflow-hidden border-border bg-card p-5 shadow-[var(--shadow-card)] transition-colors hover:border-white/15 cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
                    <kp.icon className="h-4 w-4" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
                </div>
                <div className="mt-5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {kp.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{kp.value}</p>
                </div>
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/[0.04] blur-2xl transition-opacity group-hover:opacity-100" />
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Pipeline */}
      <Card className="border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Pipeline de recrutamento</h2>
            <p className="text-xs text-muted-foreground">Distribuição de candidatos por status</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
            <Link to="/recrutamento">Ver kanban <ArrowUpRight className="h-3 w-3" /></Link>
          </Button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          {stages.map((s) => (
            <div key={s.name} className="rounded-lg border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{s.name}</span>
                <span className="text-base font-semibold text-foreground">{s.count}</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full ${s.color}`}
                  style={{ width: `${Math.min(100, s.count * 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Chart + table */}
      <div className="space-y-4">
        <Card className="border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Movimentação de pessoas</h2>
              <p className="text-xs text-muted-foreground">Admissões e desligamentos · últimos 6 meses</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-primary" /> Admissões
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-accent" /> Desligamentos
              </span>
            </div>
          </div>
          <div className="mt-4 h-64">
            {hasMovement ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="admissoes" stroke="var(--primary)" strokeWidth={2} fill="url(#g1)" />
                  <Area type="monotone" dataKey="desligamentos" stroke="var(--accent)" strokeWidth={2} fill="url(#g2)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem movimentações no período. Cadastre colaboradores para ver o gráfico.
              </div>
            )}
          </div>
        </Card>

        {/* People table */}
        <Card className="border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Últimos candidatos</h2>
              <p className="text-xs text-muted-foreground">Pipeline ativo do recrutamento</p>
            </div>
            <div className="hidden md:flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                placeholder="Buscar..."
                className="w-40 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">Nome</th>
                  <th className="px-5 py-3">Cargo</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(recentQ.data ?? []).slice(0, 6).map((c) => (
                  <tr key={c.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <Link
                        to="/candidatos/$id"
                        params={{ id: c.id }}
                        className="flex items-center gap-3"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-secondary text-xs font-medium text-foreground">
                            {c.full_name
                              .split(" ")
                              .slice(0, 2)
                              .map((p) => p[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground hover:underline">{c.full_name}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{c.position ?? "—"}</td>
                    <td className="px-5 py-3">
                      <StatusPill status={c.status as string} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {recentQ.isLoading && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      Carregando…
                    </td>
                  </tr>
                )}
                {!recentQ.isLoading && (recentQ.data?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      Nenhum candidato cadastrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pendente: { label: "Pendente", cls: "border-gold/40 text-gold" },
    em_analise: { label: "Em análise", cls: "border-muted-foreground/40 text-muted-foreground" },
    aprovado: { label: "Aprovado", cls: "border-primary/50 text-primary" },
    rejeitado: { label: "Rejeitado", cls: "border-accent/50 text-accent" },
  };
  const v = map[status] ?? { label: status, cls: "border-border text-muted-foreground" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${v.cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {v.label}
    </span>
  );
}