import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { SearchKnowledgeBaseUseCase } from "@/data/knowledge-base";

// POST /api/knowledge-base/search — semantic vector search
export const POST = WithContext({ kind: "admin" }, async ({ user, req }) => {
  const body = (await req.json()) as unknown;
  const results = await new SearchKnowledgeBaseUseCase().execute({
    ...(body as object),
    userId: user.uid,
  });
  return NextResponse.json(results);
});
