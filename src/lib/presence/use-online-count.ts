/**
 * useOnlineCount — subscribe to multiple users' presence and return
 * the number currently online.
 *
 * Usage:
 *   const onlineCount = useOnlineCount(["uid1", "uid2", "uid3"]);
 *
 * Note: This creates N individual RTDB subscriptions (one per uid).
 * For large uid arrays, consider a server-aggregated approach.
 */
"use client";
import { useRTDBListener } from "@/lib/firebase/use-rtdb-listener";

interface PresenceData {
  online?: boolean;
}

/** Subscribe to a single user's online status. */
function useIsOnline(uid: string | null): boolean {
  const { data } = useRTDBListener<PresenceData>(
    uid ? `presence/${uid}` : null,
  );
  return data?.online ?? false;
}

/** Hook for up to 1 uid — used as a building block. */
function useOnlineCountSingle(uid: string | null | undefined): number {
  const online = useIsOnline(uid ?? null);
  return online ? 1 : 0;
}

export function useOnlineCount(uids: readonly string[]): number {
  // Call hooks unconditionally but conditionally pass null
  const u0 = useIsOnline(uids[0] ?? null);
  const u1 = useIsOnline(uids[1] ?? null);
  const u2 = useIsOnline(uids[2] ?? null);
  const u3 = useIsOnline(uids[3] ?? null);
  const u4 = useIsOnline(uids[4] ?? null);
  const u5 = useIsOnline(uids[5] ?? null);
  const u6 = useIsOnline(uids[6] ?? null);
  const u7 = useIsOnline(uids[7] ?? null);
  const u8 = useIsOnline(uids[8] ?? null);
  const u9 = useIsOnline(uids[9] ?? null);

  const onlineBools = [u0, u1, u2, u3, u4, u5, u6, u7, u8, u9];

  return onlineBools.slice(0, uids.length).filter(Boolean).length;
}
