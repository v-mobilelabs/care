import { createVertex } from "@ai-sdk/google-vertex";
import { getProjectId } from "./firebase-admin.js";

/**
 * Vertex AI provider for Firebase Functions.
 * Uses ADC (Application Default Credentials) automatically.
 *
 * ADC is configured automatically in Firebase Functions environment,
 * so no manual credentials setup is needed.
 */
function buildVertexProvider() {
  const projectId = getProjectId();
  const location = "us-central1"; // Adjust to your preference

  const vertex = createVertex({
    project: projectId,
    location,
  });

  return vertex;
}

let _vertex: ReturnType<typeof createVertex> | null = null;

/**
 * Get or create Vertex AI provider instance.
 * Singleton pattern — initialized lazily on first call, after Firebase Admin is ready.
 */
export function getVertexProvider() {
  if (!_vertex) {
    _vertex = buildVertexProvider();
  }
  return _vertex;
}
