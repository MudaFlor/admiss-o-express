import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Upload, CheckCircle2, ShieldCheck, FileText, Loader2, Sparkles, Trash2, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  acceptLgpdConsent,
  createDocumentUploadUrl,
  deleteDocument,
  finalizeDocumentUpload,
  getCandidateByToken,
  parseResumeForCandidate,
  removeDependent,
  requestDataDeletion,
  submitCandidateApplication,
  upsertDependent,
} from "@/lib/candidate-public.functions";

export const Route = createFileRoute("/c/$token")({
  head: () => ({ meta: [{ title: "Sua admissao digital" }] }),
  component: CandidatePage,
});

type DocType =
  | "rg" | "cpf" | "cnh" | "ctps" | "titulo_eleitor" | "foto_3x4" | "certidao"
  | "reservista" | "pis_pasep" | "comprovante_residencia" | "escolaridade"
  | "certificado_curso" | "vacinacao_covid" | "cartao_sus" | "curriculo"
  | "dependente_certidao" | "dependente_rg_cpf" | "dependente_vacinacao" | "dependente_escolar";

type DocDef = { type: DocType; label: string; hint?: string; optional?: boolean; multi?: boolean };

const HOLDER_DOCS: ReadonlyArray<DocDef> = [
  { type: "rg", label: "RG ou CIN", hint: "Frente e verso, ou envie a CNH no lugar" },
  { type: "cpf", label: "CPF", hint: "Pode ser foto do cartão CPF ou comprovante" },
  { type: "cnh", label: "CNH (se tiver)", optional: true, hint: "Substitui o RG se preferir" },
  { type: "ctps", label: "Carteira de Trabalho Digital", hint: "Print/arquivo da CTPS Digital" },
  { type: "titulo_eleitor", label: "Título de Eleitor" },
  { type: "foto_3x4", label: "Foto 3x4", hint: "Pode tirar agora com a câmera" },
  { type: "certidao", label: "Certidão de Nascimento ou Casamento" },
  { type: "reservista", label: "Reservista", hint: "Obrigatório se sexo masculino" },
  { type: "pis_pasep", label: "PIS/PASEP ou NIT" },
  { type: "comprovante_residencia", label: "Comprovante de residência" },
  { type: "escolaridade", label: "Comprovante de Escolaridade" },
  { type: "cartao_sus", label: "Cartão SUS", optional: true },
  { type: "vacinacao_covid", label: "Vacinação Covid", optional: true, multi: true },
  { type: "certificado_curso", label: "Certificados de Cursos", optional: true, multi: true },
];

interface FormState {
  full_name: string; cpf: string; rg: string; rg_emissao: string;
  data_nascimento: string; local_nascimento: string; nome_pai: string; nome_mae: string;
  email: string; telefone: string; endereco: string; linkedin: string;
  formacao: string; experiencias: string; competencias: string;
  sexo: string; cor_raca: string; estado_civil: string;
}
const emptyForm = (): FormState => ({
  full_name: "", cpf: "", rg: "", rg_emissao: "", data_nascimento: "", local_nascimento: "",
  nome_pai: "", nome_mae: "", email: "", telefone: "", endereco: "", linkedin: "",
  formacao: "", experiencias: "", competencias: "",
  sexo: "", cor_raca: "", estado_civil: "",
});

