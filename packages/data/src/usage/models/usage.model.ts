// Usage model for monthly usage tracking with lazy reset
export type Usage = Readonly<{
  profile: string; // Auth user uid (document id in usage/{uid})
  credits: number;
  minutes: number;
  storage: number; // in MB or bytes
  lastReset: string; // ISO date string (YYYY-MM)
}>;
