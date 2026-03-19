/**
 * Client-side loading hints for chat interface.
 * Determines contextual loading messages and estimated wait times.
 */

export type AgentType = "onboarding" | "clinical" | "dietPlanner" | "prescription";

/**
 * Agent-specific loading messages for better user experience
 */
const AGENT_LOADING_MESSAGES: Record<AgentType, string[]> = {
  onboarding: [
    "Setting up your profile…",
    "Getting to know you better…",
    "Personalizing your experience…",
  ],
  clinical: [
    "Analyzing your health data…",
    "Reviewing medical guidelines…",
    "Preparing clinical assessment…",
  ],
  dietPlanner: [
    "Creating your personalized meal plan…",
    "Calculating nutritional requirements…",
    "Planning your weekly menu…",
  ],
  prescription: [
    "Reviewing medication options…",
    "Checking drug interactions…",
    "Preparing your prescription…",
  ],
};

/**
 * Gets agent-specific loading message
 */
export function getAgentLoadingMessage(agentType: AgentType): string {
  const messages = AGENT_LOADING_MESSAGES[agentType] || AGENT_LOADING_MESSAGES.clinical;
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Determines if a query is likely to be a long-running operation.
 */
export function isLongRunningQuery(userQuery: string): boolean {
  const query = userQuery.toLowerCase();

  return (
    query.includes("diet plan") ||
    query.includes("meal plan") ||
    query.includes("weekly plan") ||
    query.includes("comprehensive") ||
    query.includes("detailed analysis") ||
    query.includes("full assessment") ||
    query.includes("complete analysis")
  );
}

/**
 * Returns an estimated wait time message for complex operations.
 */
export function getEstimatedWaitTime(userQuery: string): string | null {
  const query = userQuery.toLowerCase();

  if (
    query.includes("diet plan") ||
    query.includes("meal plan") ||
    query.includes("weekly plan")
  ) {
    return "Complex planning typically takes 15-20 seconds";
  }

  if (
    query.includes("comprehensive") ||
    query.includes("full assessment") ||
    query.includes("complete analysis")
  ) {
    return "Detailed analysis may take 10-15 seconds";
  }

  // No estimated time for quick queries
  return null;
}

/**
 * Gets a contextual loading hint based on the user's query.
 */
export function getContextualLoadingHint(userQuery: string): string | null {
  const query = userQuery.toLowerCase();

  // Medical records & history
  if (
    query.includes("history") ||
    query.includes("records") ||
    query.includes("past") ||
    query.includes("previous")
  ) {
    return "Reviewing your medical history...";
  }

  // Symptoms & assessment
  if (
    query.includes("symptom") ||
    query.includes("feel") ||
    query.includes("pain") ||
    query.includes("ache") ||
    query.includes("hurt") ||
    query.includes("sick") ||
    query.includes("unwell")
  ) {
    return "Analyzing your symptoms...";
  }

  // Medications & prescriptions
  if (
    query.includes("medication") ||
    query.includes("medicine") ||
    query.includes("prescription") ||
    query.includes("drug") ||
    query.includes("pill")
  ) {
    return "Checking medications...";
  }

  // Test results & lab work
  if (
    query.includes("test") ||
    query.includes("result") ||
    query.includes("lab") ||
    query.includes("blood") ||
    query.includes("scan") ||
    query.includes("x-ray") ||
    query.includes("report")
  ) {
    return "Reviewing test results...";
  }

  // Diet & nutrition
  if (
    query.includes("diet") ||
    query.includes("food") ||
    query.includes("nutrition") ||
    query.includes("eat") ||
    query.includes("meal")
  ) {
    return "Preparing nutrition guidance...";
  }

  // Vitals & measurements
  if (
    query.includes("blood pressure") ||
    query.includes("weight") ||
    query.includes("bmi") ||
    query.includes("temperature") ||
    query.includes("heart rate") ||
    query.includes("vital")
  ) {
    return "Checking your vitals...";
  }

  // Default for unknown queries
  return null;
}
