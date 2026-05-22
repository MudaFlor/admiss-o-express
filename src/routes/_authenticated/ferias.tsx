import { createFileRoute } from "@tanstack/react-router";
import { Palmtree } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/ferias")({
  head: () => ({ meta: [{ title: "Férias — FlowRH" }] }),
  component: () => (
    <ComingSoon
      icon={Palmtree}
      title="Controle de Férias"
      description="Solicitar, aprovar, calendário mensal, saldo, histórico e alertas inteligentes de conflito."
    />
  ),
});