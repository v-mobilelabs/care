/**
 * Tri-Store RAG Service — Weighted parallel search across three clinical stores.
 *
 * Architecture
 * ────────────
 * 1.  condition_store  (weight 1.0)
 *     Patient's active clinical profile: conditions, medications, prescriptions,
 *     profile, and patient summaries. Highest trust — directly affects recommendations.
 *
 * 2.  symptom_store  (weight 0.7)
 *     Observed symptom / biomarker timeline: symptom-observations, assessments,
 *     vitals, blood tests, SOAP notes. High trust — recent clinical observations.
 *
 * 3.  kb_store  (weight 0.4)
 *     Global clinical knowledge base: guidelines, drug references, protocols.
 *     Lower trust — general information, not patient-specific.
 *
 * The service runs all three searches in parallel (Promise.allSettled) and formats
 * the results with explicit <source> provenance tags for regulatory traceability.
 *
 * SNOMED-CT style pattern hints
 * ──────────────────────────────
 * symptom-observation chunks are enriched with a curated pattern hint so the LLM
 * can reason about likely disease mappings without an extra round-trip:
 *   "Reported symptom: Irregular periods [pattern: PCOS, anovulation]"
 */

import { ragService } from "@/data/shared/service/rag/rag.service";
import { knowledgeBaseService } from "@/data/knowledge-base";
import type { SearchResult } from "@/data/shared/service/rag/rag.types";
import type { KBSearchResult } from "@/data/knowledge-base";
import {
  TRI_STORE_WEIGHTS,
  TRI_STORE_LABELS,
  type TriStoreId,
  type TriStoreProvenance,
  type TriStoreContextResult,
} from "@/data/shared/service/rag/tri-store.types";

// ── Store bucket definitions ──────────────────────────────────────────────────

const CONDITION_STORE_TYPES: Array<SearchResult["chunk"]["type"]> = [
  "condition",
  "medication",
  "prescription",
  "profile",
  "patient",
  "patient-summary",
];

const SYMPTOM_STORE_TYPES: Array<SearchResult["chunk"]["type"]> = [
  "symptom-observation",
  "assessment",
  "vital",
  "bloodtest",
  "soap",
];

// ── SNOMED-CT style symptom → disease pattern hints ───────────────────────────
// Curated map of lowercase symptom keywords to likely conditions. Used for
// provenance labels only — not for diagnosis. Avoids an extra LLM call.

