import { CreateSymptomObservationUseCase } from "@/data/symptom-observations";
import { normalizeClinicalSymptomTerm } from "./clinical-symptom-normalizer";
import { normalizeClinicalTermsWithLlm } from "./llm-clinical-symptom-normalizer.service";

export interface AssessmentQaForSymptomSync {
  toolCallId?: string;
  question: string;
  questionType: string;
  options?: string[];
  answer: string;
}

type SymptomEntry = {
  symptom: string;
  answer: string;
  severity?: number;
  toolCallId?: string;
};

function parseSeverityFromAnswer(answer: string): number | undefined {
  const trimmed = answer.trim();
  if (!trimmed) return undefined;

  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric) && numeric >= 0 && numeric <= 10) {
    return Math.round(numeric);
  }

  const match = /\b(10|\d)\b/.exec(trimmed);
  if (!match) return undefined;

  const parsed = Number(match[1]);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 10) return undefined;

  return parsed;
}

function isNegativeBinaryAnswer(answer: string): boolean {
  const normalized = answer.trim().toLowerCase();
  return ["no", "none", "not at all", "never"].includes(normalized);
}

function normalizeSymptomLabel(question: string): string {
  return question
    .replaceAll(/[?\s]+$/g, "")
    .trim()
    .slice(0, 160);
}

function extractSymptomFromQuestion(question: string): string | null {
  const cleaned = normalizeSymptomLabel(question);
  if (!cleaned) return null;

  const patterns = [
    /^(?:do you have|are you having|are you experiencing|have you had|did you notice)\s+(.+)$/i,
    /^(?:is there|any)\s+(.+)$/i,
    /^(?:rate|describe)\s+(?:your\s+)?(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(cleaned);
    const value = match?.[1]?.trim();
    if (value) {
      return value.replaceAll(/^(a|an|any|the)\s+/i, "").trim();
    }
  }

  return null;
}

function normalizeAnswerLabel(answer: string): string {
  return answer
    .replaceAll(/[?\s]+$/g, "")
    .trim()
    .slice(0, 160);
}

function isGenericAnswerLabel(answer: string): boolean {
  const normalized = answer.trim().toLowerCase();
  return ["yes", "no", "none", "not at all", "never"].includes(normalized);
}

function splitMultiChoiceAnswer(answer: string): string[] {
  return answer
    .split(/[;,]|\band\b/gi)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 5);
}

function pickSymptomLabel(pair: AssessmentQaForSymptomSync): string {
  const questionLabel =
    extractSymptomFromQuestion(pair.question) ?? normalizeSymptomLabel(pair.question);
  const answerLabel = normalizeAnswerLabel(pair.answer);

  if (!answerLabel || isGenericAnswerLabel(answerLabel)) return questionLabel;

  const options = pair.options ?? [];
  const matchedOption = options.find(
    (option) => option.trim().toLowerCase() === answerLabel.toLowerCase(),
  );

  if (matchedOption) return normalizeAnswerLabel(matchedOption);

  if (pair.questionType.trim().toLowerCase() === "multi_choice") {
    const fragments = splitMultiChoiceAnswer(answerLabel);
    if (fragments.length > 0) return normalizeAnswerLabel(fragments[0]);
  }

  return questionLabel;
}

function toIdempotencyKey(args: {
  sessionId: string;
  runId?: string;
  toolCallId?: string;
  symptom: string;
  answer: string;
}): string {
  const runId = args.runId ?? "session";
  const normalizedSymptom = args.symptom
    .toLowerCase()
    .replaceAll(/\s+/g, "-");
  const normalizedAnswer = args.answer.toLowerCase().replaceAll(/\s+/g, "-");

  const parts = [args.sessionId, runId];
  if (args.toolCallId) {
    parts.push(args.toolCallId);
  } else {
    parts.push(normalizedSymptom, normalizedAnswer);
  }

  return `assessment:${parts.join(":")}`.slice(0, 200);
}

function buildSymptomEntryFromQa(
  pair: AssessmentQaForSymptomSync,
): SymptomEntry | null {
  const answer = pair.answer.trim();
  if (!answer) return null;

  const type = pair.questionType.trim().toLowerCase();
  const isBinary = type === "yes_no" || type === "binary";
  if (isBinary && isNegativeBinaryAnswer(answer)) return null;

  const symptom = pickSymptomLabel(pair);
  if (!symptom) return null;

  return {
    symptom: normalizeClinicalSymptomTerm(symptom),
    answer,
    severity: type === "scale" ? parseSeverityFromAnswer(answer) : undefined,
    toolCallId: pair.toolCallId,
  };
}

function isPresentEntry(value: SymptomEntry | null): value is SymptomEntry {
  return value !== null;
}

export async function syncSymptomObservationsFromAssessment(args: {
  userId: string;
  sessionId: string;
  runId?: string;
  assessmentId?: string;
  conditionId?: string;
  condition?: string;
  qa: AssessmentQaForSymptomSync[];
}) {
  const entries = args.qa
    .map(buildSymptomEntryFromQa)
    .filter(isPresentEntry)
    .slice(0, 20);

  if (entries.length === 0) return;

  const llmNormalizedSymptoms = await normalizeClinicalTermsWithLlm({
    userId: args.userId,
    terms: entries.map((entry) => entry.symptom),
  });

  const normalizedEntries = entries.map((entry, index) => ({
    ...entry,
    symptom: normalizeClinicalSymptomTerm(
      llmNormalizedSymptoms[index] ?? entry.symptom,
    ),
  }));

  await Promise.all(
    normalizedEntries.map(async (entry) =>
      new CreateSymptomObservationUseCase().execute({
        userId: args.userId,
        sessionId: args.sessionId,
        assessmentId: args.assessmentId,
        conditionId: args.conditionId,
        symptom: entry.symptom,
        ...(entry.severity === undefined ? {} : { severity: entry.severity }),
        notes: args.condition
          ? `${entry.answer}\n\nCondition context: ${args.condition}`
          : entry.answer,
        source: "assessment",
        idempotencyKey: toIdempotencyKey({
          sessionId: args.sessionId,
          runId: args.runId,
          toolCallId: entry.toolCallId,
          symptom: entry.symptom,
          answer: entry.answer,
        }),
      }),
    ),
  );
}
