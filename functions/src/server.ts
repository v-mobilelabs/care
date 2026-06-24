import { onRequest } from "firebase-functions/v2/https";
import * as express from "express";
import * as logger from "firebase-functions/logger";
import { requireAuth } from "./middleware/auth.middleware.js";
import chatRouter from "./routes/chat.js";
import kbRouter from "./routes/kb.routes.js";
import { initializeMemoryStore } from "./services/ai/memory/index.js";
import { KB } from "./services/kb/index.js";

const app = express.default();

// Initialize KB memory store at startup
try {
  initializeMemoryStore(KB);
} catch (error) {
  logger.error("[Memory] Failed to initialize KB store", error);
  throw error; // Fail fast - KB memory is required
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (public, no auth required)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Auth middleware - protect all routes after health
app.use(requireAuth);

// Request logging
app.use((req, res, next) => {
  logger.debug(`[API] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/", chatRouter);
app.use("/", kbRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    logger.error("[API] Unhandled error", err);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    });
  },
);

export const api = onRequest(
  {
    cors: true,
    memory: "512MiB" as const,
    timeoutSeconds: 300,
    invoker: "public",
  },
  app,
);
