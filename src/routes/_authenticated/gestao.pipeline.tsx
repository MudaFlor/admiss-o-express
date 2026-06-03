import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, UserCheck, UserMinus, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/management/KpiCard";
import { getManagementOverview } from "@/lib/management.functions";

export const Route = createFileRoute("/_authenticated/gestao/pipeline")({
  component: PipelinePage,
});

function PipelinePage() {
  const fetcher = useServerFn(getManagementOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["gestao", "pipeline", 6],
    queryFn: () => fetcher({ data: { months: 6 } }),
  });

  if (isLoading || !data) return <div className="h-40 animate-pulse rounded-lg bg-card/40" />;

  const k = data.kpis;
  const funnel = [
    { label: "Currículos recebidos", value: data.pipeline.curriculos, color: "var(--primary)" },
    { label: "Pendentes / Em análise", value: data.pipeline.pendentes + data.pipeline.em_analise, color: "#6366f1" },
    { label: "Em integração", value: data.pipeline.aprovados_aguardando, color: "#C9A84C" },
    { label: "Admissões no período", value: k.period_admissions, color: "var(--primary)" },
    { label: "Rescisões em experiência", value: k.probation_terminations, color: "var(--accent)" },
  ];
  const max = Math.max(...funnel.map((f) => f.value), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Currículos no período" value={k.curriculos_periodo} icon={FileText} hint={`${data.months} meses`} />
        <KpiCard label="Em integração" value={k.em_integracao} icon={UserCheck} hint="aprovados aguardando admissão" />
        <KpiCard label="Admissões" value={k.period_admissions} icon={UserPlus} />
        <KpiCard label="Rescisões em experiência" value={k.probation_terminations} icon={UserMinus} hint="≤ 90 dias" />
      </div>

      <Card className="border-border/50 bg-card/60 p-6 backdrop-blur-sm">
        <h2 className="font-display text-lg font-semibold text-foreground">Funil de admissão</h2>
        <p className="text-xs text-muted-foreground">Do currículo recebido à efetivação</p>
        <div className="mt-6 space-y-3">
          {funnel.map((f) => {
            const pct = (f.value / max) * 100;
            return (
              <div key={f.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/90">{f.label}</span>
                  <span className="font-mono text-foreground">{f.value}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: f.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="border-border/50 bg-card/60 p-6 backdrop-blur-sm">
        <div className="mb-4">
          <h2 className="font-display text-base font-semibold text-foreground">Aprovados aguardando admissão</h2>
          <p className="text-xs text-muted-foreground">Candidatos prontos para serem efetivados</p>
        </div>
        {data.pending_onboarding.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Nenhum candidato aguardando integração.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 text-left font-medium">Nome</th>
                  <th className="pb-2 text-left font-medium">Cargo</th>
                  <th className="pb-2 text-right font-medium">Aprovado em</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data.pending_onboarding.map((c) => (
                  <tr key={c.id} className="text-foreground/90">
                    <td className="py-2.5">{c.name}</td>
                    <td className="py-2.5 text-muted-foreground">{c.position}</td>
                    <td className="py-2.5 text-right font-mono text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-2.5 text-right">
                      <Link to="/candidatos/$id" params={{ id: c.id }} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        Detalhes <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}