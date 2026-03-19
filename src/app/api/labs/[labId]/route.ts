import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { GetLabUseCase, DeleteLabUseCase } from "@/data/labs";

// GET /api/labs/[labId] — get a single lab result
export const GET = WithContext<{ labId: string }>(
  async ({ user, dependentId }, { labId }) => {
    const lab = await new GetLabUseCase(dependentId).execute({
      userId: user.uid,
      labId,
    });
    if (!lab) throw ApiError.notFound("Lab not found.");
    return NextResponse.json(lab);
  },
);

// DELETE /api/labs/[labId] — delete a lab result
export const DELETE = WithContext<{ labId: string }>(
  async ({ user, dependentId }, { labId }) => {
    await new DeleteLabUseCase(dependentId).execute({
      userId: user.uid,
      labId,
    });
    return NextResponse.json({ ok: true });
  },
);
