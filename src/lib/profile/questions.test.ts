import { describe, expect, it } from "vitest";
import { QUESTION_SETS, nextQuestionSet, profileAnswersSchema, profileAnalysisSchema } from "./questions";

describe("análise de perfil", () => {
  it("primeiro ciclo usa as perguntas definidas pelo RH", () => {
    const s = nextQuestionSet([]);
    expect(s.q1.startsWith("Imagine que você recebeu a missão de liderar a reconstrução")).toBe(true);
    expect(s.q2.startsWith("Pense em um momento da sua vida em que você teve certeza")).toBe(true);
  });
  it("reavaliação usa um par diferente do anterior", () => {
    expect(nextQuestionSet(["ciclo-1"]).id).not.toBe("ciclo-1");
    expect(nextQuestionSet(["ciclo-1", "ciclo-2"]).id).toBe("ciclo-3");
    expect(nextQuestionSet(QUESTION_SETS.map((s) => s.id)).id).toBe("ciclo-1");
  });
  it("respostas curtas demais são recusadas", () => {
    expect(profileAnswersSchema.safeParse({ q1: "curta", q2: "x".repeat(40) }).success).toBe(false);
    expect(profileAnswersSchema.safeParse({ q1: "x".repeat(40), q2: "y".repeat(40) }).success).toBe(true);
  });
  it("análise exige os 4 eixos e pontos fortes/atenção", () => {
    expect(profileAnalysisSchema.safeParse({ lideranca: "a", valores: "b", flexibilidade: "c", resumo: "e", pontos_fortes: ["x"], pontos_atencao: ["y"] }).success).toBe(false);
  });
});
