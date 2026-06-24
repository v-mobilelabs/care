/**
 * Vertex AI Ranking API Client
 * Direct REST client for Vertex AI Ranking API (ranking-e5-base model)
 * Handles authentication via Firebase service account credentials
 *
 * Note: Requires Node.js crypto module (server-side only)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

interface RankingRequest {
  query: string;
  records: Array<{
    id: string;
    title?: string;
    content: string;
  }>;
  topN?: number;
  abortSignal?: AbortSignal;
}

interface RankingResponse {
  ranking: Array<{
    index: number;
    score: number;
  }>;
}

interface TokenData {
  access_token: string;
  expires_in: number;
}

interface RankResponse {
  records?: Array<{
    id?: string;
    index?: number;
    score?: number;
  }>;
}

// Cache for access tokens with TTL
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

/**
 * Get Google access token using Firebase service account credentials
 */
async function getAccessToken(): Promise<string> {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY environment variables",
    );
  }

  // Check cache
  const cached = tokenCache.get(clientEmail);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  // Create JWT assertion
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 3600;
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + expiresIn,
    iat: now,
  };

  // Sign JWT using Node.js crypto
  // Dynamic import to avoid issues in edge environments where crypto is not available
  let crypto: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    crypto = require("crypto");
  } catch {
    throw new Error(
      "Node.js crypto module not available. Reranking requires a Node.js runtime.",
    );
  }

  const headerEncoded = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payloadEncoded = btoa(JSON.stringify(payload));
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;

  const sign = crypto.createSign("RSA-SHA256") as any;
  sign.update(signatureInput);
  const signature = (sign.sign(privateKey, "base64") as string)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const jwt = `${signatureInput}.${signature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(
      `Failed to get access token: ${tokenResponse.status} ${error}`,
    );
  }

  const tokenData = (await tokenResponse.json()) as TokenData;
  const accessToken = tokenData.access_token;
  const expiresAt = Date.now() + tokenData.expires_in * 1000 - 60000; // Refresh 1 min before expiry

  // Cache token
  tokenCache.set(clientEmail, { token: accessToken, expiresAt });

  return accessToken;
}

/**
 * Call Vertex AI Ranking API (Discovery Engine)
 */
export async function rankWithVertexAI(
  request: RankingRequest,
): Promise<RankingResponse> {
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error("Missing FIREBASE_PROJECT_ID environment variable");
  }

  // Get access token
  const accessToken = await getAccessToken();

  // Vertex AI Ranking API lives under Discovery Engine, always uses location=global
  const endpoint = `https://discoveryengine.googleapis.com/v1/projects/${projectId}/locations/global/rankingConfigs/default_ranking_config:rank`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        model: "semantic-ranker-512@latest",
        topN: request.topN ?? 10,
        query: request.query,
        records: request.records.map((record) => ({
          id: record.id,
          title: record.title,
          content: record.content,
        })),
      }),
      signal: request.abortSignal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Vertex AI Ranking API error: ${response.status} ${error}`,
      );
    }

    const result = (await response.json()) as RankResponse;

    // Map response — records come back sorted by relevance with score field
    const ranking = (result.records ?? []).map((record) => ({
      index: Number(record.id ?? 0),
      score: record.score ?? 0,
    }));

    return { ranking };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Vertex AI Ranking API request timed out");
    }
    throw error;
  }
}

/* eslint-enable @typescript-eslint/no-explicit-any */
