// Sign-out helper — clears Firebase auth state and the server-side session cookie.
import { getAuth, signOut as firebaseSignOut } from "firebase/auth";
import { firebaseApp } from "@/lib/firebase/client";

export async function signOut(): Promise<void> {
  await firebaseSignOut(getAuth(firebaseApp));
  await fetch("/api/auth/session", { method: "DELETE" });
}
