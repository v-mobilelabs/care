/**
 * Builds personalized CareAI system instructions for Gemini Live API sessions.
 * Follows SKILL.md Career Coach bold-Markdown structure:
 *   **PERSONA:** → **CONVERSATIONAL RULES:** → **GENERAL GUIDELINES:** → **GUARDRAILS:**
 */

export interface UserProfileContext {
  readonly name?: string;
  readonly dateOfBirth?: string;
  readonly gender?: string;
  readonly city?: string;
  readonly country?: string;
  readonly heightCm?: number;
  readonly weightKg?: number;
  readonly activityLevel?: string;
  readonly bloodGroup?: string;
  readonly allergies?: readonly string[];
  readonly knownConditions?: readonly string[];
  readonly currentMedications?: readonly string[];
}

export interface SystemInstructionOptions {
  readonly profile?: Readonly<UserProfileContext>;
  readonly language?: string;
  readonly platformName?: string;
}

export class GeminiLiveSystemInstructionService {
  buildSystemInstruction(
    options: Readonly<SystemInstructionOptions> = {},
  ): string {
    const platform = options.platformName ?? "CareAI";
    const language = options.language ?? "English";
    const profile = options.profile ?? {};

    const sections: string[] = [];

    // ── **PERSONA:** ──
    sections.push("**PERSONA:**");
    sections.push(
      `You are ${platform}, a compassionate healthcare agent powered by Gemini Live. ` +
        "You specialize in active listening, validating patient concerns, and providing " +
        "evidence-based health guidance. Your tone is warm, professional, non-judgmental, " +
        `and reassuring. You speak only in ${language}.`,
    );
    const patientLine = this.buildPatientContextLine(profile);
    if (patientLine) {
      sections.push(patientLine);
    }

    // ── **CONVERSATIONAL RULES:** ──
    sections.push("");
    sections.push("**CONVERSATIONAL RULES:**");
    sections.push("");
    sections.push(...this.buildConversationalRules(profile));

    // ── **GENERAL GUIDELINES:** ──
    sections.push("");
    sections.push("**GENERAL GUIDELINES:**");
    sections.push(
      "Keep your responses short and progressively disclose more information if the patient " +
        "requests it. Don't repeat back what the patient says. Each response should be a net new " +
        "addition to the conversation, not a recap. If the patient tries to get you off track, " +
        "gently bring them back to the workflow above.",
    );

    // ── **GUARDRAILS:** ──
    sections.push("");
    sections.push("**GUARDRAILS:**");
    sections.push(...this.buildGuardrails(profile));

    // ── LANGUAGE ──
    sections.push("");
    sections.push(
      `LANGUAGE: You MUST respond in ${language}. UNMISTAKABLY RESPOND IN ${language}.`,
    );

    return sections.join("\n");
  }

  /**
   * Natural-language patient context embedded in persona.
   * Pattern: "Your current patient is Vasanth Jagadeesan, a 28-year-old male from Puducherry, India."
   */
  private buildPatientContextLine(
    profile: Readonly<UserProfileContext>,
  ): string | null {
    if (
      !profile.name &&
      !profile.gender &&
      !profile.city &&
      !profile.country &&
      !profile.dateOfBirth
    ) {
      return null;
    }

    const name = profile.name ?? "a patient";
    const descriptors: string[] = [];

    if (profile.dateOfBirth) {
      const age = this.calculateAge(profile.dateOfBirth);
      if (age != null && age >= 0) {
        descriptors.push(`${age}-year-old`);
      }
    }
    if (profile.gender) {
      descriptors.push(profile.gender.toLowerCase());
    }

    const locationParts = [profile.city, profile.country].filter(Boolean);
    const locationPhrase =
      locationParts.length > 0 ? `from ${locationParts.join(", ")}` : "";

    let line = `Your current patient is ${name}`;
    if (descriptors.length > 0) {
      line += `, a ${descriptors.join(" ")}`;
    }
    if (locationPhrase) {
      line +=
        descriptors.length > 0 ? ` ${locationPhrase}` : `, ${locationPhrase}`;
    }
    line += ".";
    return line;
  }

  private buildProfileSummary(profile: Readonly<UserProfileContext>): string {
    const parts: string[] = [];
    if (profile.heightCm && profile.weightKg) {
      const bmi = this.calculateBMI(profile.heightCm, profile.weightKg);
      parts.push(`BMI ${bmi.toFixed(1)}`);
    }
    if (profile.activityLevel) {
      parts.push(`activity level: ${profile.activityLevel}`);
    }
    if (profile.bloodGroup) {
      parts.push(`blood type: ${profile.bloodGroup}`);
    }
    return parts.length > 0 ? parts.join("; ") : "basic health profile";
  }

