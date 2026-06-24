/**
 * KB Messages Route
 * Retrieves persisted chat messages from KB context documents
 */

import { Router, type Request, type Response } from "express";
import { logger } from "@/lib/logger.js";
import { getKBContextService } from "@/services/chat/kb-context.service.js";

const router = Router();

/**
 * GET /kb/messages/:contextId
 * Retrieve all messages for a context from KB
 *
 * @param contextId - The context ID (typically sessionId)
 * @returns All context documents with message data
 */
router.get("/kb/messages/:contextId", async (req: Request, res: Response): Promise<void> => {
  const { contextId } = req.params;

  try {
    if (!contextId) {
      logger.warn("[KB Messages Route] Missing contextId");
      res.status(400).json({ error: "contextId is required" });
      return;
    }

    logger.info("[KB Messages Route] Retrieving messages", { contextId });

    // Get KB context service and retrieve messages
    const kbService = getKBContextService();
    const response = await kbService.getMessages(contextId);

    logger.info("[KB Messages Route] Retrieved messages successfully", {
      contextId,
      documentCount: response?.documents?.items?.length || 0,
    });

    res.status(200).json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[KB Messages Route] Error retrieving messages", {
      contextId,
      error: errorMessage,
    });
    res.status(500).json({
      error: "Failed to retrieve messages from KB",
      details: errorMessage,
    });
  }
});

export default router;
