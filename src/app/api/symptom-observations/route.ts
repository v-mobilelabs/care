import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext } from "@/lib/api/with-context";
import {
  CreateSymptomObservationUseCase,
  ListSymptomObservationsUseCase,
} from "@/data/symptom-observations";
import { CacheTags } from "@/data/cached";

// GET /api/symptom-observations — list symptom timeline events for the authenticated user
export const GET = WithContext(async ({ user, req }) => {
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const conditionId = url.searchParams.get("conditionId") ?? undefined;
  const sortDir =
    (url.searchParams.get("sortDir") as "asc" | "desc" | null) ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const observations = await new ListSymptomObservationsUseCase().execute({
    userId: user.uid,
    ...(cursor ? { cursor } : {}),
    ...(conditionId ? { conditionId } : {}),
    ...(sortDir ? { sortDir } : {}),
    ...(limit ? { limit } : {}),
  });

  return NextResponse.json(observations);
});

// POST /api/symptom-observations — create a symptom timeline event
export const POST = WithContext(async ({ user, req }) => {
  const body = (await req.json()) as unknown;
  const observation = await new CreateSymptomObservationUseCase().execute({
    ...(body as object),
    userId: user.uid,
  });
  revalidateTag(CacheTags.symptomObservations(user.uid), "minutes");
  return NextResponse.json(observation, { status: 201 });
});
