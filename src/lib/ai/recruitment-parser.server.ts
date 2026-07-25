import mammoth from "mammoth";

export interface ParsedProfile {
  full_name: string | null;
  data_nascimento: string | null;
  idade: number | null;
  endereco: string | null;
  email: string | null;
  telefone: string | null;
  cargo: string | null;
  resumo_experiencias: string | null;
  palavras_chave: string[];
}

const PROFILE_TOOL = {
  type: "function" as const,
  function: {
    name: "extract_profile",
    description: "Extrai o perfil profissional de um currículo/documento de candidato.",
    parameters: {
      type: "object",
      properties: {
        full_name: { type: ["string", "null"] },
        data_nascimento: { type: ["string", "null"], description: "DD/MM/AAAA se encontrada" },
        idade: { type: ["number", "null"], description: "Idade em anos; calcule pela data de nascimento quando possível" },
        endereco: { type: ["string", "null"], description: "Endereço completo; cidade/UF se for o único disponível" },
        email: { type: ["string", "null"] },
        telefone: { type: ["string", "null"] },
        cargo: { type: ["string", "null"], description: "Cargo/objetivo profissional mais recente" },
        resumo_experiencias: {
          type: ["string", "null"],
          description: "Resumo em texto corrido (até 8 linhas) das experiências profissionais",
        },
        palavras_chave: {
          type: "array",
          items: { type: "string" },
          description: "Até 12 palavras-chave do perfil profissional (competências, ferramentas, áreas)",
        },
      },
      required: [
        "full_name", "data_nascimento", "idade", "endereco", "email",
        "telefone", "cargo", "resumo_experiencias", "palavras_chave",
      ],
      additionalProperties: false,
    },
  },
};

const SYSTEM =
  "Você é um analista de recrutamento. Extraia apenas o que estiver visível no documento. " +
  "Não invente dados: use null quando não encontrar. Responda em português do Brasil.";

export async function parseProfileFromFile(input: {
  base64: string;
  filename: string;
}): Promise<ParsedProfile> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

  const ext = input.filename.split(".").pop()?.toLowerCase() ?? "";
  const bytes = Buffer.from(input.base64, "base64");

  let userContent: unknown;
  if (ext === "docx") {
    const { value } = await mammoth.extractRawText({ buffer: bytes });
    userContent = `Conteúdo do documento (DOCX):\n\n${String(value).slice(0, 30000)}`;
  } else if (["txt", "csv", "md", "rtf"].includes(ext)) {
    userContent = `Conteúdo do documento:\n\n${bytes.toString("utf8").slice(0, 30000)}`;
  } else if (ext === "pdf" || ["jpg", "jpeg", "png", "webp"].includes(ext)) {
    const mime =
      ext === "pdf" ? "application/pdf"
      : ext === "png" ? "image/png"
      : ext === "webp" ? "image/webp"
      : "image/jpeg";
    userContent = [
      { type: "text", text: "Extraia o perfil profissional deste documento." },
      { type: "image_url", image_url: { url: `data:${mime};base64,${input.base64}` } },
    ];
  } else {
    throw new Error("Formato não suportado. Envie PDF, DOCX, TXT, JPG ou PNG.");
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent },
      ],
      tools: [PROFILE_TOOL],
      tool_choice: { type: "function", function: { name: "extract_profile" } },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("Muitas requisições de IA. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados.");
    throw new Error(`Falha na análise do arquivo (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw new Error("A IA não retornou dados estruturados");
  const parsed = JSON.parse(call.function.arguments) as ParsedProfile;
  return { ...parsed, palavras_chave: Array.isArray(parsed.palavras_chave) ? parsed.palavras_chave : [] };
}
