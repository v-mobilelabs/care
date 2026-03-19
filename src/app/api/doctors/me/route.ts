import { type NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { WithContext, ApiError } from "@/lib/api/with-context";
import {
  GetDoctorProfileUseCase,
  UpdateDoctorProfileUseCase,
  doctorProfileRepository,
} from "@/data/doctors";
import { UpsertProfileUseCase } from "@/data/profile";
import { auth } from "@/lib/firebase/admin";
import {
  COOKIE_NAME,
  COOKIE_OPTS,
  SESSION_DURATION_SECONDS,
  type UserKind,
} from "@/lib/auth/jwt";

/** Body schema for the one-shot doctor sign-up (no existing session needed). */
const DoctorSignupSchema = z.object({
  idToken: z.string().min(1, "idToken is required"),
  name: z.string().min(2, "Full name is required"),
  specialty: z.string().min(2, "Specialty is required"),
  licenseNumber: z.string().min(2, "License number is required"),
  phone: z.string().optional(),
  bio: z.string().optional(),
});

// GET /api/doctors/me — fetch the authenticated doctor's profile
export const GET = WithContext({ kind: "doctor" }, async ({ user }) => {
  const profile = await new GetDoctorProfileUseCase().execute({
    uid: user.uid,
  });
  if (!profile) throw ApiError.notFound("Doctor profile not found.");
  return NextResponse.json(profile);
});

// POST /api/doctors/me — one-shot sign-up: verify idToken, write profile, set session cookie.
// No existing session is required — the Firebase ID token in the request body acts as auth.
// This is the only endpoint doctors call during the sign-up form submission.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as unknown;
  const parsed = DoctorSignupSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: issues } },
      { status: 400 },
    );
  }

  const { idToken, name, specialty, licenseNumber, phone, bio } = parsed.data;

  // Verify the Firebase ID token — this is our auth mechanism for this endpoint.
  let uid: string;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or expired ID token.",
        },
      },
      { status: 401 },
    );
  }

  // Write kind:"doctor" + identity fields to profiles/{uid} and professional
  // fields to doctors/{uid} in parallel.
  await Promise.all([
    new UpsertProfileUseCase().execute(
      UpsertProfileUseCase.validate({
        userId: uid,
        kind: "doctor",
        name,
        phone,
      }),
    ),
    doctorProfileRepository.upsert({ uid, specialty, licenseNumber, bio }),
  ]);

  // Stamp kind:"doctor" as a custom claim — only affects future token refreshes,
  // not the session cookie being minted below. Defer it post-response.
  after(() =>
    auth
      .setCustomUserClaims(uid, { kind: "doctor" satisfies UserKind })
      .catch(console.error),
  );

  // Issue a fresh Firebase session cookie — the cookie now carries kind:"doctor"
  // so the proxy will route the user straight to the doctor portal.
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION_SECONDS * 1000,
  });

  const profile = await new GetDoctorProfileUseCase().execute({ uid });

  const res = NextResponse.json(profile);
  res.cookies.set(COOKIE_NAME, sessionCookie, COOKIE_OPTS);
  return res;
}

// PUT /api/doctors/me — update an authenticated doctor's professional fields.
// Identity fields (name, phone, photoUrl) are updated via PUT /api/profile.
export const PUT = WithContext({ kind: "doctor" }, async ({ user, req }) => {
  const body = await req.json();
  const profile = await new UpdateDoctorProfileUseCase().execute({
    ...(body as Record<string, unknown>),
    uid: user.uid,
  });
  return NextResponse.json(profile);
});
