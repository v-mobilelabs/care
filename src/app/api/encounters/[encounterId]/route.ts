import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import {
  GetEncounterUseCase,
  UpdateEncounterNotesUseCase,
  UpdateEncounterNotesSchema,
} from "@/data/encounters";

// GET /api/encounters/[encounterId] — get a single encounter
export const GET = WithContext<{ encounterId: string }>(
  async ({ user }, { encounterId }) => {
    const encounter = await new GetEncounterUseCase().execute({
      encounterId,
      userId: user.uid,
    });

    return NextResponse.json(encounter);
  },
);

// PATCH /api/encounters/[encounterId] — update encounter notes (doctor only)
export const PATCH = WithContext<{ encounterId: string }>(
  { kind: "doctor" },
  async ({ user, req }, { encounterId }) => {
    const body = (await req.json()) as unknown;
    const { notes } = UpdateEncounterNotesSchema.parse(body);

    await new UpdateEncounterNotesUseCase().execute({
      encounterId,
      doctorId: user.uid,
      notes,
    });

    return NextResponse.json({ ok: true });
  },
);
