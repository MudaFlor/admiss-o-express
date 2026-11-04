import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { deleteEmployee } from "@/lib/management.functions";

export function DeleteEmployeeButton({ id, name, compact = false, onDeleted }: {
  id: string; name: string; compact?: boolean; onDeleted?: () => void;
}) {
  const remove = useServerFn(deleteEmployee);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    setError("");
    try {
      await remove({ data: { id, confirmed: true } });
      qc.removeQueries({ queryKey: ["employee", id] });
      for (const key of ["employees", "gestao", "dash-overview", "dash-stats", "disc"]) {
        void qc.invalidateQueries({ queryKey: [key] });
      }
      setOpen(false);
      toast.success("Cadastro do colaborador excluído.");
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir o cadastro. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  }

  return <>
    <Button variant="destructive" size={compact ? "icon" : "default"} title="Excluir cadastro" aria-label={compact ? `Excluir cadastro de ${name}` : undefined}
      onClick={() => { setError(""); setOpen(true); }}>
      <Trash2 className="h-4 w-4" />{!compact && "Excluir cadastro"}
    </Button>
    <AlertDialog open={open} onOpenChange={(next) => { if (!deleting) setOpen(next); }}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>tem certeza que deseja excluir esse cadastro?</AlertDialogTitle>
          <AlertDialogDescription>
            {name}. A exclusão é definitiva e remove a ficha, documentos associados, histórico, DISC e ausências do colaborador. O cadastro e os arquivos originais do candidato no recrutamento serão preservados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Não</AlertDialogCancel>
          <Button variant="destructive" disabled={deleting} onClick={() => void confirmDelete()}>{deleting ? "Excluindo…" : "Sim"}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}