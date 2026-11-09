import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, FileText, Loader2, MessageCircle, Plus, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CandidateRegistrationDuplicateAlert } from "@/components/CandidateRegistrationDuplicateAlert";
import { createCandidateFromProfile, parseCandidateFile } from "@/lib/recruitment.functions";
import { candidatePortalUrl } from "@/lib/public-url";
import { buildCandidateInviteMessage, buildWhatsAppLink } from "@/lib/integrations/whatsapp";
import { MAX_FILE_BYTES } from "@/lib/upload-rules";

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

type Resume = { filename: string; base64: string };
type Created = { id: string; link: string; name: string; phone: string; hasResume: boolean };

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

export function CandidateResumeDialog({ onCreated }: { onCreated: () => void }) {
  const parseFile = useServerFn(parseCandidateFile);
  const createFromProfile = useServerFn(createCandidateFromProfile);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>({ ...EMPTY });
  const [prefilled, setPrefilled] = useState<Set<keyof Draft>>(new Set());
  const [resume, setResume] = useState<Resume | null>(null);
  const [keyword, setKeyword] = useState("");
  const [created, setCreated] = useState<Created | null>(null);

  function reset() {
    setDraft({ ...EMPTY });
    setPrefilled(new Set());
    setResume(null);
    setKeyword("");
    setCreated(null);
  }

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== "application/pdf")) {
      toast.error("Anexe o currículo em formato PDF.");
      return;
    }
    if (file.size === 0 || file.size > MAX_FILE_BYTES) {
      toast.error(file.size === 0 ? "O arquivo do currículo está vazio." : "O currículo deve ter no máximo 10 MB.");
      return;
    }

    setParsing(true);
    try {
      const base64 = await readAsBase64(file);
      setResume({ filename: file.name, base64 });
      const profile = await parseFile({ data: { filename: file.name, base64 } });
      const next: Draft = {
        full_name: profile.full_name ?? "",
        idade: profile.idade != null ? String(profile.idade) : "",
        data_nascimento: profile.data_nascimento ?? "",
        endereco: profile.endereco ?? "",
        email: profile.email ?? "",
        phone: profile.telefone ?? "",
        position: profile.cargo ?? "",
        resumo_experiencias: profile.resumo_experiencias ?? "",
        palavras_chave: profile.palavras_chave ?? [],
      };
      const filled = new Set<keyof Draft>();
      for (const key of Object.keys(next) as Array<keyof Draft>) {
        const value = next[key];
        if (Array.isArray(value) ? value.length > 0 : value.trim() !== "") filled.add(key);
      }
      setDraft(next);
      setPrefilled(filled);
      toast.success("Dados extraídos do currículo. Revise antes de salvar.");
    } catch (error) {
      toast.error(error instanceof Error
        ? `${error.message} Você pode preencher os dados manualmente.`
        : "Não foi possível ler o currículo. Preencha os dados manualmente.");
    } finally {
      setParsing(false);
    }
  }

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setPrefilled((current) => {
      if (!current.has(key)) return current;
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  }

  function addKeyword() {
    const value = keyword.trim();
    if (!value) return;
    if (!draft.palavras_chave.includes(value)) set("palavras_chave", [...draft.palavras_chave, value]);
    setKeyword("");
  }

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await createFromProfile({
        data: {
          ...draft,
          resume: resume ?? undefined,
        },
      });
      setCreated({
        id: result.id,
        link: candidatePortalUrl(result.access_token),
        name: draft.full_name,
        phone: draft.phone,
        hasResume: Boolean(result.resume_document_id),
      });
      onCreated();
      toast.success(resume ? "Candidato cadastrado e currículo anexado à ficha." : "Candidato cadastrado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar o candidato.");
    } finally {
      setSaving(false);
    }
  }

  function copy(link: string) {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  }

  const hint = (key: keyof Draft) => prefilled.has(key) ? (
    <span className="inline-flex items-center gap-1 text-[11px] text-primary">
      <Sparkles className="h-3 w-3" /> preenchido pela IA
    </span>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) reset(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> Novo candidato</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{created ? "Candidato cadastrado" : "Novo candidato"}</DialogTitle>
          <DialogDescription>
            {created
              ? "Compartilhe o link para o candidato revisar os dados e enviar os documentos de admissão."
              : "Anexe um currículo em PDF para preencher os dados automaticamente. Todos os campos continuam editáveis."}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-3">
            {created.hasResume && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm">
                <FileText className="h-4 w-4 text-primary" /> Currículo em PDF salvo na ficha do candidato.
              </div>
            )}
            <div className="rounded-md border bg-muted/40 p-3 text-sm break-all">{created.link}</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => copy(created.link)}>
                <Copy className="h-4 w-4" /> Copiar link
              </Button>
              <Button asChild>
                <a
                  href={buildWhatsAppLink(created.phone, buildCandidateInviteMessage({ candidateName: created.name, link: created.link }))}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="h-4 w-4" /> Enviar pelo WhatsApp
                </a>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/candidatos/$id" params={{ id: created.id }}>Abrir ficha</Link>
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
                accept=".pdf,application/pdf"
                onChange={onFile}
              />
              <Button type="button" variant="outline" disabled={parsing} onClick={() => fileRef.current?.click()}>
                {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {parsing ? "Lendo currículo…" : resume ? "Substituir currículo em PDF" : "Anexar currículo em PDF"}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                {resume ? `${resume.filename} — será salvo na ficha do candidato` : "PDF de até 10 MB; o arquivo original ficará anexado à ficha"}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="candidate_resume_name">Nome completo {hint("full_name")}</Label>
                <Input id="candidate_resume_name" required value={draft.full_name} onChange={(e) => set("full_name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="candidate_resume_age">Idade {hint("idade")}</Label>
                <Input id="candidate_resume_age" value={draft.idade} onChange={(e) => set("idade", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="candidate_resume_birth">Data de nascimento {hint("data_nascimento")}</Label>
                <Input id="candidate_resume_birth" placeholder="DD/MM/AAAA" value={draft.data_nascimento} onChange={(e) => set("data_nascimento", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="candidate_resume_address">Endereço {hint("endereco")}</Label>
                <Input id="candidate_resume_address" value={draft.endereco} onChange={(e) => set("endereco", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="candidate_resume_phone">Telefone {hint("phone")}</Label>
                <Input id="candidate_resume_phone" value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="candidate_resume_email">E-mail {hint("email")}</Label>
                <Input id="candidate_resume_email" type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="candidate_resume_position">Cargo pretendido {hint("position")}</Label>
                <Input id="candidate_resume_position" value={draft.position} onChange={(e) => set("position", e.target.value)} />
              </div>
              <div className="sm:col-span-2"><CandidateRegistrationDuplicateAlert draft={draft} /></div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="candidate_resume_summary">Resumo das experiências {hint("resumo_experiencias")}</Label>
                <Textarea id="candidate_resume_summary" rows={6} value={draft.resumo_experiencias} onChange={(e) => set("resumo_experiencias", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="candidate_resume_keywords">Palavras-chave do perfil profissional {hint("palavras_chave")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="candidate_resume_keywords"
                    value={keyword}
                    placeholder="Digite e pressione Enter"
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addKeyword();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addKeyword}>Adicionar</Button>
                </div>
                {draft.palavras_chave.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {draft.palavras_chave.map((item) => (
                      <Badge key={item} variant="secondary" className="gap-1">
                        {item}
                        <button type="button" aria-label={`Remover ${item}`} onClick={() => set("palavras_chave", draft.palavras_chave.filter((value) => value !== item))}>
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
                {saving ? "Salvando…" : resume ? "Salvar candidato e currículo" : "Cadastrar candidato"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
