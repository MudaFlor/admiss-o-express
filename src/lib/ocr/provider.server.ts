// OCR provider — extração real via Lovable AI Gateway (Gemini Vision).
// Regras estritas: nunca inventar dados; retornar null quando não houver evidência.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isValidCpf, normalizeCpf } from "@/lib/cpf";
import type { Database } from "@/integrations/supabase/types";

export type DocumentType = Database["public"]["Enums"]["document_type"];

export interface OcrResult {
  fields: Record<string, string>;
  confidence: number;
  evidences?: Record<string, string>;
  status: "sucesso" | "falha";
  motivo?: string;
}

// Campos esperados por tipo de documento
const FIELDS_BY_TYPE: Record<DocumentType, string[]> = {
  rg: ["nome", "rg", "cpf", "orgao_emissor", "data_nascimento", "naturalidade", "nome_mae", "nome_pai", "data_emissao", "validade"],
  cpf: ["nome", "cpf", "data_nascimento"],
  cnh: ["nome", "cpf", "numero_registro", "categoria", "data_emissao", "validade", "data_nascimento"],
  comprovante_residencia: ["titular", "endereco", "bairro", "cidade", "uf", "cep", "emissor", "data_emissao"],
  curriculo: [],
};

const SYSTEM_PROMPT = `Você é um sistema especializado em extração de dados de documentos.

OBJETIVO: Extrair informações exclusivamente a partir do conteúdo visível no documento enviado.

REGRAS OBRIGATÓRIAS:
- Utilize apenas informações claramente visíveis na imagem/OCR.
- NUNCA invente, complete, estime, deduza ou corrija informações ausentes.
- NUNCA utilize exemplos fictícios.
- Se um dado não estiver presente, estiver cortado, desfocado ou ilegível, retorne null.
- Se houver qualquer dúvida sobre uma informação, retorne null.
- Não faça inferências baseadas em contexto.
- Não assuma nomes, números, datas ou documentos.
- Para cada campo extraído, informe também o trecho exato encontrado no documento (evidencia).
- Se a qualidade impedir leitura confiável de mais de 20% das informações, retorne status "falha".
- Valide formatos: CPF (11 dígitos), datas (DD/MM/AAAA). Caso inválido, retorne null.
- Retorne APENAS JSON válido, sem comentários ou texto adicional.

FORMATO DE RESPOSTA (sucesso):
{ "status": "sucesso", "dados": { "<campo>": { "valor": "...", "evidencia": "..." } | null } }

FORMATO DE RESPOSTA (falha):
{ "status": "falha", "motivo": "Documento ilegível ou informações insuficientes" }

A precisão é mais importante do que a completude. Nunca preencha campos com suposições.`;

function buildExtractionTool(type: DocumentType) {
  const fields = FIELDS_BY_TYPE[type];
  const fieldSchema = {
    anyOf: [
      {
        type: "object",
        properties: {
          valor: { type: "string" },
          evidencia: { type: "string" },
        },
        required: ["valor", "evidencia"],
        additionalProperties: false,
      },
      { type: "null" },
    ],
  };
  const dados: Record<string, unknown> = {};
  for (const f of fields) dados[f] = fieldSchema;

  return {
    type: "function" as const,
    function: {
      name: "extrair_documento",
      description: `Extrai dados estruturados de um documento ${type}.`,
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["sucesso", "falha"] },
          motivo: { type: ["string", "null"] },
          dados: {
            type: ["object", "null"],
            properties: dados,
            required: fields,
            additionalProperties: false,
          },
        },
        required: ["status", "motivo", "dados"],
        additionalProperties: false,
      },
    },
  };
}

