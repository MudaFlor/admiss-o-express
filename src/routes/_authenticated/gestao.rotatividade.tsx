import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/management/KpiCard";
import { Activity, UserMinus, UserPlus } from "lucide-react";
import { getManagementOverview } from "@/lib/management.functions";

export const Route = createFileRoute("/_authenticated/gestao/rotatividade")({
  component: RotatividadePage,
});

const reasonLabels: Record<string, string> = {
  pedido_demissao: "Pedido de demissão",
  sem_justa_causa: "Sem justa causa",
  justa_causa: "Justa causa",
  fim_experiencia: "Fim de experiência",
  acordo: "Acordo",
};

const PIE_COLORS = ["var(--primary)", "var(--accent)", "#C9A84C", "#6366f1", "#94a3b8"];

function RotatividadePage() {
  const fetcher = useServerFn(getManagementOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["gestao", "rotatividade", 12],
    queryFn: () => fetcher({ data: { months: 12 } }),
  });

  if (isLoading || !data) return <div className="h-40 animate-pulse rounded-lg bg-card/40" />;

  const k = data.kpis;
  const reasons = data.termination_reasons
    .filter((r) => r.count > 0)
    .map((r) => ({ name: reasonLabels[r.reason] ?? r.reason, value: r.count }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Rotatividade (mês)" value={k.turnover_rate.toFixed(2)} unit="%" delta={k.turnover_delta} deltaInverse icon={Activity} />
        <KpiCard label="Admissões (12m)" value={k.period_admissions} icon={UserPlus} />
        <KpiCard label="Rescisões (12m)" value={k.period_terminations} icon={UserMinus} />
        <KpiCard label="Em experiência" value={k.probation_terminations} hint="≤ 90 dias" icon={UserMinus} />
      </div>

      <Card className="border-border/50 bg-card/60 p-6 backdrop-blur-sm">
        <h2 className="font-display text-lg font-semibold text-foreground">Movimentação mensal</h2>
        <p className="text-xs text-muted-foreground">Admissões, rescisões e taxa de rotatividade</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.series}>
              <CartesianGrid stroke="var(--border)" strokeOpacity={0.3} vertical={false} />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} unit="%" />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="admissions" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Admissões" />
              <Bar yAxisId="left" dataKey="terminations" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Rescisões" />
              <Line yAxisId="right" type="monotone" dataKey="turnover_rate" stroke="#C9A84C" strokeWidth={2.5} name="Turnover %" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border/50 bg-card/60 p-6 backdrop-blur-sm">
          <h2 className="font-display text-base font-semibold text-foreground">Motivos de desligamento</h2>
          <div className="mt-4 h-60">
            {reasons.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem desligamentos no período.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={reasons} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {reasons.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {reasons.map((r, i) => (
              <div key={r.name} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-muted-foreground">{r.name}</span>
                <span className="ml-auto font-mono text-foreground">{r.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-border/50 bg-card/60 p-6 backdrop-blur-sm">
          <h2 className="font-display text-base font-semibold text-foreground">Rescisões recentes</h2>
          <div className="mt-4 max-h-72 overflow-auto">
            {data.recent_terminations.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Sem desligamentos registrados.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Colaborador</th>
                    <th className="pb-2 text-left font-medium">Motivo</th>
                    <th className="pb-2 text-right font-medium">Dias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {data.recent_terminations.map((t) => (
                    <tr key={t.id} className="text-foreground/90">
                      <td className="py-2">{t.name}</td>
                      <td className="py-2 text-muted-foreground">{reasonLabels[t.reason] ?? t.reason}</td>
                      <td className="py-2 text-right font-mono">
                        {t.days}
                        {t.days <= 90 && (
                          <span className="ml-1 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">exp.</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}