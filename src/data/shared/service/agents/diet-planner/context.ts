/**
 * Diet Planner Dynamic Context — Regional & clinical personalisation
 *
 * Fetches the patient's location, food preferences, and matching regional
 * cuisine protocols at request time. Injected via buildDynamicContext so
 * the model receives concrete regional ingredients, meal patterns, and
 * nutrition guardrails alongside RAG-provided medical history.
 */

import { profileRepository } from "@/data/profile";
import { patientRepository } from "@/data/patients";
import { nutritionService } from "@/data/diet-plans";
import type { AgentCallOptions } from "../base/agent";

/**
 * Map country name → region identifier used in cuisine protocol search.
 * Falls back to the raw country string for vector search if not mapped.
 */
const COUNTRY_REGION_MAP: Record<string, string> = {
  india: "South Asian",
  "sri lanka": "South Asian",
  pakistan: "South Asian",
  bangladesh: "South Asian",
  nepal: "South Asian",
  greece: "Mediterranean",
  italy: "Mediterranean",
  spain: "Mediterranean",
  turkey: "Mediterranean",
  lebanon: "Mediterranean",
  china: "East Asian",
  japan: "East Asian",
  "south korea": "East Asian",
  taiwan: "East Asian",
  "united states": "North American",
  canada: "North American",
  mexico: "Latin American",
  brazil: "Latin American",
  colombia: "Latin American",
  argentina: "Latin American",
  "united arab emirates": "Middle Eastern",
  "saudi arabia": "Middle Eastern",
  qatar: "Middle Eastern",
  egypt: "Middle Eastern",
  nigeria: "African",
  kenya: "African",
  "south africa": "African",
  ethiopia: "African",
  "united kingdom": "European",
  germany: "European",
  france: "European",
  australia: "North American", // Western-style diet
};

function resolveRegion(country?: string): string | undefined {
  if (!country) return undefined;
  return COUNTRY_REGION_MAP[country.toLowerCase()] ?? undefined;
}

function buildLocationContext(
  country?: string,
  city?: string,
  region?: string,
): string | null {
  if (!country && !city) return null;
  const loc = [city, country].filter(Boolean).join(", ");
  return `## Patient Location\n- Location: ${loc}${region ? `\n- Cuisine region: ${region}` : ""}`;
}

async function buildCuisineContext(
  region: string | undefined,
  country: string | undefined,
  foodPrefs: string[] | undefined,
  userQuery: string,
): Promise<string | null> {
  const query = [region ?? country ?? "", foodPrefs?.join(" ") ?? "", userQuery]
    .filter(Boolean)
    .join(" ");
  if (!query.trim()) return null;

  const cuisines = await nutritionService
    .searchCuisineProtocols(query, { topK: 2, region })
    .catch(() => []);
  return cuisines.length > 0
    ? nutritionService.formatCuisinesForPrompt(cuisines)
    : null;
}

function buildGuardrailContext(dateOfBirth?: string): string | null {
  const age = dateOfBirth
    ? Math.floor(
        (Date.now() - new Date(dateOfBirth).getTime()) / 31_557_600_000,
      )
    : 30;
  const guardrails = nutritionService.getApplicableGuardrails(
    [],
    age,
    "maintenance",
  );
  return guardrails.length > 0
    ? nutritionService.formatGuardrailsForPrompt(guardrails)
    : null;
}

function buildPrefsContext(prefs?: string[]): string | null {
  return prefs?.length ? `## Dietary Preferences\n- ${prefs.join(", ")}` : null;
}

async function fetchProfileData(profileId: string) {
  return Promise.all([
    profileRepository.get(profileId).catch(() => null),
    patientRepository.get(profileId).catch(() => null),
  ]);
}

/**
 * Build dynamic context for the diet planner agent.
 * Fetches profile location + patient food prefs + matching regional cuisines
 * + applicable clinical guardrails in parallel.
 */
export async function buildDietDynamicContext(
  options: AgentCallOptions,
): Promise<string> {
  try {
    const [profile, patient] = await fetchProfileData(options.profileId);
    const region = resolveRegion(profile?.country);
    const parts = [
      buildLocationContext(profile?.country, profile?.city, region),
      buildPrefsContext(patient?.foodPreferences),
      await buildCuisineContext(
        region,
        profile?.country,
        patient?.foodPreferences,
        options.userQuery,
      ),
      buildGuardrailContext(patient?.dateOfBirth),
    ].filter(Boolean) as string[];
    return parts.join("\n\n");
  } catch (error) {
    console.error("[diet-planner] Dynamic context fetch failed:", error);
    return "";
  }
}
