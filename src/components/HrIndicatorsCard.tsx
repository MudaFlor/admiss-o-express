import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateCandidateHrIndicators } from "@/lib/candidates.functions";
import { HR_FIELDS, HR_LABELS, HR_SELECT_OPTIONS, isReferral, type HrField } from "@/lib/hr-indicators";

type Values = Record<HrField, string>;

export function HrIndicatorsCard({ candidateId, candidate }: { candidateId: string; candidate: Record<string, unknown> }) {
  const save = useServerFn(updateCandidateHrIndicators);
  const qc = useQueryClient();
  const fromCandidate = () =>
    Object.fromEntries(HR_FIELDS.map((k) => [k, (candidate[k] as string | null) ?? ""])) as Values;
  const [values, setValues] = useState<Values>(fromCandidate);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!editing) setValues(fromCandidate()); }, [candidate, editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: HrField, v: string) => setValues((p) => ({ ...p, [k]: v }));
  const referral = isReferral(values.meio_recebimento);

  async function onSave() {
    if (referral && values.indicacao_colaborador.trim().length < 3) {
      toast.error("Informe o nome completo do colaborador que indicou.");
      return;
    }
    setSaving(true);
    try {
      await save({ data: { id: candidateId, ...values } });
      toast.success("Indicadores salvos");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["candidate", candidateId] });
      qc.invalidateQueries({ queryKey: ["candidates"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const renderField = (k: HrField) => {
    if (k === "indicacao_colaborador" && !referral) return null;
    const label = HR_LABELS[k];
    let control;
    if (k in HR_SELECT_OPTIONS) {
      const opts = HR_SELECT_OPTIONS[k as keyof typeof HR_SELECT_OPTIONS];
      control = (
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
          value={values[k]}
          disabled={!editing}
          onChange={(e) => set(k, e.target.value)}
        >
          <option value="">—</option>
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    } else if (k === "observacoes_entrevista" || k === "observacoes_rh") {
      control = <Textarea rows={3} value={values[k]} disabled={!editing} onChange={(e) => set(k, e.target.value)} />;
    } else {
      control = (
        <Input
          type={k === "data_entrevista" ? "date" : "text"}
          value={values[k]}
          disabled={!editing}
          onChange={(e) => set(k, e.target.value)}
        />
      );
    }
    const wide = k === "observacoes_entrevista" || k === "observacoes_rh";
    return (
      <div key={k} className={`space-y-1.5 ${wide ? "md:col-span-2 lg:col-span-3" : ""}`}>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
        {control}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">Indicadores do RH</CardTitle>
        {!editing ? (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5" /> Cancelar</Button>
            <Button size="sm" disabled={saving} onClick={onSave}><Save className="h-3.5 w-3.5" /> Salvar</Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{HR_FIELDS.map(renderField)}</CardContent>
    </Card>
  );
}