  /**
   * Numbered conversational rules following SKILL.md Career Coach pattern.
   * Step 1 embeds the patient context + greeting (one-time).
   * Steps 2–6 are the ongoing conversation loop.
   */
  private buildConversationalRules(
    profile: Readonly<UserProfileContext>,
  ): string[] {
    const firstName = profile.name ? profile.name.split(" ")[0] : "the patient";

    let agePhrase = "";
    if (profile.dateOfBirth) {
      const age = this.calculateAge(profile.dateOfBirth);
      if (age != null && age >= 0) {
        agePhrase = `, a ${age}-year-old`;
      }
    }

    const locationParts = [profile.city, profile.country].filter(Boolean);
    const locationPhrase =
      locationParts.length > 0 ? ` from ${locationParts.join(", ")}` : "";
    const profileSummary = this.buildProfileSummary(profile);

    return [
      `1. **Introduce yourself:** You are speaking with ${firstName}${agePhrase}${locationPhrase}. ` +
        `Your first action is to greet ${firstName} warmly by first name and validate their concern. ` +
        `Acknowledge you have their health profile: ${profileSummary}.`,
      "",
      "2. **Ask how you can help today:** Listen actively for their primary concern without judgment.",
      "",
      "3. **Clarify:** Ask clarifying questions to understand symptoms, context, duration, and severity.",
      "",
      "4. **Advise:** Provide evidence-based advice, lifestyle suggestions, or when to escalate to a healthcare provider.",
      "",
      "5. **Multiple concerns:** If they mention multiple issues, address one at a time; ask if they want to discuss others.",
      "",
      "6. **Safety escalation:** If the patient seems distressed or mentions emergencies, unmistakably prioritize safety.",
    ];
  }

  /**
   * Unified guardrails — medical + general in a single section.
   */
  private buildGuardrails(profile: Readonly<UserProfileContext>): string[] {
    const lines: string[] = [];

    // Medical guardrails
    lines.push(...this.buildAllergyGuardrails(profile));
    lines.push(...this.buildConditionGuardrails(profile));
    lines.push(...this.buildMedicationGuardrails(profile));

    // General guardrails
    lines.push("- NEVER diagnose, prescribe, or claim to be a doctor.");
    lines.push(
      "- NEVER recommend stopping medications without professional input.",
    );
    lines.push(
      "- NEVER ignore chest pain, difficulty breathing, severe bleeding, unconsciousness, or suicidal ideation.",
    );
    lines.push(
      "- When in doubt about severity, unmistakably recommend contacting a healthcare provider or emergency services.",
    );
    lines.push("- If you cannot help, be honest and escalate.");
    lines.push(
      "- If the patient is being hard on themselves, never reinforce negativity.",
    );

    return lines;
  }

  private buildAllergyGuardrails(
    profile: Readonly<UserProfileContext>,
  ): string[] {
    if (!profile.allergies || profile.allergies.length === 0) {
      return [
        "- No known allergies on file. Always ask before recommending foods, supplements, or medications.",
      ];
    }

    const allergyList = profile.allergies.join(", ");
    return [
      `- ALLERGIES: ${allergyList}`,
      `- UNMISTAKABLY AVOID recommending ANY foods, supplements, or medications containing: ${allergyList}`,
      "- Always double-check ingredient lists and ask about cross-contamination concerns.",
    ];
  }

  private buildConditionGuardrails(
    profile: Readonly<UserProfileContext>,
  ): string[] {
    if (!profile.knownConditions || profile.knownConditions.length === 0) {
      return [
        "- No known medical conditions reported. Always ask during initial assessment.",
      ];
    }

    const conditions = profile.knownConditions.join(", ");
    return [
      `- KNOWN CONDITIONS: ${conditions}`,
      `- Be aware of interactions with ${conditions}. Recommend lifestyle and dietary adjustments aligned with these.`,
      "- If a recommendation conflicts with their condition, flag it explicitly.",
    ];
  }

  private buildMedicationGuardrails(
    profile: Readonly<UserProfileContext>,
  ): string[] {
    if (
      !profile.currentMedications ||
      profile.currentMedications.length === 0
    ) {
      return [
        "- No medications reported. Always ask about current medications before recommending supplements or OTC drugs.",
      ];
    }

    const meds = profile.currentMedications.join(", ");
    return [
      `- CURRENT MEDICATIONS: ${meds}`,
      "- Check for interactions before recommending supplements, OTC drugs, or lifestyle changes.",
      "- NEVER recommend stopping or changing medication dosage.",
    ];
  }

  private calculateAge(dateOfBirth: string): number | null {
    try {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < dob.getDate())
      ) {
        age--;
      }
      return age >= 0 && age < 150 ? age : null;
    } catch {
      return null;
    }
  }

  private calculateBMI(heightCm: number, weightKg: number): number {
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  }
}
