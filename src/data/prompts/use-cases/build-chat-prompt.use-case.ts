import { z } from "zod";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { promptService } from "../service/prompt.service";
import { profileRepository } from "@/data/profile/repositories/profile.repository";
import { patientRepository } from "@/data/patients/repositories/patient.repository";
import { dependentRepository } from "@/data/dependents/repositories/dependent.repository";

// ── Input Schema ──────────────────────────────────────────────────────────────

export const BuildChatPromptSchema = z.object({
  userId: z.string().min(1),
  profileId: z.string().min(1),
  dependentId: z.string().min(1).optional(),
  userQuery: z.string().min(1),
  hasAttachment: z.boolean(),
});

export type BuildChatPromptInput = z.infer<typeof BuildChatPromptSchema>;

// ── Output DTO ────────────────────────────────────────────────────────────────

/** Onboarding field definition with AI agent instructions */
interface OnboardingFieldDefinition {
  /** Field key - may be from ProfileDto or PatientDocument */
  key: string;
  label: string;
  askHint: string;
}

export interface ChatPromptDto {
  /** Static clinical guidelines (cacheable) */
  systemPrompt: string;
  /** Dynamic context (onboarding, attachments) - RAG and guidelines handled by Clinical Agent */
  dynamicPrompt: string;
  /** Whether any onboarding is required (profile or patient layer) */
  needsOnboarding: boolean;
  /** Recommended model: flash for onboarding, pro for clinical analysis */
  recommendedModel: "flash" | "pro";
  /** Missing base profile identity fields (name, phone, gender, country) */
  missingProfileFields: ReadonlyArray<OnboardingFieldDefinition>;
  /** True when all base profile identity fields are present */
  profileComplete: boolean;
  /** Missing patient health fields (DOB, sex, height, weight, activityLevel) */
  missingPatientFields: ReadonlyArray<OnboardingFieldDefinition>;
  /** True when all patient health fields are present */
  patientProfileComplete: boolean;
}

// ── Profile Completeness Config ───────────────────────────────────────────────

/** Layer 1: base identity fields stored in profiles/{userId} */
const REQUIRED_BASE_PROFILE_FIELDS: ReadonlyArray<OnboardingFieldDefinition> = [
  {
    key: "name",
    label: "Full name",
    askHint: "ask as free_text",
  },
  {
    key: "phone",
    label: "Phone number",
    askHint: "ask as free_text (numeric, with country code)",
  },
  {
    key: "gender",
    label: "Gender",
    askHint:
      "single_choice with options ['Male', 'Female', 'Other', 'Prefer not to say']",
  },
  {
    key: "country",
    label: "Country",
    askHint: "ask as free_text",
  },
];

/** Layer 2: patient health fields stored in patients/{userId} */
const REQUIRED_PATIENT_FIELDS: ReadonlyArray<OnboardingFieldDefinition> = [
  {
    key: "dateOfBirth",
    label: "Date of birth",
    askHint: "ask as free_text with placeholder DD/MM/YYYY",
  },
  {
    key: "sex",
    label: "Biological sex",
    askHint: "single_choice with options ['Male', 'Female']",
  },
  {
    key: "height",
    label: "Height (cm)",
    askHint: "ask as free_text (numeric)",
  },
  {
    key: "weight",
    label: "Weight (kg)",
    askHint: "ask as free_text (numeric)",
  },
  {
    key: "activityLevel",
    label: "Activity level",
    askHint:
      "single_choice with options ['Sedentary — little or no exercise', 'Light — 1–3 days / week', 'Moderate — 3–5 days / week', 'Active — 6–7 days / week', 'Very Active — hard exercise daily']",
  },
];

// ── Use Case ──────────────────────────────────────────────────────────────────

/**
 * Builds the complete system prompt for the chat API, including:
 * - Base clinical system prompt
 * - Attachment context notes
 * - Profile onboarding instructions (if needed)
 *
 * NOTE: RAG context and clinical guidelines are now handled by Clinical Agent.
 * This use case focuses on core prompt building and profile validation.
 */
export class BuildChatPromptUseCase extends UseCase<
  BuildChatPromptInput,
  ChatPromptDto
