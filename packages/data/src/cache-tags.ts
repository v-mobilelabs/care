export const CacheTags = {
  usage: (userId: string) => `usage:${userId}`,
  profile: (userId: string) => `profile:${userId}`,
  files: (userId: string) => `files:${userId}`,
  memories: (profileId: string) => `memories:${profileId}`,
  patient: (userId: string) => `patient:${userId}`,
  medications: (userId: string) => `medications:${userId}`,
  assessments: (userId: string) => `assessments:${userId}`,
  sessions: (userId: string) => `sessions:${userId}`,
  vitals: (userId: string) => `vitals:${userId}`,
  patientSummaries: (userId: string) => `patient-summaries:${userId}`,
  conditions: (userId: string) => `conditions:${userId}`,
  symptomObservations: (userId: string) => `symptom-observations:${userId}`,
  referrals: (userId: string) => `referrals:${userId}`,
  metrics: (profileId: string) => `metrics:${profileId}`,
  medicationMatchUser: (userId: string) => `medication-match:${userId}`,
  medicationMatch: (userId: string, query: string) =>
    `medication-match:${userId}:${query}`,
} as const;
