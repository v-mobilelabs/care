import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import {
  CreateKnowledgeBaseEntryUseCase,
  UpdateKnowledgeBaseEntryUseCase,
  knowledgeBaseService,
  type KnowledgeBaseDto,
  type KBSearchResult,
} from "@/data/knowledge-base";
import type {
  MedicationMatchDto,
  MedicationMatchResult,
} from "@/data/medications";
import { resolveMedicationMatchesFromWeb } from "@/data/medications/service/web-medication-resolver.service";
import { ApiError } from "@/lib/api/error";

const MedicationMatchRequestSchema = z.object({
  query: z.string().min(2),
  limit: z.number().int().min(1).max(20).optional().default(8),
  refresh: z.boolean().optional().default(false),
});

export interface MedicationMatchGraphInput {
  userId: string;
  profileId: string;
  req: Request;
  runInBackground?: (fn: () => void | Promise<void>) => void;
}

type RequestBody = z.infer<typeof MedicationMatchRequestSchema>;

type MedicationMatchGraphState = MedicationMatchGraphInput & {
  body: unknown;
  request: RequestBody | null;
  kbResults: KBSearchResult[];
  matches: MedicationMatchDto[];
  resolvedFrom: MedicationMatchResult["resolvedFrom"];
  result: MedicationMatchResult | null;
};

function normalizeText(value: string | undefined): string {
  return value?.replaceAll(/\s+/g, " ").trim().toLowerCase() ?? "";
}

function coerceString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.replaceAll(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => coerceString(item))
    .filter((item): item is string => Boolean(item));
}

function buildDisplay(args: {
  name: string;
  genericName?: string;
  dosage?: string;
  form?: string;
}): string {
  const parts = [args.name];
  if (
    args.genericName &&
    normalizeText(args.genericName) !== normalizeText(args.name)
  ) {
    parts.push(`(${args.genericName})`);
  }

  const suffix = [args.dosage, args.form].filter(Boolean).join(" • ");
  if (suffix) {
    parts.push(`• ${suffix}`);
  }

  return parts.join(" ").trim();
}

function kbEntryToMedicationMatch(
  entry: KnowledgeBaseDto,
): MedicationMatchDto | null {
  if (entry.type !== "drug") {
    return null;
  }

  const metadata = entry.metadata;
  const brandName = coerceString(metadata.brandName);
  const genericName = coerceString(metadata.genericName);
  const dosage = coerceString(metadata.dosage);
  const form = coerceString(metadata.form);
  const route = coerceString(metadata.route);
  const drugType = coerceString(metadata.drugType);
  const composition = coerceStringArray(metadata.composition);
  const preferredName = brandName ?? coerceString(metadata.name) ?? entry.title;

  return {
    id: entry.id,
    name: preferredName,
    ...(brandName ? { brandName } : {}),
    ...(genericName ? { genericName } : {}),
    ...(dosage ? { dosage } : {}),
    ...(form ? { form } : {}),
    ...(route ? { route } : {}),
    ...(drugType ? { drugType } : {}),
    ...(composition.length > 0 ? { composition } : {}),
    display: buildDisplay({
      name: preferredName,
      genericName,
      dosage,
      form,
    }),
    source: "knowledge_base",
    ...(entry.sourceUrl ? { sourceUrl: entry.sourceUrl } : {}),
    confidence: "high",
  };
}

function scoreMedicationMatch(
  match: MedicationMatchDto,
  query: string,
): number {
  const normalizedQuery = normalizeText(query);
  const fields = [
    match.name,
    match.brandName,
    match.genericName,
    ...(match.composition ?? []),
  ]
    .map((item) => normalizeText(item))
    .filter((item) => item.length > 0);

  if (fields.length === 0) {
    return 0;
  }

  if (fields.some((field) => field === normalizedQuery)) {
    return 100;
  }

  if (fields.some((field) => field.startsWith(normalizedQuery))) {
    return 80;
  }

  if (fields.some((field) => field.includes(normalizedQuery))) {
    return 60;
  }

  if (
    normalizedQuery.length >= 4 &&
    fields.some((field) => normalizedQuery.startsWith(field))
  ) {
    return 40;
  }

  const searchSpace = fields.join(" ");

  if (!searchSpace) {
    return 0;
  }

  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  const matchedTerms = queryTerms.filter((term) => searchSpace.includes(term));
  return matchedTerms.length > 0 ? matchedTerms.length : 0;
}

function selectKnowledgeBaseMatches(args: {
  results: KBSearchResult[];
  query: string;
  limit: number;
}): MedicationMatchDto[] {
  const normalizedQuery = normalizeText(args.query);
  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  const isShortSingleDrugQuery =
    queryTerms.length === 1 && normalizedQuery.length <= 16;

  return args.results
    .map((result) => kbEntryToMedicationMatch(result.entry))
    .filter((match): match is MedicationMatchDto => match !== null)
    .map((match) => ({ match, score: scoreMedicationMatch(match, args.query) }))
    .filter(({ score }) => {
      if (isShortSingleDrugQuery) {
        return score >= 60;
      }
      return score > 0;
    })
    .sort((left, right) => right.score - left.score)
    .map(({ match }) => match)
    .slice(0, args.limit);
}

