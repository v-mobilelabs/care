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
import { ApiError } from "@/lib/api/with-context";

const conditionsCol = (userId: string, dependentId?: string) =>
  scopedCol(dependentId ?? userId, "conditions");

export const conditionRepository = {
  async existsByName(
    userId: string,
    name: string,
    dependentId?: string,
  ): Promise<boolean> {
    const snap = await conditionsCol(userId, dependentId)
      .where("nameLower", "==", name.toLowerCase())
      .limit(1)
      .get();
    return !snap.empty;
  },

  async create(
    userId: string,
    data: Omit<ConditionDocument, "userId" | "createdAt">,
    dependentId?: string,
  ): Promise<ConditionDto> {
    const isDuplicate = await conditionRepository.existsByName(
      userId,
      data.name,
      dependentId,
    );
    if (isDuplicate) {
      throw ApiError.conflict(
        `Condition "${data.name}" already exists for this profile.`,
      );
    }
    const now = Timestamp.now();
    const doc: ConditionDocument = {
      userId,
      ...data,
      nameLower: data.name.toLowerCase(),
      createdAt: now,
    };
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
