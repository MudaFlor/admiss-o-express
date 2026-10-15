import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, LogOut, Upload, CheckCircle2, Clock, XCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { parseCandidateFile } from "@/lib/recruitment.functions";
import { validateFile } from "@/lib/upload-rules";
import logo from "@/assets/logo-mudaflor.jpg";

export const Route = createFileRoute("/portal")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Portal do Candidato — Mudaflor People OS" },
      { name: "description", content: "Cadastre seu currículo e acompanhe seu processo seletivo na Mudaflor." },
      { property: "og:title", content: "Portal do Candidato — Mudaflor People OS" },
      { property: "og:description", content: "Envie seu currículo e acompanhe o status da sua candidatura." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: PortalPage,
});

type Draft = {
  full_name: string; email: string; phone: string; position: string; idade: string;
  data_nascimento: string; endereco: string; resumo: string; palavras: string; curriculo_texto: string;
};
const EMPTY: Draft = { full_name: "", email: "", phone: "", position: "", idade: "", data_nascimento: "", endereco: "", resumo: "", palavras: "", curriculo_texto: "" };

const STATUS: Record<string, { label: string; icon: typeof Clock }> = {
  pendente: { label: "Currículo recebido", icon: Clock },
  em_analise: { label: "Em análise", icon: Search },
  aprovado: { label: "Aprovado / Contratado", icon: CheckCircle2 },
  rejeitado: { label: "Processo encerrado", icon: XCircle },
};

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    r.readAsDataURL(file);
  });
}

function PortalPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const parseFile = useServerFn(parseCandidateFile);
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const me = useQuery({
    queryKey: ["portal-me"],
    queryFn: async () => {
      const { data: s } = await supabase.auth.getSession();
      const user = s.session?.user;
      const { data } = await supabase
        .from("candidates")
        .select("id, full_name, email, phone, position, status, form_data, created_at")
        .eq("user_id", user?.id ?? "")
        .maybeSingle();
      return { user, candidate: data };
    },
  });

  useEffect(() => {
    const c = me.data?.candidate;
    const u = me.data?.user;
    if (c) {
      const p = ((c.form_data as Record<string, unknown>)?.perfil_recrutamento ?? {}) as Record<string, unknown>;
      setDraft({
        full_name: c.full_name ?? "", email: c.email ?? "", phone: c.phone ?? "", position: c.position ?? "",
        idade: String(p.idade ?? ""), data_nascimento: String(p.data_nascimento ?? ""), endereco: String(p.endereco ?? ""),
        resumo: String(p.resumo_experiencias ?? ""), palavras: Array.isArray(p.palavras_chave) ? (p.palavras_chave as string[]).join(", ") : "",
        curriculo_texto: String(p.curriculo_texto ?? ""),
      });
    } else if (u) {
      setDraft((d) => ({ ...d, email: d.email || u.email || "", full_name: d.full_name || String(u.user_metadata?.full_name ?? "") }));
    }
  }, [me.data]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const err = validateFile(file);
    if (err) return toast.error(err);
    setParsing(true);
    try {
      const p = await parseFile({ data: { filename: file.name, base64: await readAsBase64(file) } });
      setDraft((d) => ({
        ...d,
        full_name: p.full_name || d.full_name, email: p.email || d.email, phone: p.telefone || d.phone,
        position: p.cargo || d.position, idade: p.idade != null ? String(p.idade) : d.idade,
        data_nascimento: p.data_nascimento || d.data_nascimento, endereco: p.endereco || d.endereco,
        resumo: p.resumo_experiencias || d.resumo, palavras: (p.palavras_chave ?? []).join(", ") || d.palavras,
      }));
      toast.success("Currículo lido. Confira os dados e salve.");
    } catch {
      toast.error("Não foi possível ler o arquivo. Preencha os dados manualmente.");
    } finally {
      setParsing(false);
    }
  }

  async function save() {
    if (draft.full_name.trim().length < 2) return toast.error("Informe seu nome.");
    setSaving(true);
    const { error } = await supabase.rpc("save_my_candidate_profile", {
      _full_name: draft.full_name, _email: draft.email, _phone: draft.phone, _position: draft.position,
      _idade: draft.idade, _data_nascimento: draft.data_nascimento, _endereco: draft.endereco, _resumo: draft.resumo,
      _palavras: draft.palavras.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 30),
      _curriculo_texto: draft.curriculo_texto,
    });
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar agora.");
    toast.success("Currículo enviado ao RH!");
    setEditing(false);
    qc.invalidateQueries({ queryKey: ["portal-me"] });
  }

  async function logout() {
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  const candidate = me.data?.candidate;
  const st = candidate ? STATUS[candidate.status] ?? STATUS.pendente : null;
  const showForm = !candidate || editing;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 md:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-card">
            <img src={logo} alt="Mudaflor" className="h-6 w-6 object-contain" />
          </div>
          <span className="font-semibold">Portal do Candidato</span>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4" /> Sair</Button>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
        {me.isLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            {candidate && st && (
              <Card className="flex items-center gap-4 p-5">
                <st.icon className="h-8 w-8 text-primary" />
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Status da candidatura</p>
                  <p className="text-lg font-semibold">{st.label}</p>
                  <p className="text-xs text-muted-foreground">Enviado em {new Date(candidate.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                {!editing && <Button variant="outline" onClick={() => setEditing(true)}>Atualizar currículo</Button>}
              </Card>
            )}

            {showForm && (
              <Card className="space-y-5 p-5">
                <div>
                  <h1 className="text-xl font-semibold">Seu currículo</h1>
                  <p className="text-sm text-muted-foreground">Anexe o arquivo para preencher automaticamente, ou digite seus dados.</p>
                </div>
                <input ref={fileRef} type="file" hidden accept="application/pdf,image/jpeg,image/png" onChange={onFile} />
                <Button variant="outline" className="w-full" disabled={parsing} onClick={() => fileRef.current?.click()}>
                  {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {parsing ? "Lendo currículo..." : "Anexar currículo (PDF, JPG ou PNG)"}
                </Button>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nome completo"><Input value={draft.full_name} onChange={set("full_name")} /></Field>
                  <Field label="Cargo desejado"><Input value={draft.position} onChange={set("position")} /></Field>
                  <Field label="E-mail"><Input type="email" value={draft.email} onChange={set("email")} /></Field>
                  <Field label="Telefone / WhatsApp"><Input value={draft.phone} onChange={set("phone")} /></Field>
                  <Field label="Data de nascimento"><Input value={draft.data_nascimento} onChange={set("data_nascimento")} placeholder="dd/mm/aaaa" /></Field>
                  <Field label="Idade"><Input value={draft.idade} onChange={set("idade")} /></Field>
                </div>
                <Field label="Endereço"><Input value={draft.endereco} onChange={set("endereco")} /></Field>
                <Field label="Resumo das experiências"><Textarea rows={5} value={draft.resumo} onChange={set("resumo")} /></Field>
                <Field label="Palavras-chave (separadas por vírgula)"><Input value={draft.palavras} onChange={set("palavras")} /></Field>
                <Field label="Currículo digitado (opcional)"><Textarea rows={6} value={draft.curriculo_texto} onChange={set("curriculo_texto")} placeholder="Formação, cursos, empregos anteriores..." /></Field>
                <div className="flex gap-2">
                  {editing && <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>}
                  <Button className="flex-1" disabled={saving} onClick={save}>{saving ? "Enviando..." : "Enviar currículo ao RH"}</Button>
                </div>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