> {
  static validate(input: unknown): BuildChatPromptInput {
    return BuildChatPromptSchema.parse(input);
  }

  protected async run(input: BuildChatPromptInput): Promise<ChatPromptDto> {
    const startTime = performance.now();
    console.log("[BuildChatPrompt] Started");

    // ── 1. Base system prompt ───────────────────────────────────────────────
    const basePrompt = promptService.get({ id: "clinical-system" });
    if (!basePrompt) {
      throw new Error("Clinical system prompt not found");
    }
    console.log(
      `[BuildChatPrompt] Base prompt: ${(performance.now() - startTime).toFixed(0)}ms`,
    );

    // ── 2. Attachment context ───────────────────────────────────────────────
    const attachmentNote = input.hasAttachment
      ? "\n\n## CURRENT MESSAGE CONTEXT\nThe user's current message DOES contain an attached file or image. You may analyse it and call the appropriate tools."
      : "\n\n## CURRENT MESSAGE CONTEXT\n⚠️ The user's current message does NOT contain any attached file or image. There is nothing to analyse. Do NOT call `dentalChart`, `recordCondition` based on imaging, `soapNote`, or any image/file analysis tool. If the user's text mentions a file or X-ray, call `askQuestion` to ask them to upload it.";

    // ── 3. Fetch profile + patient data for onboarding check ───────────────
    const profileStart = performance.now();

    // For dependents: DependentDto already includes all health fields.
    // For the user: ProfileDto is base identity only; health fields live in
    // patients/{userId}. Fetch both in parallel.
    let profileData: Record<string, unknown> | null = null;
    let patientData: Record<string, unknown> | null = null;

    if (input.dependentId) {
      // Dependents store all fields (base + health) in a single document
      const dep = await dependentRepository
        .findById(input.userId, input.dependentId)
        .catch((err) => {
          console.error("[BuildChatPrompt] Dependent fetch failed:", err);
          return null;
        });
      profileData = dep as Record<string, unknown> | null;
      patientData = dep as Record<string, unknown> | null;
    } else {
      const [profile, patient] = await Promise.all([
        profileRepository.get(input.userId).catch((err) => {
          console.error("[BuildChatPrompt] Profile fetch failed:", err);
          return null;
        }),
        patientRepository.get(input.userId).catch((err) => {
          console.error("[BuildChatPrompt] Patient fetch failed:", err);
          return null;
        }),
      ]);
      profileData = profile as Record<string, unknown> | null;
      patientData = patient as Record<string, unknown> | null;
    }

    console.log(
      `[BuildChatPrompt] Profile fetch: ${(performance.now() - profileStart).toFixed(0)}ms`,
    );

    // ── 4. Compute missing fields per layer ─────────────────────────────────
    // Layer 1: base identity fields (always required for any user)
    const missingProfileFields = REQUIRED_BASE_PROFILE_FIELDS.filter((f) => {
      const value = profileData?.[f.key];
      return value === undefined || value === null || value === "";
    });
    const profileComplete = missingProfileFields.length === 0;

    // Layer 2: patient health fields (required only for patient kind users)
    const missingPatientFields = REQUIRED_PATIENT_FIELDS.filter((f) => {
      const value = patientData?.[f.key];
      return value === undefined || value === null || value === "";
    });
    const patientProfileComplete = missingPatientFields.length === 0;

    const needsOnboarding = !profileComplete || !patientProfileComplete;

    // ── 5. Split static (cacheable) from dynamic prompts ────────────────────
    // Static: base clinical guidelines (never changes, cache candidate)
    const systemPrompt = basePrompt.content;

    // Dynamic: attachment context only
    // NOTE: Onboarding is handled by the client modal — no prompt injection needed.
    // RAG context and guidelines are fetched by Clinical Agent.
    const dynamicPrompt = attachmentNote;

    console.log(
      `[BuildChatPrompt] Total time: ${(performance.now() - startTime).toFixed(0)}ms`,
    );
    console.log(
      `[BuildChatPrompt] Static prompt: ${systemPrompt.length} chars, Dynamic: ${dynamicPrompt.length} chars`,
    );

    return {
      systemPrompt,
      dynamicPrompt,
      needsOnboarding,
      recommendedModel: needsOnboarding ? "flash" : "pro",
      missingProfileFields,
      profileComplete,
      missingPatientFields,
      patientProfileComplete,
    };
  }
}
