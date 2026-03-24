import { memoryRepository } from "../repositories/memory.repository";
import type {
  MemoryDto,
  MemoryCategory,
  SaveMemoryInput,
  RecallMemoriesInput,
  DeleteMemoryInput,
  DeleteManyMemoriesInput,
  ListMemoriesInput,
  PaginatedMemoriesDto,
} from "../models/memory.model";

// ── Formatting helpers ────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  medical: "Medical Facts",
  allergy: "Allergies & Sensitivities",
  preference: "Patient Preferences",
  lifestyle: "Lifestyle & Habits",
  summary: "Session Summaries",
};

function groupByCategory(memories: MemoryDto[]): Map<MemoryCategory, string[]> {
  const grouped = new Map<MemoryCategory, string[]>();
  for (const mem of memories) {
    const list = grouped.get(mem.category) ?? [];
    list.push(mem.content);
    grouped.set(mem.category, list);
  }
  return grouped;
}

function formatGrouped(grouped: Map<MemoryCategory, string[]>): string {
  const sections: string[] = [];
  for (const [category, items] of grouped) {
    const lines = items.map((item) => `- ${item}`).join("\n");
    const section = `### ${CATEGORY_LABELS[category]}\n${lines}`;
    sections.push(section);
  }
  return `<patient_memory>\n${sections.join("\n\n")}\n</patient_memory>`;
}

function toTimestamp(iso: string): number {
  return new Date(iso).getTime();
}

function parseCursorOffset(cursor: string | undefined): number {
  if (!cursor) return 0;
  const parsed = Number.parseInt(cursor, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function sortMemories(
  memories: readonly MemoryDto[],
  input: ListMemoriesInput,
): MemoryDto[] {
  const sorted = [...memories];
  sorted.sort((a, b) => {
    if (input.sortBy === "category") {
      const byCategory = a.category.localeCompare(b.category);
      if (byCategory !== 0) {
        return input.sortDir === "asc" ? byCategory : -byCategory;
      }
      const byCreated = toTimestamp(a.createdAt) - toTimestamp(b.createdAt);
      return input.sortDir === "asc" ? byCreated : -byCreated;
    }

    if (input.sortBy === "createdAt") {
      const byCreated = toTimestamp(a.createdAt) - toTimestamp(b.createdAt);
      return input.sortDir === "asc" ? byCreated : -byCreated;
    }

    const byAccessed =
      toTimestamp(a.lastAccessedAt) - toTimestamp(b.lastAccessedAt);
    return input.sortDir === "asc" ? byAccessed : -byAccessed;
  });
  return sorted;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class MemoryService {
  /** Save a new memory fact for a patient profile. */
  async save(input: SaveMemoryInput): Promise<MemoryDto> {
    return memoryRepository.save(input.userId, input.profileId, {
      category: input.category,
      content: input.content,
      sessionId: input.sessionId,
    });
  }

  /** Recall memories for a patient profile, optionally filtered by category. */
  async recall(input: RecallMemoriesInput): Promise<MemoryDto[]> {
    const memories = await memoryRepository.list(
      input.profileId,
      input.limit,
      input.category,
    );

    // Touch accessed memories in the background (fire-and-forget)
    const ids = memories.map((m) => m.id);
    memoryRepository.touchAccessed(input.profileId, ids).catch((err) => {
      console.error("[MemoryService] Failed to touch accessed:", err);
    });

    return memories;
  }

  /** Delete a specific memory. */
  async delete(input: DeleteMemoryInput): Promise<void> {
    return memoryRepository.delete(input.profileId, input.memoryId);
  }

  /** Delete multiple memories in a single batch operation. */
  async deleteMany(input: DeleteManyMemoriesInput): Promise<void> {
    return memoryRepository.deleteMany(input.profileId, input.memoryIds);
  }

  /**
   * List memories for patient UI with search/filter/sort and cursor pagination.
   * Cursor is an offset string because profiles are capped at 50 memories.
   */
  async list(input: ListMemoriesInput): Promise<PaginatedMemoriesDto> {
    const all = input.category
      ? await memoryRepository.listAllByCategory(
          input.profileId,
          input.category,
        )
      : await memoryRepository.listAll(input.profileId);

    const q = input.q?.trim().toLowerCase();
    const filtered = all.filter((memory) => {
      if (input.category && memory.category !== input.category) {
        return false;
      }
      if (!q) {
        return true;
      }
      return memory.content.toLowerCase().includes(q);
    });

    const sorted = sortMemories(filtered, input);
    const totalCount = q
      ? sorted.length
      : await memoryRepository.count(input.profileId, input.category);
    const offset = parseCursorOffset(input.cursor);
    const end = offset + input.limit;
    const memories = sorted.slice(offset, end);
    const nextCursor = end < totalCount ? String(end) : null;

    return {
      memories,
      nextCursor,
      totalCount,
    };
  }

  /**
   * Format memories for injection into a system prompt.
   * Returns empty string if no memories exist.
   */
  async formatForPrompt(profileId: string, limit = 30): Promise<string> {
    const memories = await memoryRepository.list(profileId, limit);
    if (memories.length === 0) return "";
    return formatGrouped(groupByCategory(memories));
  }
}

/** Singleton — import this throughout the application. */
export const memoryService = new MemoryService();
