import { google } from "@/data/shared/service/vertex-provider";

type SharedThinkingLevel = "low" | "medium" | "high";

export const modelIds = {
  pro: "gemini-3.1-pro-preview",
  fast: "gemini-3.1-flash-lite-preview",
  lite: "gemini-3.1-flash-lite-preview",
  embedding: "gemini-embedding-001",
  vision: "gemini-2.5-flash",
  backgroundLite: "gemini-2.5-flash-lite",
  tts: "gemini-2.5-flash-preview-tts",
} as const;

/**
 * Shared Gemini model instances used by the main chat runtime and AI service.
 * Keep the commonly reused chat models centralized here so routing, metadata,
 * and factory defaults stay in sync.
 */
export const sharedModels = {
  pro: google(modelIds.pro),
  fast: google(modelIds.fast),
  lite: google(modelIds.lite),
} as const;

export function getModelIdForThinkingLevel(
  thinkingLevel?: SharedThinkingLevel,
): string {
  return thinkingLevel === "low" ? modelIds.fast : modelIds.pro;
}
