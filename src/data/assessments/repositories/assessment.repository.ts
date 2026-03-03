import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { scopedCol } from "@/data/shared/repositories/scoped-col";
import {
  toAssessmentDto,
  type AssessmentDocument,
  type AssessmentDto,
} from "../models/assessment.model";

// ── Path helpers ──────────────────────────────────────────────────────────────

const assessmentsCol = (userId: string, dependentId?: string) =>
  scopedCol(userId, "assessments", dependentId);

const assessmentDoc = (
  userId: string,
  assessmentId: string,
  dependentId?: string,
) => assessmentsCol(userId, dependentId).doc(assessmentId);

// ── Repository ────────────────────────────────────────────────────────────────

export const assessmentRepository = {
  async create(
    userId: string,
    data: Omit<AssessmentDocument, "userId" | "createdAt">,
    dependentId?: string,
  ): Promise<AssessmentDto> {
    const now = Timestamp.now();
    const doc: AssessmentDocument = { userId, ...data, createdAt: now };
    const ref = assessmentsCol(userId, dependentId).doc();
    await ref.set(doc);
    return toAssessmentDto(ref.id, doc);
  },

  async findBySession(
    userId: string,
    sessionId: string,
    dependentId?: string,
  ): Promise<AssessmentDto | null> {
    const snap = await assessmentsCol(userId, dependentId)
      .where("sessionId", "==", sessionId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const d = snap.docs[0]!;
    return toAssessmentDto(d.id, d.data() as AssessmentDocument);
  },

  async update(
    userId: string,
    assessmentId: string,
    data: Omit<
      AssessmentDocument,
      "userId" | "sessionId" | "createdAt" | "updatedAt"
    >,
    dependentId?: string,
  ): Promise<AssessmentDto> {
    const now = Timestamp.now();
    const ref = assessmentDoc(userId, assessmentId, dependentId);
    await ref.update({ ...data, updatedAt: now });
    const snap = await ref.get();
    return toAssessmentDto(snap.id, snap.data() as AssessmentDocument);
  },

  async findById(
    userId: string,
    assessmentId: string,
    dependentId?: string,
  ): Promise<AssessmentDto | null> {
    const snap = await assessmentDoc(userId, assessmentId, dependentId).get();
    if (!snap.exists) return null;
    return toAssessmentDto(snap.id, snap.data() as AssessmentDocument);
  },

  async list(
    userId: string,
    limit: number,
    dependentId?: string,
  ): Promise<AssessmentDto[]> {
    const snap = await assessmentsCol(userId, dependentId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toAssessmentDto(d.id, d.data() as AssessmentDocument),
    );
  },

  async delete(
    userId: string,
    assessmentId: string,
    dependentId?: string,
  ): Promise<void> {
    await assessmentDoc(userId, assessmentId, dependentId).delete();
  },
};
