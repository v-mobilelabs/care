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

const BASE_PROMPT_SECTIONS = [
  "# REQUEST ROUTING ANALYSIS",
  "",
  "You are CareAI's Gateway Agent. Your job is to analyze the user's request",
  "and route it to the most appropriate specialized agent.",
  "",
  "## AVAILABLE AGENTS",
  "",
  "1. **generalMedicine** — General medical reasoning and assessment",
  "   - Use when: broad symptom analysis, likely causes, next steps",
  "   - This is the DEFAULT for generic clinical concerns that are not clearly specialist-specific",
  "",
  "2. **triageNurse** — Intake triage fallback for ambiguous/underspecified requests",
  "   - Use ONLY when there is not enough information to route safely to a specialist or generalMedicine",
  "   - Example: greeting-only messages, 'help', or requests with no body system / symptom clue",
  "",
  "3. **neurology** — Neurology-focused symptom analysis",
  "   - Use when: headache, migraine, seizure, numbness, tingling, vertigo, memory concerns",
  "",
  "4. **Specialties** — Route when clear signal exists:",
  "   cardiology, mentalHealth, dermatology, pediatrics, womensHealth, orthopedics,",
  "   gastroenterology, endocrinology, urology, radiology, dentistry, nutrition,",
  "   immunology, ent, ophthalmology, nephrology",
  "",
  "5. **dietPlanner** — 7-day personalized meal plan generation",
  "   - Use when: User explicitly requests a diet plan, meal plan, or nutrition guidance",
  "   - Keywords: 'diet plan', 'meal plan', 'food plan', 'nutrition plan', 'what should I eat'",
  "",
  "6. **prescription** — Prescription generation and medication management",
  "   - Use when: User needs a prescription written or medication refill",
  "   - Keywords: 'prescription', 'medication order', 'prescribe', 'refill'",
  "",
  "7. **labReport** — Lab report interpretation and analysis",
  "   - Use when: User asks about blood test results, lab reports, or biomarker interpretation",
  "   - Keywords: 'blood test', 'lab results', 'blood work', 'biomarker', 'blood panel'",
  "",
  "8. **patient** — Personal profile and own records retrieval",
  "   - Use when: user asks about their own profile, medications, or stored personal health data",
  "",
  "## ROUTING RULES",
  "",
  "✅ User profile and patient health data are complete.",
  "   Your job: route to the correct clinical agent based on the user's request.",
  "✅ Prefer routing DIRECTLY to a specialist whenever the body system or intent is clear.",
  "✅ If the query is clinical but not specialist-specific (e.g. fever, chills, cough, fatigue, infection, general illness), route to **generalMedicine**.",
  "⚠️ Use **triageNurse** only as the fallback when the message is too vague to route safely.",
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
  "  → Route to **labReport**",
  "",
  "- **Neurology Intent**:",
  "  - headache, migraine, seizure, numbness, tingling, vertigo, memory issues",
  "  → Route to **neurology**",
  "",
  "- **General Medical Assessment Intent**:",
  "  - Symptom description, health question, condition inquiry",
  "  - Broad medical concerns not clearly specialist-specific",
  "  - Fever, chills, cough, flu-like illness, fatigue, body aches, infection concerns",
  "  → Route to **generalMedicine**",
  "",
  "- **Triage Fallback Intent**:",
  "  - Greeting-only, vague requests with no clinical clue, or insufficient detail to route safely",
  "  - Examples: 'hi', 'hello', 'help', 'can you help me', 'not sure where to start'",
  "  → Route to **triageNurse**",
  "",
] as const;

const OUTPUT_FORMAT_SECTION = [
  "## DECISION",
  "",
  "Return ONLY the agent name — nothing else.",
  "Prefer any specialist or **generalMedicine** over **triageNurse**.",
  "Use **triageNurse** only if impossible to route safely.",
] as const;

function buildAttachmentSection(hasAttachment?: boolean): string[] {
  if (!hasAttachment) return [];
  return [
    "📎 **Attachments Present**: User uploaded files (medical images or lab reports)",
    "   **Attachment Routing Logic:**",
    "   - Medical images (X-Ray, CT, ultrasound, DICOM) → **radiology** (for diagnostic report)",
    "   - Lab reports (blood tests, pathology) → Route to specialist based on result type:",
    "     • Cardiac markers, BNP, ECG → **cardiology**",
    "     • Glucose, HbA1c, TSH, thyroid → **endocrinology**",
    "     • CBC, WBC abnormalities → **generalMedicine**",
    "     • Kidney function (creatinine, BUN) → **nephrology**",
    "     • Liver enzymes (AST, ALT, bilirubin) → **generalMedicine** or specialist",
    "     • Generic lab results → **labReport** agent for detailed analysis",
    "   - Other documents → Route based on content and user query",
    "",
  ];
}

function buildRecentMessagesSection(recentMessages?: string[]): string[] {
  if (!recentMessages || recentMessages.length === 0) return [];
  return [
    "## RECENT CONVERSATION CONTEXT",
    "",
    ...recentMessages.map((msg, i) => `${i + 1}. "${msg}"`),
    "",
    "Consider conversation continuity when routing.",
    "",
  ];
}

// ── Prompt builder ────────────────────────────────────────────────────────────

/**
 * Build the routing instruction prompt based on request context.
 *
 * Returns the full system prompt for the gateway routing LLM call.
 */
export function buildRoutingPrompt(input: GatewayInput): string {
  return [
    ...BASE_PROMPT_SECTIONS,
    ...buildAttachmentSection(input.hasAttachment),
    ...buildRecentMessagesSection(input.recentMessages),
    ...OUTPUT_FORMAT_SECTION,
  ].join("\n");
}
