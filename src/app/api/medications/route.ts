import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import {
  CreateMedicationUseCase,
  ListMedicationsUseCase,
} from "@/data/medications";

// GET /api/medications — list all medications for the authenticated user
export const GET = WithContext(async ({ user, dependentId }) => {
  const medications = await new ListMedicationsUseCase(dependentId).execute({
    userId: user.uid,
  });
  return NextResponse.json(medications);
});

// POST /api/medications — add a new medication
export const POST = WithContext(async ({ user, req, dependentId }) => {
  const body = (await req.json()) as unknown;
  const medication = await new CreateMedicationUseCase(dependentId).execute({
    ...(body as object),
    userId: user.uid,
  });
  return NextResponse.json(medication, { status: 201 });
});
