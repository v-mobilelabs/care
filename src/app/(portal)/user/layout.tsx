import { ActiveProfileProvider } from "@/ui/ai/context/active-profile-context";
import { AIAssistantProvider } from "@/ui/providers/chat-provider";
import { getServerUser } from "@/lib/api/server-prefetch";
import { getQueryClient } from "@/lib/query/client";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/user/_keys";
import {
  getCachedProfile,
  getCachedFiles,
  getCachedPatient,
} from "@/data/cached";
import { ConsentGuard } from "@/ui/ai/components/consent-guard";
import { ProfileCompletionGuard } from "@/ui/ai/components/profile-completion-guard";
import { OnboardingTourGuard } from "@/ui/ai/components/onboarding-tour-guard";

export default async function ChatRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const query = getQueryClient();
  const user = await getServerUser();

  if (user) {
    // Fetch patient + cached portal data in parallel, then seed TanStack Query.
    const [patient, profile, files] = await Promise.all([
      getCachedPatient(user.uid),
      getCachedProfile(user.uid),
      getCachedFiles(user.uid),
    ]);

    query.setQueryData(chatKeys.patientDetails(), patient);
    query.setQueryData(chatKeys.profile(), profile);
    // Hydrate the first page of the infinite files query
    query.setQueryData([...chatKeys.files(), ""], {
      pages: [files],
      pageParams: [undefined],
    });
  }

  return (
    <Hydrate client={query}>
      <ActiveProfileProvider>
        <AIAssistantProvider>
          <ConsentGuard>
            <ProfileCompletionGuard>
              <OnboardingTourGuard>{children}</OnboardingTourGuard>
            </ProfileCompletionGuard>
          </ConsentGuard>
        </AIAssistantProvider>
      </ActiveProfileProvider>
    </Hydrate>
  );
}