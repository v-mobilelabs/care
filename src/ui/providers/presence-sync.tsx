/**
 * PresenceSync — rendered once inside AuthProvider.
 *
 * Reads the user and their kind directly from AuthContext (already resolved
 * server-side via /api/auth/firebase-token), then delegates to `usePresence`
 * to maintain the RTDB /presence/{uid} node for the session lifetime.
 *
 * Renders nothing — purely a side-effect component.
 */
"use client";
import { useAuth } from "@/ui/providers/auth-provider";
import { usePresence } from "@/lib/presence/use-presence";

export function PresenceSync() {
    const { user, kind } = useAuth();

    // Manage the RTDB presence node — both uid and kind must be resolved first.
    usePresence(user?.uid ?? null, kind);

    return null;
}
