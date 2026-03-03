// ── Prompt ID ─────────────────────────────────────────────────────────────────
export type PromptId =
  | "clinical-system"
  | "prescription-extraction"
  | "insurance-extraction";

// ── DTO ───────────────────────────────────────────────────────────────────────
export interface PromptDto {
  id: PromptId;
  content: string;
}

// ── Input schemas ─────────────────────────────────────────────────────────────
export interface GetPromptInput {
  id: PromptId;
}
