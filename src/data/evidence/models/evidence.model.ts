/**
 * Evidence Model — Auditable reasoning chains, citations, and confidence scores
 *
 * Captures the "why" behind AI recommendations: thinking process, source citations,
 * and confidence metrics. Stored as subcollections under each message for auditability.
 */

import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

export type EvidenceSourceType =
  | "rag"
  | "tool"
  | "ehr"
  | "guideline"
  | "memory"
  | "thinking";
export type ConfidenceLabel = "high" | "medium" | "low";
export type ThinkingLevel = "low" | "medium" | "high";
export type ConfidenceMetric =
  | "diagnostic_confidence"
  | "therapeutic_confidence"
  | "triage_confidence"
  | "clinical_quality";

// ── Documents ─────────────────────────────────────────────────────────────────

export interface ReasoningStepDocument {
  stepNumber: number;
  description: string; // e.g., "Analyzed patient history for relevant medications"
  reasoning?: string; // More detailed explanation
  duration?: number; // milliseconds
  dataUsed?: string[]; // ["patient-history", "rag-result", "tool-output"]
}

export interface CitationDocument {
  sourceType: EvidenceSourceType;
  sourceId?: string; // doc ID, tool name, URL, etc.
  title?: string;
  snippet?: string;
  relevanceScore?: number; // 0-1
  usageContext?: string; // e.g., "supported medication recommendation"
  url?: string; // For external guidelines
}

export interface ConfidenceScoreDocument {
  metric: ConfidenceMetric;
  score: number; // 0-100
  label: ConfidenceLabel;
  factors?: {
    dataCompleteness?: number; // 0-100
    guidelineAlignment?: number; // 0-100
    evidenceStrength?: number; // 0-100
    contextClarity?: number; // 0-100
  };
  rationale?: string; // Why this score
}

export interface EvidenceMetadataDocument {
  messageId: string;
  sessionId: string;
  userId: string;
  profileId: string;
  agentType: string;
  modelUsed?: string;
  // Thinking mode details (ext thinking)
  thinkingLevel?: ThinkingLevel;
  thinkingContent?: string;
  // Summary metrics
  overallConfidence?: number; // 0-100
  confidenceLabel?: ConfidenceLabel;
  // Content summary
  summary?: string; // Brief summary of reasoning
  // Capture timing
  capturedAt: Timestamp;
  processingTimeMs?: number;
  // Indices for queries
  isHighConfidence?: boolean;
  hasThinking?: boolean;
  // ── Pipeline Metadata ────────────────────────────────────────────────
  /** Token usage for this message */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Credits consumed (1 per LLM call in middleware) */
  creditsUsed?: number;
  /** Gateway routing decision details */
  gateway?: {
    agentType: string;
    routingReason: string; // "keyword", "cache", "default", "llm"
    thinkingLevel: ThinkingLevel;
  };
  /** RAG retrieval metadata */
  rag?: {
    requested: boolean;
    used: boolean;
    reason:
      | "attachment"
      | "record-hint"
      | "reasoning-hint"
      | "short-query-skip"
      | "long-query-default"
      | "explicit-override";
    timedOut: boolean;
    partialFailure: boolean;
    executionTimeMs?: number;
  };
  /** Reranking information (Bedrock reranker) */
  reranking?: {
    used: boolean;
    documentsReranked?: number;
    topScores?: number[]; // Top 3-5 relevance scores after reranking
    executionTimeMs?: number;
  };
  /** Memory retrieval metadata */
  memory?: {
    retrieved: boolean;
    count?: number;
    categories?: string[]; // ["medical", "preference", "lifestyle"]
    executionTimeMs?: number;
  };
  /** Prompt/model configuration details */
  prompt?: {
    systemPromptLength?: number;
    dynamicContextLength?: number; // RAG + memory injected content
    modelName: string;
    contextCacheUsed?: boolean;
  };
}

// ── DTOs (API/Client responses) ───────────────────────────────────────────

export interface ReasoningStepDto {
  stepNumber: number;
  description: string;
  reasoning?: string;
  duration?: number;
  dataUsed?: string[];
}

