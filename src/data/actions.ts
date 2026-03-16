"use server";
/**
 * Server actions for invalidating the "use cache" entries.
 *
 * Call these from client-side mutations (after optimistic update) to bust
 * the server cache so the next SSR / RSC render picks up fresh data.
 */
import { updateTag } from "next/cache";
import { getServerUser } from "@/lib/api/server-prefetch";
import { CacheTags } from "@/data/cached";

async function requireUserId(): Promise<string> {
  const user = await getServerUser();
  if (!user) throw new Error("Not authenticated");
  return user.uid;
}

export async function revalidateUsage() {
  const uid = await requireUserId();
  updateTag(CacheTags.usage(uid));
}

export async function revalidateProfile() {
  const uid = await requireUserId();
  updateTag(CacheTags.profile(uid));
}

export async function revalidateFiles() {
  const uid = await requireUserId();
  updateTag(CacheTags.files(uid));
}
