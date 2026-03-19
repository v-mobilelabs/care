import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import {
  UpdateDependentUseCase,
  DeleteDependentUseCase,
} from "@/data/dependents";

// PUT /api/dependents/[dependentId] — update a dependent profile
export const PUT = WithContext<{ dependentId: string }>(
  async ({ user, req }, { dependentId }) => {
    const body = (await req.json()) as unknown;
    const dependent = await new UpdateDependentUseCase().execute({
      ...(body as object),
      ownerId: user.uid,
      dependentId,
    });
    return NextResponse.json(dependent);
  },
);

// DELETE /api/dependents/[dependentId] — delete a dependent profile
export const DELETE = WithContext<{ dependentId: string }>(
  async ({ user }, { dependentId }) => {
    await new DeleteDependentUseCase().execute({
      ownerId: user.uid,
      dependentId,
    });
    return NextResponse.json({ ok: true });
  },
);
