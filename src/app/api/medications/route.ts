import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext } from "@/lib/api/with-context";
import {
  CreateMedicationUseCase,
  ListMedicationsUseCase,
  ListMedicationsPaginatedUseCase,
} from "@/data/medications";
import { CacheTags } from "@/data/cached";

// GET /api/medications — list medications for the authenticated user.
// Returns paginated response when cursor/filter/sort/search params are provided,
// otherwise returns a flat array for existing consumers.
export const GET = WithContext(async ({ user, req }) => {
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  const status =
    (url.searchParams.get("status") as
      | "active"
      | "completed"
      | "discontinued"
      | "paused"
      | null) ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;
  const sortDir =
    (url.searchParams.get("sortDir") as "asc" | "desc" | null) ?? undefined;

  if (cursor || limit || status || q || sortDir) {
    const result = await new ListMedicationsPaginatedUseCase().execute({
      userId: user.uid,
      ...(cursor && { cursor }),
      ...(limit && { limit }),
      ...(status && { status }),
      ...(q && { q }),
      ...(sortDir && { sortDir }),
    });
    return NextResponse.json(result);
  }

  const medications = await new ListMedicationsUseCase().execute({
    userId: user.uid,
  });
  return NextResponse.json(medications);
});

// POST /api/medications — add a new medication
export const POST = WithContext(async ({ user, req }) => {
  const body = (await req.json()) as unknown;
  const medication = await new CreateMedicationUseCase().execute({
    ...(body as object),
    userId: user.uid,
  });
  revalidateTag(CacheTags.medications(user.uid), "minutes");
  revalidateTag(CacheTags.medicationMatchUser(user.uid), "minutes");
  return NextResponse.json(medication, { status: 201 });
});
