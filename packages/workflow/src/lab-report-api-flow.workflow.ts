import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ApiError } from "@/lib/api/error";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  DeleteFileUseCase,
  type FileDto,
} from "@/data/files";
import {
  DeleteLabReportUseCase,
  ExtractLabReportUseCase,
  GetLabReportUseCase,
  labReportRepository,
  type LabReportDto,
} from "@/data/lab-reports";
import {
  parseMultipartNode,
  extractRawFileNode,
  makeReadBufferNode,
} from "@/workflow/nodes/multipart.nodes";
import {
  makeUploadNode,
  makeScheduleClassificationNode,
} from "@/workflow/nodes/upload.nodes";
import { patchSessionOrElse } from "@/workflow/conditions/patch.conditions";
import { MULTIPART_NODES, UPLOAD_NODES } from "@/workflow/edges/node-names";

const LAB_REPORTS_SESSION_TAG = "lab-reports";

export interface LabReportUploadExtractGraphInput {
  userId: string;
  profileId: string;
  req: Request;
  runInBackground?: (fn: () => void | Promise<void>) => void;
}

type LabReportUploadExtractGraphState = LabReportUploadExtractGraphInput & {
  formData: FormData | null;
  file: File | null;
  buffer: Buffer | null;
  uploaded: FileDto | null;
  result: LabReportDto | null;
};

function validateFileNode(
  state: LabReportUploadExtractGraphState,
): Partial<LabReportUploadExtractGraphState> {
  if (!state.file) {
    throw new Error("[LabReportApiFlowGraph] Missing file");
  }

  const isImage = state.file.type.startsWith("image/");
  const isPdf = state.file.type === "application/pdf";
  const isDoc =
    state.file.type === "application/msword" ||
    state.file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (!isImage && !isPdf && !isDoc) {
    throw ApiError.badRequest(
      "Lab report files must be an image (JPEG, PNG, WEBP), PDF, or Word document.",
    );
  }

  if (
    !isDoc &&
    !ALLOWED_MIME_TYPES.includes(
      state.file.type as (typeof ALLOWED_MIME_TYPES)[number],
    )
  ) {
    throw ApiError.badRequest(`Unsupported file type '${state.file.type}'.`);
  }

  if (state.file.size > MAX_FILE_SIZE_BYTES) {
    throw ApiError.badRequest(
      `File exceeds the ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB limit.`,
    );
  }

  return {};
}

const readBufferNode = makeReadBufferNode<LabReportUploadExtractGraphState>(
  "LabReportApiFlowGraph",
);

const uploadNode = makeUploadNode<LabReportUploadExtractGraphState>({
  graphName: "LabReportApiFlowGraph",
  getSessionId: () => LAB_REPORTS_SESSION_TAG,
});

const scheduleClassificationNode =
  makeScheduleClassificationNode<LabReportUploadExtractGraphState>(
    "LabReportApiFlowGraph",
    "[POST /api/lab-reports]",
  );

async function extractNode(
  state: LabReportUploadExtractGraphState,
): Promise<Partial<LabReportUploadExtractGraphState>> {
  if (!state.uploaded) {
    throw new Error(
      "[LabReportApiFlowGraph] Missing uploaded file for extraction",
    );
  }

  const result = await new ExtractLabReportUseCase().execute({
    userId: state.userId,
    profileId: state.profileId,
    fileId: state.uploaded.id,
  });

  return { result };
}

