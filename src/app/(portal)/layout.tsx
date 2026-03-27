import { Provider } from "@/ui/providers/provider";
import { getServerUser } from "@/lib/api/server-prefetch";
import { GetActiveMeetUseCase } from "@/data/meet";
import { GetProfileUseCase } from "@/data/profile";
import { GetUsageUseCase } from "@/data/usage";
import { getQueryClient } from "@/lib/query/client";
import { meetSessionKey } from "./meet/[requestId]/_keys";
import { chatKeys } from "@/ui/ai/keys";
import { Hydrate } from "@/ui/hydrate";
import { getApplicationInfo, getNavigationMenus } from "@/ui/navigation";
import { PortalLayout } from "@/ui/layouts/portal";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, meet, profile } = await getData(); // Ensure user data is fetched on the server for proper hydration of auth state on the client
  const queryClient = getQueryClient();
  if (meet) {
    queryClient.setQueryData(meetSessionKey(meet.requestId), meet);
  }
  if (user) {
    const usage = await new GetUsageUseCase().execute({ profile: user.uid });
    queryClient.setQueryData(chatKeys.credits(), usage);
    if (profile) {
      queryClient.setQueryData(chatKeys.profile(), profile);
    }
  }
  const menus = getNavigationMenus(user!.kind);
  const application = getApplicationInfo(user!.kind);

  return (
    <Provider>
      <Hydrate client={queryClient}>
        <PortalLayout menus={menus} application={application}>
          {children}
        </PortalLayout>
      </Hydrate>
    </Provider>
  );
}

async function getData() {
  const user = await getServerUser();
  let meet = null;
  let profile = null;
  if (user && user.kind !== "admin") {
    meet = await new GetActiveMeetUseCase().execute({
      userId: user.uid,
      userKind: user.kind,
    });
  }
  if (user) {
    profile = await new GetProfileUseCase().execute({ userId: user.uid });
  }

  return { user, meet, profile };
}