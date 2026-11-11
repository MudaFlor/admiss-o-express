import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fail } from "@/lib/errors";
import { normalizeCpf } from "@/lib/cpf";
import type { Database } from "@/integrations/supabase/types";
import { advanceStage } from "@/lib/workflow/stage.server";
import { requiredDocumentsFor, missingDocs } from "@/lib/requirements/requirements.server";
import { candidateContactSchema, reviewedDocumentsSchema, reviewedOcrData, requiresCtps } from "@/lib/validation/candidate-submission";
import { crossCheckCandidate, extractDeclaredFromFormData, blockingIssues } from "@/lib/validation/cross-check";

type DocType = Database["public"]["Enums"]["document_type"];
type Candidate = Database["public"]["Tables"]["candidates"]["Row"];

const REQUIRED_HOLDER_DOCS: readonly DocType[] = [
  "rg", "cpf", "ctps", "titulo_eleitor", "foto_3x4", "certidao",
  "pis_pasep", "comprovante_residencia", "escolaridade",
];

// Validação e finalização únicas do envio da admissão, usadas pelo portal do candidato e pelo RH.
export async function finalizeApplication(
  candidate: Candidate,
  data: { form_data: Record<string, unknown>; sexo?: "feminino" | "masculino" | null; cor_raca?: string; estado_civil?: string },
  note: string,
) {
    const contact = candidateContactSchema.parse({ email: data.form_data.email, cor_raca: data.cor_raca ?? data.form_data.cor_raca });
    const reviewed = reviewedDocumentsSchema.parse(data.form_data.documentos_revisados ?? {});

    // Validação de documentos obrigatórios
    const { data: docs } = await supabaseAdmin
      .from("documents")
      .select("id, type, dependent_id, ocr_data")
      .eq("candidate_id", candidate.id)
      .is("deleted_at", null);
    const safeReviewed: Record<string, Record<string, string>> = {};
    const effectiveDocs = (docs ?? []).map((doc) => {
      const effective = reviewedOcrData(doc.ocr_data, reviewed[doc.id]);
      if (reviewed[doc.id]) safeReviewed[doc.id] = Object.fromEntries(Object.entries(effective.values).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
      return { ...doc, ocr_data: effective };
    });
    const declared = extractDeclaredFromFormData(data.form_data);
    const issues = blockingIssues(crossCheckCandidate({ declared, documents: effectiveDocs }), declared);
    if (Object.keys(issues).length) throw new Error("Dados incorretos. Corrija os campos vazios ou divergentes antes de enviar.");
    const holderDocs = new Set((docs ?? []).filter((d) => !d.dependent_id).map((d) => d.type));
    // RG ou CNH: pelo menos um
    const hasIdentidade = holderDocs.has("rg") || holderDocs.has("cnh");
    const sexo = data.sexo ?? candidate.sexo;

    // Fonte única da verdade: as regras configuradas pelo RH. Sem regras cadastradas,
    // aplica a lista padrão de documentos do titular.
    const rules = await requiredDocumentsFor({
      position: candidate.position,
      sexo,
      estado_civil: data.estado_civil ?? candidate.estado_civil,
    });
    const present = Array.from(holderDocs) as DocType[];
    const missing: string[] = [];

    if (rules.length > 0) {
      for (const r of missingDocs(rules, present)) {
        if (r.document_type === "rg" && hasIdentidade) continue;
        missing.push(r.label);
      }
    } else {
      for (const t of REQUIRED_HOLDER_DOCS) if (!holderDocs.has(t)) missing.push(t);
      if (!hasIdentidade && !missing.includes("rg")) missing.push("rg_ou_cnh");
      if (sexo === "masculino" && !holderDocs.has("reservista")) missing.push("reservista");
    }
    if (!hasIdentidade && !missing.includes("rg_ou_cnh")) missing.push("RG ou CNH");
    if (requiresCtps(holderDocs) && !missing.includes("ctps")) missing.push("ctps");
    if (missing.length) throw new Error(`Faltam documentos: ${missing.join(", ")}`);

    const { error } = await supabaseAdmin
      .from("candidates")
      .update({
        form_data: { ...data.form_data, email: contact.email, cor_raca: contact.cor_raca, documentos_revisados: safeReviewed } as never,
        full_name: typeof data.form_data.full_name === "string" ? data.form_data.full_name.trim() : candidate.full_name,
        cpf: typeof data.form_data.cpf === "string" ? normalizeCpf(data.form_data.cpf) : candidate.cpf,
        email: contact.email,
        phone: typeof data.form_data.telefone === "string" ? data.form_data.telefone.trim().slice(0, 40) || null : candidate.phone,
        status: "em_analise",
        sexo: data.sexo ?? candidate.sexo ?? null,
        cor_raca: contact.cor_raca,
        estado_civil: data.estado_civil ?? candidate.estado_civil ?? null,
      })
      .eq("id", candidate.id);
    if (error) fail(error);

    await supabaseAdmin.from("notifications").insert({
      candidate_id: candidate.id,
      event: "candidate.submitted",
      payload: {},
    });

    await advanceStage(candidate.id, "aguardando_aprovacao", { note });

    // Reenvio após correção: encerra pendências abertas automaticamente.
    await supabaseAdmin
      .from("correction_requests")
      .update({ status: "resolvida", resolved_at: new Date().toISOString() })
      .eq("candidate_id", candidate.id)
      .eq("status", "aberta");
}
