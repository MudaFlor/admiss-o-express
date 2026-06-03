import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/management/KpiCard";
import { Activity, Clock, TrendingDown } from "lucide-react";
import { getManagementOverview } from "@/lib/management.functions";

export const Route = createFileRoute("/_authenticated/gestao/absenteismo")({
  component: AbsenteismoPage,
});

const reasonLabels: Record<string, string> = {
  atestado: "Atestado médico",
  falta_justificada: "Falta justificada",
  falta_injustificada: "Falta injustificada",
  licenca: "Licença",
};

function AbsenteismoPage() {
  const fetcher = useServerFn(getManagementOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["gestao", "absenteismo", 12],
    queryFn: () => fetcher({ data: { months: 12 } }),
  });

  if (isLoading || !data) return <div className="h-40 animate-pulse rounded-lg bg-card/40" />;

  const k = data.kpis;
  const totalHours = data.absences_by_reason.reduce((s, r) => s + r.hours, 0);
  const reasonsData = data.absences_by_reason.map((r) => ({ ...r, label: reasonLabels[r.reason] ?? r.reason }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Taxa atual" value={k.absenteeism_rate.toFixed(2)} unit="%" delta={k.absenteeism_delta} deltaInverse icon={TrendingDown} />
        <KpiCard label="Horas perdidas (12m)" value={totalHours.toFixed(0)} unit="h" icon={Clock} />
        <KpiCard label="Colaboradores ativos" value={k.active_employees} icon={Activity} />
      </div>

      <Card className="border-border/50 bg-card/60 p-6 backdrop-blur-sm">
        <h2 className="font-display text-lg font-semibold text-foreground">Taxa mensal de absenteísmo</h2>
        <p className="text-xs text-muted-foreground">12 meses</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.series}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false} />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} unit="%" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="absenteeism_rate" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} name="Taxa %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border/50 bg-card/60 p-6 backdrop-blur-sm">
          <h2 className="font-display text-base font-semibold text-foreground">Motivos</h2>
          <p className="text-xs text-muted-foreground">Horas perdidas por categoria</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reasonsData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.3} horizontal={false} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={130} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-border/50 bg-card/60 p-6 backdrop-blur-sm">
          <h2 className="font-display text-base font-semibold text-foreground">Top ausências</h2>
          <p className="text-xs text-muted-foreground">Colaboradores com mais horas perdidas</p>
          <div className="mt-4 max-h-56 overflow-auto">
            {data.top_absentees.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Sem registros de ausência.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Colaborador</th>
                    <th className="pb-2 text-left font-medium">Setor</th>
                    <th className="pb-2 text-right font-medium">Horas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {data.top_absentees.map((a) => (
                    <tr key={a.id} className="text-foreground/90">
                      <td className="py-2">{a.name}</td>
                      <td className="py-2 text-muted-foreground">{a.department}</td>
                      <td className="py-2 text-right font-mono">{a.hours.toFixed(1)}h</td>
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