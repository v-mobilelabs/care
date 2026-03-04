import { z } from "zod";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { profileRepository } from "../repositories/profile.repository";
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
  height?: number;
  weight?: number;
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
  if (snapshot.country) demographicParts.push(`Country: ${snapshot.country}`);
  if (snapshot.city) demographicParts.push(`City: ${snapshot.city}`);
  if (snapshot.height) demographicParts.push(`Height: ${snapshot.height} cm`);
  if (snapshot.weight) demographicParts.push(`Weight: ${snapshot.weight} kg`);
  if (snapshot.foodPreferences?.length)
    demographicParts.push(
      `Food preferences: ${snapshot.foodPreferences.join(", ")}`,
    );

  const demographicLine = demographicParts.length
    ? `**Patient demographics:** ${demographicParts.join(" · ")}`
    : "";

  if (!conditionLines && !medicationLines && !soapLine && !demographicLine)
    return "";

  return [
    "\n\n## PATIENT HEALTH HISTORY",
    "Use the following as background context for all tool calls — especially dietPlan, nextSteps. Do not re-diagnose unless new symptoms warrant it.",
    "IMPORTANT: All demographics (age, country, food preferences) listed below are already confirmed from the patient's profile. Do NOT ask for them again in any tool.",
    conditionLines && `**Known conditions:**\n${conditionLines}`,
    medicationLines && `**Active medications:**\n${medicationLines}`,
    demographicLine,
    soapLine && `**${soapLine}**`,
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

    const [userProfile, dependentProfile, conditions, medications, soapNotes] =
      await Promise.all([
        profileRepository.get(userId).catch(() => null),
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

    const activeProfile = dependentId ? dependentProfile : userProfile;

    const data = {
      dateOfBirth: activeProfile?.dateOfBirth,
      height: activeProfile?.height,
      weight: activeProfile?.weight,
      country: activeProfile?.country,
      city: activeProfile?.city,
      foodPreferences: userProfile?.foodPreferences,
      conditions,
      medications,
      lastSoapNote: soapNotes[0],
    };

    return {
      ...data,
      context: formatUserSnapshotContext(data as UserSnapshotDto),
    };
  }
}
