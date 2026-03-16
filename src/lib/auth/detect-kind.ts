/**
 * Detects the UserKind for a given uid by reading profiles/{uid}.kind from
 * Firestore via GetProfileUseCase. Defaults to "user" if the profile
 * doesn't exist or carries an unrecognised kind value.
 */
import { GetProfileUseCase } from "@/data/profile";
import { USER_KINDS, type UserKind } from "@/lib/auth/jwt";

const VALID_KINDS = new Set<UserKind>(USER_KINDS);

export async function detectKind(uid: string): Promise<UserKind> {
  const profile = await new GetProfileUseCase()
    .execute(GetProfileUseCase.validate({ userId: uid }))
    .catch(() => null);
  const raw = profile?.kind as string | undefined;
  return VALID_KINDS.has(raw as UserKind) ? (raw as UserKind) : "user";
}
