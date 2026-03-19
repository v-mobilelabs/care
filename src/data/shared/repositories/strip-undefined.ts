/**
 * Recursively removes all keys whose value is `undefined` from an object
 * (including nested objects and arrays) before writing to Firestore.
 * Firestore rejects `undefined` values unless `ignoreUndefinedProperties`
 * is enabled on the client.
 */
export function stripUndefined<T extends object>(
  doc: T,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(doc)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, deepStrip(v)]),
  );
}

function deepStrip(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(deepStrip);
  }
  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    // Preserve Firestore Timestamps and other class instances with a toDate method
    if ("toDate" in value) return value;
    return stripUndefined(value as Record<string, unknown>);
  }
  return value;
}
