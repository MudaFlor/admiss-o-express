// Corrige a filiação lida da certidão (nascimento/casamento) usando RG/CNH como referência.
// Na certidão de casamento a IA pode trocar os pais do titular pelos do cônjuge:
// se algum nome dos pais da certidão coincidir com o RG/CNH, considera esse bloco.
type Vals = Record<string, unknown>;

function norm(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z\s]/g, " ")
    .toUpperCase().replace(/\s+/g, " ").trim();
}

function matches(a: unknown, b: unknown): boolean {
  const x = norm(a), y = norm(b);
  return !!x && !!y && x === y;
}

export function resolveCertidaoParents<T extends Vals>(cert: T, refs: Array<Vals | null | undefined>): T {
  const refList = refs.filter((r): r is Vals => !!r && (!!norm(r.nome_mae) || !!norm(r.nome_pai)));
  if (refList.length === 0) return cert;
  const hits = (pai: unknown, mae: unknown) =>
    refList.some((r) => matches(r.nome_mae, mae) || matches(r.nome_pai, pai) ||
      matches(r.nome_mae, pai) || matches(r.nome_pai, mae));
  if (hits(cert.nome_pai, cert.nome_mae)) return cert;
  const out: Vals = { ...cert };
  if (hits(cert.conjuge_nome_pai, cert.conjuge_nome_mae)) {
    out.nome_pai = cert.conjuge_nome_pai ?? null;
    out.nome_mae = cert.conjuge_nome_mae ?? null;
    out.conjuge_nome_pai = cert.nome_pai ?? null;
    out.conjuge_nome_mae = cert.nome_mae ?? null;
    return out as T;
  }
  // Nenhum bloco confere com RG/CNH: não usar a filiação da certidão.
  out.nome_pai = null;
  out.nome_mae = null;
  return out as T;
}
