import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users,
  Briefcase,
  UserPlus,
  FileText,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CheckCircle2,
  Circle,
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

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Mudaflor People OS" }] }),
  component: DashboardPage,
});

const chartData = [
  { m: "Jun", admissoes: 8, desligamentos: 3 },
  { m: "Jul", admissoes: 12, desligamentos: 4 },
  { m: "Ago", admissoes: 9, desligamentos: 6 },
  { m: "Set", admissoes: 15, desligamentos: 5 },
  { m: "Out", admissoes: 18, desligamentos: 7 },
  { m: "Nov", admissoes: 22, desligamentos: 4 },
];

const agenda = [
  { time: "09:00", title: "Entrevista — Ana Lima", who: "Vaga: Designer Pleno", type: "interview" },
  { time: "11:30", title: "Onboarding — Lucas R.", who: "Marketing", type: "onboarding" },
  { time: "14:00", title: "Review trimestral", who: "Liderança", type: "meeting" },
  { time: "16:30", title: "Entrevista — Pedro S.", who: "Vaga: Backend Sênior", type: "interview" },
];

const tasks = [
  { t: "Validar contratos pendentes (4)", done: false },
  { t: "Enviar holerites — Novembro", done: true },
  { t: "Atualizar política LGPD", done: false },
  { t: "Aprovar férias de Camila M.", done: false },
  { t: "Revisar feedback 360°", done: true },
];

const stages = [
  { name: "Triagem", count: 24, color: "bg-muted-foreground/50" },
  { name: "Entrevista", count: 12, color: "bg-primary/70" },
  { name: "Teste técnico", count: 6, color: "bg-primary/85" },
  { name: "Proposta", count: 3, color: "bg-primary" },
  { name: "Contratado", count: 2, color: "bg-accent" },
];

function DashboardPage() {
  const stats = useServerFn(getDashboardStats);
  const list = useServerFn(listCandidates);
  const statsQ = useQuery({ queryKey: ["dash-stats"], queryFn: () => stats() });
  const recentQ = useQuery({ queryKey: ["dash-recent"], queryFn: () => list({ data: {} }) });

  const candCount =
    (statsQ.data?.counts.pendente ?? 0) +
    (statsQ.data?.counts.em_analise ?? 0) +
    (statsQ.data?.counts.aprovado ?? 0) +
    (statsQ.data?.counts.rejeitado ?? 0);

  const kpis = [
    { label: "Colaboradores ativos", value: 248, delta: "+12", up: true, icon: Users },
    { label: "Vagas abertas", value: 14, delta: "+3", up: true, icon: Briefcase },
    { label: "Admissões / mês", value: 22, delta: "+18%", up: true, icon: UserPlus },
    { label: "Documentos pendentes", value: statsQ.data?.counts.pendente ?? 7, delta: "-4", up: false, icon: FileText },
    { label: "Conformidade", value: "98.4%", delta: "+0.6", up: true, icon: ShieldCheck },
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
            Bom dia, equipe Mudaflor.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {candCount > 0
              ? `${candCount} candidatos no pipeline · 4 entrevistas hoje`
              : "4 entrevistas hoje · 7 documentos aguardando revisão"}
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
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          >
            <Card className="group relative overflow-hidden border-border bg-card p-5 shadow-[var(--shadow-card)] transition-colors hover:border-white/15">
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
                  <k.icon className="h-4 w-4" />
                </div>
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold ${
                    k.up ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                  }`}
                >
                  {k.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {k.delta}
                </span>
              </div>
              <div className="mt-5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {k.label}
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{k.value}</p>
              </div>
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/[0.04] blur-2xl transition-opacity group-hover:opacity-100" />
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Pipeline */}
      <Card className="border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Pipeline de recrutamento</h2>
            <p className="text-xs text-muted-foreground">Distribuição de candidatos por etapa</p>
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

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Chart + table column */}
        <div className="space-y-4 lg:col-span-2">
          {/* Chart */}
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

        {/* Right column: agenda + tasks */}
        <div className="space-y-4">
          <Card className="border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-base font-semibold tracking-tight">Agenda de hoje</h2>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" })}
              </span>
            </div>
            <ul className="mt-4 space-y-3">
              {agenda.map((a) => (
                <li key={a.title} className="group flex gap-3 rounded-lg border border-transparent p-2 transition-colors hover:border-border hover:bg-background/40">
                  <div className="flex flex-col items-center pt-0.5">
                    <span
                      className={`mt-1 h-2 w-2 rounded-full ${
                        a.type === "interview"
                          ? "bg-primary"
                          : a.type === "onboarding"
                            ? "bg-accent"
                            : "bg-gold"
                      }`}
                      style={a.type === "meeting" ? { backgroundColor: "var(--gold)" } : undefined}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{a.title}</p>
                      <span className="text-[11px] font-medium text-muted-foreground">{a.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.who}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">Tarefas do RH</h2>
              <span className="text-[11px] font-medium text-muted-foreground">
                {tasks.filter((t) => !t.done).length} pendentes
              </span>
            </div>
            <ul className="mt-4 space-y-2.5">
              {tasks.map((t) => (
                <li
                  key={t.t}
                  className="flex items-start gap-3 rounded-md p-1.5 text-sm transition-colors hover:bg-white/[0.02]"
                >
                  {t.done ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={t.done ? "text-muted-foreground line-through" : "text-foreground"}>
                    {t.t}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
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