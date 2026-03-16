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
}
