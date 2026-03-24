import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { GetFileUseCase, DeleteFileUseCase } from "@/data/files";
import { DeletePrescriptionUseCase } from "@/data/prescriptions";
import { prescriptionRepository } from "@/data/prescriptions/repositories/prescription.repository";
import { ragService } from "@/data/shared/service/rag/rag.service";

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
// The param doubles as a prescriptionId for delete operations.
export const DELETE = WithContext<{ fileId: string }>(
  async ({ user, profileId }, { fileId: prescriptionId }) => {
    // Look up the prescription to find its backing file (if any)
    const prescription = await prescriptionRepository.findById(
      user.uid,
      prescriptionId,
    );
    if (!prescription) throw ApiError.notFound("Prescription not found.");

    // If there's a backing file, delete it
    if (prescription.fileId) {
      await new DeleteFileUseCase()
        .execute({ userId: user.uid, profileId, fileId: prescription.fileId })
        .catch(() => {
          /* file may already be gone */
        });
    }

    // Delete prescription doc + remove from RAG index
    await Promise.all([
      new DeletePrescriptionUseCase().execute({
        userId: user.uid,
        prescriptionId,
      }),
      ragService
        .removeDocument({
          userId: user.uid,
          profileId,
          sourceId: prescriptionId,
        })
        .catch(() => {
          /* RAG entry may not exist */
        }),
    ]);

    return NextResponse.json({ ok: true });
  },
);

// PATCH /api/prescriptions/[fileId] — link a chat session ID
export const PATCH = WithContext<{ fileId: string }>(
  async ({ user, req }, { fileId }) => {
    const body = (await req.json().catch(() => ({}))) as { sessionId?: string };
    if (!body.sessionId) throw ApiError.badRequest("sessionId is required.");
    const updated = await prescriptionRepository.patchSessionId(
      user.uid,
      fileId,
      body.sessionId,
    );
    return NextResponse.json(updated);
  },
);
