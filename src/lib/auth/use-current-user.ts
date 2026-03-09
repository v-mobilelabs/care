import { useQuery } from "@tanstack/react-query";

/**
 * Fetches the current authenticated user (basic identity).
 * Assumes SSR hydration with queryKey ['current-user'].
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await fetch("/api/profile/me");
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    staleTime: Infinity,
  });
}
