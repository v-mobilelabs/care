import { Container } from "@mantine/core";
import { LandingHeader } from "../headers/landing.header";
import { LandingFooter } from "../footers/landing.footer";

export function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Container fluid h="100vh" p={0} m={0} style={{
      background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))",
    }}>
      <LandingHeader />
      <main>{children}</main>
      <LandingFooter />
    </Container>
  );
}
