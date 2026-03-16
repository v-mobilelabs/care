// Usage model for monthly usage tracking with lazy reset
export type Usage = Readonly<{
  profile: string; // profile id or user id
  credits: number;
  minutes: number;
  storage: number; // in MB or bytes
  lastReset: string; // ISO date string (YYYY-MM)
}>;