export interface CitationDto {
  sourceType: EvidenceSourceType;
  sourceId?: string;
  title?: string;
  snippet?: string;
  relevanceScore?: number;
  usageContext?: string;
  url?: string;
}

export interface ConfidenceScoreDto {
  metric: ConfidenceMetric;
  score: number;
  label: ConfidenceLabel;
  factors?: Record<string, number>;
  rationale?: string;
}

export interface EvidenceDto {
  messageId: string;
  agentType: string;
  modelUsed?: string;
  thinkingLevel?: ThinkingLevel;
  thinkingContent?: string;
  overallConfidence?: number;
  confidenceLabel?: ConfidenceLabel;
  summary?: string;
  reasoning: ReasoningStepDto[];
  citations: CitationDto[];
  confidenceScores: ConfidenceScoreDto[];
  capturedAt: string; // ISO-8601
  processingTimeMs?: number;
  // Pipeline metadata
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  creditsUsed?: number;
  gateway?: {
    agentType: string;
    routingReason: string;
    thinkingLevel: ThinkingLevel;
  };
  rag?: {
    requested: boolean;
    used: boolean;
    reason: string;
    timedOut: boolean;
    partialFailure: boolean;
    executionTimeMs?: number;
  };
  reranking?: {
    used: boolean;
    documentsReranked?: number;
    topScores?: number[];
    executionTimeMs?: number;
  };
  memory?: {
    retrieved: boolean;
    count?: number;
    categories?: string[];
    executionTimeMs?: number;
  };
  prompt?: {
    systemPromptLength?: number;
    dynamicContextLength?: number;
    modelName: string;
    contextCacheUsed?: boolean;
  };
}

// ── Zod Schemas ───────────────────────────────────────────────────────────

export const ReasoningStepSchema = z.object({
  stepNumber: z.number().int().min(1),
  description: z.string().min(5),
  reasoning: z.string().optional(),
  duration: z.number().optional(),
  dataUsed: z.array(z.string()).optional(),
});

export const CitationSchema = z.object({
  sourceType: z.enum(["rag", "tool", "ehr", "guideline", "memory", "thinking"]),
  sourceId: z.string().optional(),
  title: z.string().optional(),
  snippet: z.string().optional(),
  relevanceScore: z.number().min(0).max(1).optional(),
  usageContext: z.string().optional(),
  url: z.url().optional(),
});

export const ConfidenceScoreSchema = z.object({
  metric: z.enum([
    "diagnostic_confidence",
    "therapeutic_confidence",
    "triage_confidence",
    "clinical_quality",
  ]),
  score: z.number().int().min(0).max(100),
  label: z.enum(["high", "medium", "low"]),
  factors: z
    .object({
      dataCompleteness: z.number().min(0).max(100).optional(),
      guidelineAlignment: z.number().min(0).max(100).optional(),
      evidenceStrength: z.number().min(0).max(100).optional(),
      contextClarity: z.number().min(0).max(100).optional(),
    })
    .optional(),
  rationale: z.string().optional(),
});

export const CaptureEvidenceSchema = z.object({
  messageId: z.string().min(1),
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  profileId: z.string().min(1),
  agentType: z.string().min(1),
  modelUsed: z.string().optional(),
  thinkingLevel: z.enum(["low", "medium", "high"]).optional(),
  thinkingContent: z.string().optional(),
  overallConfidence: z.number().int().min(0).max(100).optional(),
  confidenceLabel: z.enum(["high", "medium", "low"]).optional(),
  summary: z.string().optional(),
  reasoning: z.array(ReasoningStepSchema).optional().default([]),
  citations: z.array(CitationSchema).optional().default([]),
  confidenceScores: z.array(ConfidenceScoreSchema).optional().default([]),
  processingTimeMs: z.number().optional(),
  // Pipeline metadata
  tokenUsage: z
    .object({
      promptTokens: z.number().int().min(0),
      completionTokens: z.number().int().min(0),
      totalTokens: z.number().int().min(0),
    })
    .optional(),
  creditsUsed: z.number().int().min(0).optional(),
  gateway: z
    .object({
      agentType: z.string().min(1),
      routingReason: z.enum(["keyword", "cache", "default", "llm"]),
      thinkingLevel: z.enum(["low", "medium", "high"]),
    })
    .optional(),
  rag: z
    .object({
      requested: z.boolean(),
      used: z.boolean(),
      reason: z.enum([
        "attachment",
        "record-hint",
        "reasoning-hint",
        "short-query-skip",
        "long-query-default",
        "explicit-override",
      ]),
      timedOut: z.boolean(),
      partialFailure: z.boolean(),
      executionTimeMs: z.number().optional(),
    })
    .optional(),
  reranking: z
    .object({
      used: z.boolean(),
      documentsReranked: z.number().int().min(0).optional(),
      topScores: z.array(z.number().min(0).max(1)).optional(),
      executionTimeMs: z.number().optional(),
    })
    .optional(),
  memory: z
    .object({
      retrieved: z.boolean(),
      count: z.number().int().min(0).optional(),
      categories: z.array(z.string()).optional(),
      executionTimeMs: z.number().optional(),
    })
    .optional(),
  prompt: z
    .object({
      systemPromptLength: z.number().int().min(0).optional(),
      dynamicContextLength: z.number().int().min(0).optional(),
      modelName: z.string().min(1),
      contextCacheUsed: z.boolean().optional(),
    })
    .optional(),
});

