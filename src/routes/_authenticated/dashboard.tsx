import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Users, Clock, CheckCircle2, XCircle, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDashboardStats, listCandidates } from "@/lib/candidates.functions";
import { CandidateStatusBadge } from "@/components/CandidateStatusBadge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Admissão Digital" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const stats = useServerFn(getDashboardStats);
  const list = useServerFn(listCandidates);
  const statsQ = useQuery({ queryKey: ["dash-stats"], queryFn: () => stats() });
  const pendingQ = useQuery({
    queryKey: ["dash-pending"],
    queryFn: () => list({ data: { status: "em_analise" } }),
  });

  const cards = [
    { label: "Pendentes", value: statsQ.data?.counts.pendente ?? 0, icon: Clock, color: "text-amber-600" },
    { label: "Em análise", value: statsQ.data?.counts.em_analise ?? 0, icon: Users, color: "text-sky-600" },
    { label: "Aprovados", value: statsQ.data?.counts.aprovado ?? 0, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Rejeitados", value: statsQ.data?.counts.rejeitado ?? 0, icon: XCircle, color: "text-rose-600" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral das admissões em andamento.</p>
        </div>
        <Button asChild>
          <Link to="/candidatos"><Plus className="h-4 w-4" /> Novo candidato</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fila de análise</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (pendingQ.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum candidato aguardando análise.</p>
          ) : (
            <ul className="divide-y">
              {pendingQ.data!.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link to="/candidatos/$id" params={{ id: c.id }} className="font-medium hover:underline">
                      {c.full_name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{c.position ?? "—"}</p>
                  </div>
                  <CandidateStatusBadge status={c.status as never} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}