import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { SearchPatientsUseCase } from "@/data/doctor-patients";

// GET /api/patients/search?q=<name> — doctors only
export const GET = WithContext({ kind: "doctor" }, async ({ req }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  if (!q || q.trim().length === 0) {
    throw ApiError.badRequest("Query parameter `q` is required.");
  }
  const input = SearchPatientsUseCase.validate({ query: q.trim() });
  const results = await new SearchPatientsUseCase().execute(input);
  return NextResponse.json(results);
});
