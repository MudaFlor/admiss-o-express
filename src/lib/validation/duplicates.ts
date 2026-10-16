// Pontuação de similaridade entre dois cadastros de candidato. Função pura.
export interface DupProfile {
  names: string[];
  cpf?: string | null;
  birth?: string | null;
  email?: string | null;
  phone?: string | null;
}

export const DUPLICATE_THRESHOLD = 90;

const normName = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z\s]/g, " ").toUpperCase().replace(/\s+/g, " ").trim();
const digits = (v?: string | null) => (v ?? "").replace(/\D/g, "");
const normBirth = (v?: string | null) => {
  if (!v) return "";
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : v.trim();
};

function nameSim(a: string, b: string): number {
  const A = normName(a).split(" ").filter(Boolean);
  const B = normName(b).split(" ").filter(Boolean);
  if (!A.length || !B.length) return 0;
  if (A.join(" ") === B.join(" ")) return 1;
  const sa = new Set(A), sb = new Set(B);
  if (A.every((w) => sb.has(w)) || B.every((w) => sa.has(w))) return 0.9;
  const inter = A.filter((w) => sb.has(w)).length;
  return inter / new Set([...A, ...B]).size;
}

export function similarity(a: DupProfile, b: DupProfile): { score: number; reasons: string[] } {
  const ca = digits(a.cpf), cb = digits(b.cpf);
  if (ca.length === 11 && cb.length === 11) {
    return ca === cb ? { score: 100, reasons: ["Mesmo CPF"] } : { score: 0, reasons: ["CPF diferente"] };
  }
  let got = 0, max = 0, fields = 0;
  const reasons: string[] = [];
  const na = a.names.filter(Boolean), nb = b.names.filter(Boolean);
  if (na.length && nb.length) {
    const s = Math.max(...na.flatMap((x) => nb.map((y) => nameSim(x, y))));
    got += 40 * s; max += 40; fields++;
    if (s >= 0.9) reasons.push("Nome");
  }
  const ba = normBirth(a.birth), bb = normBirth(b.birth);
  if (ba && bb) { max += 25; fields++; if (ba === bb) { got += 25; reasons.push("Data de nascimento"); } }
  const ea = (a.email ?? "").trim().toLowerCase(), eb = (b.email ?? "").trim().toLowerCase();
  if (ea && eb) { max += 20; fields++; if (ea === eb) { got += 20; reasons.push("E-mail"); } }
  const pa = digits(a.phone).slice(-8), pb = digits(b.phone).slice(-8);
  if (pa.length === 8 && pb.length === 8) { max += 15; fields++; if (pa === pb) { got += 15; reasons.push("Telefone"); } }
  // Só o nome não basta: exige ao menos dois dados comparáveis.
  if (fields < 2 || max === 0) return { score: 0, reasons };
  return { score: Math.round((got / max) * 100), reasons };
}
