import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { LookupClinicUseCase } from "@/data/doctors";

export const maxDuration = 30;

/**
 * POST /api/doctors/lookup
 * Body: { name: string; specialty: string; address: string }
 *
 * Uses Gemini with Google Search grounding to find clinic/practice details
 * for the given doctor and return them as structured JSON.
 */
export const POST = WithContext(async ({ req, user }) => {
  const body = (await req.json()) as {
    name?: string;
    specialty?: string;
    address?: string;
  };

  const { name, specialty, address } = body;

  if (!name || !specialty || !address) {
    throw ApiError.badRequest("name, specialty, and address are required.");
  }

  const clinic = await new LookupClinicUseCase().execute({
    userId: user.uid,
    name,
    specialty,
    address,
  });

  if (!clinic) {
    throw new ApiError(
      502,
      "PARSE_ERROR",
      "AI did not return valid clinic data.",
    );
  }

  return NextResponse.json(clinic);
});
