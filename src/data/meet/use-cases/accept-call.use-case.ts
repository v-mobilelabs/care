import { createChimeMeeting, createChimeAttendee } from "@/lib/meet/chime";
import { meetRepository } from "../repositories/meet.repository";
import { rtdb, db } from "@/lib/firebase/admin";
import type { AttendeeJoinInfo } from "../models/meet.model";
import { ApiError } from "@/lib/api/with-context";
import { doctorPatientRepository } from "@/data/doctor-patients";
import { encounterRepository } from "@/data/encounters";
import { recomputeQueuePositions } from "./recompute-queue";

export class AcceptCallUseCase {
  async execute(params: {
    requestId: string;
    doctorId: string;
  }): Promise<AttendeeJoinInfo> {
    const { requestId, doctorId } = params;

    const request = await meetRepository.get(requestId);
    if (!request) throw ApiError.notFound("Call request not found.");
    if (request.doctorId !== doctorId)
      throw ApiError.forbidden("Not your call request.");
    if (request.status !== "pending")
      throw ApiError.badRequest(
        `Cannot accept a call with status "${request.status}".`,
      );

    // Create the Chime meeting
    const meeting = await createChimeMeeting(requestId);
    const meetingId = meeting.MeetingId!;

    // Create attendees for both doctor and patient
    const [doctorAttendee, patientAttendee] = await Promise.all([
      createChimeAttendee(meetingId, `doctor-${doctorId}`),
      createChimeAttendee(meetingId, `patient-${request.patientId}`),
    ]);

    // Store meeting data
    const chimeMeetingData = JSON.stringify({
      meeting,
      patientAttendee,
      doctorAttendee,
    });

    // Fetch doctor's photo URL to store alongside the call request
    const doctorProfileSnap = await db
      .collection("profiles")
      .doc(doctorId)
      .get();
    const doctorPhotoUrl =
      (doctorProfileSnap.data() as { photoUrl?: string | null } | undefined)
        ?.photoUrl ?? null;

    await meetRepository.updateStatus(requestId, "accepted", {
      chimeMeetingId: meetingId,
      chimeMeetingData,
      doctorPhotoUrl,
    });

    // Send a consent invite to the patient (source: "call") so they can
    // explicitly accept or decline the doctor's access to their health records.
    // Only create the invite if no accepted relationship already exists —
    // we don't want to downgrade an existing accepted connection back to pending.
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
      // Notify the patient inside the active meeting room via RTDB so they can
      // accept right from the call UI.
      // Path: /in-call-consent/{patientId}/{requestId} — scoped to patient so
      // RTDB security rules can allow only that patient to read/write.
      await rtdb.ref(`in-call-consent/${request.patientId}/${requestId}`).set({
        doctorId,
        status: "pending",
      });
    }

    // Create an encounter record via the encounters repository
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

    // Update RTDB — notify patient that call was accepted + mark doctor as busy
    await Promise.all([
      rtdb.ref(`call-state/${request.patientId}`).update({
        status: "accepted",
        chimeMeetingId: meetingId,
        requestId,
        // Patient's join token
        attendeeId: patientAttendee.AttendeeId,
        joinToken: patientAttendee.JoinToken,
        meeting: {
          MeetingId: meeting.MeetingId,
          MediaRegion: meeting.MediaRegion,
          MediaPlacement: meeting.MediaPlacement,
        },
      }),
      // Remove from doctor's call queue
      rtdb.ref(`call-requests/${doctorId}/${requestId}`).update({
        status: "accepted",
      }),
      // Mark the doctor as busy for the duration of the call
      rtdb.ref(`presence/${doctorId}`).update({ status: "busy" }),
    ]);

    // Recompute queue positions for remaining pending requests
    await recomputeQueuePositions(doctorId);

    // Return doctor's join info
    return {
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
  }
}
