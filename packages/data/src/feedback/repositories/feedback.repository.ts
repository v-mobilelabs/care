import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import type {
  FeedbackDocument,
  SubmitFeedbackInput,
} from "../models/feedback.model";

const col = () => db.collection("feedback");

export const feedbackRepository = {
  async create(input: SubmitFeedbackInput): Promise<void> {
    const doc: FeedbackDocument = {
      userId: input.userId,
      email: input.email,
      messageId: input.messageId,
      sessionId: input.sessionId,
      type: input.type,
      text: input.text?.trim() ?? null,
      createdAt: Timestamp.now(),
    };
    await col().add(doc);
  },
};
