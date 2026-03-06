import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import {
  CreateCallRequestUseCase,
  CancelCallUseCase,
  meetRepository,
} from "@/data/meet";
import { GetDoctorProfileUseCase } from "@/data/doctors";
// GET /api/meet/call — get active call for patient
export const GET = WithContext(async ({ user }) => {
  const active = await meetRepository.getActiveForPatient(user.uid);
  return NextResponse.json(active ?? null);
});

// POST /api/meet/call — patient initiates a call
export const POST = WithContext(async ({ user, req }) => {
  const body = (await req.json().catch(() => ({}))) as { doctorId?: string };
  if (!body.doctorId) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "doctorId is required" } },
      { status: 400 },
    );
  }

  // Verify doctor exists and is online (available in Firestore)
  const doctorProfile = await new GetDoctorProfileUseCase().execute({
    uid: body.doctorId,
  });

  if (!doctorProfile || doctorProfile.availability !== "available") {
    return NextResponse.json(
      {
        error: {
          code: "UNAVAILABLE",
          message: "Doctor is not available right now.",
        },
      },
      { status: 409 },
    );
  }

  // Get patient name from profile
  const { db } = await import("@/lib/firebase/admin");
  const [profileSnap, doctorProfileSnap] = await Promise.all([
    db.collection("profiles").doc(user.uid).get(),
    db.collection("profiles").doc(body.doctorId).get(),
  ]);
  const profileData = profileSnap.data() as
    | { name?: string; photoUrl?: string }
    | undefined;
  const patientName = profileData?.name ?? "Patient";
  const patientPhotoUrl = profileData?.photoUrl ?? null;
  const doctorName =
    (doctorProfileSnap.data() as { name?: string } | undefined)?.name ??
    "Doctor";

  const request = await new CreateCallRequestUseCase().execute({
    patientId: user.uid,
    patientName,
    patientPhotoUrl,
    doctorId: body.doctorId,
    doctorName,
  });

  return NextResponse.json(request, { status: 201 });
});

// DELETE /api/meet/call?requestId=xxx — patient cancels
export const DELETE = WithContext(async ({ user, req }) => {
  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get("requestId");
  if (!requestId) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "requestId is required" } },
      { status: 400 },
    );
  }

  await new CancelCallUseCase().execute({
    requestId,
    patientId: user.uid,
  });

  return NextResponse.json({ ok: true });
});
