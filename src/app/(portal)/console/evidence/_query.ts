import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetch";
import type { EvidenceDto } from "@/data/evidence";

export interface EvidenceEntry {
  messageId: string;
  evidence: EvidenceDto;
}

export const evidenceKeys = {
  all: () => ["evidence"] as const,
  bySession: (profileId: string, sessionId: string, messageId: string) =>
    [...evidenceKeys.all(), { profileId, sessionId, messageId }] as const,
};

export function useEvidenceQuery(
  profileId: string,
  sessionId: string,
  messageId: string,
) {
  return useQuery<EvidenceEntry[]>({
    queryKey: evidenceKeys.bySession(profileId, sessionId, messageId),
    queryFn: () => {
      const profile = encodeURIComponent(profileId);
      const session = encodeURIComponent(sessionId);
      const message = encodeURIComponent(messageId);
      const hasMessageId = messageId.trim().length > 0;
      const url = hasMessageId
        ? `/api/evidence?profileId=${profile}&sessionId=${session}&messageId=${message}`
        : `/api/evidence?profileId=${profile}&sessionId=${session}`;
      return apiFetch<EvidenceEntry[]>(url);
    },
    enabled: profileId.trim().length > 0 && sessionId.trim().length > 0,
    staleTime: 60_000,
  });
}
