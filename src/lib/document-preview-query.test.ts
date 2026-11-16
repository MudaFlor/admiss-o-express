import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { documentPreviewQuery } from "./document-preview-query";

describe("document preview renewal", () => {
  it("requests a fresh URL when opening again after the five-minute link lifetime", async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    const getLink = vi.fn().mockResolvedValueOnce({ url: "first-link" }).mockResolvedValueOnce({ url: "renewed-link" });
    try {
      const options = documentPreviewQuery("document-a", getLink);
      expect(await client.fetchQuery(options)).toEqual({ url: "first-link" });
      await vi.advanceTimersByTimeAsync(6 * 60 * 1000);
      expect(await client.fetchQuery(options)).toEqual({ url: "renewed-link" });
      expect(getLink).toHaveBeenCalledTimes(2);
    } finally {
      client.clear();
      vi.useRealTimers();
    }
  });

  it("keeps different documents separate", async () => {
    const client = new QueryClient();
    try {
      await client.fetchQuery(documentPreviewQuery("a", async () => ({ url: "a-link" })));
      expect(await client.fetchQuery(documentPreviewQuery("b", async () => ({ url: "b-link" })))).toEqual({ url: "b-link" });
    } finally {
      client.clear();
    }
  });
});