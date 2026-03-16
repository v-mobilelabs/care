import { NextResponse, after } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { auth, bucket } from "@/lib/firebase/admin";
import { UpsertProfileUseCase } from "@/data/profile";

// POST /api/profile/avatar — upload a cropped avatar image
// Body: multipart/form-data with a single "file" field (image/jpeg)
export const POST = WithContext(async ({ user, req }) => {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof Blob)) {
    throw new ApiError(400, "BAD_REQUEST", "Missing or invalid 'file' field.");
  }

  if (!file.type.startsWith("image/")) {
    throw new ApiError(400, "BAD_REQUEST", "Only image files are accepted.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new ApiError(400, "BAD_REQUEST", "Image must be smaller than 5 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const fileRef = bucket.file(`avatars/${user.uid}/profile.jpg`);

  await fileRef.save(buffer, {
    contentType: "image/jpeg",
    public: true,
    resumable: false,
  });

  const photoURL = `${fileRef.publicUrl()}?t=${Date.now()}`;

  // Persist Firestore profile — response depends on this succeeding.
  await new UpsertProfileUseCase().execute(
    UpsertProfileUseCase.validate({ userId: user.uid, photoUrl: photoURL }),
  );

  // Sync to Firebase Auth after the response — only affects future token mints,
  // not the current session, so the caller doesn't need to wait.
  after(() => auth.updateUser(user.uid, { photoURL }).catch(console.error));

  return NextResponse.json({ photoURL });
});
