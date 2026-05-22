import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/documentos")({
  head: () => ({ meta: [{ title: "Documentos — FlowRH" }] }),
  component: () => (
    <ComingSoon
      icon={FileText}
      title="Central de Documentos"
      description="Upload drag-and-drop, categorização, status com badges e visualização segura via links assinados."
    />
  ),
});