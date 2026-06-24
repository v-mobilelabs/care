import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { ApiError } from "@/lib/api/error";
import { GetFileUseCase, DeleteFileUseCase } from "@/data/files";
import { ragService } from "@/data/shared/service/rag/rag.service";
import {
  DeletePrescriptionUseCase,
  ExtractPrescriptionUseCase,
  prescriptionRepository,
  type PrescriptionDto,
} from "@/data/prescriptions";

const PrescriptionExtractBodySchema = z.object({
  fileId: z.string().min(1),
});

export interface PrescriptionExtractGraphInput {
  userId: string;
  profileId: string;
  req: Request;
}

type PrescriptionExtractGraphState = PrescriptionExtractGraphInput & {
  body: unknown;
  fileId: string;
  result: PrescriptionDto | null;
};

async function parseExtractBodyNode(
  state: PrescriptionExtractGraphState,
): Promise<Partial<PrescriptionExtractGraphState>> {
  const body = await state.req.json().catch(() => null);
  if (!body) {
    throw ApiError.badRequest("Expected JSON body with fileId.");
  }

  return { body };
}

function validateExtractBodyNode(
  state: PrescriptionExtractGraphState,
): Partial<PrescriptionExtractGraphState> {
  const parsed = PrescriptionExtractBodySchema.safeParse(state.body);
  if (!parsed.success) {
    throw ApiError.badRequest("fileId is required.");
  }

  return { fileId: parsed.data.fileId };
}

async function verifySourceFileNode(
  state: PrescriptionExtractGraphState,
): Promise<Partial<PrescriptionExtractGraphState>> {
  const file = await new GetFileUseCase().execute({
    userId: state.userId,
    profileId: state.profileId,
    fileId: state.fileId,
  });

  if (!file) {
    throw ApiError.notFound("File not found.");
  }

  return {};
}

async function extractPrescriptionForFile(args: {
  userId: string;
  profileId: string;
  fileId: string;
}): Promise<PrescriptionDto> {
  return new ExtractPrescriptionUseCase().execute({
    userId: args.userId,
    profileId: args.profileId,
    fileId: args.fileId,
  });
}

async function extractPrescriptionNode(
  state: PrescriptionExtractGraphState,
): Promise<Partial<PrescriptionExtractGraphState>> {
  const result = await extractPrescriptionForFile({
    userId: state.userId,
    profileId: state.profileId,
    fileId: state.fileId,
  });

  return { result };
}

const prescriptionExtractGraph = new StateGraph(
  Annotation.Root({
    userId: Annotation<string>(),
    profileId: Annotation<string>(),
    req: Annotation<Request>(),
    body: Annotation<unknown>(),
    fileId: Annotation<string>(),
    result: Annotation<PrescriptionDto | null>(),
  }),
)
  .addNode("parse_body", parseExtractBodyNode)
  .addNode("validate_body", validateExtractBodyNode)
  .addNode("verify_source_file", verifySourceFileNode)
  .addNode("extract", extractPrescriptionNode)
  .addEdge(START, "parse_body")
  .addEdge("parse_body", "validate_body")
  .addEdge("validate_body", "verify_source_file")
  .addEdge("verify_source_file", "extract")
  .addEdge("extract", END)
  .compile();

export async function runPrescriptionExtractFromRequestGraph(
  input: PrescriptionExtractGraphInput,
): Promise<PrescriptionDto> {
  const finalState = (await prescriptionExtractGraph.invoke({
    ...input,
    body: null,
    fileId: "",
    result: null,
  })) as PrescriptionExtractGraphState;

  if (!finalState.result) {
    throw new Error("[PrescriptionApiFlowGraph] Missing extraction result");
  }

  return finalState.result;
}

export interface PrescriptionExtractByFileGraphInput {
  userId: string;
  profileId: string;
  fileId: string;
}

type PrescriptionExtractByFileGraphState = PrescriptionExtractByFileGraphInput & {
  result: PrescriptionDto | null;
};

async function extractPrescriptionByFileNode(
  state: PrescriptionExtractByFileGraphState,
): Promise<Partial<PrescriptionExtractByFileGraphState>> {
  const normalizedFileId = state.fileId.trim();
  if (!normalizedFileId) {
    throw ApiError.badRequest("fileId is required.");
  }

  const result = await extractPrescriptionForFile({
    userId: state.userId,
    profileId: state.profileId,
    fileId: normalizedFileId,
  });
  return { result };
}

const prescriptionExtractByFileGraph = new StateGraph(
  Annotation.Root({
    userId: Annotation<string>(),
    profileId: Annotation<string>(),
    fileId: Annotation<string>(),
    result: Annotation<PrescriptionDto | null>(),
  }),
)
  .addNode("extract", extractPrescriptionByFileNode)
  .addEdge(START, "extract")
  .addEdge("extract", END)
  .compile();

export async function runPrescriptionExtractByFileGraph(
  input: PrescriptionExtractByFileGraphInput,
): Promise<PrescriptionDto> {
  const finalState = (await prescriptionExtractByFileGraph.invoke({
    ...input,
    result: null,
  })) as PrescriptionExtractByFileGraphState;

  if (!finalState.result) {
    throw new Error("[PrescriptionApiFlowGraph] Missing extraction-by-file result");
  }

  return finalState.result;
}

