/**
 * AWS Chime SDK Meetings — server-side helpers.
 * Uses AWS credentials from env: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 */
import {
  ChimeSDKMeetingsClient,
  CreateMeetingCommand,
  CreateAttendeeCommand,
  DeleteMeetingCommand,
  GetMeetingCommand,
} from "@aws-sdk/client-chime-sdk-meetings";

function getChimeClient(): ChimeSDKMeetingsClient {
  const region = process.env.AWS_REGION ?? "us-east-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local",
    );
  }

  return new ChimeSDKMeetingsClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

// ── Create a new Chime meeting ────────────────────────────────────────────────

export async function createChimeMeeting(requestId: string) {
  const client = getChimeClient();
  const command = new CreateMeetingCommand({
    ClientRequestToken: requestId,
    MediaRegion: process.env.AWS_REGION ?? "us-east-1",
    ExternalMeetingId: requestId,
    MeetingFeatures: {
      Audio: { EchoReduction: "AVAILABLE" },
    },
  });

  const response = await client.send(command);
  if (!response.Meeting) throw new Error("Failed to create Chime meeting");
  return response.Meeting;
}

// ── Create an attendee in an existing meeting ─────────────────────────────────

export async function createChimeAttendee(
  meetingId: string,
  externalUserId: string,
) {
  const client = getChimeClient();
  const command = new CreateAttendeeCommand({
    MeetingId: meetingId,
    ExternalUserId: externalUserId,
  });

  const response = await client.send(command);
  if (!response.Attendee) throw new Error("Failed to create Chime attendee");
  return response.Attendee;
}

// ── Delete / end a Chime meeting ──────────────────────────────────────────────

export async function deleteChimeMeeting(meetingId: string): Promise<void> {
  const client = getChimeClient();
  await client.send(new DeleteMeetingCommand({ MeetingId: meetingId }));
}

// ── Get meeting info ──────────────────────────────────────────────────────────

export async function getChimeMeeting(meetingId: string) {
  const client = getChimeClient();
  const response = await client.send(
    new GetMeetingCommand({ MeetingId: meetingId }),
  );
  return response.Meeting ?? null;
}
