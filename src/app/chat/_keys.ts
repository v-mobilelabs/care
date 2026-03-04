/**
 * Shared TanStack Query key factory — no "use client", safe to import in
 * both server components (for prefetchQuery) and client hooks (via _query.ts).
 */

export const chatKeys = {
  sessions: () => ["chat", "sessions"] as const,
  messages: (sessionId: string) => ["chat", "messages", sessionId] as const,
  credits: () => ["chat", "credits"] as const,
  conditions: () => ["chat", "conditions"] as const,
  soapNotes: () => ["chat", "soap-notes"] as const,
  soapNote: (noteId: string) => ["chat", "soap-notes", noteId] as const,
  files: () => ["chat", "files"] as const,
  prescriptions: () => ["chat", "prescriptions"] as const,
  medications: () => ["chat", "medications"] as const,
  dietPlans: () => ["chat", "diet-plans"] as const,
  doctors: () => ["chat", "doctors"] as const,
  assessments: () => ["chat", "assessments"] as const,
  drugs: (q: string) => ["chat", "drugs", q] as const,
  assessment: (assessmentId: string) =>
    ["chat", "assessments", assessmentId] as const,
  profile: () => ["chat", "profile"] as const,
  dependents: () => ["chat", "dependents"] as const,
  insurance: () => ["chat", "insurance"] as const,
  bloodTests: () => ["chat", "blood-tests"] as const,
} as const;
