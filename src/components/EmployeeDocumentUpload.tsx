import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { validateFile } from "@/lib/upload-rules";
import { createEmployeeDocumentUploadUrl, finalizeEmployeeDocumentUpload } from "@/lib/employee-document-upload.functions";

export function EmployeeDocumentUpload({ employeeId }: { employeeId: string }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const createUrl = useServerFn(createEmployeeDocumentUploadUrl);
  const finalize = useServerFn(finalizeEmployeeDocumentUpload);
  const qc = useQueryClient();

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!file || busy) return;
    const invalid = validateFile(file);
    if (invalid) return setProblem(invalid);
    setBusy(true);
    setProblem("");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const up = await createUrl({ data: { employee_id: employeeId, ext } });
      const { error } = await supabase.storage.from("candidate-documents").uploadToSignedUrl(up.path, up.token, file, { contentType: file.type || undefined });
      if (error) throw new Error("Não foi possível enviar o arquivo. Tente novamente.");
      await finalize({ data: { employee_id: employeeId, storage_path: up.path, label: label.trim() || file.name } });
      await qc.invalidateQueries({ queryKey: ["employee", employeeId] });
      toast.success("Documento adicionado à pasta do colaborador.");
      setFile(null);
      setLabel("");
      setOpen(false);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Erro ao anexar documento.");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!busy) { setOpen(value); setProblem(""); } }}>
      <DialogTrigger asChild><Button size="sm"><Upload className="h-4 w-4" />Upload</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Adicionar documento do colaborador</DialogTitle></DialogHeader>
        <form onSubmit={send} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee-document-file">Arquivo (PDF, JPG ou PNG, até 10 MB)</Label>
            <Input id="employee-document-file" type="file" required disabled={busy}
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null;
                setFile(selected); setLabel(selected?.name ?? ""); setProblem(selected ? validateFile(selected) ?? "" : "");
              }} />
          </div>
          <div className="space-y-2"><Label htmlFor="employee-document-label">Nome do documento</Label>
            <Input id="employee-document-label" value={label} maxLength={200} disabled={busy} onChange={(event) => setLabel(event.target.value)} />
          </div>
          {problem && <p role="alert" className="text-sm text-destructive">{problem}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy || !file || !!validateFile(file)}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{busy ? "Enviando…" : "Enviar documento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}