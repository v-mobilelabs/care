/**
 * Returns up to 2 uppercase initials from a display name, falling back to
 * the first character of an email address, then "?" if both are absent.
 *
 * @example
 * getInitials("Jane Smith")  // "JS"
 * getInitials(null, "j@x.com") // "J"
 * getInitials(null, null)    // "?"
 */
export function getInitials(
  name: string | null | undefined,
  email?: string | null,
): string {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email?.[0]?.toUpperCase() ?? "?";
}
