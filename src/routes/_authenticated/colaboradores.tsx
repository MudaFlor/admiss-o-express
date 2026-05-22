import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/colaboradores")({
  head: () => ({ meta: [{ title: "Colaboradores — FlowRH" }] }),
  component: () => (
    <ComingSoon
      icon={Users}
      title="Colaboradores"
      description="CRUD completo de colaboradores com tabela, filtros, drawer de detalhes e perfil individual com timeline profissional."
    />
  ),
});