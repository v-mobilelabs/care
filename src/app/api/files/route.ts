import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { ListAllFilesUseCase } from "@/data/sessions";

// GET /api/files — returns all files uploaded by the current user across every session
export const GET = WithContext(async ({ user }) => {
  const input = ListAllFilesUseCase.validate({ userId: user.uid });
  const files = await new ListAllFilesUseCase().execute(input);
  return NextResponse.json(files);
});
