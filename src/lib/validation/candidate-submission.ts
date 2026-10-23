import { z } from "zod";

export const RACE_OPTIONS = [
  { value: "branca", label: "Branca" },
  { value: "preta", label: "Preta" },
  { value: "parda", label: "Parda" },
  { value: "amarela", label: "Amarela" },
  { value: "indigena", label: "Indígena" },
  { value: "nao_informado", label: "Prefiro não informar" },
] as const;

export const candidateContactSchema = z.object({
  email: z.string().trim().min(1, "E-mail obrigatório.").email("Informe um e-mail válido.").max(255),
  cor_raca: z.enum(["branca", "preta", "parda", "amarela", "indigena", "nao_informado"], {
    errorMap: () => ({ message: "Selecione sua raça/cor ou prefiro não informar." }),
  }),
});

export function candidateContactIssues(input: { email?: unknown; cor_raca?: unknown }): Record<string, string> {
  const result = candidateContactSchema.safeParse(input);
  if (result.success) return {};
  const issues: Record<string, string> = {};
  for (const issue of result.error.issues) issues[String(issue.path[0])] = issue.message;
  return issues;
}

export function requiresCtps(present: Iterable<string>): boolean {
  return !new Set(present).has("ctps");
}

export const reviewedDocumentsSchema = z.record(
  z.string().uuid(), z.record(z.string().max(80), z.string().trim().max(1000)),
);

// Keep original OCR/evidence intact; corrections are a separate candidate declaration.
export function reviewedOcrData(raw: unknown, reviewed?: Record<string, string>) {
  const data = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const values = data.values && typeof data.values === "object"
    ? data.values as Record<string, unknown> : {};
  const corrected = { ...values };
  for (const key of Object.keys(values)) {
    if (reviewed && typeof reviewed[key] === "string") corrected[key] = reviewed[key];
  }
  return { ...data, values: corrected };
}