import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { FirebaseService } from "@/data/shared/service/firesbase.service";
import { scopedCol } from "@/data/shared/repositories/scoped-col";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  toInsuranceDto,
  type InsuranceDocument,
  type InsuranceDto,
} from "../models/insurance.model";

const firebaseService = FirebaseService.getInstance();
const bucket = firebaseService.getBucket();

/** Signed URL expiry — 1 hour */
const SIGNED_URL_EXPIRY_MS = 60 * 60 * 1000;

const insuranceCol = (userId: string, dependentId?: string) =>
  scopedCol(userId, "insurance", dependentId);

/** GCS object path for an insurance document */
const storagePath = (
  userId: string,
  insuranceId: string,
  fileName: string,
  dependentId?: string,
) =>
  dependentId
    ? `users/${userId}/dependents/${dependentId}/insurance/${insuranceId}/${fileName}`
    : `users/${userId}/insurance/${insuranceId}/${fileName}`;

export const insuranceRepository = {
  async create(
    userId: string,
    dependentId: string | undefined,
    data: Omit<InsuranceDocument, "userId" | "createdAt" | "updatedAt">,
  ): Promise<InsuranceDto> {
    const ref = insuranceCol(userId, dependentId).doc();
    const now = Timestamp.now();
    const doc: InsuranceDocument = {
      ...data,
      userId,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(stripUndefined(doc));
    return toInsuranceDto(ref.id, doc);
  },

  async list(
    userId: string,
    limit: number,
    dependentId?: string,
  ): Promise<InsuranceDto[]> {
    const snap = await insuranceCol(userId, dependentId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toInsuranceDto(d.id, d.data() as InsuranceDocument),
    );
  },

  async update(
    userId: string,
    insuranceId: string,
    data: Partial<
      Omit<InsuranceDocument, "userId" | "createdAt" | "updatedAt">
    >,
    dependentId?: string,
  ): Promise<InsuranceDto> {
    const ref = insuranceCol(userId, dependentId).doc(insuranceId);
    const now = Timestamp.now();
    const clean = Object.fromEntries(
      Object.entries({ ...data, updatedAt: now }).filter(
        ([, v]) => v !== undefined,
      ),
    );
    await ref.update(clean);
    const snap = await ref.get();
    return toInsuranceDto(snap.id, snap.data() as InsuranceDocument);
  },

  async delete(
    userId: string,
    insuranceId: string,
    dependentId?: string,
  ): Promise<void> {
    // Fetch doc first to clean up any uploaded document in GCS
    const ref = insuranceCol(userId, dependentId).doc(insuranceId);
    const snap = await ref.get();
    if (snap.exists) {
      const doc = snap.data() as InsuranceDocument;
      if (doc.documentStoragePath) {
        await bucket
          .file(doc.documentStoragePath)
          .delete({ ignoreNotFound: true });
      }
    }
    await ref.delete();
  },

  /**
   * Upload an insurance card / document to GCS and update the Firestore record.
   * Returns the updated InsuranceDto with a fresh signed download URL.
   */
  async uploadDocument(
    userId: string,
    insuranceId: string,
    file: { name: string; mimeType: string; buffer: Buffer },
    dependentId?: string,
  ): Promise<InsuranceDto> {
    const gcsPath = storagePath(userId, insuranceId, file.name, dependentId);
    const gcsFile = bucket.file(gcsPath);

    await gcsFile.save(file.buffer, {
      contentType: file.mimeType,
      metadata: { cacheControl: "private, max-age=31536000" },
    });

    const [documentUrl] = await gcsFile.getSignedUrl({
      action: "read",
      expires: Date.now() + SIGNED_URL_EXPIRY_MS,
    });

    return this.update(
      userId,
      insuranceId,
      { documentStoragePath: gcsPath, documentUrl },
      dependentId,
    );
  },
};
