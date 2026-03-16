"use client";

/**
 * Browser Notification API utilities.
 *
 * Used as a lightweight "background-tab" alert layer:
 * - New DM messages when the messaging drawer is closed
 * - Incoming call requests for doctors
 * - Generic in-app notifications
 *
 * Only fires when `document.hidden` (tab not focused) and permission is granted.
 */

/** Whether the browser supports the Notification API. */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Current permission state, or "unsupported" if API is missing. */
export function getNotificationPermission():
  | NotificationPermission
  | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Request notification permission from the user.
 * Returns the resulting permission state.
 * Safe to call multiple times — browsers no-op if already granted/denied.
 */
export async function requestNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (!isNotificationSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";

  const result = await Notification.requestPermission();
  return result;
}

/**
 * Show a browser notification if the tab is hidden and permission is granted.
 *
 * @param title  - Notification title
 * @param options - Standard NotificationOptions + `onClick` callback
 * @returns The Notification instance, or null if not shown
 */
export function showBrowserNotification(
  title: string,
  options: NotificationOptions & {
    /** Called when the user clicks the notification. */
    onClick?: () => void;
    /** Tag for deduplication — same tag replaces the previous notification. */
    tag?: string;
  } = {},
): Notification | null {
  if (!isNotificationSupported()) return null;
  if (Notification.permission !== "granted") return null;
  if (!document.hidden) return null;

  const { onClick, ...notifOptions } = options;

  const notification = new Notification(title, {
    icon: "/icons/icon-192x192.png",
    ...notifOptions,
  });

  if (onClick) {
    notification.onclick = () => {
      window.focus();
      notification.close();
      onClick();
    };
  }

  return notification;
}
