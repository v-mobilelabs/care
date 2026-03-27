/**
 * File upload and post-processing shared node factories.
 *
 * Reused across: file-upload-flow.workflow.ts, lab-report-api-flow.workflow.ts
 */

import { after } from "next/server";
import { UploadFileUseCase } from "@/data/files/use-cases/upload-file.use-case";
import { ClassifyFileUseCase } from "@/data/files/use-cases/classify-file.use-case";
import type { FileDto } from "@/data/files/models/file.model";

// ── Minimal state contracts ───────────────────────────────────────────────────

export type WithUploadContext = {
  userId: string;
  profileId: string;
  file: File | null;
  buffer: Buffer | null;
  uploaded: FileDto | null;
};

export type WithClassifyContext = {
  userId: string;
  profileId: string;
  file: File | null;
  buffer: Buffer | null;
  uploaded: FileDto | null;
};

// ── Node factories ────────────────────────────────────────────────────────────

/**
 * Factory: `upload` — uploads the buffered file to Storage via UploadFileUseCase.
 *
 * @param opts.graphName  Error message prefix for invariant failures.
 * @param opts.getSessionId  Returns the session tag to attach to the upload;
 *   pass `() => "my-tag"` for a fixed tag or `(state) => state.sessionId` for
 *   a dynamic one extracted from the request.
 *
 * @example
 * // Fixed session tag:
 * .addNode("upload", makeUploadNode({ graphName: "LabReportGraph", getSessionId: () => "lab-reports" }))
 *
 * // Dynamic session from state:
 * .addNode("upload", makeUploadNode({ graphName: "FilesUploadGraph", getSessionId: (s) => s.sessionId }))
 */
export function makeUploadNode<S extends WithUploadContext>(opts: {
  graphName: string;
  getSessionId: (state: S) => string | undefined;
}) {
  return async (state: S): Promise<Partial<S>> => {
    if (!state.file || !state.buffer) {
      throw new Error(`[${opts.graphName}] Missing upload payload`);
    }

    const uploaded = await new UploadFileUseCase().execute({
      userId: state.userId,
      profileId: state.profileId,
      sessionId: opts.getSessionId(state),
      name: state.file.name,
      mimeType: state.file.type,
      size: state.file.size,
      buffer: state.buffer,
    });

    return { uploaded } as Partial<S>;
  };
}

/**
 * Factory: `schedule_classification` — schedules background file classification
 * via Next.js `after()`. Does not block the response.
 *
 * @param graphName  Error message prefix for invariant failures.
 * @param logPrefix  Log prefix for the classify error (e.g. "[POST /api/lab-reports]").
 *
 * @example
 * .addNode(
 *   "schedule_classification",
 *   makeScheduleClassificationNode("LabReportGraph", "[POST /api/lab-reports]"),
 * )
 */
export function makeScheduleClassificationNode<S extends WithClassifyContext>(
  graphName: string,
  logPrefix: string,
) {
  return (state: S): Partial<S> => {
    if (!state.uploaded || !state.file || !state.buffer) {
      throw new Error(`[${graphName}] Missing classification payload`);
    }

    const uploaded = state.uploaded;
    const file = state.file;
    const buffer = state.buffer;

    after(async () => {
      await new ClassifyFileUseCase()
        .execute({
          fileId: uploaded.id,
          profileId: state.profileId,
          userId: state.userId,
          name: file.name,
          mimeType: file.type,
          buffer,
        })
        .catch((error: unknown) => {
          console.error(`${logPrefix} classify error:`, error);
        });
    });

    return {} as Partial<S>;
  };
}
