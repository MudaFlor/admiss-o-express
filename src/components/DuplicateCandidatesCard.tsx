import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { findDuplicateCandidates, mergeCandidates } from "@/lib/candidates.functions";

export function DuplicateCandidatesCard({ candidateId }: { candidateId: string }) {
  const qc = useQueryClient();
  const findFn = useServerFn(findDuplicateCandidates);
  const mergeFn = useServerFn(mergeCandidates);
  const { data = [] } = useQuery({
    queryKey: ["duplicates", candidateId],
    queryFn: () => findFn({ data: { id: candidateId } }),
  });
  const merge = useMutation({
    mutationFn: (dupId: string) => mergeFn({ data: { primary_id: candidateId, duplicate_id: dupId } }),
    onSuccess: () => { toast.success("Cadastros unidos. Os dados dos documentos foram mantidos."); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!data.length) return null;
  return (
    <Card className="border-destructive/50">
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Copy className="h-4 w-4" /> Possível cadastro duplicado</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {data.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
            <div className="text-sm">
              <Link to="/candidatos/$id" params={{ id: d.id }} className="font-medium underline">{d.full_name}</Link>
              <div className="text-muted-foreground">{d.score}% parecido · iguais: {d.reasons.join(", ")}</div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button size="sm" disabled={merge.isPending}>Unir neste cadastro</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unir os cadastros?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Documentos, termos LGPD, histórico e login de "{d.full_name}" passam para este cadastro.
                    Os dados lidos dos documentos prevalecem. A cópia do cadastro antigo fica guardada no histórico.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => merge.mutate(d.id)}>Unir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
