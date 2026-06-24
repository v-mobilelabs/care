import { z } from "zod";
import { aiService, type AIService } from "@/data/shared/service/ai.service";

const StructuredSymptomSchema = z.object({
  symptom: z.string().min(1),
  severity: z.number().int().min(0).max(10).optional(),
  state: z.enum(["improving", "stable", "worsening"]).optional(),
  onset: z.string().optional(),
  duration: z.string().optional(),
  triggers: z.array(z.string().min(1)).optional(),
  alleviators: z.array(z.string().min(1)).optional(),
  associatedSymptoms: z.array(z.string().min(1)).optional(),
  notes: z.string().optional(),
});

function clean(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.replaceAll(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  return normalized;
}

function cleanList(values?: string[]): string[] | undefined {
  if (!values || values.length === 0) return undefined;

  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const cleaned = clean(value);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }

  if (out.length === 0) return undefined;
  return out.slice(0, 8);
}

function toLower(value?: string): string {
  return value?.trim().toLowerCase() ?? "";
}

function toSentenceCase(value: string): string {
  if (!value) return value;
  return `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`;
}

function normalizeUserTextForInference(input: string): string {
  return input
    .replaceAll(/\bmonring\b/gi, "morning")
    .replaceAll(/\bmroning\b/gi, "morning")
    .replaceAll(/\bmorng\b/gi, "morning")
    .replaceAll(/\btill\b/gi, "until")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function normalizeRelativeTimePhrase(value: string): string {
  const normalized = value.replaceAll(/\s+/g, " ").trim().toLowerCase();

  if (normalized === "morning") return "this morning";
  if (normalized === "afternoon") return "this afternoon";
  if (normalized === "evening") return "this evening";
  if (normalized === "night") return "tonight";

  return normalized;
}

function inferSeverityFromInput(input: string): number | undefined {
  const normalized = toLower(normalizeUserTextForInference(input));

  // Prefer explicit numeric pain scores when present.
  const numericScaleMatch = /\b(10|\d)\s*(?:\/\s*10|out of\s*10)\b/i.exec(
    normalized,
  );
  const numericPainMatch =
    /\bpain\s*(?:level|score)?\s*(?:is\s*)?(10|\d)\b/i.exec(normalized);
  const numericMatch = numericScaleMatch ?? numericPainMatch;
  if (numericMatch) {
    const parsed = Number(numericMatch[1]);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 10) {
      return parsed;
    }
  }

  // Mixed descriptors should be checked before single-word buckets.
  if (/(\bmild\s*(?:to|-)?\s*moderate\b)/i.test(normalized)) {
    return 4;
  }

  if (/(\bmoderate\s*(?:to|-)?\s*severe\b)/i.test(normalized)) {
    return 7;
  }

  // Highest-intensity descriptors first to avoid early matches on "severe".
  if (
    /(\bworst\s+(?:pain|headache|ache)?\b|\b10\/10\b|\bexcruciating\b|\bunbearable\b|\bagonizing\b)/i.test(
      normalized,
    )
  ) {
    return 10;
  }

  if (/(\bvery\s+severe\b|\bextreme\b)/i.test(normalized)) {
    return 9;
  }

  if (/(\bvery\s+mild\b|\bslight\b|\blow\s+grade\b)/i.test(normalized)) {
    return 2;
  }

  if (/\bmild\b/i.test(normalized)) {
    return 3;
  }

  if (/\bmoderate\b/i.test(normalized)) {
    return 5;
  }

  if (
    /(\bsevere\b|\bintense\b|\bbad\b|\bstrong\b|\bhigh\s+pain\b)/i.test(
      normalized,
    )
  ) {
    return 8;
  }

  return undefined;
}

function extractOnsetFromInput(input: string): string | undefined {
  const lowerInput = toLower(normalizeUserTextForInference(input));
  const relativeMatch =
    /\b(?:since|from)\s+((?:this|last)\s+)?(morning|afternoon|evening|night)\b/i.exec(
      lowerInput,
    );

  if (relativeMatch) {
    const prefix = relativeMatch[1]?.trim().toLowerCase();
    const partOfDay = relativeMatch[2]?.trim().toLowerCase() ?? "";
    const phrase = [prefix, partOfDay].filter(Boolean).join(" ");
    return toSentenceCase(normalizeRelativeTimePhrase(phrase));
  }

  const generalMatch =
    /\b(?:since|from)\s+([a-z\d\s-]+?)(?=\b(?:and|but|with|worse|better|stable|improving|worsening|till now|until now|still|for|$))/i.exec(
      lowerInput,
    );

  const extracted = clean(generalMatch?.[1]);
  return extracted ? toSentenceCase(extracted.toLowerCase()) : undefined;
}

