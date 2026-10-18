import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Brain, Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createDiscAssessment, listDiscAssessments } from "@/lib/disc.functions";
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
  const target = { candidate_id: props.candidateId, employee_id: props.employeeId };
  const key = ["disc", props.candidateId ?? props.employeeId];
  const q = useQuery({ queryKey: key, queryFn: () => list({ data: target }) });

  async function send() {
    setBusy(true);
    try {
      const row = await create({ data: { ...target, respondent_name: props.name, phone } });
      const msg = `Olá ${props.name}! 👋\n\nGostaríamos de conhecer melhor seu perfil comportamental. Responda ao questionário DISC (leva cerca de 5 minutos):\n\n${discUrl(row.token)}`;
      window.open(buildWhatsAppLink(phone, msg), "_blank");
      qc.invalidateQueries({ queryKey: key });
      toast.success("Link DISC gerado");
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
          <Brain className="h-4 w-4" /> Análise de perfil DISC
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="disc-phone">WhatsApp</Label>
            <Input id="disc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="w-48" />
          </div>
          <Button onClick={send} disabled={busy}>
            <MessageCircle className="mr-1 h-4 w-4" /> Enviar questionário por WhatsApp
          </Button>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Histórico</p>
          {q.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (q.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum questionário enviado ainda.</p>
          ) : (
            q.data!.map((a) => {
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
                      <span className="rounded-full border border-primary/40 px-2 py-0.5 text-xs text-primary">Perfil {a.profile}</span>
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
