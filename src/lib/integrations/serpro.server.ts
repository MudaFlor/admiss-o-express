// Stub para integração futura com a API da Receita Federal / Serpro.
// Hoje apenas valida o dígito verificador localmente. Para ativar a chamada real,
// adicionar credenciais (SERPRO_CLIENT_ID/SECRET) em Secrets e implementar o fetch aqui.
import { isValidCpf } from "@/lib/cpf";

export interface SerproCpfStatus {
  cpf: string;
  situacao: "regular" | "pendente" | "irregular" | "desconhecido";
  fonte: "local" | "serpro";
}

export async function checkCpfSerpro(cpf: string): Promise<SerproCpfStatus> {
  // TODO: trocar por chamada real ao Serpro
  return {
    cpf,
    situacao: isValidCpf(cpf) ? "regular" : "irregular",
    fonte: "local",
  };
}