function userInstruction(type: DocumentType): string {
  const fields = FIELDS_BY_TYPE[type].join(", ");
  const labels: Record<DocumentType, string> = {
    rg: "Documento de Identidade — RG tradicional OU Carteira de Identidade Nacional (CIN). Aceitar ambos os formatos; na CIN o número do RG pode aparecer como 'Nº' ou estar ausente — nesse caso retorne null para 'rg' e preencha 'cpf'.",
    cpf: "Cadastro de Pessoa Física (CPF)",
    cnh: "Carteira Nacional de Habilitação (CNH) — modelo antigo ou novo (CNH Digital/e-CNH).",
    comprovante_residencia: "Comprovante de Residência",
    curriculo: "Currículo",
  };
  return `Tipo de documento esperado: ${labels[type]}.
Extraia somente os campos: ${fields}.
Observações importantes:
- Documentos brasileiros podem aparecer em formatos diversos (RG antigo, CIN nova, CNH antiga/digital). Identifique o formato e extraia o que estiver visível.
- "FILIAÇÃO" contém normalmente nome do pai e nome da mãe (em linhas separadas ou separados por vírgula). Extraia cada um quando claramente identificável; do contrário, retorne null.
- Ignore textos de marca d'água ou rótulos como "MODELO DE TESTE" / "ESPÉCIME" — não são dados do titular.
Siga rigorosamente as regras: sem suposições, sem invenções. Para cada campo, retorne null se não houver evidência visível e legível.`;
}

function isValidDateBR(s: string): boolean {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(s);
}

function validateField(field: string, value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (field === "cpf") {
    const n = normalizeCpf(v);
    return isValidCpf(n) ? v : null;
  }
  if (field.startsWith("data_") || field === "validade") {
    return isValidDateBR(v) ? v : null;
  }
  return v;
}

export async function runOcr(type: DocumentType, storagePath: string): Promise<OcrResult> {
  if (type === "curriculo") {
    return { status: "sucesso", confidence: 0, fields: {} };
  }

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

  const { data: file, error: dlErr } = await supabaseAdmin.storage
    .from("candidate-documents")
    .download(storagePath);
  if (dlErr || !file) throw new Error(dlErr?.message ?? "Falha ao baixar documento");

  const ext = (storagePath.split(".").pop() ?? "").toLowerCase();
  const buffer = await file.arrayBuffer();
  const b64 = Buffer.from(buffer).toString("base64");

  let contentBlock: unknown;
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
    const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    contentBlock = { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } };
  } else if (ext === "pdf") {
    contentBlock = {
      type: "file",
      file: { filename: `doc.${ext}`, file_data: `data:application/pdf;base64,${b64}` },
    };
  } else {
    throw new Error("Formato não suportado para OCR. Envie JPG, PNG ou PDF.");
  }

  const tool = buildExtractionTool(type);

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [{ type: "text", text: userInstruction(type) }, contentBlock],
        },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "extrair_documento" } },
      temperature: 0,
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("Muitas requisições à IA. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Contate o administrador.");
    throw new Error(`Falha na extração do documento (${res.status})`);
  }

  const data = await res.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) {
    return { status: "falha", confidence: 0, fields: {}, motivo: "IA não retornou dados estruturados" };
  }

  type Parsed = {
    status: "sucesso" | "falha";
    motivo: string | null;
    dados: Record<string, { valor: string; evidencia: string } | null> | null;
  };
  let parsed: Parsed;
  try {
    parsed = JSON.parse(call.function.arguments) as Parsed;
  } catch {
    return { status: "falha", confidence: 0, fields: {}, motivo: "Resposta da IA inválida" };
  }

  if (parsed.status === "falha" || !parsed.dados) {
    return {
      status: "falha",
      confidence: 0,
      fields: {},
      motivo: parsed.motivo ?? "Documento ilegível ou informações insuficientes",
    };
  }

  const expected = FIELDS_BY_TYPE[type];
  const fields: Record<string, string> = {};
  const evidences: Record<string, string> = {};
  let filled = 0;
  for (const f of expected) {
    const item = parsed.dados[f];
    if (item && typeof item.valor === "string") {
      const validated = validateField(f, item.valor);
      if (validated !== null) {
        fields[f] = validated;
        if (typeof item.evidencia === "string") evidences[f] = item.evidencia;
        filled += 1;
      }
    }
  }

  const confidence = expected.length === 0 ? 0 : Number((filled / expected.length).toFixed(2));
  return { status: "sucesso", confidence, fields, evidences };
}