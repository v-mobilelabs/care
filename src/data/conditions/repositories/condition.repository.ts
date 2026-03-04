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

const conditionsCol = (userId: string, dependentId?: string) =>
  scopedCol(userId, "conditions", dependentId);

export const conditionRepository = {
  async create(
    userId: string,
    data: Omit<ConditionDocument, "userId" | "createdAt">,
    dependentId?: string,
  ): Promise<ConditionDto> {
    const now = Timestamp.now();
    const doc: ConditionDocument = { userId, ...data, createdAt: now };
    const ref = conditionsCol(userId, dependentId).doc();
    await ref.set(stripUndefined(doc));
    return toConditionDto(ref.id, doc);
  },

  async list(
    userId: string,
    limit: number,
    dependentId?: string,
  ): Promise<ConditionDto[]> {
    const snap = await conditionsCol(userId, dependentId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toConditionDto(d.id, d.data() as ConditionDocument),
    );
  },

  async delete(
    userId: string,
    conditionId: string,
    dependentId?: string,
  ): Promise<void> {
    await conditionsCol(userId, dependentId).doc(conditionId).delete();
  },
};
