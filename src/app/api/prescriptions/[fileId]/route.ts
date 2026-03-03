import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { GetFileUseCase, DeleteFileUseCase } from "@/data/sessions";
import { getPrescriptionSessionId } from "../route";

// GET /api/prescriptions/[fileId] — refresh signed URL
export const GET = WithContext<{ fileId: string }>(
  async ({ user, dependentId }, { fileId }) => {
    const input = GetFileUseCase.validate({
      userId: user.uid,
      sessionId: getPrescriptionSessionId(dependentId),
      fileId,
    });
    const file = await new GetFileUseCase().execute(input);
    if (!file) throw ApiError.notFound("Prescription not found.");
    return NextResponse.json(file);
  },
);

// DELETE /api/prescriptions/[fileId]
export const DELETE = WithContext<{ fileId: string }>(
  async ({ user, dependentId }, { fileId }) => {
    const input = DeleteFileUseCase.validate({
      userId: user.uid,
      sessionId: getPrescriptionSessionId(dependentId),
      fileId,
    });
    await new DeleteFileUseCase().execute(input);
    return NextResponse.json({ ok: true });
  },
);
