import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { GetSoapNoteUseCase, DeleteSoapNoteUseCase } from "@/data/soap-notes";

// GET /api/soap-notes/[noteId]
export const GET = WithContext<{ noteId: string }>(
  async ({ user, dependentId }, { noteId }) => {
    const note = await new GetSoapNoteUseCase(dependentId).execute({
      userId: user.uid,
      noteId,
    });
    if (!note) throw ApiError.notFound("SOAP note not found.");
    return NextResponse.json(note);
  },
);

// DELETE /api/soap-notes/[noteId]
export const DELETE = WithContext<{ noteId: string }>(
  async ({ user, dependentId }, { noteId }) => {
    await new DeleteSoapNoteUseCase(dependentId).execute({
      userId: user.uid,
      noteId,
    });
    return NextResponse.json({ ok: true });
  },
);
