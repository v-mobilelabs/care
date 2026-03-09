import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { rtdb } from "@/lib/firebase/admin";
import type { NotificationType } from "@/lib/notifications/types";

export interface SendNotificationInput {
  /** Target user's UID. */
  uid: string;
  title: string;
  message: string;
  type: NotificationType;
  /** Optional deep-link path (e.g. "/chat/prescriptions"). */
  link?: string;
}

export interface SendNotificationResult {
  /** The generated notification ID (RTDB push key). */
  notificationId: string;
}

/**
 * Push a new in-app notification to a user's RTDB node.
 *
 * Usage (from API routes / server actions):
 * ```ts
 * const uc = new SendNotificationUseCase();
 * await uc.execute({ uid, title: "Hello", message: "...", type: "info" });
 * ```
 */
export class SendNotificationUseCase extends UseCase<
  SendNotificationInput,
  SendNotificationResult
> {
  protected async run(
    input: SendNotificationInput,
  ): Promise<SendNotificationResult> {
    const { uid, title, message, type, link } = input;

    const notifRef = rtdb.ref(`notifications/${uid}`).push();

    await notifRef.set({
      title,
      message,
      type,
      read: false,
      createdAt: Date.now(),
      ...(link ? { link } : {}),
    });

    return { notificationId: notifRef.key! };
  }
}
