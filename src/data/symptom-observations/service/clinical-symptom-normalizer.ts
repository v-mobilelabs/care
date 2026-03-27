const MAX_SYMPTOM_LENGTH = 160;

const LEADING_PHRASE_PATTERNS = [
  /^(do you have|are you having|are you experiencing|have you had|did you notice)\s+/i,
  /^(i have|i am having|i'm having|i feel|feeling)\s+/i,
  /^(symptom:?|complaint:?|issue:?|problem:?|concern:?|condition:?)\s+/i,
];

const CLINICAL_TERM_RULES: Array<{ pattern: RegExp; clinical: string }> = [
  {
    pattern: /\btummy ache\b|\btummy pain\b|\bstomach ache\b/i,
    clinical: "Abdominal pain",
  },
  { pattern: /\bbelly pain\b/i, clinical: "Abdominal pain" },
  { pattern: /\bchest tight(ness)?\b/i, clinical: "Chest tightness" },
  {
    pattern: /\bcan'?t breathe\b|\bbreathing trouble\b|\bshort of breath\b/i,
    clinical: "Dyspnea",
  },
  { pattern: /\bthrow(ing)? up\b|\bvomit(ing)?\b/i, clinical: "Vomiting" },
  { pattern: /\bfeverish\b/i, clinical: "Fever" },
  { pattern: /\bloose motions?\b|\brunny stool\b/i, clinical: "Diarrhea" },
  {
    pattern: /\bpee pain\b|\bburning urine\b|\bburning urination\b/i,
    clinical: "Dysuria",
  },
  {
    pattern: /\bpeeing often\b|\burinating often\b/i,
    clinical: "Urinary frequency",
  },
  { pattern: /\bpassed out\b|\bblack(ed)? out\b/i, clinical: "Syncope" },
  { pattern: /\blight headed\b|\blightheaded\b/i, clinical: "Lightheadedness" },
  { pattern: /\bheart racing\b|\bheart pounding\b/i, clinical: "Palpitations" },
  { pattern: /\bitchy skin\b|\bskin itching\b/i, clinical: "Pruritus" },
  {
    pattern: /\bpuffy (legs|ankles|feet)\b|\bleg swelling\b/i,
    clinical: "Peripheral edema",
  },
];

function cleanText(value: string): string {
  return value
    .replaceAll(/[\r\n\t]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .replaceAll(/[?.!,;:]+$/g, "")
    .trim();
}

function toSentenceCase(value: string): string {
  if (value.length === 0) return value;
  return `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`;
}

function stripLeadingPhrase(value: string): string {
  let output = value;
  for (const pattern of LEADING_PHRASE_PATTERNS) {
    output = output.replace(pattern, "");
  }
  return output.trim();
}

function mapToClinicalTerm(value: string): string {
  for (const rule of CLINICAL_TERM_RULES) {
    if (rule.pattern.test(value)) {
      return rule.clinical;
    }
  }
  return value;
}

export function normalizeClinicalSymptomTerm(raw: string): string {
  const cleaned = cleanText(raw);
  if (!cleaned) return "Symptom";

  const withoutLead = stripLeadingPhrase(cleaned);
  const mapped = mapToClinicalTerm(withoutLead || cleaned);
  const normalized = toSentenceCase(cleanText(mapped || cleaned));

  return normalized.slice(0, MAX_SYMPTOM_LENGTH);
}

export function normalizeClinicalTermList(
  values?: string[],
): string[] | undefined {
  if (!values || values.length === 0) return undefined;

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const term = normalizeClinicalSymptomTerm(value);
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(term);
  }

  return normalized.length > 0 ? normalized : undefined;
}
