import { Timestamp } from "firebase-admin/firestore";
import { FirebaseService } from "@/data/shared/service/firesbase.service";
import {
  DAILY_CREDITS,
  todayUTC,
  nextMidnightUTC,
  type CreditDocument,
  type CreditDto,
} from "../models/credit.model";

const db = FirebaseService.getInstance().getDb();

const creditDoc = (userId: string) => db.doc(`users/${userId}/credits/daily`);

// ── Repository ────────────────────────────────────────────────────────────────

export const creditRepository = {
  /**
   * Get the current credit balance, automatically resetting to
   * `DAILY_CREDITS` when the stored date doesn't match today (UTC).
   */
  async get(userId: string): Promise<CreditDto> {
    const ref = creditDoc(userId);
    const snap = await ref.get();
    const today = todayUTC();

    if (!snap.exists || snap.data()!.date !== today) {
      // First access of the day — initialise / reset.
      const doc: CreditDocument = {
        remaining: DAILY_CREDITS,
        date: today,
        updatedAt: Timestamp.now(),
      };
      await ref.set(doc);
      return {
        remaining: DAILY_CREDITS,
        total: DAILY_CREDITS,
        resetsAt: nextMidnightUTC(),
      };
    }

    const data = snap.data() as CreditDocument;
    return {
      remaining: data.remaining,
      total: DAILY_CREDITS,
      resetsAt: nextMidnightUTC(),
    };
  },

  /**
   * Atomically consume one credit.
   * Returns `{ ok: true, remaining }` on success or `{ ok: false, remaining: 0 }` if exhausted.
   */
  async consume(userId: string): Promise<{ ok: boolean; remaining: number }> {
    const ref = creditDoc(userId);
    const today = todayUTC();

    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const existing = snap.exists ? (snap.data() as CreditDocument) : null;

      // Reset if new day or no record yet.
      const remaining =
        !existing || existing.date !== today
          ? DAILY_CREDITS
          : existing.remaining;

      if (remaining <= 0) {
        return { ok: false, remaining: 0 };
      }

      const newRemaining = remaining - 1;
      tx.set(ref, {
        remaining: newRemaining,
        date: today,
        updatedAt: Timestamp.now(),
      } satisfies CreditDocument);

      return { ok: true, remaining: newRemaining };
    });
  },
};
