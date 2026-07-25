import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Copy, MessageCircle, Upload, Sparkles, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CandidateStatusBadge } from "@/components/CandidateStatusBadge";
import { listCandidates } from "@/lib/candidates.functions";
import { parseCandidateFile, createCandidateFromProfile } from "@/lib/recruitment.functions";
import { buildCandidateInviteMessage, buildWhatsAppLink } from "@/lib/integrations/whatsapp";

export const Route = createFileRoute("/_authenticated/recrutamento")({
  head: () => ({
    meta: [
      { title: "Recrutamento — Mudaflor People OS" },
      { name: "description", content: "Cadastre candidatos a partir de currículos e acompanhe o status de cada processo." },
      { property: "og:title", content: "Recrutamento — Mudaflor People OS" },
      { property: "og:description", content: "Extração automática de currículos e acompanhamento de candidatos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecrutamentoPage,
});

type Draft = {
  full_name: string;
  idade: string;
  data_nascimento: string;
  endereco: string;
  email: string;
  phone: string;
  position: string;
  resumo_experiencias: string;
  palavras_chave: string[];
};

const EMPTY: Draft = {
  full_name: "",
  idade: "",
  data_nascimento: "",
  endereco: "",
  email: "",
  phone: "",
  position: "",
  resumo_experiencias: "",
  palavras_chave: [],
};

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    r.readAsDataURL(file);
  });
}

function RecrutamentoPage() {
  const list = useServerFn(listCandidates);
  const parseFile = useServerFn(parseCandidateFile);
  const createFromProfile = useServerFn(createCandidateFromProfile);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [prefilled, setPrefilled] = useState<Set<keyof Draft>>(new Set());
  const [fileName, setFileName] = useState<string | null>(null);
  const [kwInput, setKwInput] = useState("");
  const [created, setCreated] = useState<{ link: string; name: string; phone: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const q = useQuery({
    queryKey: ["candidates", "recrutamento", search],
    queryFn: () => list({ data: { search } }),
  });

  function reset() {
    setDraft(EMPTY);
    setPrefilled(new Set());
    setFileName(null);
    setKwInput("");
    setCreated(null);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 10 MB).");
      return;
    }
    setParsing(true);
    setFileName(file.name);
    try {
      const base64 = await readAsBase64(file);
      const p = await parseFile({ data: { filename: file.name, base64 } });
      const next: Draft = {
        full_name: p.full_name ?? "",
        idade: p.idade != null ? String(p.idade) : "",
        data_nascimento: p.data_nascimento ?? "",
        endereco: p.endereco ?? "",
        email: p.email ?? "",
        phone: p.telefone ?? "",
        position: p.cargo ?? "",
        resumo_experiencias: p.resumo_experiencias ?? "",
        palavras_chave: p.palavras_chave ?? [],
      };
      const filled = new Set<keyof Draft>();
      (Object.keys(next) as Array<keyof Draft>).forEach((k) => {
        const v = next[k];
        if (Array.isArray(v) ? v.length > 0 : String(v).trim() !== "") filled.add(k);
      });
      setDraft(next);
      setPrefilled(filled);
      toast.success("Dados extraídos do arquivo. Revise antes de salvar.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao analisar arquivo");
      setFileName(null);
    } finally {
      setParsing(false);
    }
  }

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setPrefilled((s) => {
      if (!s.has(key)) return s;
      const n = new Set(s);
      n.delete(key);
      return n;
    });
  }

  function addKeyword() {
    const v = kwInput.trim();
    if (!v) return;
    if (!draft.palavras_chave.includes(v)) set("palavras_chave", [...draft.palavras_chave, v]);
    setKwInput("");
  }

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await createFromProfile({
        data: {
          full_name: draft.full_name,
          email: draft.email,
          phone: draft.phone,
          position: draft.position,
          idade: draft.idade,
          data_nascimento: draft.data_nascimento,
          endereco: draft.endereco,
          resumo_experiencias: draft.resumo_experiencias,
          palavras_chave: draft.palavras_chave,
        },
      });
      qc.invalidateQueries({ queryKey: ["candidates"] });
      setCreated({
        link: `${window.location.origin}/c/${res.access_token}`,
        name: draft.full_name,
        phone: draft.phone,
      });
      toast.success("Candidato cadastrado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  function copy(link: string) {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  }

  const hint = (k: keyof Draft) =>
    prefilled.has(k) ? (
      <span className="inline-flex items-center gap-1 text-[11px] text-primary">
        <Sparkles className="h-3 w-3" /> preenchido pela IA
      </span>
    ) : null;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Recrutamento</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre candidatos a partir de um currículo e acompanhe o status de cada processo.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) reset();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Novo candidato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{created ? "Candidato cadastrado" : "Novo candidato"}</DialogTitle>
              <DialogDescription>
                {created
                  ? "Envie o link para o candidato preencher os dados e anexar os documentos de admissão."
                  : "Envie o currículo (PDF, Word, imagem ou texto). Os campos serão preenchidos automaticamente e continuam editáveis."}
              </DialogDescription>
            </DialogHeader>

            {created ? (
              <div className="space-y-3">
                <div className="rounded-md border bg-muted/40 p-3 text-sm break-all">{created.link}</div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => copy(created.link)}>
                    <Copy className="h-4 w-4" /> Copiar link
                  </Button>
                  <Button asChild>
                    <a
                      href={buildWhatsAppLink(
                        created.phone,
                        buildCandidateInviteMessage({ candidateName: created.name, link: created.link }),
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="h-4 w-4" /> Enviar link ao candidato
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={onSave} className="space-y-4">
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.rtf,.csv,.md,image/*"
                    onChange={onFile}
                  />
                  <Button type="button" variant="outline" disabled={parsing} onClick={() => fileRef.current?.click()}>
                    {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {parsing ? "Analisando arquivo…" : "Enviar currículo / documento"}
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {fileName ?? "PDF, Word, imagem ou texto — até 10 MB"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="r_nome">Nome {hint("full_name")}</Label>
                    <Input id="r_nome" required value={draft.full_name} onChange={(e) => set("full_name", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r_idade">Idade {hint("idade")}</Label>
                    <Input id="r_idade" value={draft.idade} onChange={(e) => set("idade", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r_nasc">Data de nascimento {hint("data_nascimento")}</Label>
                    <Input
                      id="r_nasc"
                      placeholder="DD/MM/AAAA"
                      value={draft.data_nascimento}
                      onChange={(e) => set("data_nascimento", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="r_end">Endereço {hint("endereco")}</Label>
                    <Input id="r_end" value={draft.endereco} onChange={(e) => set("endereco", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r_tel">Telefone {hint("phone")}</Label>
                    <Input id="r_tel" value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r_mail">E-mail {hint("email")}</Label>
                    <Input id="r_mail" value={draft.email} onChange={(e) => set("email", e.target.value)} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="r_cargo">Cargo pretendido {hint("position")}</Label>
                    <Input id="r_cargo" value={draft.position} onChange={(e) => set("position", e.target.value)} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="r_resumo">Resumo das experiências {hint("resumo_experiencias")}</Label>
                    <Textarea
                      id="r_resumo"
                      rows={6}
                      value={draft.resumo_experiencias}
                      onChange={(e) => set("resumo_experiencias", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="r_kw">Palavras-chave do perfil profissional {hint("palavras_chave")}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="r_kw"
                        value={kwInput}
                        placeholder="Digite e pressione Enter"
                        onChange={(e) => setKwInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addKeyword();
                          }
                        }}
                      />
                      <Button type="button" variant="outline" onClick={addKeyword}>
                        Adicionar
                      </Button>
                    </div>
                    {draft.palavras_chave.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {draft.palavras_chave.map((k) => (
                          <Badge key={k} variant="secondary" className="gap-1">
                            {k}
                            <button
                              type="button"
                              aria-label={`Remover ${k}`}
                              onClick={() =>
                                set(
                                  "palavras_chave",
                                  draft.palavras_chave.filter((x) => x !== k),
                                )
                              }
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={saving || parsing}>
                    {saving ? "Salvando…" : "Cadastrar candidato"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidato</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : (q.data?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Nenhum candidato ainda. Clique em "Novo candidato".
                  </TableCell>
                </TableRow>
              ) : (
                q.data!.map((c) => {
                  const link = typeof window !== "undefined" ? `${window.location.origin}/c/${c.access_token}` : "";
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link to="/candidatos/$id" params={{ id: c.id }} className="font-medium hover:underline">
                          {c.full_name}
                        </Link>
                        <div className="text-xs text-muted-foreground">{c.email ?? c.phone ?? "—"}</div>
                      </TableCell>
                      <TableCell>{c.position ?? "—"}</TableCell>
                      <TableCell>
                        <CandidateStatusBadge status={c.status as never} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => copy(link)}>
                            <Copy className="h-3.5 w-3.5" /> Link
                          </Button>
                          <Button size="sm" asChild>
                            <a
                              href={buildWhatsAppLink(
                                c.phone,
                                buildCandidateInviteMessage({ candidateName: c.full_name, link }),
                              )}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <MessageCircle className="h-3.5 w-3.5" /> Enviar link
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
