/**
 * Thin fetch wrapper used by client-side query functions.
 *
 * When a response is not OK it reads the JSON `{ error: { message } }` body
 * produced by `WithContext` and throws an `Error` with that message.  This
 * ensures the real server-side error (including Firestore missing-index errors)
 * reaches the user-facing UI instead of a generic "request failed" string.
 */
export async function apiFetch<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string };
    };
    throw new Error(
      body.error?.message ?? `Request failed (${res.status})`,
    );
  }
  return res.json() as Promise<T>;
}
