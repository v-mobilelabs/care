/**
 * In-app notification types.
 *
 * RTDB paths:
 *   /notifications/{uid}/{notificationId}  — per-user notification
 *
 * Notifications are created server-side (Admin SDK).
 * Users can only read their own notifications and update the `read` field.
 */

/** Notification type determines the icon and color used in the UI. */
export type NotificationType = "info" | "success" | "warning" | "danger";

/** Stored at /notifications/{uid}/{pushId} */
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: number;
  /** Optional deep-link path (e.g. "/chat/prescriptions"). */
  link?: string;
}
