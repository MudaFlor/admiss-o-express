// Validações auxiliares chamadas do servidor.
// - lookupCep: consulta ViaCEP e retorna endereço estruturado.
// - checkDuplicateCpf: procura outro candidato ativo com o mesmo CPF.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizeCpf } from "@/lib/cpf";

export interface CepInfo {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  complemento?: string;
}

export async function lookupCep(rawCep: string): Promise<CepInfo | null> {
  const cep = rawCep.replace(/\D/g, "");
  if (cep.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      cep?: string; logradouro?: string; bairro?: string; localidade?: string;
      uf?: string; complemento?: string; erro?: boolean;
    };
    if (data.erro) return null;
    return {
      cep: data.cep ?? cep,
      logradouro: data.logradouro ?? "",
      bairro: data.bairro ?? "",
      cidade: data.localidade ?? "",
      uf: data.uf ?? "",
      complemento: data.complemento || undefined,
    };
  } catch {
    return null;
  }
}

export async function checkDuplicateCpf(cpf: string, excludeCandidateId?: string): Promise<{ duplicate: boolean; candidate_id?: string }>{
  const norm = normalizeCpf(cpf);
  if (norm.length !== 11) return { duplicate: false };
  let q = supabaseAdmin.from("candidates").select("id").eq("cpf", norm).is("deletion_requested_at", null);
  if (excludeCandidateId) q = q.neq("id", excludeCandidateId);
  const { data } = await q.limit(1);
  const first = data?.[0];
  return first ? { duplicate: true, candidate_id: first.id } : { duplicate: false };
}