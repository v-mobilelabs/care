import { Timestamp } from "firebase-admin/firestore";
import { scopedCol } from "@/data/shared/repositories/scoped-col";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  toArtifactShareDto,
  type ArtifactShareDocument,
  type ArtifactShareDto,
} from "../models/artifact-share.model";

// ── Collection helpers ────────────────────────────────────────────────────────

const artifactSharesCol = (profileId: string) =>
  scopedCol(profileId, "artifact-shares");

const artifactShareDoc = (profileId: string, shareId: string) =>
  artifactSharesCol(profileId).doc(shareId);

// ── Repository ────────────────────────────────────────────────────────────────

export const artifactShareRepository = {
  async create(
    profileId: string,
    data: Omit<ArtifactShareDocument, "profileId" | "createdAt">,
  ): Promise<ArtifactShareDto> {
    const now = Timestamp.now();
    const doc: ArtifactShareDocument = { profileId, ...data, createdAt: now };
    const ref = artifactSharesCol(profileId).doc();
    await ref.set(stripUndefined(doc));
    return toArtifactShareDto(ref.id, doc);
  },

  async findById(
    profileId: string,
    shareId: string,
  ): Promise<ArtifactShareDto | null> {
    const snap = await artifactShareDoc(profileId, shareId).get();
    if (!snap.exists) return null;
    return toArtifactShareDto(snap.id, snap.data() as ArtifactShareDocument);
  },

  async listByProfile(
    profileId: string,
    limit = 50,
  ): Promise<ArtifactShareDto[]> {
    const snap = await artifactSharesCol(profileId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) =>
      toArtifactShareDto(d.id, d.data() as ArtifactShareDocument),
    );
  },

  async updateStatus(
    profileId: string,
    shareId: string,
    status: "pending" | "accepted" | "declined",
  ): Promise<void> {
    await artifactShareDoc(profileId, shareId).update({ shareStatus: status });
  },

  async delete(profileId: string, shareId: string): Promise<void> {
    await artifactShareDoc(profileId, shareId).delete();
  },
};
