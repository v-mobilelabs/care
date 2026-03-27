import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { CreateArtifactShareUseCase } from "@/data/artifacts";

/**
 * POST /api/artifacts/share
 * Share an artifact (assessment, summary, prescription, lab report) with a doctor
 */
export const POST = WithContext(async ({ user, req }) => {
  const body = (await req.json()) as unknown;
  const share = await new CreateArtifactShareUseCase().execute({
    ...(body as object),
    profileId: user.uid,
  });
  return NextResponse.json(share, { status: 201 });
});
