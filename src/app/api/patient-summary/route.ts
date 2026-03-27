import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ApiError, WithContext } from "@/lib/api/with-context";
import {
  CreatePatientSummaryUseCase,
  GetPatientSummaryUseCase,
  PatchPatientSummaryUseCase,
  PatientSummaryNotFoundError,
  PatientSummaryVersionConflictError,
} from "@/data/patient-summary";
import { CacheTags } from "@/data/cached";

// GET /api/patient-summary — fetch the singleton living summary for the user
export const GET = WithContext(async ({ user }) => {
  const summary = await new GetPatientSummaryUseCase().execute({
    userId: user.uid,
  });
  return NextResponse.json(summary);
});

// PATCH /api/patient-summary — patch the singleton with optimistic concurrency
export const PATCH = WithContext(async ({ user, req }) => {
  const body = (await req.json()) as unknown;

  try {
    const summary = await new PatchPatientSummaryUseCase().execute({
      ...(body as object),
      userId: user.uid,
    });
    revalidateTag(CacheTags.patientSummaries(user.uid), "minutes");
    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof PatientSummaryNotFoundError) {
      throw ApiError.notFound("Patient summary not found.");
    }
    if (error instanceof PatientSummaryVersionConflictError) {
      throw ApiError.conflict(
        `Summary version conflict. Current version is ${error.currentVersion}.`,
      );
    }
    throw error;
  }
});

// POST /api/patient-summary — upsert singleton summary (compatibility path)
export const POST = WithContext(async ({ user, req }) => {
  const body = (await req.json()) as unknown;
  const summary = await new CreatePatientSummaryUseCase().execute({
    ...(body as object),
    userId: user.uid,
  });
  revalidateTag(CacheTags.patientSummaries(user.uid), "minutes");
  return NextResponse.json(summary, { status: 201 });
});
