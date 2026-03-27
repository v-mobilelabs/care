import { generateText } from "ai";
import { z } from "zod";
import { google } from "@/data/shared/service/vertex-provider";
import { aiService } from "@/data/shared/service/ai.service";
import type { MedicationMatchDto } from "../models/medication.model";

const WebMedicationMatchSchema = z.object({
  name: z.string().min(1),
  brandName: z.string().min(1).optional(),
  genericName: z.string().min(1).optional(),
  dosage: z.string().min(1).optional(),
  form: z.string().min(1).optional(),
  route: z.string().min(1).optional(),
  drugType: z.string().min(1).optional(),
  composition: z.array(z.string().min(1)).optional().default([]),
  display: z.string().min(1),
  sourceUrl: z.url().optional(),
  confidence: z.enum(["high", "medium", "low"]),
});

const WebMedicationResolveSchema = z.object({
  matches: z.array(WebMedicationMatchSchema).max(8),
});

function extractJsonObject(text: string): string | null {
  const fencedMatch = /```json\s*([\s\S]*?)```/i.exec(text);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectMatch = /\{[\s\S]*\}/.exec(text);
  return objectMatch?.[0]?.trim() ?? null;
}

function sanitizeText(value: string | undefined): string | undefined {
  const normalized = value?.replaceAll(/\s+/g, " ").trim();
  if (!normalized) {
    return undefined;
  }

  return normalized;
}

function normalizeWebMatch(
  match: z.infer<typeof WebMedicationMatchSchema>,
  index: number,
): MedicationMatchDto {
  const brandName = sanitizeText(match.brandName);
  const genericName = sanitizeText(match.genericName);
  const dosage = sanitizeText(match.dosage);
  const form = sanitizeText(match.form);
  const route = sanitizeText(match.route);
  const drugType = sanitizeText(match.drugType);
  const display = sanitizeText(match.display) ?? match.name;
  const composition = match.composition
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return {
    id: `${brandName ?? genericName ?? match.name}-${dosage ?? index}`,
    name: sanitizeText(match.name) ?? match.name,
    ...(brandName ? { brandName } : {}),
    ...(genericName ? { genericName } : {}),
    ...(dosage ? { dosage } : {}),
    ...(form ? { form } : {}),
    ...(route ? { route } : {}),
    ...(drugType ? { drugType } : {}),
    ...(composition.length > 0 ? { composition } : {}),
    display,
    source: "web",
    ...(match.sourceUrl ? { sourceUrl: match.sourceUrl } : {}),
    confidence: match.confidence,
  };
}

export async function resolveMedicationMatchesFromWeb(args: {
  userId: string;
  query: string;
  limit: number;
}): Promise<MedicationMatchDto[]> {
  const systemPrompt = [
    "You are a medication lookup assistant that uses Google Search to identify real marketed medicines.",
    "Users may search by brand name, generic name, salt/composition, or dosage.",
    "Prefer brand-name matches when the query looks like a brand, but always include the generic name if found.",
    "Return only medicines that plausibly match the user's query exactly or closely.",
    "Always respond with ONLY valid JSON matching this exact structure:",
    "{",
    '  "matches": [',
    "    {",
    '      "name": "string",',
    '      "brandName": "string (optional)",',
    '      "genericName": "string (optional)",',
    '      "dosage": "string (optional)",',
    '      "form": "string (optional)",',
    '      "route": "string (optional)",',
    '      "drugType": "string (optional, such as antibiotic, analgesic, antihistamine)",',
    '      "composition": ["string"],',
    '      "display": "string",',
    '      "sourceUrl": "string (optional)",',
    '      "confidence": "high | medium | low"',
    "    }",
    "  ]",
    "}",
    `Return at most ${args.limit} matches.`,
    'If nothing reliable is found, return {"matches": []}.',
    "Do not invent composition, dosage, or source URLs.",
  ].join("\n");

  const prompt = [
    `Medication query: ${args.query}`,
    "Use Google Search to find likely medication matches.",
    "Prioritize consumer-understandable brand names and include the generic/active ingredient when available.",
    "Prefer trusted pharmacy, manufacturer, government, or medical reference pages.",
  ].join("\n");

  const { text } = await generateText({
    model: aiService.forUser(args.userId).fast,
    tools: { googleSearch: google.tools.googleSearch({}) as never },
    system: systemPrompt,
    prompt,
  });

  const jsonText = extractJsonObject(text);
  if (!jsonText) {
    return [];
  }

  const parsed = JSON.parse(jsonText) as unknown;
  const structured = WebMedicationResolveSchema.parse(parsed);

  return structured.matches
    .slice(0, args.limit)
    .map((match, index) => normalizeWebMatch(match, index));
}
