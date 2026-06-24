// ── Prompt ID ─────────────────────────────────────────────────────────────────
export type PromptId = "clinical-system";

// ── DTO ───────────────────────────────────────────────────────────────────────
export interface PromptDto {
  id: PromptId;
  content: string;
}

// ── Input schemas ─────────────────────────────────────────────────────────────
export interface GetPromptInput {
  id: PromptId;
}
