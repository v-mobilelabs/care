import type { UIMessagePart, UIDataTypes, UITools } from "ai";

// ── Tool input types ──────────────────────────────────────────────────────────

export type Severity = "mild" | "moderate" | "severe" | "critical";
export type RiskLevel = "low" | "moderate" | "high" | "emergency";

export interface ConditionInput {
  name: string;
  icd10?: string;
  severity: Severity;
  status: "suspected" | "probable" | "confirmed";
  description: string;
  symptoms: string[];
}

export type QuestionType =
  | "yes_no"
  | "single_choice"
  | "multi_choice"
  | "scale"
  | "free_text";

export interface AskQuestionInput {
  question: string;
  type: QuestionType;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  /** Current question number in assessment (1-indexed) */
  currentQuestion?: number;
  /** Total questions in assessment */
  totalQuestions?: number;
  /** Validated questions array from adaptive assessment */
  validatedQuestions?: Array<{
    question: string;
    type: "text" | "choice" | "scale" | "binary";
    options?: string[];
    rationale?: string;
  }>;
}

export interface StartAssessmentInput {
  title: string;
  condition: string;
  guideline: string;
  estimatedQuestions: number;
  estimatedMinutes: string;
  /** Validated questions from adaptive assessment */
  validatedQuestions?: Array<{
    question: string;
    type: "text" | "choice" | "scale" | "binary";
    options?: string[];
    rationale?: string;
  }>;
}

// ── Tool part helpers ─────────────────────────────────────────────────────────

export interface ToolPart {
  type: string;
  toolCallId?: string;
  state?: string;
  output?: unknown;
}

/**
 * Returns true if a message part is a tool part.
 * Works on plain objects — unlike the SDK's isToolUIPart which requires
 * internal SDK metadata that DB-deserialized parts don't have.
 */
export function isToolPart(
  part: UIMessagePart<UIDataTypes, UITools>,
): part is UIMessagePart<UIDataTypes, UITools> & ToolPart;
export function isToolPart(part: unknown): part is ToolPart;
export function isToolPart(part: unknown): boolean {
  const p = part as ToolPart;
  return typeof p.type === "string" && p.type.startsWith("tool-");
}

export function getToolPartState(
  part: UIMessagePart<UIDataTypes, UITools>,
): string | null {
  const p = part as unknown as { state?: string };
  return p.state ?? null;
}

export function getToolPartName(
  part: UIMessagePart<UIDataTypes, UITools>,
): string | null {
  // Use type string directly so this works on plain JSON-deserialized objects
  // (isToolUIPart guard fails on those because they lack internal SDK metadata).
  const p = part as unknown as { type?: string; toolName?: string };
  if (typeof p.type === "string" && p.type.startsWith("tool-")) {
    return p.type.slice(5);
  }
  return p.toolName ?? null;
}

export function extractToolInput<T>(
  part: UIMessagePart<UIDataTypes, UITools>,
  toolName: string,
): T | null {
  const name = getToolPartName(part);
  if (name !== toolName) return null;
  const state = getToolPartState(part);
  if (state === "input-streaming") return null;
  // Live SDK parts use `args`; DB-deserialized parts use `input`.
  const p = part as unknown as { input?: T; args?: T };
  const data = p.input ?? p.args ?? null;
  if (data == null) return null;
  return data;
}

export function extractToolOutput<T>(
  part: UIMessagePart<UIDataTypes, UITools>,
  toolName: string,
): T | null {
  const name = getToolPartName(part);
  if (name !== toolName) return null;
  const state = getToolPartState(part);
  if (state === "input-streaming") return null;
  const p = part as unknown as { output?: T };
  if (p.output == null) return null;
  return p.output;
}

// ── Answer tracking helpers ───────────────────────────────────────────────────

export function addToMap(
  prev: ReadonlyMap<string, string>,
  id: string,
  value: string,
): ReadonlyMap<string, string> {
  const next = new Map(prev);
  next.set(id, value);
  return next;
}
