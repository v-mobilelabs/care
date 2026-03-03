import { AppShell } from "@mantine/core";
import { LandingHeader } from "../headers/landing.header";

export function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell header={{ height: 64 }} padding={0}>
      <LandingHeader />
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
