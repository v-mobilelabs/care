// Date grouping helpers for history page

export type Group =
  | "Today"
  | "Yesterday"
  | "This Week"
  | "This Month"
  | "Older";

export function getGroup(dateStr: string): Group {
  const now = new Date();
  const d = new Date(dateStr);

  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  if (sameDay) return "Today";
  if (isYesterday) return "Yesterday";
  if (diffDays < 7) return "This Week";
  if (diffDays < 30) return "This Month";
  return "Older";
}

export const GROUP_ORDER: Group[] = [
  "Today",
  "Yesterday",
  "This Week",
  "This Month",
  "Older",
];