const labReportUploadExtractGraph = new StateGraph(
  Annotation.Root({
    userId: Annotation<string>(),
    profileId: Annotation<string>(),
    req: Annotation<Request>(),
    formData: Annotation<FormData | null>(),
    file: Annotation<File | null>(),
    buffer: Annotation<Buffer | null>(),
    uploaded: Annotation<FileDto | null>(),
    result: Annotation<LabReportDto | null>(),
    runInBackground: Annotation<((fn: () => void | Promise<void>) => void) | undefined>(),
  }),
)
  .addNode(MULTIPART_NODES.PARSE_MULTIPART, parseMultipartNode)
  .addNode(MULTIPART_NODES.EXTRACT_FILE, extractRawFileNode)
  .addNode("validate_file", validateFileNode)
  .addNode(MULTIPART_NODES.READ_BUFFER, readBufferNode)
  .addNode(UPLOAD_NODES.UPLOAD, uploadNode)
  .addNode(UPLOAD_NODES.SCHEDULE_CLASSIFICATION, scheduleClassificationNode)
  .addNode("extract", extractNode)
  .addEdge(START, MULTIPART_NODES.PARSE_MULTIPART)
  .addEdge(MULTIPART_NODES.PARSE_MULTIPART, MULTIPART_NODES.EXTRACT_FILE)
  .addEdge(MULTIPART_NODES.EXTRACT_FILE, "validate_file")
  .addEdge("validate_file", MULTIPART_NODES.READ_BUFFER)
  .addEdge(MULTIPART_NODES.READ_BUFFER, UPLOAD_NODES.UPLOAD)
  .addEdge(UPLOAD_NODES.UPLOAD, UPLOAD_NODES.SCHEDULE_CLASSIFICATION)
  .addEdge(UPLOAD_NODES.SCHEDULE_CLASSIFICATION, "extract")
  .addEdge("extract", END)
  .compile();

export async function runLabReportUploadAndExtractGraph(
  input: LabReportUploadExtractGraphInput,
): Promise<LabReportDto> {
  const finalState = (await labReportUploadExtractGraph.invoke({
    ...input,
    formData: null,
    file: null,
    buffer: null,
    uploaded: null,
    result: null,
  })) as LabReportUploadExtractGraphState;

  if (!finalState.result) {
    throw new Error("[LabReportApiFlowGraph] Missing upload/extract result");
  }

  return finalState.result;
}

export interface LabReportDeleteGraphInput {
  userId: string;
  profileId: string;
  recordId: string;
  runInBackground?: (fn: () => void | Promise<void>) => void;
}

type LabReportDeleteGraphState = LabReportDeleteGraphInput & {
  record: LabReportDto | null;
  result: { ok: true } | null;
};

async function loadRecordNode(
  state: LabReportDeleteGraphState,
): Promise<Partial<LabReportDeleteGraphState>> {
  const record = await loadLabReportOrThrow(state.userId, state.recordId);
  return { record };
}

async function loadLabReportOrThrow(
  userId: string,
  recordId: string,
): Promise<LabReportDto> {
  const record = await new GetLabReportUseCase().execute({
    userId,
    labReportId: recordId,
  });
  if (!record) {
    throw ApiError.notFound("Lab report record not found.");
  }

  return record;
}

async function deleteRecordNode(
  state: LabReportDeleteGraphState,
): Promise<Partial<LabReportDeleteGraphState>> {
  await new DeleteLabReportUseCase().execute({
    userId: state.userId,
    labReportId: state.recordId,
  });

  return {};
}

function scheduleFileDeleteNode(
  state: LabReportDeleteGraphState,
): Partial<LabReportDeleteGraphState> {
  if (!state.record) {
    throw new Error("[LabReportApiFlowGraph] Missing record for file cleanup");
  }

  const fileId = state.record.fileId;
  const run = state.runInBackground ?? ((fn) => setTimeout(fn, 0));

  run(async () => {
    try {
      await new DeleteFileUseCase().execute({
        userId: state.userId,
        profileId: state.profileId,
        fileId,
      });
    } catch {
      console.warn(
        `[lab-reports] Could not delete file ${fileId} — may already be gone.`,
      );
    }
  });

  return { result: { ok: true } };
}

