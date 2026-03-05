// Magic-link helpers (client-side, browser only).
import {
  getAuth,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import { firebaseApp } from "@/lib/firebase/client";

const EMAIL_KEY = "careai-signin-email";
const PENDING_DOCTOR_KEY = "careai-pending-doctor-profile";

export interface PendingDoctorProfile {
  name: string;
  specialty: string;
  licenseNumber: string;
  phone?: string;
  bio?: string;
}

/** Persist professional details before sending the doctor-registration magic link. */
export function savePendingDoctorProfile(data: PendingDoctorProfile): void {
  localStorage.setItem(PENDING_DOCTOR_KEY, JSON.stringify(data));
}

/**
 * Read and clear the pending doctor profile from localStorage.
 * Returns null if nothing was stored (e.g. regular sign-in).
 */
export function popPendingDoctorProfile(): PendingDoctorProfile | null {
  const raw = localStorage.getItem(PENDING_DOCTOR_KEY);
  if (!raw) return null;
  localStorage.removeItem(PENDING_DOCTOR_KEY);
  try {
    return JSON.parse(raw) as PendingDoctorProfile;
  } catch {
    return null;
  }
}

/**
 * Non-destructive check — returns true if a pending doctor profile is stored.
 * Use this in routing logic; use popPendingDoctorProfile() to read + clear.
 */
export function hasPendingDoctorProfile(): boolean {
  return localStorage.getItem(PENDING_DOCTOR_KEY) !== null;
}

/**
 * Persist the email in localStorage so the verify page can retrieve it.
 * Called by the login form after the server successfully sends the link.
 */
export function saveSignInEmail(email: string): void {
  localStorage.setItem(EMAIL_KEY, email);
}

/** Complete sign-in from the magic link URL. Returns the Firebase ID token. */
export async function completeMagicLink(href: string): Promise<string> {
  const auth = getAuth(firebaseApp);
  if (!isSignInWithEmailLink(auth, href))
    throw new Error("Invalid sign-in link");

  const email = localStorage.getItem(EMAIL_KEY);
  if (!email) throw new Error("Email not found — please re-enter it.");

  const { user } = await signInWithEmailLink(auth, email, href);
  localStorage.removeItem(EMAIL_KEY);
  return user.getIdToken();
}
