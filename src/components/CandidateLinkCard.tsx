import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Link2, RefreshCw, Ban, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  getCandidateLinkState,
  rotateCandidateToken,
  revokeCandidateToken,
  markReminderSent,
} from "@/lib/candidate-link.functions";
import { buildWhatsAppLink } from "@/lib/integrations/whatsapp";

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function CandidateLinkCard({ candidateId }: { candidateId: string }) {
  const qc = useQueryClient();
  const getState = useServerFn(getCandidateLinkState);
  const rotate = useServerFn(rotateCandidateToken);
  const revoke = useServerFn(revokeCandidateToken);
  const reminder = useServerFn(markReminderSent);

  const q = useQuery({
    queryKey: ["candidate-link", candidateId],
    queryFn: () => getState({ data: { id: candidateId } }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["candidate-link", candidateId] });
    qc.invalidateQueries({ queryKey: ["candidate", candidateId] });
  };

  const rotateM = useMutation({
    mutationFn: () => rotate({ data: { id: candidateId } }),
    onSuccess: () => { toast.success("Novo link gerado. O anterior deixou de funcionar."); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });
  const revokeM = useMutation({
    mutationFn: () => revoke({ data: { id: candidateId } }),
    onSuccess: () => { toast.success("Link cancelado."); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });
  const reminderM = useMutation({
    mutationFn: () => reminder({ data: { id: candidateId } }),
    onSuccess: () => invalidate(),
  });

  const s = q.data;
  const url = s?.token ? `${window.location.origin}/c/${s.token}` : null;

  const openWhatsApp = () => {
    if (!url || !s) return;
    const msg = `Olá ${s.full_name}! 👋\n\nAinda faltam informações para concluir sua admissão. Acesse o link abaixo e finalize o envio:\n\n${url}\n\nO link é válido até ${fmt(s.expires_at)}.`;
    window.open(buildWhatsAppLink(s.phone, msg), "_blank", "noopener");
    reminderM.mutate();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Link2 className="h-4 w-4" /> Link do candidato
        </CardTitle>
        {s && (
          <Badge variant={s.status === "ativo" ? "default" : "secondary"}>
            {s.status === "ativo" ? "Ativo" : s.status === "expirado" ? "Expirado" : "Cancelado"}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
          <div>Validade: {fmt(s?.expires_at)}</div>
          <div>Última renovação: {fmt(s?.rotated_at)}</div>
          <div>Último lembrete: {fmt(s?.last_reminder_at)}</div>
        </div>

        {url && (
          <div className="truncate rounded-md bg-muted px-3 py-2 font-mono text-xs">{url}</div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!url} onClick={openWhatsApp}>
            <MessageCircle className="h-3.5 w-3.5" /> Lembrete por WhatsApp
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={rotateM.isPending}>
                <RefreshCw className="h-3.5 w-3.5" /> Renovar link
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Renovar o link de acesso?</AlertDialogTitle>
                <AlertDialogDescription>
                  Um novo link será gerado com validade de 7 dias. O link atual deixa de funcionar imediatamente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => rotateM.mutate()}>Renovar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-destructive" disabled={s?.status === "cancelado" || revokeM.isPending}>
                <Ban className="h-3.5 w-3.5" /> Cancelar acesso
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar o acesso do candidato?</AlertDialogTitle>
                <AlertDialogDescription>
                  O candidato perde o acesso imediatamente. Você pode gerar um novo link depois.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={() => revokeM.mutate()}>Cancelar acesso</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
