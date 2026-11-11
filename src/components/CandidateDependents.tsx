import { Download, ExternalLink, FileText } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { buildDependentRecord, type DependentDocument, type DependentIdentity } from "@/lib/dependent-record";

const DOCUMENT_LABELS: Record<string, string> = {
  dependente_certidao: "Certidão de nascimento",
  dependente_rg_cpf: "RG / CPF",
  dependente_vacinacao: "Cartão de vacinação",
  dependente_escolar: "Comprovante de matrícula escolar",
};

export function CandidateDependents({ dependents, documents, formData, openDocument }: {
  dependents: DependentIdentity[];
  documents: DependentDocument[];
  formData: unknown;
  openDocument: (documentId: string, download: boolean) => Promise<void>;
}) {
  if (!dependents.length) return <p className="py-4 text-sm text-muted-foreground">Nenhum dependente cadastrado.</p>;
  return (
    <Accordion type="multiple" className="space-y-3">
      {dependents.map(dep => {
        const ficha = buildDependentRecord(dep, documents, formData);
        const fields = [
          ["Nome completo", ficha.fullName], ["Data de nascimento", ficha.birthDate], ["CPF", ficha.cpf],
          ["Nº do nativivo (DNV)", ficha.liveBirthNumber], ["Matrícula", ficha.registration],
          ["Livro", ficha.book], ["Página", ficha.page],
        ];
        return (
          <AccordionItem key={dep.id} value={dep.id} className="rounded-md border px-4">
            <AccordionTrigger aria-label={`Expandir dados de ${ficha.fullName}`} className="gap-3 hover:no-underline">
              <span className="min-w-0 break-words">
                <span className="block font-semibold">{ficha.fullName}</span>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">{dep.relationship || "Dependente"} · {ficha.documents.length} documento(s)</span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
                {fields.map(([label, value]) => <div key={label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
                </div>)}
              </dl>
              <h3 className="mb-2 mt-5 text-sm font-semibold">Documentos anexados</h3>
              {!ficha.documents.length ? <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p> : (
                <ul className="divide-y">
                  {ficha.documents.map(doc => <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm"><FileText className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="break-words">{doc.label || DOCUMENT_LABELS[doc.type] || "Documento"}</span></span>
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="outline" onClick={() => void openDocument(doc.id, false)}><ExternalLink className="h-3.5 w-3.5" />Abrir</Button>
                      <Button size="sm" variant="ghost" onClick={() => void openDocument(doc.id, true)} aria-label={`Baixar ${DOCUMENT_LABELS[doc.type] || "documento"} de ${ficha.fullName}`} title="Baixar documento"><Download className="h-4 w-4" /></Button>
                    </div>
                  </li>)}
                </ul>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}