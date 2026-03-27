import type { ModelMessage } from "ai";
import type {
  CaptureEvidenceInput,
  CitationDto,
  ConfidenceScoreDto,
  ReasoningStepDto,
} from "@/data/evidence/models/evidence.model";
import { getConfidenceLabel } from "@/data/evidence/models/evidence.model";

export interface EvidenceExtractorOptions {
  agentType: string;
  thinkingLevel: "low" | "medium" | "high";
  modelUsed: string;
}

export class EvidenceExtractor {
  static extract(
    messages: ModelMessage[],
    thinkingContent: string | undefined,
    options: EvidenceExtractorOptions,
  ): Omit<
    CaptureEvidenceInput,
    "messageId" | "sessionId" | "userId" | "profileId"
  > {
    const reasoning = this.extractReasoningSteps(thinkingContent);
    const citations = this.extractCitations(messages, options.agentType);
    const confidenceScores = this.computeConfidenceScores(reasoning, citations);

    const hasConfidenceScores = confidenceScores.length > 0;
    const average = hasConfidenceScores
      ? Math.round(
          confidenceScores.reduce((sum, item) => sum + item.score, 0) /
            confidenceScores.length,
        )
      : undefined;

    const summary = this.buildSummary(reasoning, citations, options.agentType);

    const result: Omit<
      CaptureEvidenceInput,
      "messageId" | "sessionId" | "userId" | "profileId"
    > = {
      agentType: options.agentType,
      thinkingLevel: options.thinkingLevel,
      modelUsed: options.modelUsed,
      thinkingContent,
      reasoning,
      citations,
      confidenceScores,
    };

    if (average !== undefined) {
      result.overallConfidence = average;
      result.confidenceLabel = getConfidenceLabel(average);
    }
    if (summary) result.summary = summary;

    return result;
  }

  private static extractReasoningSteps(
    thinkingContent: string | undefined,
  ): ReasoningStepDto[] {
    if (!thinkingContent || thinkingContent.trim().length === 0) return [];

    const normalized = thinkingContent
      .replaceAll("\r\n", "\n")
      .replaceAll("\r", "\n")
      .trim();
    if (normalized.length === 0) return [];

    const numberedMatches = Array.from(
      normalized.matchAll(/(?:^|\n)\s*(\d+)[.)]\s+([^\n]+)/g),
    );

    if (numberedMatches.length > 0) {
      return numberedMatches.map((match, index) => {
        const explicitNumber = Number(match[1]);
        const stepNumber = Number.isFinite(explicitNumber)
          ? explicitNumber
          : index + 1;
        const description = (match[2] ?? "").trim();
        return {
          stepNumber,
          description,
          reasoning: description,
          dataUsed: ["thinking"],
        };
      });
    }

