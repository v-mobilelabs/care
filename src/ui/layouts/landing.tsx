import { AppShell } from "@mantine/core";
import { Provider } from "../providers/provider";
import { LandingHeader } from "../headers/landing.header";
import { LandingFooter } from "../footers/landing.footer";

export function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Provider>
      {/* Mobile-first padding: sm on phones, scales up at ≥md */}
      <AppShell header={{ height: 64 }} padding={{ base: "sm", md: "md" }}>
        <LandingHeader />
        {/* Mobile: 5rem top gap is plenty; desktop gets the original 10rem */}
        <main style={{ marginTop: "clamp(5rem, 10vw, 10rem)" }}>
          {children}
        </main>
        <LandingFooter />
      </AppShell>
    </Provider>
  );
}
