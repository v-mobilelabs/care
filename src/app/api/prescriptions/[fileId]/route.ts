import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { GetFileUseCase, DeleteFileUseCase } from "@/data/sessions";
import { DeletePrescriptionByFileUseCase } from "@/data/prescriptions";
import { prescriptionRepository } from "@/data/prescriptions/repositories/prescription.repository";

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
    await new DeletePrescriptionByFileUseCase(dependentId).execute({
      userId: user.uid,
      profileId,
      fileId,
    });

    return NextResponse.json({ ok: true });
  },
);

// PATCH /api/prescriptions/[fileId] — link a chat session ID
export const PATCH = WithContext<{ fileId: string }>(
  async ({ user, dependentId, req }, { fileId }) => {
    const body = (await req.json().catch(() => ({}))) as { sessionId?: string };
    if (!body.sessionId)
      throw ApiError.badRequest("sessionId is required.");
    const updated = await prescriptionRepository.patchSessionId(
      user.uid,
      fileId,
      body.sessionId,
      dependentId,
    );
    return NextResponse.json(updated);
  },
);
