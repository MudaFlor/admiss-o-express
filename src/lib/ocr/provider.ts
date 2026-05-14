// OCR provider interface — preparado para futura integração com Lovable AI Gateway (Gemini Vision).
// Hoje retorna dados simulados por tipo de documento.

import type { Database } from "@/integrations/supabase/types";

export type DocumentType = Database["public"]["Enums"]["document_type"];

export interface OcrResult {
  fields: Record<string, string>;
  confidence: number;
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

const FIRST_NAMES = ["Ana", "Bruno", "Carla", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique"];
const LAST_NAMES = ["Silva", "Souza", "Oliveira", "Santos", "Pereira", "Lima", "Costa", "Almeida"];

function fakeName() {
  return `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
}

function fakeDate(yearStart = 1970, yearEnd = 2002) {
  const y = Math.floor(rand(yearStart, yearEnd));
  const m = String(Math.floor(rand(1, 13))).padStart(2, "0");
  const d = String(Math.floor(rand(1, 28))).padStart(2, "0");
  return `${d}/${m}/${y}`;
}

export async function runOcr(type: DocumentType, _storagePath: string): Promise<OcrResult> {
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
  const confidence = Number(rand(0.78, 0.97).toFixed(2));
  switch (type) {
    case "rg":
      return {
        confidence,
        fields: {
          nome: fakeName(),
          rg: `${Math.floor(rand(10, 60))}.${Math.floor(rand(100, 999))}.${Math.floor(rand(100, 999))}-${Math.floor(rand(0, 9))}`,
          data_nascimento: fakeDate(),
          orgao_emissor: "SSP/SP",
          naturalidade: "São Paulo - SP",
          nome_mae: fakeName(),
        },
      };
    case "cpf":
      return {
        confidence,
        fields: {
          nome: fakeName(),
          cpf: `${Math.floor(rand(100, 999))}.${Math.floor(rand(100, 999))}.${Math.floor(rand(100, 999))}-${String(Math.floor(rand(10, 99)))}`,
          data_nascimento: fakeDate(),
        },
      };
    case "cnh":
      return {
        confidence,
        fields: {
          nome: fakeName(),
          cpf: `${Math.floor(rand(100, 999))}.${Math.floor(rand(100, 999))}.${Math.floor(rand(100, 999))}-${String(Math.floor(rand(10, 99)))}`,
          numero_registro: String(Math.floor(rand(1e9, 9e9))),
          categoria: ["A", "B", "AB", "C", "D"][Math.floor(rand(0, 5))],
          validade: fakeDate(2026, 2032),
          data_emissao: fakeDate(2018, 2024),
        },
      };
    case "comprovante_residencia":
      return {
        confidence,
        fields: {
          titular: fakeName(),
          endereco: `Rua das Acácias, ${Math.floor(rand(1, 9999))} - Apto ${Math.floor(rand(1, 200))}`,
          bairro: "Centro",
          cidade: "São Paulo",
          uf: "SP",
          cep: `${String(Math.floor(rand(10000, 99999)))}-${String(Math.floor(rand(100, 999)))}`,
          emissor: "Enel Distribuição",
          data_emissao: fakeDate(2024, 2026),
        },
      };
    case "curriculo":
      return { confidence, fields: {} };
  }
}