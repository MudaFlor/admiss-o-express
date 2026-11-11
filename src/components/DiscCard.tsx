import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Brain, Copy, MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createDiscAssessment, listDiscAssessments, regenerateProfileAnalysis } from "@/lib/disc.functions";
import { AXES, ETHICS_NOTICE, REVIEW_INTERVAL_MONTHS, questionSetById, type ProfileAnalysis, type ProfileEvolution } from "@/lib/profile/questions";
import { DISC_DESCRIPTION, DISC_LABEL, type DiscFactor } from "@/lib/disc/questions";
import { buildWhatsAppLink } from "@/lib/integrations/whatsapp";
import { PUBLIC_APP_URL } from "@/lib/public-url";

const discUrl = (token: string) => `${PUBLIC_APP_URL}/disc/${token}`;

export function DiscCard(props: { candidateId?: string; employeeId?: string; name: string; phone?: string | null }) {
  const list = useServerFn(listDiscAssessments);
  const create = useServerFn(createDiscAssessment);
  const qc = useQueryClient();
  const [phone, setPhone] = useState(props.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const regen = useServerFn(regenerateProfileAnalysis);
  const [regenId, setRegenId] = useState<string | null>(null);
  const target = { candidate_id: props.candidateId, employee_id: props.employeeId };
  const key = ["disc", props.candidateId ?? props.employeeId];
  const q = useQuery({ queryKey: key, queryFn: () => list({ data: target }) });

  async function send() {
    setBusy(true);
    try {
      const row = await create({ data: { ...target, respondent_name: props.name, phone, cycle_reason: reason } });
      const msg = `Olá ${props.name}! 👋\n\nGostaríamos de conhecer melhor seu perfil. São só duas perguntas para responder com suas palavras:\n\n${discUrl(row.token)}`;
      window.open(buildWhatsAppLink(phone, msg), "_blank");
      qc.invalidateQueries({ queryKey: key });
      toast.success("Link da análise de perfil gerado");
      setReason("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-4 w-4" /> Análise de perfil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="disc-phone">WhatsApp</Label>
            <Input id="disc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="w-48" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="disc-reason">Motivo da avaliação (opcional)</Label>
            <Input id="disc-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: fim da experiência, promoção" className="w-64" maxLength={300} />
          </div>
          <Button onClick={send} disabled={busy}>
            <MessageCircle className="mr-1 h-4 w-4" /> Enviar perguntas por WhatsApp
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">Sugestão: reavaliar a cada {REVIEW_INTERVAL_MONTHS} meses ou em marcos como fim da experiência, promoção ou mudança de função. Cada reavaliação usa perguntas novas.</p>
        <div className="space-y-3">
          <p className="text-sm font-medium">Linha do tempo</p>
          {q.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (q.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum questionário enviado ainda.</p>
          ) : (
            q.data!.map((a) => {
              if (a.kind === "perfil_aberto") return <OpenProfile key={a.id} a={a} busy={regenId === a.id} onRegen={async () => {
                setRegenId(a.id);
                try { await regen({ data: { id: a.id } }); await qc.invalidateQueries({ queryKey: key }); } catch (e) { toast.error((e as Error).message); } finally { setRegenId(null); }
              }} onCopy={() => { navigator.clipboard.writeText(discUrl(a.token)); toast.success("Link copiado"); }} />;
              const scores = a.scores as Record<DiscFactor, number> | null;
              const top = (a.profile?.[0] ?? null) as DiscFactor | null;
              return (
                <div key={a.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      Enviado em {new Date(a.created_at).toLocaleDateString("pt-BR")}
                      {a.completed_at && ` · respondido em ${new Date(a.completed_at).toLocaleDateString("pt-BR")}`}
                    </span>
                    {a.status === "concluido" ? (
                      <span className="rounded-full border border-primary/40 px-2 py-0.5 text-xs text-primary">DISC (modelo anterior) · Perfil {a.profile}</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">Aguardando resposta</span>
                        <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(discUrl(a.token)); toast.success("Link copiado"); }}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {scores && (
                    <div className="mt-3 space-y-1.5">
                      {(["D", "I", "S", "C"] as DiscFactor[]).map((f) => (
                        <div key={f} className="flex items-center gap-2">
                          <span className="w-28 text-xs">{DISC_LABEL[f]}</span>
                          <div className="h-2 flex-1 rounded bg-muted">
                            <div className="h-2 rounded bg-primary" style={{ width: `${scores[f]}%` }} />
                          </div>
                          <span className="w-10 text-right text-xs">{scores[f]}%</span>
                        </div>
                      ))}
                      {top && <p className="pt-1 text-xs text-muted-foreground">{DISC_DESCRIPTION[top]}</p>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type Row = { id: string; token: string; created_at: string; completed_at: string | null; status: string; answers: unknown; question_set: string | null; cycle_reason: string | null; analysis: unknown; evolution: unknown; analysis_status: string | null; analysis_error: string | null };

function OpenProfile({ a, busy, onRegen, onCopy }: { a: Row; busy: boolean; onRegen: () => void; onCopy: () => void }) {
  const set = questionSetById(a.question_set);
  const answers = a.answers as { q1?: string; q2?: string } | null;
  const an = a.analysis as ProfileAnalysis | null;
  const ev = a.evolution as ProfileEvolution | null;
  return (
    <div className="space-y-3 rounded-md border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-muted-foreground">
          Enviado em {new Date(a.created_at).toLocaleDateString("pt-BR")}
          {a.completed_at && ` · respondido em ${new Date(a.completed_at).toLocaleDateString("pt-BR")}`}
          {a.cycle_reason && ` · motivo: ${a.cycle_reason}`}
        </span>
        {a.status !== "concluido" ? (
          <div className="flex items-center gap-2">
            <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">Aguardando resposta</span>
            <Button size="sm" variant="ghost" onClick={onCopy}><Copy className="h-3 w-3" /></Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={onRegen} disabled={busy}>
            <RefreshCw className={`mr-1 h-3 w-3 ${busy ? "animate-spin" : ""}`} /> {busy ? "Gerando…" : "Gerar análise novamente"}
          </Button>
        )}
      </div>
      {a.status === "concluido" && (
        <>
          {!an && <p className="text-xs text-muted-foreground">{a.analysis_error ?? "Análise em processamento…"}</p>}
          {an && (
            <div className="space-y-3">
              {AXES.map((ax, i) => (
                <div key={ax.key}>
                  <p className="font-medium">{i + 1}. {ax.label}</p>
                  <p className="whitespace-pre-line text-muted-foreground">{an[ax.key]}</p>
                </div>
              ))}
              <div className="rounded-md bg-muted/50 p-3">
                <p className="font-medium">Resumo executivo</p>
                <p className="whitespace-pre-line text-muted-foreground">{an.resumo}</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div><p className="text-xs font-medium">Pontos fortes</p><ul className="list-disc pl-4 text-muted-foreground">{an.pontos_fortes.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
                  <div><p className="text-xs font-medium">Pontos de atenção</p><ul className="list-disc pl-4 text-muted-foreground">{an.pontos_atencao.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
                </div>
              </div>
              {ev && (
                <div className="rounded-md border border-primary/30 p-3">
                  <p className="font-medium">Evolução desde a análise anterior</p>
                  <p className="mt-1"><span className="font-medium">Manteve: </span><span className="text-muted-foreground">{ev.manteve}</span></p>
                  <p><span className="font-medium">Amadureceu: </span><span className="text-muted-foreground">{ev.amadureceu}</span></p>
                  <p><span className="font-medium">Novos pontos de atenção: </span><span className="text-muted-foreground">{ev.novos_pontos_atencao}</span></p>
                </div>
              )}
              <p className="text-xs italic text-muted-foreground">{ETHICS_NOTICE}</p>
            </div>
          )}
          {answers?.q1 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Ver respostas originais</summary>
              <p className="mt-2 font-medium">{set.q1}</p><p className="whitespace-pre-line text-muted-foreground">{answers.q1}</p>
              <p className="mt-2 font-medium">{set.q2}</p><p className="whitespace-pre-line text-muted-foreground">{answers.q2}</p>
            </details>
          )}
        </>
      )}
    </div>
  );
}
