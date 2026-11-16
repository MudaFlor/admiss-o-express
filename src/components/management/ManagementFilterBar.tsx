import { createContext, useContext, useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ManagementFilter } from "@/lib/management-filter";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const ALL = "__all__";

export function defaultFilter(): ManagementFilter {
  const d = new Date();
  return { period: "mensal", year: d.getFullYear(), month: d.getMonth() + 1, department: "" };
}

export function filterInput(f: ManagementFilter, months: number) {
  return { months, period: f.period, year: f.year, month: f.month, department: f.department || undefined };
}

type Ctx = { filter: ManagementFilter; setFilter: (f: ManagementFilter) => void; departments: string[]; setDepartments: (d: string[]) => void };
const FilterCtx = createContext<Ctx | null>(null);

export function ManagementFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<ManagementFilter>(defaultFilter);
  const [departments, setDepartments] = useState<string[]>([]);
  return <FilterCtx.Provider value={{ filter, setFilter, departments, setDepartments }}>{children}</FilterCtx.Provider>;
}

export function useManagementFilter() {
  const c = useContext(FilterCtx);
  if (!c) throw new Error("ManagementFilterProvider ausente");
  return c;
}

export function filterSummary(f: ManagementFilter) {
  const p = f.period === "anual" ? `Ano ${f.year}` : `${MONTHS[f.month - 1]} ${f.year}`;
  return f.department ? `${p} · ${f.department}` : p;
}

export function ManagementFilterBar({
  filter,
  onChange,
  departments,
}: {
  filter: ManagementFilter;
  onChange: (f: ManagementFilter) => void;
  departments: string[];
}) {
  const cur = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => cur - i);
  const active = filter.period !== "mensal" || filter.department !== "" ||
    filter.year !== cur || filter.month !== new Date().getMonth() + 1;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-10 gap-2 border-border bg-card hover:bg-secondary">
          <SlidersHorizontal className="h-4 w-4" />
          Filtrar
          <span className="hidden text-xs text-muted-foreground sm:inline">· {filterSummary(filter)}</span>
          {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-4">
        <div className="space-y-1.5">
          <Label>Período</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            value={filter.period}
            onValueChange={(v) => v && onChange({ ...filter, period: v as ManagementFilter["period"] })}
            className="w-full"
          >
            <ToggleGroupItem value="anual" className="flex-1">Anual</ToggleGroupItem>
            <ToggleGroupItem value="mensal" className="flex-1">Mensal</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Ano</Label>
            <Select value={String(filter.year)} onValueChange={(v) => onChange({ ...filter, year: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Mês</Label>
            <Select
              value={String(filter.month)}
              disabled={filter.period === "anual"}
              onValueChange={(v) => onChange({ ...filter, month: Number(v) })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Departamento</Label>
          <Select value={filter.department || ALL} onValueChange={(v) => onChange({ ...filter, department: v === ALL ? "" : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange(defaultFilter())}>Limpar filtros</Button>
      </PopoverContent>
    </Popover>
  );
}

/** Botão ligado ao filtro compartilhado das abas de Gestão executiva. */
export function SharedManagementFilterBar() {
  const { filter, setFilter, departments } = useManagementFilter();
  return <ManagementFilterBar filter={filter} onChange={setFilter} departments={departments} />;
}
