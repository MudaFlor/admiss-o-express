export const CANDIDATE_STATUSES = ["pendente", "em_analise", "aprovado", "admitido", "rejeitado"] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export function isCandidateStatus(value: unknown): value is CandidateStatus {
  return CANDIDATE_STATUSES.some((status) => status === value);
}

export function countCandidateStatuses(rows: ReadonlyArray<{ status: string }>) {
  const counts = { pendente: 0, em_analise: 0, aprovado: 0, admitido: 0, rejeitado: 0 };
  for (const row of rows) {
    if (isCandidateStatus(row.status)) counts[row.status] += 1;
  }
  return { counts, total: rows.length };
}