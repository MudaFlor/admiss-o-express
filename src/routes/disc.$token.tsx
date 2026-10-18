import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDiscByToken, submitDisc } from "@/lib/disc.functions";
import { DISC_GROUPS, type DiscFactor } from "@/lib/disc/questions";

export const Route = createFileRoute("/disc/$token")({
  head: () => ({
    meta: [
      { title: "Questionário de perfil DISC — Mudaflor" },
      { name: "description", content: "Responda ao questionário de perfil comportamental DISC." },
      { property: "og:title", content: "Questionário de perfil DISC — Mudaflor" },
      { property: "og:description", content: "Responda ao questionário de perfil comportamental DISC." },
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
