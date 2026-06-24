/\*\*

- Usage examples for Vertex AI models in Firebase Functions
  \*/

import { generateText, streamText } from "ai";
import { getProModel, getFastModel, getModel, modelIds } from "./model.js";

// ============================================================================
// 1. Simple text generation with models
// ============================================================================

/\*\*

- Generate text using the fast model (low-latency)
  \*/
  export async function generateFastResponse(prompt: string): Promise<string> {
  const model = getFastModel();

const { text } = await generateText({
model,
prompt,
});

return text;
}

/\*\*

- Generate text using the pro model (high-quality)
  \*/
  export async function generateProResponse(prompt: string): Promise<string> {
  const model = getProModel();

const { text } = await generateText({
model,
prompt,
});

return text;
}

/\*\*

- Generate text using dynamic model selection
  \*/
  export async function generateResponse(
  prompt: string,
  tier: "pro" | "fast" = "fast",
  ): Promise<string> {
  const model = getModel(tier);

const { text } = await generateText({
model,
prompt,
});

return text;
}

// ============================================================================
// 2. Streaming responses
// ============================================================================

/\*\*

- Stream text from model in real-time
  _/
  export async function_ streamResponse(
  prompt: string,
  tier: "pro" | "fast" = "fast",
  ): AsyncGenerator<string> {
  const model = getModel(tier);

const result = streamText({
model,
prompt,
});

for await (const chunk of result.textStream) {
yield chunk;
}
}

// ============================================================================
// 3. Structured output with models (zod schema)
// ============================================================================

import { z } from "zod";

/\*\*

- Generate structured output (e.g., JSON)
  \*/
  export async function generateStructuredResponse<T extends z.ZodSchema>(
  prompt: string,
  schema: T,
  tier: "pro" | "fast" = "fast",
  ): Promise<z.infer<T>> {
  const model = getModel(tier);

const { object } = await text({
model,
prompt,
output: Output.object({ schema }),
});

return object;
}

// ============================================================================
// 4. Tool use / function calling
// ============================================================================

/\*\*

- Example tool for weather information
  \*/
  const weatherTool = {
  description: "Get weather information for a location",
  parameters: z.object({
  location: z.string().describe("City and state"),
  unit: z.enum(["c", "f"]).describe("Temperature unit"),
  }),
  execute: async ({
  location,
  unit,
  }: {
  location: string;
  unit: "c" | "f";
  }) => {
  // In real app, call weather API
  return `Weather in ${location}: 72°${unit.toUpperCase()} and sunny`;
  },
  };

/\*\*

- Generate response with tool use
  \*/
  export async function generateWithTools(
  prompt: string,
  tier: "pro" | "fast" = "fast",
  ): Promise<string> {
  const model = getModel(tier);

const { text } = await generateText({
model,
prompt,
tools: {
getWeather: weatherTool,
},
});

return text;
}

// ============================================================================
// 5. Practical example: Chat service
// ============================================================================

interface ChatMessage {
role: "user" | "assistant";
content: string;
}

/\*\*

- Multi-turn chat with context
  \*/
  export async function chatWithContext(
  messages: ChatMessage[],
  systemPrompt?: string,
  ): Promise<string> {
  const model = getFastModel(); // Use fast model for chat

const { text } = await generateText({
model,
system: systemPrompt || "You are a helpful healthcare assistant.",
messages: messages.map((m) => ({
role: m.role,
content: m.content,
})),
});

return text;
}

// ============================================================================
// 6. Complex reasoning with pro model
// ============================================================================

/\*\*

- Use pro model for complex medical analysis
  \*/
  export async function analyzeMedicalCase(
  patientContext: string,
  question: string,
  ): Promise<string> {
  const model = getProModel(); // Use pro for quality

const { text } = await generateText({
model,
prompt: `## Patient Context\n${patientContext}\n\n## Question\n${question}\n\nProvide a detailed analysis.`,
});

return text;
}

// ============================================================================
// Usage in Firebase Function route handler
// ============================================================================

/\*\*

- Example: Use in chat API route
-
- In functions/src/routes/chat.ts:
-
- ```typescript

  ```
- import { generateFastResponse, streamResponse } from "../lib/model-usage.js";
-
- router.post("/api/v1/chat", async (req, res) => {
- const { uid } = (req as any).auth;
- const { message, streaming } = req.body;
-
- try {
-     if (streaming) {
-       // Stream response
-       res.setHeader("Content-Type", "text/event-stream");
-       for await (const chunk of streamResponse(message)) {
-         res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
-       }
-       res.end();
-     } else {
-       // Regular response
-       const response = await generateFastResponse(message);
-       res.status(200).json({ response, uid });
-     }
- } catch (error) {
-     res.status(500).json({ error: "Failed to generate response" });
- }
- });
- ```
  */
  ```

// ============================================================================
// Model Selection Guide
// ============================================================================

/\*\*

- QUICK REFERENCE:
-
- Fast Model (gemini-3.1-flash-lite-preview):
- ✓ Use for: Quick responses, chat, real-time interactions
- ✓ Latency: ~100-500ms
- ✓ Cost: Lower
- ✓ Quality: Good for most tasks
-
- Pro Model (gemini-3.1-pro-preview):
- ✓ Use for: Complex reasoning, medical analysis, detailed explanations
- ✓ Latency: ~500-2000ms
- ✓ Cost: Higher
- ✓ Quality: Best available
-
- When to choose:
- - Casual chat / questions → fast
- - Medical analysis / diagnosis → pro
- - Search results ranking → fast
- - Patient summary generation → pro
- - Real-time interactions → fast
- - Offline/batch processing → pro
    \*/
