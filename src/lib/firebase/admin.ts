// Firebase Admin SDK — server-only. Never import in client components.
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getDatabase } from "firebase-admin/database";

const DEFAULT_FIREBASE_PROJECT_ID = "demo-local";
const DEFAULT_FIREBASE_DB_URL =
  "http://127.0.0.1:9000?ns=demo-local-default-rtdb";

function getResolvedProjectId(): string {
  const envProjectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    (process.env.FIREBASE_CONFIG
      ? (JSON.parse(process.env.FIREBASE_CONFIG) as { projectId?: string }).projectId
      : undefined);

  return envProjectId ?? DEFAULT_FIREBASE_PROJECT_ID;
}

function getResolvedStorageBucket(): string {
  return (
    process.env.FIREBASE_STORAGE_BUCKET ??
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    `${getResolvedProjectId()}.appspot.com`
  );
}

function getResolvedDatabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_REALTIME_DB_URL ?? DEFAULT_FIREBASE_DB_URL
  );
}

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const isFirestoreEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const isGoogleCloud = Boolean(
    process.env.K_SERVICE ||
    process.env.FUNCTIONS_EMULATOR ||
    process.env.GCP_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.FIREBASE_CONFIG
  );
  const storageBucket = getResolvedStorageBucket();
  const databaseURL = getResolvedDatabaseUrl();

  if (!privateKey) {
    if (!isFirestoreEmulator && !isGoogleCloud) {
      throw new Error("FIREBASE_PRIVATE_KEY env var is not set");
    }

    return initializeApp({
      projectId: getResolvedProjectId(),
      storageBucket,
      databaseURL,
    });
  }

  return initializeApp({
    credential: cert({
      projectId: getResolvedProjectId(),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      // Env var stores \n as a literal backslash-n — convert back to newlines.
      privateKey: privateKey.replaceAll(String.raw`\n`, "\n"),
    }),
    storageBucket,
    databaseURL,
  });
}

/** Firebase Admin Auth instance (singleton, Node.js only). */
export const auth = getAuth(getAdminApp());

/** Firebase Admin Firestore instance (singleton, Node.js only). */
export const db = getFirestore(getAdminApp());

/** Firebase Admin Storage instance (singleton, Node.js only). */
export const storage = getStorage(getAdminApp());

/** Firebase Admin Storage default bucket (singleton, Node.js only). */
export const bucket = storage.bucket(getResolvedStorageBucket());

/** Firebase Admin Realtime Database instance (singleton, Node.js only). */
export const rtdb = getDatabase(getAdminApp());
