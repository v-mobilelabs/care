import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { GetFileUseCase } from "@/data/files";
import {
  runPrescriptionDeleteGraph,
  runPrescriptionPatchSessionGraph,
} from "@/workflow/prescription-api-flow.workflow";

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
    return NextResponse.json(
      await runPrescriptionDeleteGraph({
        userId: user.uid,
        profileId,
        prescriptionId,
      }),
    );
  },
);

// PATCH /api/prescriptions/[fileId] — link a chat session ID
export const PATCH = WithContext<{ fileId: string }>(
  async ({ user, req }, { fileId }) => {
    const updated = await runPrescriptionPatchSessionGraph({
      userId: user.uid,
      prescriptionId: fileId,
      req,
    });
    return NextResponse.json(updated);
  },
);
