import { getVertexProvider } from "./vertex-client.js";

/**
 * Model IDs for Vertex AI compatibility with AI SDK.
 */
export const modelIds = {
  pro: "gemini-2.5-pro",
  fast: "gemini-2.5-flash",
} as const;

/**
 * Create model instances using Vertex AI provider.
 * These work with Vercel AI SDK's generateText, streamText, and tool calling.
 */

/**
 * Get pro model instance.
 * Use for: Complex reasoning, multi-step tasks, high-quality responses.
 */
export function getProModel() {
  return getVertexProvider()(modelIds.pro);
}

/**
 * Get fast model instance.
 * Use for: Quick responses, low-latency tasks, high throughput.
 */
export function getFastModel() {
  return getVertexProvider()(modelIds.fast);
}

/**
 * Get model by tier.
 * @param tier - 'pro' for gemini-3.1-pro-preview, 'fast' for gemini-3.1-flash-lite-preview
 */
export function getModel(tier: "pro" | "fast") {
  return tier === "pro" ? getProModel() : getFastModel();
}
