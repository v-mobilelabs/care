/**
 * Assessment Metrics Service
 *
 * Tracks performance and adaptation metrics for adaptive assessments:
 * - Validation latency (milliseconds)
 * - Adaptation frequency (number of times adaptive mode was triggered)
 * - Logs to console in dev, Firebase Analytics in prod
 */

import { trackEvent } from "@/lib/analytics";

export interface AssessmentMetrics {
  validationLatencyMs: number;
  adaptiveMode: boolean;
  condition: string;
  guideline: string;
  estimatedQuestions: number;
  sessionId: string;
  userId: string;
}

class AssessmentMetricsService {
  private validationStartTimes = new Map<string, number>();

  /**
   * Start timing a validation operation.
   * Call this before validation begins.
   */
  startValidationTimer(assessmentId: string): void {
    this.validationStartTimes.set(assessmentId, Date.now());
  }

  /**
   * Record validation completion and log metrics.
   * Call this after validation completes.
   */
  recordValidation(assessmentId: string, metrics: AssessmentMetrics): void {
    const startTime = this.validationStartTimes.get(assessmentId);
    if (!startTime) {
      console.warn(
        `[AssessmentMetrics] No timer found for assessment ${assessmentId}`,
      );
      return;
    }

    const latencyMs = Date.now() - startTime;
    this.validationStartTimes.delete(assessmentId);

    // Dev logging
    console.log(
      `[AssessmentMetrics] Validation completed in ${latencyMs}ms for assessment: ${metrics.condition}`,
      {
        adaptiveMode: metrics.adaptiveMode,
        estimatedQuestions: metrics.estimatedQuestions,
        guideline: metrics.guideline,
        latencyMs,
      },
    );

    // Firebase Analytics (GA4)
    trackEvent({
      name: "assessment_validation_completed",
      params: {
        latency_ms: latencyMs,
        adaptive_mode: metrics.adaptiveMode,
        condition: metrics.condition,
        estimated_questions: metrics.estimatedQuestions,
        session_id: metrics.sessionId,
      },
    });
  }

  /**
   * Log adaptation frequency event.
   * Call this when adaptive questions are validated.
   */
  recordAdaptation(
    userId: string,
    sessionId: string,
    condition: string,
    questionsCount: number,
  ): void {
    console.log(
      `[AssessmentMetrics] Adaptive assessment triggered: ${condition} (${questionsCount} questions)`,
    );

    trackEvent({
      name: "assessment_adapted",
      params: {
        condition,
        questions_count: questionsCount,
        session_id: sessionId,
      },
    });
  }

  /**
   * Log validation error for monitoring.
   */
  recordValidationError(
    assessmentId: string,
    error: Error,
    context: {
      userId: string;
      sessionId: string;
      condition: string;
    },
  ): void {
    console.error(
      `[AssessmentMetrics] Validation error for assessment ${assessmentId}:`,
      error,
      context,
    );

    trackEvent({
      name: "assessment_validation_error",
      params: {
        error_message: error.message,
        condition: context.condition,
        session_id: context.sessionId,
      },
    });

    // Clear timer
    this.validationStartTimes.delete(assessmentId);
  }

  /**
   * Get current validation latency for an ongoing operation.
   * Returns null if timer not found.
   */
  getCurrentLatency(assessmentId: string): number | null {
    const startTime = this.validationStartTimes.get(assessmentId);
    if (!startTime) return null;
    return Date.now() - startTime;
  }
}

export const assessmentMetricsService = new AssessmentMetricsService();
