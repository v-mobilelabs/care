import { NextResponse } from "next/server";
import { z } from "zod";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { GetFileUseCase } from "@/data/sessions";
import {
  ExtractPrescriptionUseCase,
  ListPrescriptionsUseCase,
} from "@/data/prescriptions";

// GET /api/prescriptions — list all prescription records for the current user
export const GET = WithContext(async ({ user, dependentId }) => {
  const prescriptions = await new ListPrescriptionsUseCase(dependentId).execute(
    {
      userId: user.uid,
    },
  );
  return NextResponse.json(prescriptions);
});

const PostBodySchema = z.object({
  fileId: z.string().min(1),
});

// POST /api/prescriptions — extract & create prescription from an already-uploaded file
export const POST = WithContext(async ({ user, profileId, req }) => {
  const body = await req.json().catch(() => null);
  if (!body) throw ApiError.badRequest("Expected JSON body with fileId.");

  const parsed = PostBodySchema.safeParse(body);
  if (!parsed.success) throw ApiError.badRequest("fileId is required.");
  const { fileId } = parsed.data;

  // Verify the file exists and belongs to the caller
  const file = await new GetFileUseCase().execute({
    userId: user.uid,
    profileId,
    fileId,
  });
  if (!file) throw ApiError.notFound("File not found.");

  const prescription = await new ExtractPrescriptionUseCase().execute({
    userId: user.uid,
    profileId,
    fileId,
  });

  return NextResponse.json(prescription, { status: 201 });
});
