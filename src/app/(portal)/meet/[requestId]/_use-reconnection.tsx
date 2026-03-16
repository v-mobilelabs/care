"use client";
/**
 * _use-reconnection.ts — Handles browser-level online/offline events during a call.
 *
 * Detects network loss at the OS level (faster than waiting for Chime's
 * WebSocket to time out) and triggers an automatic reconnect when the
 * browser comes back online.
 */
import { notifications } from "@mantine/notifications";
import { IconWifi, IconWifiOff } from "@tabler/icons-react";
import { useEffect } from "react";
import type { DefaultMeetingSession } from "amazon-chime-sdk-js";

const MAX_RECONNECT_ATTEMPTS = 5;

interface UseReconnectionParams {
    status: "initialising" | "ready" | "error";
    sessionRef: React.MutableRefObject<DefaultMeetingSession | null>;
    /** Proxy for "teardown was called" — set true by useCallLifecycle.teardown(). */
    stoppedByUsRef: React.MutableRefObject<boolean>;
    reconnectAttemptsRef: React.MutableRefObject<number>;
    isReconnectingRef: React.MutableRefObject<boolean>;
    setConnectionHealth: (health: "good" | "poor" | "reconnecting") => void;
    setRetryCount: React.Dispatch<React.SetStateAction<number>>;
}

/**
 * Listens to window online/offline events.
 * - offline → shows a persistent notification and marks health as "reconnecting"
 * - online  → if session still alive, restores "good"; if dead, kicks a retry
 */
export function useReconnection({
    status,
    sessionRef,
    stoppedByUsRef,
    reconnectAttemptsRef,
    isReconnectingRef,
    setConnectionHealth,
    setRetryCount,
}: UseReconnectionParams): void {
    useEffect(() => {
        if (status !== "ready" && !isReconnectingRef.current) return;

        const handleOffline = () => {
            if (stoppedByUsRef.current) return;
            setConnectionHealth("reconnecting");
            notifications.show({
                title: "Network disconnected",
                message: "Waiting for your connection to resume…",
                color: "orange",
                icon: <IconWifiOff size={18} />,
                autoClose: false,
                id: "network-offline",
            });
        };

        const handleOnline = () => {
            notifications.hide("network-offline");
            if (sessionRef.current) {
                // Session is still alive — just clear the warning
                setConnectionHealth("good");
                notifications.show({
                    title: "Back online",
                    message: "Your network connection has been restored.",
                    color: "teal",
                    icon: <IconWifi size={18} />,
                    autoClose: 3000,
                });
            } else if (!stoppedByUsRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                // Session is dead but we haven't given up — kick a reconnect
                reconnectAttemptsRef.current += 1;
                isReconnectingRef.current = true;
                setConnectionHealth("reconnecting");
                setRetryCount((c) => c + 1);
            }
        };

        window.addEventListener("offline", handleOffline);
        window.addEventListener("online", handleOnline);
        return () => {
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("online", handleOnline);
        };
    }, [status, sessionRef, stoppedByUsRef, reconnectAttemptsRef, isReconnectingRef, setConnectionHealth, setRetryCount]);
}
