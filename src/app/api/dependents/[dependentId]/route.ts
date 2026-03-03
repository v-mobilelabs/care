import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { dependentRepository } from "@/data/dependents";
import { UpdateDependentSchema } from "@/data/dependents";

// PUT /api/dependents/[dependentId] — update a dependent profile
export const PUT = WithContext<{ dependentId: string }>(
  async ({ user, req }, { dependentId }) => {
    const body = (await req.json()) as unknown;
    const input = UpdateDependentSchema.parse({
      ...(body as object),
      ownerId: user.uid,
      dependentId,
    });
    const dependent = await dependentRepository.update(input);
    return NextResponse.json(dependent);
  },
);

// DELETE /api/dependents/[dependentId] — delete a dependent profile
export const DELETE = WithContext<{ dependentId: string }>(
  async ({ user }, { dependentId }) => {
    const existing = await dependentRepository.findById(user.uid, dependentId);
    if (!existing) throw ApiError.notFound("Dependent not found.");
    await dependentRepository.delete(user.uid, dependentId);
    return NextResponse.json({ ok: true });
  },
);
