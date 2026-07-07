import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createEmployee, listEmployees } from "@/lib/management.functions";
import { listCandidates } from "@/lib/candidates.functions";

export const Route = createFileRoute("/_authenticated/colaboradores")({
  head: () => ({ meta: [{ title: "Colaboradores — FlowRH" }] }),
  component: ColaboradoresPage,
});

function ColaboradoresPage() {
  const list = useServerFn(listEmployees);
  const listCands = useServerFn(listCandidates);
  const create = useServerFn(createEmployee);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importSearch, setImportSearch] = useState("");

  const q = useQuery({ queryKey: ["employees"], queryFn: () => list() });
  const approvedQ = useQuery({
    queryKey: ["candidates", "aprovado"],
    queryFn: () => listCands({ data: { status: "aprovado" } }),
    enabled: importOpen,
  });

  const filtered = useMemo(() => {
    const rows = q.data ?? [];
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) => r.full_name.toLowerCase().includes(s));
  }, [q.data, search]);

  async function onManualCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await create({
        data: {
          full_name: String(fd.get("full_name")),
          position: String(fd.get("position") ?? ""),
          department: String(fd.get("department") ?? ""),
          admission_date: String(fd.get("admission_date")),
        },
      });
      toast.success("Colaborador cadastrado.");
      setManualOpen(false);
      qc.invalidateQueries({ queryKey: ["employees"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar");
    }
  }

  async function importCandidate(c: { id: string; full_name: string; position: string | null }) {
    try {
      await create({
        data: {
          full_name: c.full_name,
          position: c.position ?? "",
          admission_date: new Date().toISOString().slice(0, 10),
          candidate_id: c.id,
        },
      });
      toast.success(`${c.full_name} importado como colaborador.`);
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["candidates"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao importar");
    }
  }

  const approvedFiltered = (approvedQ.data ?? []).filter((c) =>
    !importSearch ? true : c.full_name.toLowerCase().includes(importSearch.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Colaboradores</h1>
          <p className="text-sm text-muted-foreground">
            Quadro ativo de pessoas. Importe candidatos aprovados ou cadastre manualmente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="h-4 w-4" /> Importar de Candidatos
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Importar candidato aprovado</DialogTitle>
                <DialogDescription>
                  Selecione um candidato aprovado para virar colaborador com a data de admissão de hoje.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome…"
                  value={importSearch}
                  onChange={(e) => setImportSearch(e.target.value)}
                />
              </div>
              <div className="max-h-80 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedQ.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">Carregando…</TableCell>
                      </TableRow>
                    ) : approvedFiltered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                          Nenhum candidato aprovado disponível.
                        </TableCell>
                      </TableRow>
                    ) : (
                      approvedFiltered.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.full_name}</TableCell>
                          <TableCell>{c.position ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" onClick={() => importCandidate(c)}>
                              Importar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={manualOpen} onOpenChange={setManualOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Novo colaborador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo colaborador</DialogTitle>
                <DialogDescription>Cadastro manual sem passar pelo pipeline de candidatos.</DialogDescription>
              </DialogHeader>
              <form onSubmit={onManualCreate} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Nome completo</Label>
                  <Input id="full_name" name="full_name" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="position">Cargo</Label>
                    <Input id="position" name="position" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="department">Departamento</Label>
                    <Input id="department" name="department" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="admission_date">Data de admissão</Label>
                  <Input id="admission_date" name="admission_date" type="date" required />
                </div>
                <DialogFooter>
                  <Button type="submit">Cadastrar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Admissão</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Carregando…</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center gap-2 py-6">
                      <Users className="h-6 w-6 text-muted-foreground/60" />
                      Nenhum colaborador ainda. Importe um candidato aprovado ou cadastre manualmente.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell>{c.position ?? "—"}</TableCell>
                    <TableCell>{c.department ?? "—"}</TableCell>
                    <TableCell>{new Date(c.admission_date).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      {c.termination_date ? (
                        <span className="inline-flex items-center rounded-full border border-accent/40 px-2 py-0.5 text-[11px] text-accent">
                          Desligado
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-primary/40 px-2 py-0.5 text-[11px] text-primary">
                          Ativo
                        </span>
                      )}
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