const SYMPTOM_PATTERN_MAP: Array<{ keywords: string[]; pattern: string }> = [
  {
    keywords: [
      "irregular period",
      "irregular menstrual",
      "anovulation",
      "oligomenorrhea",
    ],
    pattern: "PCOS, anovulation",
  },
  {
    keywords: [
      "elevated hba1c",
      "high blood sugar",
      "fasting glucose",
      "hyperglycemia",
    ],
    pattern: "Type 2 Diabetes",
  },
  {
    keywords: [
      "high blood pressure",
      "hypertension",
      "elevated bp",
      "elevated blood pressure",
    ],
    pattern: "Hypertension",
  },
  {
    keywords: [
      "chest pain",
      "angina",
      "shortness of breath",
      "dyspnea on exertion",
    ],
    pattern: "Cardiovascular disease, Angina",
  },
  {
    keywords: [
      "fatigue",
      "weight gain",
      "cold intolerance",
      "bradycardia",
      "constipation",
    ],
    pattern: "Hypothyroidism",
  },
  {
    keywords: ["excessive thirst", "polyuria", "polydipsia", "weight loss"],
    pattern: "Diabetes mellitus",
  },
  {
    keywords: [
      "joint pain",
      "morning stiffness",
      "swollen joints",
      "arthralgia",
    ],
    pattern: "Rheumatoid arthritis, Osteoarthritis",
  },
  {
    keywords: ["skin rash", "photosensitivity", "butterfly rash", "malar rash"],
    pattern: "SLE, Lupus",
  },
  {
    keywords: ["abdominal pain", "diarrhea", "bloody stool", "rectal bleeding"],
    pattern: "IBD, Crohn's disease, Ulcerative colitis",
  },
  {
    keywords: ["hair loss", "alopecia", "thinning hair"],
    pattern: "PCOS, Thyroid disorder, Androgenic alopecia",
  },
  {
    keywords: [
      "palpitations",
      "racing heart",
      "tachycardia",
      "irregular heartbeat",
    ],
    pattern: "Arrhythmia, Hyperthyroidism",
  },
  {
    keywords: ["acne", "oily skin", "hirsutism", "facial hair"],
    pattern: "PCOS, Hormonal imbalance",
  },
  {
    keywords: ["low back pain", "back pain", "lumbar pain"],
    pattern: "Lumbar disc disease, Musculoskeletal disorder",
  },
  {
    keywords: ["headache", "migraine", "photophobia", "phonophobia"],
    pattern: "Migraine, Tension headache, Cluster headache",
  },
  {
    keywords: ["anxiety", "panic attack", "excessive worry", "restlessness"],
    pattern: "Generalized Anxiety Disorder, Panic Disorder",
  },
  {
    keywords: ["depression", "low mood", "anhedonia", "hopelessness"],
    pattern: "Major Depressive Disorder, Dysthymia",
  },
  {
    keywords: ["nausea", "vomiting", "morning nausea", "appetite loss"],
    pattern: "GERD, Pregnancy, GI dysmotility",
  },
  {
    keywords: ["swollen ankles", "peripheral edema", "leg swelling"],
    pattern: "Heart failure, CKD, Venous insufficiency",
  },
  {
    keywords: ["frequent urination", "urinary frequency", "nocturia"],
    pattern: "UTI, Diabetes, BPH, Overactive bladder",
  },
  {
    keywords: [
      "memory loss",
      "forgetfulness",
      "confusion",
      "cognitive decline",
    ],
    pattern: "Dementia, MCI, Depression",
  },
  {
    keywords: ["night sweats", "hot flashes", "flushing"],
    pattern: "Menopause, Hyperthyroidism, Lymphoma",
  },
  {
    keywords: ["wheezing", "cough", "shortness of breath", "dyspnea"],
    pattern: "Asthma, COPD, Pulmonary disease",
  },
  {
    keywords: ["blurred vision", "visual disturbance", "diplopia"],
    pattern: "Diabetic retinopathy, Glaucoma, Multiple sclerosis",
  },
  {
    keywords: ["tremor", "shaking", "stiffness", "bradykinesia"],
    pattern: "Parkinson's disease, Essential tremor",
  },
  {
    keywords: ["pallor", "fatigue", "weakness", "pallid"],
    pattern: "Iron-deficiency anemia, B12 deficiency",
  },
];

function inferSymptomPattern(content: string): string | undefined {
  const lower = content.toLowerCase();
  for (const entry of SYMPTOM_PATTERN_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.pattern;
    }
  }
  return undefined;
}

// ── Provenance label builders ─────────────────────────────────────────────────

function buildConditionLabel(result: SearchResult): string {
  const storeLabel = TRI_STORE_LABELS.condition_store;
  const type = result.chunk.type;
  const meta = result.chunk.metadata;
  const title = typeof meta.title === "string" ? meta.title : undefined;
  const name = typeof meta.name === "string" ? meta.name : undefined;
  const status = typeof meta.status === "string" ? ` (${meta.status})` : "";

  const subjectMap: Record<string, string> = {
    condition: "Active diagnosis",
    medication: "Medication",
    prescription: "Prescription",
    profile: "Patient profile",
    patient: "Patient record",
    "patient-summary": "Patient summary",
  };

  const subject = subjectMap[type] ?? type;
  const detail = title ?? name ?? result.chunk.sourceId;
  return `${storeLabel} → ${subject}: ${detail}${status}`;
}

