import { db } from "@/lib/firebase/admin";
import type { CollectionReference } from "firebase-admin/firestore";

/**
 * Returns the Firestore collection reference scoped to the correct profile.
 *
 * All health data lives directly under the top-level `profiles` collection:
 *   `profiles/{profileId}/{collection}`
 *
 * `profileId` is the Firebase Auth UID of the profile — for patient portal
 * flows this is the authenticated user's own UID.
 */
export function scopedCol(
  profileId: string,
  collection: string,
): CollectionReference {
  return db.collection("profiles").doc(profileId).collection(collection);
}
