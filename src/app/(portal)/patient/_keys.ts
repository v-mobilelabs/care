/**
 * Shared TanStack Query key factory — no "use client", safe to import in
 * both server components (for prefetchQuery) and client hooks (via _query.ts).
 */

export const chatKeys = {
  sessions: (profileId?: string) =>
    profileId
      ? (["chat", "sessions", profileId] as const)
      : (["chat", "sessions"] as const),
  session: (sessionId: string) => ["chat", "session", sessionId] as const,
  messages: (sessionId: string) => ["chat", "messages", sessionId] as const,
  credits: () => ["chat", "credits"] as const,
  files: () => ["chat", "files"] as const,
  storageMetrics: () => ["chat", "storage-metrics"] as const,
  prescriptions: () => ["chat", "prescriptions"] as const,
  medications: () => ["chat", "medications"] as const,
  dietPlans: () => ["chat", "diet-plans"] as const,
  doctors: () => ["chat", "doctors"] as const,
  doctorInvites: () => ["doctor-invites"] as const,
  usage: () => ["chat", "usage"] as const,
  assessments: () => ["chat", "assessments"] as const,
  memories: () => ["chat", "memories"] as const,
  assessment: (assessmentId: string) =>
    ["chat", "assessments", assessmentId] as const,
  profile: () => ["chat", "profile"] as const,
  labReports: () => ["chat", "lab-reports"] as const,
  bloodTests: () => ["chat", "blood-tests"] as const,
  callMetrics: () => ["chat", "call-metrics"] as const,
  vitals: () => ["chat", "vitals"] as const,
  patientDetails: () => ["patient", "details"] as const,
  patientSummaries: () => ["chat", "patient-summaries"] as const,
  callHistory: () => ["meet", "history"] as const,
  referrals: () => ["chat", "referrals"] as const,
} as const;
