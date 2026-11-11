import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDiscByToken, submitDisc, submitProfileAnswers } from "@/lib/disc.functions";
import { Textarea } from "@/components/ui/textarea";
import { DISC_GROUPS, type DiscFactor } from "@/lib/disc/questions";

export const Route = createFileRoute("/disc/$token")({
  head: () => ({
    meta: [
      { title: "Análise de perfil — Mudaflor" },
      { name: "description", content: "Responda às perguntas da análise de perfil comportamental." },
      { property: "og:title", content: "Análise de perfil — Mudaflor" },
      { property: "og:description", content: "Responda às perguntas da análise de perfil comportamental." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DiscPage,
});

function DiscPage() {
  const { token } = Route.useParams();
  const get = useServerFn(getDiscByToken);
  const submit = useServerFn(submitDisc);
  const sendOpen = useServerFn(submitProfileAnswers);
  const q = useQuery({ queryKey: ["disc-public", token], queryFn: () => get({ data: { token } }) });
  const [answers, setAnswers] = useState<(DiscFactor | null)[]>(Array(DISC_GROUPS.length).fill(null));
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const done = answers.filter(Boolean).length;

  async function onSubmit() {
    setBusy(true);
    setErr("");
    try {
      await submit({ data: { token, answers: answers as DiscFactor[] } });
      setSent(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const msg = (t: string) => (
    <div className="mx-auto max-w-xl p-6"><Card><CardContent className="p-6 text-center">{t}</CardContent></Card></div>
  );
  if (q.isLoading) return msg("Carregando…");
  if (!q.data || q.data.state === "invalid") return msg("Link inválido.");
  if (q.data.state === "expired") return msg("Este link expirou. Peça um novo ao RH.");
  if (q.data.state === "done" || sent) return msg("Obrigado! Suas respostas foram enviadas ao RH.");
  if (q.data.kind === "perfil_aberto") {
    const d = q.data;
    return <OpenQuestions name={d.name} q1={d.q1} q2={d.q2} onSend={async (a) => { await sendOpen({ data: { token, ...a } }); setSent(true); }} />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Olá, {q.data.name}!</h1>
        <p className="text-sm text-muted-foreground">
          Em cada grupo, toque na palavra que <strong>mais descreve você</strong>. Não há respostas certas ou erradas.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{done} de {DISC_GROUPS.length} respondidas</p>
      </div>
      {DISC_GROUPS.map((g, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <p className="mb-2 text-xs text-muted-foreground">Grupo {i + 1}</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(g) as [DiscFactor, string][]).map(([f, word]) => (
                <Button
                  key={f}
                  type="button"
                  variant={answers[i] === f ? "default" : "outline"}
                  className="h-auto whitespace-normal py-2"
                  onClick={() => setAnswers((a) => a.map((x, j) => (j === i ? f : x)))}
                >
                  {word}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button className="w-full" disabled={done < DISC_GROUPS.length || busy} onClick={onSubmit}>
        {busy ? "Enviando…" : "Enviar respostas"}
      </Button>
    </div>
  );
}

function OpenQuestions(props: { name: string; q1: string; q2: string; onSend: (a: { q1: string; q2: string }) => Promise<void> }) {
  const [a, setA] = useState({ q1: "", q2: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ok = a.q1.trim().length >= 30 && a.q2.trim().length >= 30;
  async function send() {
    setBusy(true);
    setErr("");
    try { await props.onSend(a); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Olá, {props.name}!</h1>
        <p className="text-sm text-muted-foreground">Responda às duas perguntas com suas próprias palavras. Não há respostas certas ou erradas.</p>
      </div>
      {(["q1", "q2"] as const).map((k, i) => (
        <Card key={k}>
          <CardContent className="space-y-2 p-4">
            <p className="text-sm font-medium">{i + 1}ª pergunta *</p>
            <p className="text-sm">{props[k]}</p>
            <Textarea rows={7} maxLength={5000} value={a[k]} onChange={(e) => setA({ ...a, [k]: e.target.value })} placeholder="Escreva sua resposta" />
            {a[k].trim().length < 30 && <p className="text-xs text-muted-foreground">Mínimo de 30 caracteres.</p>}
          </CardContent>
        </Card>
      ))}
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button className="w-full" disabled={!ok || busy} onClick={send}>{busy ? "Enviando…" : "Enviar respostas"}</Button>
    </div>
  );
}
