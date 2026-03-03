import type {
  DrugDto,
  DrugStrengthDto,
  NlmRxTermsResponse,
} from "../models/drug.model";

const NLM_BASE = "https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search";

// ── Normalizers ───────────────────────────────────────────────────────────────

/**
 * Parses a raw NLM strength string like "  500 mg Tab" or "500 mg/5ml Sol"
 * into a structured { label, dosage, form }.
 */
function parseStrength(raw: string): DrugStrengthDto {
  const label = raw.trim();

  // Extract the dosage portion (everything up to a recognised form keyword)
  const formKeywords: [RegExp, string][] = [
    [/\bcap\b/i, "Capsule"],
    [/\btab\b/i, "Tablet"],
    [/\bsol\b|\/\d*\s*ml\b|oral\s+liq/i, "Oral Solution"],
    [/\bsyr\b|syrup/i, "Syrup"],
    [/\bsusp\b|suspension/i, "Suspension"],
    [/\binj\b|injection/i, "Injection"],
    [/\bpatch/i, "Patch"],
    [/\bcream|ointment|gel\b/i, "Topical"],
    [/\binhaler|inhal\b/i, "Inhaler"],
    [/\bdrops|ophthal\b/i, "Eye Drops"],
  ];

  let detectedForm = "";
  for (const [pattern, form] of formKeywords) {
    if (pattern.test(label)) {
      detectedForm = form;
      break;
    }
  }

  // Dosage = leading "NNN mg" / "NNN mg/mL" part before the form keyword
  const dosageMatch =
    /^[\d,]+(?:\.\d+)?\s*(?:mg|mcg|g|ml|%|IU)(?:\/\d+\s*ml)?/i.exec(label);
  const dosage = dosageMatch
    ? dosageMatch[0].replaceAll(",", "").trim()
    : label;

  return { label, dosage, form: detectedForm };
}

/**
 * Derives the primary dose form from the drug display name when the strengths
 * list doesn't contain a clear form indicator.
 */
function deriveFormFromName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("oral liquid") || n.includes("oral liq"))
    return "Oral Solution";
  if (n.includes("injection") || n.includes("inj")) return "Injection";
  if (n.includes("patch")) return "Patch";
  if (n.includes("cream") || n.includes("ointment") || n.includes("gel"))
    return "Topical";
  if (n.includes("inhaler") || n.includes("inhal")) return "Inhaler";
  if (n.includes("drops") || n.includes("ophthal")) return "Eye Drops";
  if (n.includes("capsule") || n.includes("cap")) return "Capsule";
  if (n.includes("tablet") || n.includes("tab") || n.includes("oral pill"))
    return "Tablet";
  return "";
}

/**
 * Normalizes a raw NLM RxTerms response into an array of {@link DrugDto}.
 */
export function normalizeNlmResponse(
  raw: NlmRxTermsResponse,
  limit: number,
): DrugDto[] {
  const names: string[] = raw[1] ?? [];
  const extras = raw[2] ?? {};
  const rxcuisArr = extras.RXCUIS ?? [];
  const strengthsArr = extras.STRENGTHS_AND_FORMS ?? [];

  return names.slice(0, limit).map((name, i): DrugDto => {
    const rawStrengths: string[] = (strengthsArr[i] ?? []).filter(
      (s): s is string => typeof s === "string",
    );

    const strengths = rawStrengths.map(parseStrength);

    // Best guess at a primary form: use the first strength's form,
    // fall back to deriving it from the drug name.
    const defaultForm =
      strengths.find((s) => s.form)?.form ?? deriveFormFromName(name);

    return {
      name,
      rxcuis: rxcuisArr[i] ?? [],
      strengths,
      defaultForm,
    };
  });
}

// ── Repository ─────────────────────────────────────────────────────────────────

export class DrugRepository {
  /**
   * Searches the NLM Clinical Tables RxTerms API and returns normalized results.
   * Results are edge-cached for 1 hour via Next.js `fetch` revalidation.
   */
  async search(q: string, limit: number): Promise<DrugDto[]> {
    const url = `${NLM_BASE}?terms=${encodeURIComponent(q)}&ef=RXCUIS,STRENGTHS_AND_FORMS&maxList=${limit}`;

    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`NLM API error: ${res.status} ${res.statusText}`);
    }

    const raw = (await res.json()) as NlmRxTermsResponse;
    return normalizeNlmResponse(raw, limit);
  }
}

export const drugRepository = new DrugRepository();
