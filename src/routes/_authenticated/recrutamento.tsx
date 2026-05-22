import { createFileRoute } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/recrutamento")({
  head: () => ({ meta: [{ title: "Recrutamento — FlowRH" }] }),
  component: () => (
    <ComingSoon
      icon={Briefcase}
      title="Recrutamento"
      description="Kanban estilo Monday.com com vagas, candidatos e drag-and-drop entre etapas."
    />
  ),
});