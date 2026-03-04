/**
 * Removes all keys whose value is `undefined` from an object before writing
 * to Firestore. Firestore rejects `undefined` values unless
 * `ignoreUndefinedProperties` is enabled on the client.
 */
export function stripUndefined<T extends object>(
  doc: T,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(doc).filter(([, v]) => v !== undefined),
  );
}
