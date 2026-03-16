import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { GetFileUseCase, DeleteFileUseCase } from "@/data/sessions";
import { prescriptionRepository } from "@/data/prescriptions";
import { ragIndexer } from "@/data/shared/service";

// GET /api/prescriptions/[fileId] — refresh signed URL
export const GET = WithContext<{ fileId: string }>(
  async ({ user, profileId }, { fileId }) => {
    const file = await new GetFileUseCase().execute({
      userId: user.uid,
      profileId,
      fileId,
    });
    if (!file) throw ApiError.notFound("Prescription not found.");
    return NextResponse.json(file);
  },
);

// DELETE /api/prescriptions/[fileId]
export const DELETE = WithContext<{ fileId: string }>(
  async ({ user, profileId, dependentId }, { fileId }) => {
    // Delete from files collection
    await new DeleteFileUseCase().execute({
      userId: user.uid,
      profileId,
      fileId,
    });

    // Cascade: delete from prescriptions collection + RAG index
    const prescription = await prescriptionRepository.findByFileId(
      user.uid,
      fileId,
      dependentId,
    );
    if (prescription) {
      await Promise.all([
        prescriptionRepository.delete(user.uid, prescription.id, dependentId),
        ragIndexer.removeDocument(user.uid, profileId, prescription.id),
      ]);
    }

    return NextResponse.json({ ok: true });
  },
);
