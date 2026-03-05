import { QueryProvider } from "@/ui/providers/query-provider";

/**
 * /meet layout — standalone full-screen page with no nav shell.
 * Wraps only QueryProvider (needed for endCall mutation in _room.tsx).
 */
export default function MeetLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return <QueryProvider>{children}</QueryProvider>;
}