    const sentenceParts = normalized
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0);

    return sentenceParts.slice(0, 8).map((description, index) => ({
      stepNumber: index + 1,
      description,
      reasoning: description,
      dataUsed: ["thinking"],
    }));
  }

  private static extractCitations(
    messages: ModelMessage[],
    agentType: string,
  ): CitationDto[] {
    const citations: CitationDto[] = [];
    const seen = new Set<string>();

    for (const message of messages) {
      const content = message.content;
      if (!Array.isArray(content)) continue;

      const extracted = this.extractCitationsFromParts(content, agentType);
      for (const citation of extracted) {
        const key = this.buildCitationKey(citation);
        if (seen.has(key)) continue;
        seen.add(key);
        citations.push(citation);
      }
    }

    return citations;
  }

  private static buildCitationKey(citation: CitationDto): string {
    const fallback = "unknown";
    const identity =
      citation.sourceId || citation.title || citation.snippet || fallback;
    return `${citation.sourceType}:${identity}`;
  }

  private static extractCitationsFromParts(
    parts: unknown[],
    agentType: string,
  ): CitationDto[] {
    const extracted: CitationDto[] = [];

    for (const part of parts) {
      if (!part || typeof part !== "object") continue;

      const typedPart = part as Record<string, unknown>;
      const type = this.getPartType(typedPart);
      if (!type) continue;

      if (type === "tool-result") {
        const toolName = this.getToolName(type, typedPart);
        extracted.push(this.createToolResultCitation(toolName));
        continue;
      }

      const isToolCallType = type === "tool-call" || type.startsWith("tool-");
      if (!isToolCallType) continue;

      const toolName = this.getToolName(type, typedPart);
      extracted.push(this.createToolCallCitation(toolName, agentType));
    }

    return extracted;
  }

  private static getPartType(
    typedPart: Record<string, unknown>,
  ): string | undefined {
    return typeof typedPart.type === "string" ? typedPart.type : undefined;
  }

  private static getToolName(
    type: string,
    typedPart: Record<string, unknown>,
  ): string {
    if (typeof typedPart.toolName === "string") return typedPart.toolName;
    if (type.startsWith("tool-")) return type.replaceAll("tool-", "");
    return "unknown-tool";
  }

  private static createToolCallCitation(
    toolName: string,
    agentType: string,
  ): CitationDto {
    return {
      sourceType: this.mapToolNameToSourceType(toolName),
      sourceId: toolName,
      title: `Tool: ${toolName}`,
      usageContext: `Used by ${agentType} agent during response generation`,
      relevanceScore: 0.8,
    };
  }

  private static createToolResultCitation(toolName: string): CitationDto {
    return {
      sourceType: this.mapToolNameToSourceType(toolName),
      sourceId: toolName,
      title: `Tool result: ${toolName}`,
      usageContext: "Used as supporting output for final response",
      relevanceScore: 0.85,
    };
  }

  private static computeConfidenceScores(
    reasoning: ReasoningStepDto[],
    citations: CitationDto[],
  ): ConfidenceScoreDto[] {
    const reasoningQuality = this.calculateReasoningQuality(reasoning);
    const citationStrength = this.calculateCitationStrength(citations);
    const dataCompleteness = this.calculateDataCompleteness(
      reasoning,
      citations,
    );

    const baseScore = Math.round(
      reasoningQuality * 0.4 + citationStrength * 0.4 + dataCompleteness * 0.2,
    );

    const metrics: ReadonlyArray<ConfidenceScoreDto["metric"]> = [
      "diagnostic_confidence",
      "therapeutic_confidence",
      "triage_confidence",
      "clinical_quality",
    ];

    return metrics.map((metric, index) => {
      const adjustment = this.getMetricAdjustment(index);
      const score = this.clamp(Math.round(baseScore + adjustment), 0, 100);

      return {
        metric,
        score,
        label: getConfidenceLabel(score),
        factors: {
          dataCompleteness,
          evidenceStrength: citationStrength,
          contextClarity: reasoningQuality,
        },
        rationale:
          "Weighted composite: 40% reasoning quality, 40% citation strength, 20% data completeness.",
      };
    });
  }

  private static getMetricAdjustment(index: number): number {
    if (index === 0) return 0;
    if (index === 1) return -2;
    if (index === 2) return -4;
    return -1;
  }

  private static calculateReasoningQuality(
    reasoning: ReasoningStepDto[],
  ): number {
    if (reasoning.length === 0) return 30;

    const averageLength =
      reasoning.reduce((sum, step) => sum + step.description.length, 0) /
      reasoning.length;

    const coverage = this.clamp(reasoning.length * 15, 0, 60);
    const detail = this.clamp(Math.round(averageLength / 2), 0, 40);

    return this.clamp(coverage + detail, 0, 100);
  }

  private static calculateCitationStrength(citations: CitationDto[]): number {
    if (citations.length === 0) return 25;

    const countScore = this.clamp(citations.length * 20, 0, 70);
    const avgRelevance =
      citations.reduce(
        (sum, citation) => sum + this.getRelevance(citation),
        0,
      ) / citations.length;
    const relevanceScore = this.clamp(Math.round(avgRelevance * 30), 0, 30);

    return this.clamp(countScore + relevanceScore, 0, 100);
  }

  private static getRelevance(citation: CitationDto): number {
    return citation.relevanceScore ?? 0.6;
  }

  private static calculateDataCompleteness(
    reasoning: ReasoningStepDto[],
    citations: CitationDto[],
  ): number {
    const hasReasoning = reasoning.length > 0 ? 50 : 0;
    const hasCitations = citations.length > 0 ? 50 : 0;
    return hasReasoning + hasCitations;
  }

  private static mapToolNameToSourceType(
    toolName: string,
  ): CitationDto["sourceType"] {
    if (toolName === "searchPatientRecords") return "rag";
    if (toolName === "searchGuidelines") return "guideline";
    if (toolName === "memory") return "memory";
    if (toolName === "askQuestion") return "tool";
    if (toolName.toLowerCase().includes("ehr")) return "ehr";
    return "tool";
  }

  private static buildSummary(
    reasoning: ReasoningStepDto[],
    citations: CitationDto[],
    agentType: string,
  ): string | undefined {
    if (reasoning.length === 0 && citations.length === 0) return undefined;

    const reasoningText = this.buildCountPhrase(
      reasoning.length,
      "reasoning step",
      "no explicit reasoning steps",
    );
    const citationText = this.buildCountPhrase(
      citations.length,
      "citation",
      "no citations",
    );

    return `${agentType} response captured with ${reasoningText} and ${citationText}.`;
  }

  private static buildCountPhrase(
    count: number,
    singular: string,
    emptyMessage: string,
  ): string {
    if (count === 0) return emptyMessage;
    const suffix = count > 1 ? "s" : "";
    return `${count} ${singular}${suffix}`;
  }

  private static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