function buildSymptomLabel(result: SearchResult): string {
  const storeLabel = TRI_STORE_LABELS.symptom_store;
  const type = result.chunk.type;
  const meta = result.chunk.metadata;
  const date =
    typeof meta.observedAt === "string"
      ? ` on ${meta.observedAt.slice(0, 10)}`
      : typeof meta.recordedAt === "string"
        ? ` on ${meta.recordedAt.slice(0, 10)}`
        : "";

  if (type === "symptom-observation") {
    const pattern = inferSymptomPattern(result.chunk.content);
    const patternHint = pattern ? ` [pattern: ${pattern}]` : "";
    const symptomTitle =
      typeof meta.title === "string" ? meta.title : "Symptom observation";
    return `${storeLabel} → Reported symptom: ${symptomTitle}${date}${patternHint}`;
  }

  const subjectMap: Record<string, string> = {
    assessment: "Clinical assessment",
    vital: "Vital sign",
    bloodtest: "Lab / blood test",
    soap: "SOAP note",
  };

  const subject = subjectMap[type] ?? type;
  const title =
    typeof meta.title === "string" ? meta.title : result.chunk.sourceId;
  return `${storeLabel} → ${subject}: ${title}${date}`;
}

function buildKbLabel(entry: KBSearchResult["entry"]): string {
  const storeLabel = TRI_STORE_LABELS.kb_store;
  const typeName =
    entry.type === "guideline"
      ? "Clinical guideline"
      : entry.type === "drug"
        ? "Drug reference"
        : entry.type === "protocol"
          ? "Clinical protocol"
          : entry.type === "article"
            ? "Medical article"
            : "Knowledge entry";
  const source = entry.source ? ` (${entry.source})` : "";
  return `${storeLabel} → ${typeName}: ${entry.category}: ${entry.title}${source}`;
}

// ── Section formatter ─────────────────────────────────────────────────────────

function wrapChunk(
  storeId: TriStoreId,
  weight: number,
  label: string,
  body: string,
): string {
  return `<source store="${storeId}" weight="${weight.toFixed(1)}" label="${label}">\n${body}\n</source>`;
}

function formatConditionResults(results: SearchResult[]): {
  text: string;
  provenance: TriStoreProvenance[];
} {
  if (results.length === 0) return { text: "", provenance: [] };
  const weight = TRI_STORE_WEIGHTS.condition_store;
  const provenance: TriStoreProvenance[] = [];
  const parts: string[] = [];

  for (const r of results) {
    const label = buildConditionLabel(r);
    provenance.push({
      store: "condition_store",
      weight,
      label,
      sourceId: r.chunk.sourceId,
      chunkType: r.chunk.type,
    });
    parts.push(wrapChunk("condition_store", weight, label, r.chunk.content));
  }

  return {
    text: `## Patient Condition Store (weight: ${weight.toFixed(1)} — Active clinical profile)\n\n${parts.join("\n\n")}`,
    provenance,
  };
}

function formatSymptomResults(results: SearchResult[]): {
  text: string;
  provenance: TriStoreProvenance[];
} {
  if (results.length === 0) return { text: "", provenance: [] };
  const weight = TRI_STORE_WEIGHTS.symptom_store;
  const provenance: TriStoreProvenance[] = [];
  const parts: string[] = [];

  for (const r of results) {
    const label = buildSymptomLabel(r);
    provenance.push({
      store: "symptom_store",
      weight,
      label,
      sourceId: r.chunk.sourceId,
      chunkType: r.chunk.type,
    });
    parts.push(wrapChunk("symptom_store", weight, label, r.chunk.content));
  }

  return {
    text: `## Patient Symptom Store (weight: ${weight.toFixed(1)} — Observed symptom / biomarker timeline)\n\n${parts.join("\n\n")}`,
    provenance,
  };
}

