import { NextResponse } from "next/server";
import { evidenceRepository } from "@/data/evidence";
import { ApiError, type ApiContext, WithContext } from "@/lib/api/with-context";

export const dynamic = "force-dynamic";

function getAdminEmails(): string[] {
  const value = process.env.ADMIN_EMAILS;
  if (!value) return [];
  return value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

const handler = async (ctx: ApiContext) => {
  const url = new URL(ctx.req.url);
  const profileId = url.searchParams.get("profileId");
  const sessionId = url.searchParams.get("sessionId");
  const messageId = url.searchParams.get("messageId");

  if (!profileId || !sessionId) {
    throw ApiError.badRequest("Missing required params: profileId, sessionId");
  }

  const adminEmails = getAdminEmails();
  const requesterEmail = ctx.user.email.toLowerCase();
  const isAdmin = adminEmails.includes(requesterEmail);

  if (!isAdmin) {
    throw ApiError.forbidden("Admin access required.");
  }

  if (messageId && messageId.trim().length > 0) {
    const evidence = await evidenceRepository.getByMessage(
      profileId,
      sessionId,
      messageId,
    );

    if (!evidence) {
      return NextResponse.json([]);
    }

    return NextResponse.json([{ messageId, evidence }]);
  }

  const allEvidence = await evidenceRepository.listBySession(
    profileId,
    sessionId,
  );
  return NextResponse.json(allEvidence);
};

export const GET = WithContext(handler);
