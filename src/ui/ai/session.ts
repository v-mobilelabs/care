import type { UIMessage } from "ai";

export const getWelcomeMessage = (name?: string | null): UIMessage[] => {
  const greeting = name ? `Hi ${name},` : "Hi there,";
  return [
    {
      id: "welcome",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: `${greeting} I'm glad you're here. 👋\n\nTell me what's been going on — whether it's a symptom that's been bothering you, a condition you've been dealing with, a medication you're taking, or just something you'd like to understand better.\n\nThere's no wrong way to start. Share whatever feels most relevant and we'll work through it together.`,
        },
      ],
    },
  ];
};
