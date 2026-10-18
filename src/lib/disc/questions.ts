// Questionário DISC (seguro para o cliente). Cada grupo tem 4 palavras, uma por fator.
export type DiscFactor = "D" | "I" | "S" | "C";

export const DISC_GROUPS: Array<Record<DiscFactor, string>> = [
  { D: "Decidido", I: "Comunicativo", S: "Paciente", C: "Detalhista" },
  { D: "Competitivo", I: "Entusiasmado", S: "Calmo", C: "Preciso" },
  { D: "Direto", I: "Sociável", S: "Leal", C: "Organizado" },
  { D: "Ousado", I: "Otimista", S: "Tranquilo", C: "Cuidadoso" },
  { D: "Determinado", I: "Persuasivo", S: "Prestativo", C: "Analítico" },
  { D: "Assertivo", I: "Expressivo", S: "Constante", C: "Disciplinado" },
  { D: "Firme", I: "Animado", S: "Compreensivo", C: "Cauteloso" },
  { D: "Independente", I: "Inspirador", S: "Cooperativo", C: "Sistemático" },
  { D: "Corajoso", I: "Espontâneo", S: "Gentil", C: "Lógico" },
  { D: "Objetivo", I: "Carismático", S: "Bom ouvinte", C: "Criterioso" },
  { D: "Focado em resultados", I: "Focado em pessoas", S: "Focado em harmonia", C: "Focado em qualidade" },
  { D: "Gosto de desafios", I: "Gosto de novidades", S: "Gosto de estabilidade", C: "Gosto de regras claras" },
  { D: "Rápido", I: "Divertido", S: "Sereno", C: "Perfeccionista" },
  { D: "Líder", I: "Motivador", S: "Apoiador", C: "Planejador" },
  { D: "Exigente", I: "Falante", S: "Previsível", C: "Reservado" },
  { D: "Ambicioso", I: "Criativo", S: "Confiável", C: "Metódico" },
  { D: "Enérgico", I: "Popular", S: "Moderado", C: "Exato" },
  { D: "Assume riscos", I: "Convence os outros", S: "Evita conflitos", C: "Segue procedimentos" },
  { D: "Dominante", I: "Extrovertido", S: "Equilibrado", C: "Convencional" },
  { D: "Prático", I: "Afetuoso", S: "Atencioso", C: "Racional" },
  { D: "Persistente", I: "Alegre", S: "Sossegado", C: "Minucioso" },
  { D: "Toma a iniciativa", I: "Faz amigos fácil", S: "Trabalha bem em equipe", C: "Verifica tudo" },
  { D: "Desbravador", I: "Influente", S: "Conciliador", C: "Especialista" },
  { D: "Resoluto", I: "Encantador", S: "Sincero", C: "Diplomático" },
];

export const DISC_LABEL: Record<DiscFactor, string> = {
  D: "Dominância",
  I: "Influência",
  S: "Estabilidade",
  C: "Conformidade",
};

export const DISC_DESCRIPTION: Record<DiscFactor, string> = {
  D: "Orientado a resultados, direto, decidido e movido por desafios.",
  I: "Comunicativo, otimista, persuasivo e focado em pessoas.",
  S: "Paciente, leal, cooperativo e valoriza estabilidade.",
  C: "Analítico, preciso, organizado e focado em qualidade e regras.",
};

const FACTORS: DiscFactor[] = ["D", "I", "S", "C"];

/** Calcula percentuais (somam ~100) e perfil predominante (1 ou 2 letras). */
export function scoreDisc(answers: DiscFactor[]) {
  const counts: Record<DiscFactor, number> = { D: 0, I: 0, S: 0, C: 0 };
  for (const a of answers) if (a in counts) counts[a]++;
  const total = answers.length || 1;
  const scores = Object.fromEntries(
    FACTORS.map((f) => [f, Math.round((counts[f] / total) * 100)]),
  ) as Record<DiscFactor, number>;
  const sorted = [...FACTORS].sort((a, b) => counts[b] - counts[a]);
  const [first, second] = sorted;
  const profile = counts[second] > 0 && counts[first] - counts[second] <= 2 ? `${first}${second}` : first;
  return { scores, profile };
}
