import { QueryProvider } from "@/ui/providers/query-provider";
import { getServerUser } from "@/lib/api/server-prefetch";
import { GetProfileUseCase } from "@/data/profile";

/**
 * /meet layout — standalone full-screen page with no nav shell.
 * Wraps only QueryProvider (needed for endCall mutation in _room.tsx).
 */
export default async function MeetLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const user = await getServerUser();
    const profile = user ? await new GetProfileUseCase().execute({ userId: user.uid }) : null;
    return <QueryProvider user={user} profile={profile}>{children}</QueryProvider>;
}
