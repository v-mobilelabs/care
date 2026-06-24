import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";
import { GoogleAuth } from "google-auth-library";
import * as logger from "firebase-functions/logger";

/**
 * Firebase Admin SDK client instance.
 * Initialized once and reused across all functions.
 */
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: Storage | null = null;
let _googleAuth: GoogleAuth | null = null;

/**
 * Initialize Firebase Admin SDK.
 * Uses the default service account credentials (ADC).
 * Call this once on startup.
 */
export function initializeFirebase() {
  if (getApps().length === 0) {
    initializeApp();
    logger.info("[Firebase] Initialized with default credentials");
  }
}

/**
 * Get Firebase Auth instance.
 * Pre-authenticated with the default service account.
 */
export function getAuthInstance(): Auth {
  if (!_auth) {
    initializeFirebase();
    _auth = getAuth();
  }
  return _auth;
}

/**
 * Get Firestore instance.
 * Pre-authenticated with the default service account.
 */
export function getFirestoreInstance(): Firestore {
  if (!_db) {
    initializeFirebase();
    _db = getFirestore();
  }
  return _db;
}

/**
 * Get Cloud Storage instance.
 * Pre-authenticated with the default service account.
 */
export function getStorageInstance(): Storage {
  if (!_storage) {
    initializeFirebase();
    _storage = getStorage();
  }
  return _storage;
}

/**
 * Get Google Auth client for ADC (Application Default Credentials).
 * Use this to obtain access tokens for Google Cloud APIs (e.g., Vertex AI).
 */
export async function getGoogleAuthInstance(): Promise<GoogleAuth> {
  if (!_googleAuth) {
    _googleAuth = new GoogleAuth({
      scopes: "https://www.googleapis.com/auth/cloud-platform",
    });
  }
  return _googleAuth;
}

/**
 * Get access token for Google Cloud API calls.
 * Useful for Vertex AI, Cloud Storage, etc.
 */
export async function getGoogleAccessToken(): Promise<string> {
  const auth = await getGoogleAuthInstance();
  const tokenResponse = await auth.getAccessToken();
  const token = tokenResponse as { token?: string } | string | null;
  const accessToken = typeof token === "string" ? token : (token as any)?.token;
  if (!accessToken) {
    throw new Error("Failed to obtain Google Cloud access token");
  }
  return accessToken;
}

/**
 * Get Firebase project ID.
 * Checks Admin SDK app options first (always available after initializeFirebase()),
 * then falls back to Cloud Run / Cloud Functions environment variables.
 */
export function getProjectId(): string {
  initializeFirebase();
  const apps = getApps();
  const projectId =
    apps[0]?.options?.projectId ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    (process.env.FIREBASE_CONFIG
      ? (JSON.parse(process.env.FIREBASE_CONFIG) as { projectId?: string })
          .projectId
      : undefined);
  if (!projectId) {
    throw new Error("Firebase project ID not available in environment");
  }
  return projectId;
}

/**
 * Diagnostics: Log Firebase initialization status.
 */
export function logFirebaseStatus() {
  initializeFirebase();
  logger.info("[Firebase Status]", {
    auth: !!_auth,
    db: !!_db,
    storage: !!_storage,
    projectId: getProjectId(),
  });
}
