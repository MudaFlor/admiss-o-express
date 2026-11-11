import writeXlsxFile from "write-excel-file/browser";

type Row = Record<string, unknown>;

const COLUMNS: [string, (c: Row) => string][] = [
  ["Nome", (c) => s(c.full_name)],
  ["Cidade", (c) => s(c.cidade)],
  ["Cargo", (c) => s(c.position)],
  ["Departamento", (c) => s(c.departamento)],
  ["Solicitante da Vaga", (c) => s(c.solicitante_vaga)],
  ["Recrutador", (c) => s(c.recrutador)],
  ["Data da entrevista", (c) => (c.data_entrevista ? String(c.data_entrevista).split("-").reverse().join("/") : "")],
  ["Situação da entrevista", (c) => s(c.situacao_entrevista)],
  ["Observações da entrevista", (c) => s(c.observacoes_entrevista)],
  ["Teste", (c) => s(c.teste)],
  ["Admissão", (c) => s(c.admitido)],
  ["Categoria", (c) => s(c.categoria)],
  ["Integração", (c) => s(c.integracao)],
  ["Meio de recebimento do Curriculo", (c) => s(c.meio_recebimento)],
  ["Recontratar?", (c) => s(c.recontratar)],
];

function s(v: unknown) {
  return v == null ? "" : String(v);
}

export const CANDIDATE_EXPORT_HEADERS = COLUMNS.map(([h]) => h);

export function candidateExportRows(list: Row[]): string[][] {
  return list.map((c) => COLUMNS.map(([, f]) => f(c)));
}

export async function downloadCandidatesXlsx(list: Row[]) {
  const header = CANDIDATE_EXPORT_HEADERS.map((value) => ({ value, fontWeight: "bold" as const }));
  const data = [header, ...candidateExportRows(list).map((r) => r.map((value) => ({ value })))];
  const blob = await writeXlsxFile(data, { columns: COLUMNS.map(([h]) => ({ width: Math.max(14, h.length + 4) })) }).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `candidatos-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
