import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { GetLabUseCase, DeleteLabUseCase } from "@/data/labs";

// GET /api/labs/[labId] — get a single lab result
export const GET = WithContext<{ labId: string }>(
  async ({ user, dependentId }, { labId }) => {
    const input = GetLabUseCase.validate({ userId: user.uid, labId });
    const lab = await new GetLabUseCase(dependentId).execute(input);
    if (!lab) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(lab);
  },
);

// DELETE /api/labs/[labId] — delete a lab result
export const DELETE = WithContext<{ labId: string }>(
  async ({ user, dependentId }, { labId }) => {
    const input = DeleteLabUseCase.validate({ userId: user.uid, labId });
    await new DeleteLabUseCase(dependentId).execute(input);
    return new NextResponse(null, { status: 204 });
  },
);
