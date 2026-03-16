"use client";
import { useCallback, useMemo } from "react";
import { ref, update } from "firebase/database";
import { getClientDatabase } from "@/lib/firebase/client";
import { useRTDBListener } from "@/lib/firebase/use-rtdb-listener";
import type { AppNotification } from "./types";

function parseNotifications(
  data: Record<string, unknown> | null,
): AppNotification[] {
  if (!data) return [];

  return Object.entries(data)
    .map(([key, val]) => {
      const v = val as Record<string, unknown>;
      return {
        id: key,
        title: (v.title as string) ?? "",
        message: (v.message as string) ?? "",
        type: (v.type as AppNotification["type"]) ?? "info",
        read: (v.read as boolean) ?? false,
        createdAt: (v.createdAt as number) ?? 0,
        link: (v.link as string) ?? undefined,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt); // Newest first
}

/**
 * Subscribe to the current user's notifications with infinite-scroll support.
 *
 * - Loads notifications with pagination (20 per page)
 * - Real-time updates via RTDB listener
 * - Exposes `loadMore()` to fetch older pages
 */
export function useNotifications(uid?: string) {
  const path = uid ? `notifications/${uid}` : null;

  const {
    data,
    loading,
    loadingMore,
    hasMore,
    loadMore: loadMoreFn,
  } = useRTDBListener<Record<string, unknown>>(path, {
    pageSize: 5,
    orderBy: { type: "key" },
    orderDirection: "desc", // Newest first
  });

  const notifications = useMemo(() => parseNotifications(data), [data]);
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  // ── Mark single notification as read ─────────────────────────────────────
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!uid) return;
      const db = getClientDatabase();
      await update(ref(db, `notifications/${uid}/${notificationId}`), {
        read: true,
      });
    },
    [uid],
  );

  // ── Mark all loaded notifications as read ────────────────────────────────
  const markAllAsRead = useCallback(async () => {
    if (!uid) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    const db = getClientDatabase();
    const updates: Record<string, boolean> = {};
    for (const n of unread) {
      updates[`notifications/${uid}/${n.id}/read`] = true;
    }
    await update(ref(db), updates);
  }, [uid, notifications]);

  const loadMore = useCallback(async () => {
    if (loadMoreFn) {
      loadMoreFn();
    }
  }, [loadMoreFn]);

  if (!uid) {
    return {
      notifications: [] as AppNotification[],
      loading: false,
      hasMore: false,
      loadingMore: false,
      unreadCount: 0,
      loadMore: async () => {},
      markAsRead: async () => {},
      markAllAsRead: async () => {},
    };
  }

  return {
    notifications,
    loading,
    hasMore,
    loadingMore,
    unreadCount,
    loadMore,
    markAsRead,
    markAllAsRead,
  };
}
