import { createChimeMeeting, createChimeAttendee } from "@/lib/meet/chime";
import { meetRepository } from "../repositories/meet.repository";
import { rtdb, db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { AttendeeJoinInfo } from "../models/meet.model";
import { ApiError } from "@/lib/api/with-context";

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

    await meetRepository.updateStatus(requestId, "accepted", {
      chimeMeetingId: meetingId,
      chimeMeetingData,
    });

    // Build the relationship: add patient to doctor's patients list + vice versa
    const batch = db.batch();

    // patients/{patientId}/doctorIds (stored in patient doc as an array field)
    const patientRef = db.collection("patients").doc(request.patientId);
    batch.set(
      patientRef,
      { doctorIds: FieldValue.arrayUnion(doctorId) },
      { merge: true },
    );

    // doctors/{doctorId} — add patient to patients list
    const doctorRef = db.collection("doctor-patients").doc(doctorId);
    batch.set(
      doctorRef,
      {
        patientIds: FieldValue.arrayUnion(request.patientId),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // Create an encounter record
    const encounterRef = db.collection("encounters").doc();
    batch.set(encounterRef, {
      patientId: request.patientId,
      doctorId,
      requestId,
      chimeMeetingId: meetingId,
      status: "active",
      startedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    // Update RTDB — notify patient that call was accepted
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
    ]);

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
