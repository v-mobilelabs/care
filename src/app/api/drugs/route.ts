import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { SearchDrugsUseCase } from "@/data/drugs";

/**
 * GET /api/drugs?q=<query>&limit=<n>
 *
 * Authenticated endpoint that searches the NIH NLM Clinical Tables RxTerms API
 * and returns normalized drug records (name, rxcuis, strengths, defaultForm).
 *
 * Auth: JWT session cookie required.
 * Caching: Results are edge-cached for 1 hour via fetch revalidation.
 */
export const GET = WithContext(async ({ req }) => {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? "";
  const limit = searchParams.get("limit") ?? undefined;

  const drugs = await new SearchDrugsUseCase().execute({
    q,
    ...(limit ? { limit } : {}),
  });

  return NextResponse.json(drugs);
});
