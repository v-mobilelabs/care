import { convertToModelMessages, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import { NextResponse } from "next/server";
import { createClinicalTools } from "@/lib/clinical-tools";
import { WithContext } from "@/lib/api/with-context";
import { extractFirstText } from "@/lib/chat/helpers";
import { AddMessageUseCase } from "@/data/sessions";
import { GetSystemPromptUseCase } from "@/data/prompts";
import { ListConditionsUseCase } from "@/data/conditions";
import { ListSoapNotesUseCase } from "@/data/soap-notes";
import { ListMedicationsUseCase } from "@/data/medications";
import { profileRepository } from "@/data/profile";
import { dependentRepository } from "@/data/dependents";
import { aiService } from "@/lib/ai/ai.service";

export const maxDuration = 60;

export const POST = WithContext(async ({ user, dependentId, req }) => {
  const body = (await req.json()) as {
    messages: UIMessage[];
    sessionId?: string;
  };
  const { messages } = body;

  if (!messages?.length) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "messages is required." } },
      { status: 400 },
    );
  }

  // ── 1. Persist user message & resolve/create the session ─────────────────
  const firstText = extractFirstText(messages);
  const title = firstText?.slice(0, 60) ?? "New Session";

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const parts =
    lastUserMsg?.parts.filter((p) => p.type !== "tool-result") ?? [];

  let sessionId: string;

  const saved = await new AddMessageUseCase().execute(
    AddMessageUseCase.validate({
      userId: user.uid,
      dependentId,
      sessionId: body.sessionId,
      title,
      role: "user",
      content: parts.length > 0 ? JSON.stringify(parts) : (firstText ?? ""),
    }),
  );
  sessionId = saved.sessionId;

  // ── 2. Stream the AI response (consumes one credit) ──────────────────────
  // Dynamically inject attachment context so the model can never hallucinate
  // a file analysis when no file is actually present.
  const latestUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const hasAttachment =
    latestUserMsg?.parts?.some((p) => {
      const t = p.type as string;
      return t === "file" || t === "image" || t.startsWith("data-");
    }) ?? false;

  const attachmentNote = hasAttachment
    ? "\n\n## CURRENT MESSAGE CONTEXT\nThe user's current message DOES contain an attached file or image. You may analyse it and call the appropriate tools."
    : "\n\n## CURRENT MESSAGE CONTEXT\n⚠️ The user's current message does NOT contain any attached file or image. There is nothing to analyse. Do NOT call `dentalChart`, `recordCondition` based on imaging, `soapNote`, or any image/file analysis tool. If the user's text mentions a file or X-ray, call `askQuestion` to ask them to upload it.";

  const systemPrompt =
    (await new GetSystemPromptUseCase().execute({ id: "clinical-system" }))
      ?.content ?? "";

  // ── 3. Inject patient medical context on every request ──────────────────────
  // Pull the patient's recent conditions, medications and last SOAP note so the
  // AI always has full context — critical for tools like dietPlan that must
  // account for existing diagnoses and current medications.
  let priorContextNote = "";
  {
    const [
      recentConditions,
      recentNotes,
      recentMedications,
      userProfile,
      dependentProfile,
    ] = await Promise.all([
      new ListConditionsUseCase(dependentId)
        .execute(ListConditionsUseCase.validate({ userId: user.uid, limit: 5 }))
        .catch(() => []),
      new ListSoapNotesUseCase(dependentId)
        .execute(ListSoapNotesUseCase.validate({ userId: user.uid, limit: 1 }))
        .catch(() => []),
      new ListMedicationsUseCase(dependentId)
        .execute(
          ListMedicationsUseCase.validate({ userId: user.uid, limit: 10 }),
        )
        .catch(() => []),
      profileRepository.get(user.uid).catch(() => null),
      dependentId
        ? dependentRepository.findById(user.uid, dependentId).catch(() => null)
        : Promise.resolve(null),
    ]);
    // The active profile is the dependent record when viewing a dependent, else the user's own profile
    const activeProfile = dependentId ? dependentProfile : userProfile;
    const conditionLines = recentConditions
      .map((c) => {
        const icd = c.icd10 ? ` (${c.icd10})` : "";
        return `- ${c.name}${icd}: ${c.severity} severity, ${c.status}`;
      })
      .join("\n");
    const medicationLines = recentMedications
      .filter((m) => m.status === "active")
      .map((m) => {
        const parts = [m.name];
        if (m.dosage) parts.push(m.dosage);
        if (m.frequency) parts.push(m.frequency);
        if (m.condition) parts.push(`for ${m.condition}`);
        return `- ${parts.join(" · ")}`;
      })
      .join("\n");
    const lastNote = recentNotes[0];
    const soapLine = lastNote
      ? `Last clinical summary (${new Date(lastNote.createdAt).toLocaleDateString()}): ${lastNote.assessment}`
      : "";
    // Compute age from date of birth
    const dob = activeProfile?.dateOfBirth;
    const ageValue = (() => {
      if (!dob) return null;
      const birth = new Date(dob);
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
      return age;
    })();
    const demographicParts: string[] = [];
    if (ageValue !== null) demographicParts.push(`Age: ${ageValue} yrs`);
    if (activeProfile?.country)
      demographicParts.push(`Country: ${activeProfile.country}`);
    if (activeProfile?.city)
      demographicParts.push(`City: ${activeProfile.city}`);
    if (activeProfile?.height)
      demographicParts.push(`Height: ${activeProfile.height} cm`);
    if (activeProfile?.weight)
      demographicParts.push(`Weight: ${activeProfile.weight} kg`);
    if (!dependentId && userProfile?.foodPreferences?.length)
      demographicParts.push(
        `Food preferences: ${userProfile.foodPreferences.join(", ")}`,
      );
    const demographicLine = demographicParts.length
      ? `**Patient demographics:** ${demographicParts.join(" · ")}`
      : "";
    if (conditionLines || soapLine || medicationLines || demographicLine) {
      priorContextNote = [
        "\n\n## PATIENT HEALTH HISTORY",
        "Use the following as background context for all tool calls — especially dietPlan, dosDonts, nextSteps. Do not re-diagnose unless new symptoms warrant it.",
        "IMPORTANT: All demographics (age, country, food preferences) listed below are already confirmed from the patient's profile. Do NOT ask for them again in any tool.",
        conditionLines && `**Known conditions:**\n${conditionLines}`,
        medicationLines && `**Active medications:**\n${medicationLines}`,
        demographicLine,
        soapLine && `**${soapLine}**`,
      ]
        .filter(Boolean)
        .join("\n");
    }
  }

  try {
    const result = await aiService.stream({
      userId: user.uid,
      system: systemPrompt + attachmentNote + priorContextNote,
      messages: await convertToModelMessages(messages),
      tools: createClinicalTools({ userId: user.uid, sessionId, dependentId }),
      stopWhen: (state) =>
        stepCountIs(15)(state) ||
        state.steps.some((step) =>
          (step.toolCalls ?? []).some(
            (tc) =>
              tc.toolName === "askQuestion" || tc.toolName === "suggestActions",
          ),
        ),
    });

    // Use toUIMessageStreamResponse so the SDK assembles the full UIMessage
    // (with correctly typed parts including `input`) via its own onFinish.
    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      headers: { "X-Session-Id": sessionId },
      onFinish: ({ responseMessage }) => {
        // Fire-and-forget — persist the assistant message built by the SDK.
        void (async () => {
          if (!responseMessage.parts?.length) return;
          await new AddMessageUseCase().execute(
            AddMessageUseCase.validate({
              userId: user.uid,
              dependentId,
              sessionId,
              role: "assistant",
              content: JSON.stringify(responseMessage.parts),
            }),
          );
        })();
      },
    }) as unknown as NextResponse;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "CREDITS_EXHAUSTED") {
      const reset = new Date(
        Date.UTC(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          new Date().getUTCDate() + 1,
        ),
      );
      return NextResponse.json(
        {
          error: {
            code: "CREDITS_EXHAUSTED",
            message: `You've used all your credits for today. They reset at ${reset.toUTCString().replace(/ GMT$/, " UTC")}.`,
          },
        },
        { status: 402 },
      );
    }
    throw err;
  }
});
