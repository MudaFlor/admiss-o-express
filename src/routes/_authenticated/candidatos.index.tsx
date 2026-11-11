import { candidatePortalUrl } from "@/lib/public-url";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Search, Copy, FlaskConical, SlidersHorizontal, Download } from "lucide-react";
import { downloadCandidatesXlsx } from "@/lib/candidates-export";
import { HR_LABELS, HR_SELECT_OPTIONS } from "@/lib/hr-indicators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CandidateStatusBadge } from "@/components/CandidateStatusBadge";
import { CandidateResumeDialog } from "@/components/CandidateResumeDialog";
import { CandidateRegistrationDateFilter } from "@/components/CandidateRegistrationDateFilter";
import { currentRegistrationDate } from "@/lib/validation/candidate-registration-date";
import { createCandidate, listCandidates } from "@/lib/candidates.functions";
import { useIsAdmin } from "@/hooks/useRole";

export const Route = createFileRoute("/_authenticated/candidatos/")({
  head: () => ({ meta: [
    { title: "Candidatos — Mudaflor People" },
    { name: "description", content: "Gerencie cadastros, convites e documentos dos candidatos da Mudaflor." },
    { property: "og:title", content: "Candidatos — Mudaflor People" },
    { property: "og:description", content: "Acompanhamento de candidatos e processos de admissão." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: CandidatosPage,
});

function CandidatosPage() {
  const list = useServerFn(listCandidates);
  const isAdmin = useIsAdmin();
  const create = useServerFn(createCandidate);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [testing, setTesting] = useState(false);
  const setF = (k: string, v: string) => setFilters((p) => ({ ...p, [k]: v }));
  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v.trim()));
  const activeCount = Object.keys(activeFilters).length;

  const q = useQuery({
    queryKey: ["candidates", search, activeFilters],
    queryFn: () => list({ data: { search, ...activeFilters } }),
  });

  function copyLink(link: string) {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  }

  async function testAsCandidate() {
    setTesting(true);
    try {
      const stamp = new Date().toLocaleString("pt-BR");
      const res = await create({
        data: {
          full_name: `Candidato Teste ${stamp}`,
          data_cadastro: currentRegistrationDate(),
          email: "",
          phone: "",
          position: "Teste do portal",
          cpf: "",
        },
      });
      const link = candidatePortalUrl(res.access_token);
      qc.invalidateQueries({ queryKey: ["candidates"] });
      window.open(link, "_blank", "noopener");
      toast.success("Portal do candidato aberto em nova aba.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar teste");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Candidatos</h1>
          <p className="text-sm text-muted-foreground">Gerencie convites, documentos e aprovações.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        {isAdmin && (
          <Button variant="outline" onClick={testAsCandidate} disabled={testing}>
            <FlaskConical className="h-4 w-4" /> {testing ? "Criando…" : "Testar como candidato"}
          </Button>
        )}
        <Button
          variant="outline"
          disabled={!q.data?.length}
          onClick={() => downloadCandidatesXlsx((q.data ?? []) as Record<string, unknown>[]).catch(() => toast.error("Não foi possível gerar a planilha"))}
        >
          <Download className="h-4 w-4" /> Baixar planilha
        </Button>
        <CandidateResumeDialog onCreated={() => qc.invalidateQueries({ queryKey: ["candidates"] })} />
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
              <SlidersHorizontal className="h-4 w-4" /> Filtros{activeCount ? ` (${activeCount})` : ""}
            </Button>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setFilters({})}>Limpar filtros</Button>
            )}
          </div>
          {showFilters && (
            <div className="mb-4 grid gap-3 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-4">
              {(["cidade", "position", "departamento", "recrutador"] as const).map((k) => (
                <div key={k} className="space-y-1">
                  <Label className="text-xs">{k === "position" ? "Cargo" : HR_LABELS[k]}</Label>
                  <Input value={filters[k] ?? ""} onChange={(e) => setF(k, e.target.value)} />
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-xs">Entrevista de</Label>
                <Input type="date" value={filters.entrevista_de ?? ""} onChange={(e) => setF("entrevista_de", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Entrevista até</Label>
                <Input type="date" value={filters.entrevista_ate ?? ""} onChange={(e) => setF("entrevista_ate", e.target.value)} />
              </div>
              {(Object.keys(HR_SELECT_OPTIONS) as Array<keyof typeof HR_SELECT_OPTIONS>).map((k) => (
                <div key={k} className="space-y-1">
                  <Label className="text-xs">{k === "meio_recebimento" ? "Meio de recebimento" : HR_LABELS[k]}</Label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={filters[k] ?? ""}
                    onChange={(e) => setF(k, e.target.value)}
                  >
                    <option value="">Todos</option>
                    {HR_SELECT_OPTIONS[k].map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>
                  <CandidateRegistrationDateFilter from={filters.cadastro_de ?? ""} to={filters.cadastro_ate ?? ""}
                    onChange={(from, to) => setFilters((previous) => ({ ...previous, cadastro_de: from, cadastro_ate: to }))} />
                </TableHead>
                <TableHead>Cargo / Depto.</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Recrutador</TableHead>
                <TableHead>Entrevista</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground">Carregando…</TableCell></TableRow>
              ) : (q.data?.length ?? 0) === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground">{activeCount || search ? "Nenhum candidato encontrado com esses filtros." : 'Nenhum candidato ainda. Clique em "Novo candidato".'}</TableCell></TableRow>
              ) : (
                (q.data ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm text-muted-foreground">#{c.codigo ?? "—"}</TableCell>
                    <TableCell>
                      <Link to="/candidatos/$id" params={{ id: c.id }} className="font-medium hover:underline">
                        {c.full_name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{c.email ?? c.phone ?? "—"}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{c.data_cadastro ? c.data_cadastro.split("-").reverse().join("/") : "—"}</TableCell>
                    <TableCell>
                      {c.position ?? "—"}
                      {c.departamento && <div className="text-xs text-muted-foreground">{c.departamento}</div>}
                    </TableCell>
                    <TableCell>{c.cidade ?? "—"}</TableCell>
                    <TableCell>{c.recrutador ?? "—"}</TableCell>
                    <TableCell>
                      {c.data_entrevista ? c.data_entrevista.split("-").reverse().join("/") : "—"}
                      {c.situacao_entrevista && <div className="text-xs text-muted-foreground">{c.situacao_entrevista}</div>}
                    </TableCell>
                    <TableCell><CandidateStatusBadge status={c.status as never} /></TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyLink(candidatePortalUrl(c.access_token))}
                      >
                        <Copy className="h-3.5 w-3.5" /> Link
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}