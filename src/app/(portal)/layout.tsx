import { Provider } from "@/ui/providers/provider";
import { getServerUser } from "@/lib/api/server-prefetch";
import { GetProfileUseCase } from "@/data/profile";
import { GetActiveMeetUseCase } from "@/data/meet";
import { getQueryClient } from "@/lib/query/client";
import { meetSessionKey } from "./meet/[requestId]/_keys";
import { chatKeys } from "@/app/(portal)/patient/_keys";
import { getCachedUsage } from "@/data/cached";
import { Hydrate } from "@/ui/hydrate";
import { getApplicationInfo, getNavigationMenus } from "@/ui/navigation";
import { PortalLayout } from "@/ui/layouts/portal";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, meet } = await getData(); // Ensure user data is fetched on the server for proper hydration of auth state on the client
  const queryClient = getQueryClient();
  if (meet) {
    queryClient.setQueryData(meetSessionKey(meet.requestId), meet);
  }
  if (user) {
    const usage = await getCachedUsage(user.uid);
    queryClient.setQueryData(chatKeys.credits(), usage);
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
  const meet = await (user
    ? new GetActiveMeetUseCase().execute({ userId: user.uid, userKind: user.kind })
    : Promise.resolve(null)
  );
  return { user, meet };
}