export interface PrescriptionDeleteGraphInput {
  userId: string;
  profileId: string;
  prescriptionId: string;
}

type PrescriptionDeleteGraphState = PrescriptionDeleteGraphInput & {
  prescription: PrescriptionDto | null;
  result: { ok: true } | null;
};

async function loadPrescriptionNode(
  state: PrescriptionDeleteGraphState,
): Promise<Partial<PrescriptionDeleteGraphState>> {
  const prescription = await prescriptionRepository.findById(
    state.userId,
    state.prescriptionId,
  );

  if (!prescription) {
    throw ApiError.notFound("Prescription not found.");
  }

  return { prescription };
}

async function deleteBackingFileNode(
  state: PrescriptionDeleteGraphState,
): Promise<Partial<PrescriptionDeleteGraphState>> {
  const fileId = state.prescription?.fileId;
  if (!fileId) return {};

  await new DeleteFileUseCase()
    .execute({
      userId: state.userId,
      profileId: state.profileId,
      fileId,
    })
    .catch(() => {
      /* file may already be gone */
    });

  return {};
}

async function deletePrescriptionNode(
  state: PrescriptionDeleteGraphState,
): Promise<Partial<PrescriptionDeleteGraphState>> {
  await Promise.all([
    new DeletePrescriptionUseCase().execute({
      userId: state.userId,
      prescriptionId: state.prescriptionId,
    }),
    ragService
      .removeDocument({
        userId: state.userId,
        profileId: state.profileId,
        sourceId: state.prescriptionId,
      })
      .catch(() => {
        /* RAG entry may not exist */
      }),
  ]);

  return { result: { ok: true } };
}

const prescriptionDeleteGraph = new StateGraph(
  Annotation.Root({
    userId: Annotation<string>(),
    profileId: Annotation<string>(),
    prescriptionId: Annotation<string>(),
    prescription: Annotation<PrescriptionDto | null>(),
    result: Annotation<{ ok: true } | null>(),
  }),
)
  .addNode("load_prescription", loadPrescriptionNode)
  .addNode("delete_backing_file", deleteBackingFileNode)
  .addNode("delete_prescription", deletePrescriptionNode)
  .addEdge(START, "load_prescription")
  .addEdge("load_prescription", "delete_backing_file")
  .addEdge("delete_backing_file", "delete_prescription")
  .addEdge("delete_prescription", END)
  .compile();

export async function runPrescriptionDeleteGraph(
  input: PrescriptionDeleteGraphInput,
): Promise<{ ok: true }> {
  const finalState = (await prescriptionDeleteGraph.invoke({
    ...input,
    prescription: null,
    result: null,
  })) as PrescriptionDeleteGraphState;

  return finalState.result ?? { ok: true };
}

const PatchSessionBodySchema = z.object({
  sessionId: z.string().min(1),
});

export interface PrescriptionPatchSessionGraphInput {
  userId: string;
  prescriptionId: string;
  req: Request;
}

type PrescriptionPatchSessionGraphState = PrescriptionPatchSessionGraphInput & {
  body: unknown;
  sessionId: string;
  result: PrescriptionDto | null;
};

async function parsePatchSessionBodyNode(
  state: PrescriptionPatchSessionGraphState,
): Promise<Partial<PrescriptionPatchSessionGraphState>> {
  const body = (await state.req.json().catch(() => ({}))) as {
    sessionId?: string;
  };
  return { body };
}

function validatePatchSessionBodyNode(
  state: PrescriptionPatchSessionGraphState,
): Partial<PrescriptionPatchSessionGraphState> {
  const parsed = PatchSessionBodySchema.safeParse(state.body);
  if (!parsed.success) {
    throw ApiError.badRequest("sessionId is required.");
  }

  return { sessionId: parsed.data.sessionId };
}

async function patchSessionNode(
  state: PrescriptionPatchSessionGraphState,
): Promise<Partial<PrescriptionPatchSessionGraphState>> {
  const result = await prescriptionRepository.patchSessionId(
    state.userId,
    state.prescriptionId,
    state.sessionId,
  );
  return { result };
}

const prescriptionPatchSessionGraph = new StateGraph(
  Annotation.Root({
    userId: Annotation<string>(),
    prescriptionId: Annotation<string>(),
    req: Annotation<Request>(),
    body: Annotation<unknown>(),
    sessionId: Annotation<string>(),
    result: Annotation<PrescriptionDto | null>(),
  }),
)
  .addNode("parse_body", parsePatchSessionBodyNode)
  .addNode("validate_body", validatePatchSessionBodyNode)
  .addNode("patch_session", patchSessionNode)
  .addEdge(START, "parse_body")
  .addEdge("parse_body", "validate_body")
  .addEdge("validate_body", "patch_session")
  .addEdge("patch_session", END)
  .compile();

export async function runPrescriptionPatchSessionGraph(
  input: PrescriptionPatchSessionGraphInput,
): Promise<PrescriptionDto> {
  const finalState = (await prescriptionPatchSessionGraph.invoke({
    ...input,
    body: null,
    sessionId: "",
    result: null,
  })) as PrescriptionPatchSessionGraphState;

  if (!finalState.result) {
    throw new Error("[PrescriptionApiFlowGraph] Missing patch result");
  }

  return finalState.result;
}