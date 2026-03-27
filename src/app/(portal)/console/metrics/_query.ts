import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetch";
import type { DailyKpiDocument } from "@/data/encounters";

export const metricsKeys = {
  all: () => ["metrics"] as const,
  aggregated: (profileId: string, startDate: string, endDate: string) =>
    [...metricsKeys.all(), { profileId, startDate, endDate }] as const,
};

export function useMetricsQuery(
  profileId: string,
  startDate: string,
  endDate: string,
) {
  return useQuery<DailyKpiDocument[]>({
    queryKey: metricsKeys.aggregated(profileId, startDate, endDate),
    queryFn: () =>
      apiFetch<DailyKpiDocument[]>(
        `/api/metrics?profileId=${encodeURIComponent(profileId)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
      ),
    staleTime: 5 * 60 * 1000,
    enabled:
      profileId.trim().length > 0 &&
      startDate.trim().length > 0 &&
      endDate.trim().length > 0,
  });
}
