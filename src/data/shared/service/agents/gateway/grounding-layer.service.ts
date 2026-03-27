import type {
  SessionGroundingCacheDocument,
  SessionGroundingEvaluation,
} from "@/data/sessions";
import { ragService } from "@/data/shared/service/rag/rag.service";

const GROUNDING_CACHE_TTL_MS = 10 * 60 * 1000;
const MIN_GROUNDING_SCORE = 0.8;
const MIN_COVERAGE_SCORE = 0.72;
const MIN_TOKEN_OVERLAP = 0.5;
const SEMANTIC_SIMILARITY_THRESHOLD = 0.92;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "about",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "the",
  "to",
  "what",
  "with",
]);

export interface GroundingReuseInput {
  userQuery: string;
  agentType: string;
  responseMode: "quick" | "full";
  hasAttachment: boolean;
  cachedGrounding?: SessionGroundingCacheDocument[] | null;
}

export interface GroundingReuseResult {
  reused: boolean;
  reason: string;
  ragContext: string | null;
  queryEmbedding: number[] | null;
  evaluation?: SessionGroundingEvaluation;
}

type CandidateScore = {
  entry: SessionGroundingCacheDocument;
  similarity: number;
};

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

export function normalizeGroundingQuery(query: string): string {
  return Array.from(new Set(tokenizeQuery(query)))
    .sort((left, right) => left.localeCompare(right))
    .join(" ");
}

function hasStrongEvaluation(evaluation?: SessionGroundingEvaluation): boolean {
  if (!evaluation) return false;
  return (
    evaluation.scores.grounding >= MIN_GROUNDING_SCORE &&
    evaluation.scores.coverage >= MIN_COVERAGE_SCORE
  );
}

function toEpochMs(value: string | Date | { toDate(): Date }): number {
  if (typeof value === "string") return new Date(value).getTime();
  if (value instanceof Date) return value.getTime();
  return value.toDate().getTime();
}

function isExpired(updatedAt: string | Date | { toDate(): Date }): boolean {
  const updatedAtMs = toEpochMs(updatedAt);
  if (!Number.isFinite(updatedAtMs)) return true;
  return Date.now() - updatedAtMs > GROUNDING_CACHE_TTL_MS;
}

function tokenOverlapScore(a: string, b: string): number {
  const aTokens = new Set(a.split(/\s+/).filter(Boolean));
  const bTokens = new Set(b.split(/\s+/).filter(Boolean));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let intersection = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) intersection += 1;
  }

  return intersection / Math.min(aTokens.size, bTokens.size);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function shouldPersistGroundingCache(args: {
  hasAttachment?: boolean;
  ragContext?: string | null;
  evaluation?: SessionGroundingEvaluation;
  partialFailure?: boolean;
}): boolean {
  if (args.hasAttachment) return false;
  if (!args.ragContext || args.ragContext.trim().length === 0) return false;
  if (args.partialFailure) return false;
  return hasStrongEvaluation(args.evaluation);
}

export async function tryReuseGrounding(
  input: GroundingReuseInput,
): Promise<GroundingReuseResult> {
  const cachedEntries = input.cachedGrounding ?? [];
  if (cachedEntries.length === 0) {
    return {
      reused: false,
      reason: "grounding-cache-miss:no-cache",
      ragContext: null,
      queryEmbedding: null,
    };
  }

  if (input.hasAttachment) {
    return {
      reused: false,
      reason: "grounding-cache-miss:attachment",
      ragContext: null,
      queryEmbedding: null,
    };
  }

  const normalizedQuery = normalizeGroundingQuery(input.userQuery);
  if (!normalizedQuery) {
    return {
      reused: false,
      reason: "grounding-cache-miss:empty-query",
      ragContext: null,
      queryEmbedding: null,
    };
  }

  const candidates = cachedEntries.filter((entry) => {
    if (entry.hasAttachment) return false;
    if (entry.agentType !== input.agentType) return false;
    if (input.responseMode === "full" && entry.responseMode !== "full") {
      return false;
    }
    if (isExpired(entry.updatedAt)) return false;
    return hasStrongEvaluation(entry.evaluation);
  });

  if (candidates.length === 0) {
    return {
      reused: false,
      reason: "grounding-cache-miss:no-eligible-candidate",
      ragContext: null,
      queryEmbedding: null,
    };
  }

  const exactCandidate = candidates.find(
    (entry) => normalizedQuery === entry.normalizedQuery,
  );
  if (exactCandidate) {
    return {
      reused: true,
      reason: "grounding-cache-hit:exact",
      ragContext: exactCandidate.context,
      queryEmbedding: exactCandidate.queryEmbedding ?? null,
      evaluation: exactCandidate.evaluation,
    };
  }

  const semanticCandidates = candidates.filter(
    (entry) =>
      tokenOverlapScore(normalizedQuery, entry.normalizedQuery) >=
        MIN_TOKEN_OVERLAP && Boolean(entry.queryEmbedding?.length),
  );

  if (semanticCandidates.length === 0) {
    return {
      reused: false,
      reason: "grounding-cache-miss:low-overlap",
      ragContext: null,
      queryEmbedding: null,
    };
  }

  const queryEmbedding = await ragService.embedQuery(input.userQuery);

  const bestCandidate = semanticCandidates
    .map(
      (entry): CandidateScore => ({
        entry,
        similarity: cosineSimilarity(
          queryEmbedding,
          entry.queryEmbedding ?? [],
        ),
      }),
    )
    .filter(
      (candidate) => candidate.similarity >= SEMANTIC_SIMILARITY_THRESHOLD,
    )
    .sort((left, right) => {
      if (right.similarity !== left.similarity) {
        return right.similarity - left.similarity;
      }
      return (
        right.entry.updatedAt.toDate().getTime() -
        left.entry.updatedAt.toDate().getTime()
      );
    })
    .at(0);

  if (!bestCandidate) {
    return {
      reused: false,
      reason: "grounding-cache-miss:low-similarity",
      ragContext: null,
      queryEmbedding,
    };
  }

  return {
    reused: true,
    reason: "grounding-cache-hit:semantic",
    ragContext: bestCandidate.entry.context,
    queryEmbedding,
    evaluation: bestCandidate.entry.evaluation,
  };
}
