import { NextResponse, after } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { SubmitFeedbackUseCase } from "@/data/feedback";

export const POST = WithContext(async ({ user, req }) => {
  const body = (await req.json()) as unknown;
  // Persist feedback after the response — user gets instant confirmation.
  after(() =>
    new SubmitFeedbackUseCase()
      .execute({
        ...(body as object),
        userId: user.uid,
        email: user.email ?? "",
      })
      .catch(console.error),
  );
  return NextResponse.json({ ok: true });
});
