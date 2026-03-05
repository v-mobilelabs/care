import { DoctorPortalShell } from "./_shell";
import { QueryProvider } from "@/ui/providers/query-provider";
import { getQueryClient } from "@/lib/query/client";
import { Hydrate } from "@/ui/hydrate";

export default function DoctorPortalLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const client = getQueryClient();
    return (
        <QueryProvider>
            <Hydrate client={client}>
                <DoctorPortalShell>{children}</DoctorPortalShell>
            </Hydrate>
        </QueryProvider>
    );
}
