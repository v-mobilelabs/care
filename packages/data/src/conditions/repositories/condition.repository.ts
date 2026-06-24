import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { scopedCol } from "@/data/shared/repositories/scoped-col";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  toConditionDto,
  type ConditionDocument,
  type ConditionDto,
} from "../models/condition.model";

const conditionsCol = (userId: string) => scopedCol(userId, "conditions");

export const conditionRepository = {
  async create(
    userId: string,
    data: Omit<ConditionDocument, "userId" | "createdAt" | "updatedAt">,
  ): Promise<ConditionDto> {
    const ref = conditionsCol(userId).doc();
    const now = Timestamp.now();
    const clean = { ...data, userId, createdAt: now, updatedAt: now };
    await ref.set(stripUndefined(clean));
    return toConditionDto(ref.id, clean);
  },

  async list(userId: string, limit: number): Promise<ConditionDto[]> {
    const snap = await conditionsCol(userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toConditionDto(d.id, d.data() as ConditionDocument),
    );
  },

  async delete(userId: string, conditionId: string): Promise<void> {
    await conditionsCol(userId).doc(conditionId).delete();
  },
};
