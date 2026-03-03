import { FirebaseService } from "@/data/shared/service/firesbase.service";
import type { CollectionReference } from "firebase-admin/firestore";

const db = FirebaseService.getInstance().getDb();

/**
 * Returns the Firestore collection reference scoped to the correct profile.
 *
 * All health data lives under a unified `profiles` sub-collection:
 *   Self:      `users/{userId}/profiles/self/{collection}`
 *   Dependent: `users/{userId}/profiles/{profileId}/{collection}`
 */
export function scopedCol(
  userId: string,
  collection: string,
  profileId?: string,
): CollectionReference {
  const pid = profileId ?? "self";
  return db
    .collection("users")
    .doc(userId)
    .collection("profiles")
    .doc(pid)
    .collection(collection);
}
