import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, ShieldCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { importLegacyRecords } from "@/lib/legacy-import.functions";
import {
  isLegacyImportOpen, LEGACY_IMPORT_MAX_ROWS, LEGACY_IMPORT_UNTIL, parseRows, TEMPLATE_COLUMNS, type ImportKind,
} from "@/lib/import/legacy-import";
import { currentRegistrationDate } from "@/lib/validation/candidate-registration-date";

export const Route = createFileRoute("/_authenticated/importacao")({
  head: () => ({
    meta: [
      { title: "Importar dados antigos · FlowRH" },
      { name: "description", content: "Inclusão rápida e temporária de candidatos e colaboradores antigos." },
      { property: "og:title", content: "Importar dados antigos · FlowRH" },
      { property: "og:description", content: "Inclusão rápida de cadastros antigos pelo RH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportPage,
});

const fmt = (iso: string) => iso.split("-").reverse().join("/");

function ImportPage() {
  const [kind, setKind] = useState<ImportKind>("colaboradores");
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ created: number; skipped: { line: number; reason: string }[] } | null>(null);
  const run = useServerFn(importLegacyRecords);
  const qc = useQueryClient();
  const open = isLegacyImportOpen(currentRegistrationDate());

  const preview = useMemo(() => {
    if (!text.trim()) return null;
    return kind === "candidatos" ? parseRows("candidatos", text) : parseRows("colaboradores", text);
  }, [kind, text]);
  const ok = preview?.rows.filter((r) => r.value).length ?? 0;
  const bad = (preview?.rows.length ?? 0) - ok;

  const mut = useMutation({
    mutationFn: () => run({ data: { kind, text } }),
    onSuccess: (r) => {
      setResult(r);
      toast.success(`${r.created} cadastro(s) incluído(s).`);
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha na importação"),
  });

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 1_000_000) return toast.error("Arquivo muito grande (máx. 1 MB).");
    setText(await f.text());
    setResult(null);
  };

  const downloadTemplate = () => {
    const blob = new Blob(["\uFEFF" + TEMPLATE_COLUMNS[kind].join(";") + "\n"], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `modelo-${kind}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!open) {
    return <div className="p-6 text-muted-foreground">O prazo da importação de dados antigos terminou em {fmt(LEGACY_IMPORT_UNTIL)}.</div>;
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Importar dados antigos</h1>
        <p className="text-sm text-muted-foreground">
          Recurso temporário, disponível até {fmt(LEGACY_IMPORT_UNTIL)}. Copie as linhas da sua planilha (com o cabeçalho) e cole abaixo, ou envie um arquivo CSV.
        </p>
      </div>
      <Card>
        <CardHeader className="space-y-3">
          <Tabs value={kind} onValueChange={(v) => { setKind(v as ImportKind); setResult(null); }}>
            <TabsList>
              <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
              <TabsTrigger value="candidatos">Candidatos</TabsTrigger>
            </TabsList>
          </Tabs>
          <CardTitle className="text-sm font-normal text-muted-foreground">
            Colunas: {TEMPLATE_COLUMNS[kind].join(" · ")}.{" "}
            {kind === "colaboradores" ? "Obrigatórias: Matrícula, Nome e Admissão." : "Obrigatórias: Data de inclusão e Nome."}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="mr-1 h-4 w-4" />Baixar modelo</Button>
            <Button variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                <Upload className="mr-1 h-4 w-4" />Enviar CSV
                <input type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
            </Button>
          </div>
          <Textarea
            aria-label="Dados da planilha"
            value={text}
            onChange={(e) => { setText(e.target.value); setResult(null); }}
            placeholder={TEMPLATE_COLUMNS[kind].join("\t")}
            className="min-h-48 font-mono text-xs"
          />
          {preview?.missing.length ? (
            <p className="text-sm text-destructive">Faltam colunas obrigatórias no cabeçalho.</p>
          ) : preview ? (
            <div className="space-y-2">
              <p className="text-sm">{ok} linha(s) prontas · <span className={bad ? "text-destructive" : ""}>{bad} com erro (serão ignoradas)</span></p>
              {preview.rows.length > LEGACY_IMPORT_MAX_ROWS && (
                <p className="text-sm text-destructive">Máximo de {LEGACY_IMPORT_MAX_ROWS} linhas por vez; divida a planilha.</p>
              )}
              {bad > 0 && (
                <ul className="max-h-40 overflow-auto rounded border p-2 text-xs text-destructive">
                  {preview.rows.filter((r) => !r.value).map((r) => <li key={r.line}>Linha {r.line}: {r.errors.join("; ")}</li>)}
                </ul>
              )}
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            <Button
              disabled={!ok || mut.isPending || (preview?.rows.length ?? 0) > LEGACY_IMPORT_MAX_ROWS}
              onClick={() => mut.mutate()}
            >
              {mut.isPending ? "Importando…" : `Importar ${ok} cadastro(s)`}
            </Button>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />Somente RH · cadastros existentes nunca são alterados · registrado na auditoria
            </span>
          </div>
          {result && (
            <div className="rounded border p-3 text-sm">
              <p><strong>{result.created}</strong> incluído(s), <strong>{result.skipped.length}</strong> ignorado(s).</p>
              {result.skipped.length > 0 && (
                <ul className="mt-2 max-h-40 overflow-auto text-xs text-muted-foreground">
                  {result.skipped.map((s) => <li key={s.line}>Linha {s.line}: {s.reason}</li>)}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
