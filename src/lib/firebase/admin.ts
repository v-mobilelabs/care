// Firebase Admin SDK — server-only. Never import in client components.
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]!;

  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!privateKey) throw new Error("FIREBASE_PRIVATE_KEY env var is not set");

  // Accept either the server-only var or the public var as fallback.
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ??
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      // Env var stores \n as a literal backslash-n — convert back to newlines.
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
    storageBucket,
  });
}

/** Firebase Admin Auth instance (singleton, Node.js only). */
export const auth = getAuth(getAdminApp());

/** Firebase Admin Firestore instance (singleton, Node.js only). */
export const db = getFirestore(getAdminApp());

/** Firebase Admin Storage bucket (singleton, Node.js only). */
export const storage = getStorage(getAdminApp());
