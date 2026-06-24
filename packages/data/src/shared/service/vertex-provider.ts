import { createVertex } from "@ai-sdk/google-vertex";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

/**
 * Build a Vertex AI provider authenticated with the Firebase service account
 * credentials already present in the environment. This avoids needing a
 * separate GOOGLE_APPLICATION_CREDENTIALS file on the server.
 */
function buildVertexProvider() {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  const project =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_VERTEX_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_VERTEX_LOCATION ?? "global";

  const googleAuthOptions =
    clientEmail && rawKey
      ? {
          credentials: {
            client_email: clientEmail,
            // Env var stores \n as a literal backslash-n — convert back to newlines.
            private_key: rawKey.replaceAll(String.raw`\n`, "\n"),
          },
        }
      : undefined;

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[vertex-provider] project=${project} location=${location} credentialsSet=${!!googleAuthOptions}`,
    );
  }

  return createVertex({ project, location, googleAuthOptions });
}

const _vertex = buildVertexProvider();

/**
 * Compatibility aliases so existing google-style callsites can migrate
 * incrementally while running on Vertex AI.
 */
type VertexCompatProvider = typeof _vertex & {
  embedding: (modelId: string) => ReturnType<typeof _vertex.embeddingModel>;
};

export const google: VertexCompatProvider = Object.assign(_vertex, {
  embedding: (modelId: string) => _vertex.embeddingModel(modelId),
});

/**
 * Backward-compatible factory alias used by speech-model custom fetch wiring.
 */
export { createVertex as createGoogleGenerativeAI } from "@ai-sdk/google-vertex";

/**
 * Provider options shape used where we pass model-specific options.
 * Keep this permissive to avoid tight coupling to provider internals.
 */
export type VertexLanguageModelOptions = {
  thinkingConfig?: {
    thinkingLevel?: "minimal" | "low" | "medium" | "high";
    thinkingBudget?: number;
    includeThoughts?: boolean;
  };
  cachedContent?: string;
  [key: string]: JsonValue | undefined;
};
