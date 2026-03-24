import {
  Timestamp,
  type Query,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { scopedCol } from "@/data/shared/repositories/scoped-col";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  toAssessmentDto,
  type AssessmentDocument,
  type AssessmentDto,
  type ListAssessmentsInput,
  type PaginatedAssessments,
} from "../models/assessment.model";

// ── Path helpers ──────────────────────────────────────────────────────────────

const assessmentsCol = (userId: string) => scopedCol(userId, "assessments");

const assessmentDoc = (userId: string, assessmentId: string) =>
  assessmentsCol(userId).doc(assessmentId);

// ── Repository ────────────────────────────────────────────────────────────────

export const assessmentRepository = {
  async create(
    userId: string,
    data: Omit<AssessmentDocument, "userId" | "createdAt">,
  ): Promise<AssessmentDto> {
    const now = Timestamp.now();
    const doc: AssessmentDocument = { userId, ...data, createdAt: now };
    const ref = assessmentsCol(userId).doc();
    await ref.set(stripUndefined(doc));
    return toAssessmentDto(ref.id, doc);
  },

  async findBySession(
    userId: string,
    sessionId: string,
  ): Promise<AssessmentDto | null> {
    const snap = await assessmentsCol(userId)
      .where("sessionId", "==", sessionId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const d = snap.docs[0]!;
    return toAssessmentDto(d.id, d.data() as AssessmentDocument);
  },

  async findBySessionAndRunId(
    userId: string,
    sessionId: string,
    runId: string,
  ): Promise<AssessmentDto | null> {
    const snap = await assessmentsCol(userId)
      .where("sessionId", "==", sessionId)
      .where("runId", "==", runId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const d = snap.docs[0]!;
    return toAssessmentDto(d.id, d.data() as AssessmentDocument);
  },

  async findLatestBySession(
    userId: string,
    sessionId: string,
  ): Promise<AssessmentDto | null> {
    // Avoid requiring a composite index for where(sessionId)+orderBy(createdAt)
    // by reading a small bounded set and sorting in memory.
    const snap = await assessmentsCol(userId)
      .where("sessionId", "==", sessionId)
      .limit(20)
      .get();
    if (snap.empty) return null;
    const latest = snap.docs
      .map((d) => toAssessmentDto(d.id, d.data() as AssessmentDocument))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];
    return latest ?? null;
  },

  async update(
    userId: string,
    assessmentId: string,
    data: Partial<
      Omit<
        AssessmentDocument,
        "userId" | "sessionId" | "createdAt" | "updatedAt"
      >
    >,
  ): Promise<AssessmentDto> {
    const now = Timestamp.now();
    const ref = assessmentDoc(userId, assessmentId);
    await ref.update(stripUndefined({ ...data, updatedAt: now }));
    const snap = await ref.get();
    return toAssessmentDto(snap.id, snap.data() as AssessmentDocument);
  },

  async findById(
    userId: string,
    assessmentId: string,
  ): Promise<AssessmentDto | null> {
    const snap = await assessmentDoc(userId, assessmentId).get();
    if (!snap.exists) return null;
    return toAssessmentDto(snap.id, snap.data() as AssessmentDocument);
  },

  async listPaginated(
    userId: string,
    opts: ListAssessmentsInput,
  ): Promise<PaginatedAssessments> {
    let query: Query = assessmentsCol(userId).orderBy("createdAt", "desc");

    if (opts.cursor) {
      query = query.startAfter(Timestamp.fromDate(new Date(opts.cursor)));
    }

    const hasClientFilters =
      !!opts.q || !!opts.status || !!opts.riskLevel || !!opts.agent;
    const fetchLimit = hasClientFilters ? (opts.limit + 1) * 3 : opts.limit + 1;
    const snap = await query.limit(fetchLimit).get();

    let assessments = snap.docs.map((d: QueryDocumentSnapshot) =>
      toAssessmentDto(d.id, d.data() as AssessmentDocument),
    );

    if (opts.status) {
      assessments = assessments.filter((a) => a.status === opts.status);
    }
    if (opts.riskLevel) {
      assessments = assessments.filter((a) => a.riskLevel === opts.riskLevel);
    }
    if (opts.agent) {
      const wanted = opts.agent.toLowerCase();
      assessments = assessments.filter(
        (a) => a.specialtyAgent?.toLowerCase() === wanted,
      );
    }
    if (opts.q) {
      const term = opts.q.toLowerCase();
      assessments = assessments.filter((a) => {
        const title = a.title.toLowerCase();
        const condition = a.condition?.toLowerCase() ?? "";
        const guideline = a.guideline?.toLowerCase() ?? "";
        const specialtyAgent = a.specialtyAgent?.toLowerCase() ?? "";
        return (
          title.includes(term) ||
          condition.includes(term) ||
          guideline.includes(term) ||
          specialtyAgent.includes(term)
        );
      });
    }

    const hasMore = assessments.length > opts.limit;
    const page = hasMore ? assessments.slice(0, opts.limit) : assessments;
    const nextCursor = hasMore
      ? (page[page.length - 1]?.createdAt ?? null)
      : null;

    let totalCount: number | undefined;
    if (!opts.cursor) {
      if (hasClientFilters) {
        const allSnap = await assessmentsCol(userId).get();
        const all = allSnap.docs.map((d: QueryDocumentSnapshot) =>
          toAssessmentDto(d.id, d.data() as AssessmentDocument),
        );
        totalCount = all.filter((a) => {
          const matchesStatus = opts.status ? a.status === opts.status : true;
          const matchesRisk = opts.riskLevel
            ? a.riskLevel === opts.riskLevel
            : true;
          const matchesAgent = opts.agent
            ? a.specialtyAgent?.toLowerCase() === opts.agent.toLowerCase()
            : true;
          const matchesQuery = opts.q
            ? [
                a.title,
                a.condition ?? "",
                a.guideline ?? "",
                a.specialtyAgent ?? "",
              ]
                .join(" ")
                .toLowerCase()
                .includes(opts.q.toLowerCase())
            : true;

          return matchesStatus && matchesRisk && matchesAgent && matchesQuery;
        }).length;
      } else {
        const countSnap = await assessmentsCol(userId).count().get();
        totalCount = countSnap.data().count;
      }
    }

    return {
      assessments: page,
      nextCursor,
      ...(typeof totalCount === "number" ? { totalCount } : {}),
    };
  },

  async delete(userId: string, assessmentId: string): Promise<void> {
    await assessmentDoc(userId, assessmentId).delete();
  },
};
