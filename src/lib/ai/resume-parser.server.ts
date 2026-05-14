import { supabaseAdmin } from "@/integrations/supabase/client.server";
// @ts-expect-error - mammoth has no bundled types in this stack
import mammoth from "mammoth";

export interface ParsedResume {
  full_name: string | null;
  cpf: string | null;
  rg: string | null;
  rg_emissao: string | null;
  data_nascimento: string | null;
  local_nascimento: string | null;
  nome_pai: string | null;
  nome_mae: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  linkedin: string | null;
  formacao: Array<{ instituicao: string; curso: string; periodo: string }>;
  experiencias: Array<{ empresa: string; cargo: string; periodo: string; descricao: string }>;
  competencias: string[];
}

const RESUME_TOOL = {
  type: "function" as const,
  function: {
    name: "extract_resume",
    description: "Extrai dados estruturados de um currículo profissional brasileiro.",
    parameters: {
      type: "object",
      properties: {
        full_name: { type: ["string", "null"] },
        cpf: { type: ["string", "null"] },
        rg: { type: ["string", "null"] },
        rg_emissao: { type: ["string", "null"], description: "Data de emissão do RG (DD/MM/AAAA)" },
        data_nascimento: { type: ["string", "null"], description: "DD/MM/AAAA" },
        local_nascimento: { type: ["string", "null"] },
        nome_pai: { type: ["string", "null"] },
        nome_mae: { type: ["string", "null"] },
        email: { type: ["string", "null"] },
        telefone: { type: ["string", "null"] },
        endereco: { type: ["string", "null"] },
        linkedin: { type: ["string", "null"] },
        formacao: {
          type: "array",
          items: {
            type: "object",
            properties: {
              instituicao: { type: "string" },
              curso: { type: "string" },
              periodo: { type: "string" },
            },
            required: ["instituicao", "curso", "periodo"],
            additionalProperties: false,
          },
        },
        experiencias: {
          type: "array",
          items: {
            type: "object",
            properties: {
              empresa: { type: "string" },
              cargo: { type: "string" },
              periodo: { type: "string" },
              descricao: { type: "string" },
            },
            required: ["empresa", "cargo", "periodo", "descricao"],
            additionalProperties: false,
          },
        },
        competencias: { type: "array", items: { type: "string" } },
      },
      required: [
        "full_name", "cpf", "rg", "rg_emissao", "data_nascimento", "local_nascimento",
        "nome_pai", "nome_mae", "email", "telefone", "endereco", "linkedin",
        "formacao", "experiencias", "competencias",
      ],
      additionalProperties: false,
    },
  },
};

const SYSTEM = `Você é um extrator de currículos. Analise o conteúdo enviado (texto ou imagem) e extraia os campos solicitados. Para cada campo não encontrado, retorne null. Para listas vazias, retorne []. Não invente dados.`;

async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return result.value as string;
}

export async function parseResumeFromStorage(storagePath: string): Promise<ParsedResume> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

  const { data: file, error: dlErr } = await supabaseAdmin.storage
    .from("candidate-documents")
    .download(storagePath);
  if (dlErr || !file) throw new Error(dlErr?.message ?? "Falha ao baixar currículo");

  const ext = storagePath.split(".").pop()?.toLowerCase() ?? "";
  const buffer = await file.arrayBuffer();

  let userContent: unknown;
  if (ext === "docx") {
    const text = await extractTextFromDocx(buffer);
    userContent = `Conteúdo do currículo (DOCX):\n\n${text.slice(0, 30000)}`;
  } else if (ext === "pdf" || ["jpg", "jpeg", "png", "webp"].includes(ext)) {
    const mime =
      ext === "pdf" ? "application/pdf" :
      ext === "png" ? "image/png" :
      ext === "webp" ? "image/webp" : "image/jpeg";
    const b64 = Buffer.from(buffer).toString("base64");
    userContent = [
      { type: "text", text: "Extraia os dados deste currículo." },
      { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
    ];
  } else {
    throw new Error("Formato não suportado. Envie PDF, DOCX, JPG ou PNG.");
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent },
      ],
      tools: [RESUME_TOOL],
      tool_choice: { type: "function", function: { name: "extract_resume" } },
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("Muitas requisições. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Contate o RH.");
    throw new Error(`Falha na análise do currículo (${res.status})`);
  }

  const data = await res.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw new Error("IA não retornou dados estruturados");
  return JSON.parse(call.function.arguments) as ParsedResume;
}
