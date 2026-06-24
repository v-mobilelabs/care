import { Usage } from "../models/usage.model";
import { db } from "@/lib/firebase/admin";

const COLLECTION = "usage";

export class UsageRepository {
  async getUsage(profile: string): Promise<Usage | null> {
    const doc = await db.collection(COLLECTION).doc(profile).get();
    if (!doc.exists) return null;
    return doc.data() as Usage;
  }

  async setUsage(profile: string, usage: Usage): Promise<void> {
    await db.collection(COLLECTION).doc(profile).set(usage, { merge: true });
  }

  async consumeCredit(args: {
    profile: string;
    currentMonth: string;
    defaults: Readonly<{ credits: number; minutes: number; storage: number }>;
  }): Promise<number> {
    const ref = db.collection(COLLECTION).doc(args.profile);

    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const existing = snap.exists ? (snap.data() as Usage) : null;
      const isCurrentMonth = existing?.lastReset === args.currentMonth;

      const base: Usage =
        isCurrentMonth && existing
          ? existing
          : {
              profile: args.profile,
              credits: args.defaults.credits,
              minutes: args.defaults.minutes,
              storage: args.defaults.storage,
              lastReset: args.currentMonth,
            };

      if (base.credits <= 0) {
        tx.set(ref, { ...base, credits: 0 }, { merge: true });
        return -1;
      }

      const remaining = base.credits - 1;
      tx.set(ref, { ...base, credits: remaining }, { merge: true });
      return remaining;
    });
  }
}
