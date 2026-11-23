export type EmployeeSortKey = "full_name" | "position" | "department" | "admission_date" | "status";
export type SortDirection = "asc" | "desc";

export type EmployeeSort = {
  key: EmployeeSortKey;
  direction: SortDirection;
};

type SortableEmployee = {
  full_name: string;
  position?: string | null;
  department?: string | null;
  admission_date: string;
  termination_date?: string | null;
};

const collator = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });

function sortValue(employee: SortableEmployee, key: EmployeeSortKey): string {
  if (key === "status") return employee.termination_date ? "Desligado" : "Ativo";
  return employee[key] ?? "";
}

export function sortEmployees<T extends SortableEmployee>(rows: readonly T[], sort: EmployeeSort): T[] {
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const comparison = collator.compare(sortValue(a, sort.key), sortValue(b, sort.key));
    if (comparison !== 0) return comparison * factor;
    return collator.compare(a.full_name, b.full_name);
  });
}
