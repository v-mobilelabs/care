import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";
import { WithContext } from "@/lib/api/with-context";

export const POST = WithContext(async ({ user, req }) => {
  const body = (await req.json()) as {
    messageId?: unknown;
    sessionId?: unknown;
    type?: unknown;
    text?: unknown;
  };

  const { messageId, sessionId, type, text } = body;

  if (
    typeof messageId !== "string" ||
    !messageId ||
    typeof sessionId !== "string" ||
    !sessionId ||
    (type !== "like" && type !== "dislike" && type !== "report")
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (type === "report" && (typeof text !== "string" || !text.trim())) {
    return NextResponse.json(
      { error: "Report text is required" },
      { status: 400 },
    );
  }

  await db.collection("feedback").add({
    userId: user.uid,
    email: user.email,
    messageId,
    sessionId,
    type,
    text: typeof text === "string" ? text.trim() : null,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
});
