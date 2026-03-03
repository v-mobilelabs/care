import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { scopedCol } from "@/data/shared/repositories/scoped-col";
import {
  toDietPlanDto,
  type DietPlanDocument,
  type DietPlanDto,
} from "../models/diet-plan.model";

// ── Path helpers ─────────────────────────────────────────────────────────────

const dietPlansCol = (userId: string, dependentId?: string) =>
  scopedCol(userId, "diet-plans", dependentId);

// ── Repository ────────────────────────────────────────────────────────────────

function stripUndefined(doc: DietPlanDocument): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(doc).filter(([, v]) => v !== undefined),
  );
}

export const dietPlanRepository = {
  async create(
    userId: string,
    data: Omit<DietPlanDocument, "userId" | "createdAt">,
    dependentId?: string,
  ): Promise<DietPlanDto> {
    const now = Timestamp.now();
    const doc: DietPlanDocument = { userId, ...data, createdAt: now };
    const ref = dietPlansCol(userId, dependentId).doc();
    await ref.set(stripUndefined(doc));
    return toDietPlanDto(ref.id, doc);
  },

  async update(
    userId: string,
    planId: string,
    data: Partial<Omit<DietPlanDocument, "userId" | "createdAt">>,
    dependentId?: string,
  ): Promise<DietPlanDto> {
    const ref = dietPlansCol(userId, dependentId).doc(planId);
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    );
    await ref.update(cleanData);
    const snap = await ref.get();
    return toDietPlanDto(ref.id, snap.data() as DietPlanDocument);
  },

  async upsertBySession(
    userId: string,
    sessionId: string,
    data: Omit<DietPlanDocument, "userId" | "createdAt" | "sessionId">,
    dependentId?: string,
  ): Promise<DietPlanDto> {
    const existing = await dietPlansCol(userId, dependentId)
      .where("sessionId", "==", sessionId)
      .limit(1)
      .get();

    if (!existing.empty) {
      const existingDoc = existing.docs[0];
      if (!existingDoc)
        return this.create(userId, { ...data, sessionId }, dependentId);
      const docRef = existingDoc.ref;
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined),
      );
      await docRef.update(cleanData);
      const updated = await docRef.get();
      return toDietPlanDto(docRef.id, updated.data() as DietPlanDocument);
    }

    return this.create(userId, { ...data, sessionId }, dependentId);
  },

  async list(
    userId: string,
    limit: number,
    dependentId?: string,
  ): Promise<DietPlanDto[]> {
    const snap = await dietPlansCol(userId, dependentId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toDietPlanDto(d.id, d.data() as DietPlanDocument),
    );
  },

  async delete(
    userId: string,
    planId: string,
    dependentId?: string,
  ): Promise<void> {
    await dietPlansCol(userId, dependentId).doc(planId).delete();
  },
};
