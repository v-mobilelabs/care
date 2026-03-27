/**
 * Parse memory recall markers from message content.
 *
 * Looks for patterns like: [Recalled: symptom history from 2024-01-15]
 * Returns array of {text, date} tuples for badge rendering.
 */

export interface MemoryRecall {
  readonly text: string;
  readonly date: string;
}

export function parseMemoryRecalls(
  content: string,
): ReadonlyArray<MemoryRecall> {
  const regex = /\[Recalled:\s*(.+?)\s+from\s+(\d{4}-\d{2}-\d{2})\]/g;
  const recalls: MemoryRecall[] = [];

  let match;

  while ((match = regex.exec(content)) !== null) {
    recalls.push({
      text: match[1],
      date: match[2],
    });
  }

  return recalls;
}
