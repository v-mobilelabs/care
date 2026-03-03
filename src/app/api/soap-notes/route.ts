import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { ListSoapNotesUseCase } from "@/data/soap-notes";

// GET /api/soap-notes — list all SOAP notes for the authenticated user
export const GET = WithContext(async ({ user, dependentId }) => {
  const input = ListSoapNotesUseCase.validate({ userId: user.uid });
  const notes = await new ListSoapNotesUseCase(dependentId).execute(input);
  return NextResponse.json(notes);
});
