import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Brain, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listProfileAnalyses, regenerateProfileAnalysis } from "@/lib/disc.functions";
import { isV2Analysis } from "@/lib/profile/questions";
import { OpenProfile, discUrl } from "@/components/DiscCard";

export const Route = createFileRoute("/_authenticated/analise-perfil")({
  head: () => ({
    meta: [
      { title: "Análise de Perfil — Mudaflor People OS" },
      { name: "description", content: "Todos os perfis comportamentais de candidatos e colaboradores em um só lugar." },
      { property: "og:title", content: "Análise de Perfil — Mudaflor People OS" },
      { property: "og:description", content: "Perfis de Comunicação, Colaboração e Conflito." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilesPage,
});

type Item = Awaited<ReturnType<typeof listProfileAnalyses>>[number];

function situacao(r: Item) {
  if (r.status !== "concluido") return "aguardando_resposta";
  if (r.analysis) return "gerado";
  return "aguardando_geracao";
}
const SIT_LABEL: Record<string, string> = { aguardando_resposta: "Aguardando resposta", aguardando_geracao: "Aguardando geração", gerado: "Gerado" };

function ProfilesPage() {
  const list = useServerFn(listProfileAnalyses);
  const regen = useServerFn(regenerateProfileAnalysis);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["profile-analyses"], queryFn: () => list() });
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [sit, setSit] = useState("todos");
  const [perfil, setPerfil] = useState("todos");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = useMemo(() => (q.data ?? []).filter((r) => {
    if (search && !r.nome.toLowerCase().includes(search.toLowerCase())) return false;
    if (tipo !== "todos" && r.tipo !== tipo) return false;
    if (sit !== "todos" && situacao(r) !== sit) return false;
    if (perfil !== "todos") {
      if (!isV2Analysis(r.analysis) || r.analysis.veredito.perfil !== perfil) return false;
    }
    return true;
  }), [q.data, search, tipo, sit, perfil]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"><Brain className="h-3.5 w-3.5" /> Pessoas</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Análise de Perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Comunicação, Colaboração e Conflito de candidatos e colaboradores. Para enviar um novo questionário, use a ficha da pessoa.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome" className="w-64 pl-8" />
        </div>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos os tipos</SelectItem><SelectItem value="candidato">Candidatos</SelectItem><SelectItem value="colaborador">Colaboradores</SelectItem></SelectContent>
        </Select>
        <Select value={sit} onValueChange={setSit}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todas as situações</SelectItem>{Object.entries(SIT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={perfil} onValueChange={setPerfil}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos os perfis</SelectItem><SelectItem value="Pontes">Perfil Pontes</SelectItem><SelectItem value="Muros">Perfil Muros</SelectItem></SelectContent>
        </Select>
        {(search || tipo !== "todos" || sit !== "todos" || perfil !== "todos") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setTipo("todos"); setSit("todos"); setPerfil("todos"); }}><X className="mr-1 h-3 w-3" /> Limpar</Button>
        )}
      </div>

      {q.isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p>
        : q.error ? <p className="text-sm text-destructive">{(q.error as Error).message}</p>
        : rows.length === 0 ? <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">Nenhuma análise encontrada.</p>
        : (
          <div className="space-y-2">
            {rows.map((r) => {
              const v2 = isV2Analysis(r.analysis) ? r.analysis : null;
              const s = situacao(r);
              const open = openId === r.id;
              return (
                <div key={r.id} className="rounded-xl border bg-card">
                  <button type="button" onClick={() => setOpenId(open ? null : r.id)} className="flex w-full flex-wrap items-center gap-3 p-4 text-left">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.tipo === "colaborador" ? "Colaborador" : "Candidato"}{r.cargo && ` · ${r.cargo}`}
                        {r.completed_at && ` · respondido em ${new Date(r.completed_at).toLocaleDateString("pt-BR")}`}
                      </p>
                    </div>
                    {v2 && <Badge variant="outline" className={v2.comunicacao.estilo === "Assertivo" ? "border-primary/40 bg-primary/10 text-primary" : ""}>{v2.comunicacao.estilo}</Badge>}
                    {v2 && <Badge variant="outline" className={v2.veredito.perfil === "Pontes" ? "border-primary/40 bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>Perfil {v2.veredito.perfil}</Badge>}
                    <Badge variant="outline" className="text-muted-foreground">{SIT_LABEL[s]}</Badge>
                  </button>
                  {open && (
                    <div className="space-y-2 border-t p-4">
                      <div className="flex justify-end">
                        {r.employee_id ? <Link to="/colaboradores/$id" params={{ id: r.employee_id }} className="text-xs text-muted-foreground underline">Abrir ficha</Link>
                          : r.candidate_id ? <Link to="/candidatos/$id" params={{ id: r.candidate_id }} className="text-xs text-muted-foreground underline">Abrir ficha</Link> : null}
                      </div>
                      <OpenProfile a={r} name={r.nome} busy={busyId === r.id}
                        onRegen={async () => {
                          setBusyId(r.id);
                          try { await regen({ data: { id: r.id } }); await qc.invalidateQueries({ queryKey: ["profile-analyses"] }); } catch (e) { toast.error((e as Error).message); } finally { setBusyId(null); }
                        }}
                        onCopy={() => { navigator.clipboard.writeText(discUrl(r.token)); toast.success("Link copiado"); }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
