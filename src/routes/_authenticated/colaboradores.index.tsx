import { createFileRoute, Link } from "@tanstack/react-router";
import { maskCpf } from "@/lib/cpf";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Brain, FolderOpen, Pencil, Plus, Search, Users } from "lucide-react";
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
import { DiscCard } from "@/components/DiscCard";
import { DeleteEmployeeButton } from "@/components/DeleteEmployeeButton";
import { createEmployee, listEmployees, updateEmployeeAdmission } from "@/lib/management.functions";
import { listCandidates } from "@/lib/candidates.functions";
import { checkNewEmployee, CPF_EXISTS_CODE } from "@/lib/validation/employee-id";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

type EmployeeDraft = {
  full_name: string; position?: string; department?: string; admission_date: string;
  candidate_id?: string; matricula: string; cpf?: string;
};

export const Route = createFileRoute("/_authenticated/colaboradores/")({
  head: () => ({ meta: [
    { title: "Colaboradores — Mudaflor People" },
    { name: "description", content: "Cadastros e admissões de colaboradores com matrícula única." },
    { property: "og:title", content: "Colaboradores — Mudaflor People" },
    { property: "og:description", content: "Consulte fichas, documentos e matrículas dos colaboradores." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: ColaboradoresPage,
});

function ColaboradoresPage() {
  const list = useServerFn(listEmployees);
  const listCands = useServerFn(listCandidates);
  const create = useServerFn(createEmployee);
  const updAdm = useServerFn(updateEmployeeAdmission);
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [importDate, setImportDate] = useState(today);

  const [search, setSearch] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importSearch, setImportSearch] = useState("");
  const [importMatricula, setImportMatricula] = useState("");
  const [registrationError, setRegistrationError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingCpf, setPendingCpf] = useState<EmployeeDraft | null>(null);

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
    await registerEmployee({
          full_name: String(fd.get("full_name")),
          position: String(fd.get("position") ?? ""),
          department: String(fd.get("department") ?? ""),
          admission_date: String(fd.get("admission_date")),
          matricula: String(fd.get("matricula") ?? ""),
          cpf: String(fd.get("cpf") ?? ""),
    });
  }

  async function registerEmployee(draft: EmployeeDraft, confirmed = false) {
    setRegistrationError("");
    const check = checkNewEmployee({
      matricula: draft.matricula, cpf: draft.cpf,
      existing: (q.data ?? []).map((e) => ({ matricula: e.matricula_esocial, cpf: e.cpf })),
      confirmDuplicateCpf: confirmed,
    });
    if (!check.ok) {
      if (check.code === "CPF_EXISTS") setPendingCpf(draft);
      else setRegistrationError(check.message);
      return;
    }
    setSaving(true);
    try {
      await create({ data: { ...draft, confirmDuplicateCpf: confirmed } });
      toast.success(draft.candidate_id ? `${draft.full_name} admitido. Dados e documentos copiados para a ficha do colaborador.` : "Colaborador cadastrado.");
      setManualOpen(false);
      setImportOpen(false);
      setPendingCpf(null);
      setImportMatricula("");
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["candidates"] });
      qc.invalidateQueries({ queryKey: ["dash-stats"] });
      qc.invalidateQueries({ queryKey: ["dash-overview"] });
      qc.invalidateQueries({ queryKey: ["gestao"] });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao cadastrar";
      if (message.includes(CPF_EXISTS_CODE)) setPendingCpf(draft);
      else setRegistrationError(message);
    } finally {
      setSaving(false);
    }
  }

  async function importCandidate(c: { id: string; full_name: string; position: string | null; cpf: string | null }) {
    await registerEmployee({ full_name: c.full_name, position: c.position ?? "", admission_date: importDate,
      candidate_id: c.id, matricula: importMatricula, cpf: c.cpf ?? "" });
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
          <Dialog open={importOpen} onOpenChange={(open) => { setImportOpen(open); setRegistrationError(""); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Novo colaborador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo colaborador — importar candidato aprovado</DialogTitle>
                <DialogDescription>
                  Defina a data de admissão e importe. Documentos, termo LGPD, DISC e histórico seguem para a pasta do colaborador.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="import_matricula">ID / Matrícula eSocial *</Label>
                <Input id="import_matricula" required maxLength={40} value={importMatricula} onChange={(e) => { setImportMatricula(e.target.value); setRegistrationError(""); }} aria-invalid={!!registrationError} />
              </div>
              {registrationError && <p role="alert" className="text-sm font-semibold text-destructive">{registrationError}</p>}
              <div className="space-y-1.5">
                <Label htmlFor="import_date">Data de admissão</Label>
                <Input id="import_date" type="date" value={importDate} onChange={(e) => setImportDate(e.target.value)} className="max-w-xs" />
              </div>
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
                            <Button size="sm" disabled={saving} onClick={() => importCandidate(c)}>
                              Importar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="border-t pt-3 text-center">
                <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => { setImportOpen(false); setRegistrationError(""); setManualOpen(true); }}>
                  Candidato não está na lista? Cadastrar sem importar
                </button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={manualOpen} onOpenChange={(open) => { setManualOpen(open); setRegistrationError(""); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo colaborador</DialogTitle>
                <DialogDescription>Cadastro manual sem passar pelo pipeline de candidatos.</DialogDescription>
              </DialogHeader>
              <form onSubmit={onManualCreate} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="manual_matricula">ID / Matrícula eSocial *</Label>
                  <Input id="manual_matricula" name="matricula" required maxLength={40} aria-invalid={!!registrationError} onChange={() => setRegistrationError("")} />
                </div>
                {registrationError && <p role="alert" className="text-sm font-semibold text-destructive">{registrationError}</p>}
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Nome completo</Label>
                  <Input id="full_name" name="full_name" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="manual_cpf">CPF</Label>
                  <Input id="manual_cpf" name="cpf" maxLength={14} inputMode="numeric" placeholder="000.000.000-00" onChange={(e) => { e.currentTarget.value = maskCpf(e.currentTarget.value); }} />
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
                  <Button type="submit" disabled={saving}>Cadastrar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <AlertDialog open={!!pendingCpf} onOpenChange={(open) => { if (!open) setPendingCpf(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>CPF já está cadastrado, deseja cadastrá-lo novamente?</AlertDialogTitle>
            <AlertDialogDescription>O novo cadastro deve ter uma matrícula diferente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setPendingCpf(null); setManualOpen(false); setImportOpen(false); }}>Não</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const draft = pendingCpf; setPendingCpf(null); if (draft) void registerEmployee(draft, true); }}>Sim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                <TableHead className="text-right">Pasta / DISC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Carregando…</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center gap-2 py-6">
                      <Users className="h-6 w-6 text-muted-foreground/60" />
                      Nenhum colaborador ainda. Importe um candidato aprovado ou cadastre manualmente.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}{"matricula_esocial" in c && c.matricula_esocial ? <div className="text-xs text-muted-foreground">ID eSocial: {c.matricula_esocial}</div> : null}</TableCell>
                    <TableCell>{c.position ?? "—"}</TableCell>
                    <TableCell>{c.department ?? "—"}</TableCell>
                    <TableCell>
                      <AdmissionEditor
                        value={c.admission_date}
                        onSave={async (d) => {
                          try {
                            await updAdm({ data: { employee_id: c.id, admission_date: d } });
                            toast.success("Data de admissão atualizada.");
                            qc.invalidateQueries({ queryKey: ["employees"] });
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Erro ao salvar");
                          }
                        }}
                      />
                    </TableCell>
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
                    <TableCell className="space-x-1 whitespace-nowrap text-right">
                      {(
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/colaboradores/$id" params={{ id: c.id }}>
                            <FolderOpen className="mr-1 h-3 w-3" /> Ficha
                          </Link>
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline"><Brain className="mr-1 h-3 w-3" /> DISC</Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                          <DialogHeader>
                            <DialogTitle>{c.full_name}</DialogTitle>
                            <DialogDescription>Envie o questionário e veja o histórico de perfis.</DialogDescription>
                          </DialogHeader>
                          <DiscCard employeeId={c.id} name={c.full_name} />
                        </DialogContent>
                      </Dialog>
                      <DeleteEmployeeButton id={c.id} name={c.full_name} compact />
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
function AdmissionEditor({ value, onSave }: { value: string; onSave: (d: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value.slice(0, 10));
  if (!editing)
    return (
      <button type="button" className="inline-flex items-center gap-1 hover:text-primary" onClick={() => setEditing(true)} title="Editar data de admissão">
        {new Date(value.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR")}
        <Pencil className="h-3 w-3" />
      </button>
    );
  return (
    <div className="flex items-center gap-1">
      <Input type="date" value={v} onChange={(e) => setV(e.target.value)} className="h-8 w-36" />
      <Button size="sm" onClick={async () => { await onSave(v); setEditing(false); }}>OK</Button>
      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>×</Button>
    </div>
  );
}
