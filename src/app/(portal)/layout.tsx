import { Provider } from "@/ui/providers/provider";
import { getServerUser } from "@/lib/api/server-prefetch";
import { GetProfileUseCase } from "@/data/profile";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, profile } = await getData(); // Ensure user data is fetched on the server for proper hydration of auth state on the client
  return (
    <Provider user={user} profile={profile}>
      {children}
    </Provider>
  );
}

async function getData() {
  const user = await getServerUser();
  const profile = await new GetProfileUseCase().execute(
    GetProfileUseCase.validate({ userId: user?.uid }),
  );
  return { user, profile };
}