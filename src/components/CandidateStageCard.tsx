import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronRight, History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { STAGE_LABEL, STAGE_ORDER, type CandidateStage } from "@/lib/workflow/stages";
import { changeCandidateStage, listStageHistory } from "@/lib/admission.functions";

export function CandidateStageCard({
  candidateId,
  stage,
  stageNote,
}: {
  candidateId: string;
  stage: CandidateStage;
  stageNote?: string | null;
}) {
  const qc = useQueryClient();
  const change = useServerFn(changeCandidateStage);
  const history = useServerFn(listStageHistory);
  const [note, setNote] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const historyQ = useQuery({
    queryKey: ["stage-history", candidateId],
    queryFn: () => history({ data: { candidate_id: candidateId } }),
    enabled: showHistory,
  });

  const m = useMutation({
    mutationFn: (to: CandidateStage) =>
      change({ data: { candidate_id: candidateId, stage: to, note: note.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Etapa atualizada");
      setNote("");
      qc.invalidateQueries({ queryKey: ["candidate", candidateId] });
      qc.invalidateQueries({ queryKey: ["stage-history", candidateId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const currentIdx = STAGE_ORDER.indexOf(stage);
  const next = STAGE_ORDER[currentIdx + 1];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">Workflow de admissão</CardTitle>
        <Button size="sm" variant="ghost" onClick={() => setShowHistory((v) => !v)}>
          <History className="h-3.5 w-3.5" /> Histórico
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="flex flex-wrap gap-1.5">
          {STAGE_ORDER.map((s, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            return (
              <li key={s}>
                <button
                  type="button"
                  disabled={m.isPending}
                  onClick={() => m.mutate(s)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                    active && "border-primary bg-primary text-primary-foreground",
                    done && "border-emerald-200 bg-emerald-50 text-emerald-700",
                    !active && !done && "text-muted-foreground hover:bg-accent",
                  )}
                  title="Mover para esta etapa"
                >
                  {done && <Check className="h-3 w-3" />}
                  {STAGE_LABEL[s]}
                </button>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Observação da etapa (opcional)"
            className="sm:flex-1"
          />
          {next && (
            <Button disabled={m.isPending} onClick={() => m.mutate(next)}>
              {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              Avançar para {STAGE_LABEL[next]}
            </Button>
          )}
        </div>

        {stageNote && <p className="text-xs text-muted-foreground">Última observação: {stageNote}</p>}

        {showHistory && (
          <div className="rounded-md border p-3">
            {historyQ.isLoading && <p className="text-xs text-muted-foreground">Carregando…</p>}
            {historyQ.data?.length === 0 && <p className="text-xs text-muted-foreground">Sem movimentações.</p>}
            <ul className="space-y-2">
              {historyQ.data?.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-xs last:border-b-0 last:pb-0">
                  <span>
                    {h.from_stage ? `${STAGE_LABEL[h.from_stage as CandidateStage]} → ` : ""}
                    <strong>{STAGE_LABEL[h.to_stage as CandidateStage]}</strong>
                    {h.note ? ` — ${h.note}` : ""}
                  </span>
                  <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
