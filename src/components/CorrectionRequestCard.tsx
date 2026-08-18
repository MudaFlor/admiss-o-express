import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Check, Loader2, MessageCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CORRECTION_FIELDS, CORRECTION_FIELD_LABEL } from "@/lib/corrections";
import {
  listCorrectionRequests,
  requestCandidateCorrection,
  resolveCorrectionRequest,
} from "@/lib/corrections.functions";

type DocItem = { type: string; label: string };

export function CorrectionRequestCard({
  candidateId,
  availableDocuments,
}: {
  candidateId: string;
  availableDocuments: DocItem[];
}) {
  const qc = useQueryClient();
  const request = useServerFn(requestCandidateCorrection);
  const list = useServerFn(listCorrectionRequests);
  const resolve = useServerFn(resolveCorrectionRequest);

  const [fields, setFields] = useState<string[]>([]);
  const [docs, setDocs] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [lastLink, setLastLink] = useState<string | null>(null);

  const historyQ = useQuery({
    queryKey: ["corrections", candidateId],
    queryFn: () => list({ data: { candidate_id: candidateId } }),
  });

  const open = historyQ.data?.find((r) => r.status === "aberta");

  const m = useMutation({
    mutationFn: () =>
      request({
        data: {
          candidate_id: candidateId,
          fields,
          documents: availableDocuments.filter((d) => docs.includes(d.type)),
          note: note.trim() || undefined,
        },
      }),
    onSuccess: (res) => {
      setLastLink(res.wa_link);
      setFields([]);
      setDocs([]);
      setNote("");
      toast.success("Correção registrada — avise o candidato pelo WhatsApp");
      if (typeof window !== "undefined") window.open(res.wa_link, "_blank", "noopener");
      qc.invalidateQueries({ queryKey: ["corrections", candidateId] });
      qc.invalidateQueries({ queryKey: ["candidate", candidateId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolveM = useMutation({
    mutationFn: (id: string) => resolve({ data: { id } }),
    onSuccess: () => {
      toast.success("Pendência encerrada");
      qc.invalidateQueries({ queryKey: ["corrections", candidateId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function toggle(arr: string[], set: (v: string[]) => void, key: string) {
    set(arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key]);
  }

  return (
    <Card>
      <CardHeader className="space-y-0 pb-3">
        <CardTitle className="text-sm">Solicitar correção ao candidato</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {open && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="font-semibold">
                Pendência aberta desde {new Date(open.created_at).toLocaleString("pt-BR")}
              </div>
              <ul className="list-inside list-disc">
                {(open.fields as string[]).map((f) => (
                  <li key={f}>{CORRECTION_FIELD_LABEL[f] ?? f}</li>
                ))}
                {(open.documents as DocItem[]).map((d) => (
                  <li key={d.type}>{d.label} (reenviar arquivo)</li>
                ))}
              </ul>
              {open.note && <p>{open.note}</p>}
            </div>
            <Button size="sm" variant="ghost" onClick={() => resolveM.mutate(open.id)}>
              <Check className="h-3.5 w-3.5" /> Encerrar
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Campos a corrigir</Label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CORRECTION_FIELDS.map((f) => (
              <label key={f.key} className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={fields.includes(f.key)}
                  onCheckedChange={() => toggle(fields, setFields, f.key)}
                />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        {availableDocuments.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Documentos a reenviar</Label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {availableDocuments.map((d) => (
                <label key={d.type} className="flex items-center gap-2 text-xs">
                  <Checkbox checked={docs.includes(d.type)} onCheckedChange={() => toggle(docs, setDocs, d.type)} />
                  {d.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Observação para o candidato (opcional)"
          rows={3}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            Solicitar correção e avisar no WhatsApp
          </Button>
          {lastLink && (
            <Button asChild variant="outline" size="sm">
              <a href={lastLink} target="_blank" rel="noopener noreferrer">
                <RotateCcw className="h-3.5 w-3.5" /> Reabrir WhatsApp
              </a>
            </Button>
          )}
        </div>

        {historyQ.data && historyQ.data.length > 0 && (
          <ul className="space-y-1 border-t pt-3 text-[11px] text-muted-foreground">
            {historyQ.data.slice(0, 5).map((r) => (
              <li key={r.id}>
                {new Date(r.created_at).toLocaleString("pt-BR")} —{" "}
                {r.status === "aberta" ? "aguardando candidato" : "resolvida"}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
