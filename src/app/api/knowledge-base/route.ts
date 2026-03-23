import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import {
  CreateKnowledgeBaseEntryUseCase,
  ListKnowledgeBaseUseCase,
} from "@/data/knowledge-base";

// GET /api/knowledge-base — list entries (paginated, filterable)
export const GET = WithContext(async ({ user, req }) => {
  const url = new URL(req.url);
  const limit = url.searchParams.get("limit");
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const category = url.searchParams.get("category") ?? undefined;
  const type = url.searchParams.get("type") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;

  const result = await new ListKnowledgeBaseUseCase().execute({
    userId: user.uid,
    ...(limit && { limit: Number(limit) }),
    ...(cursor && { cursor }),
    ...(category && { category }),
    ...(type && { type }),
    ...(status && { status }),
  });
  return NextResponse.json(result);
});

// POST /api/knowledge-base — create a new entry (auto-embeds)
export const POST = WithContext(async ({ user, req }) => {
  const body = (await req.json()) as unknown;
  const entry = await new CreateKnowledgeBaseEntryUseCase().execute({
    ...(body as object),
    userId: user.uid,
  });
  return NextResponse.json(entry, { status: 201 });
});