export const QueryEvidenceSchema = z.object({
  sessionId: z.string(),
  messageId: z.string().optional(),
  minConfidence: z.number().min(0).max(100).optional(),
});

// ── Types ─────────────────────────────────────────────────────────────────

export type ReasoningStep = z.infer<typeof ReasoningStepSchema>;
export type Citation = z.infer<typeof CitationSchema>;
export type ConfidenceScore = z.infer<typeof ConfidenceScoreSchema>;
export type CaptureEvidenceInput = z.infer<typeof CaptureEvidenceSchema>;
export type QueryEvidenceInput = z.infer<typeof QueryEvidenceSchema>;

// ── Mappers ───────────────────────────────────────────────────────────────

export function toEvidenceDto(
  metadata: EvidenceMetadataDocument,
  reasoning: ReasoningStepDocument[],
  citations: CitationDocument[],
  confidenceScores: ConfidenceScoreDocument[],
): EvidenceDto {
  return {
    messageId: metadata.messageId,
    agentType: metadata.agentType,
    modelUsed: metadata.modelUsed,
    thinkingLevel: metadata.thinkingLevel,
    thinkingContent: metadata.thinkingContent,
    overallConfidence: metadata.overallConfidence,
    confidenceLabel: metadata.confidenceLabel,
    summary: metadata.summary,
    reasoning: reasoning.map((r) => ({
      stepNumber: r.stepNumber,
      description: r.description,
      reasoning: r.reasoning,
      duration: r.duration,
      dataUsed: r.dataUsed,
    })),
    citations: citations.map((c) => ({
      sourceType: c.sourceType,
      sourceId: c.sourceId,
      title: c.title,
      snippet: c.snippet,
      relevanceScore: c.relevanceScore,
      usageContext: c.usageContext,
      url: c.url,
    })),
    confidenceScores: confidenceScores.map((cs) => ({
      metric: cs.metric,
      score: cs.score,
      label: cs.label,
      factors: cs.factors,
      rationale: cs.rationale,
    })),
    capturedAt: metadata.capturedAt.toDate().toISOString(),
    processingTimeMs: metadata.processingTimeMs,
    // Pipeline metadata
    tokenUsage: metadata.tokenUsage,
    creditsUsed: metadata.creditsUsed,
    gateway: metadata.gateway,
    rag: metadata.rag,
    reranking: metadata.reranking,
    memory: metadata.memory,
    prompt: metadata.prompt,
  };
}

// ── Constants ─────────────────────────────────────────────────────────────

export const CONFIDENCE_THRESHOLDS = {
  high: 75, // scores >= 75 = high
  medium: 50, // scores >= 50 = medium
  low: 0, // scores >= 0 = low
};

export function getConfidenceLabel(score?: number): ConfidenceLabel {
  if (!score) return "low";
  if (score >= CONFIDENCE_THRESHOLDS.high) return "high";
  if (score >= CONFIDENCE_THRESHOLDS.medium) return "medium";
  return "low";
}
