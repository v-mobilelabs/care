/**
 * Determines an appropriate contextual loading message based on the user's query.
 * This makes the loading state more engaging and informative.
 */
export function getLoadingHint(userQuery: string): string {
  const query = userQuery.toLowerCase();

  // Complex queries that may take longer (show estimated wait time)
  if (
    query.includes("diet plan") ||
    query.includes("meal plan") ||
    query.includes("comprehensive") ||
    query.includes("detailed analysis") ||
    query.includes("full assessment")
  ) {
    return "Preparing detailed plan... (this may take 15-20 seconds)";
  }

  return getBasicLoadingHint(userQuery);
}

/**
 * Returns basic loading hints for common query types.
 */
function getBasicLoadingHint(userQuery: string): string {
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

  // Appointments & scheduling
  if (
    query.includes("appointment") ||
    query.includes("schedule") ||
    query.includes("booking") ||
    query.includes("available")
  ) {
    return "Checking availability...";
  }

  // Conditions & diagnosis
  if (
    query.includes("condition") ||
    query.includes("diagnosis") ||
    query.includes("disease") ||
    query.includes("disorder")
  ) {
    return "Reviewing your conditions...";
  }

  // Questions (general inquiry)
  if (
    query.startsWith("what") ||
    query.startsWith("how") ||
    query.startsWith("why")
  ) {
    return "Gathering information...";
  }

  // Image/file analysis
  if (
    query.includes("image") ||
    query.includes("photo") ||
    query.includes("picture")
  ) {
    return "Analyzing image...";
  }

  // Default fallback
  return "Processing your request...";
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
