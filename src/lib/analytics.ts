/**
 * Firebase Analytics (GA4) — lazy singleton, safe for SSR.
 *
 * Usage:
 *   import { trackEvent } from "@/lib/analytics";
 *   trackEvent({ name: "assessment_completed", params: { assessment_id: id } });
 *
 * Initialization happens automatically inside AnalyticsProvider on mount.
 */
import type { Analytics } from "firebase/analytics";

// ── Singleton ────────────────────────────────────────────────────────────────

let _analytics: Analytics | null = null;
let _logEvent: any = null;

/**
 * Initialize Firebase Analytics once on the client.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function initAnalytics(): Promise<void> {
  if (globalThis.window === undefined) return; // SSR guard
  if (_analytics) return;

  try {
    const { getAnalytics, isSupported, logEvent } = await import("firebase/analytics");
    const { firebaseApp } = await import("@/lib/firebase/client");

    const supported = await isSupported();
    if (supported) {
      _analytics = getAnalytics(firebaseApp);
      _logEvent = logEvent;
    }
  } catch (error) {
    console.error("Failed to initialize Firebase Analytics:", error);
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
  | {
      name: "chat_mode_changed";
      params?: { mode?: "quick" | "full"; session_id?: string };
    }
  | {
      name: "feedback_escalation_clicked";
      params?: { session_id?: string; source?: "dislike" | "report" };
    }
  | {
      name: "onboarding_tour_completed";
      params?: { steps_viewed?: number };
    }
  | {
      name: "onboarding_tour_skipped";
      params?: { steps_viewed?: number };
    }
  | {
      name: "onboarding_tour_action_clicked";
      params?: {
        action?: "upload_records" | "connect_doctor";
        step_index?: number;
      };
    }
  | {
      name: "onboarding_tour_resumed";
      params?: { step_index?: number };
    }
  | {
      name: "onboarding_tour_restarted";
      params?: { from_step_index?: number };
    }

  // Clinical
  | { name: "assessment_viewed"; params?: { assessment_id?: string } }
  | { name: "assessment_completed"; params?: { assessment_id?: string } }
  | {
      name: "assessment_validation_completed";
      params?: {
        latency_ms?: number;
        adaptive_mode?: boolean;
        condition?: string;
        estimated_questions?: number;
        session_id?: string;
      };
    }
  | {
      name: "assessment_adapted";
      params?: {
        condition?: string;
        questions_count?: number;
        session_id?: string;
      };
    }
  | {
      name: "assessment_validation_error";
      params?: {
        error_message?: string;
        condition?: string;
        session_id?: string;
      };
    }
  | { name: "soap_note_viewed"; params?: { note_id?: string } }
  | { name: "lab_report_viewed"; params?: { record_id?: string } }
  | { name: "lab_report_uploaded"; params?: { record_id?: string } }
  | { name: "lab_report_deleted"; params?: { record_id?: string } }
  | { name: "lab_report_re_extracted"; params?: { record_id?: string } }
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
  | {
      name: "patient_summary_viewed";
      params?: {
        summary_id?: string;
        version?: number;
        has_diagnoses?: boolean;
        has_recommendations?: boolean;
        missing_fields_count?: number;
        updated_by?: string;
      };
    }
  | {
      name: "patient_summary_incomplete_seen";
      params?: {
        summary_id?: string;
        version?: number;
        missing_fields?: string;
        missing_fields_count?: number;
      };
    }
  | {
      name: "patient_summary_saved";
      params?: {
        summary_id?: string;
        version?: number;
        updated_by?: string;
      };
    }
  | {
      name: "patient_summary_open_linked_session";
      params?: {
        summary_id?: string;
        session_id?: string;
        version?: number;
      };
    }
  | {
      name: "patient_summary_action_checked";
      params?: {
        summary_id?: string;
        action_item_id?: string;
        action_status?: "pending" | "done" | "skipped";
        version?: number;
      };
    }
  | {
      name: "health_record_exported";
      params?: {
        artifact_type?:
          | "assessment"
          | "summary"
          | "prescription"
          | "lab_report"
          | "file";
        format?: "pdf" | "csv" | "json";
        artifact_id?: string;
      };
    }
  | {
      name: "continuity_memory_recalled";
      params?: {
        memory_text?: string;
        category?:
          | "medical"
          | "preference"
          | "lifestyle"
          | "allergy"
          | "summary";
      };
    }
  | {
      name: "artifact_shared_with_doctor";
      params?: {
        artifact_type?:
          | "assessment"
          | "summary"
          | "prescription"
          | "lab_report";
        doctor_id?: string;
        share_id?: string;
      };
    }
  // Files
  | { name: "file_uploaded"; params?: { file_type?: string } }

  // Profile
  | { name: "profile_updated"; params?: { section?: string } }
  | { name: "dependent_added"; params?: Record<string, never> }

  // KPI Events — Phase 3
  | {
      name: "encounter_completed";
      params?: {
        outcome?: "deflected" | "escalated" | "resolved" | "abandoned";
        deflection_reason?: string;
        agent_type?: string;
        duration_ms?: number;
        session_id?: string;
      };
    }
  | {
      name: "encounter_deflected";
      params?: {
        reason?: string;
        condition?: string;
        agent_type?: string;
        session_id?: string;
      };
    }
  | {
      name: "encounter_escalated";
      params?: {
        reason?: string;
        risk_level?: "low" | "moderate" | "high" | "emergency";
        agent_type?: string;
        session_id?: string;
      };
    }
  | {
      name: "user_satisfaction_recorded";
      params?: {
        score?: number;
        liked?: boolean;
        recommended?: boolean;
        session_id?: string;
      };
    }
  | {
      name: "kpi_daily_computed";
      params?: {
        deflection_rate?: number;
        avg_resolution_time_ms?: number;
        avg_satisfaction?: number;
        date?: string;
      };
    };

// ── Public helper ────────────────────────────────────────────────────────────

/**
 * Log a typed analytics event.
 * Silently drops events before analytics is initialized (e.g. during SSR).
 */
export function trackEvent(event: AnalyticsEvent): void {
  if (!_analytics || !_logEvent) return;
  // Firebase overloads don't resolve cleanly against union types that include
  // standard GA4 reserved names — cast to a plain-string signature to bypass.
  type LogEventFn = (
    analytics: Analytics,
    name: string,
    params?: Record<string, unknown>,
  ) => void;
  (_logEvent as LogEventFn)(
    _analytics,
    event.name,
    event.params as Record<string, unknown>,
  );
}
