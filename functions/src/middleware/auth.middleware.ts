import { getAuth } from "firebase-admin/auth";
import type { Request, Response } from "express";
import * as logger from "firebase-functions/logger";

/**
 * Middleware to validate Firebase session token from Authorization header.
 * Verifies the token and attaches the decoded token and UID to the request.
 *
 * Usage:
 * ```ts
 * export const chatApi = onRequest(async (req, res) => {
 *   const auth = await verifySessionToken(req, res);
 *   if (!auth) return; // verifySessionToken already sent error response
 *   const { uid, token } = auth;
 *   // proceed with authenticated request
 * });
 * ```
 */
export async function verifySessionToken(
  req: Request,
  res: Response,
): Promise<{ uid: string; token: any } | null> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn("[Auth] Missing Authorization header");
    res.status(401).json({
      error: "MISSING_AUTH_HEADER",
      message: "Authorization header is required",
    });
    return null;
  }

  // Extract token from "Bearer <token>" format
  const match = authHeader.match(/^Bearer\s+(.+)$/);
  if (!match) {
    logger.warn("[Auth] Invalid Authorization header format");
    res.status(401).json({
      error: "INVALID_AUTH_FORMAT",
      message: "Authorization header must be in 'Bearer <token>' format",
    });
    return null;
  }

  const token = match[1];

  try {
    // Verify the ID token with Firebase Auth
    const decodedToken = await getAuth().verifyIdToken(token);

    logger.info("[Auth] Token verified", {
      uid: decodedToken.uid,
      email: decodedToken.email,
    });

    return {
      uid: decodedToken.uid,
      token: decodedToken,
    };
  } catch (error) {
    logger.warn("[Auth] Token verification failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(401).json({
      error: "INVALID_TOKEN",
      message:
        error instanceof Error ? error.message : "Token verification failed",
    });

    return null;
  }
}

/**
 * Express middleware to verify Firebase session token.
 * Attaches verified token info to req.auth if successful.
 *
 * Usage:
 * ```ts
 * router.use(requireAuth);
 * router.post("/endpoint", (req, res) => {
 *   const { uid, token } = req.auth;
 *   // proceed with authenticated request
 * });
 * ```
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: Function,
): Promise<void> {
  const auth = await verifySessionToken(req, res);
  if (!auth) return; // verifySessionToken already sent error response

  // Attach to request object
  (req as any).auth = auth;
  next();
}

/**
 * Optional: Validate token claims (e.g., check for specific roles).
 */
export function validateClaims(
  token: any,
  requiredClaims?: Record<string, unknown>,
): boolean {
  if (!requiredClaims) return true;

  for (const [key, value] of Object.entries(requiredClaims)) {
    if (token.customClaims?.[key] !== value) {
      return false;
    }
  }

  return true;
}
