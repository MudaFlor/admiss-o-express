import { z } from "zod";

export const candidateRegistrationDateSchema = z.string({ required_error: "A data de cadastro é obrigatória." })
  .trim().min(1, "A data de cadastro é obrigatória.")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data de cadastro válida.")
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Informe uma data de cadastro válida.");

export function currentRegistrationDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export const candidateRegistrationRangeSchema = z.object({
  cadastro_de: candidateRegistrationDateSchema.optional().or(z.literal("")),
  cadastro_ate: candidateRegistrationDateSchema.optional().or(z.literal("")),
}).refine((value) => !value.cadastro_de || !value.cadastro_ate || value.cadastro_de <= value.cadastro_ate,
  { message: "A data final deve ser igual ou posterior à data inicial.", path: ["cadastro_ate"] });