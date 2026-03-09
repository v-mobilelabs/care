import { z } from "zod";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { profileRepository } from "../repositories/profile.repository";
import { patientRepository } from "@/data/patients";
import { dependentRepository } from "@/data/dependents";
import { ListConditionsUseCase, type ConditionDto } from "@/data/conditions";
import { ListMedicationsUseCase, type MedicationDto } from "@/data/medications";
import { ListSoapNotesUseCase, type SoapNoteDto } from "@/data/soap-notes";

// ── DTO ───────────────────────────────────────────────────────────────────────

/**
 * Full patient snapshot for the *active* context.
 * When `dependentId` is provided the dependent's record is used for
 * demographics; otherwise the user's own profile is used.
 * `foodPreferences` is always sourced from the user's own profile.
 */
export interface UserSnapshotDto {
  /** Demographics */
  dateOfBirth?: string;
  sex?: "male" | "female";
  height?: number;
  weight?: number;
  waistCm?: number;
  neckCm?: number;
  hipCm?: number;
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active";
  country?: string;
  city?: string;
  /** Always from the user's own profile — not overridden by dependent data. */
  foodPreferences?: string[];

  /** Medical history */
  conditions: ConditionDto[];
  medications: MedicationDto[];
  /** Most recent SOAP note, or undefined when none exists. */
  lastSoapNote?: SoapNoteDto;
  context: string;
}

// ── Input schema ──────────────────────────────────────────────────────────────

export const GetUserSnapshotSchema = z.object({
  userId: z.string().min(1),
  dependentId: z.string().min(1).optional(),
});

export type GetUserSnapshotInput = z.infer<typeof GetUserSnapshotSchema>;

// ── Profile completeness config ───────────────────────────────────────────────────

export interface RequiredProfileField {
  key: keyof UserSnapshotDto;
  label: string;
  askHint: string;
}

const REQUIRED_PROFILE_FIELDS: ReadonlyArray<RequiredProfileField> = [
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
  {
    key: "country",
    label: "Country",
    askHint: "ask as free_text",
  },
];

function buildOnboardingBlock(snapshot: UserSnapshotDto): string {
  const missing = getMissingProfileFields(snapshot);
  if (missing.length === 0) return "";

  const fieldLines = missing.map((f) => `   - ${f.label}: ${f.askHint}`);
  return [
    "\n\n## PROFILE ONBOARDING — ACTION REQUIRED",
    `The following required profile fields are missing for this patient: ${missing.map((f) => f.label).join(", ")}.`,
    "**Before answering the user's health question or starting any assessment**, you MUST:",
    "1. Greet the user warmly and explain you need a few quick details to personalise their care.",
    "2. Collect each missing field **one at a time** using the `askQuestion` tool:",
    ...fieldLines,
    "3. Once all fields are collected, call `updateProfile` with all the values at once to save them.",
    "4. Then proceed normally with the user's original request.",
    "Do NOT skip this step. Do NOT proceed to a health assessment until `updateProfile` has been called.",
  ].join("\n");
}

/**
 * Returns the required profile fields that are still missing from the snapshot.
 * Empty array means the profile is complete and onboarding should be skipped.
 */
type ProfileCompleteness = Pick<
  UserSnapshotDto,
  "dateOfBirth" | "sex" | "height" | "weight" | "activityLevel" | "country"
>;

export function getMissingProfileFields(
  snapshot: ProfileCompleteness,
): ReadonlyArray<RequiredProfileField> {
  return REQUIRED_PROFILE_FIELDS.filter(
    (f) => !snapshot[f.key as keyof ProfileCompleteness],
  );
}

// ── Dependent profile completeness ────────────────────────────────────────────

const DEPENDENT_REQUIRED_FIELDS: ReadonlyArray<RequiredProfileField> = [
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
  {
    key: "country",
    label: "Country",
    askHint: "ask as free_text",
  },
];

type DependentCompleteness = Pick<
  UserSnapshotDto,
  "dateOfBirth" | "sex" | "height" | "weight" | "activityLevel" | "country"
>;

/**
 * Returns the required dependent profile fields that are still missing.
 * Use this instead of `getMissingProfileFields` when a `dependentId` is present.
 */
export function getMissingDependentFields(
  snapshot: DependentCompleteness,
): ReadonlyArray<RequiredProfileField> {
  return DEPENDENT_REQUIRED_FIELDS.filter(
    (f) => !snapshot[f.key as keyof DependentCompleteness],
  );
}

// ── Formatter ─────────────────────────────────────────────────────────────────

/**
 * Converts a `UserSnapshotDto` into the `## PATIENT HEALTH HISTORY` block
 * that is injected into the AI system prompt on every request.
 * Returns an empty string when there is nothing meaningful to include.
 */
