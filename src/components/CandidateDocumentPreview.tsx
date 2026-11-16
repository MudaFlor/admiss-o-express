import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDocumentLinkRH } from "@/lib/candidates.functions";
import { documentPreviewQuery } from "@/lib/document-preview-query";
import { Button } from "@/components/ui/button";

export function CandidateDocumentPreview({ documentId, isPdf }: { documentId: string; isPdf: boolean }) {
  const [show, setShow] = useState(!isPdf);
  const [imageFailed, setImageFailed] = useState(false);
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
    return <img src={query.data.url} alt="Documento" decoding="async" onError={() => setImageFailed(true)} className="max-h-[600px] w-auto rounded-md object-contain" />;
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