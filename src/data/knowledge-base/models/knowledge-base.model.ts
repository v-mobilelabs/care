import { z } from "zod";
import type { Timestamp, FieldValue } from "firebase-admin/firestore";

// ── Entry types ───────────────────────────────────────────────────────────────

export const KB_ENTRY_TYPES = [
  "article",
  "guideline",
  "drug",
  "protocol",
  "reference",
  "file",
  "other",
] as const;

export type KBEntryType = (typeof KB_ENTRY_TYPES)[number];

export const KB_STATUSES = ["active", "archived"] as const;
export type KBStatus = (typeof KB_STATUSES)[number];

// ── File reference (lightweight metadata, not the actual file) ───────────────

export interface KBFileRef {
  fileId: string;
  profileId: string;
  name: string;
  mimeType: string;
  size: number;
  storagePath: string;
}

export const KBFileRefSchema = z.object({
  fileId: z.string().min(1),
  profileId: z.string().min(1),
  name: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().min(0),
  storagePath: z.string().min(1),
});

// ── Firestore document shape ──────────────────────────────────────────────────

export interface KnowledgeBaseDocument {
  /** Short title / headline */
  title: string;
  /** Entry classification */
  type: KBEntryType;
  /** Top-level category (e.g. "Cardiology", "Pharmacology", "Nutrition") */
  category: string;
  /** Optional sub-category for finer grouping */
  subcategory?: string;
  /** Full text content that is embedded for vector search */
  content: string;
  /** Free-form tags for filtering and search */
  tags: string[];
  /** Attribution / origin (e.g. "AHA 2024", "CDSCO", user-entered) */
  source?: string;
  /** URL to the original source document */
  sourceUrl?: string;
  /** Active or soft-deleted */
  status: KBStatus;
  /** Flexible extra data — schema varies per entry type */
  metadata: Record<string, unknown>;
  /** Optional file reference (only metadata + pointer, not the bytes) */
  file?: KBFileRef;
  /** 768-dim embedding vector (VectorValue in Firestore) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  embedding: number[] | any;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface KnowledgeBaseDto {
  id: string;
  title: string;
  type: KBEntryType;
  category: string;
  subcategory?: string;
  content: string;
  tags: string[];
  source?: string;
  sourceUrl?: string;
  status: KBStatus;
  metadata: Record<string, unknown>;
  file?: KBFileRef;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toKnowledgeBaseDto(
  id: string,
  doc: KnowledgeBaseDocument,
): KnowledgeBaseDto {
  const toISO = (ts: KnowledgeBaseDocument["createdAt"]) => {
    if (ts && typeof (ts as Timestamp).toDate === "function") {
      return (ts as Timestamp).toDate().toISOString();
    }
    return new Date().toISOString();
  };

  return {
    id,
    title: doc.title,
    type: doc.type,
    category: doc.category,
    subcategory: doc.subcategory,
    content: doc.content,
    tags: doc.tags,
    source: doc.source,
    sourceUrl: doc.sourceUrl,
    status: doc.status,
    metadata: doc.metadata,
    file: doc.file,
    createdAt: toISO(doc.createdAt),
    updatedAt: toISO(doc.updatedAt),
  };
}

// ── DTO — inbound (create) ────────────────────────────────────────────────────

export const CreateKnowledgeBaseSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  title: z.string().min(1, { message: "title is required" }).max(500),
  type: z.enum(KB_ENTRY_TYPES),
  category: z.string().min(1, { message: "category is required" }),
  subcategory: z.string().optional(),
  content: z.string().min(1, { message: "content is required" }),
  tags: z.array(z.string()).optional().default([]),
  source: z.string().optional(),
  sourceUrl: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  file: KBFileRefSchema.optional(),
});

export type CreateKnowledgeBaseInput = z.infer<
  typeof CreateKnowledgeBaseSchema
>;

// ── DTO — inbound (update) ────────────────────────────────────────────────────

export const UpdateKnowledgeBaseSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  entryId: z.string().min(1, { message: "entryId is required" }),
  title: z.string().min(1).max(500).optional(),
  type: z.enum(KB_ENTRY_TYPES).optional(),
  category: z.string().min(1).optional(),
  subcategory: z.string().optional(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  sourceUrl: z.string().optional(),
  status: z.enum(KB_STATUSES).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  file: KBFileRefSchema.optional(),
});

export type UpdateKnowledgeBaseInput = z.infer<
  typeof UpdateKnowledgeBaseSchema
>;

// ── DTO — inbound (list) ─────────────────────────────────────────────────────

export const ListKnowledgeBaseSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  limit: z.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
  category: z.string().optional(),
  type: z.enum(KB_ENTRY_TYPES).optional(),
  status: z.enum(KB_STATUSES).optional().default("active"),
});

export type ListKnowledgeBaseInput = z.infer<typeof ListKnowledgeBaseSchema>;

// ── DTO — inbound (get / delete) ─────────────────────────────────────────────

export const KnowledgeBaseRefSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  entryId: z.string().min(1, { message: "entryId is required" }),
});

export type KnowledgeBaseRefInput = z.infer<typeof KnowledgeBaseRefSchema>;

// ── DTO — inbound (search) ───────────────────────────────────────────────────

export const SearchKnowledgeBaseSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  query: z.string().min(1, { message: "query is required" }),
  topK: z.number().int().min(1).max(50).optional().default(5),
  category: z.string().optional(),
  type: z.enum(KB_ENTRY_TYPES).optional(),
});

export type SearchKnowledgeBaseInput = z.infer<
  typeof SearchKnowledgeBaseSchema
>;

// ── Paginated response ───────────────────────────────────────────────────────

export interface PaginatedKnowledgeBase {
  entries: KnowledgeBaseDto[];
  nextCursor: string | null;
  totalCount?: number;
}

// ── Firestore collection name ────────────────────────────────────────────────

export const KB_COLLECTION = "knowledge_base";
