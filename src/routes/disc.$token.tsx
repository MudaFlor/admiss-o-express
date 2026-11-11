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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900"><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm shadow-sm">{t}</div></div>
  );
  if (q.isLoading) return msg("Carregando…");
  if (!q.data || q.data.state === "invalid") return msg("Link inválido.");
  if (q.data.state === "expired") return msg("Este link expirou. Peça um novo ao RH.");
  if (q.data.state === "done" || sent) return msg("Obrigado! Suas respostas foram enviadas ao RH.");
  if (q.data.kind === "perfil_aberto") {
    const d = q.data;
    return <OpenQuestions name={d.name} cargo={d.cargo} q1={d.q1} q2={d.q2} onSend={async (a) => { await sendOpen({ data: { token, ...a } }); setSent(true); }} />;
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

function OpenQuestions(props: { name: string; cargo: string; q1: string; q2: string; onSend: (a: { q1: string; q2: string; nome: string; cargo: string }) => Promise<void> }) {
  const [step, setStep] = useState(0); // 0 boas-vindas, 1 pergunta 1, 2 pergunta 2
  const [a, setA] = useState({ nome: props.name, cargo: props.cargo, q1: "", q2: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function send() {
    setBusy(true);
    setErr("");
    try { await props.onSend(a); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  const introOk = a.nome.trim().length >= 2 && a.cargo.trim().length >= 2;
  const qKey = step === 1 ? "q1" : "q2";
  const titles = ["Comunicação e Colaboração", "Conflito e Colaboração"];
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center p-5">
        {step === 0 ? (
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Análise de perfil</p>
              <h1 className="text-2xl font-semibold tracking-tight">Boas-vindas!</h1>
              <p className="text-sm text-slate-600">São só duas perguntas abertas sobre situações de trabalho. Responda com suas palavras — não há respostas certas ou erradas.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="pf-nome" className="text-sm font-medium">Nome</label>
                <input id="pf-nome" value={a.nome} maxLength={120} onChange={(e) => setA({ ...a, nome: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="pf-cargo" className="text-sm font-medium">Cargo / Área</label>
                <input id="pf-cargo" value={a.cargo} maxLength={120} onChange={(e) => setA({ ...a, cargo: e.target.value })} placeholder="Ex.: Analista financeiro" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900" />
              </div>
            </div>
            <button type="button" disabled={!introOk} onClick={() => setStep(1)} className="w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white transition disabled:opacity-40">
              Iniciar Análise
            </button>
          </div>
        ) : (
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{titles[step - 1]}</span><span>{step} de 2</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-slate-900 transition-all" style={{ width: `${step * 50}%` }} /></div>
            </div>
            <p className="text-base font-medium leading-relaxed">{props[qKey]}</p>
            <textarea key={qKey} rows={9} maxLength={5000} value={a[qKey]} onChange={(e) => setA({ ...a, [qKey]: e.target.value })} placeholder="Descreva com detalhes o que você faria…" className="w-full resize-y rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-slate-900" />
            {a[qKey].trim().length < 30 && <p className="text-xs text-slate-500">Mínimo de 30 caracteres.</p>}
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(step - 1)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium">Voltar</button>
              {step === 1 ? (
                <button type="button" disabled={a.q1.trim().length < 30} onClick={() => setStep(2)} className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Próxima</button>
              ) : (
                <button type="button" disabled={a.q2.trim().length < 30 || busy} onClick={send} className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Enviando…" : "Enviar respostas"}</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
