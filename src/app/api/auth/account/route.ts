import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { db, auth } from "@/lib/firebase/admin";
import { COOKIE_NAME, COOKIE_OPTS } from "@/lib/auth/jwt";

/**
 * DELETE /api/auth/account — permanently delete the authenticated user's
 * account and all associated Firestore data, then clear the session cookie.
 */
export const DELETE = WithContext(async ({ user }) => {
  const uid = user.uid;

  // Delete Firestore subcollections under profiles/{uid}
  const subcollections = ["sessions", "memories", "files"];
  for (const sub of subcollections) {
    await deleteCollection(`profiles/${uid}/${sub}`);
  }

  // Delete top-level documents in parallel
  await Promise.allSettled([
    db.collection("profiles").doc(uid).delete(),
    db.collection("patients").doc(uid).delete(),
    db.collection("usage").doc(uid).delete(),
  ]);

  // Delete the Firebase Auth account (admin SDK — no re-auth needed)
  await auth.deleteUser(uid).catch(() => {
    /* ignore if already deleted */
  });

  // Clear the session cookie
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { ...COOKIE_OPTS, maxAge: 0 });
  return res;
});

/** Recursively delete all documents in a collection (batched). */
async function deleteCollection(path: string): Promise<void> {
  const col = db.collection(path);
  const snap = await col.limit(500).get();
  if (snap.empty) return;

  // For sessions, also delete nested messages subcollection
  if (path.endsWith("/sessions")) {
    for (const doc of snap.docs) {
      await deleteCollection(`${path}/${doc.id}/messages`);
    }
  }

  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  // Recurse if there may be more documents
  if (snap.size === 500) {
    await deleteCollection(path);
  }
}
