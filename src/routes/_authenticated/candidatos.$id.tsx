import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, XCircle, FileText, Pencil, Save, X, RotateCcw, AlertTriangle, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CandidateStageCard } from "@/components/CandidateStageCard";
import { CorrectionRequestCard } from "@/components/CorrectionRequestCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CandidateStatusBadge } from "@/components/CandidateStatusBadge";
import { crossCheckCandidate, extractDeclaredFromFormData, type CrossCheckResult } from "@/lib/validation/cross-check";
import {
  approveCandidate,
  getCandidateById,
  getCandidateNotifications,
  rejectCandidate,
  reopenCandidate,
  updateCandidateBasicsRH,
  updateDocumentOcr,
  updateCandidateForm,
  softDeleteDocumentRH,
  restoreDocumentRH,
  purgeDocumentRH,
  listLgpdConsentsForCandidate,
} from "@/lib/candidates.functions";

export const Route = createFileRoute("/_authenticated/candidatos/$id")({
  head: () => ({ meta: [{ title: "Revisão do candidato" }] }),
  component: CandidatoDetailPage,
});

const DOC_LABELS: Record<string, string> = {
  rg: "RG", cpf: "CPF", cnh: "CNH",
  ctps: "Carteira de Trabalho",
  titulo_eleitor: "Título de Eleitor",
  foto_3x4: "Foto 3x4",
  certidao: "Certidão Nascimento/Casamento",
  reservista: "Reservista",
  pis_pasep: "PIS/PASEP/NIT",
  comprovante_residencia: "Comprovante de residência",
  escolaridade: "Escolaridade",
  certificado_curso: "Certificado de curso",
  vacinacao_covid: "Vacinação Covid",
  cartao_sus: "Cartão SUS",
  curriculo: "Currículo",
  dependente_certidao: "Dep — Certidão",
  dependente_rg_cpf: "Dep — RG/CPF",
  dependente_vacinacao: "Dep — Vacinação",
  dependente_escolar: "Dep — Escolar",
};

type OcrShape = { values?: Record<string, string>; confidences?: Record<string, number> };
function parseOcr(ocr_data: unknown): { values: Record<string, string>; confidences: Record<string, number> } {
  const raw = (ocr_data ?? {}) as OcrShape & Record<string, unknown>;
  if (raw && typeof raw === "object" && "values" in raw && raw.values) {
    return { values: raw.values as Record<string, string>, confidences: (raw.confidences ?? {}) as Record<string, number> };
  }
  return { values: raw as Record<string, string>, confidences: {} };
}

