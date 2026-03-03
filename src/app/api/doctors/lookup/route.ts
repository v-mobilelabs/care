import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { aiService } from "@/lib/ai/ai.service";

export const maxDuration = 30;

const ClinicResultSchema = z.object({
  clinicName: z.string(),
  address: z.string(),
  phone: z.string().optional(),
  website: z.string().optional(),
  hours: z.string().optional(),
  rating: z.number().optional(),
  placeId: z.string().optional(),
});

/**
 * POST /api/doctors/lookup
 * Body: { name: string; specialty: string; address: string }
 *
 * Uses Gemini with Google Search grounding to find clinic/practice details
 * for the given doctor and return them as structured JSON.
 */
export const POST = WithContext(async ({ req }) => {
  const body = (await req.json()) as {
    name?: string;
    specialty?: string;
    address?: string;
  };

  const { name, specialty, address } = body;

  if (!name || !specialty || !address) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "name, specialty, and address are required.",
        },
      },
      { status: 400 },
    );
  }

  const systemPrompt = [
    "You are a medical directory assistant that looks up clinic and doctor information using Google Search.",
    "When given a doctor's name, specialty, and location, search for their clinic or practice details.",
    "Always respond with ONLY a valid JSON object matching this exact structure (no markdown, no explanation):",
    `{`,
    `  "clinicName": "string — the clinic or practice name",`,
    `  "address": "string — full street address",`,
    `  "phone": "string (optional) — phone number",`,
    `  "website": "string (optional) — website URL",`,
    `  "hours": "string (optional) — business hours",`,
    `  "rating": number (optional) — Google rating 0-5`,
    `}`,
    "If a field is unknown, omit it. Never return null or placeholder values.",
  ].join("\n");

  const userPrompt = [
    `Find the clinic/practice details for:`,
    `Doctor: ${name}`,
    `Specialty: ${specialty}`,
    `Location: ${address}`,
    ``,
    `Search Google and return the structured JSON with clinic details.`,
  ].join("\n");

  const { text } = await generateText({
    model: aiService.fast,
    tools: { googleSearch: google.tools.googleSearch({}) },
    system: systemPrompt,
    prompt: userPrompt,
  });

  // Extract JSON from the model response (strip any markdown code fences)
  const jsonMatch = /\{[\s\S]*\}/.exec(text);
  if (!jsonMatch) {
    return NextResponse.json(
      {
        error: {
          code: "PARSE_ERROR",
          message: "AI did not return valid clinic data.",
        },
      },
      { status: 502 },
    );
  }

  const parsed = JSON.parse(jsonMatch[0]) as unknown;
  const clinic = ClinicResultSchema.parse(parsed);

  return NextResponse.json(clinic);
});
