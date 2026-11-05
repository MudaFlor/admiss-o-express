import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkCandidateRegistrationDuplicates } from "@/lib/candidate-registration-duplicates.functions";
import type { RegistrationProfile } from "@/lib/validation/candidate-registration-duplicates";

export function CandidateRegistrationDuplicateAlert({ draft }: { draft: RegistrationProfile }) {
  const check = useServerFn(checkCandidateRegistrationDuplicates);
  const key = JSON.stringify({
    full_name: draft.full_name ?? "",
    phone: draft.phone ?? "",
    email: draft.email ?? "",
    endereco: draft.endereco ?? "",
  });
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(key), 450);
    return () => clearTimeout(timer);
  }, [key]);
  const q = useQuery({
    queryKey: ["candidate-registration-duplicates", debounced],
    queryFn: () => check({ data: JSON.parse(debounced) }),
    enabled: !!debounced && debounced === key && Object.values(draft).some((v) => v?.trim()),
    staleTime: 0,
  });
  if (debounced !== key) return null;
  if (q.isError)
    return (
      <div role="status" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
        Não foi possível verificar possíveis duplicados.{" "}
        <Button type="button" variant="ghost" size="sm" onClick={() => q.refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  if (!q.data?.length) return null;
  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="Possível cadastro duplicado"
      className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"
    >
      <div className="flex items-center gap-2 font-semibold text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Possível cadastro duplicado
      </div>
      <ul className="mt-2 space-y-2">
        {q.data.map((match) => (
          <li key={match.id}>
            <Link
              to="/candidatos/$id"
              params={{ id: match.id }}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              {match.full_name}
            </Link>
            <p className="text-muted-foreground">
              Cadastro anterior:{" "}
              {new Date(match.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} · Dados
              compatíveis: {match.reasons.join(", ")}
            </p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
