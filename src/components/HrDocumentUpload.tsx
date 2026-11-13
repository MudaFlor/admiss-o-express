import { useState } from "react";
import { compressImageFile } from "@/lib/image-compress";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createHrDocumentUploadUrl, finalizeHrDocumentUpload, takeOverAdmission, submitApplicationByHr, HR_UPLOAD_TYPES } from "@/lib/hr-document-upload.functions";

type T = (typeof HR_UPLOAD_TYPES)[number];

export function HrDocumentUpload({ candidateId, labels, takenOver }: { candidateId: string; labels: Record<string, string>; takenOver: boolean }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<T>("rg");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const createUrl = useServerFn(createHrDocumentUploadUrl);
  const finalize = useServerFn(finalizeHrDocumentUpload);
  const takeOver = useServerFn(takeOverAdmission);

  async function confirmTakeOver() {
    setBusy(true);
    try {
      await takeOver({ data: { candidate_id: candidateId } });
      toast.success("Admissão assumida pelo RH. O link do candidato foi encerrado.");
      await qc.invalidateQueries({ queryKey: ["candidate", candidateId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao assumir admissão");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    const picked = file;
    if (!picked) return toast.error("Selecione um arquivo.");
    const upFile = await compressImageFile(picked);
    if (upFile.size > 10 * 1024 * 1024) return toast.error("Arquivo acima de 10 MB.");
    const ext = (upFile.name.split(".").pop() ?? "").toLowerCase();
    setBusy(true);
    try {
      const up = await createUrl({ data: { candidate_id: candidateId, type, ext } });
      const { error } = await supabase.storage.from("candidate-documents").uploadToSignedUrl(up.path, up.token, upFile, { contentType: upFile.type || undefined });
      if (error) throw new Error("Falha ao enviar o arquivo.");
      const r = await finalize({ data: { candidate_id: candidateId, type, storage_path: up.path } });
      toast.success(r.fields ? `Documento anexado. ${r.fields} campo(s) extraído(s) pelo OCR.` : "Documento anexado.");
      await qc.invalidateQueries({ queryKey: ["candidate", candidateId] });
      setFile(null);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao anexar documento");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Upload className="mr-1 h-4 w-4" />Importar documento</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar documento do candidato</DialogTitle>
          <DialogDescription>Para candidatos sem acesso a um aparelho. O OCR lê o arquivo e alimenta a ficha.</DialogDescription>
        </DialogHeader>
        {!takenOver ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">Assumir admissão pelo RH?</p>
            <p className="text-sm text-muted-foreground">Os documentos já enviados pelo candidato serão mantidos e o link dele será encerrado. O RH passa a completar os dados.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
              <Button onClick={confirmTakeOver} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "OK"}</Button>
            </div>
          </div>
        ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Tipo de documento</Label>
            <Select value={type} onValueChange={(v) => setType(v as T)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {HR_UPLOAD_TYPES.map((t) => <SelectItem key={t} value={t}>{labels[t] ?? t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="hr-doc-file">Arquivo (PDF, JPG ou PNG, até 10 MB)</Label>
            <input id="hr-doc-file" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="block w-full text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <Button className="w-full" onClick={send} disabled={busy || !file}>
            {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Lendo documento…</> : "Enviar e processar OCR"}
          </Button>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function HrAdmissionBar({ candidateId, info }: { candidateId: string; info: { nome?: string | null; em?: string } }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const qc = useQueryClient();
  const submit = useServerFn(submitApplicationByHr);
  async function go() {
    setBusy(true);
    setProblem(null);
    try {
      await submit({ data: { candidate_id: candidateId } });
      toast.success("Dados concluídos. Admissão seguiu para análise.");
      await qc.invalidateQueries({ queryKey: ["candidate", candidateId] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao concluir";
      setProblem(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">Admissão conduzida pelo RH</span>
          <span className="ml-2 text-muted-foreground">
            {info.nome ? `por ${info.nome} ` : ""}{info.em ? `em ${new Date(info.em).toLocaleString("pt-BR")}` : ""} · link do candidato encerrado
          </span>
        </div>
        <Button size="sm" onClick={go} disabled={busy}>
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}Concluir dados e seguir admissão
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Complete os campos na aba Ficha e importe os documentos faltantes antes de concluir.</p>
      {problem && <p className="mt-2 font-medium text-destructive">O que falta: {problem}</p>}
    </div>
  );
}
