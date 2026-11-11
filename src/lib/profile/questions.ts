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

/** Escolhe o próximo par de perguntas, evitando repetir os já usados. */
export function nextQuestionSet(usedIds: (string | null | undefined)[]): QuestionSet {
  const used = usedIds.filter(Boolean);
  return QUESTION_SETS[used.length % QUESTION_SETS.length];
}

export function questionSetById(id: string | null | undefined): QuestionSet {
  return QUESTION_SETS.find((s) => s.id === id) ?? QUESTION_SETS[0];
}

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
