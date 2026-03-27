import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import {
  GetKnowledgeBaseEntryUseCase,
  UpdateKnowledgeBaseEntryUseCase,
  DeleteKnowledgeBaseEntryUseCase,
} from "@/data/knowledge-base";

// GET /api/knowledge-base/[id]
export const GET = WithContext<{ id: string }>(
  { kind: "admin" },
  async ({ user }, { id }) => {
    const entry = await new GetKnowledgeBaseEntryUseCase().execute({
      userId: user.uid,
      entryId: id,
    });
    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(entry);
  },
);

// PUT /api/knowledge-base/[id] — update (re-embeds if content changed)
export const PUT = WithContext<{ id: string }>(
  { kind: "admin" },
  async ({ user, req }, { id }) => {
    const body = (await req.json()) as unknown;
    const entry = await new UpdateKnowledgeBaseEntryUseCase().execute({
      ...(body as object),
      userId: user.uid,
      entryId: id,
    });
    if (!entry)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(entry);
  },
);

// DELETE /api/knowledge-base/[id]
export const DELETE = WithContext<{ id: string }>(
  { kind: "admin" },
  async ({ user }, { id }) => {
    await new DeleteKnowledgeBaseEntryUseCase().execute({
      userId: user.uid,
      entryId: id,
    });
    return NextResponse.json({ ok: true });
  },
);