function CandidatoDetailPage() {
  const { id } = Route.useParams();
  const get = useServerFn(getCandidateById);
  const approve = useServerFn(approveCandidate);
  const reject = useServerFn(rejectCandidate);
  const reopen = useServerFn(reopenCandidate);
  const updateForm = useServerFn(updateCandidateForm);
  const updateBasics = useServerFn(updateCandidateBasicsRH);
  const updateOcr = useServerFn(updateDocumentOcr);
  const getNotif = useServerFn(getCandidateNotifications);
  const softDelete = useServerFn(softDeleteDocumentRH);
  const restoreDoc = useServerFn(restoreDocumentRH);
  const purgeDoc = useServerFn(purgeDocumentRH);
  const getConsents = useServerFn(listLgpdConsentsForCandidate);
  const receiptUrlFn = useServerFn(getConsentReceiptUrl);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["candidate", id], queryFn: () => get({ data: { id } }) });
  const notifQ = useQuery({ queryKey: ["candidate-notif", id], queryFn: () => getNotif({ data: { id } }) });
  const consentsQ = useQuery({ queryKey: ["candidate-lgpd", id], queryFn: () => getConsents({ data: { candidate_id: id } }) });

  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [editingBasics, setEditingBasics] = useState(false);
  const [editingFicha, setEditingFicha] = useState(false);
  const [editingOcr, setEditingOcr] = useState(false);
  const [ocrDraft, setOcrDraft] = useState<Record<string, string>>({});
  const [basics, setBasics] = useState({ full_name: "", cpf: "", email: "", phone: "", position: "" });

  useEffect(() => {
    if (q.data?.documents && !activeDoc) setActiveDoc(q.data.documents[0]?.id ?? null);
  }, [q.data, activeDoc]);

  useEffect(() => {
    if (q.data?.candidate) {
      setBasics({
        full_name: q.data.candidate.full_name ?? "",
        cpf: q.data.candidate.cpf ?? "",
        email: q.data.candidate.email ?? "",
        phone: q.data.candidate.phone ?? "",
        position: q.data.candidate.position ?? "",
      });
    }
  }, [q.data?.candidate]);

  useEffect(() => {
    setEditingOcr(false);
    const d = q.data?.documents.find((x) => x.id === activeDoc);
    setOcrDraft(parseOcr(d?.ocr_data).values);
  }, [activeDoc, q.data?.documents]);

  const doc = q.data?.documents.find((d) => d.id === activeDoc);
  const candidate = q.data?.candidate;

  const approveM = useMutation({
    mutationFn: () => approve({ data: { id } }),
    onSuccess: () => {
      toast.success("Candidato aprovado");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectM = useMutation({
    mutationFn: () => reject({ data: { id, reason } }),
    onSuccess: () => {
      toast.success("Candidato rejeitado");
      setReason("");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reopenM = useMutation({
    mutationFn: () => reopen({ data: { id } }),
    onSuccess: () => {
      toast.success("Candidato reaberto — em processo de admissão");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (q.isError || !candidate) return <p className="text-sm text-rose-600">Erro ao carregar candidato.</p>;

  const formData = (candidate.form_data ?? {}) as Record<string, string>;
  const hasSubmitted = Object.keys(formData).length > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm"><Link to="/candidatos"><ArrowLeft className="h-4 w-4" /> Voltar</Link></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{candidate.full_name}</h1>
          <p className="text-sm text-muted-foreground">{candidate.position ?? "—"} · {candidate.email ?? "sem email"}</p>
        </div>
        <CandidateStatusBadge status={candidate.status as never} />
      </div>

      {!hasSubmitted && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-start gap-3 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">Aguardando o candidato revisar e enviar o cadastro.</div>
              <div className="text-xs text-amber-900/80">
                Os dados extraídos por IA são um rascunho editável pelo candidato — só ficam disponíveis para o RH após o envio final. Você pode conferir os arquivos enviados abaixo.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Dados básicos</CardTitle>
          {!editingBasics ? (
            <Button size="sm" variant="outline" onClick={() => setEditingBasics(true)}>
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => {
                setBasics({
                  full_name: candidate.full_name ?? "",
                  cpf: candidate.cpf ?? "",
                  email: candidate.email ?? "",
                  phone: candidate.phone ?? "",
                  position: candidate.position ?? "",
                });
                setEditingBasics(false);
              }}>
                <X className="h-3.5 w-3.5" /> Cancelar
              </Button>
              <Button size="sm" onClick={async () => {
                try {
                  await updateBasics({ data: { id, ...basics } });
                  toast.success("Dados salvos");
                  setEditingBasics(false);
                  qc.invalidateQueries({ queryKey: ["candidate", id] });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Erro");
                }
              }}>
                <Save className="h-3.5 w-3.5" /> Salvar
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {([
            ["full_name", "Nome completo"],
            ["cpf", "CPF"],
            ["email", "Email"],
            ["phone", "Telefone"],
            ["position", "Cargo"],
          ] as const).map(([k, label]) => (
            <div key={k} className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
              <Input
                value={basics[k]}
                disabled={!editingBasics}
                onChange={(e) => setBasics({ ...basics, [k]: e.target.value })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <CandidateStageCard
        candidateId={id}
        stage={(candidate.stage ?? "cadastro_iniciado") as never}
        stageNote={candidate.stage_note}
      />

      <CorrectionRequestCard
        candidateId={id}
        availableDocuments={Array.from(
          new Map(
            q.data!.documents.map((d) => [d.type as string, { type: d.type as string, label: (d.label ?? d.type) as string }]),
          ).values(),
        )}
      />

      <Tabs defaultValue="documentos">
        <TabsList>
          <TabsTrigger value="documentos">Documentos & OCR</TabsTrigger>
          <TabsTrigger value="ficha">Ficha cadastral</TabsTrigger>
          <TabsTrigger value="conferencia">Conferência cruzada</TabsTrigger>
          <TabsTrigger value="dependentes">Dependentes</TabsTrigger>
          <TabsTrigger value="lixeira">
            Lixeira{q.data?.trash?.length ? ` (${q.data.trash.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="lgpd">Termo LGPD</TabsTrigger>
        </TabsList>

        <TabsContent value="documentos" className="space-y-3">
          <div className={`grid gap-4 ${hasSubmitted ? "lg:grid-cols-[280px_1fr_360px]" : "lg:grid-cols-[280px_1fr]"}`}>
            <Card>
              <CardHeader><CardTitle className="text-sm">Documentos enviados</CardTitle></CardHeader>
              <CardContent className="space-y-1 p-2">
                {q.data!.documents.length === 0 && (
                  <p className="px-2 py-3 text-xs text-muted-foreground">Nenhum documento ainda.</p>
                )}
                {q.data!.documents.map((d) => (
                  <div
                    key={d.id}
                    className={`flex w-full items-center gap-1 rounded-md pr-1 text-sm ${
                      activeDoc === d.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <button
                      onClick={() => setActiveDoc(d.id)}
                      className="flex flex-1 items-center gap-2 px-2 py-2 text-left"
                    >
                      <FileText className="h-4 w-4" />
                      <div className="flex-1">
                        <div className="font-medium">{DOC_LABELS[d.type] ?? d.type}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Confiança: {Math.round((d.ocr_confidence ?? 0) * 100)}%
                        </div>
                      </div>
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                          aria-label="Excluir documento"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Tem certeza de que deseja excluir esse arquivo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O arquivo <strong>{DOC_LABELS[d.type] ?? d.type}</strong> será movido para a lixeira e ficará disponível para restauração por <strong>30 dias</strong> antes de ser excluído permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                await softDelete({ data: { document_id: d.id } });
                                toast.success("Documento movido para a lixeira");
                                if (activeDoc === d.id) setActiveDoc(null);
                                qc.invalidateQueries({ queryKey: ["candidate", id] });
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : "Erro");
                              }
                            }}
                          >
                            Mover para lixeira
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="flex min-h-[400px] items-center justify-center bg-muted/30 p-2">
                {doc?.signed_url ? (
                  /\.(pdf)$/i.test(doc.storage_path) ? (
                    <iframe src={doc.signed_url} className="h-[600px] w-full" title="Documento" />
                  ) : (
                    <img src={doc.signed_url} alt="Documento" className="max-h-[600px] w-auto rounded-md object-contain" />
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">Selecione um documento</p>
                )}
              </CardContent>
            </Card>

            {hasSubmitted && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">Dados extraídos (OCR) — avançado</CardTitle>
                {doc && (!editingOcr ? (
                  <Button size="sm" variant="outline" onClick={() => setEditingOcr(true)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => {
                      setOcrDraft(parseOcr(doc.ocr_data).values);
                      setEditingOcr(false);
                    }}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" onClick={async () => {
                      try {
                        const prev = parseOcr(doc.ocr_data);
                        await updateOcr({ data: { document_id: doc.id, ocr_data: { values: ocrDraft, confidences: prev.confidences } } });
                        toast.success("OCR salvo");
                        setEditingOcr(false);
                        qc.invalidateQueries({ queryKey: ["candidate", id] });
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Erro");
                      }
                    }}>
                      <Save className="h-3.5 w-3.5" /> Salvar
                    </Button>
                  </div>
                ))}
              </CardHeader>
              <CardContent className="space-y-3">
                {doc ? (
                  Object.entries(ocrDraft).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum dado extraído.</p>
                  ) : (
                    Object.entries(ocrDraft).map(([k, v]) => {
                      const conf = doc ? parseOcr(doc.ocr_data).confidences[k] : undefined;
                      const confPct = typeof conf === "number" ? Math.round(conf * 100) : null;
                      const low = confPct !== null && confPct < 90;
                      return (
                        <div key={k} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{k.replace(/_/g, " ")}</Label>
                            {confPct !== null && (
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${low ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>
                                {low ? "⚠" : "✓"} {confPct}%
                              </span>
                            )}
                          </div>
                          <Input
                            value={String(v ?? "")}
                            disabled={!editingOcr}
                            onChange={(e) => setOcrDraft({ ...ocrDraft, [k]: e.target.value })}
                            className={low ? "border-amber-400" : undefined}
                          />
                        </div>
                      );
                    })
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </CardContent>
            </Card>
            )}
          </div>

          {candidate.status !== "aprovado" && candidate.status !== "rejeitado" && (
            <Card>
              <CardContent className="flex flex-wrap items-end gap-3 p-4">
                <div className="flex-1 min-w-[260px] space-y-1.5">
                  <Label htmlFor="reason">Motivo (em caso de rejeição)</Label>
                  <Textarea id="reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={rejectM.isPending || reason.trim().length < 3} onClick={() => rejectM.mutate()}>
                    <XCircle className="h-4 w-4" /> Rejeitar
                  </Button>
                  <Button disabled={approveM.isPending} onClick={() => approveM.mutate()}>
                    <CheckCircle2 className="h-4 w-4" /> Aprovar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {candidate.status === "rejeitado" && candidate.rejection_reason && (
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div><span className="font-medium">Motivo da rejeição:</span> {candidate.rejection_reason}</div>
                <Button size="sm" disabled={reopenM.isPending} onClick={() => reopenM.mutate()}>
                  <RotateCcw className="h-4 w-4" /> Reabrir — mover para em processo
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ficha">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">Ficha consolidada</CardTitle>
              {!editingFicha ? (
                <Button size="sm" variant="outline" onClick={() => setEditingFicha(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => { setEditing({}); setEditingFicha(false); }}>
                  <X className="h-3.5 w-3.5" /> Cancelar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <FichaForm
                disabled={!editingFicha}
                initial={{ ...formData, full_name: candidate.full_name, cpf: candidate.cpf ?? "", email: candidate.email ?? "", phone: candidate.phone ?? "" }}
                editing={editing}
                setEditing={setEditing}
                onSave={async (data) => {
                  await updateForm({ data: { id, form_data: data } });
                  toast.success("Ficha salva");
                  setEditingFicha(false);
                  qc.invalidateQueries({ queryKey: ["candidate", id] });
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conferencia">
          <CrossCheckCard
            result={crossCheckCandidate({
              declared: extractDeclaredFromFormData(candidate.form_data as Record<string, unknown>, {
                full_name: candidate.full_name,
                cpf: candidate.cpf,
              }),
              documents: q.data!.documents.map((d) => ({ type: d.type, dependent_id: d.dependent_id, ocr_data: d.ocr_data })),
            })}
          />
        </TabsContent>

        <TabsContent value="dependentes">
          <Card>
            <CardContent className="p-4">
              {(q.data?.dependents?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum dependente cadastrado.</p>
              ) : (
                <ul className="space-y-3">
                  {q.data!.dependents.map((dep) => {
                    const depDocs = q.data!.documents.filter((d) => d.dependent_id === dep.id);
                    return (
                      <li key={dep.id} className="rounded-md border p-3 text-sm">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div className="font-medium">{dep.full_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {dep.relationship ?? "—"} {dep.birth_date ? `· nasc. ${new Date(dep.birth_date).toLocaleDateString("pt-BR")}` : ""}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          CPF: {dep.cpf ?? "—"} · RG: {dep.rg ?? "—"}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {depDocs.length === 0 && <span className="text-xs text-muted-foreground">Sem documentos.</span>}
                          {depDocs.map((d) => (
                            <a key={d.id} href={d.signed_url ?? "#"} target="_blank" rel="noreferrer" className="rounded bg-muted px-2 py-1 text-xs underline">
                              {DOC_LABELS[d.type] ?? d.type}
                            </a>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lixeira">
          <Card>
            <CardContent className="p-4">
              {(q.data?.trash?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">A lixeira está vazia.</p>
              ) : (
                <ul className="space-y-2">
                  {q.data!.trash!.map((d) => {
                    const deletedAt = d.deleted_at ? new Date(d.deleted_at) : null;
                    const expiresAt = deletedAt ? new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
                    const daysLeft = expiresAt
                      ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
                      : 0;
                    return (
                      <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{DOC_LABELS[d.type] ?? d.type}</div>
                            <div className="text-[11px] text-muted-foreground">
                              Excluído em {deletedAt?.toLocaleString("pt-BR")} · expira em {daysLeft} dia(s)
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {d.signed_url && (
                            <Button asChild size="sm" variant="ghost">
                              <a href={d.signed_url} target="_blank" rel="noreferrer">Visualizar</a>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await restoreDoc({ data: { document_id: d.id } });
                                toast.success("Documento restaurado");
                                qc.invalidateQueries({ queryKey: ["candidate", id] });
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : "Erro");
                              }
                            }}
                          >
                            <Undo2 className="h-3.5 w-3.5" /> Restaurar
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700">
                                <Trash2 className="h-3.5 w-3.5" /> Excluir agora
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O arquivo será removido do armazenamento.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={async () => {
                                    try {
                                      await purgeDoc({ data: { document_id: d.id } });
                                      toast.success("Documento excluído permanentemente");
                                      qc.invalidateQueries({ queryKey: ["candidate", id] });
                                    } catch (e) {
                                      toast.error(e instanceof Error ? e.message : "Erro");
                                    }
                                  }}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="historico">
          <Card>
            <CardContent className="p-4">
              {(notifQ.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum evento ainda.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {notifQ.data!.map((n) => (
                    <li key={n.id} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                      <span className="font-medium">{n.event}</span>
                      <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-BR")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="lgpd">
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Registros de aceite do termo LGPD</div>
                <div className="text-xs text-muted-foreground">{consentsQ.data?.length ?? 0} registro(s)</div>
              </div>
              {consentsQ.isLoading && <p className="text-xs text-muted-foreground">Carregando…</p>}
              {consentsQ.data && consentsQ.data.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum aceite registrado até o momento.</p>
              )}
              <ul className="space-y-3">
                {consentsQ.data?.map((c) => {
                  const dev = (c.device_info ?? {}) as Record<string, unknown>;
                  const geo = c.geolocation as { lat?: number; lng?: number; accuracy?: number } | null;
                  return (
                    <li key={c.id} className="rounded-md border p-3 text-xs">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">Assinado</span>
                        <span className="text-muted-foreground">
                          {new Date(c.accepted_at).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "medium" })}
                        </span>
                        <span className="text-muted-foreground">• Versão {c.terms_version}</span>
                        {c.revoked_at && <span className="rounded bg-rose-100 px-2 py-0.5 font-medium text-rose-800">Revogado</span>}
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <Field label="Nome assinado" value={c.signature_name ?? "—"} />
                        <Field label="CPF confirmado" value={c.signature_cpf ?? "—"} />
                        <Field label="IP" value={c.ip_address ?? "—"} />
                        <Field label="Dispositivo" value={String(dev.device_type ?? "—")} />
                        <Field label="Plataforma" value={String(dev.platform ?? "—")} />
                        <Field label="Idioma" value={String(dev.language ?? "—")} />
                        <Field label="Fuso horário" value={String(dev.timezone ?? "—")} />
                        <Field label="Tela" value={dev.screen ? `${(dev.screen as {w:number;h:number}).w}×${(dev.screen as {w:number;h:number}).h}` : "—"} />
                        <Field
                          label="Localização"
                          value={
                            geo && typeof geo.lat === "number" && typeof geo.lng === "number"
                              ? `${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}${geo.accuracy ? ` (±${Math.round(geo.accuracy)}m)` : ""}`
                              : c.geo_consent ? "Autorizada — não capturada" : "Não autorizada"
                          }
                        />
                        <Field label="Hash do termo (SHA-256)" value={c.terms_hash ? c.terms_hash.slice(0, 24) + "…" : "—"} />
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const { url } = await receiptUrlFn({ data: { consentId: c.id } });
                              window.open(url, "_blank", "noopener,noreferrer");
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Não foi possível gerar o comprovante.");
                            }
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" /> Baixar comprovante (PDF)
                        </button>
                      </div>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">Ver User-Agent completo e texto do termo</summary>
                        <div className="mt-2 space-y-2">
                          <div className="rounded bg-muted/50 p-2 text-[11px] font-mono break-all">{c.user_agent ?? "—"}</div>
                          <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded bg-muted/40 p-2 text-[11px] text-muted-foreground">
                            {c.terms_text ?? "—"}
                          </div>
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate text-xs text-foreground">{value}</div>
    </div>
  );
}

function FichaForm({
  initial,
  editing,
  setEditing,
  onSave,
  disabled,
}: {
  initial: Record<string, string>;
  editing: Record<string, string>;
  setEditing: (v: Record<string, string>) => void;
  onSave: (data: Record<string, string>) => Promise<void>;
  disabled?: boolean;
}) {
  const merged = { ...initial, ...editing };
  const fields: Array<[string, string]> = [
    ["full_name", "Nome completo"],
    ["cpf", "CPF"],
    ["email", "Email"],
    ["phone", "Telefone"],
    ["data_nascimento", "Data de nascimento"],
    ["endereco", "Endereço"],
    ["cidade", "Cidade"],
    ["uf", "UF"],
    ["cep", "CEP"],
  ];
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave(merged);
      }}
      className="grid gap-3 md:grid-cols-2"
    >
      {fields.map(([k, label]) => (
        <div key={k} className="space-y-1.5">
          <Label>{label}</Label>
          <Input
            value={merged[k] ?? ""}
            disabled={disabled}
            onChange={(e) => setEditing({ ...editing, [k]: e.target.value })}
          />
        </div>
      ))}
      <div className="md:col-span-2">
        <Button type="submit" disabled={disabled}>
          <Save className="h-4 w-4" /> Salvar ficha
        </Button>
      </div>
    </form>
  );
}

function CrossCheckCard({ result }: { result: CrossCheckResult }) {
  const { fields, summary } = result;
  const statusColor = (s: string) =>
    s === "ok" ? "bg-emerald-100 text-emerald-900" : s === "divergente" ? "bg-amber-100 text-amber-900" : "bg-muted text-muted-foreground";
  const statusLabel = (s: string) => (s === "ok" ? "OK" : s === "divergente" ? "Divergente" : "Ausente");
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">Conferência entre documentos</CardTitle>
        <div className="flex items-center gap-1 text-xs">
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-900">OK {summary.ok}</span>
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">Diverg. {summary.divergente}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">Ausente {summary.ausente}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map((f) => (
          <div key={f.campo} className="rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">{f.label}</div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor(f.status)}`}>
                {f.status === "divergente" && <AlertTriangle className="h-3 w-3" />}
                {f.status === "ok" && <CheckCircle2 className="h-3 w-3" />}
                {statusLabel(f.status)}
              </span>
            </div>
            {f.valores.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">Nenhum documento traz esse campo ainda.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-xs">
                {f.valores.map((v) => (
                  <li key={`${f.campo}-${v.origem}`} className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      {v.origem_label}
                      {typeof v.confianca === "number" && (
                        <span className="ml-1 text-[10px] text-muted-foreground/70">({Math.round(v.confianca * 100)}%)</span>
                      )}
                    </span>
                    <span className="font-mono">{v.valor}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}