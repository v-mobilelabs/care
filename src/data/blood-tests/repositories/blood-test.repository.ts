import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { scopedCol } from "@/data/shared/repositories/scoped-col";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  toBloodTestDto,
  type BloodTestDocument,
  type BloodTestDto,
} from "../models/blood-test.model";

// ── Collection helpers ────────────────────────────────────────────────────────

const bloodTestsCol = (userId: string, dependentId?: string) =>
  scopedCol(dependentId ?? userId, "blood-tests");

const bloodTestDoc = (
  userId: string,
  bloodTestId: string,
  dependentId?: string,
) => bloodTestsCol(userId, dependentId).doc(bloodTestId);

// ── Repository ────────────────────────────────────────────────────────────────

export const bloodTestRepository = {
  async create(
    userId: string,
    data: Omit<BloodTestDocument, "userId" | "createdAt">,
    dependentId?: string,
  ): Promise<BloodTestDto> {
    const now = Timestamp.now();
    const doc: BloodTestDocument = { userId, ...data, createdAt: now };
    const ref = bloodTestsCol(userId, dependentId).doc();
    await ref.set(stripUndefined(doc));
    return toBloodTestDto(ref.id, doc);
  },

  async findByFileId(
    userId: string,
    fileId: string,
    dependentId?: string,
  ): Promise<BloodTestDto | null> {
    const snap = await bloodTestsCol(userId, dependentId)
      .where("fileId", "==", fileId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const d = snap.docs[0]!;
    return toBloodTestDto(d.id, d.data() as BloodTestDocument);
  },

  async update(
    userId: string,
    bloodTestId: string,
    data: Omit<BloodTestDocument, "userId" | "fileId" | "createdAt">,
    dependentId?: string,
  ): Promise<BloodTestDto> {
    const now = Timestamp.now();
    const ref = bloodTestDoc(userId, bloodTestId, dependentId);
    await ref.update({ ...data, updatedAt: now });
    const snap = await ref.get();
    return toBloodTestDto(snap.id, snap.data() as BloodTestDocument);
  },

  async findById(
    userId: string,
    bloodTestId: string,
    dependentId?: string,
  ): Promise<BloodTestDto | null> {
    const snap = await bloodTestDoc(userId, bloodTestId, dependentId).get();
    if (!snap.exists) return null;
    return toBloodTestDto(snap.id, snap.data() as BloodTestDocument);
  },

  async list(
    userId: string,
    limit: number,
    dependentId?: string,
  ): Promise<BloodTestDto[]> {
    const snap = await bloodTestsCol(userId, dependentId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toBloodTestDto(d.id, d.data() as BloodTestDocument),
    );
  },

  async delete(
    userId: string,
    bloodTestId: string,
    dependentId?: string,
  ): Promise<void> {
    await bloodTestDoc(userId, bloodTestId, dependentId).delete();
  },
};
