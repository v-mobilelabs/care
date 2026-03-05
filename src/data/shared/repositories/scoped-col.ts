import { FirebaseService } from "@/data/shared/service/firesbase.service";
import type { CollectionReference } from "firebase-admin/firestore";

const db = FirebaseService.getInstance().getDb();

/**
 * Returns the Firestore collection reference scoped to the correct profile.
 *
 * All health data lives directly under the top-level `profiles` collection:
 *   `profiles/{profileId}/{collection}`
 *
 * `profileId` is the Firebase Auth UID of the profile — for the owner's own
 * data it equals `user.uid`; for a dependent it equals the dependent's UID.
 * Callers can derive it as `dependentId ?? userId`.
 */
export function scopedCol(
  profileId: string,
  collection: string,
): CollectionReference {
  return db.collection("profiles").doc(profileId).collection(collection);
}
