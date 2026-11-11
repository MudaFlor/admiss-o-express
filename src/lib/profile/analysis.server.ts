import { createOpenAI } from "@ai-sdk/openai";
import { jsonSchema, Output, streamText } from "ai";
import {
  profileAnalysisSchema, profileEvolutionSchema,
  type ProfileAnalysis, type ProfileEvolution, type QuestionSet,
} from "./questions";

const MODEL = "openai/gpt-6-astra";

function provider() {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");
  return createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
}

const str = { type: "string" } as const;
const arr = { type: "array", items: str } as const;

const analysisJson = jsonSchema<ProfileAnalysis>({
  type: "object",
  additionalProperties: false,
  required: ["lideranca", "valores", "flexibilidade", "autoconsciencia", "resumo", "pontos_fortes", "pontos_atencao"],
  properties: { lideranca: str, valores: str, flexibilidade: str, autoconsciencia: str, resumo: str, pontos_fortes: arr, pontos_atencao: arr },
});
const evolutionJson = jsonSchema<ProfileEvolution>({
  type: "object",
  additionalProperties: false,
  required: ["manteve", "amadureceu", "novos_pontos_atencao"],
  properties: { manteve: str, amadureceu: str, novos_pontos_atencao: str },
});

async function run<T>(instructions: string, prompt: string, schema: ReturnType<typeof jsonSchema<T>>): Promise<T> {
  const result = streamText({
    model: provider().responses(MODEL),
    instructions,
    prompt,
    output: Output.object({ schema }),
    maxRetries: 0,
    providerOptions: {
      openai: { store: false, forceReasoning: true, reasoningEffort: "medium", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] },
    },
  });
  return (await result.output) as T;
}

const ANALYST = `Aja como um psicólogo organizacional e analista de perfil comportamental sênior. Escreva em português do Brasil, em tom profissional, objetivo e respeitoso. Baseie-se apenas no que está nas respostas; quando a evidência for fraca, diga isso. Não faça diagnósticos clínicos.`;

export async function analyzeProfile(input: { questions: QuestionSet; q1: string; q2: string; reason?: string | null }): Promise<ProfileAnalysis> {
  const prompt = `1ª pergunta: ${input.questions.q1}
Resposta: """${input.q1}"""

2ª pergunta: ${input.questions.q2}
Resposta: """${input.q2}"""
${input.reason ? `\nContexto informado pelo RH para esta avaliação: ${input.reason}\n` : ""}
Com base nas duas respostas, trace o perfil detalhado desta pessoa analisando:
1. lideranca — Estilo de Liderança e Tomada de Decisão: é mais orientada a processos, a pessoas, a resultados imediatos ou a conceitos abstratos? Como gerencia crises?
2. valores — Hierarquia de Valores e Critérios de Confiança: o que mais valoriza no outro (lealdade, competência técnica, alinhamento moral, diversidade)?
3. flexibilidade — Flexibilidade Cognitiva e Resiliência: como reage à frustração e ao erro? Demonstra abertura para mudar de ideia (vieses de confirmação) ou reage de forma defensiva?
4. autoconsciencia — Nível de Autoconsciência: a narrativa demonstra maturidade e autorresponsabilidade ou externalização de culpa?
Depois, resumo (resumo executivo), pontos_fortes e pontos_atencao (gargalos) em listas curtas.`;
  return profileAnalysisSchema.parse(await run(ANALYST, prompt, analysisJson));
}

export async function compareProfiles(previous: ProfileAnalysis, current: ProfileAnalysis, months: number): Promise<ProfileEvolution> {
  const prompt = `Análise anterior (cerca de ${months} meses atrás):
${JSON.stringify(previous)}

Análise atual:
${JSON.stringify(current)}

As perguntas mudaram entre os ciclos, mas os eixos são os mesmos. Escreva um parecer de evolução: manteve (traços estáveis), amadureceu (o que evoluiu) e novos_pontos_atencao.`;
  return profileEvolutionSchema.parse(await run(ANALYST, prompt, evolutionJson));
}
