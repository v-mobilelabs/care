import { ActiveProfileProvider } from "@/ui/chat/context/active-profile-context";
import { AIAssistantProvider } from "@/ui/providers/chat-provider";
import { getServerUser } from "@/lib/api/server-prefetch";
import { GetPatientUseCase } from "@/data/patients";
import { getQueryClient } from "@/lib/query/client";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/patient/_keys";
import {
  getCachedUsage,
  getCachedProfile,
  getCachedFiles,
} from "@/data/cached";

export default async function ChatRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const query = getQueryClient();
  const user = await getServerUser();

  if (user) {
    // Fetch patient + cached portal data in parallel, then seed TanStack Query.
    const [patient, usage, profile, files] = await Promise.all([
      new GetPatientUseCase().execute({ userId: user.uid }),
      getCachedUsage(user.uid),
      getCachedProfile(user.uid),
      getCachedFiles(user.uid),
    ]);

    query.setQueryData(["current-patient"], patient);
    query.setQueryData(chatKeys.credits(), usage);
    query.setQueryData(chatKeys.profile(), profile);
    query.setQueryData(chatKeys.files(), files);
  }

  return (
    <Hydrate client={query}>
      <ActiveProfileProvider>
        <AIAssistantProvider>{children}</AIAssistantProvider>
      </ActiveProfileProvider>
    </Hydrate>
  );
}