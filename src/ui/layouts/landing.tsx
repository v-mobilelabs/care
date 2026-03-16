import { Container } from "@mantine/core";
import { LandingHeader } from "../headers/landing.header";
import { LandingFooter } from "../footers/landing.footer";
import { LandingChatOverlay } from "@/ui/landing-chat-overlay";

export function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Container fluid h="100vh" w="100vw" p={0} m={0}>
      <LandingHeader />
      <main>{children}</main>
      <LandingFooter />
      <LandingChatOverlay />
    </Container>
  );
}
