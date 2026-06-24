import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { kbContextService } from "@/data/knowledge-base/service/kb-context.service";

// GET /api/sessions/[sessionId]/kb/documents
// Retrieve all documents stored in the KB context for this session
export const GET = WithContext<{ sessionId: string }>(
  async ({ req }, { sessionId }) => {
    try {
      const documents = await kbContextService.getDocuments(sessionId);
      return NextResponse.json({
        sessionId,
        documents,
        count: documents.length,
      });
    } catch (error) {
      console.error("[api/sessions/kb/documents] Error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to retrieve KB context documents";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
);

// POST /api/sessions/[sessionId]/kb/documents
// Add a document (message or tool output) to the KB context
export const POST = WithContext<{ sessionId: string }>(
  async ({ req }, { sessionId }) => {
    try {
      const body = await req.json().catch(() => ({}));

      // Validate required fields
      if (!body.role || !body.content) {
        return NextResponse.json(
          { error: "role and content are required" },
          { status: 400 },
        );
      }

      // Add document to context
      const docId = await kbContextService.addDocument(sessionId, {
        role: body.role,
        content: body.content,
        toolOutputs: body.toolOutputs,
      });

      return NextResponse.json(
        {
          sessionId,
          docId,
          message: "Document added to KB context",
        },
        { status: 201 },
      );
    } catch (error) {
      console.error("[api/sessions/kb/documents] Error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to add document to KB context";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
);
