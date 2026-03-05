import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { SubmitFeedbackUseCase } from "@/data/feedback";

export const POST = WithContext(async ({ user, req }) => {
  const body = (await req.json()) as unknown;
  const input = SubmitFeedbackUseCase.validate({
    ...(body as object),
    userId: user.uid,
    email: user.email ?? "",
  });
  await new SubmitFeedbackUseCase().execute(input);
  return NextResponse.json({ ok: true });
});
