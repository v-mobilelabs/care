import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { GetSoapNoteUseCase, DeleteSoapNoteUseCase } from "@/data/soap-notes";

// GET /api/soap-notes/[noteId]
export const GET = WithContext<{ noteId: string }>(
  async ({ user, dependentId }, { noteId }) => {
    const input = GetSoapNoteUseCase.validate({ userId: user.uid, noteId });
    const note = await new GetSoapNoteUseCase(dependentId).execute(input);
    if (!note) throw ApiError.notFound("SOAP note not found.");
    return NextResponse.json(note);
  },
);

// DELETE /api/soap-notes/[noteId]
export const DELETE = WithContext<{ noteId: string }>(
  async ({ user, dependentId }, { noteId }) => {
    const input = DeleteSoapNoteUseCase.validate({ userId: user.uid, noteId });
    await new DeleteSoapNoteUseCase(dependentId).execute(input);
    return NextResponse.json({ ok: true });
  },
);
