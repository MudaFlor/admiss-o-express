import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  LineChart as LineIcon,
  TrendingDown,
  UserMinus,
  UserPlus,
  Users2,
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
import { KpiCard } from "@/components/management/KpiCard";
import { getManagementOverview } from "@/lib/management.functions";

export const Route = createFileRoute("/_authenticated/gestao/")({
  head: () => ({
    meta: [
      { title: "Gestão · Visão geral · Mudaflor People OS" },
      { name: "description", content: "Indicadores executivos de headcount, admissões, rescisões e absenteísmo da Mudaflor." },
      { property: "og:title", content: "Gestão · Visão geral · Mudaflor People OS" },
      { property: "og:description", content: "Indicadores executivos de headcount, admissões, rescisões e absenteísmo da Mudaflor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const fetcher = useServerFn(getManagementOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["gestao", "overview", 6],
    queryFn: () => fetcher({ data: { months: 6 } }),
  });

  if (isLoading || !data) return <SkeletonGrid />;
  const k = data.kpis;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Absenteísmo (mês)" value={k.absenteeism_rate.toFixed(2)} unit="%" delta={k.absenteeism_delta} deltaInverse icon={TrendingDown} hint="vs. mês anterior" />
        <KpiCard label="Rotatividade (mês)" value={k.turnover_rate.toFixed(2)} unit="%" delta={k.turnover_delta} deltaInverse icon={Activity} hint="vs. mês anterior" />
        <KpiCard label="Admissões no período" value={k.period_admissions} icon={UserPlus} hint={`${data.months} meses`} />
        <KpiCard label="Rescisões em experiência" value={k.probation_terminations} icon={UserMinus} hint="≤ 90 dias de casa" />
      </div>

      <Card className="border-border/50 bg-card/60 p-6 backdrop-blur-sm">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold text-foreground">Evolução mensal</h2>
          <p className="text-xs text-muted-foreground">Absenteísmo vs. rotatividade nos últimos {data.months} meses</p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.series}>
              <defs>
                <linearGradient id="abs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="turn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeOpacity={0.3} vertical={false} />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} unit="%" />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="absenteeism_rate" stroke="var(--primary)" fill="url(#abs)" strokeWidth={2} name="Absenteísmo %" />
              <Area type="monotone" dataKey="turnover_rate" stroke="var(--accent)" fill="url(#turn)" strokeWidth={2} name="Rotatividade %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ShortcutCard to="/gestao/absenteismo" title="Absenteísmo" desc="Horas perdidas, motivos e top colaboradores ausentes." icon={TrendingDown} />
        <ShortcutCard to="/gestao/rotatividade" title="Rotatividade" desc="Admissões, rescisões e motivos de desligamento." icon={LineIcon} />
        <ShortcutCard to="/gestao/pipeline" title="Pipeline RH" desc="Currículos, integração, admissões e experiência." icon={Users2} />
      </div>
    </motion.div>
  );
}

function ShortcutCard({ to, title, desc, icon: Icon }: { to: string; title: string; desc: string; icon: typeof Activity }) {
  return (
    <Link to={to}>
      <Card className="group h-full border-border/50 bg-card/60 p-5 backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-card">
        <div className="flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
        <h3 className="mt-4 font-display text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      </Card>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="h-28 animate-pulse border-border/50 bg-card/40" />
      ))}
    </div>
  );
}