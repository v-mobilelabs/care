/**
 * Detects the UserKind for a given uid by reading profiles/{uid}.kind from
 * Firestore via GetProfileUseCase. Defaults to "user" if the profile
 * doesn't exist or carries an unrecognised kind value.
 */
import { GetProfileUseCase } from "@/data/profile";
import { coerceUserKind, type UserKind } from "@/lib/auth/jwt";

export async function detectKind(uid: string): Promise<UserKind> {
  const profile = await new GetProfileUseCase()
    .execute(GetProfileUseCase.validate({ userId: uid }))
    .catch(() => null);
  return coerceUserKind(profile?.kind);
}
