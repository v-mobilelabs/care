import { NextResponse } from "next/server";
import { z } from "zod";
import { WithContext } from "@/lib/api/with-context";
import { parseStructuredSymptomFromText } from "@/data/symptom-observations/service/llm-structured-symptom-parser.service";

const SymptomPreviewSchema = z.object({
  symptom: z.string().min(1),
});

// POST /api/symptom-observations/preview — parse free-text symptom into structured preview
export const POST = WithContext(async ({ user, req }) => {
  const body = (await req.json()) as unknown;
  const parsed = SymptomPreviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { message: "symptom is required" } },
      { status: 400 },
    );
  }

  const preview = await parseStructuredSymptomFromText({
    userId: user.uid,
    freeTextInput: parsed.data.symptom,
  });

  return NextResponse.json(preview);
});