function CandidatePage() {
  const { token } = Route.useParams();
  const get = useServerFn(getCandidateByToken);
  const accept = useServerFn(acceptLgpdConsent);
  const createUpload = useServerFn(createDocumentUploadUrl);
  const finalize = useServerFn(finalizeDocumentUpload);
  const parseResume = useServerFn(parseResumeForCandidate);
  const submit = useServerFn(submitCandidateApplication);
  const requestDeletion = useServerFn(requestDataDeletion);
  const saveDependent = useServerFn(upsertDependent);
  const dropDependent = useServerFn(removeDependent);
  const dropDoc = useServerFn(deleteDocument);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["c", token],
    queryFn: () => get({ data: { token } }),
    retry: false,
  });

  const [consent, setConsent] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [autoFilled, setAutoFilled] = useState<Set<keyof FormState>>(new Set());
  const [step, setStep] = useState(0);

  const lgpdAt = q.data?.candidate.lgpd_accepted_at;
  useEffect(() => {
    if (lgpdAt && step === 0) setStep(1);
  }, [lgpdAt, step]);

  if (q.isLoading) return <Center><Loader2 className="h-5 w-5 animate-spin" /></Center>;
  if (q.isError) return <Center><p className="text-sm text-rose-600">{(q.error as Error).message}</p></Center>;

  const { candidate, documents } = q.data!;

  if (candidate.deletion_requested_at) {
    return <Done title="Solicitacao registrada" desc="Recebemos sua solicitacao de exclusao. O RH entrara em contato." />;
  }
  if (candidate.status === "aprovado") return <Done title="Admissao aprovada!" desc="Voce recebera os proximos passos por email." />;
  if (candidate.status === "rejeitado") return <Done title="Cadastro encerrado" desc="Entre em contato com o RH para mais informacoes." />;

  const sexo = candidate.sexo ?? "";
  const requireReservista = sexo === "masculino";
  const DOCS = HOLDER_DOCS;
  const uploadedTypes = new Set(documents.filter((d) => !d.dependent_id).map((d) => d.type));
  const hasIdentidade = uploadedTypes.has("rg") || uploadedTypes.has("cnh");
  const requiredTypes: DocType[] = DOCS
    .filter((d) => !d.optional && !(d.type === "rg" && uploadedTypes.has("cnh")) && !(d.type === "reservista" && !requireReservista))
    .map((d) => d.type);
  const allUploaded = hasIdentidade && requiredTypes.every((t) => uploadedTypes.has(t));
  const totalSteps = 4;

  function setField<K extends keyof FormState>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setAutoFilled((s) => {
      if (!s.has(k)) return s;
      const n = new Set(s); n.delete(k); return n;
    });
  }

  async function handleAcceptLgpd() {
    if (!consent) return toast.error("Confirme o aceite do termo");
    setAccepting(true);
    try {
      await accept({ data: { token } });
      toast.success("Termo aceito");
      await qc.invalidateQueries({ queryKey: ["c", token] });
      setStep(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setAccepting(false);
    }
  }

  async function handleResumeUpload(file: File) {
    setParsing(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
      if (!["pdf", "docx", "jpg", "jpeg", "png", "webp"].includes(ext))
        throw new Error("Formato nao suportado");
      if (file.size > 10 * 1024 * 1024) throw new Error("Arquivo maior que 10MB");

      const sig = await createUpload({ data: { token, type: "curriculo", ext } });
      const up = await fetch(sig.signedUrl, { method: "PUT", body: file, headers: { "content-type": file.type } });
      if (!up.ok) throw new Error("Upload falhou");

      const parsed = await parseResume({ data: { token, storage_path: sig.path } });

      const mapped: FormState = {
        full_name: parsed.full_name ?? candidate.full_name ?? "",
        cpf: parsed.cpf ?? candidate.cpf ?? "",
        rg: parsed.rg ?? "",
        rg_emissao: parsed.rg_emissao ?? "",
        data_nascimento: parsed.data_nascimento ?? "",
        local_nascimento: parsed.local_nascimento ?? "",
        nome_pai: parsed.nome_pai ?? "",
        nome_mae: parsed.nome_mae ?? "",
        email: parsed.email ?? candidate.email ?? "",
        telefone: parsed.telefone ?? candidate.phone ?? "",
        endereco: parsed.endereco ?? "",
        linkedin: parsed.linkedin ?? "",
        formacao: (parsed.formacao ?? []).map((f) => `${f.curso} - ${f.instituicao} (${f.periodo})`).join("\n"),
        experiencias: (parsed.experiencias ?? []).map((e) => `${e.cargo} @ ${e.empresa} (${e.periodo})\n${e.descricao}`).join("\n\n"),
        competencias: (parsed.competencias ?? []).join(", "),
      };
      setForm(mapped);
      setAutoFilled(new Set(Object.entries(mapped).filter(([, v]) => v && String(v).trim()).map(([k]) => k as keyof FormState)));
      const found = Object.values(mapped).filter((v) => v && String(v).trim()).length;
      toast.success(`${found} campos preenchidos automaticamente`);
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao analisar curriculo");
    } finally {
      setParsing(false);
    }
  }

  function skipResume() {
    const f = emptyForm();
    f.full_name = candidate.full_name ?? "";
    f.cpf = candidate.cpf ?? "";
    f.email = candidate.email ?? "";
    f.telefone = candidate.phone ?? "";
    setForm(f);
    setStep(2);
  }

  async function uploadDoc(type: DocType, file: File, opts?: { dependent_id?: string; label?: string }) {
    const key = `${type}:${opts?.dependent_id ?? ""}`;
    setUploading(key);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const sig = await createUpload({ data: { token, type, ext } });
      const up = await fetch(sig.signedUrl, { method: "PUT", body: file, headers: { "content-type": file.type } });
      if (!up.ok) throw new Error("Upload falhou");
      await finalize({ data: { token, type, storage_path: sig.path, dependent_id: opts?.dependent_id, label: opts?.label } });
      toast.success("Documento enviado!");
      qc.invalidateQueries({ queryKey: ["c", token] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(null);
    }
  }

  async function handleSubmit() {
    try {
      await submit({ data: {
        token,
        form_data: form as unknown as Record<string, unknown>,
        sexo: form.sexo || undefined,
        cor_raca: form.cor_raca || undefined,
        estado_civil: form.estado_civil || undefined,
      } });
      toast.success("Cadastro enviado!");
      qc.invalidateQueries({ queryKey: ["c", token] });
      setStep(4);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  async function handleDeletion() {
    try {
      await requestDeletion({ data: { token } });
      toast.success("Solicitacao enviada");
      qc.invalidateQueries({ queryKey: ["c", token] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  return (
    <div className="min-h-screen bg-secondary pb-20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Admissao Digital</div>
            <div className="text-[11px] text-muted-foreground">
              {step < 4 ? `Etapa ${Math.min(step + 1, totalSteps)} de ${totalSteps}` : "Concluido"}
            </div>
          </div>
        </div>
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${(Math.min(step + 1, totalSteps) / totalSteps) * 100}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 p-4">
        {step === 0 && (
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-semibold">Termo de consentimento - LGPD</h1>
              </div>
              <div className="max-h-72 overflow-y-auto rounded-md border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                <p className="mb-2"><strong className="text-foreground">Tratamento de dados pessoais.</strong> Em conformidade com a Lei n 13.709/2018 (LGPD), autorizo a coleta, o armazenamento e o tratamento dos meus dados pessoais e documentos enviados nesta plataforma.</p>
                <p className="mb-2"><strong className="text-foreground">Finalidade.</strong> Os dados serao utilizados <strong>exclusivamente</strong> para fins de recrutamento e selecao, incluindo analise de perfil, contato e formalizacao de contratacao.</p>
                <p className="mb-2"><strong className="text-foreground">Compartilhamento.</strong> Os dados nao serao compartilhados com terceiros sem minha autorizacao, exceto quando exigido por lei.</p>
                <p className="mb-2"><strong className="text-foreground">Seguranca.</strong> A empresa adota medidas tecnicas e administrativas de seguranca, incluindo armazenamento criptografado e controle de acesso restrito.</p>
                <p className="mb-2"><strong className="text-foreground">Direitos do titular.</strong> Posso solicitar a qualquer momento a confirmacao, acesso, correcao ou exclusao dos meus dados, conforme art. 18 da LGPD.</p>
                <p><strong className="text-foreground">Registro do aceite.</strong> Data, hora, IP e identificacao do dispositivo serao registrados como prova do consentimento.</p>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3">
                <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                <span className="text-sm">Li e <strong>aceito</strong> os termos de tratamento dos meus dados pessoais conforme a LGPD.</span>
              </label>
              <Button className="w-full" disabled={!consent || accepting} onClick={handleAcceptLgpd}>
                {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aceitar e continuar"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-semibold">Envie seu curriculo</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Vamos ler seu curriculo automaticamente e preencher o formulario pra voce. Aceitamos PDF, DOCX, JPG e PNG.
              </p>
              <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${parsing ? "opacity-60" : "hover:border-primary hover:bg-primary/5"}`}>
                <input
                  type="file"
                  accept=".pdf,.docx,image/*"
                  className="hidden"
                  disabled={parsing}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleResumeUpload(f);
                  }}
                />
                {parsing ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <div className="text-sm font-medium">Analisando curriculo...</div>
                    <div className="text-xs text-muted-foreground">A IA esta extraindo seus dados</div>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div className="text-sm font-medium">Toque para enviar</div>
                    <div className="text-xs text-muted-foreground">PDF, DOCX, JPG ou PNG (max 10MB)</div>
                  </>
                )}
              </label>
              <Button variant="ghost" className="w-full" onClick={skipResume} disabled={parsing}>
                Nao tenho curriculo, preencher manualmente
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <h1 className="text-lg font-semibold">Revise suas informacoes</h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
                  Campos com brilho foram preenchidos pela IA. Voce pode editar tudo.
                </p>
              </div>

              <Section title="Dados pessoais">
                <SmartField label="Nome completo" k="full_name" form={form} setField={setField} autoFilled={autoFilled} />
                <SmartField label="CPF" k="cpf" form={form} setField={setField} autoFilled={autoFilled} />
                <Grid2>
                  <SmartField label="RG" k="rg" form={form} setField={setField} autoFilled={autoFilled} />
                  <SmartField label="Data de emissao" k="rg_emissao" form={form} setField={setField} autoFilled={autoFilled} placeholder="DD/MM/AAAA" />
                </Grid2>
                <Grid2>
                  <SmartField label="Data de nascimento" k="data_nascimento" form={form} setField={setField} autoFilled={autoFilled} placeholder="DD/MM/AAAA" />
                  <SmartField label="Local de nascimento" k="local_nascimento" form={form} setField={setField} autoFilled={autoFilled} />
                </Grid2>
                <SmartField label="Nome do pai" k="nome_pai" form={form} setField={setField} autoFilled={autoFilled} />
                <SmartField label="Nome da mae" k="nome_mae" form={form} setField={setField} autoFilled={autoFilled} />
              </Section>

              <Section title="Contato">
                <SmartField label="Email" k="email" form={form} setField={setField} autoFilled={autoFilled} type="email" />
                <SmartField label="Telefone" k="telefone" form={form} setField={setField} autoFilled={autoFilled} />
                <SmartField label="Endereco" k="endereco" form={form} setField={setField} autoFilled={autoFilled} />
                <SmartField label="LinkedIn" k="linkedin" form={form} setField={setField} autoFilled={autoFilled} placeholder="linkedin.com/in/seu-perfil" />
              </Section>

              <Section title="Trajetoria">
                <SmartArea label="Formacao academica" k="formacao" form={form} setField={setField} autoFilled={autoFilled} rows={3} />
                <SmartArea label="Experiencias profissionais" k="experiencias" form={form} setField={setField} autoFilled={autoFilled} rows={5} />
                <SmartArea label="Competencias" k="competencias" form={form} setField={setField} autoFilled={autoFilled} rows={2} placeholder="Separe por virgula" />
              </Section>

              <Button className="w-full" onClick={() => setStep(3)} disabled={!form.full_name || !form.cpf}>
                Continuar para documentos
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <>
            <div>
              <h1 className="text-lg font-semibold">Envie seus documentos</h1>
              <p className="mt-1 text-sm text-muted-foreground">Tire fotos nitidas. Aceitamos JPG, PNG e PDF.</p>
            </div>
            <div className="space-y-2">
              {DOCS.map((d) => {
                const uploaded = documents.find((x) => x.type === d.type);
                const done = !!uploaded;
                const isPdf = uploaded?.storage_path ? /\.pdf$/i.test(uploaded.storage_path) : false;
                return (
                  <Card key={d.type}>
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3">
                        {done && uploaded?.signed_url && !isPdf ? (
                          <a href={uploaded.signed_url} target="_blank" rel="noreferrer" className="block">
                            <img
                              src={uploaded.signed_url}
                              alt={d.label}
                              className="h-14 w-14 rounded-md border object-cover"
                            />
                          </a>
                        ) : (
                          <div className={`flex h-14 w-14 items-center justify-center rounded-md ${done ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                            {done ? <CheckCircle2 className="h-5 w-5" /> : <FileText className="h-4 w-4" />}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium">{d.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {done ? (
                              uploaded?.signed_url ? (
                                <a href={uploaded.signed_url} target="_blank" rel="noreferrer" className="text-primary underline">
                                  {isPdf ? "Visualizar PDF" : "Ver em tamanho real"}
                                </a>
                              ) : "Enviado"
                            ) : "Pendente"}
                          </div>
                        </div>
                      </div>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          capture="environment"
                          className="hidden"
                          disabled={uploading === d.type}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadDoc(d.type, f);
                          }}
                        />
                        <span className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-md border bg-background px-3 text-sm hover:bg-accent">
                          {uploading === d.type ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          {done ? "Trocar" : "Enviar"}
                        </span>
                      </label>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Voltar</Button>
              <Button className="flex-1" disabled={!allUploaded} onClick={handleSubmit}>
                Enviar cadastro
              </Button>
            </div>
          </>
        )}

        {step === 4 && <Done title="Tudo certo!" desc="Seu cadastro foi enviado para analise. Voce recebera retorno em breve." />}

        {step < 4 && (
          <div className="rounded-md border bg-background/60 p-3 text-[11px] text-muted-foreground">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <div className="flex-1">
                Seus dados sao protegidos pela LGPD e usados apenas para recrutamento.{" "}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground">
                      <Trash2 className="h-3 w-3" /> Solicitar exclusao dos meus dados
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Solicitar exclusao de dados?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acao envia uma solicitacao ao RH para que seus dados e documentos sejam excluidos. Voce nao podera continuar com este cadastro depois.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeletion}>Confirmar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function SmartField<K extends keyof FormState>(props: {
  label: string; k: K; form: FormState; setField: (k: K, v: string) => void;
  autoFilled: Set<keyof FormState>; type?: string; placeholder?: string;
}) {
  const { label, k, form, setField, autoFilled, type, placeholder } = props;
  const filled = autoFilled.has(k);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={k} className="flex items-center gap-1.5 text-xs">
        {label}
        {filled && <Sparkles className="h-3 w-3 text-primary" />}
      </Label>
      <Input
        id={k} name={k} type={type} placeholder={placeholder}
        value={form[k]} onChange={(e) => setField(k, e.target.value)}
        className={filled ? "border-primary/40 bg-primary/5" : ""}
      />
    </div>
  );
}

function SmartArea<K extends keyof FormState>(props: {
  label: string; k: K; form: FormState; setField: (k: K, v: string) => void;
  autoFilled: Set<keyof FormState>; rows?: number; placeholder?: string;
}) {
  const { label, k, form, setField, autoFilled, rows, placeholder } = props;
  const filled = autoFilled.has(k);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={k} className="flex items-center gap-1.5 text-xs">
        {label}
        {filled && <Sparkles className="h-3 w-3 text-primary" />}
      </Label>
      <Textarea
        id={k} name={k} rows={rows} placeholder={placeholder}
        value={form[k]} onChange={(e) => setField(k, e.target.value)}
        className={filled ? "border-primary/40 bg-primary/5" : ""}
      />
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center">{children}</div>;
}

function Done({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </CardContent>
      </Card>
    </div>
  );
}
