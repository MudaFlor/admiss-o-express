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
  field_confidences?: Record<string, number>;
  status: "sucesso" | "falha";
  motivo?: string;
}

// Campos esperados por tipo de documento. Tipos com lista vazia não passam por OCR.
const FIELDS_BY_TYPE: Record<DocumentType, string[]> = {
  rg: ["nome", "rg", "cpf", "orgao_emissor", "data_nascimento", "naturalidade", "nome_mae", "nome_pai", "data_emissao", "validade"],
  cpf: ["nome", "cpf", "data_nascimento"],
  cnh: ["nome", "cpf", "numero_registro", "categoria", "data_emissao", "validade", "data_nascimento"],
  comprovante_residencia: ["titular", "logradouro", "numero", "complemento", "bairro", "cidade", "uf", "cep", "emissor", "data_emissao"],
  titulo_eleitor: ["nome", "inscricao", "zona", "secao", "data_nascimento"],
  certidao: ["nome", "nome_pai", "nome_mae", "data_nascimento", "estado_civil", "conjuge", "registro", "livro", "folha", "termo"],
  pis_pasep: ["nome", "pis", "nit"],
  cartao_sus: ["nome", "numero_sus"],
  curriculo: [],
  ctps: [],
  foto_3x4: [],
  reservista: [],
  escolaridade: [],
  certificado_curso: [],
  vacinacao_covid: [],
  dependente_certidao: ["nome", "nome_pai", "nome_mae", "data_nascimento", "registro"],
  dependente_rg_cpf: ["nome", "rg", "cpf", "data_nascimento"],
  dependente_vacinacao: [],
  dependente_escolar: [],
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
          confianca: { type: "number" },
        },
        required: ["valor", "evidencia", "confianca"],
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
    rg: "Documento de Identidade — RG tradicional OU Carteira de Identidade Nacional (CIN). Na CIN o número do RG pode aparecer como 'Nº' ou estar ausente — nesse caso retorne null para 'rg' e preencha 'cpf'.",
    cpf: "Cadastro de Pessoa Física (CPF)",
    cnh: "Carteira Nacional de Habilitação (CNH) — modelo antigo ou novo (CNH Digital/e-CNH).",
    comprovante_residencia: "Comprovante de Residência. Separe logradouro, número, complemento, bairro, cidade, UF e CEP quando possível.",
    titulo_eleitor: "Título de Eleitor — extraia inscrição (apenas dígitos), zona e seção.",
    certidao: "Certidão de Nascimento ou Casamento — extraia filiação, estado civil, eventual cônjuge e dados do registro (registro, livro, folha, termo).",
    pis_pasep: "Cartão PIS/PASEP ou NIT — extraia os números encontrados.",
    cartao_sus: "Cartão Nacional de Saúde (CNS/SUS) — extraia o número do cartão SUS (15 dígitos).",
    curriculo: "Currículo",
    ctps: "Carteira de Trabalho",
    foto_3x4: "Foto 3x4",
    reservista: "Certificado de Reservista ou Alistamento Militar",
    escolaridade: "Comprovante de Escolaridade",
    certificado_curso: "Certificado de Curso",
    vacinacao_covid: "Comprovante de Vacinação Covid",
    dependente_certidao: "Certidão de Nascimento de dependente",
    dependente_rg_cpf: "RG ou CPF de dependente",
    dependente_vacinacao: "Carteira de Vacinação de dependente",
    dependente_escolar: "Comprovante Escolar de dependente",
  };
  return `Tipo de documento esperado: ${labels[type]}.
Extraia somente os campos: ${fields}.
Observações importantes:
- Documentos brasileiros podem aparecer em formatos diversos. Identifique o formato e extraia o que estiver visível.
- "FILIAÇÃO" contém normalmente nome do pai e nome da mãe (em linhas separadas ou separados por vírgula). Extraia cada um quando claramente identificável; do contrário, retorne null.
- Ignore textos de marca d'água ou rótulos como "MODELO DE TESTE" / "ESPÉCIME" — não são dados do titular.
- Para cada campo, retorne também "confianca" entre 0 e 1 indicando o quão certo está da extração. Use valor baixo (<0.9) sempre que houver qualquer ambiguidade, borrão ou caractere duvidoso.
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
  // Tipos sem OCR: apenas armazenam o arquivo, sem extração.
  if (FIELDS_BY_TYPE[type].length === 0) {
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
    dados: Record<string, { valor: string; evidencia: string; confianca?: number } | null> | null;
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
  const fieldConfidences: Record<string, number> = {};
  let filled = 0;
  let confSum = 0;
  for (const f of expected) {
    const item = parsed.dados[f];
    if (item && typeof item.valor === "string") {
      const validated = validateField(f, item.valor);
      if (validated !== null) {
        fields[f] = validated;
        if (typeof item.evidencia === "string") evidences[f] = item.evidencia;
        const c = typeof item.confianca === "number" ? Math.max(0, Math.min(1, item.confianca)) : 0.9;
        fieldConfidences[f] = c;
        confSum += c;
        filled += 1;
      }
    }
  }

  const confidence = filled === 0 ? 0 : Number((confSum / filled).toFixed(2));
  return { status: "sucesso", confidence, fields, evidences, field_confidences: fieldConfidences };
}