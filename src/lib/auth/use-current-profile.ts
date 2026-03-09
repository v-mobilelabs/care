import { useQuery } from "@tanstack/react-query";

/**
 * Fetches the current user's full profile (merged patient/doctor data).
 * Assumes SSR hydration with queryKey ['current-profile'].
 */
export function useCurrentProfile() {
  return useQuery({
    queryKey: ["current-profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile/full");
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    staleTime: Infinity,
  });
}
