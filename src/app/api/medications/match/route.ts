import { revalidateTag } from "next/cache";
import { NextResponse, after } from "next/server";
import { CacheTags, getCachedMedicationMatches } from "@/data/cached";
import { WithContext } from "@/lib/api/with-context";
import { runMedicationMatchGraph } from "@/workflow/medication-match.workflow";

function normalizeCacheQuery(query: string): string {
  return query.toLowerCase().replaceAll(/\s+/g, " ").trim();
}

// GET /api/medications/match?query=avil&limit=8&refresh=true
export const GET = WithContext(async ({ user, profileId, req }) => {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const limitRaw = searchParams.get("limit");
  const refreshRaw = searchParams.get("refresh");
  const refresh = refreshRaw === "1" || refreshRaw === "true";
  const limitParsed = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
  const limit =
    limitParsed && Number.isFinite(limitParsed)
      ? Math.max(1, Math.min(20, limitParsed))
      : 8;

  if (query.length < 2) {
    return NextResponse.json(
      { error: "query must contain at least 2 characters" },
      { status: 400 },
    );
  }

  if (refresh) {
    const refreshReq = new Request("http://internal/api/medications/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit, refresh: true }),
    });

    const result = await runMedicationMatchGraph({
      userId: user.uid,
      profileId,
      req: refreshReq,
      runInBackground: after,
    });

    revalidateTag(
      CacheTags.medicationMatch(user.uid, normalizeCacheQuery(query)),
      "minutes",
    );
    revalidateTag(CacheTags.medicationMatchUser(user.uid), "minutes");
    return NextResponse.json(result);
  }

  const result = await getCachedMedicationMatches({
    userId: user.uid,
    profileId,
    query,
    limit,
  });

  return NextResponse.json(result);
});

// Backward-compatible POST support.
export const POST = WithContext(async ({ user, profileId, req }) => {
  const result = await runMedicationMatchGraph({
    userId: user.uid,
    profileId,
    req,
    runInBackground: after,
  });
  return NextResponse.json(result);
});
