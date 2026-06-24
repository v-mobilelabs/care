/**
 * Assessment Context Tracker
 *
 * Helps agents track assessment progress when using validated questions from adaptive assessments.
 * Maintains current question index and provides methods to update it.
 *
 * Used in AgentCallOptions to persist context across tool calls within a single stream.
 */

import type { ValidatedQuestion } from "@/data/assessments/models/assessment.model";

export interface AssessmentContextState {
  isAdaptive: boolean;
  validatedQuestions?: ValidatedQuestion[];
  currentQuestionIndex: number;
  sessionAssessmentId?: string;
}

export class AssessmentContextTracker {
  private state: AssessmentContextState;

  constructor(initialState?: Partial<AssessmentContextState>) {
    this.state = {
      isAdaptive: initialState?.isAdaptive ?? false,
      validatedQuestions: initialState?.validatedQuestions,
      currentQuestionIndex: initialState?.currentQuestionIndex ?? 0,
      sessionAssessmentId: initialState?.sessionAssessmentId,
    };
  }

  /**
   * Initialize from validateQuestions array.
   * Call this when assessment validation completes.
   */
  initializeFromValidatedQuestions(
    questions: ValidatedQuestion[],
    assessmentId: string,
  ): void {
    this.state.isAdaptive = true;
    this.state.validatedQuestions = questions;
    this.state.currentQuestionIndex = 0;
    this.state.sessionAssessmentId = assessmentId;
  }

  /**
   * Get current question number (1-indexed for display).
   */
  getCurrentQuestionNumber(): number {
    return this.state.currentQuestionIndex + 1;
  }

  /**
   * Get total questions available.
   */
  getTotalQuestions(): number {
    return this.state.validatedQuestions?.length ?? 0;
  }

  /**
   * Get current question details, or null if not in adaptive mode or index out of bounds.
   */
  getCurrentQuestion(): ValidatedQuestion | null {
    if (!this.state.isAdaptive || !this.state.validatedQuestions) {
      return null;
    }
    const q = this.state.validatedQuestions[this.state.currentQuestionIndex];
    return q ?? null;
  }

  /**
   * Advance to next question. Returns true if advanced, false if at end.
   */
  advanceQuestion(): boolean {
    if (!this.state.validatedQuestions) return false;
    if (
      this.state.currentQuestionIndex <
      this.state.validatedQuestions.length - 1
    ) {
      this.state.currentQuestionIndex++;
      return true;
    }
    return false;
  }

  /**
   * Check if assessment is complete (all questions answered/shown).
   */
  isComplete(): boolean {
    if (!this.state.validatedQuestions) return false;
    return (
      this.state.currentQuestionIndex >=
      this.state.validatedQuestions.length - 1
    );
  }

  /**
   * Get full state for serialization (e.g., storing in message metadata).
   */
  getState(): AssessmentContextState {
    return { ...this.state };
  }

  /**
   * Reset context.
   */
  reset(): void {
    this.state = {
      isAdaptive: false,
      validatedQuestions: undefined,
      currentQuestionIndex: 0,
      sessionAssessmentId: undefined,
    };
  }
}
