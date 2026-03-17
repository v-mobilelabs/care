import { memoryRepository } from "../repositories/memory.repository";
import type {
  MemoryDto,
  MemoryCategory,
  SaveMemoryInput,
  RecallMemoriesInput,
  DeleteMemoryInput,
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
    sections.push(
      `### ${CATEGORY_LABELS[category]}\n${items.map((i) => `- ${i}`).join("\n")}`,
    );
  }
  return `<patient_memory>\n${sections.join("\n\n")}\n</patient_memory>`;
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