function formatKbResults(kbResults: KBSearchResult[]): {
  text: string;
  provenance: TriStoreProvenance[];
} {
  if (kbResults.length === 0) return { text: "", provenance: [] };
  const weight = TRI_STORE_WEIGHTS.kb_store;
  const provenance: TriStoreProvenance[] = [];
  const parts: string[] = [];

  for (const r of kbResults) {
    const label = buildKbLabel(r.entry);
    provenance.push({
      store: "kb_store",
      weight,
      label,
      sourceId: r.entry.id,
      chunkType: r.entry.type,
    });
    parts.push(wrapChunk("kb_store", weight, label, r.entry.content));
  }

  return {
    text: `## Clinical Knowledge Base (weight: ${weight.toFixed(1)} — General clinical guidelines)\n\n${parts.join("\n\n")}`,
    provenance,
  };
}

// ── Options ───────────────────────────────────────────────────────────────────

export interface TriStoreSearchOptions {
  userId: string;
  profileId: string;
  query: string;
  queryEmbedding?: number[];
  /** Wider limits for repair-mode re-retrieval */
  broaden?: boolean;
  rerank?: boolean;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class TriStoreRagService {
  async buildTriStoreContext(
    opts: TriStoreSearchOptions,
  ): Promise<TriStoreContextResult> {
    const startTime = performance.now();

    const limit = opts.broaden ? 25 : 12;
    const rerankTopK = opts.broaden ? 8 : 5;
    const rerankMinScoreRatio = opts.broaden ? 0.7 : 0.8;
    const kbTopK = opts.broaden ? 6 : 4;
    const rerank = opts.rerank ?? true;

    const [conditionResult, symptomResult, kbResult] = await Promise.allSettled(
      [
        ragService.search(opts.query, {
          userId: opts.userId,
          queryEmbedding: opts.queryEmbedding,
          types: CONDITION_STORE_TYPES,
          rerank,
          limit,
          rerankTopK,
          rerankMinScore: 0.01,
          rerankMinScoreRatio,
          minScore: 0.35,
        }),
        ragService.search(opts.query, {
          userId: opts.userId,
          queryEmbedding: opts.queryEmbedding,
          types: SYMPTOM_STORE_TYPES,
          rerank,
          limit,
          rerankTopK,
          rerankMinScore: 0.01,
          rerankMinScoreRatio,
          minScore: 0.35,
        }),
        knowledgeBaseService
          .search(opts.query, {
            topK: kbTopK,
            queryEmbedding: opts.queryEmbedding,
          })
          .catch((err: unknown) => {
            console.error("[TriStoreRAG] KB search failed:", err);
            return [];
          }),
      ],
    );

    const conditionChunks =
      conditionResult.status === "fulfilled" ? conditionResult.value : [];
    const symptomChunks =
      symptomResult.status === "fulfilled" ? symptomResult.value : [];
    const kbEntries = kbResult.status === "fulfilled" ? kbResult.value : [];

    const partialFailure =
      conditionResult.status === "rejected" ||
      symptomResult.status === "rejected" ||
      kbResult.status === "rejected";

    const conditionSection = formatConditionResults(conditionChunks);
    const symptomSection = formatSymptomResults(symptomChunks);
    const kbSection = formatKbResults(kbEntries);

    const sections = [
      conditionSection.text,
      symptomSection.text,
      kbSection.text,
    ].filter((s) => s.length > 0);

    const context = sections.length > 0 ? sections.join("\n\n") : "";

    const provenance = [
      ...conditionSection.provenance,
      ...symptomSection.provenance,
      ...kbSection.provenance,
    ];

    console.log(
      `[TriStoreRAG] Total: ${(performance.now() - startTime).toFixed(0)}ms` +
        ` | condition=${conditionChunks.length} symptom=${symptomChunks.length} kb=${kbEntries.length}`,
    );

    return {
      context,
      provenance,
      conditionCount: conditionChunks.length,
      symptomCount: symptomChunks.length,
      kbCount: kbEntries.length,
      partialFailure,
      allPatientResults: [...conditionChunks, ...symptomChunks],
      allKbResults: kbEntries,
    };
  }
}

export const triStoreRagService = new TriStoreRagService();
