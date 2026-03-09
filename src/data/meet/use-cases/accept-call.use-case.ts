import { createChimeMeeting, createChimeAttendee } from "@/lib/meet/chime";
import { meetRepository } from "../repositories/meet.repository";
import { rtdb, db } from "@/lib/firebase/admin";
import type { AttendeeJoinInfo } from "../models/meet.model";
import { ApiError } from "@/lib/api/with-context";
import { doctorPatientRepository } from "@/data/doctor-patients";
import { encounterRepository } from "@/data/encounters";
import { recomputeQueuePositions } from "./recompute-queue";

export class AcceptCallUseCase {
  /**
   * Execute the critical path: create Chime meeting/attendees, update status,
   * and notify the patient via RTDB. Returns join info ASAP.
   *
   * Call `deferredWork()` on the returned result to run non-critical background
   * tasks (consent invite, encounter creation, DM setup, queue recompute).
   */
  async execute(params: {
    requestId: string;
    doctorId: string;
  }): Promise<{
    joinInfo: AttendeeJoinInfo;
    deferredWork: () => Promise<void>;
  }> {
    const { requestId, doctorId } = params;

    const request = await meetRepository.get(requestId);
    if (!request) throw ApiError.notFound("Call request not found.");
    if (request.doctorId !== doctorId)
      throw ApiError.forbidden("Not your call request.");
    if (request.status !== "pending")
      throw ApiError.badRequest(
        `Cannot accept a call with status "${request.status}".`,
      );

    // ── Critical path: Chime meeting + attendees (parallelised) ────────────
    const meeting = await createChimeMeeting(requestId);
    const meetingId = meeting.MeetingId!;

    const [doctorAttendee, patientAttendee, doctorProfileSnap] =
      await Promise.all([
        createChimeAttendee(meetingId, `doctor-${doctorId}`),
        createChimeAttendee(meetingId, `patient-${request.patientId}`),
        db.collection("profiles").doc(doctorId).get(),
      ]);

    const doctorPhotoUrl =
      (doctorProfileSnap.data() as { photoUrl?: string | null } | undefined)
        ?.photoUrl ?? null;

    const chimeMeetingData = JSON.stringify({
      meeting,
      patientAttendee,
      doctorAttendee,
    });

    // ── Critical: persist status + notify patient (parallel) ───────────────
    const conversationId = `${doctorId}_${request.patientId}`;

    await Promise.all([
      meetRepository.updateStatus(requestId, "accepted", {
        chimeMeetingId: meetingId,
        chimeMeetingData,
        doctorPhotoUrl,
      }),
      rtdb.ref(`call-state/${request.patientId}`).update({
        status: "accepted",
        chimeMeetingId: meetingId,
        requestId,
        conversationId,
        attendeeId: patientAttendee.AttendeeId,
        joinToken: patientAttendee.JoinToken,
        meeting: {
          MeetingId: meeting.MeetingId,
          MediaRegion: meeting.MediaRegion,
          MediaPlacement: meeting.MediaPlacement,
        },
      }),
      rtdb.ref(`call-requests/${doctorId}/${requestId}`).update({
        status: "accepted",
      }),
      rtdb.ref(`presence/${doctorId}`).update({ status: "busy" }),
    ]);

    // ── Build join info that the doctor needs immediately ───────────────────
    const joinInfo: AttendeeJoinInfo = {
      meeting: {
        MeetingId: meeting.MeetingId!,
        MediaRegion: meeting.MediaRegion!,
        MediaPlacement:
          meeting.MediaPlacement as AttendeeJoinInfo["meeting"]["MediaPlacement"],
        ExternalMeetingId: meeting.ExternalMeetingId,
      },
      attendee: {
        AttendeeId: doctorAttendee.AttendeeId!,
        ExternalUserId: doctorAttendee.ExternalUserId!,
        JoinToken: doctorAttendee.JoinToken!,
      },
      requestId,
    };

    // ── Deferred work — runs after the HTTP response is sent ───────────────
    const deferredWork = async () => {
      try {
        // Consent invite
        const existing = await doctorPatientRepository.get(
          doctorId,
          request.patientId,
        );
        if (existing?.status !== "accepted") {
          const patientProfileSnap = await db
            .collection("profiles")
            .doc(request.patientId)
            .get();
          const patientName = patientProfileSnap.exists
            ? (patientProfileSnap.data() as { name?: string }).name
            : undefined;

          await doctorPatientRepository.invite({
            doctorId,
            patientId: request.patientId,
            source: "call",
            patientName,
          });
          await rtdb
            .ref(`in-call-consent/${request.patientId}/${requestId}`)
            .set({ doctorId, status: "pending" });
        }

        // Encounter creation
        await encounterRepository.create({
          patientId: request.patientId,
          patientName: request.patientName,
          patientPhotoUrl: request.patientPhotoUrl,
          doctorId,
          doctorName: request.doctorName,
          doctorPhotoUrl,
          requestId,
          chimeMeetingId: meetingId,
        });

        // DM conversation setup
        const dmInfoSnap = await rtdb.ref(`dm/${conversationId}/info`).get();
        if (!dmInfoSnap.exists()) {
          const patientProfileSnap2 = await db
            .collection("profiles")
            .doc(request.patientId)
            .get();
          const patientNameForDm = patientProfileSnap2.exists
            ? ((patientProfileSnap2.data() as { name?: string }).name ??
              request.patientName)
            : request.patientName;
          const doctorNameForDm =
            (doctorProfileSnap.data() as { name?: string } | undefined)?.name ??
            request.doctorName;

          const dmUpdates: Record<string, unknown> = {};
          dmUpdates[`dm/${conversationId}/info`] = {
            doctorId,
            patientId: request.patientId,
            doctorName: doctorNameForDm,
            patientName: patientNameForDm,
            createdAt: { ".sv": "timestamp" },
          };
          dmUpdates[`dm-inbox/${doctorId}/${conversationId}`] = {
            otherUid: request.patientId,
            otherName: patientNameForDm,
            lastMessage: "",
            lastMessageAt: { ".sv": "timestamp" },
            unread: false,
          };
          dmUpdates[`dm-inbox/${request.patientId}/${conversationId}`] = {
            otherUid: doctorId,
            otherName: doctorNameForDm,
            lastMessage: "",
            lastMessageAt: { ".sv": "timestamp" },
            unread: false,
          };
          await rtdb.ref().update(dmUpdates);
        }

        // Queue recomputation
        await recomputeQueuePositions(doctorId);
      } catch (err) {
        // Non-critical — log but don't fail the call
        console.error("[AcceptCallUseCase] deferred work failed:", err);
      }
    };

    return { joinInfo, deferredWork };
  }
}
