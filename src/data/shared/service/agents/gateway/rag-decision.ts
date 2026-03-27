export type RagDecisionReason =
  | "attachment"
  | "record-hint"
  | "reasoning-hint"
  | "short-query-skip"
  | "long-query-default";

export type RagDecision = {
  needsRag: boolean;
  reason: RagDecisionReason;
  hasRecordHint: boolean;
  hasReasoningHint: boolean;
  isShortQuery: boolean;
};

const RAG_REASONING_HINTS = [
  "should",
  "recommend",
  "assess",
  "treat",
  "diagnos",
  "why",
  "cause",
  "explain",
  "analys",
] as const;

export const RECORD_HINTS = [
  "my medication",
  "my medicine",
  "my med",
  "my prescription",
  "my condition",
  "my blood",
  "my lab",
  "my result",
  "my report",
  "my vital",
  "my diagnos",
  "my treatment",
  "my history",
  "my record",
  "my allerg",
  "interaction",
  "my health",
  "my drug",
  "my dose",
  "my dosage",
  "my name",
  "my age",
  "my profile",
  "my weight",
  "my height",
  "my gender",
  "my detail",
  "my info",
  "my data",
  "who am i",
  "about me",
  "medicines i",
  "medications i",
  "meds i",
  "drugs i",
  "been taking",
  "i take",
  "i'm taking",
  "am taking",
  "prescribed",
] as const;

const SHORT_QUERY_WORD_THRESHOLD = 12;

function hasRecordHint(queryLower: string): boolean {
  return RECORD_HINTS.some((hint) => queryLower.includes(hint));
}

function hasReasoningHint(queryLower: string): boolean {
  return RAG_REASONING_HINTS.some((hint) => queryLower.includes(hint));
}

function isShortQuery(query: string): boolean {
  return query.trim().split(/\s+/).length <= SHORT_QUERY_WORD_THRESHOLD;
}

export function decideRagRequirement(
  query: string,
  hasAttachment?: boolean,
): RagDecision {
  if (hasAttachment) {
    return {
      needsRag: true,
      reason: "attachment",
      hasRecordHint: false,
      hasReasoningHint: false,
      isShortQuery: false,
    };
  }

  const queryLower = query.toLowerCase();
  const recordHint = hasRecordHint(queryLower);
  if (recordHint) {
    return {
      needsRag: true,
      reason: "record-hint",
      hasRecordHint: true,
      hasReasoningHint: false,
      isShortQuery: isShortQuery(query),
    };
  }

  const reasoningHint = hasReasoningHint(queryLower);
  if (reasoningHint) {
    return {
      needsRag: true,
      reason: "reasoning-hint",
      hasRecordHint: false,
      hasReasoningHint: true,
      isShortQuery: isShortQuery(query),
    };
  }

  const shortQuery = isShortQuery(query);
  if (shortQuery) {
    return {
      needsRag: false,
      reason: "short-query-skip",
      hasRecordHint: false,
      hasReasoningHint: false,
      isShortQuery: true,
    };
  }

  return {
    needsRag: true,
    reason: "long-query-default",
    hasRecordHint: false,
    hasReasoningHint: false,
    isShortQuery: false,
  };
}

export function inferNeedsRag(query: string, hasAttachment?: boolean): boolean {
  return decideRagRequirement(query, hasAttachment).needsRag;
}
