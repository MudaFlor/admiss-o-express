import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDocumentLinkRH } from "@/lib/candidates.functions";
import { documentPreviewQuery } from "@/lib/document-preview-query";
import { Button } from "@/components/ui/button";
import { RotateCcw, RotateCw } from "lucide-react";

export function CandidateDocumentPreview({ documentId, isPdf }: { documentId: string; isPdf: boolean }) {
  const [show, setShow] = useState(!isPdf);
  const [imageFailed, setImageFailed] = useState(false);
  const [rotation, setRotation] = useState(0);
  const getLink = useServerFn(getDocumentLinkRH);
  const query = useQuery({
    ...documentPreviewQuery(documentId, () => getLink({ data: { document_id: documentId, download: false } })),
    enabled: show,
  });

  if (!show) {
    return <Button size="sm" variant="outline" onClick={() => setShow(true)}>Visualizar PDF aqui</Button>;
  }
  if (query.isFetching) {
    return <p role="status" className="text-sm text-muted-foreground">Carregando documento…</p>;
  }
  if (query.isError || imageFailed || !query.data?.url) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p role="alert" className="text-sm text-muted-foreground">Não foi possível carregar o documento.</p>
        <Button size="sm" variant="outline" onClick={() => { setImageFailed(false); void query.refetch(); }}>Tentar novamente</Button>
      </div>
    );
  }
  if (!isPdf) {
    return (
      <div className="w-full space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            aria-label="Girar imagem no sentido anti-horário"
            onClick={() => setRotation((current) => (current + 270) % 360)}
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Anti-horário
          </Button>
          <Button
            size="sm"
            variant="outline"
            aria-label="Girar imagem no sentido horário"
            onClick={() => setRotation((current) => (current + 90) % 360)}
          >
            <RotateCw className="mr-1.5 h-4 w-4" />
            Horário
          </Button>
          <span className="text-xs text-muted-foreground" aria-live="polite">{rotation}°</span>
        </div>
        <div className="flex max-h-[600px] min-h-40 items-center justify-center overflow-auto rounded-md border bg-muted/20 p-4">
          <img
            src={query.data.url}
            alt="Documento"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="max-h-[540px] w-auto max-w-full rounded-md object-contain transition-transform duration-200"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        </div>
      </div>
    );
  }
  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setShow(false)}>Ocultar PDF</Button>
        <Button size="sm" variant="ghost" onClick={() => { void query.refetch(); }}>Recarregar PDF</Button>
      </div>
      <iframe src={query.data.url} title="Documento PDF" className="h-[600px] w-full rounded-md border bg-background" />
    </div>
  );
}