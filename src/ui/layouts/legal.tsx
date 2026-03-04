/**
 * Minimal server-safe layout for legal pages (privacy, terms).
 * Uses no client hooks — safe for static generation.
 */
import { Anchor, Box, Container, Group, Text, ThemeIcon } from "@mantine/core";
import { IconHeartbeat } from "@tabler/icons-react";

export function LegalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Box style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Box
        component="header"
        style={{
          borderBottom:
            "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
          background:
            "light-dark(rgba(255,255,255,0.85), rgba(26,27,30,0.85))",
          backdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <Container size="xl">
          <Group h={64} justify="space-between">
            <Anchor href="/" style={{ textDecoration: "none" }}>
              <Group gap={6}>
                <ThemeIcon size={26} radius="md" color="primary" variant="light">
                  <IconHeartbeat size={15} />
                </ThemeIcon>
                <Text c="primary" size="xl" fw={900}>
                  CareAI
                </Text>
              </Group>
            </Anchor>
            <Group gap="md">
              <Anchor href="/privacy" size="sm" c="dimmed">
                Privacy
              </Anchor>
              <Anchor href="/terms" size="sm" c="dimmed">
                Terms
              </Anchor>
              <Anchor href="/chat" size="sm">
                Start Assessment
              </Anchor>
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Page content */}
      <Box style={{ flex: 1 }}>{children}</Box>
    </Box>
  );
}
