import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { scopedCol } from "@/data/shared/repositories/scoped-col";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  toSymptomObservationDto,
  type SymptomObservationDocument,
  type SymptomObservationDto,
  type ListSymptomObservationsInput,
  type PaginatedSymptomObservations,
} from "../models/symptom-observation.model";

const symptomObservationsCol = (userId: string) =>
  scopedCol(userId, "symptom-observations");

export const symptomObservationRepository = {
  async create(
    userId: string,
    data: Omit<
      SymptomObservationDocument,
      "userId" | "symptomLower" | "recordedAt" | "createdAt" | "updatedAt"
    >,
  ): Promise<SymptomObservationDto> {
    if (data.idempotencyKey) {
      const existing = await symptomObservationsCol(userId)
        .where("idempotencyKey", "==", data.idempotencyKey)
        .limit(1)
        .get();

      if (!existing.empty) {
        const doc = existing.docs[0]!;
        return toSymptomObservationDto(
          doc.id,
          doc.data() as SymptomObservationDocument,
        );
      }
    }

    const now = Timestamp.now();
    const symptom = data.symptom.trim();
    const doc: SymptomObservationDocument = {
      userId,
      ...data,
      symptom,
      symptomLower: symptom.toLowerCase(),
      recordedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const ref = symptomObservationsCol(userId).doc();
    await ref.set(stripUndefined(doc));
    return toSymptomObservationDto(ref.id, doc);
  },

  async listPaginated(
    userId: string,
    opts: ListSymptomObservationsInput,
  ): Promise<PaginatedSymptomObservations> {
    const sortDir = opts.sortDir ?? "desc";
    let baseQuery = symptomObservationsCol(userId).orderBy(
      "observedAt",
      sortDir,
    );

    if (opts.conditionId) {
      baseQuery = baseQuery.where("conditionId", "==", opts.conditionId);
    }

    let query = baseQuery;

    if (opts.cursor) {
      query = query.startAfter(Timestamp.fromDate(new Date(opts.cursor)));
    }

    const snap = await query.limit(opts.limit + 1).get();
    const observations = snap.docs.map((d: QueryDocumentSnapshot) =>
      toSymptomObservationDto(d.id, d.data() as SymptomObservationDocument),
    );

    const hasMore = observations.length > opts.limit;
    const page = hasMore ? observations.slice(0, opts.limit) : observations;
    const nextCursor = hasMore
      ? (page[page.length - 1]?.observedAt ?? null)
      : null;

    let totalCount: number | undefined;
    if (!opts.cursor) {
      const countSnap = await baseQuery.count().get();
      totalCount = countSnap.data().count;
    }

    return { observations: page, nextCursor, totalCount };
  },

  async delete(userId: string, observationId: string): Promise<void> {
    await symptomObservationsCol(userId).doc(observationId).delete();
  },
};
