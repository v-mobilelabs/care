import type { ProfileDto } from "@/data/profile";
import { z } from "zod";
import { aiService } from "@/data/shared/service/ai.service";

export type KnownProfileIntent =
  | "age"
  | "date-of-birth"
  | "name"
  | "gender"
  | "location";

const KnownProfileIntentSchema = z.object({
  intent: z.enum([
    "age",
    "date-of-birth",
    "name",
    "gender",
    "location",
    "none",
  ]),
  confidence: z.number().min(0).max(1),
});

function normalizeQuery(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s]/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

export async function classifyKnownProfileIntent(
  query: string,
): Promise<KnownProfileIntent | null> {
  const normalized = normalizeQuery(query);
  if (!normalized) return null;

  const result = await aiService.extractObject(
    KnownProfileIntentSchema,
    [
      {
        role: "system",
        content:
          "Classify whether the user query asks for a known personal profile fact that can be answered from profile fields only. " +
          "Allowed intents: age, date-of-birth, name, gender, location, none. " +
          "Use 'none' for anything clinical, advisory, treatment-related, lab interpretation, or ambiguous intent. " +
          "Only return an intent when the question is explicitly about the user's own profile data.",
      },
      {
        role: "user",
        content: JSON.stringify({ query: normalized }),
      },
    ],
    { userId: "gateway-intent-classifier", useLite: true, skipCredit: true },
  );

  if (result.intent === "none") return null;
  if (result.confidence < 0.7) return null;
  return result.intent;
}

function computeAge(dateOfBirth?: string): number | null {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

export function buildKnownProfileDirectResponse(args: {
  intent: KnownProfileIntent;
  profile: ProfileDto | null;
}):
  | {
      text: string;
      source: "known-profile-context";
      reason: string;
    }
  | undefined {
  const intent = args.intent;
  const profile = args.profile;

  if (!intent || !profile) return undefined;

  const location = [profile.city, profile.country].filter(Boolean).join(", ");

  if (intent === "age") {
    const age = computeAge(profile.dateOfBirth);
    if (age === null) return undefined;
    return {
      text: `You are ${age} years old.`,
      source: "known-profile-context",
      reason: "known-profile-context:age",
    };
  }

  if (intent === "date-of-birth" && profile.dateOfBirth) {
    return {
      text: `Your date of birth is ${profile.dateOfBirth}.`,
      source: "known-profile-context",
      reason: "known-profile-context:date-of-birth",
    };
  }

  if (intent === "name" && profile.name?.trim()) {
    return {
      text: `Your name is ${profile.name.trim()}.`,
      source: "known-profile-context",
      reason: "known-profile-context:name",
    };
  }

  if (intent === "gender" && profile.gender?.trim()) {
    return {
      text: `Your profile lists your gender as ${profile.gender.trim()}.`,
      source: "known-profile-context",
      reason: "known-profile-context:gender",
    };
  }

  if (intent === "location" && location) {
    return {
      text: `Your profile location is ${location}.`,
      source: "known-profile-context",
      reason: "known-profile-context:location",
    };
  }

  return undefined;
}
