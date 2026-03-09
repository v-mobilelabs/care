import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { rtdb } from "@/lib/firebase/admin";
import type { NotificationType } from "@/lib/notifications/types";

export interface SendBulkNotificationsInput {
  /** List of target UIDs. */
  uids: string[];
  title: string;
  message: string;
  type: NotificationType;
  /** Optional deep-link path. */
  link?: string;
}

export interface SendBulkNotificationsResult {
  /** Number of notifications successfully sent. */
  sent: number;
}

/**
 * Push the same notification to multiple users in a single multi-path update.
 *
 * Usage:
 * ```ts
 * const uc = new SendBulkNotificationsUseCase();
 * await uc.execute({ uids: [uid1, uid2], title: "...", message: "...", type: "info" });
 * ```
 */
export class SendBulkNotificationsUseCase extends UseCase<
  SendBulkNotificationsInput,
  SendBulkNotificationsResult
> {
  protected async run(
    input: SendBulkNotificationsInput,
  ): Promise<SendBulkNotificationsResult> {
    const { uids, title, message, type, link } = input;

    if (uids.length === 0) return { sent: 0 };

    const now = Date.now();
    const payload = {
      title,
      message,
      type,
      read: false,
      createdAt: now,
      ...(link ? { link } : {}),
    };

    // Use a multi-path update for atomicity & efficiency.
    const updates: Record<string, unknown> = {};
    for (const uid of uids) {
      const key = rtdb.ref(`notifications/${uid}`).push().key;
      updates[`notifications/${uid}/${key}`] = payload;
    }

    await rtdb.ref().update(updates);

    return { sent: uids.length };
  }
}
