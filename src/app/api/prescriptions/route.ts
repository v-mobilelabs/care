import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import {
  ListPrescriptionsUseCase,
} from "@/data/prescriptions";
import { runPrescriptionExtractFromRequestGraph } from "@/workflow/prescription-api-flow.workflow";

// GET /api/prescriptions — list all prescription records for the current user
export const GET = WithContext(async ({ user }) => {
  const prescriptions = await new ListPrescriptionsUseCase().execute({
    userId: user.uid,
  });
  return NextResponse.json(prescriptions);
});

// POST /api/prescriptions — extract & create prescription from an already-uploaded file
export const POST = WithContext(async ({ user, profileId, req }) => {
  const prescription = await runPrescriptionExtractFromRequestGraph({
    userId: user.uid,
    profileId,
    req,
  });

  return NextResponse.json(prescription, { status: 201 });
});
