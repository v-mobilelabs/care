"use client";

/**
 * NotificationPermissionSync — rendered once inside AuthProvider.
 *
 * Requests browser notification permission shortly after the user signs in.
 * Uses a delay to avoid showing the permission prompt immediately on page load,
 * which browsers penalize.
 */
import { useEffect, useRef } from "react";
import { useAuth } from "@/ui/providers/auth-provider";
import {
    getNotificationPermission,
    requestNotificationPermission,
} from "@/lib/notifications/browser-notifications";

const PROMPT_DELAY_MS = 10_000; // Wait 10s after auth before prompting

export function NotificationPermissionSync() {
    const { user } = useAuth();
    const promptedRef = useRef(false);

    useEffect(() => {
        if (!user || promptedRef.current) return;

        const permission = getNotificationPermission();

        // Already granted or denied — nothing to do
        if (permission === "granted" || permission === "denied" || permission === "unsupported") {
            return;
        }

        // "default" — prompt after a delay so the user has settled into the app
        const timer = setTimeout(() => {
            promptedRef.current = true;
            requestNotificationPermission().catch(() => {
                // User dismissed or browser blocked — nothing we can do
            });
        }, PROMPT_DELAY_MS);

        return () => clearTimeout(timer);
    }, [user]);

    return null;
}
