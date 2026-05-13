import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MAP = {
  pendente: { label: "Pendente", cls: "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200" },
  em_analise: { label: "Em análise", cls: "bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200" },
  aprovado: { label: "Aprovado", cls: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200" },
  rejeitado: { label: "Rejeitado", cls: "bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-200" },
} as const;

export type CandidateStatus = keyof typeof MAP;

export function CandidateStatusBadge({ status, className }: { status: CandidateStatus; className?: string }) {
  const m = MAP[status] ?? MAP.pendente;
  return <Badge variant="outline" className={cn("font-medium", m.cls, className)}>{m.label}</Badge>;
}