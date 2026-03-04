/**
 * Firebase Analytics (GA4) — lazy singleton, safe for SSR.
 *
 * Usage:
 *   import { trackEvent } from "@/lib/analytics";
 *   trackEvent({ name: "assessment_completed", params: { assessment_id: id } });
 *
 * Initialization happens automatically inside AnalyticsProvider on mount.
 */
import {
  getAnalytics,
  isSupported,
  logEvent,
  type Analytics,
} from "firebase/analytics";
import { firebaseApp } from "@/lib/firebase/client";

// ── Singleton ────────────────────────────────────────────────────────────────

let _analytics: Analytics | null = null;

/**
 * Initialize Firebase Analytics once on the client.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function initAnalytics(): Promise<void> {
  if (typeof window === "undefined") return; // SSR guard
  if (_analytics) return;

  const supported = await isSupported();
  if (supported) {
    _analytics = getAnalytics(firebaseApp);
  }
}

// ── Typed event map ──────────────────────────────────────────────────────────

export type AnalyticsEvent =
  // Auth
  | { name: "login"; params: { method: string } }
  | { name: "logout"; params?: Record<string, never> }
  | { name: "sign_up"; params?: { method?: string } }

  // Chat
  | { name: "chat_started"; params?: { session_id?: string } }
  | { name: "chat_message_sent"; params?: { session_id?: string } }

  // Clinical
  | { name: "assessment_viewed"; params?: { assessment_id?: string } }
  | { name: "assessment_completed"; params?: { assessment_id?: string } }
  | { name: "soap_note_viewed"; params?: { note_id?: string } }
  | { name: "blood_test_viewed"; params?: { record_id?: string } }
  | { name: "vital_recorded"; params?: { vital_type?: string } }

  // Doctors
  | { name: "doctor_searched"; params?: { query?: string } }
  | { name: "doctor_selected"; params?: { doctor_id?: string } }

  // Health records
  | { name: "diet_plan_viewed"; params?: { plan_id?: string } }
  | { name: "prescription_viewed"; params?: { prescription_id?: string } }
  | { name: "medication_viewed"; params?: { medication_id?: string } }
  | { name: "insurance_viewed"; params?: Record<string, unknown> }
  | { name: "health_record_viewed"; params?: Record<string, unknown> }

  // Files
  | { name: "file_uploaded"; params?: { file_type?: string } }

  // Profile
  | { name: "profile_updated"; params?: { section?: string } }
  | { name: "dependent_added"; params?: Record<string, never> };

// ── Public helper ────────────────────────────────────────────────────────────

/**
 * Log a typed analytics event.
 * Silently drops events before analytics is initialized (e.g. during SSR).
 */
export function trackEvent(event: AnalyticsEvent): void {
  if (!_analytics) return;
  // Firebase overloads don't resolve cleanly against union types that include
  // standard GA4 reserved names — cast to a plain-string signature to bypass.
  type LogEventFn = (
    analytics: Analytics,
    name: string,
    params?: Record<string, unknown>,
  ) => void;
  (logEvent as LogEventFn)(
    _analytics,
    event.name,
    event.params as Record<string, unknown>,
  );
}
