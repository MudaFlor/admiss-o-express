import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createHrDocumentUploadUrl, finalizeHrDocumentUpload, HR_UPLOAD_TYPES } from "@/lib/hr-document-upload.functions";

type T = (typeof HR_UPLOAD_TYPES)[number];

export function HrDocumentUpload({ candidateId, labels }: { candidateId: string; labels: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<T>("rg");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const createUrl = useServerFn(createHrDocumentUploadUrl);
  const finalize = useServerFn(finalizeHrDocumentUpload);

  async function send() {
    if (!file) return toast.error("Selecione um arquivo.");
    if (file.size > 10 * 1024 * 1024) return toast.error("Arquivo acima de 10 MB.");
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    setBusy(true);
    try {
      const up = await createUrl({ data: { candidate_id: candidateId, type, ext } });
      const { error } = await supabase.storage.from("candidate-documents").uploadToSignedUrl(up.path, up.token, file, { contentType: file.type || undefined });
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
      </DialogContent>
    </Dialog>
  );
}
