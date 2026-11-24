export type FilterableEmployee = {
  full_name: string;
  matricula_esocial?: string | null;
};

export type EmployeeFilters = {
  /** Busca pelo nome do colaborador. */
  search: string;
  /** Busca pelo ID / matrícula eSocial. */
  matricula: string;
};

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Mantém apenas colaboradores cujo nome e/ou matrícula batem com os filtros informados. */
export function filterEmployees<T extends FilterableEmployee>(
  rows: readonly T[],
  filters: EmployeeFilters,
): T[] {
  const search = fold(filters.search.trim());
  const matricula = filters.matricula.trim();
  const matriculaDigits = digits(matricula);

  return rows.filter((row) => {
    if (search && !fold(row.full_name).includes(search)) return false;
    if (!matricula) return true;

    const value = row.matricula_esocial ?? "";
    if (!value) return false;
    if (fold(value).includes(fold(matricula))) return true;
    return matriculaDigits.length > 0 && digits(value).includes(matriculaDigits);
  });
}
