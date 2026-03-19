import { z } from "zod";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { aiService } from "@/data/shared/service/ai.service";

// ── Schema ────────────────────────────────────────────────────────────────────

const LookupClinicInputSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1, "Doctor name is required"),
  specialty: z.string().min(1, "Specialty is required"),
  address: z.string().min(1, "Address is required"),
});

export type LookupClinicInput = z.infer<typeof LookupClinicInputSchema>;

const ClinicResultSchema = z.object({
  clinicName: z.string(),
  address: z.string(),
  phone: z.string().optional(),
  website: z.string().optional(),
  hours: z.string().optional(),
  rating: z.number().optional(),
  placeId: z.string().optional(),
});

export type ClinicResult = z.infer<typeof ClinicResultSchema>;

// ── UseCase ───────────────────────────────────────────────────────────────────

export class LookupClinicUseCase extends UseCase<
  LookupClinicInput,
  ClinicResult | null
> {
  static validate(input: unknown): LookupClinicInput {
    return LookupClinicInputSchema.parse(input);
  }

  protected async run(input: LookupClinicInput): Promise<ClinicResult | null> {
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
      `Doctor: ${input.name}`,
      `Specialty: ${input.specialty}`,
      `Location: ${input.address}`,
      ``,
      `Search Google and return the structured JSON with clinic details.`,
    ].join("\n");

    const { text } = await generateText({
      model: aiService.forUser(input.userId).fast,
      tools: { googleSearch: google.tools.googleSearch({}) },
      system: systemPrompt,
      prompt: userPrompt,
    });

    const jsonMatch = /\{[\s\S]*\}/.exec(text);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    return ClinicResultSchema.parse(parsed);
  }
}