function inferDurationFromInput(args: {
  input: string;
  onset?: string;
}): string | undefined {
  const lowerInput = toLower(normalizeUserTextForInference(args.input));

  const explicitDuration =
    /\bfor\s+([a-z\d\s-]+?)(?=\b(?:and|but|with|$))/i.exec(lowerInput);
  const explicitDurationValue = clean(explicitDuration?.[1]);
  if (explicitDurationValue) {
    return toSentenceCase(`for ${explicitDurationValue.toLowerCase()}`);
  }

  const ongoingPattern =
    /\b(till now|until now|till today|until today|still|still now|ongoing|persisting|so far|up to now|currently)\b/i;

  if (ongoingPattern.test(lowerInput) && args.onset) {
    return toSentenceCase(`since ${args.onset.toLowerCase()}`);
  }

  return undefined;
}

function enrichStructuredResult(args: {
  input: string;
  extracted: StructuredSymptomResult;
}): StructuredSymptomResult {
  const inferredSeverity =
    args.extracted.severity ?? inferSeverityFromInput(args.input);
  const onset = args.extracted.onset ?? extractOnsetFromInput(args.input);
  const duration =
    args.extracted.duration ??
    inferDurationFromInput({ input: args.input, onset });

  return {
    ...args.extracted,
    ...(inferredSeverity === undefined ? {} : { severity: inferredSeverity }),
    ...(onset ? { onset } : {}),
    ...(duration ? { duration } : {}),
  };
}

function buildPrompt(freeTextInput: string): string {
  return [
    "Convert the patient symptom log text into a normalized structured medical observation.",
    "Rules:",
    "- Keep meaning faithful to user text. Do not invent diagnoses.",
    "- Use concise clinical symptom wording for `symptom`.",
    "- If a field is not present, omit it.",
    "- `severity` must be integer 0-10 only when clearly stated.",
    "- `state` can only be improving, stable, or worsening when clearly implied.",
    "- Keep `onset` and `duration` short and literal (for example: '2 days ago', 'intermittent for 1 week').",
    "- If the user says something like 'since morning', 'from this morning', or 'till now', infer an ongoing duration when appropriate.",
    "- Example: 'I have mild headache from morning and it is stable till now' should capture onset like 'This morning' and duration like 'Since this morning'.",
    "- Extract trigger/alleviator lists only when explicit.",
    "- `notes` should preserve clinically relevant context not already captured.",
    "",
    "Patient input:",
    freeTextInput,
  ].join("\n");
}

export type StructuredSymptomResult = {
  symptom: string;
  severity?: number;
  state?: "improving" | "stable" | "worsening";
  onset?: string;
  duration?: string;
  triggers?: string[];
  alleviators?: string[];
  associatedSymptoms?: string[];
  notes?: string;
};

export async function parseStructuredSymptomFromText(args: {
  userId: string;
  freeTextInput: string;
  ai?: AIService;
}): Promise<StructuredSymptomResult> {
  const input = args.freeTextInput.trim();
  if (!input) {
    throw new Error("Symptom input cannot be empty.");
  }

  const extracted = await (args.ai ?? aiService).extractObject(
    StructuredSymptomSchema,
    [{ role: "user", content: buildPrompt(input) }],
    {
      userId: args.userId,
      useFast: true,
      skipCredit: true,
    },
  );

  const symptom = clean(extracted.symptom);
  if (!symptom) {
    throw new Error("Structured symptom extraction returned an empty symptom.");
  }

  return enrichStructuredResult({
    input,
    extracted: {
      symptom,
      ...(extracted.severity === undefined
        ? {}
        : { severity: extracted.severity }),
      ...(extracted.state ? { state: extracted.state } : {}),
      ...(clean(extracted.onset) ? { onset: clean(extracted.onset) } : {}),
      ...(clean(extracted.duration)
        ? { duration: clean(extracted.duration) }
        : {}),
      ...(cleanList(extracted.triggers)
        ? { triggers: cleanList(extracted.triggers) }
        : {}),
      ...(cleanList(extracted.alleviators)
        ? { alleviators: cleanList(extracted.alleviators) }
        : {}),
      ...(cleanList(extracted.associatedSymptoms)
        ? { associatedSymptoms: cleanList(extracted.associatedSymptoms) }
        : {}),
      ...(clean(extracted.notes) ? { notes: clean(extracted.notes) } : {}),
    },
  });
}
