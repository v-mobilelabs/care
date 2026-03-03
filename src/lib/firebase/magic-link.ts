// Magic-link helpers (client-side, browser only).
import {
  getAuth,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import { firebaseApp } from "@/lib/firebase/client";

const EMAIL_KEY = "careai-signin-email";

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
