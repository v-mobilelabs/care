/**
 * Evidence Repository — Firestore persistence for reasoning chains and evidence
 */

import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import type {
  EvidenceMetadataDocument,
  ReasoningStepDocument,
  CitationDocument,
  ConfidenceScoreDocument,
  CaptureEvidenceInput,
  EvidenceDto,
} from "../models/evidence.model";
import { toEvidenceDto } from "../models/evidence.model";

/**
 * Helper to strip undefined properties from an object for Firestore storage
 */
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  );
}

function evidencePath(profileId: string, sessionId: string, messageId: string) {
  return db
    .collection("profiles")
    .doc(profileId)
    .collection("sessions")
    .doc(sessionId)
    .collection("messages")
    .doc(messageId)
    .collection("evidence");
}

export const evidenceRepository = {
  /**
   * Store complete evidence for a message.
   * Uses batch writes for atomic subcollection creation.
   */
  async capture(profileId: string, input: CaptureEvidenceInput): Promise<void> {
    const batch = db.batch();
    const basePath = evidencePath(profileId, input.sessionId, input.messageId);

    // 1. Metadata document
    const metadataRef = basePath.doc("metadata");
    const metadataDoc: EvidenceMetadataDocument = {
      messageId: input.messageId,
      sessionId: input.sessionId,
      userId: input.userId,
      profileId,
      agentType: input.agentType,
      modelUsed: input.modelUsed,
      thinkingLevel: input.thinkingLevel,
      thinkingContent: input.thinkingContent,
      overallConfidence: input.overallConfidence,
      confidenceLabel: input.confidenceLabel,
      summary: input.summary,
      capturedAt: Timestamp.now(),
      processingTimeMs: input.processingTimeMs,
      isHighConfidence: (input.overallConfidence ?? 0) >= 75,
      hasThinking: !!input.thinkingContent,
    };
    batch.set(
      metadataRef,
      stripUndefined(metadataDoc as unknown as Record<string, unknown>),
    );

    // 2. Reasoning steps
    (input.reasoning || []).forEach((step, idx) => {
      const reasoningRef = basePath.doc(`reasoning_${idx}`);
      batch.set(
        reasoningRef,
        stripUndefined({
          ...step,
          createdAt: Timestamp.now(),
        }),
      );
    });

    // 3. Citations
    (input.citations || []).forEach((citation, idx) => {
      const citationRef = basePath.doc(`citation_${idx}`);
      batch.set(
        citationRef,
        stripUndefined({
          ...citation,
          createdAt: Timestamp.now(),
        }),
      );
    });

    // 4. Confidence scores
    (input.confidenceScores || []).forEach((score, idx) => {
      const scoreRef = basePath.doc(`confidence_${idx}`);
      batch.set(
        scoreRef,
        stripUndefined({
          ...score,
          createdAt: Timestamp.now(),
        }),
      );
    });

    await batch.commit();
  },

  /**
   * Retrieve complete evidence for a message.
   */
  async getByMessage(
    profileId: string,
    sessionId: string,
    messageId: string,
  ): Promise<EvidenceDto | null> {
    const basePath = evidencePath(profileId, sessionId, messageId);

    // Fetch metadata document
    const metaSnap = await basePath.doc("metadata").get();
    if (!metaSnap.exists) {
      return null;
    }

    const metadata = metaSnap.data() as EvidenceMetadataDocument;

    // Query reasoning/citations/scores by document ID prefix pattern
    const [reasoningSnap, citationSnap, scoreSnap] = await Promise.all([
      basePath.get().then((snap) =>
        snap.docs
          .filter((d) => d.id.startsWith("reasoning_"))
          .sort((a, b) => {
            const numA = Number.parseInt(a.id.split("_")[1], 10);
            const numB = Number.parseInt(b.id.split("_")[1], 10);
            return numA - numB;
          }),
      ),
      basePath
        .get()
        .then((snap) => snap.docs.filter((d) => d.id.startsWith("citation_"))),
      basePath
        .get()
        .then((snap) =>
          snap.docs.filter((d) => d.id.startsWith("confidence_")),
        ),
    ]);

    const reasoning = reasoningSnap.map(
      (d) => d.data() as ReasoningStepDocument,
    );
    const citations = citationSnap.map((d) => d.data() as CitationDocument);
    const confidenceScores = scoreSnap.map(
      (d) => d.data() as ConfidenceScoreDocument,
    );

    return toEvidenceDto(metadata, reasoning, citations, confidenceScores);
  },

  /**
   * Query evidence by confidence level (simplified).
   */
  async queryByConfidence(
    _profileId: string,
    _sessionId: string,
    _minConfidence: number,
  ): Promise<EvidenceDto[]> {
    // This would require a global index on evidence metadata across sessions
    // For now, return empty — can be implemented with collectionGroup query
    // when index is set up
    return [];
  },

  /**
   * List all evidence for a session.
   */
  async listBySession(
    profileId: string,
    sessionId: string,
  ): Promise<Array<{ messageId: string; evidence: EvidenceDto }>> {
    const messagesSnap = await db
      .collection("profiles")
      .doc(profileId)
      .collection("sessions")
      .doc(sessionId)
      .collection("messages")
      .get();

    const results = [];
    for (const msgDoc of messagesSnap.docs) {
      const evidence = await this.getByMessage(profileId, sessionId, msgDoc.id);
      if (evidence) {
        results.push({ messageId: msgDoc.id, evidence });
      }
    }
    return results;
  },

  /**
   * Delete evidence for a message (privacy/cleanup).
   */
  async deleteByMessage(
    profileId: string,
    sessionId: string,
    messageId: string,
  ): Promise<void> {
    const basePath = evidencePath(profileId, sessionId, messageId);
    const docs = await basePath.listDocuments();
    const batch = db.batch();
    docs.forEach((doc) => batch.delete(doc));
    await batch.commit();
  },
};
