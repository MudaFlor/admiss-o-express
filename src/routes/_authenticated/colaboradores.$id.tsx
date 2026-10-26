import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, ExternalLink, FileText, History, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiscCard } from "@/components/DiscCard";
import {
  addEmployeeNote,
  getEmployee,
  getEmployeeDocumentLink,
  updateEmployeeProfile,
} from "@/lib/management.functions";

export const Route = createFileRoute("/_authenticated/colaboradores/$id")({
  head: () => ({ meta: [{ title: "Ficha do colaborador — Mudaflor People OS" }] }),
  component: EmployeePage,
});

type FieldDef = { key: string; label: string; type?: string; wide?: boolean; area?: boolean };
const PERSONAL: FieldDef[] = [
  { key: "full_name", label: "Nome completo", wide: true },
  { key: "cpf", label: "CPF" },
  { key: "rg", label: "RG" },
  { key: "birth_date", label: "Data de nascimento", type: "date" },
  { key: "sexo", label: "Sexo" },
  { key: "estado_civil", label: "Estado civil" },
  { key: "email", label: "E-mail", type: "email" },
  { key: "phone", label: "Telefone" },
  { key: "address", label: "Endereço", wide: true },
];
const FUNCTIONAL: FieldDef[] = [
  { key: "matricula_esocial", label: "ID / Matrícula eSocial" },
  { key: "position", label: "Cargo" },
  { key: "department", label: "Departamento" },
  { key: "admission_date", label: "Data de admissão", type: "date" },
  { key: "termination_date", label: "Data de desligamento", type: "date" },
  { key: "termination_reason", label: "Motivo do desligamento" },
  { key: "contract_type", label: "Tipo de contrato (CLT, estágio…)" },
  { key: "work_schedule", label: "Jornada" },
  { key: "salary", label: "Salário (R$)" },
  { key: "pis", label: "PIS/PASEP" },
  { key: "ctps", label: "CTPS" },
  { key: "bank_info", label: "Dados bancários", wide: true },
  { key: "notes", label: "Observações do DP", wide: true, area: true },
];
const KIND_LABEL: Record<string, string> = {
  admissao: "Admissão", atualizacao: "Atualização cadastral", anotacao: "Anotação", promocao: "Promoção",
  alteracao_salarial: "Alteração salarial", ferias: "Férias", advertencia: "Advertência", outro: "Outro",
};

