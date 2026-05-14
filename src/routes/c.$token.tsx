import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Upload, CheckCircle2, ShieldCheck, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  createDocumentUploadUrl,
  finalizeDocumentUpload,
  getCandidateByToken,
  submitCandidateApplication,
  updateCandidateBasics,
} from "@/lib/candidate-public.functions";
import { isValidCpf } from "@/lib/cpf";

export const Route = createFileRoute("/c/$token")({
  head: () => ({ meta: [{ title: "Sua admissão digital" }] }),
  component: CandidatePage,
});

const ALL_DOCS: ReadonlyArray<{ type: "rg" | "cpf" | "cnh" | "comprovante_residencia"; label: string; driverOnly?: boolean }> = [
  { type: "rg", label: "RG" },
  { type: "cpf", label: "CPF" },
  { type: "cnh", label: "CNH", driverOnly: true },
  { type: "comprovante_residencia", label: "Comprovante de residência" },
];

function isDriver(position: string | null | undefined) {
  return !!position && /motorista/i.test(position);
}

function CandidatePage() {
  const { token } = Route.useParams();
  const get = useServerFn(getCandidateByToken);
  const updateBasics = useServerFn(updateCandidateBasics);
  const createUpload = useServerFn(createDocumentUploadUrl);
  const finalize = useServerFn(finalizeDocumentUpload);
  const submit = useServerFn(submitCandidateApplication);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["c", token], queryFn: () => get({ data: { token } }), retry: false });
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState<string | null>(null);

  if (q.isLoading) return <Center><Loader2 className="h-5 w-5 animate-spin" /></Center>;
  if (q.isError) return <Center><p className="text-sm text-rose-600">{(q.error as Error).message}</p></Center>;

  const { candidate, documents } = q.data!;
  const uploadedTypes = new Set(documents.map((d) => d.type));
  const driver = isDriver(candidate.position);
  const DOCS = ALL_DOCS.filter((d) => !d.driverOnly || driver);
  const allUploaded = DOCS.every((d) => uploadedTypes.has(d.type));

  if (candidate.status === "aprovado") return <Done title="Admissão aprovada!" desc="Você receberá os próximos passos por email." />;
  if (candidate.status === "rejeitado") return <Done title="Cadastro encerrado" desc="Entre em contato com o RH para mais informações." />;

  async function handleBasics(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const cpf = String(fd.get("cpf"));
    if (!isValidCpf(cpf)) return toast.error("CPF inválido");
    try {
      await updateBasics({
        data: {
          token,
          full_name: String(fd.get("full_name")),
          cpf,
          email: String(fd.get("email") ?? ""),
          phone: String(fd.get("phone") ?? ""),
        },
      });
      qc.invalidateQueries({ queryKey: ["c", token] });
      setStep(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  async function uploadFile(type: string, file: File) {
    setUploading(type);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const sig = await createUpload({ data: { token, type: type as never, ext } });
      const up = await fetch(sig.signedUrl, { method: "PUT", body: file, headers: { "content-type": file.type } });
      if (!up.ok) throw new Error("Upload falhou");
      await finalize({ data: { token, type: type as never, storage_path: sig.path } });
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
      const formData: Record<string, string> = {};
      for (const d of documents) {
        Object.assign(formData, (d.ocr_data ?? {}) as Record<string, string>);
      }
      await submit({ data: { token, form_data: formData } });
      toast.success("Cadastro enviado!");
      qc.invalidateQueries({ queryKey: ["c", token] });
      setStep(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  return (
    <div className="min-h-screen bg-secondary">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Admissão Digital</div>
            <div className="text-[11px] text-muted-foreground">Etapa {step + 1} de 3</div>
          </div>
        </div>
        <div className="h-1 bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / 3) * 100}%` }} />
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 p-4">
        {step === 0 && (
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <h1 className="text-xl font-semibold">Olá, {candidate.full_name}! 👋</h1>
                <p className="mt-1 text-sm text-muted-foreground">Vamos confirmar seus dados básicos antes do envio dos documentos.</p>
              </div>
              <form onSubmit={handleBasics} className="space-y-3">
                <Field label="Nome completo" name="full_name" defaultValue={candidate.full_name} required />
                <Field label="CPF" name="cpf" defaultValue={candidate.cpf ?? ""} placeholder="000.000.000-00" required />
                <Field label="Email" name="email" type="email" defaultValue={candidate.email ?? ""} />
                <Field label="Telefone" name="phone" defaultValue={candidate.phone ?? ""} />
                <Button type="submit" className="w-full">Continuar</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <>
            <div>
              <h1 className="text-xl font-semibold">Envie seus documentos</h1>
              <p className="mt-1 text-sm text-muted-foreground">Tire fotos nítidas. Aceitamos JPG, PNG e PDF.</p>
            </div>
            <div className="space-y-2">
              {DOCS.map((d) => {
                const done = uploadedTypes.has(d.type);
                return (
                  <Card key={d.type}>
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-md ${done ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                          {done ? <CheckCircle2 className="h-5 w-5" /> : <FileText className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{d.label}</div>
                          <div className="text-xs text-muted-foreground">{done ? "Enviado" : "Pendente"}</div>
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
                            if (f) uploadFile(d.type, f);
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
            <Button className="w-full" disabled={!allUploaded} onClick={() => setStep(2)}>
              Revisar dados
            </Button>
          </>
        )}

        {step === 2 && (
          <Card>
            <CardContent className="space-y-3 p-5">
              <h1 className="text-xl font-semibold">Confirme suas informações</h1>
              <p className="text-sm text-muted-foreground">Os dados abaixo foram extraídos automaticamente dos seus documentos. Revise antes de enviar.</p>
              <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
                {documents.map((d) => (
                  <div key={d.id}>
                       <div className="text-xs font-semibold uppercase text-muted-foreground">{ALL_DOCS.find((x) => x.type === d.type)?.label}</div>
                    {Object.entries((d.ocr_data ?? {}) as Record<string, string>).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <span className="text-muted-foreground">{k.replace(/_/g, " ")}</span>
                        <span className="font-medium">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Voltar</Button>
                <Button className="flex-1" onClick={handleSubmit}>Enviar cadastro</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && <Done title="Tudo certo!" desc="Seu cadastro foi enviado para análise. Você receberá retorno em breve." />}
      </main>
    </div>
  );
}

function Field({ label, name, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...rest} />
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