const labReportDeleteGraph = new StateGraph(
  Annotation.Root({
    userId: Annotation<string>(),
    profileId: Annotation<string>(),
    recordId: Annotation<string>(),
    record: Annotation<LabReportDto | null>(),
    result: Annotation<{ ok: true } | null>(),
    runInBackground: Annotation<((fn: () => void | Promise<void>) => void) | undefined>(),
  }),
)
  .addNode("load_record", loadRecordNode)
  .addNode("delete_record", deleteRecordNode)
  .addNode("schedule_file_delete", scheduleFileDeleteNode)
  .addEdge(START, "load_record")
  .addEdge("load_record", "delete_record")
  .addEdge("delete_record", "schedule_file_delete")
  .addEdge("schedule_file_delete", END)
  .compile();

export async function runLabReportDeleteGraph(
  input: LabReportDeleteGraphInput,
): Promise<{ ok: true }> {
  const finalState = (await labReportDeleteGraph.invoke({
    ...input,
    record: null,
    result: null,
  })) as LabReportDeleteGraphState;

  return finalState.result ?? { ok: true };
}

export interface LabReportPatchGraphInput {
  userId: string;
  profileId: string;
  recordId: string;
  req: Request;
}

type LabReportPatchGraphState = LabReportPatchGraphInput & {
  record: LabReportDto | null;
  body: unknown;
  result: LabReportDto | null;
};

async function loadPatchRecordNode(
  state: LabReportPatchGraphState,
): Promise<Partial<LabReportPatchGraphState>> {
  const record = await loadLabReportOrThrow(state.userId, state.recordId);
  return { record };
}

async function parsePatchBodyNode(
  state: LabReportPatchGraphState,
): Promise<Partial<LabReportPatchGraphState>> {
  const body = (await state.req.json().catch(() => ({}))) as {
    sessionId?: string;
  };
  return { body };
}

async function patchSessionNode(
  state: LabReportPatchGraphState,
): Promise<Partial<LabReportPatchGraphState>> {
  const sessionId = (state.body as { sessionId: string }).sessionId;
  const result = await labReportRepository.patchSessionId(
    state.userId,
    state.recordId,
    sessionId,
  );
  return { result };
}

async function reExtractNode(
  state: LabReportPatchGraphState,
): Promise<Partial<LabReportPatchGraphState>> {
  if (!state.record) {
    throw new Error("[LabReportApiFlowGraph] Missing record for re-extract");
  }

  const result = await new ExtractLabReportUseCase().execute({
    userId: state.userId,
    profileId: state.profileId,
    fileId: state.record.fileId,
  });

  return { result };
}

const labReportPatchGraph = new StateGraph(
  Annotation.Root({
    userId: Annotation<string>(),
    profileId: Annotation<string>(),
    recordId: Annotation<string>(),
    req: Annotation<Request>(),
    record: Annotation<LabReportDto | null>(),
    body: Annotation<unknown>(),
    result: Annotation<LabReportDto | null>(),
  }),
)
  .addNode("load_record", loadPatchRecordNode)
  .addNode("parse_body", parsePatchBodyNode)
  .addNode("patch_session", patchSessionNode)
  .addNode("re_extract", reExtractNode)
  .addEdge(START, "load_record")
  .addEdge("load_record", "parse_body")
  .addConditionalEdges(
    "parse_body",
    patchSessionOrElse("patch_session", "re_extract"),
    {
      patch_session: "patch_session",
      re_extract: "re_extract",
    },
  )
  .addEdge("patch_session", END)
  .addEdge("re_extract", END)
  .compile();

export async function runLabReportPatchGraph(
  input: LabReportPatchGraphInput,
): Promise<LabReportDto> {
  const finalState = (await labReportPatchGraph.invoke({
    ...input,
    record: null,
    body: null,
    result: null,
  })) as LabReportPatchGraphState;

  if (!finalState.result) {
    throw new Error("[LabReportApiFlowGraph] Missing patch result");
  }

  return finalState.result;
}
