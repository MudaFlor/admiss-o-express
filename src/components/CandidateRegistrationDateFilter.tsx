import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function CandidateRegistrationDateFilter({ from, to, onChange }: {
  from: string; to: string; onChange: (from: string, to: string) => void;
}) {
  return <div className="flex items-center gap-1 whitespace-nowrap">
    Data de cadastro
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant={from || to ? "secondary" : "ghost"} className="h-8 w-8"
          aria-label="Filtrar por data de cadastro" title="Filtrar por data de cadastro">
          <Filter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="cadastro_de">Cadastro de</Label>
          <Input id="cadastro_de" type="date" value={from} max={to || undefined}
            onChange={(event) => onChange(event.target.value, to && event.target.value > to ? event.target.value : to)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cadastro_ate">Cadastro até</Label>
          <Input id="cadastro_ate" type="date" value={to} min={from || undefined}
            onChange={(event) => onChange(from && event.target.value && event.target.value < from ? event.target.value : from, event.target.value)} />
        </div>
        <Button variant="ghost" size="sm" onClick={() => onChange("", "")}>Limpar período</Button>
      </PopoverContent>
    </Popover>
  </div>;
}