"use client";
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/ui/providers/auth-provider";
import { useNotifications } from "@/lib/notifications/use-notifications";
import type { AppNotification } from "@/lib/notifications/types";
import { showNotification } from "@mantine/notifications";
import { showBrowserNotification } from "@/lib/notifications/browser-notifications";

interface NotificationContextValue {
    /** All loaded notifications (newest first). */
    notifications: AppNotification[];
    /** Whether the initial load is in progress. */
    loading: boolean;
    /** Number of unread notifications. */
    unreadCount: number;
    /** Mark a single notification as read. */
    markAsRead: (id: string) => Promise<void>;
    /** Mark all loaded notifications as read. */
    markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
    notifications: [],
    loading: false,
    unreadCount: 0,
    markAsRead: async () => { },
    markAllAsRead: async () => { },
});

export function useNotificationCenter() {
    return useContext(NotificationContext);
}

export function NotificationProvider({
    children,
}: Readonly<{ children: ReactNode }>) {
    const { user } = useAuth();
    const router = useRouter();

    const {
        notifications,
        loading,
        unreadCount,
        markAsRead,
        markAllAsRead,
    } = useNotifications(user?.uid);

    // Track IDs we've already shown a toast for so we only toast truly new ones.
    const shownIdsRef = useRef<Set<string>>(new Set());
    const initialLoadDone = useRef(false);

    useEffect(() => {
        // Seed known IDs on initial load so we don't toast old notifications.
        if (loading) return;

        if (!initialLoadDone.current) {
            initialLoadDone.current = true;
            for (const n of notifications) {
                shownIdsRef.current.add(n.id);
            }
            return;
        }

        // After initial load, any ID we haven't seen is new → toast it.
        for (const n of notifications) {
            if (!shownIdsRef.current.has(n.id)) {
                shownIdsRef.current.add(n.id);
                showNotification({
                    title: n.title,
                    message: n.message,
                    onClick: () => {
                        markAsRead(n.id).catch(() => { });
                        if (n.link) router.push(n.link);
                    },
                });

                // Also fire a browser notification when the tab is backgrounded
                showBrowserNotification(n.title, {
                    body: n.message,
                    tag: "notif-" + n.id,
                    onClick: () => {
                        markAsRead(n.id).catch(() => { });
                        if (n.link) router.push(n.link);
                    },
                });
            }
        }
    }, [notifications, loading, markAsRead, router]);

    // Reset when user changes (e.g. sign out → sign in).
    useEffect(() => {
        shownIdsRef.current = new Set();
        initialLoadDone.current = false;
    }, [user?.uid]);

    const value = useMemo(
        () => ({
            notifications,
            loading,
            unreadCount,
            markAsRead,
            markAllAsRead,
        }),
        [notifications, loading, unreadCount, markAsRead, markAllAsRead],
    );

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}