function EmployeePage() {
  const { id } = Route.useParams();
  const get = useServerFn(getEmployee);
  const save = useServerFn(updateEmployeeProfile);
  const note = useServerFn(addEmployeeNote);
  const docLink = useServerFn(getEmployeeDocumentLink);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["employee", id], queryFn: () => get({ data: { id } }) });
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [noteKind, setNoteKind] = useState("anotacao");
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    if (!q.data) return;
    const e = q.data.employee as Record<string, unknown>;
    const f: Record<string, string> = {};
    for (const d of [...PERSONAL, ...FUNCTIONAL]) {
      const v = e[d.key];
      f[d.key] = v == null ? "" : String(v).slice(0, d.type === "date" ? 10 : undefined);
    }
    setForm(f);
  }, [q.data]);

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (q.error || !q.data) return <p className="text-sm text-destructive">Colaborador não encontrado.</p>;
  const { employee, history, documents } = q.data;
  const extra = (employee.profile_data ?? {}) as Record<string, unknown>;

  async function onSave() {
    setSaving(true);
    try {
      const r = await save({ data: { id, fields: form } });
      toast.success(r.changed ? "Ficha atualizada e registrada no histórico." : "Nenhuma alteração.");
      qc.invalidateQueries({ queryKey: ["employee", id] });
      qc.invalidateQueries({ queryKey: ["employees"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function onNote() {
    try {
      await note({ data: { id, kind: noteKind as "anotacao", description: noteText } });
      setNoteText("");
      toast.success("Registro adicionado ao histórico.");
      qc.invalidateQueries({ queryKey: ["employee", id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar");
    }
  }

  async function openDoc(docId: string, download: boolean) {
    try {
      const { url } = await docLink({ data: { id: docId, download } });
      window.open(url, "_blank", "noopener");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao abrir documento");
    }
  }

  const renderFields = (defs: FieldDef[]) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {defs.map((d) => (
        <div key={d.key} className={`space-y-1.5 ${d.wide ? "sm:col-span-2" : ""}`}>
          <Label htmlFor={d.key}>{d.label}</Label>
          {d.key === "sexo" ? (
            <select
              id={d.key}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={form[d.key] ?? ""}
              onChange={(e) => setForm({ ...form, [d.key]: e.target.value })}
            >
              <option value="">Selecione…</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
          ) : d.area ? (
            <Textarea id={d.key} value={form[d.key] ?? ""} onChange={(e) => setForm({ ...form, [d.key]: e.target.value })} />
          ) : (
            <Input id={d.key} type={d.type ?? "text"} value={form[d.key] ?? ""} onChange={(e) => setForm({ ...form, [d.key]: e.target.value })} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/colaboradores"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{employee.full_name}</h1>
            <p className="text-sm text-muted-foreground">
              {employee.position ?? "Sem cargo"} · {employee.termination_date ? "Desligado" : "Ativo"} · Cadastro independente do recrutamento
            </p>
          </div>
        </div>
        <Button onClick={onSave} disabled={saving}><Save className="h-4 w-4" /> Salvar ficha</Button>
      </div>

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados pessoais</TabsTrigger>
          <TabsTrigger value="funcionais">Dados funcionais</TabsTrigger>
          <TabsTrigger value="documentos">Documentos ({documents.length})</TabsTrigger>
          <TabsTrigger value="historico">Histórico ({history.length})</TabsTrigger>
          <TabsTrigger value="disc">DISC</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Card><CardContent className="space-y-4 p-4">
            {renderFields(PERSONAL)}
            {Object.entries(extra).some(([k, v]) => v && k !== "importado_de_candidato_em") && (
              <div className="rounded-md border p-3 text-sm">
                <p className="mb-1 font-medium">Informações trazidas da admissão</p>
                {extra.nome_mae ? <p>Mãe: {String(extra.nome_mae)}</p> : null}
                {extra.nome_pai ? <p>Pai: {String(extra.nome_pai)}</p> : null}
                {extra.local_nascimento ? <p>Naturalidade: {String(extra.local_nascimento)}</p> : null}
                {extra.rg_emissao ? <p>Emissão do RG: {String(extra.rg_emissao)}</p> : null}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="funcionais">
          <Card><CardContent className="p-4">{renderFields(FUNCTIONAL)}</CardContent></Card>
        </TabsContent>

        <TabsContent value="documentos">
          <Card><CardContent className="p-4">
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum documento no prontuário.</p>
            ) : (
              <ul className="divide-y">
                {documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {d.label || d.type}
                      <span className="text-xs text-muted-foreground">
                        · {d.source === "admissao" ? "Admissão" : d.source} · {new Date(d.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </span>
                    <span className="space-x-1">
                      <Button size="sm" variant="outline" onClick={() => openDoc(d.id, false)}><ExternalLink className="h-3 w-3" /> Abrir</Button>
                      <Button size="sm" variant="outline" onClick={() => openDoc(d.id, true)}><Download className="h-3 w-3" /> Baixar</Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" /> Novo registro</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <select className="h-9 rounded-md border bg-background px-2 text-sm" value={noteKind} onChange={(e) => setNoteKind(e.target.value)}>
                  {["anotacao", "promocao", "alteracao_salarial", "ferias", "advertencia", "outro"].map((k) => (
                    <option key={k} value={k}>{KIND_LABEL[k]}</option>
                  ))}
                </select>
                <Input className="flex-1" placeholder="Descreva o registro…" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                <Button onClick={onNote} disabled={noteText.trim().length < 2}>Registrar</Button>
              </div>
              <ul className="space-y-2">
                {history.map((h) => {
                  const ch = (h.changes ?? {}) as Record<string, { de: unknown; para: unknown }>;
                  return (
                    <li key={h.id} className="rounded-md border p-3 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{KIND_LABEL[h.kind] ?? h.kind}</span>
                        <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</span>
                      </div>
                      <p className="text-muted-foreground">{h.description}</p>
                      {Object.entries(ch).map(([k, v]) => (
                        <p key={k} className="text-xs">{k}: <s>{String(v.de ?? "—")}</s> → {String(v.para ?? "—")}</p>
                      ))}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disc">
          <Card><CardContent className="p-4"><DiscCard employeeId={employee.id} name={employee.full_name} /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
