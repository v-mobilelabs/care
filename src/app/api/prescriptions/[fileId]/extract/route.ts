import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { ExtractPrescriptionUseCase } from "@/data/prescriptions";

// Re-export types so existing client code that imports from this path keeps working
export type { ExtractedMedication, ExtractResult } from "@/data/prescriptions";

// ── POST /api/prescriptions/[fileId]/extract ───────────────────────────────────────

// CreditsExhaustedError propagates to WithContext → standard 402 response.
export const POST = WithContext<{ fileId: string }>(
  async ({ user, profileId }, { fileId }) => {
    const prescription = await new ExtractPrescriptionUseCase().execute({
      userId: user.uid,
      profileId,
      fileId,
    });

    return NextResponse.json(prescription);
  },
);
