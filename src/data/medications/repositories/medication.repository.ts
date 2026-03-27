import {
  Timestamp,
  type Query,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { scopedCol } from "@/data/shared/repositories/scoped-col";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  toMedicationDto,
  type MedicationDocument,
  type MedicationDto,
  type MedicationSortDir,
  type MedicationStatus,
  type PaginatedMedications,
} from "../models/medication.model";

const medicationsCol = (userId: string) => scopedCol(userId, "medications");

function buildBaseQuery(
  userId: string,
  status: MedicationStatus | undefined,
  sortDir: MedicationSortDir,
): Query {
  let query: Query = medicationsCol(userId);
  if (status) query = query.where("status", "==", status);
  return query.orderBy("createdAt", sortDir);
}

export const medicationRepository = {
  async create(
    userId: string,
    data: Omit<MedicationDocument, "userId" | "createdAt" | "updatedAt">,
  ): Promise<MedicationDto> {
    const ref = medicationsCol(userId).doc();
    const now = Timestamp.now();
    const clean = { ...data, userId, createdAt: now, updatedAt: now };
    await ref.set(stripUndefined(clean));
    return toMedicationDto(ref.id, clean);
  },

  async list(userId: string, limit: number): Promise<MedicationDto[]> {
    const snap = await medicationsCol(userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toMedicationDto(d.id, d.data() as MedicationDocument),
    );
  },

  async listPaginated(params: {
    userId: string;
    limit: number;
    cursor?: string;
    status?: MedicationStatus;
    q?: string;
    sortDir: MedicationSortDir;
  }): Promise<PaginatedMedications> {
    const { userId, limit, cursor, status, q, sortDir } = params;
    const normalizedSearch = q?.trim().toLowerCase();

    const baseQuery = buildBaseQuery(userId, status, sortDir);

    if (normalizedSearch) {
      const allSnap = await baseQuery.get();
      let allMedications = allSnap.docs.map((d: QueryDocumentSnapshot) =>
        toMedicationDto(d.id, d.data() as MedicationDocument),
      );

      allMedications = allMedications.filter((medication) =>
        medication.name.toLowerCase().includes(normalizedSearch),
      );

      if (cursor) {
        const cursorMs = new Date(cursor).getTime();
        allMedications = allMedications.filter((medication) => {
          const createdAtMs = new Date(medication.createdAt).getTime();
          if (sortDir === "desc") return createdAtMs < cursorMs;
          return createdAtMs > cursorMs;
        });
      }

      const page = allMedications.slice(0, limit + 1);
      const hasMore = page.length > limit;
      const medications = hasMore ? page.slice(0, limit) : page;
      const nextCursor =
        hasMore && medications.length > 0
          ? (medications[medications.length - 1]?.createdAt ?? null)
          : null;

      return {
        medications,
        nextCursor,
      };
    }

    let totalCount: number | undefined;
    if (cursor === undefined) {
      totalCount = (await baseQuery.count().get()).data().count;
    }

    let pageQuery: Query = baseQuery;
    if (cursor) {
      pageQuery = pageQuery.startAfter(Timestamp.fromDate(new Date(cursor)));
    }

    const snap = await pageQuery.limit(limit + 1).get();
    const docs = snap.docs;
    const hasMore = docs.length > limit;
    const selectedDocs = hasMore ? docs.slice(0, limit) : docs;
    const medications = selectedDocs.map((d: QueryDocumentSnapshot) =>
      toMedicationDto(d.id, d.data() as MedicationDocument),
    );

    const nextCursor =
      hasMore && medications.length > 0
        ? (medications[medications.length - 1]?.createdAt ?? null)
        : null;

    if (totalCount === undefined) {
      return {
        medications,
        nextCursor,
      };
    }

    return {
      medications,
      nextCursor,
      totalCount,
    };
  },

  async update(
    userId: string,
    medicationId: string,
    data: Partial<
      Omit<MedicationDocument, "userId" | "createdAt" | "updatedAt">
    >,
  ): Promise<MedicationDto> {
    const ref = medicationsCol(userId).doc(medicationId);
    const now = Timestamp.now();
    const clean = Object.fromEntries(
      Object.entries({ ...data, updatedAt: now }).filter(
        ([, v]) => v !== undefined,
      ),
    );
    await ref.update(clean);
    const snap = await ref.get();
    return toMedicationDto(snap.id, snap.data() as MedicationDocument);
  },

  async delete(userId: string, medicationId: string): Promise<void> {
    await medicationsCol(userId).doc(medicationId).delete();
  },
};
