import { meetRepository } from "../repositories/meet.repository";
import { GetMeetingJoinInfoUseCase } from "./get-meeting-join-info.use-case";
import type { MeetSessionData } from "@/app/(portal)/meet/[requestId]/_keys";
import type { UserKind } from "@/lib/auth/jwt";

export class GetActiveMeetUseCase {
  /** Returns the full MeetSessionData for a user's active call, or null if none exists.
   *
   * - Patient ("user"): considers `pending` or `accepted` calls active.
   * - Doctor: considers `accepted` calls only active (mid-session).
   */
  async execute(params: {
    userId: string;
    userKind: UserKind;
  }): Promise<MeetSessionData | null> {
    const { userId, userKind } = params;

    const active =
      userKind === "doctor"
        ? await meetRepository.getActiveForDoctor(userId)
        : await meetRepository.getActiveForPatient(userId);

    if (!active) return null;

    try {
      return await new GetMeetingJoinInfoUseCase().execute({
        requestId: active.id,
        userId,
        userKind,
      });
    } catch {
      // Chime meeting no longer exists in AWS or call data is stale — treat as no active meet
      return null;
    }
  }
}
