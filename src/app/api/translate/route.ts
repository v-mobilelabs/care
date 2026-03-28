import { NextResponse } from "next/server";
import { ApiError, WithContext } from "@/lib/api/with-context";
import { TranslateTextUseCase } from "@/data/profile";

export const POST = WithContext(async ({ user, req }) => {
  const body = (await req.json()) as {
    text?: string;
    targetLanguage?: string;
  };

  if (!body.text?.trim()) {
    throw ApiError.badRequest("text is required");
  }

  const translated = await new TranslateTextUseCase().execute({
    userId: user.uid,
    text: body.text,
    targetLanguage: body.targetLanguage,
  });

  return NextResponse.json(translated);
});
