import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { auth } from "@/lib/firebase/admin";
import { FirebaseService } from "@/data/shared/service/firesbase.service";

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
  const bucket = FirebaseService.getInstance().getBucket();
  const fileRef = bucket.file(`avatars/${user.uid}/profile.jpg`);

  await fileRef.save(buffer, {
    contentType: "image/jpeg",
    public: true,
    resumable: false,
  });

  const photoURL = fileRef.publicUrl();

  // Persist on the Firebase Auth user record so client SDK reflects the change
  await auth.updateUser(user.uid, { photoURL });

  return NextResponse.json({ photoURL });
});
