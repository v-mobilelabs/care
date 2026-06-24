import { NextResponse, after } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext } from "@/lib/api/with-context";
import { ListAllFilesUseCase, type FileLabel, FILE_LABELS } from "@/data/files";
import {
  runFilesUploadGraph,
  scheduleFileUploadPostProcessing,
} from "@/workflow/file-upload-flow.workflow";
import { CacheTags } from "@/data/cached";

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/files — paginated list of files for the active profile with optional filters
export const GET = WithContext(async ({ user, profileId, req }) => {
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  const labelParam = url.searchParams.get("label") as FileLabel | null;
  const label =
    labelParam && (FILE_LABELS as readonly string[]).includes(labelParam)
      ? labelParam
      : undefined;
  const mimeType = url.searchParams.get("mimeType") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;
  const sortDir =
    (url.searchParams.get("sortDir") as "asc" | "desc" | null) ?? undefined;

  const result = await new ListAllFilesUseCase().execute({
    userId: user.uid,
    profileId,
    ...(cursor && { cursor }),
    ...(limit && { limit }),
    ...(label && { label }),
    ...(mimeType && { mimeType }),
    ...(q && { q }),
    ...(sortDir && { sortDir }),
  });
  return NextResponse.json(result);
});

// POST /api/files — multipart/form-data upload (sessionId in form data)
export const POST = WithContext(async ({ user, profileId, req }) => {
  const start = performance.now();

  const uploadResult = await runFilesUploadGraph({
    userId: user.uid,
    profileId,
    req,
  });

  const { uploaded } = uploadResult;
  console.log(
    `[POST /api/files] Upload graph completed in ${Math.round(performance.now() - start)}ms`,
  );

  revalidateTag(CacheTags.files(user.uid), "minutes");
  scheduleFileUploadPostProcessing({
    fileId: uploaded.id,
    profileId,
    userId: user.uid,
    name: uploadResult.fileName,
    mimeType: uploadResult.mimeType,
    buffer: uploadResult.buffer,
    runInBackground: after,
    onRevalidateTag: revalidateTag,
  });

  return NextResponse.json(uploaded, { status: 201 });
});
