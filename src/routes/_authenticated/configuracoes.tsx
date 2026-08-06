import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deleteDocumentRequirement,
  listDocumentRequirements,
  listMessageTemplates,
  upsertDocumentRequirement,
  upsertMessageTemplate,
} from "@/lib/admission.functions";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações · Mudaflor People OS" },
      { name: "description", content: "Configure documentos obrigatórios por perfil e modelos de mensagem para candidatos." },
      { property: "og:title", content: "Configurações · Mudaflor People OS" },
      { property: "og:description", content: "Regras de documentos obrigatórios e modelos de comunicação com candidatos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfiguracoesPage,
});

const DOC_TYPES = [
  "rg", "cpf", "cnh", "ctps", "titulo_eleitor", "foto_3x4", "certidao", "reservista",
  "pis_pasep", "comprovante_residencia", "escolaridade", "certificado_curso",
  "vacinacao_covid", "cartao_sus", "curriculo",
] as const;

function ConfiguracoesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-2xl font-semibold">Configurações</h1>
      <Tabs defaultValue="documentos">
        <TabsList>
          <TabsTrigger value="documentos">Documentos obrigatórios</TabsTrigger>
          <TabsTrigger value="mensagens">Modelos de mensagem</TabsTrigger>
        </TabsList>
        <TabsContent value="documentos"><RequirementsTab /></TabsContent>
        <TabsContent value="mensagens"><TemplatesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

type Cond = { role_contains?: string; sexo?: string; estado_civil?: string };
type RequirementInput = {
  id?: string;
  document_type: string;
  label: string;
  condition: Record<string, unknown>;
  is_active: boolean;
};
type TemplateInput = {
  id?: string;
  kind: string;
  channel: "whatsapp" | "email" | "both";
  subject?: string;
  body: string;
  is_active: boolean;
};

function RequirementsTab() {
  const qc = useQueryClient();
  const list = useServerFn(listDocumentRequirements);
  const upsert = useServerFn(upsertDocumentRequirement);
  const remove = useServerFn(deleteDocumentRequirement);

  const q = useQuery({ queryKey: ["doc-requirements"], queryFn: () => list({}) });
  const [draft, setDraft] = useState({ document_type: "rg", label: "", role_contains: "", sexo: "", estado_civil: "" });

  const save = useMutation({
    mutationFn: (vars: RequirementInput) => upsert({ data: vars }),
    onSuccess: () => { toast.success("Regra salva"); qc.invalidateQueries({ queryKey: ["doc-requirements"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { toast.success("Regra removida"); qc.invalidateQueries({ queryKey: ["doc-requirements"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">Nova regra</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-xs">Documento</Label>
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={draft.document_type}
              onChange={(e) => setDraft({ ...draft, document_type: e.target.value })}
            >
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Rótulo</Label>
            <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="CNH categoria D" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cargo contém</Label>
            <Input value={draft.role_contains} onChange={(e) => setDraft({ ...draft, role_contains: e.target.value })} placeholder="motorista" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Sexo</Label>
            <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={draft.sexo} onChange={(e) => setDraft({ ...draft, sexo: e.target.value })}>
              <option value="">Qualquer</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Estado civil</Label>
            <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={draft.estado_civil} onChange={(e) => setDraft({ ...draft, estado_civil: e.target.value })}>
              <option value="">Qualquer</option>
              <option value="solteiro">Solteiro</option>
              <option value="casado">Casado</option>
              <option value="divorciado">Divorciado</option>
              <option value="viuvo">Viúvo</option>
            </select>
          </div>
          <div className="md:col-span-5">
            <Button
              disabled={!draft.label.trim() || save.isPending}
              onClick={() => {
                const condition: Cond = {};
                if (draft.role_contains.trim()) condition.role_contains = draft.role_contains.trim();
                if (draft.sexo) condition.sexo = draft.sexo;
                if (draft.estado_civil) condition.estado_civil = draft.estado_civil;
                save.mutate({ document_type: draft.document_type, label: draft.label.trim(), condition, is_active: true });
                setDraft({ document_type: "rg", label: "", role_contains: "", sexo: "", estado_civil: "" });
              }}
            >
              <Plus className="h-4 w-4" /> Adicionar regra
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Regras ativas</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {q.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {q.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma regra cadastrada.</p>}
          {q.data?.map((r) => {
            const c = (r.condition ?? {}) as Cond;
            const cond = [
              c.role_contains ? `cargo contém "${c.role_contains}"` : null,
              c.sexo ? `sexo ${c.sexo}` : null,
              c.estado_civil ? `estado civil ${c.estado_civil}` : null,
            ].filter(Boolean).join(" · ") || "todos os candidatos";
            return (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{r.label} <span className="text-xs text-muted-foreground">({r.document_type})</span></div>
                  <div className="text-xs text-muted-foreground">Aplica-se a: {cond}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Switch
                      checked={r.is_active}
                      onCheckedChange={(v) =>
                        save.mutate({
                          id: r.id,
                          document_type: r.document_type,
                          label: r.label,
                          condition: (r.condition ?? {}) as Record<string, unknown>,
                          is_active: v,
                        })
                      }
                    />
                    Ativa
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => del.mutate(r.id)}>
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function TemplatesTab() {
  const qc = useQueryClient();
  const list = useServerFn(listMessageTemplates);
  const upsert = useServerFn(upsertMessageTemplate);
  const q = useQuery({ queryKey: ["msg-templates"], queryFn: () => list({}) });
  const [edits, setEdits] = useState<Record<string, { subject: string; body: string }>>({});

  const save = useMutation({
    mutationFn: (vars: TemplateInput) => upsert({ data: vars }),
    onSuccess: () => { toast.success("Modelo salvo"); qc.invalidateQueries({ queryKey: ["msg-templates"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Modelos de comunicação</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Variáveis disponíveis: {"{{nome}}"}, {"{{link}}"}, {"{{motivo}}"}.
        </p>
        {q.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {q.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum modelo cadastrado.</p>}
        {q.data?.map((t) => {
          const e = edits[t.id] ?? { subject: t.subject ?? "", body: t.body };
          return (
            <div key={t.id} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{t.kind} <span className="text-xs text-muted-foreground">· {t.channel}</span></div>
                <Button
                  size="sm"
                  disabled={save.isPending}
                  onClick={() =>
                    save.mutate({
                      id: t.id,
                      kind: t.kind,
                      channel: t.channel as "whatsapp" | "email" | "both",
                      subject: e.subject,
                      body: e.body,
                      is_active: t.is_active,
                    })
                  }
                >
                  <Save className="h-3.5 w-3.5" /> Salvar
                </Button>
              </div>
              {t.channel !== "whatsapp" && (
                <Input
                  value={e.subject}
                  placeholder="Assunto do e-mail"
                  onChange={(ev) => setEdits({ ...edits, [t.id]: { ...e, subject: ev.target.value } })}
                />
              )}
              <Textarea
                rows={4}
                value={e.body}
                onChange={(ev) => setEdits({ ...edits, [t.id]: { ...e, body: ev.target.value } })}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