function shouldUseWebFallback(
  state: MedicationMatchGraphState,
): "resolve_web" | "finalize" {
  return state.matches.length > 0 ? "finalize" : "resolve_web";
}

function toKnowledgeBaseContent(match: MedicationMatchDto): string {
  return [
    `Medication: ${match.name}`,
    match.brandName ? `Brand name: ${match.brandName}` : "",
    match.genericName ? `Generic name: ${match.genericName}` : "",
    match.dosage ? `Dosage: ${match.dosage}` : "",
    match.form ? `Form: ${match.form}` : "",
    match.route ? `Route: ${match.route}` : "",
    match.drugType ? `Drug type: ${match.drugType}` : "",
    match.composition && match.composition.length > 0
      ? `Composition: ${match.composition.join(", ")}`
      : "",
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

function toKnowledgeBaseTags(match: MedicationMatchDto): string[] {
  return [
    "medication",
    "drug",
    match.brandName ?? "",
    match.genericName ?? "",
    match.dosage ?? "",
    ...(match.composition ?? []),
  ].filter((tag) => tag.trim().length > 0);
}

function toKnowledgeBaseMetadata(
  match: MedicationMatchDto,
  query: string,
): Record<string, unknown> {
  return {
    name: match.name,
    brandName: match.brandName,
    genericName: match.genericName,
    dosage: match.dosage,
    form: match.form,
    route: match.route,
    drugType: match.drugType,
    composition: match.composition ?? [],
    seededFromQuery: query,
  };
}

function isDuplicateKnowledgeBaseHit(args: {
  existing: KBSearchResult[];
  match: MedicationMatchDto;
}): boolean {
  const matchKeys = new Set(
    [args.match.name, args.match.brandName, args.match.genericName]
      .map((item) => normalizeText(item))
      .filter((item) => item.length > 0),
  );

  return args.existing.some(({ entry }) => {
    const metadata = entry.metadata;
    const existingKeys = [
      entry.title,
      coerceString(metadata.name),
      coerceString(metadata.brandName),
      coerceString(metadata.genericName),
    ]
      .map((item) => normalizeText(item))
      .filter((item) => item.length > 0);

    return existingKeys.some((item) => matchKeys.has(item));
  });
}

function scheduleKnowledgeBaseEnrichment(
  state: MedicationMatchGraphState,
): Partial<MedicationMatchGraphState> {
  if (
    state.resolvedFrom !== "web" ||
    state.matches.length === 0 ||
    !state.request
  ) {
    return {};
  }

  const request = state.request;
  const webMatches = state.matches.filter((match) => match.source === "web");
  if (webMatches.length === 0) {
    return {};
  }

  const runBackground = state.runInBackground ?? ((fn) => setTimeout(fn, 0));

  runBackground(async () => {
    await Promise.all(
      webMatches.map(async (match) => {
        const existingHits = state.request?.refresh
          ? await knowledgeBaseService.searchByNormalizedTag(
              match.brandName ?? match.name,
              { topK: 3, type: "drug" },
            )
          : state.kbResults;

        const duplicate = existingHits.find(({ entry }) => {
          const existingKeys = [
            entry.title,
            coerceString(entry.metadata.name),
            coerceString(entry.metadata.brandName),
            coerceString(entry.metadata.genericName),
          ]
            .map((item) => normalizeText(item))
            .filter((item) => item.length > 0);
          const matchKeys = [match.name, match.brandName, match.genericName]
            .map((item) => normalizeText(item))
            .filter((item) => item.length > 0);
          return existingKeys.some((item) => matchKeys.includes(item));
        });

        if (duplicate && state.request?.refresh) {
          await new UpdateKnowledgeBaseEntryUseCase()
            .execute({
              userId: state.userId,
              entryId: duplicate.entry.id,
              title: match.brandName ?? match.name,
              type: "drug",
              category: "Pharmacology",
              subcategory: match.drugType,
              content: toKnowledgeBaseContent(match),
              tags: toKnowledgeBaseTags(match),
              source: "Google Search",
              sourceUrl: match.sourceUrl,
              metadata: toKnowledgeBaseMetadata(match, request.query),
            })
            .catch((error: unknown) => {
              console.error(
                "[MedicationMatchWorkflow] KB refresh update failed:",
                error,
              );
            });
          return;
        }

        if (
          duplicate ||
          isDuplicateKnowledgeBaseHit({ existing: state.kbResults, match })
        ) {
          return;
        }

        await new CreateKnowledgeBaseEntryUseCase()
          .execute({
            userId: state.userId,
            title: match.brandName ?? match.name,
            type: "drug",
            category: "Pharmacology",
            subcategory: match.drugType,
            content: toKnowledgeBaseContent(match),
            tags: toKnowledgeBaseTags(match),
            source: "Google Search",
            sourceUrl: match.sourceUrl,
            metadata: toKnowledgeBaseMetadata(match, request.query),
          })
          .catch((error: unknown) => {
            console.error(
              "[MedicationMatchWorkflow] KB enrichment failed:",
              error,
            );
          });
      }),
    );
  });

  return {};
}

async function parseBodyNode(
  state: MedicationMatchGraphState,
): Promise<Partial<MedicationMatchGraphState>> {
  const body = await state.req.json().catch(() => null);
  if (!body) {
    throw ApiError.badRequest("Expected JSON body with query.");
  }

  return { body };
}

function validateRequestNode(
  state: MedicationMatchGraphState,
): Partial<MedicationMatchGraphState> {
  const parsed = MedicationMatchRequestSchema.safeParse(state.body);
  if (!parsed.success) {
    throw ApiError.badRequest("query must contain at least 2 characters");
  }

  return { request: parsed.data };
}

async function searchKnowledgeBaseNode(
  state: MedicationMatchGraphState,
): Promise<Partial<MedicationMatchGraphState>> {
  if (!state.request) {
    throw new Error("[MedicationMatchWorkflow] Missing validated request");
  }

  if (state.request.refresh) {
    return {
      kbResults: [],
      matches: [],
      resolvedFrom: "none",
    };
  }

  const topK = Math.max(state.request.limit, 8);

  // Fast path: tag-based lookup skips embedding entirely (~sub-second)
  const fastResults = await knowledgeBaseService.searchByNormalizedTag(
    state.request.query,
    { topK, type: "drug" },
  );

  if (fastResults.length > 0) {
    const fastMatches = selectKnowledgeBaseMatches({
      results: fastResults,
      query: state.request.query,
      limit: state.request.limit,
    });

    if (fastMatches.length > 0) {
      return {
        kbResults: fastResults,
        matches: fastMatches,
        resolvedFrom: "knowledge_base",
      };
    }
  }

  // Slow path: full vector search with embedding
  const kbResults = await knowledgeBaseService.search(state.request.query, {
    topK,
    type: "drug",
  });

  const matches = selectKnowledgeBaseMatches({
    results: kbResults,
    query: state.request.query,
    limit: state.request.limit,
  });

  return {
    kbResults,
    matches,
    resolvedFrom: matches.length > 0 ? "knowledge_base" : "none",
  };
}

async function resolveWebNode(
  state: MedicationMatchGraphState,
): Promise<Partial<MedicationMatchGraphState>> {
  if (!state.request) {
    throw new Error("[MedicationMatchWorkflow] Missing validated request");
  }

  const matches = await resolveMedicationMatchesFromWeb({
    userId: state.userId,
    query: state.request.query,
    limit: state.request.limit,
  });

  return {
    matches,
    resolvedFrom: matches.length > 0 ? "web" : "none",
  };
}

function finalizeNode(
  state: MedicationMatchGraphState,
): Partial<MedicationMatchGraphState> {
  if (!state.request) {
    throw new Error(
      "[MedicationMatchWorkflow] Missing request during finalize",
    );
  }

  return {
    result: {
      query: state.request.query,
      resolvedFrom: state.resolvedFrom,
      matches: state.matches,
    },
  };
}

const medicationMatchGraph = new StateGraph(
  Annotation.Root({
    userId: Annotation<string>(),
    profileId: Annotation<string>(),
    req: Annotation<Request>(),
    runInBackground: Annotation<((fn: () => void | Promise<void>) => void) | undefined>(),
    body: Annotation<unknown>(),
    request: Annotation<RequestBody | null>(),
    kbResults: Annotation<KBSearchResult[]>(),
    matches: Annotation<MedicationMatchDto[]>(),
    resolvedFrom: Annotation<MedicationMatchResult["resolvedFrom"]>(),
    result: Annotation<MedicationMatchResult | null>(),
  }),
)
  .addNode("parse_body", parseBodyNode)
  .addNode("validate_request", validateRequestNode)
  .addNode("search_knowledge_base", searchKnowledgeBaseNode)
  .addNode("resolve_web", resolveWebNode)
  .addNode("schedule_kb_enrichment", scheduleKnowledgeBaseEnrichment)
  .addNode("finalize", finalizeNode)
  .addEdge(START, "parse_body")
  .addEdge("parse_body", "validate_request")
  .addEdge("validate_request", "search_knowledge_base")
  .addConditionalEdges("search_knowledge_base", shouldUseWebFallback, {
    finalize: "finalize",
    resolve_web: "resolve_web",
  })
  .addEdge("resolve_web", "schedule_kb_enrichment")
  .addEdge("schedule_kb_enrichment", "finalize")
  .addEdge("finalize", END)
  .compile();

export async function runMedicationMatchGraph(
  input: MedicationMatchGraphInput,
): Promise<MedicationMatchResult> {
  const finalState = (await medicationMatchGraph.invoke({
    ...input,
    body: null,
    request: null,
    kbResults: [],
    matches: [],
    resolvedFrom: "none",
    result: null,
  })) as MedicationMatchGraphState;

  if (!finalState.result) {
    throw new Error("[MedicationMatchWorkflow] Missing result");
  }

  return finalState.result;
}
