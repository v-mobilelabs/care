import type { UIMessage } from "ai";

/**
 * Returns the text content of the first meaningful message (user or AI)
 * to use as the session title. The hardcoded welcome message (id="welcome")
 * is excluded so it never becomes a title.
 */
export function extractFirstText(messages: UIMessage[]): string | null {
  for (const msg of messages) {
    if (msg.id === "welcome") continue;
    for (const part of msg.parts ?? []) {
      if (part.type === "text" && "text" in part && part.text) {
        return part.text;
      }
    }
  }
  return null;
}
