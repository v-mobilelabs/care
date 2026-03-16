/**
 * @Indexable decorator — marks a UseCase for automatic RAG indexing.
 *
 * For create/update use cases:
 *   @Indexable({
 *     type: "condition",
 *     contentFields: ["name", "severity", "status", "description", "symptoms"],
 *     sourceIdField: "id",
 *     metadataFields: ["severity", "status", "createdAt"],
 *   })
 *   → builds content from result's contentFields, calls ragService.indexDocument()
 *
 * For delete use cases:
 *   @Indexable({ sourceIdField: "conditionId", remove: true })
 *   → calls ragService.removeDocument() using input[sourceIdField]
 *
 * Context is derived automatically:
 *   userId      = input.userId
 *   profileId   = this.dependentId ?? input.profileId ?? input.userId
 *   dependentId = this.dependentId (from use case constructor)
 */
import "reflect-metadata";
import type { DocumentChunk } from "@/data/shared/service/rag/rag.types";

/** Options for create/update — auto-builds content and indexes */
interface IndexableIndexOptions {
  type: DocumentChunk["type"];
  contentFields: string[];
  sourceIdField: string;
  /** Prepends to sourceId: `${prefix}:${value}` (e.g. "profile" → "profile:uid") */
  sourceIdPrefix?: string;
  metadataFields?: string[];
  /** Reserved for future use — defaults to "parallel" (fire-and-forget) */
  trigger?: "parallel";
}

/** Options for deletion — routes to ragService.removeDocument() */
interface IndexableRemoveOptions {
  /** Property name on the input that holds the document's source ID */
  sourceIdField: string;
  remove: true;
}

export type IndexableOptions = IndexableIndexOptions | IndexableRemoveOptions;

export function isRemoveOptions(
  opts: IndexableOptions,
): opts is IndexableRemoveOptions {
  return "remove" in opts && opts.remove === true;
}

const INDEXABLE_META = Symbol("indexable:meta");

export function Indexable(options: IndexableOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (target: any) {
    Reflect.defineMetadata(INDEXABLE_META, options, target);
  };
}

export function getIndexableOptions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  target: any,
): IndexableOptions | undefined {
  return Reflect.getMetadata(INDEXABLE_META, target.constructor || target);
}

// ── Content builders ──────────────────────────────────────────────────────────

/** Convert camelCase field name to readable label: "systolicBp" → "Systolic Bp" */
function camelToLabel(field: string): string {
  return field
    .replaceAll(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

/** Format a single value for embedding content. */
function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    if (typeof value[0] === "string" || typeof value[0] === "number") {
      return value.join(", ");
    }
    const lines = value.map((v) => `- ${JSON.stringify(v)}`);
    return `\n${lines.join("\n")}`;
  }
  if (typeof value === "object") return JSON.stringify(value);
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return JSON.stringify(value);
}

/** Build a content string from an object's fields for embedding. */
export function buildIndexContent(
  data: Record<string, unknown>,
  fields: string[],
): string {
  return fields
    .map((field) => {
      const value = data[field];
      if (value == null || value === "") return "";
      const label = camelToLabel(field);
      const formatted = formatValue(value);
      if (formatted.startsWith("\n")) return `${label}:${formatted}`;
      return `${label}: ${formatted}`;
    })
    .filter(Boolean)
    .join("\n");
}

/** Extract metadata key-value pairs from an object. */
export function buildIndexMetadata(
  data: Record<string, unknown>,
  fields: string[],
): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  for (const f of fields) {
    if (data[f] != null) meta[f] = data[f];
  }
  return meta;
}
