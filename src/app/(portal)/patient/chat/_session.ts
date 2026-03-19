import type { UIMessage } from "ai";

// ── Session persistence ───────────────────────────────────────────────────────

export const SESSION_KEY = (id: string) => `careai-session-${id}`;

export interface PersistedSession {
  messages: UIMessage[];
  answeredIds: string[];
  title?: string;
  createdAt?: number;
}

export function loadSession(id: string): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY(id));
    return raw ? (JSON.parse(raw) as PersistedSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(
  id: string,
  messages: UIMessage[],
  answeredIds: ReadonlySet<string>,
) {
  if (typeof window === "undefined") return;
  try {
    const existing = loadSession(id);
    // Use first text from any message except the hardcoded welcome message.
    let title = "New Assessment";
    for (const msg of messages) {
      if (msg.id === "welcome") continue;
      const textPart = msg.parts?.find((p) => p.type === "text");
      if (textPart && "text" in textPart && textPart.text) {
        title = (textPart as { type: "text"; text: string }).text.slice(0, 60);
        break;
      }
    }
    localStorage.setItem(
      SESSION_KEY(id),
      JSON.stringify({
        messages,
        answeredIds: Array.from(answeredIds),
        title,
        createdAt: existing?.createdAt ?? Date.now(),
      }),
    );
  } catch {
    /* ignore storage quota errors */
  }
}

export function listSessions(): Array<{
  id: string;
  title: string;
  createdAt: number;
}> {
  if (typeof window === "undefined") return [];
  const result: Array<{ id: string; title: string; createdAt: number }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith("careai-session-")) continue;
    const id = key.replace("careai-session-", "");
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw) as PersistedSession;
      result.push({
        id,
        title: data.title ?? "New Assessment",
        createdAt: data.createdAt ?? 0,
      });
    } catch {
      /* skip corrupt entries */
    }
  }
  return result.sort((a, b) => b.createdAt - a.createdAt);
}

// ── Initial messages ──────────────────────────────────────────────────────────

export const INITIAL_MESSAGES: UIMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "Hi there, I'm glad you're here. 👋\n\nTell me what's been going on — whether it's a symptom that's been bothering you, a condition you've been dealing with, a medication you're taking, or just something you'd like to understand better.\n\nThere's no wrong way to start. Share whatever feels most relevant and we'll work through it together.",
      },
    ],
  },
];

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
