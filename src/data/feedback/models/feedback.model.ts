import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Firestore document shape — feedback/{id} ──────────────────────────────────

export type FeedbackType = "like" | "dislike" | "report";

export interface FeedbackDocument {
  userId: string;
  email: string;
  messageId: string;
  sessionId: string;
  type: FeedbackType;
  text: string | null;
  createdAt: Timestamp;
}

// ── Zod schema ────────────────────────────────────────────────────────────────

export const SubmitFeedbackSchema = z
  .object({
    userId: z.string().min(1, { message: "userId is required" }),
    email: z.string().email(),
    messageId: z.string().min(1, { message: "messageId is required" }),
    sessionId: z.string().min(1, { message: "sessionId is required" }),
    type: z.enum(["like", "dislike", "report"]),
    text: z.string().trim().optional(),
  })
  .refine(
    (d) =>
      d.type !== "report" || (typeof d.text === "string" && d.text.length > 0),
    { message: "Report text is required", path: ["text"] },
  );

export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackSchema>;
