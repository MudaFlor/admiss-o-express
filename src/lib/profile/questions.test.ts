import { describe, expect, it } from "vitest";
import { CCC_SET, nextQuestionSet, profileAnswersSchema, profileAnalysisV2Schema, questionSetById, profileIntroSchema } from "./questions";

const valid = {
  version: 2,
  comunicacao: { estilo: "Assertivo", explicacao: "x" },
  colaboracao: { explicacao: "x" },
  conflitos: { estrategia: "Evasão", separa_tecnico_pessoal: true, explicacao: "x" },
  inteligencia_emocional: { explicacao: "x" },
  veredito: { perfil: "Pontes", justificativa: "x", ponto_forte: "a", ponto_desenvolvimento: "b" },
};

describe("análise de perfil (Comunicação, Colaboração e Conflito)", () => {
  it("toda nova avaliação usa as duas perguntas fixas", () => {
    expect(nextQuestionSet([]).id).toBe("ccc-1");
    expect(nextQuestionSet(["ccc-1", "ciclo-1"]).id).toBe("ccc-1");
    expect(CCC_SET.q1.startsWith("Imagine que você depende da entrega de um colega")).toBe(true);
    expect(CCC_SET.q2.startsWith("Pense em uma situação real de trabalho")).toBe(true);
  });
  it("avaliações antigas continuam abrindo suas perguntas originais", () => {
    expect(questionSetById("ciclo-2").id).toBe("ciclo-2");
  });
  it("respostas curtas demais são recusadas", () => {
    expect(profileAnswersSchema.safeParse({ q1: "curta", q2: "x".repeat(40) }).success).toBe(false);
    expect(profileAnswersSchema.safeParse({ q1: "x".repeat(40), q2: "y".repeat(40) }).success).toBe(true);
  });
  it("nome e cargo são obrigatórios", () => {
    expect(profileIntroSchema.safeParse({ nome: "Ana", cargo: "" }).success).toBe(false);
  });
  it("veredito só aceita Pontes ou Muros", () => {
    expect(profileAnalysisV2Schema.safeParse(valid).success).toBe(true);
    expect(profileAnalysisV2Schema.safeParse({ ...valid, veredito: { ...valid.veredito, perfil: "Ilha" } }).success).toBe(false);
  });
  it("estilo de comunicação fica entre os 4 previstos", () => {
    expect(profileAnalysisV2Schema.safeParse({ ...valid, comunicacao: { estilo: "Neutro", explicacao: "x" } }).success).toBe(false);
  });
});
