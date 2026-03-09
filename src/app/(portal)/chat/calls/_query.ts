"use client";
import { useQuery } from "@tanstack/react-query";
import type { CallRequestDto } from "@/data/meet";

export const callHistoryKeys = {
  list: () => ["meet", "history"] as const,
};

export function useCallHistory() {
  return useQuery<CallRequestDto[]>({
    queryKey: callHistoryKeys.list(),
    queryFn: async () => {
      const res = await fetch("/api/meet/history");
      if (!res.ok) throw new Error("Failed to load call history");
      return res.json() as Promise<CallRequestDto[]>;
    },
    staleTime: 60_000,
  });
}
