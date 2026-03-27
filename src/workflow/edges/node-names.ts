/**
 * Canonical node-name string constants for shared workflow nodes.
 *
 * Import these when wiring `.addNode()` and `.addEdge()` calls to prevent
 * string-literal typos across workflows that share node definitions from
 * `src/workflow/nodes/`.
 *
 * @example
 * import { MULTIPART_NODES, UPLOAD_NODES } from "@/workflow/edges/node-names";
 *
 * new StateGraph(Annotation.Root({ ... }))
 *   .addNode(MULTIPART_NODES.PARSE_MULTIPART, parseMultipartNode)
 *   .addNode(MULTIPART_NODES.READ_BUFFER, makeReadBufferNode("MyGraph"))
 *   .addNode(UPLOAD_NODES.UPLOAD, makeUploadNode({ ... }))
 *   .addEdge(START, MULTIPART_NODES.PARSE_MULTIPART)
 *   .addEdge(MULTIPART_NODES.PARSE_MULTIPART, MULTIPART_NODES.EXTRACT_FILE)
 */

/** Shared nodes from `nodes/multipart.nodes.ts` */
export const MULTIPART_NODES = {
  PARSE_MULTIPART: "parse_multipart",
  EXTRACT_FILE: "extract_file",
  READ_BUFFER: "read_buffer",
} as const;

/** Shared nodes from `nodes/upload.nodes.ts` */
export const UPLOAD_NODES = {
  UPLOAD: "upload",
  SCHEDULE_CLASSIFICATION: "schedule_classification",
} as const;

/** Nodes in `gateway-orchestrator.workflow.ts` */
export const GATEWAY_NODES = {
  ROUTE_QUERY: "route_query",
  INSPECT_KNOWN_CONTEXT: "inspect_known_context",
  GATE_RAG: "gate_rag",
  RESOLVE_GROUNDING: "resolve_grounding",
  RUN_RAG: "run_rag",
  SKIP_RAG: "skip_rag",
  GENERATE_LOADING_HINTS: "generate_loading_hints",
  FINALIZE: "finalize",
} as const;

/** Nodes in `rag-orchestrator.workflow.ts` */
export const RAG_NODES = {
  INITIAL_RETRIEVE_EVALUATE: "initial_retrieve_evaluate",
  REPAIR_AND_RETRIEVE_EVALUATE: "repair_and_retrieve_evaluate",
  WEB_FALLBACK_EVALUATE: "web_fallback_evaluate",
  FINAL_INITIAL: "final_initial",
  FINAL_REPAIRED: "final_repaired",
  FINAL_WEB: "final_web",
  FINAL_FAILED: "final_failed",
} as const;
