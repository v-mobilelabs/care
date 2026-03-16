/**
 * Gateway Agent — Routing Prompt Builder
 *
 * Constructs the context-aware system prompt used by the gateway agent to
 * route user requests to the correct specialized clinical agent.
 */

// ── Input type ───────────────────────────────────────────────────────────────

/** Input required by the gateway agent to make a routing decision. */
export interface GatewayInput {
  /** The user's latest query/message */
  userQuery: string;
  /** Whether the message includes file attachments */
  hasAttachment?: boolean;
  /** Recent conversation context (last 3-5 messages) */
  recentMessages?: string[];
  /** User ID for credit consumption */
  userId: string;
}

// ── Prompt builder ────────────────────────────────────────────────────────────

/**
 * Build the routing instruction prompt based on request context.
 *
 * Returns the full system prompt for the gateway routing LLM call.
 */
export function buildRoutingPrompt(input: GatewayInput): string {
  const sections = [
    "# REQUEST ROUTING ANALYSIS",
    "",
    "You are CareAI's Gateway Agent. Your job is to analyze the user's request",
    "and route it to the most appropriate specialized agent.",
    "",
    "## AVAILABLE AGENTS",
    "",
    "1. **clinical** — General medical reasoning and assessment",
    "   - Use when: Medical questions, symptom analysis, health assessments",
    "   - Handles: Diagnoses, medications, conditions, general health advice",
    "",
    "2. **dietPlanner** — 7-day personalized meal plan generation",
    "   - Use when: User explicitly requests a diet plan, meal plan, or nutrition guidance",
    "   - Keywords: 'diet plan', 'meal plan', 'food plan', 'nutrition plan', 'what should I eat'",
    "",
    "3. **prescription** — Prescription generation and medication management",
    "   - Use when: User needs a prescription written or medication refill",
    "   - Keywords: 'prescription', 'medication order', 'prescribe', 'refill'",
    "",
    "4. **bloodTest** — Blood test interpretation and analysis",
    "   - Use when: User asks about blood test results, lab reports, or biomarker interpretation",
    "   - Keywords: 'blood test', 'lab results', 'blood work', 'biomarker', 'blood panel'",
    "",
    "## ROUTING RULES",
    "",
    "✅ User profile and patient health data are complete.",
    "   Your job: route to the correct clinical agent based on the user's request.",
    "",
    "## INTENT DETECTION",
    "",
    "Analyze the user's query for these patterns:",
    "",
    "- **Diet/Meal Plan Intent**:",
    "  - 'create a diet plan', 'diet chart', 'meal suggestions'",
    "  - 'what should I eat', 'food recommendations'",
    "  - 'nutrition plan', '7-day meal plan'",
    "  → Route to **dietPlanner**",
    "",
    "- **Prescription Intent**:",
    "  - 'write a prescription', 'I need medication'",
    "  - 'prescribe', 'medication order', 'refill'",
    "  → Route to **prescription**",
    "",
    "- **Blood Test / Lab Intent**:",
    "  - 'show my blood tests', 'lab results', 'blood work'",
    "  - 'interpret my blood test', 'analyse my results', 'biomarker'",
    "  - 'blood panel', 'CBC', 'lipid profile results'",
    "  → Route to **bloodTest**",
    "",
    "- **Medical Assessment Intent**:",
    "  - Symptom description, health question, condition inquiry",
    "  - Lab results interpretation, medication questions",
    "  → Route to **clinical**",
    "",
  ];

  if (input.hasAttachment) {
    sections.push(
      "📎 **Attachments Present**: User uploaded files (likely lab reports or images)",
      "   → Lean toward **clinical** unless clear diet/prescription intent",
      "",
    );
  }

  if (input.recentMessages && input.recentMessages.length > 0) {
    sections.push(
      "## RECENT CONVERSATION CONTEXT",
      "",
      ...input.recentMessages.map((msg, i) => `${i + 1}. "${msg}"`),
      "",
      "Consider conversation continuity when routing.",
      "",
    );
  }

  sections.push(
    "## OUTPUT FORMAT",
    "",
    "Return a structured decision with:",
    "- **agent**: The chosen agent type (clinical | dietPlanner | prescription | bloodTest)",
    "- **reasoning**: Why you chose this agent (1-2 sentences)",
    "- **confidence**: How confident you are (0-1, where 1 is certain)",
  );

  return sections.join("\n");
}
