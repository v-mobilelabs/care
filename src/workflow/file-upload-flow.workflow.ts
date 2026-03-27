import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { after } from "next/server";
import { revalidateTag } from "next/cache";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  type FileDto,
} from "@/data/files/models/file.model";
import { ClassifyFileUseCase } from "@/data/files/use-cases/classify-file.use-case";
import { CacheTags } from "@/data/cached";
import { ApiError } from "@/lib/api/with-context";
import {
  parseMultipartNode,
  makeReadBufferNode,
} from "@/workflow/nodes/multipart.nodes";
import { makeUploadNode } from "@/workflow/nodes/upload.nodes";
import { MULTIPART_NODES, UPLOAD_NODES } from "@/workflow/edges/node-names";

export interface FilesUploadGraphInput {
  userId: string;
  profileId: string;
  req: Request;
}

export interface FilesUploadGraphOutput {
  uploaded: FileDto;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}

type FilesUploadGraphState = FilesUploadGraphInput & {
  formData: FormData | null;
  file: File | null;
  sessionId?: string;
  buffer: Buffer | null;
  uploaded: FileDto | null;
  result: FilesUploadGraphOutput | null;
};

function validateFile(file: File): void {
  if (
    !ALLOWED_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_MIME_TYPES)[number],
    )
  ) {
    throw ApiError.badRequest(
      `Unsupported file type '${file.type}'. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}.`,
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw ApiError.badRequest(
      `File exceeds the ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB limit.`,
    );
  }
}

// ── Workflow-specific node: extract_file ─────────────────────────────────────
// Extends extractRawFileNode with: standard MIME/size validation + sessionId
// extraction from the same formData submit.
function extractFileNode(
  state: FilesUploadGraphState,
): Partial<FilesUploadGraphState> {
  const file = state.formData?.get("file");
  if (!(file instanceof File)) {
    throw ApiError.badRequest("'file' field is required.");
  }

  validateFile(file);

  const sessionId = state.formData?.get("sessionId");
  return {
    file,
    sessionId: typeof sessionId === "string" ? sessionId : undefined,
  };
}

// ── Shared node instances ─────────────────────────────────────────────────────

const readBufferNode =
  makeReadBufferNode<FilesUploadGraphState>("FilesUploadGraph");
const uploadNode = makeUploadNode<FilesUploadGraphState>({
  graphName: "FilesUploadGraph",
  getSessionId: (state) => state.sessionId,
});

// ── Workflow-specific node: finalize ──────────────────────────────────────────

function finalizeNode(
  state: FilesUploadGraphState,
): Partial<FilesUploadGraphState> {
  if (!state.uploaded || !state.file || !state.buffer) {
    throw new Error("[FilesUploadGraph] Missing finalized upload state");
  }

  return {
    result: {
      uploaded: state.uploaded,
      fileName: state.file.name,
      mimeType: state.file.type,
      buffer: state.buffer,
    },
  };
}

const filesUploadGraph = new StateGraph(
  Annotation.Root({
    userId: Annotation<string>(),
    profileId: Annotation<string>(),
    req: Annotation<Request>(),
    formData: Annotation<FormData | null>(),
    file: Annotation<File | null>(),
    sessionId: Annotation<string | undefined>(),
    buffer: Annotation<Buffer | null>(),
    uploaded: Annotation<FileDto | null>(),
    result: Annotation<FilesUploadGraphOutput | null>(),
  }),
)
  .addNode(MULTIPART_NODES.PARSE_MULTIPART, parseMultipartNode)
  .addNode(MULTIPART_NODES.EXTRACT_FILE, extractFileNode)
  .addNode(MULTIPART_NODES.READ_BUFFER, readBufferNode)
  .addNode(UPLOAD_NODES.UPLOAD, uploadNode)
  .addNode("finalize", finalizeNode)
  .addEdge(START, MULTIPART_NODES.PARSE_MULTIPART)
  .addEdge(MULTIPART_NODES.PARSE_MULTIPART, MULTIPART_NODES.EXTRACT_FILE)
  .addEdge(MULTIPART_NODES.EXTRACT_FILE, MULTIPART_NODES.READ_BUFFER)
  .addEdge(MULTIPART_NODES.READ_BUFFER, UPLOAD_NODES.UPLOAD)
  .addEdge(UPLOAD_NODES.UPLOAD, "finalize")
  .addEdge("finalize", END)
  .compile();

export async function runFilesUploadGraph(
  input: FilesUploadGraphInput,
): Promise<FilesUploadGraphOutput> {
  const finalState = (await filesUploadGraph.invoke({
    ...input,
    formData: null,
    file: null,
    sessionId: undefined,
    buffer: null,
    uploaded: null,
    result: null,
  })) as FilesUploadGraphState;

  if (!finalState.result) {
    throw new Error("[FilesUploadGraph] Missing finalized result");
  }

  return finalState.result;
}

export function scheduleFileUploadPostProcessing(args: {
  fileId: string;
  profileId: string;
  userId: string;
  name: string;
  mimeType: string;
  buffer: Buffer;
}): void {
  after(async () => {
    await new ClassifyFileUseCase()
      .execute({
        fileId: args.fileId,
        profileId: args.profileId,
        userId: args.userId,
        name: args.name,
        mimeType: args.mimeType,
        buffer: args.buffer,
      })
      .catch((error: unknown) =>
        console.error("[files] classify error:", error),
      );

    revalidateTag(CacheTags.files(args.userId), "minutes");
  });
}
