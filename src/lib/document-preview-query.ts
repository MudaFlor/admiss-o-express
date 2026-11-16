import { queryOptions } from "@tanstack/react-query";

// Preview URLs must be issued on demand, not reused from the candidate snapshot.
export function documentPreviewQuery(documentId: string, getLink: () => Promise<{ url: string }>) {
  return queryOptions({
    queryKey: ["document-preview", documentId],
    queryFn: getLink,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}