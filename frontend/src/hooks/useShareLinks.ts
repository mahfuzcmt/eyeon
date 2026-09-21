import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { ShareLinkView, CreateShareLinkRequest } from "@/types/domain";

interface UseShareLinksReturn {
  links: ShareLinkView[];
  loading: boolean;
  error: string | null;
  fetchLinks: (deviceImei: string) => Promise<void>;
  createLink: (request: CreateShareLinkRequest) => Promise<ShareLinkView>;
  revokeLink: (linkId: string) => Promise<void>;
}

export function useShareLinks(): UseShareLinksReturn {
  const [links, setLinks] = useState<ShareLinkView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLinks = useCallback(async (deviceImei: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ShareLinkView[]>(`/share-links/device/${deviceImei}`);
      setLinks(res.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch share links";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createLink = useCallback(async (request: CreateShareLinkRequest): Promise<ShareLinkView> => {
    const res = await api.post<ShareLinkView>("/share-links", request);
    const newLink = res.data;
    setLinks(prev => [...prev, newLink]);
    return newLink;
  }, []);

  const revokeLink = useCallback(async (linkId: string) => {
    await api.delete(`/share-links/${linkId}`);
    setLinks(prev => prev.filter(l => l.id !== linkId));
  }, []);

  return {
    links,
    loading,
    error,
    fetchLinks,
    createLink,
    revokeLink,
  };
}
