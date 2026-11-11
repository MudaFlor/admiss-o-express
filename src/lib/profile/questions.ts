import { z } from "zod";

export type QuestionSet = { id: string; q1: string; q2: string };

// Cada ciclo usa um par diferente, mas todos avaliam os mesmos 4 eixos.
export const QUESTION_SETS: QuestionSet[] = [
  {
    id: "ciclo-1",
    q1: "Imagine que você recebeu a missão de liderar a reconstrução de uma comunidade após uma grande crise. Qual seria a sua primeira decisão prática e qual critério você usaria para escolher as pessoas que vão trabalhar diretamente com você?",
    q2: "Pense em um momento da sua vida em que você teve certeza de que estava certo sobre algo, mas descobriu — de forma dolorosa ou surpreendente — que estava completamente errado. O que aconteceu e como você lidou com essa mudança de perspectiva?",
  },
  {
    id: "ciclo-2",
    q1: "Imagine que você assumiu uma equipe desmotivada, com prazo curto e poucos recursos para entregar um projeto importante. O que você faria na primeira semana e em quem você confiaria para dividir as decisões? Por quê?",
    q2: "Conte sobre uma situação em que uma crítica ou um feedback mudou a forma como você trabalha ou pensa. Como você recebeu esse feedback na hora e o que mudou depois?",
  },
  {
    id: "ciclo-3",
    q1: "Imagine que você precisa escolher entre cumprir uma meta importante ou proteger uma pessoa da equipe que cometeu um erro grave. Como você decidiria e o que comunicaria aos envolvidos?",
    q2: "Pense em um projeto ou objetivo pessoal que não deu certo. O que você acredita que causou o resultado, qual foi a sua parte nisso e o que você faria diferente hoje?",
  },
];

export const REVIEW_INTERVAL_MONTHS = 12;

/** Modelo atual: Comunicação, Colaboração e Conflito. Perguntas fixas para comparar a evolução. */
export const CCC_SET: QuestionSet = {
  id: "ccc-1",
  q1: "Imagine que você depende da entrega de um colega de outra área para concluir o seu trabalho no prazo. Ele atrasa a entrega e não responde às suas mensagens. O prazo final está correndo. Exatamente o que você faz e como aborda essa pessoa ou a situação?",
  q2: "Pense em uma situação real de trabalho onde você e um colega (ou cliente interno) tinham opiniões completamente opostas sobre como resolver um problema. O clima ficou tenso. Como você conduziu essa divergência para que chegassem a um acordo sem prejudicar a relação de trabalho?",
};

/** Novas avaliações sempre usam o modelo atual (perguntas fixas). */
export function nextQuestionSet(_usedIds?: (string | null | undefined)[]): QuestionSet {
  return CCC_SET;
}

export function questionSetById(id: string | null | undefined): QuestionSet {
  if (id === CCC_SET.id) return CCC_SET;
  return QUESTION_SETS.find((s) => s.id === id) ?? QUESTION_SETS[0];
}

export const isV2Set = (id: string | null | undefined) => id === CCC_SET.id;

export const profileAnswersSchema = z.object({
  q1: z.string().trim().min(30, "Escreva pelo menos algumas frases na 1ª resposta (mínimo 30 caracteres).").max(5000),
  q2: z.string().trim().min(30, "Escreva pelo menos algumas frases na 2ª resposta (mínimo 30 caracteres).").max(5000),
});

export const AXES = [
  { key: "lideranca", label: "Estilo de Liderança e Tomada de Decisão" },
  { key: "valores", label: "Hierarquia de Valores e Critérios de Confiança" },
  { key: "flexibilidade", label: "Flexibilidade Cognitiva e Resiliência" },
  { key: "autoconsciencia", label: "Nível de Autoconsciência" },
] as const;

export const profileAnalysisSchema = z.object({
  lideranca: z.string().min(1),
  valores: z.string().min(1),
  flexibilidade: z.string().min(1),
  autoconsciencia: z.string().min(1),
  resumo: z.string().min(1),
  pontos_fortes: z.array(z.string()).min(1),
  pontos_atencao: z.array(z.string()).min(1),
});
export type ProfileAnalysis = z.infer<typeof profileAnalysisSchema>;

export const profileEvolutionSchema = z.object({
  manteve: z.string().min(1),
  amadureceu: z.string().min(1),
  novos_pontos_atencao: z.string().min(1),
});
export type ProfileEvolution = z.infer<typeof profileEvolutionSchema>;

export const ETHICS_NOTICE =
  "Esta análise apoia o desenvolvimento da pessoa e não deve, sozinha, decidir contratação, promoção ou desligamento.";

export const COMM_STYLES = ["Assertivo", "Passivo", "Agressivo", "Passivo-Agressivo"] as const;
export const CONFLICT_STRATEGIES = ["Colaboração (Ganha-Ganha)", "Competição (Ganha-Perde)", "Evasão"] as const;
export const VERDICTS = ["Pontes", "Muros"] as const;

export const profileAnalysisV2Schema = z.object({
  version: z.literal(2),
  comunicacao: z.object({ estilo: z.enum(COMM_STYLES), explicacao: z.string().min(1) }),
  colaboracao: z.object({ explicacao: z.string().min(1) }),
  conflitos: z.object({ estrategia: z.enum(CONFLICT_STRATEGIES), separa_tecnico_pessoal: z.boolean(), explicacao: z.string().min(1) }),
  inteligencia_emocional: z.object({ explicacao: z.string().min(1) }),
  veredito: z.object({ perfil: z.enum(VERDICTS), justificativa: z.string().min(1), ponto_forte: z.string().min(1), ponto_desenvolvimento: z.string().min(1) }),
});
export type ProfileAnalysisV2 = z.infer<typeof profileAnalysisV2Schema>;

export const profileIntroSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(120),
  cargo: z.string().trim().min(2, "Informe seu cargo ou área").max(120),
});

export function isV2Analysis(a: unknown): a is ProfileAnalysisV2 {
  return profileAnalysisV2Schema.safeParse(a).success;
}

/** Texto simples do resultado, usado em Copiar e no PDF. */
export function analysisV2ToText(name: string, a: ProfileAnalysisV2): string {
  return [
    `Perfil comportamental — ${name}`,
    "",
    `1. Estilo de Comunicação Corporativa: ${a.comunicacao.estilo}`,
    a.comunicacao.explicacao,
    "",
    "2. Dinâmica de Colaboração e Interdependência",
    a.colaboracao.explicacao,
    "",
    `3. Resolução de Conflitos: ${a.conflitos.estrategia} — ${a.conflitos.separa_tecnico_pessoal ? "separa o problema técnico das relações pessoais" : "não separa o problema técnico das relações pessoais"}`,
    a.conflitos.explicacao,
    "",
    "4. Inteligência Emocional sob Pressão",
    a.inteligencia_emocional.explicacao,
    "",
    `5. Veredito Final: Perfil ${a.veredito.perfil}`,
    a.veredito.justificativa,
    `Ponto forte: ${a.veredito.ponto_forte}`,
    `Ponto de desenvolvimento: ${a.veredito.ponto_desenvolvimento}`,
  ].join("\n");
}