export function formatUserSnapshotContext(snapshot: UserSnapshotDto): string {
  const conditionLines = snapshot.conditions
    .map((c) => {
      const icd = c.icd10 ? ` (${c.icd10})` : "";
      return `- ${c.name}${icd}: ${c.severity} severity, ${c.status}`;
    })
    .join("\n");

  const medicationLines = snapshot.medications
    .filter((m) => m.status === "active")
    .map((m) => {
      const parts = [m.name];
      if (m.dosage) parts.push(m.dosage);
      if (m.frequency) parts.push(m.frequency);
      if (m.condition) parts.push(`for ${m.condition}`);
      return `- ${parts.join(" · ")}`;
    })
    .join("\n");

  const soapLine = snapshot.lastSoapNote
    ? `Last clinical summary (${new Date(snapshot.lastSoapNote.createdAt).toLocaleDateString()}): ${snapshot.lastSoapNote.assessment}`
    : "";

  const dob = snapshot.dateOfBirth;
  const ageValue = (() => {
    if (!dob) return null;
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  })();

  const demographicParts: string[] = [];
  if (ageValue !== null) demographicParts.push(`Age: ${ageValue} yrs`);
  if (snapshot.sex) demographicParts.push(`Sex: ${snapshot.sex}`);
  if (snapshot.country) demographicParts.push(`Country: ${snapshot.country}`);
  if (snapshot.city) demographicParts.push(`City: ${snapshot.city}`);
  if (snapshot.height) demographicParts.push(`Height: ${snapshot.height} cm`);
  if (snapshot.weight) demographicParts.push(`Weight: ${snapshot.weight} kg`);
  if (snapshot.waistCm) demographicParts.push(`Waist: ${snapshot.waistCm} cm`);
  if (snapshot.neckCm) demographicParts.push(`Neck: ${snapshot.neckCm} cm`);
  if (snapshot.hipCm) demographicParts.push(`Hip: ${snapshot.hipCm} cm`);
  if (snapshot.activityLevel)
    demographicParts.push(`Activity level: ${snapshot.activityLevel}`);
  if (snapshot.foodPreferences?.length)
    demographicParts.push(
      `Food preferences: ${snapshot.foodPreferences.join(", ")}`,
    );

  const demographicLine = demographicParts.length
    ? `**Patient demographics:** ${demographicParts.join(" · ")}`
    : "";

  const onboardingBlock = buildOnboardingBlock(snapshot);

  if (
    !conditionLines &&
    !medicationLines &&
    !soapLine &&
    !demographicLine &&
    !onboardingBlock
  )
    return "";

  return [
    "\n\n## PATIENT HEALTH HISTORY",
    "Use the following as background context for all tool calls — especially dietPlan, nextSteps. Do not re-diagnose unless new symptoms warrant it.",
    "IMPORTANT: All demographics (age, country, food preferences) listed below are already confirmed from the patient's profile. Do NOT ask for them again in any tool.",
    conditionLines && `**Known conditions:**\n${conditionLines}`,
    medicationLines && `**Active medications:**\n${medicationLines}`,
    demographicLine,
    soapLine && `**${soapLine}**`,
    onboardingBlock,
  ]
    .filter(Boolean)
    .join("\n");
}

// ── Use case ──────────────────────────────────────────────────────────────────

export class GetUserSnapshotUseCase extends UseCase<
  GetUserSnapshotInput,
  UserSnapshotDto
> {
  static validate(input: unknown): GetUserSnapshotInput {
    return GetUserSnapshotSchema.parse(input);
  }

  protected async run(input: GetUserSnapshotInput): Promise<UserSnapshotDto> {
    const { userId, dependentId } = input;

    const [userProfile, patientData, dependentProfile, conditions, medications, soapNotes] =
      await Promise.all([
        profileRepository.get(userId).catch(() => null),
        !dependentId ? patientRepository.get(userId).catch(() => null) : Promise.resolve(null),
        dependentId
          ? dependentRepository.findById(userId, dependentId).catch(() => null)
          : Promise.resolve(null),
        new ListConditionsUseCase(dependentId)
          .execute(ListConditionsUseCase.validate({ userId, limit: 5 }))
          .catch(() => []),
        new ListMedicationsUseCase(dependentId)
          .execute(ListMedicationsUseCase.validate({ userId, limit: 10 }))
          .catch(() => []),
        new ListSoapNotesUseCase(dependentId)
          .execute(ListSoapNotesUseCase.validate({ userId, limit: 1 }))
          .catch(() => []),
      ]);

    const activeProfile = dependentId ? dependentProfile : patientData;

    const data: Omit<UserSnapshotDto, "context"> = {
      dateOfBirth: activeProfile?.dateOfBirth,
      sex: activeProfile?.sex,
      height: activeProfile?.height,
      weight: activeProfile?.weight,
      waistCm: activeProfile?.waistCm,
      neckCm: activeProfile?.neckCm,
      hipCm: activeProfile?.hipCm,
      activityLevel: activeProfile?.activityLevel,
      country: userProfile?.country,
      city: userProfile?.city,
      foodPreferences: patientData?.foodPreferences,
      conditions,
      medications,
      lastSoapNote: soapNotes[0],
    };

    return {
      ...data,
      context: formatUserSnapshotContext({ ...data, context: "" }),
    };
  }
}
