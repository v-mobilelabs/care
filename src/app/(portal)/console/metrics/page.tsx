import { Suspense } from "react";
import { getServerUser } from "@/lib/api/server-prefetch";
import { getCachedMetricsAggregated } from "@/data/cached";
import { getQueryClient } from "@/lib/query/client";
import { Hydrate } from "@/ui/hydrate";
import { MetricsContent } from "./_content";
import { metricsKeys } from "./_query";
import MetricsLoading from "./loading";

export const metadata = { title: "Admin Metrics" };

function getDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const endDate = end.toISOString().split("T")[0] ?? "";
  const startDate = start.toISOString().split("T")[0] ?? "";

  return { startDate, endDate };
}

async function MetricsData({ profileId }: Readonly<{ profileId: string }>) {
  const queryClient = getQueryClient();
  const { startDate, endDate } = getDateRange();

  await queryClient.prefetchQuery({
    queryKey: metricsKeys.aggregated(profileId, startDate, endDate),
    queryFn: () => getCachedMetricsAggregated(profileId, startDate, endDate),
  });

  return (
    <Hydrate client={queryClient}>
      <MetricsContent
        profileId={profileId}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />
    </Hydrate>
  );
}

export default async function MetricsPage() {
  const user = await getServerUser();
  if (!user) return null;

  return (
    <Suspense fallback={<MetricsLoading />}>
      <MetricsData profileId={user.uid} />
    </Suspense>
  );
}
