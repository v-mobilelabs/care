/**
 * Multipart upload shared nodes.
 *
 * Reused across: file-upload-flow.workflow.ts, lab-report-api-flow.workflow.ts
 *
 * Usage pattern:
 *   1. Add parse_multipart → extract_file → read_buffer to your graph.
 *   2. Insert a domain-specific validate_file node between extract_file and read_buffer
 *      when your workflow needs custom MIME/size rules beyond the defaults.
 */

import { ApiError } from "@/lib/api/error";

// ── Minimal state contracts ───────────────────────────────────────────────────

export type WithReq = { req: Request };
export type WithFormData = { formData: FormData | null };
export type WithFile = { file: File | null };
export type WithBuffer = { buffer: Buffer | null };

// ── Nodes ─────────────────────────────────────────────────────────────────────

/**
 * `parse_multipart` — parses a multipart/form-data request body.
 *
 * Throws 400 if the request is not multipart/form-data.
 *
 * @example
 * .addNode("parse_multipart", parseMultipartNode)
 */
export async function parseMultipartNode<S extends WithReq & WithFormData>(
  state: S,
): Promise<Partial<S>> {
  const formData = await state.req.formData().catch(() => null);
  if (!formData) throw ApiError.badRequest("Expected multipart/form-data.");
  return { formData } as Partial<S>;
}

/**
 * `extract_file` (raw) — extracts the `file` field from parsed formData.
 *
 * Does NOT validate MIME type or size. Add a domain-specific `validate_file`
 * node after this when you need custom validation rules.
 *
 * Throws 400 if no `file` field is present.
 *
 * @example
 * .addNode("extract_file", extractRawFileNode)
 * .addNode("validate_file", myDomainValidateFileNode)
 */
export function extractRawFileNode<S extends WithFormData & WithFile>(
  state: S,
): Partial<S> {
  const file = state.formData?.get("file");
  if (!(file instanceof File)) {
    throw ApiError.badRequest("'file' field is required.");
  }
  return { file } as Partial<S>;
}

/**
 * Factory: `read_buffer` — reads the extracted File into a Node.js Buffer.
 *
 * Must run after `extract_file` (requires `state.file` to be set).
 *
 * @param graphName Used in the invariant error message for easier debugging.
 *
 * @example
 * .addNode("read_buffer", makeReadBufferNode("MyGraph"))
 */
export function makeReadBufferNode<S extends WithFile & WithBuffer>(
  graphName: string,
) {
  return async (state: S): Promise<Partial<S>> => {
    if (!state.file) {
      throw new Error(`[${graphName}] Missing file before buffer read`);
    }
    return {
      buffer: Buffer.from(await state.file.arrayBuffer()),
    } as Partial<S>;
  };
}
